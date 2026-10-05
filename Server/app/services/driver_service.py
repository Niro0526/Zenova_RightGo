"""Driver workflow service for run progress, stop delivery, POD, OTP, and post-departure issue reporting."""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import or_
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
from app.services.storage_service import storage_service
from app.core.config import settings

def get_driver_active_trip(db: Session, vehicle_id: Optional[str]) -> Optional[ReleasedTrip]:
    """Fetch the active released trip for the driver's own vehicle.

    Deliberately does NOT fall back to "any active trip" when the vehicle
    has none - a driver with no run today must see "no active run," not a
    different vehicle's trip (stops, OTP, delivery instructions). The old
    fallback here was a real wrong-trip-delivery bug: it made every driver
    land on whichever trip happened to be queried first, regardless of
    whose vehicle it actually was.
    """
    if not vehicle_id:
        return None
    base_q = db.query(ReleasedTrip).join(
        ReleasedManifest, ReleasedTrip.manifest_id == ReleasedManifest.id
    ).filter(ReleasedTrip.vehicle_id == vehicle_id)
    # Live trips: on the current manifest, or already departed on an older one
    # (a later release must never make an in-flight run disappear). Trips of a
    # superseded manifest that never departed are stale and are not offered.
    live = base_q.filter(
        ReleasedTrip.loading_status != "completed",
        or_(ReleasedManifest.is_active == True, ReleasedTrip.loading_status == "departed"),
    ).order_by(ReleasedTrip.manifest_version.asc(), ReleasedTrip.trip_no.asc()).all()
    in_flight = [t for t in live if t.loading_status == "departed"]
    if in_flight:
        return in_flight[0]
    if live:
        return sorted(live, key=lambda t: (-t.manifest_version, t.trip_no))[0]
    # Nothing left to do: keep showing the finished run on the current manifest.
    return base_q.filter(
        ReleasedManifest.is_active == True,
        ReleasedTrip.loading_status == "completed",
    ).order_by(ReleasedTrip.trip_no.desc()).first()


def _stop_order_quantities(db: Session, trip: ReleasedTrip, stop_id: str):
    """(order_ref, effective_units) for the orders this trip carries to a stop,
    in a stable order. effective_units reflects any loading shortfall."""
    refs = list(trip.order_refs or [])
    orders = db.query(Order).filter(Order.order_ref.in_(refs), Order.outlet_id == stop_id).order_by(Order.order_ref).all() if refs else []
    states = {
        s.order_ref: s
        for s in db.query(OrderLoadingState).filter(OrderLoadingState.released_trip_id == trip.id).all()
    }
    return [(o.order_ref, (states[o.order_ref].effective_units if o.order_ref in states else o.order_units)) for o in orders]


def delivered_units_by_order(db: Session, delivery: DeliveryRecord) -> Dict[str, int]:
    """Split a stop's delivered quantity across its orders (first order filled
    first) so a store can confirm receipt per order against what was actually
    delivered. Returns {} when the delivery cannot be tied to a trip."""
    if not delivery.trip_id or delivery.manifest_version is None:
        return {}
    trip = db.query(ReleasedTrip).filter(
        ReleasedTrip.trip_id_str == delivery.trip_id,
        ReleasedTrip.manifest_version == delivery.manifest_version,
        ReleasedTrip.vehicle_id == delivery.vehicle_id,
    ).first()
    if not trip:
        return {}
    remaining = delivery.delivered_qty
    out: Dict[str, int] = {}
    for ref, eff in _stop_order_quantities(db, trip, delivery.stop_id):
        take = min(eff, remaining)
        out[ref] = take
        remaining -= take
    return out

def verify_driver_otp(
    db: Session,
    trip_id_str: str,
    vehicle_id: str,
    otp_code: str,
    actor: Optional[str] = None,
) -> Dict[str, Any]:
    """Verify 6-digit OTP to unlock driver run. The trip must belong to the
    caller's vehicle and be the live run - never another vehicle's trip."""
    trip = get_driver_active_trip(db, vehicle_id)
    if not trip or (trip_id_str and trip.trip_id_str != trip_id_str):
        raise HTTPException(status_code=404, detail="No matching active run for your vehicle.")
    if trip.otp_unlocked:
        return {
            "success": True,
            "message": "Run already unlocked.",
            "tripId": trip.trip_id_str,
            "vehicleId": trip.vehicle_id,
            "unlocked": True,
        }
    if trip.loading_status not in ("ready", "departed"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Run {trip.trip_id_str} is not ready yet ({trip.loading_status}). The loader must finish loading first.",
        )
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
        actor=actor or "Driver",
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

