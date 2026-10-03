"""Driver workflow service for run progress, stop delivery, POD, OTP, and post-departure issue reporting."""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.plan import ReleasedManifest, ReleasedTrip, OrderLoadingState
from app.models.operations import DeliveryRecord, DriverIssue
from app.models.order import Order
from app.models.reference import Outlet
from app.schemas.driver import (
    LocalDeliveryRecordSchema,
    IssueReportRecordSchema,
    DriverRunProgressResponse,
)
from app.services.notification_service import create_notification
from app.services.ledger_service import record_ledger_entry

def get_driver_active_trip(db: Session, vehicle_id: Optional[str] = "PEL-R04") -> Optional[ReleasedTrip]:
    """Fetch the active released trip for the driver/vehicle."""
    query = db.query(ReleasedTrip).join(
        ReleasedManifest, ReleasedTrip.manifest_id == ReleasedManifest.id
    ).filter(
        ReleasedManifest.is_active == True,
    )
    if vehicle_id:
        trip = query.filter(ReleasedTrip.vehicle_id == vehicle_id).first()
        if trip:
            return trip
    # Fallback to first active trip in demo
    return query.first()

def verify_driver_otp(
    db: Session,
    trip_id_str: str,
    vehicle_id: str,
    otp_code: str,
) -> Dict[str, Any]:
    """Verify 6-digit OTP to unlock driver run."""
    trip = db.query(ReleasedTrip).filter(
        (ReleasedTrip.trip_id_str == trip_id_str) | (ReleasedTrip.vehicle_id == vehicle_id)
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.otp_attempts >= 5:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Trip locked due to too many incorrect OTP attempts. Contact Dispatcher.",
        )

    if trip.otp_code != otp_code.strip():
        trip.otp_attempts += 1
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Invalid OTP code. {5 - trip.otp_attempts} attempt(s) remaining.",
        )

    trip.otp_unlocked = True
    trip.otp_unlocked_at = datetime.now(timezone.utc)
    db.commit()

    record_ledger_entry(
        db,
        action="trip_unlocked",
        actor="Sunil (Driver)",
        vehicle_id=trip.vehicle_id,
        trip_no=trip.trip_no,
        reason_note=f"Driver successfully unlocked run {trip.trip_id_str} via OTP verification.",
        plan_version=trip.manifest_version,
    )

    create_notification(
        db,
        target_role="dispatcher",
        kind="trip_unlocked",
        title=f"Run {trip.trip_id_str} Unlocked by Driver",
        text=f"Driver verified OTP for vehicle {trip.vehicle_id}.",
        plan_version=trip.manifest_version,
    )

    return {
        "success": True,
        "message": "Run unlocked successfully.",
        "tripId": trip.trip_id_str,
        "vehicleId": trip.vehicle_id,
        "unlocked": True,
    }

def get_driver_run_progress(db: Session, trip_id_str: str) -> DriverRunProgressResponse:
    """Calculate and return stop completion progress."""
    trip = db.query(ReleasedTrip).filter(ReleasedTrip.trip_id_str == trip_id_str).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    stops = list(trip.stop_outlet_ids or [])
    total_stops = len(stops)
    if total_stops == 0:
        return DriverRunProgressResponse(
            tripId=trip.trip_id_str,
            vehicleId=trip.vehicle_id,
            totalStops=0,
            completedStops=0,
            remainingStops=0,
            progressPercentage=100.0,
            currentStopIndex=0,
            isCompleted=True,
            status="completed",
        )

    # Deliveries recorded for this trip's stops
    deliveries = db.query(DeliveryRecord).filter(
        DeliveryRecord.stop_id.in_(stops),
    ).all()
    completed_stop_ids = {d.stop_id for d in deliveries}

    completed_count = len([s for s in stops if s in completed_stop_ids])
    remaining_count = total_stops - completed_count
    progress_pct = round((completed_count / total_stops) * 100, 1)

    # Find next uncompleted stop index
    current_idx = 0
    for idx, out_id in enumerate(stops):
        if out_id not in completed_stop_ids:
            current_idx = idx
            break
    else:
        current_idx = total_stops

    is_completed = completed_count == total_stops
    if is_completed and trip.loading_status != "completed":
        trip.loading_status = "completed"
        trip.completed_at = datetime.now(timezone.utc)
        db.commit()

    return DriverRunProgressResponse(
        tripId=trip.trip_id_str,
        vehicleId=trip.vehicle_id,
        totalStops=total_stops,
        completedStops=completed_count,
        remainingStops=remaining_count,
        progressPercentage=progress_pct,
        currentStopIndex=current_idx,
        isCompleted=is_completed,
        status=trip.loading_status,
    )

