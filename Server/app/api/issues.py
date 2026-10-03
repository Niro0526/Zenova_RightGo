"""Loading issues API endpoints."""

import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import AsyncClient

from app.database.supabase import get_supabase
from app.database.supabase_helpers import raise_db_http
from app.schemas.loading import (
    LoadingIssueCreateRequest,
    LoadingIssueActionRequest,
    LoadingIssueResponseSchema,
)

router = APIRouter(prefix="/issues", tags=["Loading Issues"])


def _map_loading_issue(row: dict) -> LoadingIssueResponseSchema:
    return LoadingIssueResponseSchema(
        id=row["id"],
        manifest_version=row["manifest_version"],
        vehicle_id=row["vehicle_id"],
        trip_no=row["trip_no"],
        order_ref=row["order_ref"],
        outlet_id=row["outlet_id"],
        issue_type=row["issue_type"],
        units_affected=row.get("units_affected") or 0,
        status=row["status"],
        action_taken=row.get("action_taken"),
        notes=row.get("notes"),
        reported_at=row["reported_at"],
        reported_by=row["reported_by"],
        resolved_at=row.get("resolved_at"),
        resolved_by=row.get("resolved_by"),
    )


@router.get("/loading", response_model=List[LoadingIssueResponseSchema])
async def list_loading_issues(
    manifest_version: int = 1,
    supabase: AsyncClient = Depends(get_supabase),
):
    """List pre-departure loading issues for a manifest version."""
    try:
        result = await (
            supabase.table("loading_issues")
            .select("*")
            .eq("manifest_version", manifest_version)
            .order("reported_at", desc=True)
            .execute()
        )
        return [_map_loading_issue(row) for row in (result.data or [])]
    except Exception as e:
        raise_db_http(e, "Loading issues lookup failed")


@router.post("/loading", response_model=LoadingIssueResponseSchema)
async def api_create_loading_issue(
    req: LoadingIssueCreateRequest,
    supabase: AsyncClient = Depends(get_supabase),
):
    """Create a warehouse pre-departure loading issue."""
    try:
        trip_result = await (
            supabase.table("released_trips")
            .select("loading_status")
            .eq("manifest_version", req.manifest_version)
            .eq("vehicle_id", req.vehicle_id)
            .eq("trip_no", req.trip_no)
            .limit(1)
            .execute()
        )
        if trip_result.data and trip_result.data[0]["loading_status"] in ("departed", "completed", "in_transit"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Pre-departure loading issues cannot be created after vehicle departure.",
            )

        now = datetime.now(timezone.utc).isoformat()
        issue_id = f"LI-{uuid.uuid4().hex[:8].upper()}"
        payload = {
            "id": issue_id,
            "manifest_version": req.manifest_version,
            "vehicle_id": req.vehicle_id,
            "trip_no": req.trip_no,
            "order_ref": req.order_ref,
            "outlet_id": req.outlet_id,
            "issue_type": req.issue_type,
            "units_affected": req.units_affected,
            "status": "open",
            "notes": req.notes,
            "reported_at": now,
            "reported_by": req.reported_by or "Rizwan (Loader)",
        }
        insert_result = await supabase.table("loading_issues").insert(payload).execute()
        if not insert_result.data:
            raise HTTPException(status_code=500, detail="Loading issue could not be created")

        if trip_result.data and trip_result.data[0]["loading_status"] == "ready":
            await (
                supabase.table("released_trips")
                .update({"loading_status": "loading"})
                .eq("manifest_version", req.manifest_version)
                .eq("vehicle_id", req.vehicle_id)
                .eq("trip_no", req.trip_no)
                .execute()
            )

        return _map_loading_issue(insert_result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise_db_http(e, "Loading issue could not be persisted")


@router.post("/loading/{issue_id}/action", response_model=LoadingIssueResponseSchema)
async def api_resolve_loading_issue(
    issue_id: str,
    req: LoadingIssueActionRequest,
    supabase: AsyncClient = Depends(get_supabase),
):
    """Resolve or escalate a warehouse loading issue."""
    try:
        issue_result = await (
            supabase.table("loading_issues").select("*").eq("id", issue_id).limit(1).execute()
        )
        if not issue_result.data:
            raise HTTPException(status_code=404, detail="Loading issue not found")
        issue = issue_result.data[0]

        now = datetime.now(timezone.utc).isoformat()
        updates: dict = {}
        if req.action == "replace_from_stock":
            updates = {
                "status": "resolved",
                "action_taken": "replace_from_stock",
                "resolved_at": now,
                "resolved_by": req.resolved_by or "Rizwan (Loader)",
            }
        elif req.action == "send_to_dispatcher":
            updates = {"status": "escalated", "action_taken": "send_to_dispatcher"}
        elif req.action == "apply_policy":
            updates = {
                "status": "resolved",
                "action_taken": "apply_policy",
                "resolved_at": now,
                "resolved_by": req.resolved_by or "Rizwan (Loader)",
            }
            state_result = await (
                supabase.table("order_loading_states")
                .select("*")
                .eq("manifest_version", issue["manifest_version"])
                .eq("order_ref", issue["order_ref"])
                .limit(1)
                .execute()
            )
            if state_result.data:
                state = state_result.data[0]
                effective = max(0, state["planned_units"] - issue["units_affected"])
                await (
                    supabase.table("order_loading_states")
                    .update({"effective_units": effective})
                    .eq("id", state["id"])
                    .execute()
                )
        elif req.action == "undo":
            updates = {
                "status": "open",
                "action_taken": "undo",
                "resolved_at": None,
                "resolved_by": None,
            }

        if req.notes:
            prev_notes = issue.get("notes") or ""
            updates["notes"] = f"{prev_notes} | Action Note: {req.notes}".strip(" |")

        update_result = await (
            supabase.table("loading_issues").update(updates).eq("id", issue_id).execute()
        )
        if not update_result.data:
            raise HTTPException(status_code=500, detail="Loading issue update failed")

        trip_result = await (
            supabase.table("released_trips")
            .select("*")
            .eq("manifest_version", issue["manifest_version"])
            .eq("vehicle_id", issue["vehicle_id"])
            .eq("trip_no", issue["trip_no"])
            .limit(1)
            .execute()
        )
        if trip_result.data:
            trip = trip_result.data[0]
            states_result = await (
                supabase.table("order_loading_states")
                .select("is_loaded")
                .eq("released_trip_id", trip["id"])
                .execute()
            )
            states = states_result.data or []
            open_issues_result = await (
                supabase.table("loading_issues")
                .select("id", count="exact")
                .eq("manifest_version", trip["manifest_version"])
                .eq("vehicle_id", trip["vehicle_id"])
                .eq("trip_no", trip["trip_no"])
                .in_("status", ["open", "escalated"])
                .execute()
            )
            manifest_result = await (
                supabase.table("released_manifests")
                .select("acknowledgement")
                .eq("id", trip["manifest_id"])
                .limit(1)
                .execute()
            )
            is_ack = (
                manifest_result.data
                and manifest_result.data[0].get("acknowledgement") == "acknowledged"
            )
            if (
                states
                and all(s["is_loaded"] for s in states)
                and (open_issues_result.count or 0) == 0
                and is_ack
            ):
                await (
                    supabase.table("released_trips")
                    .update({"loading_status": "ready"})
                    .eq("id", trip["id"])
                    .execute()
                )

        return _map_loading_issue(update_result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise_db_http(e, "Loading issue action failed")
