"""Driver domain API endpoints matching Client/src/lib/driver."""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.deps import require_role, CurrentUser
from app.models.plan import ReleasedTrip, ReleasedManifest, OrderLoadingState
from app.models.operations import DeliveryRecord, DriverIssue, LoadingIssue
from app.models.order import Order
from app.models.reference import Outlet
from app.schemas.driver import (
    OTPVerifyRequest,
    LocalDeliveryRecordSchema,
    IssueReportRecordSchema,
    DriverRunProgressResponse,
    DiscrepancyDetails,
    NotDeliveredDetails,
    PodDetails,
)
from app.services.driver_service import (
    get_driver_active_trip,
    verify_driver_otp,
    get_driver_run_progress,
    record_driver_delivery,
    record_driver_issue,
)
from app.services.storage_service import storage_service

router = APIRouter(prefix="/driver", tags=["Driver Portal"])

@router.get("/my-run")
def get_my_run(db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("driver"))):
    """Fetch assigned driver run manifest, stops, and unlock status - for the
    authenticated driver's own assigned vehicle, never a client-supplied one."""
    trip = get_driver_active_trip(db, vehicle_id=user.vehicle_id)
    if not trip:
        return {"hasRun": False, "message": "No active released run found"}

    # Get outlet details for each stop
    stops_data = []
    stop_ids = list(trip.stop_outlet_ids or [])
    outlets = {o.outlet_id: o for o in db.query(Outlet).filter(Outlet.outlet_id.in_(stop_ids)).all()}
    deliveries = {d.stop_id: d for d in db.query(DeliveryRecord).filter(
        DeliveryRecord.trip_id == trip.trip_id_str,
        DeliveryRecord.manifest_version == trip.manifest_version,
        DeliveryRecord.vehicle_id == trip.vehicle_id,
        DeliveryRecord.stop_id.in_(stop_ids),
    ).all()}
    effective_units = {
        s.order_ref: s.effective_units
        for s in db.query(OrderLoadingState).filter(OrderLoadingState.released_trip_id == trip.id).all()
    }
    # Real loader issues on this trip, so the driver sees genuine loading changes
    # (never a canned message).
    loading_issues_by_order: Dict[str, list] = {}
    for li in db.query(LoadingIssue).filter(
        LoadingIssue.manifest_version == trip.manifest_version,
        LoadingIssue.vehicle_id == trip.vehicle_id,
        LoadingIssue.trip_no == trip.trip_no,
    ).order_by(LoadingIssue.reported_at).all():
        loading_issues_by_order.setdefault(li.order_ref, []).append(li)
    
    # Query orders associated with this trip or outlets
    trip_orders = db.query(Order).filter(Order.order_ref.in_(list(trip.order_refs or []))).order_by(Order.order_ref).all()
    orders_by_outlet = {}
    for o in trip_orders:
        orders_by_outlet.setdefault(o.outlet_id, []).append(o)

    for rank, out_id in enumerate(stop_ids, 1):
        outlet = outlets.get(out_id)
        del_rec = deliveries.get(out_id)
        outlet_orders = orders_by_outlet.get(out_id, [])
        order_refs = [o.order_ref for o in outlet_orders]
        temp_reqs = sorted(set(o.temp_requirement for o in outlet_orders))
        total_units = sum(effective_units.get(o.order_ref, o.order_units) for o in outlet_orders)
        total_weight = sum(o.order_weight_kg for o in outlet_orders)
        total_volume = sum(o.order_volume_m3 for o in outlet_orders)

        win_open = outlet.window_open_time if outlet else "05:00"
        win_close = outlet.window_close_time if outlet else "07:30"

        stops_data.append({
            "id": rank,
            "stopId": out_id,
            "stopNumber": rank,
            "code": out_id,
            "name": outlet.name if outlet else f"{out_id} Outlet",
            "address": outlet.address if outlet else f"Commercial Ave, {trip.district}",
            "district": outlet.district if outlet else trip.district,
            "depot": outlet.depot if outlet else trip.depot,
            "dockType": outlet.dock_type if outlet else "street",
            "parkingConstraint": outlet.parking_constraint if outlet else "normal",
            "mallWindow": outlet.mall_window if outlet else None,
            "windowOpen": win_open,
            "windowClose": win_close,
            "timeWindow": f"{win_open} – {win_close}",
            "managerName": outlet.manager_name if outlet else f"Manager {out_id}",
            "managerPhone": outlet.phone if outlet else "+94 77 100000",
            "latitude": outlet.latitude if outlet else None,
            "longitude": outlet.longitude if outlet else None,
            "isCompleted": del_rec is not None,
            "outcome": del_rec.outcome if del_rec else None,
            "orders": order_refs,
            "orderDetails": [
                {
                    "orderRef": o.order_ref,
                    "units": effective_units.get(o.order_ref, o.order_units),
                    "plannedUnits": o.order_units,
                    "weightKg": o.order_weight_kg,
                    "volumeM3": o.order_volume_m3,
                    "tempRequirement": o.temp_requirement,
                }
                for o in outlet_orders
            ],
            "loadingNotes": [
                {
                    "orderRef": li.order_ref,
                    "issueType": li.issue_type,
                    "unitsAffected": li.units_affected,
                    "status": li.status,
                    "actionTaken": li.action_taken,
                    "plannedUnits": next((o.order_units for o in outlet_orders if o.order_ref == li.order_ref), None),
                    "effectiveUnits": effective_units.get(li.order_ref),
                }
                for o in outlet_orders
                for li in loading_issues_by_order.get(o.order_ref, [])
            ],
            "outlets": 1,
            "tempRequirement": ", ".join(temp_reqs),
            "units": total_units,
            "weightKg": round(total_weight, 2),
            "volumeM3": round(total_volume, 3),
        })

    return {
        "hasRun": True,
        "tripId": trip.trip_id_str,
        "vehicleId": trip.vehicle_id,
        "tripNo": trip.trip_no,
        "brand": trip.brand,
        "district": trip.district,
        "depot": trip.depot,
        "manifestVersion": f"Plan v{trip.manifest_version}",
        "plannedDepartureTime": trip.planned_departure_time,
        "isUnlocked": trip.otp_unlocked,
        "otpAttempts": trip.otp_attempts,
        "loadingStatus": trip.loading_status,
        "stops": stops_data,
    }

