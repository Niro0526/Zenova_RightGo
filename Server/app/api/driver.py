"""Driver domain API endpoints matching Client/src/lib/driver."""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import AsyncClient

from app.database.supabase import get_supabase
from app.database.supabase_helpers import log_db_error, raise_db_http
from app.schemas.driver import (
    OTPVerifyRequest,
    LocalDeliveryRecordSchema,
    IssueReportRecordSchema,
    DriverRunProgressResponse,
    DiscrepancyDetails,
    NotDeliveredDetails,
    PodDetails,
)
from app.services.driver_service import verify_driver_otp, get_driver_run_progress
from sqlalchemy.orm import Session
from app.database.session import get_db

router = APIRouter(prefix="/driver", tags=["Driver Portal"])


async def resolve_driver_vehicle_id(
    supabase: AsyncClient,
    driver_id: Optional[str],
) -> Optional[str]:
    """Map logged-in driver (user id / username) to assigned vehicle_id."""
    if not driver_id:
        driver_id = "sunil"
    if driver_id.startswith("PEL-"):
        return driver_id
    try:
        by_username = await (
            supabase.table("users")
            .select("vehicle_id")
            .eq("username", driver_id)
            .limit(1)
            .execute()
        )
        if by_username.data and by_username.data[0].get("vehicle_id"):
            return by_username.data[0]["vehicle_id"]
        by_id = await (
            supabase.table("users")
            .select("vehicle_id")
            .eq("id", driver_id)
            .limit(1)
            .execute()
        )
        if by_id.data and by_id.data[0].get("vehicle_id"):
            return by_id.data[0]["vehicle_id"]
    except Exception as e:
        log_db_error(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Driver lookup failed",
        ) from e
    return None


