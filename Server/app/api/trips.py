"""Trip execution and warehouse loading API endpoints."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import AsyncClient

from app.database.supabase import get_supabase
from app.database.supabase_helpers import raise_db_http
from app.schemas.loading import TripReadinessResponseSchema

router = APIRouter(prefix="/trips", tags=["Trips & Loading"])


class LoadOrderRequest(BaseModel):
    order_ref: str
    loaded_units: Optional[int] = None


@router.get("/{trip_id}/loading-sequence")
async def api_get_loading_sequence(
    trip_id: int,
    supabase: AsyncClient = Depends(get_supabase),
):
    """Get LIFO loading steps for warehouse team."""
    try:
        trip_result = await (
            supabase.table("released_trips").select("*").eq("id", trip_id).limit(1).execute()
        )
        if not trip_result.data:
            raise HTTPException(status_code=404, detail="Trip not found")
        trip = trip_result.data[0]

        delivery_stops = list(trip.get("stop_outlet_ids") or [])
        loading_sequence_outlets = list(reversed(delivery_stops))

        states_result = await (
            supabase.table("order_loading_states")
            .select("*")
            .eq("released_trip_id", trip_id)
            .execute()
        )
        order_states = states_result.data or []
        order_refs = [s["order_ref"] for s in order_states]
        orders_result = await (
            supabase.table("orders").select("*").in_("order_ref", order_refs).execute()
        )
        orders_map = {o["order_ref"]: o for o in (orders_result.data or [])}

        loading_steps = []
        for step_num, outlet_id in enumerate(loading_sequence_outlets, 1):
            matching_states = [
                s
                for s in order_states
                if orders_map.get(s["order_ref"])
                and orders_map[s["order_ref"]]["outlet_id"] == outlet_id
            ]
            loading_steps.append(
                {
                    "step": step_num,
                    "outletId": outlet_id,
                    "deliveryStopRank": delivery_stops.index(outlet_id) + 1,
                    "orders": [
                        {
                            "orderRef": s["order_ref"],
                            "brand": orders_map[s["order_ref"]]["brand"],
                            "tempRequirement": orders_map[s["order_ref"]]["temp_requirement"],
                            "plannedUnits": s["planned_units"],
                            "loadedUnits": s["loaded_units"],
                            "effectiveUnits": s["effective_units"],
                            "isLoaded": s["is_loaded"],
                        }
                        for s in matching_states
                    ],
                    "allOrdersLoaded": all(s["is_loaded"] for s in matching_states),
                }
            )

        return {
            "tripId": trip["trip_id_str"],
            "vehicleId": trip["vehicle_id"],
            "tripNo": trip["trip_no"],
            "manifestVersion": trip["manifest_version"],
            "brand": trip["brand"],
            "district": trip["district"],
            "plannedDepartureTime": trip.get("planned_departure_time"),
            "leaveByTime": trip.get("leave_by_time"),
            "loadingStatus": trip["loading_status"],
            "loadingSequence": loading_steps,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise_db_http(e, "Loading sequence lookup failed")


@router.post("/{trip_id}/load-order")
async def api_load_order(
    trip_id: int,
    req: LoadOrderRequest,
    supabase: AsyncClient = Depends(get_supabase),
):
    """Mark an order loaded onto the vehicle."""
    try:
        trip_result = await (
            supabase.table("released_trips").select("*").eq("id", trip_id).limit(1).execute()
        )
        if not trip_result.data:
            raise HTTPException(status_code=404, detail="Trip not found")
        trip = trip_result.data[0]

        if trip["loading_status"] in ("departed", "completed", "in_transit"):
            raise HTTPException(status_code=409, detail="Cannot modify loading after vehicle departure")

        state_result = await (
            supabase.table("order_loading_states")
            .select("*")
            .eq("released_trip_id", trip_id)
            .eq("order_ref", req.order_ref)
            .limit(1)
            .execute()
        )
        if not state_result.data:
            raise HTTPException(status_code=404, detail="Order loading record not found on this trip")
        state = state_result.data[0]

        loaded_units = req.loaded_units if req.loaded_units is not None else state["planned_units"]
        now = datetime.now(timezone.utc).isoformat()
        await (
            supabase.table("order_loading_states")
            .update(
                {
                    "is_loaded": True,
                    "loaded_units": loaded_units,
                    "loaded_at": now,
                }
            )
            .eq("id", state["id"])
            .execute()
        )

        if trip["loading_status"] == "planned":
            await (
                supabase.table("released_trips")
                .update({"loading_status": "loading"})
                .eq("id", trip_id)
                .execute()
            )

        all_states_result = await (
            supabase.table("order_loading_states")
            .select("is_loaded")
            .eq("released_trip_id", trip_id)
            .execute()
        )
        all_states = all_states_result.data or []

        open_issues_result = await (
            supabase.table("loading_issues")
            .select("id", count="exact")
            .eq("manifest_version", trip["manifest_version"])
            .eq("vehicle_id", trip["vehicle_id"])
            .eq("trip_no", trip["trip_no"])
            .in_("status", ["open", "escalated"])
            .execute()
        )
        open_issues = open_issues_result.count or 0

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

        if all_states and all(s["is_loaded"] for s in all_states) and open_issues == 0 and is_ack:
            await (
                supabase.table("released_trips")
                .update({"loading_status": "ready"})
                .eq("id", trip_id)
                .execute()
            )

        return {
            "success": True,
            "orderRef": req.order_ref,
            "isLoaded": True,
            "loadedUnits": loaded_units,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise_db_http(e, "Load order update failed")


@router.post("/{trip_id}/depart")
async def api_depart_trip(trip_id: int, supabase: AsyncClient = Depends(get_supabase)):
    """Departure gate: advance trip to departed state."""
    try:
        trip_result = await (
            supabase.table("released_trips").select("*").eq("id", trip_id).limit(1).execute()
        )
        if not trip_result.data:
            raise HTTPException(status_code=404, detail="Trip not found")
        trip = trip_result.data[0]

        if trip["loading_status"] in ("in_transit", "departed", "completed"):
            raise HTTPException(status_code=409, detail="Trip has already departed")

        states_result = await (
            supabase.table("order_loading_states")
            .select("is_loaded")
            .eq("released_trip_id", trip_id)
            .execute()
        )
        states = states_result.data or []
        if not states or any(not s["is_loaded"] for s in states):
            raise HTTPException(status_code=409, detail="Departure blocked: all orders must be loaded first.")

        manifest_result = await (
            supabase.table("released_manifests")
            .select("acknowledgement")
            .eq("id", trip["manifest_id"])
            .limit(1)
            .execute()
        )
        if not manifest_result.data or manifest_result.data[0].get("acknowledgement") != "acknowledged":
            raise HTTPException(
                status_code=409,
                detail="Departure blocked: manifest acknowledgement is required.",
            )

        open_issues_result = await (
            supabase.table("loading_issues")
            .select("id", count="exact")
            .eq("manifest_version", trip["manifest_version"])
            .eq("vehicle_id", trip["vehicle_id"])
            .eq("trip_no", trip["trip_no"])
            .in_("status", ["open", "escalated"])
            .execute()
        )
        if (open_issues_result.count or 0) > 0:
            raise HTTPException(
                status_code=409,
                detail=f"Departure blocked: {open_issues_result.count} open loading issue(s) remain.",
            )

        now = datetime.now(timezone.utc).isoformat()
        await (
            supabase.table("released_trips")
            .update({"loading_status": "in_transit", "departed_at": now})
            .eq("id", trip_id)
            .execute()
        )

        return {
            "success": True,
            "tripId": trip["trip_id_str"],
            "status": "in_transit",
            "departedAt": now,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise_db_http(e, "Trip departure failed")


@router.get("/{trip_id}/readiness", response_model=TripReadinessResponseSchema)
async def api_get_trip_readiness(trip_id: int, supabase: AsyncClient = Depends(get_supabase)):
    """Check departure gate status for a trip."""
    try:
        trip_result = await (
            supabase.table("released_trips").select("*").eq("id", trip_id).limit(1).execute()
        )
        if not trip_result.data:
            raise HTTPException(status_code=404, detail="Trip not found")
        trip = trip_result.data[0]

        states_result = await (
            supabase.table("order_loading_states")
            .select("is_loaded")
            .eq("released_trip_id", trip_id)
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
        open_issues = open_issues_result.count or 0

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

        total_orders = len(states)
        loaded_orders = sum(1 for s in states if s["is_loaded"])
        has_open_issues = open_issues > 0
        is_ready = total_orders > 0 and loaded_orders == total_orders and not has_open_issues and is_ack

        return TripReadinessResponseSchema(
            tripId=trip["trip_id_str"],
            vehicleId=trip["vehicle_id"],
            tripNo=trip["trip_no"],
            loadingStatus=trip["loading_status"],
            totalOrders=total_orders,
            loadedOrders=loaded_orders,
            hasOpenIssues=has_open_issues,
            isReady=is_ready,
            leaveByTime=trip.get("leave_by_time"),
            otpCode=trip.get("otp_code"),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise_db_http(e, "Trip readiness lookup failed")
