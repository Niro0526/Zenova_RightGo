"""Driver domain API endpoints matching Client/src/lib/driver."""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.plan import ReleasedTrip, ReleasedManifest
from app.models.operations import DeliveryRecord, DriverIssue
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

router = APIRouter(prefix="/driver", tags=["Driver Portal"])

@router.get("/my-run")
def get_my_run(vehicle_id: Optional[str] = "PEL-R04", db: Session = Depends(get_db)):
    """Fetch assigned driver run manifest, stops, and unlock status."""
    trip = get_driver_active_trip(db, vehicle_id=vehicle_id)
    if not trip:
        return {"hasRun": False, "message": "No active released run found"}

    # Get outlet details for each stop
    stops_data = []
    outlets = {o.outlet_id: o for o in db.query(Outlet).filter(Outlet.outlet_id.in_(trip.stop_outlet_ids or [])).all()}
    deliveries = {d.stop_id: d for d in db.query(DeliveryRecord).filter(DeliveryRecord.stop_id.in_(trip.stop_outlet_ids or [])).all()}

    for rank, out_id in enumerate(trip.stop_outlet_ids or [], 1):
        outlet = outlets.get(out_id)
        del_rec = deliveries.get(out_id)
        stops_data.append({
            "stopId": out_id,
            "stopNumber": rank,
            "name": outlet.name if outlet else out_id,
            "address": outlet.address if outlet else "Commercial Ave",
            "district": outlet.district if outlet else trip.district,
            "dockType": outlet.dock_type if outlet else "street",
            "parkingConstraint": outlet.parking_constraint if outlet else "normal",
            "windowOpen": outlet.window_open_time if outlet else "05:00",
            "windowClose": outlet.window_close_time if outlet else "08:00",
            "managerName": outlet.manager_name if outlet else "Manager",
            "managerPhone": outlet.phone if outlet else "+94 77 0000000",
            "isCompleted": del_rec is not None,
            "outcome": del_rec.outcome if del_rec else None,
        })

    return {
        "hasRun": True,
        "tripId": trip.trip_id_str,
        "vehicleId": trip.vehicle_id,
        "tripNo": trip.trip_no,
        "brand": trip.brand,
        "district": trip.district,
        "manifestVersion": trip.manifest_version,
        "plannedDepartureTime": trip.planned_departure_time,
        "isUnlocked": trip.otp_unlocked,
        "otpAttempts": trip.otp_attempts,
        "loadingStatus": trip.loading_status,
        "stops": stops_data,
    }

@router.post("/otp/verify")
def api_verify_otp(req: OTPVerifyRequest, db: Session = Depends(get_db)):
    """Verify 6-digit cryptographic OTP to unlock driver run."""
    return verify_driver_otp(db, req.trip_id, req.vehicle_id, req.otp_code)

@router.get("/progress", response_model=DriverRunProgressResponse)
def api_get_driver_progress(trip_id: str, db: Session = Depends(get_db)):
    """Get calculated progress (% completed, stops remaining)."""
    return get_driver_run_progress(db, trip_id)

@router.post("/deliveries")
def api_record_delivery(record: LocalDeliveryRecordSchema, db: Session = Depends(get_db)):
    """Record delivery outcome and POD metadata."""
    rec = record_driver_delivery(db, record)
    return {"success": True, "deliveryId": rec.id, "status": rec.status}

@router.get("/history", response_model=List[LocalDeliveryRecordSchema])
def api_get_driver_history(vehicle_id: Optional[str] = "PEL-R04", db: Session = Depends(get_db)):
    """Get completed deliveries history for driver."""
    deliveries = db.query(DeliveryRecord).filter(
        DeliveryRecord.vehicle_id == vehicle_id
    ).order_by(DeliveryRecord.recorded_at.desc()).all()

    results = []
    for d in deliveries:
        disc = None
        if d.discrepancy_type:
            disc = DiscrepancyDetails(
                type=d.discrepancy_type,
                expectedQty=d.expected_qty,
                deliveredQty=d.delivered_qty,
                notes=d.discrepancy_notes or "",
                photoName=d.pod_photo_name,
            )
        not_del = None
        if d.not_delivered_reason:
            not_del = NotDeliveredDetails(
                reason=d.not_delivered_reason,
                notes=d.not_delivered_notes or "",
                photoName=d.pod_photo_name,
            )
        pod = PodDetails(
            photoName=d.pod_photo_name,
            photoUrl=d.pod_photo_url,
            signerName=d.pod_signer_name,
            hasSignature=d.pod_has_signature,
            signatureUrl=d.pod_signature_url,
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
            syncedAt=d.synced_at.isoformat() if d.synced_at else None,
        ))
    return results

@router.post("/issues")
def api_record_driver_issue(report: IssueReportRecordSchema, db: Session = Depends(get_db)):
    """Report road or delivery issue after vehicle departure."""
    issue = record_driver_issue(db, report)
    return {"success": True, "issueId": issue.id, "status": issue.status}

@router.get("/issues/history", response_model=List[IssueReportRecordSchema])
def api_get_driver_issues_history(vehicle_id: Optional[str] = "PEL-R04", db: Session = Depends(get_db)):
    """Get driver-submitted road issues only."""
    issues = db.query(DriverIssue).filter(
        DriverIssue.vehicle_id == vehicle_id
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
            photo={"name": i.photo_name, "url": i.photo_url} if i.photo_name else None,
            status=i.status,
            offlineCreated=i.offline_created,
            createdAt=i.recorded_at.isoformat(),
            syncedAt=i.synced_at.isoformat() if i.synced_at else None,
        )
        for i in issues
    ]