@router.post("/otp/verify")
def api_verify_otp(req: OTPVerifyRequest, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("driver"))):
    """Verify 6-digit cryptographic OTP to unlock driver run - rejects a
    driver trying to unlock a trip assigned to a different vehicle."""
    if user.vehicle_id and req.vehicle_id != user.vehicle_id:
        raise HTTPException(status_code=403, detail="You can only unlock a trip assigned to your own vehicle.")
    return verify_driver_otp(db, req.trip_id, req.vehicle_id, req.otp_code, actor=user.display_name)

@router.get("/progress", response_model=DriverRunProgressResponse)
def api_get_driver_progress(trip_id: str, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("driver"))):
    """Get calculated progress (% completed, stops remaining)."""
    return get_driver_run_progress(db, trip_id, vehicle_id=user.vehicle_id)

@router.post("/deliveries")
def api_record_delivery(record: LocalDeliveryRecordSchema, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("driver"))):
    """Record delivery outcome and POD metadata - rejects a delivery recorded
    against a trip/vehicle the authenticated driver doesn't own."""
    if user.vehicle_id and record.vehicleId != user.vehicle_id:
        raise HTTPException(status_code=403, detail="You can only record deliveries for your own vehicle's trip.")
    rec = record_driver_delivery(db, record, actor=user.display_name)
    return {"success": True, "deliveryId": rec.id, "status": rec.status}

@router.get("/history", response_model=List[LocalDeliveryRecordSchema])
def api_get_driver_history(db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("driver"))):
    """Get completed deliveries history for the authenticated driver's own vehicle."""
    deliveries = db.query(DeliveryRecord).filter(
        DeliveryRecord.vehicle_id == user.vehicle_id
    ).order_by(DeliveryRecord.recorded_at.desc()).all()

    results = []
    for d in deliveries:
        signed_pod_photo = storage_service.get_signed_url(d.pod_photo_url)
        signed_pod_sig = storage_service.get_signed_url(d.pod_signature_url)

        disc = None
        if d.discrepancy_type:
            disc = DiscrepancyDetails(
                type=d.discrepancy_type,
                expectedQty=d.expected_qty,
                deliveredQty=d.delivered_qty,
                notes=d.discrepancy_notes or "",
                photoName=d.pod_photo_name,
                photoUrl=signed_pod_photo,
            )
        not_del = None
        if d.not_delivered_reason:
            not_del = NotDeliveredDetails(
                reason=d.not_delivered_reason,
                notes=d.not_delivered_notes or "",
                photoName=d.pod_photo_name,
                photoUrl=signed_pod_photo,
            )
        pod = PodDetails(
            photoName=d.pod_photo_name,
            photoUrl=signed_pod_photo,
            signerName=d.pod_signer_name,
            hasSignature=d.pod_has_signature,
            signatureUrl=signed_pod_sig,
        )
        results.append(LocalDeliveryRecordSchema(
            id=d.id,
            stopId=d.stop_id,
            stopName=d.stop_name,
            vehicleId=d.vehicle_id,
            outcome=d.outcome,
            discrepancyDetails=disc,
            notDeliveredDetails=not_del,
            podDetails=pod,
            status=d.status,
            offlineCreated=d.offline_created,
            createdAt=d.recorded_at.isoformat(),
            tripId=d.trip_id,
            syncedAt=d.synced_at.isoformat() if d.synced_at else None,
        ))
    return results

@router.post("/issues")
def api_record_driver_issue(report: IssueReportRecordSchema, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("driver"))):
    """Report road or delivery issue after vehicle departure."""
    if user.vehicle_id and report.vehicleId != user.vehicle_id:
        raise HTTPException(status_code=403, detail="You can only report issues for your own vehicle's trip.")
    issue = record_driver_issue(db, report)
    return {"success": True, "issueId": issue.id, "status": issue.status}

@router.get("/issues/history", response_model=List[IssueReportRecordSchema])
def api_get_driver_issues_history(db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("driver"))):
    """Get driver-submitted road issues for the authenticated driver's own vehicle."""
    issues = db.query(DriverIssue).filter(
        DriverIssue.vehicle_id == user.vehicle_id
    ).order_by(DriverIssue.recorded_at.desc()).all()

    return [
        IssueReportRecordSchema(
            id=i.id,
            tripId=i.trip_id,
            vehicleId=i.vehicle_id,
            categoryId=i.category_id,
            categoryLabel=i.category_label,
            categoryIcon=i.category_icon,
            categories=i.categories,
            relatedScope=i.related_scope,
            orderId=i.order_ref,
            stopCode=i.stop_code,
            outletName=i.outlet_name,
            description=i.description,
            photo={"name": i.photo_name, "url": storage_service.get_signed_url(i.photo_url) or ""} if i.photo_name else None,
            status=i.status,
            offlineCreated=i.offline_created,
            createdAt=i.recorded_at.isoformat(),
            syncedAt=i.synced_at.isoformat() if i.synced_at else None,
        )
        for i in issues
    ]