def record_driver_delivery(
    db: Session,
    record: LocalDeliveryRecordSchema,
    source_device_id: Optional[str] = None,
) -> DeliveryRecord:
    """
    Save driver delivery outcome with POD metadata.
    Idempotent on record.id.
    """
    existing = db.query(DeliveryRecord).filter(DeliveryRecord.id == record.id).first()
    if existing:
        return existing

    discrepancy_type = None
    discrepancy_notes = None
    expected_qty = 0
    delivered_qty = 0
    if record.discrepancyDetails:
        discrepancy_type = record.discrepancyDetails.type
        discrepancy_notes = record.discrepancyDetails.notes
        expected_qty = record.discrepancyDetails.expectedQty
        delivered_qty = record.discrepancyDetails.deliveredQty

    not_del_reason = None
    not_del_notes = None
    if record.notDeliveredDetails:
        not_del_reason = record.notDeliveredDetails.reason
        not_del_notes = record.notDeliveredDetails.notes

    pod_photo_name = None
    pod_photo_url = None
    pod_signer = None
    pod_has_sig = False
    pod_sig_url = None
    if record.podDetails:
        pod_photo_name = record.podDetails.photoName
        pod_photo_url = record.podDetails.photoUrl
        pod_signer = record.podDetails.signerName
        pod_has_sig = bool(record.podDetails.hasSignature)
        pod_sig_url = record.podDetails.signatureUrl

    now_utc = datetime.now(timezone.utc)
    rec_time = now_utc
    if record.createdAt:
        try:
            rec_time = datetime.fromisoformat(record.createdAt.replace("Z", "+00:00"))
        except Exception:
            pass

    delivery = DeliveryRecord(
        id=record.id,
        vehicle_id=record.vehicleId,
        stop_id=record.stopId,
        stop_name=record.stopName,
        outcome=record.outcome,
        expected_qty=expected_qty,
        delivered_qty=delivered_qty,
        discrepancy_type=discrepancy_type,
        discrepancy_notes=discrepancy_notes,
        not_delivered_reason=not_del_reason,
        not_delivered_notes=not_del_notes,
        pod_photo_name=pod_photo_name,
        pod_photo_url=pod_photo_url,
        pod_signer_name=pod_signer,
        pod_has_signature=pod_has_sig,
        pod_signature_url=pod_sig_url,
        status="Synced",
        offline_created=record.offlineCreated,
        recorded_at=rec_time,
        synced_at=now_utc,
        source_device_id=source_device_id,
    )
    db.add(delivery)

    # Update order statuses
    orders = db.query(Order).filter(Order.outlet_id == record.stopId).all()
    for o in orders:
        if record.outcome == "full":
            o.status = "delivered"
        elif record.outcome == "discrepancy":
            o.status = "delivered_short"
        elif record.outcome == "none":
            o.status = "not_delivered"

    db.commit()
    db.refresh(delivery)

    record_ledger_entry(
        db,
        action="delivered" if record.outcome == "full" else ("delivered_short" if record.outcome == "discrepancy" else "not_delivered"),
        actor="Sunil (Driver)",
        outlet_id=record.stopId,
        vehicle_id=record.vehicleId,
        reason_code=discrepancy_type or not_del_reason,
        reason_note=discrepancy_notes or not_del_notes or f"Delivered to {record.stopName} (Signer: {pod_signer or 'N/A'})",
    )

    create_notification(
        db,
        target_role="store_manager",
        target_outlet_id=record.stopId,
        kind="delivery",
        title=f"Delivery Completed at {record.stopName}",
        text=f"Outcome: {record.outcome.upper()}. Goods ready for store confirmation.",
    )

    return delivery

def record_driver_issue(
    db: Session,
    report: IssueReportRecordSchema,
    source_device_id: Optional[str] = None,
) -> DriverIssue:
    """
    Record operational road/delivery issue post-departure.
    Allowed during active trip.
    """
    existing = db.query(DriverIssue).filter(DriverIssue.id == report.id).first()
    if existing:
        return existing

    now_utc = datetime.now(timezone.utc)
    rec_time = now_utc
    if report.createdAt:
        try:
            rec_time = datetime.fromisoformat(report.createdAt.replace("Z", "+00:00"))
        except Exception:
            pass

    photo_name = report.photo.get("name") if report.photo else None
    photo_url = report.photo.get("url") if report.photo else None

    cats = [c.model_dump() for c in report.categories] if report.categories else None

    issue = DriverIssue(
        id=report.id,
        trip_id=report.tripId,
        vehicle_id=report.vehicleId,
        stop_code=report.stopCode,
        order_ref=report.orderId,
        outlet_name=report.outletName,
        category_id=report.categoryId,
        category_label=report.categoryLabel,
        category_icon=report.categoryIcon,
        categories=cats,
        related_scope=report.relatedScope or "stop",
        description=report.description,
        photo_name=photo_name,
        photo_url=photo_url,
        status="Synced",
        offline_created=report.offlineCreated,
        recorded_at=rec_time,
        synced_at=now_utc,
        source_device_id=source_device_id,
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)

    create_notification(
        db,
        target_role="dispatcher",
        kind="field_wins",
        title=f"Driver Road Issue: {report.categoryLabel}",
        text=f"{report.description} at {report.outletName} ({report.vehicleId}).",
    )

    return issue