def get_driver_run_progress(db: Session, trip_id_str: str, vehicle_id: Optional[str] = None) -> DriverRunProgressResponse:
    """Calculate and return stop completion progress for the caller's own trip."""
    q = db.query(ReleasedTrip).filter(ReleasedTrip.trip_id_str == trip_id_str)
    if vehicle_id:
        q = q.filter(ReleasedTrip.vehicle_id == vehicle_id)
    trip = q.order_by(ReleasedTrip.manifest_version.desc()).first()
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
        DeliveryRecord.trip_id == trip.trip_id_str,
        DeliveryRecord.manifest_version == trip.manifest_version,
        DeliveryRecord.vehicle_id == trip.vehicle_id,
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
    actor: Optional[str] = None,
) -> DeliveryRecord:
    """
    Save driver delivery outcome with POD metadata.
    Idempotent on record.id. The stop must belong to the vehicle's live,
    departed and unlocked trip; quantities are computed server-side from what
    was actually loaded, never trusted from the client.
    """
    existing = db.query(DeliveryRecord).filter(DeliveryRecord.id == record.id).first()
    if existing:
        return existing
    if record.outcome not in ("full", "discrepancy", "none"):
        raise HTTPException(status_code=422, detail=f"Unknown delivery outcome '{record.outcome}'.")
    trip = get_driver_active_trip(db, record.vehicleId)
    if not trip:
        raise HTTPException(status_code=409, detail="No active run for this vehicle.")
    if record.stopId not in (trip.stop_outlet_ids or []):
        raise HTTPException(status_code=409, detail=f"Stop {record.stopId} is not part of run {trip.trip_id_str}.")
    if trip.loading_status != "departed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Run {trip.trip_id_str} is '{trip.loading_status}', not departed: deliveries can only be recorded after the loader departs the trip.",
        )
    if not trip.otp_unlocked:
        raise HTTPException(status_code=403, detail="Run is locked. Enter the OTP from the loader to unlock it first.")
    duplicate = db.query(DeliveryRecord).filter(
        DeliveryRecord.trip_id == trip.trip_id_str,
        DeliveryRecord.manifest_version == trip.manifest_version,
        DeliveryRecord.vehicle_id == trip.vehicle_id,
        DeliveryRecord.stop_id == record.stopId,
    ).first()
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Stop {record.stopId} already has a recorded outcome ({duplicate.outcome}) on run {trip.trip_id_str}.",
        )
    stop_quantities = _stop_order_quantities(db, trip, record.stopId)
    expected_qty = sum(q for _, q in stop_quantities)
    discrepancy_type = None
    discrepancy_notes = None
    delivered_qty = 0
    if record.outcome == "full":
        delivered_qty = expected_qty
    elif record.outcome == "discrepancy":
        if not record.discrepancyDetails:
            raise HTTPException(status_code=422, detail="Discrepancy details are required for a discrepancy outcome.")
        delivered_qty = record.discrepancyDetails.deliveredQty
        if delivered_qty < 0 or delivered_qty > expected_qty:
            raise HTTPException(
                status_code=422,
                detail=f"Delivered quantity must be between 0 and the {expected_qty} units loaded for this stop.",
            )
        discrepancy_type = record.discrepancyDetails.type
        discrepancy_notes = record.discrepancyDetails.notes
    elif record.discrepancyDetails:
        discrepancy_type = record.discrepancyDetails.type
        discrepancy_notes = record.discrepancyDetails.notes

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

    if not pod_photo_url and record.discrepancyDetails and record.discrepancyDetails.photoUrl:
        pod_photo_url = record.discrepancyDetails.photoUrl
        pod_photo_name = record.discrepancyDetails.photoName

    if not pod_photo_url and record.notDeliveredDetails and record.notDeliveredDetails.photoUrl:
        pod_photo_url = record.notDeliveredDetails.photoUrl
        pod_photo_name = record.notDeliveredDetails.photoName

    # Upload and convert Base64 payloads to Supabase Storage references
    if pod_sig_url:
        pod_sig_url = storage_service.upload_evidence(
            bucket=settings.BUCKET_POD_SIGNATURES,
            data_payload=pod_sig_url,
            identifier=f"{record.id}_sig",
            filename_hint=f"{record.id}_signature.png"
        )
        pod_has_sig = True

    if pod_photo_url:
        pod_photo_url = storage_service.upload_evidence(
            bucket=settings.BUCKET_POD_PHOTOS,
            data_payload=pod_photo_url,
            identifier=f"{record.id}_photo",
            filename_hint=pod_photo_name or f"{record.id}_evidence.jpg"
        )

    now_utc = datetime.now(timezone.utc)
    rec_time = now_utc
    if record.createdAt:
        try:
            rec_time = datetime.fromisoformat(record.createdAt.replace("Z", "+00:00"))
        except Exception:
            pass

    delivery = DeliveryRecord(
        id=record.id,
        manifest_version=trip.manifest_version,
        trip_id=trip.trip_id_str,
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

    # Update only the orders this trip carried to this stop
    stop_refs = {ref for ref, _ in stop_quantities}
    remaining = delivered_qty
    for ref, eff in stop_quantities:
        order_row = db.query(Order).filter(Order.order_ref == ref).first()
        if not order_row:
            continue
        take = min(eff, remaining)
        remaining -= take
        if record.outcome == "none":
            order_row.status = "not_delivered"
        elif take < order_row.order_units:
            order_row.status = "delivered_short"
        else:
            order_row.status = "delivered"
    db.flush()
    # Close the run once every stop has an outcome
    stops = list(trip.stop_outlet_ids or [])
    done = {d.stop_id for d in db.query(DeliveryRecord).filter(
        DeliveryRecord.trip_id == trip.trip_id_str,
        DeliveryRecord.manifest_version == trip.manifest_version,
        DeliveryRecord.vehicle_id == trip.vehicle_id,
    ).all()} | {record.stopId}
    run_completed = bool(stops) and all(s in done for s in stops)
    if run_completed:
        trip.loading_status = "completed"
        trip.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(delivery)

    record_ledger_entry(
        db,
        action="delivered" if record.outcome == "full" else ("delivered_short" if record.outcome == "discrepancy" else "not_delivered"),
        actor=actor or "Driver",
        outlet_id=record.stopId,
        vehicle_id=record.vehicleId,
        trip_no=trip.trip_no,
        plan_version=trip.manifest_version,
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
    if record.outcome != "full":
        create_notification(
            db,
            target_role="dispatcher",
            kind="delivery_exception",
            title=f"Delivery {'Short' if record.outcome == 'discrepancy' else 'Not Delivered'} at {record.stopName}",
            text=f"{expected_qty - delivered_qty} of {expected_qty} units not delivered on {trip.trip_id_str} ({record.vehicleId}).",
            plan_version=trip.manifest_version,
        )
    if run_completed:
        record_ledger_entry(
            db,
            action="trip_completed",
            actor=actor or "Driver",
            vehicle_id=trip.vehicle_id,
            trip_no=trip.trip_no,
            reason_note=f"All stops on {trip.trip_id_str} have a recorded outcome.",
            plan_version=trip.manifest_version,
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
    issue_trip = get_driver_active_trip(db, report.vehicleId)
    if not issue_trip or (report.tripId and report.tripId != issue_trip.trip_id_str):
        raise HTTPException(status_code=409, detail="Issue report does not match your live run.")
    if issue_trip.loading_status not in ("departed", "completed"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Post-departure issues can only be reported once the trip has departed (use the loader's issue log before departure).",
        )
    now_utc = datetime.now(timezone.utc)
    rec_time = now_utc
    if report.createdAt:
        try:
            rec_time = datetime.fromisoformat(report.createdAt.replace("Z", "+00:00"))
        except Exception:
            pass

    photo_name = report.photo.get("name") if report.photo else None
    photo_url = report.photo.get("url") if report.photo else None

    if photo_url:
        photo_url = storage_service.upload_evidence(
            bucket=settings.BUCKET_DRIVER_ISSUE_EVIDENCE,
            data_payload=photo_url,
            identifier=f"{report.id}_photo",
            filename_hint=photo_name or f"{report.id}_issue.jpg"
        )

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