async def ensure_trip_stops(
    supabase: AsyncClient,
    trip_row: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Return trip_stops rows, seeding from stop_outlet_ids when missing."""
    trip_pk = trip_row["id"]
    try:
        stops_result = await (
            supabase.table("trip_stops")
            .select("id,trip_id,outlet_id,seq,delivery_status")
            .eq("trip_id", trip_pk)
            .order("seq")
            .execute()
        )
    except Exception as e:
        raise_db_http(e, "Trip stops lookup failed")

    if stops_result.data:
        return stops_result.data

    outlet_ids = trip_row.get("stop_outlet_ids") or []
    seeded: List[Dict[str, Any]] = []
    for seq, outlet_id in enumerate(outlet_ids, 1):
        row = {
            "trip_id": trip_pk,
            "outlet_id": outlet_id,
            "seq": seq,
            "delivery_status": "pending",
        }
        try:
            insert_result = await supabase.table("trip_stops").insert(row).execute()
            if insert_result.data:
                seeded.append(insert_result.data[0])
        except Exception as e:
            raise_db_http(e, "Trip stop seed failed")
    return seeded


@router.get("/my-run")
async def get_my_run(
    driver_id: Optional[str] = "sunil",
    supabase: AsyncClient = Depends(get_supabase),
):
    """Fetch assigned driver run manifest, stops, and unlock status (in_transit only)."""
    vehicle_id = await resolve_driver_vehicle_id(supabase, driver_id)
    if not vehicle_id:
        return {"hasRun": False, "message": "No vehicle assigned to driver"}

    try:
        manifest_result = await (
            supabase.table("released_manifests")
            .select("id,version,is_active")
            .eq("is_active", True)
            .order("version", desc=True)
            .limit(1)
            .execute()
        )
        if not manifest_result.data:
            return {"hasRun": False, "message": "No active released run found"}

        active_manifest = manifest_result.data[0]
        trip_result = await (
            supabase.table("released_trips")
            .select("*")
            .eq("vehicle_id", vehicle_id)
            .eq("loading_status", "in_transit")
            .eq("manifest_id", active_manifest["id"])
            .order("id", desc=True)
            .limit(1)
            .execute()
        )
        if not trip_result.data:
            return {"hasRun": False, "message": "No active released run found"}

        trip = trip_result.data[0]
        outlet_ids = trip.get("stop_outlet_ids") or []
        outlets_result = await (
            supabase.table("outlets").select("*").in_("outlet_id", outlet_ids).execute()
        )
        outlets = {o["outlet_id"]: o for o in (outlets_result.data or [])}

        deliveries_result = await (
            supabase.table("delivery_records")
            .select("stop_id,outcome")
            .eq("vehicle_id", vehicle_id)
            .in_("stop_id", outlet_ids)
            .execute()
        )
        deliveries = {d["stop_id"]: d for d in (deliveries_result.data or [])}

        trip_stops = await ensure_trip_stops(supabase, trip)
        completed_by_stop = {
            s["outlet_id"]: s.get("delivery_status") == "completed" for s in trip_stops
        }

        stops_data = []
        for rank, out_id in enumerate(outlet_ids, 1):
            outlet = outlets.get(out_id)
            del_rec = deliveries.get(out_id)
            is_completed = completed_by_stop.get(out_id, False) or del_rec is not None
            stops_data.append(
                {
                    "stopId": out_id,
                    "stopNumber": rank,
                    "name": outlet["name"] if outlet else out_id,
                    "address": outlet.get("address") if outlet else "Commercial Ave",
                    "district": outlet.get("district") if outlet else trip.get("district"),
                    "dockType": outlet.get("dock_type") if outlet else "street",
                    "parkingConstraint": outlet.get("parking_constraint") if outlet else "normal",
                    "windowOpen": outlet.get("window_open_time") if outlet else "05:00",
                    "windowClose": outlet.get("window_close_time") if outlet else "08:00",
                    "managerName": outlet.get("manager_name") if outlet else "Manager",
                    "managerPhone": outlet.get("phone") if outlet else "+94 77 0000000",
                    "orderRefs": [
                        ref
                        for ref in (trip.get("order_refs") or [])
                        if outlets.get(out_id) is None or True
                    ],
                    "isCompleted": is_completed,
                    "outcome": del_rec.get("outcome") if del_rec else None,
                }
            )

        return {
            "hasRun": True,
            "tripId": trip["trip_id_str"],
            "vehicleId": trip["vehicle_id"],
            "tripNo": trip["trip_no"],
            "brand": trip["brand"],
            "district": trip["district"],
            "manifestVersion": trip["manifest_version"],
            "plannedDepartureTime": trip.get("planned_departure_time"),
            "isUnlocked": trip.get("otp_unlocked", False),
            "otpAttempts": trip.get("otp_attempts", 0),
            "loadingStatus": trip["loading_status"],
            "stops": stops_data,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise_db_http(e, "Driver run could not be loaded")


@router.post("/otp/verify")
def api_verify_otp(req: OTPVerifyRequest, db: Session = Depends(get_db)):
    """Verify 6-digit cryptographic OTP to unlock driver run."""
    return verify_driver_otp(db, req.trip_id, req.vehicle_id, req.otp_code)


@router.get("/progress", response_model=DriverRunProgressResponse)
def api_get_driver_progress(trip_id: str, db: Session = Depends(get_db)):
    """Get calculated progress (% completed, stops remaining)."""
    return get_driver_run_progress(db, trip_id)


@router.post("/deliveries")
async def api_record_delivery(
    record: LocalDeliveryRecordSchema,
    supabase: AsyncClient = Depends(get_supabase),
):
    """Record delivery outcome and POD metadata."""
    try:
        now = datetime.now(timezone.utc).isoformat()
        trip_result = await (
            supabase.table("released_trips")
            .select("id,trip_id_str,manifest_version,order_refs,stop_outlet_ids,completed_stops_count")
            .eq("vehicle_id", record.vehicleId)
            .eq("loading_status", "in_transit")
            .order("id", desc=True)
            .limit(1)
            .execute()
        )
        if not trip_result.data:
            raise HTTPException(status_code=404, detail="Active driver trip not found")

        trip = trip_result.data[0]
        trip_stops = await ensure_trip_stops(supabase, trip)
        stop = next((s for s in trip_stops if s["outlet_id"] == record.stopId), None)
        if not stop:
            raise HTTPException(status_code=404, detail="Trip stop not found")

        existing = await (
            supabase.table("delivery_records")
            .select("id")
            .eq("id", record.id)
            .limit(1)
            .execute()
        )
        if not existing.data:
            delivery_payload = {
                "id": record.id,
                "manifest_version": trip["manifest_version"],
                "trip_id": trip["trip_id_str"],
                "vehicle_id": record.vehicleId,
                "stop_id": record.stopId,
                "stop_name": record.stopName,
                "outcome": record.outcome,
                "expected_qty": record.discrepancyDetails.expectedQty
                if record.discrepancyDetails
                else 0,
                "delivered_qty": record.discrepancyDetails.deliveredQty
                if record.discrepancyDetails
                else 0,
                "discrepancy_type": record.discrepancyDetails.type
                if record.discrepancyDetails
                else None,
                "discrepancy_notes": record.discrepancyDetails.notes
                if record.discrepancyDetails
                else None,
                "not_delivered_reason": record.notDeliveredDetails.reason
                if record.notDeliveredDetails
                else None,
                "not_delivered_notes": record.notDeliveredDetails.notes
                if record.notDeliveredDetails
                else None,
                "pod_photo_name": record.podDetails.photoName if record.podDetails else None,
                "pod_photo_url": record.podDetails.photoUrl if record.podDetails else None,
                "pod_signer_name": record.podDetails.signerName if record.podDetails else None,
                "pod_has_signature": bool(record.podDetails and record.podDetails.hasSignature),
                "pod_signature_url": record.podDetails.signatureUrl if record.podDetails else None,
                "status": "Synced",
                "offline_created": record.offlineCreated,
                "recorded_at": record.createdAt or now,
                "synced_at": now,
            }
            delivery_result = await (
                supabase.table("delivery_records").insert(delivery_payload).execute()
            )
            if not delivery_result.data:
                raise HTTPException(status_code=500, detail="Delivery insert returned no rows")

        if stop.get("delivery_status") != "completed":
            await (
                supabase.table("trip_stops")
                .update({"delivery_status": "completed"})
                .eq("id", stop["id"])
                .execute()
            )
            completed_count = (trip.get("completed_stops_count") or 0) + 1
            await (
                supabase.table("released_trips")
                .update({"completed_stops_count": completed_count})
                .eq("id", trip["id"])
                .execute()
            )

        order_query = supabase.table("orders").update({"status": "delivered"}).eq(
            "outlet_id", record.stopId
        )
        order_refs = trip.get("order_refs") or []
        if order_refs:
            order_query = order_query.in_("order_ref", order_refs)
        await order_query.execute()

        stops_result = await (
            supabase.table("trip_stops")
            .select("id,trip_id,outlet_id,seq,delivery_status")
            .eq("trip_id", trip["id"])
            .order("seq")
            .execute()
        )
        trip_stops_updated = stops_result.data or []
        next_stop = next(
            (
                trip_stop
                for trip_stop in trip_stops_updated
                if trip_stop.get("delivery_status") != "completed"
            ),
            None,
        )

        return {
            "success": True,
            "deliveryId": record.id,
            "status": "completed",
            "tripStops": trip_stops_updated,
            "nextStop": next_stop,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise_db_http(e, "Delivery could not be persisted")


@router.get("/history", response_model=List[LocalDeliveryRecordSchema])
async def api_get_driver_history(
    driver_id: Optional[str] = "sunil",
    supabase: AsyncClient = Depends(get_supabase),
):
    """Get completed deliveries history for driver."""
    vehicle_id = await resolve_driver_vehicle_id(supabase, driver_id)
    if not vehicle_id:
        return []

    try:
        deliveries_result = await (
            supabase.table("delivery_records")
            .select("*")
            .eq("vehicle_id", vehicle_id)
            .order("recorded_at", desc=True)
            .execute()
        )
    except Exception as e:
        raise_db_http(e, "Delivery history lookup failed")

    results = []
    for d in deliveries_result.data or []:
        disc = None
        if d.get("discrepancy_type"):
            disc = DiscrepancyDetails(
                type=d["discrepancy_type"],
                expectedQty=d.get("expected_qty") or 0,
                deliveredQty=d.get("delivered_qty") or 0,
                notes=d.get("discrepancy_notes") or "",
                photoName=d.get("pod_photo_name"),
            )
        not_del = None
        if d.get("not_delivered_reason"):
            not_del = NotDeliveredDetails(
                reason=d["not_delivered_reason"],
                notes=d.get("not_delivered_notes") or "",
                photoName=d.get("pod_photo_name"),
            )
        pod = PodDetails(
            photoName=d.get("pod_photo_name"),
            photoUrl=d.get("pod_photo_url"),
            signerName=d.get("pod_signer_name"),
            hasSignature=d.get("pod_has_signature"),
            signatureUrl=d.get("pod_signature_url"),
        )
        recorded = d.get("recorded_at") or ""
        synced = d.get("synced_at")
        results.append(
            LocalDeliveryRecordSchema(
                id=d["id"],
                stopId=d["stop_id"],
                stopName=d["stop_name"],
                vehicleId=d["vehicle_id"],
                outcome=d["outcome"],
                discrepancyDetails=disc,
                notDeliveredDetails=not_del,
                podDetails=pod,
                status=d.get("status") or "Synced",
                offlineCreated=bool(d.get("offline_created")),
                createdAt=recorded if isinstance(recorded, str) else str(recorded),
                syncedAt=synced if isinstance(synced, str) else (str(synced) if synced else None),
            )
        )
    return results


@router.post("/issues")
async def api_record_driver_issue(
    report: IssueReportRecordSchema,
    supabase: AsyncClient = Depends(get_supabase),
):
    """Report road or delivery issue after vehicle departure."""
    try:
        trip_result = await (
            supabase.table("released_trips")
            .select("id,trip_id_str")
            .eq("trip_id_str", report.tripId)
            .eq("vehicle_id", report.vehicleId)
            .limit(1)
            .execute()
        )
        if not trip_result.data:
            raise HTTPException(status_code=404, detail="Driver trip not found")

        if report.orderId:
            order_result = await (
                supabase.table("orders")
                .select("order_ref")
                .eq("order_ref", report.orderId)
                .limit(1)
                .execute()
            )
            if not order_result.data:
                raise HTTPException(status_code=404, detail="Issue order not found")

        now = datetime.now(timezone.utc).isoformat()
        cats = [c.model_dump() for c in report.categories] if report.categories else None
        issue_payload = {
            "id": report.id,
            "trip_id": report.tripId,
            "vehicle_id": report.vehicleId,
            "stop_code": report.stopCode,
            "order_ref": report.orderId,
            "outlet_name": report.outletName,
            "category_id": report.categoryId,
            "category_label": report.categoryLabel,
            "category_icon": report.categoryIcon,
            "categories": cats,
            "related_scope": report.relatedScope or "stop",
            "description": report.description,
            "photo_name": report.photo.get("name") if report.photo else None,
            "photo_url": report.photo.get("url") if report.photo else None,
            "status": "Synced",
            "offline_created": report.offlineCreated,
            "recorded_at": report.createdAt or now,
            "synced_at": now,
        }
        result = await supabase.table("driver_issues").insert(issue_payload).execute()
        issue = result.data[0] if result.data else issue_payload
        return {"success": True, "issueId": issue.get("id", report.id), "status": "Synced"}
    except HTTPException:
        raise
    except Exception as e:
        raise_db_http(e, "Driver issue could not be persisted")


@router.get("/issues/history", response_model=List[IssueReportRecordSchema])
async def api_get_driver_issues_history(
    driver_id: Optional[str] = "sunil",
    supabase: AsyncClient = Depends(get_supabase),
):
    """Get driver-submitted road issues."""
    vehicle_id = await resolve_driver_vehicle_id(supabase, driver_id)
    if not vehicle_id:
        return []

    try:
        issues_result = await (
            supabase.table("driver_issues")
            .select("*")
            .eq("vehicle_id", vehicle_id)
            .order("recorded_at", desc=True)
            .execute()
        )
    except Exception as e:
        raise_db_http(e, "Driver issue history lookup failed")

    return [
        IssueReportRecordSchema(
            id=i["id"],
            tripId=i["trip_id"],
            vehicleId=i["vehicle_id"],
            categoryId=i["category_id"],
            categoryLabel=i["category_label"],
            categoryIcon=i.get("category_icon") or "AlertTriangle",
            categories=i.get("categories"),
            relatedScope=i.get("related_scope") or "stop",
            orderId=i.get("order_ref"),
            stopCode=i.get("stop_code"),
            outletName=i["outlet_name"],
            description=i["description"],
            photo={"name": i["photo_name"], "url": i["photo_url"]} if i.get("photo_name") else None,
            status=i.get("status") or "Synced",
            offlineCreated=bool(i.get("offline_created")),
            createdAt=i.get("recorded_at") or "",
            syncedAt=i.get("synced_at"),
        )
        for i in issues_result.data or []
    ]
