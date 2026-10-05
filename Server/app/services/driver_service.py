"""Driver workflow service for run progress, stop delivery, POD, OTP, and post-departure issue reporting."""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import or_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.plan import ReleasedManifest, ReleasedTrip, OrderLoadingState
from app.models.operations import DeliveryRecord, DriverIssue, StopArrival
from app.models.order import Order
from app.models.reference import Outlet
from app.schemas.driver import (
    LocalDeliveryRecordSchema,
    IssueReportRecordSchema,
    DriverRunProgressResponse,
)
from app.services.notification_service import create_notification
from app.services.ledger_service import record_ledger_entry
from app.services.loading_service import refresh_trip_readiness
from app.services.storage_service import storage_service
from app.core.config import settings

def reject(status_code: int, code: str, message: str, retryable: bool) -> HTTPException:
    """Structured refusal. `retryable` tells the offline queue whether trying again later can
    succeed (run not departed/unlocked yet, an earlier stop still queued) or never will
    (stop already recorded, not on this run, invalid quantity) so it stops retrying and keeps
    the record for review instead of looping forever."""
    return HTTPException(status_code=status_code, detail={"code": code, "message": message, "retryable": retryable})


def _parse_device_time(value: Optional[str], fallback: datetime) -> datetime:
    """Device clock timestamp, clamped to a sane range (never in the future)."""
    if not value:
        return fallback
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
    except Exception:
        return fallback
    return min(parsed, fallback)


def _recorded_stop_ids(db: Session, trip: ReleasedTrip) -> set:
    return {d.stop_id for d in db.query(DeliveryRecord).filter(
        DeliveryRecord.trip_id == trip.trip_id_str,
        DeliveryRecord.manifest_version == trip.manifest_version,
        DeliveryRecord.vehicle_id == trip.vehicle_id,
    ).all()}


def _require_stop_sequence(db: Session, trip: ReleasedTrip, stop_id: str) -> None:
    """The approved sequence (the released stop order) is enforced by the backend: a stop can only
    be worked once every earlier stop has an outcome. The existing exception path is the driver's
    "not delivered" outcome (with reason + evidence), which counts as an outcome and unblocks the next."""
    stops = list(trip.stop_outlet_ids or [])
    done = _recorded_stop_ids(db, trip)
    pending = [s for s in stops[: stops.index(stop_id)] if s not in done]
    if pending:
        raise reject(
            status.HTTP_409_CONFLICT, "PREVIOUS_STOP_PENDING",
            f"Finish stop {pending[0]} first (stops must be worked in the released order; record it as not delivered if it cannot be served).",
            True,
        )


def _require_workable_run(trip: Optional[ReleasedTrip], stop_id: str) -> ReleasedTrip:
    if not trip:
        raise reject(status.HTTP_409_CONFLICT, "NO_ACTIVE_RUN", "No active run for this vehicle.", False)
    if stop_id not in (trip.stop_outlet_ids or []):
        raise reject(status.HTTP_409_CONFLICT, "STOP_NOT_ON_RUN", f"Stop {stop_id} is not part of run {trip.trip_id_str}.", False)
    if trip.loading_status == "completed":
        raise reject(status.HTTP_409_CONFLICT, "RUN_COMPLETED", f"Run {trip.trip_id_str} is already completed.", False)
    if trip.loading_status != "departed":
        raise reject(
            status.HTTP_409_CONFLICT, "RUN_NOT_DEPARTED",
            f"Run {trip.trip_id_str} is '{trip.loading_status}', not departed: stops can only be worked after the loader departs the trip.",
            True,
        )
    if not trip.otp_unlocked:
        raise reject(status.HTTP_403_FORBIDDEN, "RUN_LOCKED", "Run is locked. Enter the unlock code from the loader first.", True)
    return trip


def confirm_arrival(
    db: Session,
    vehicle_id: str,
    trip_id_str: str,
    stop_id: str,
    arrived_at: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    actor: Optional[str] = None,
) -> StopArrival:
    """Record the driver's MANUAL arrival at a stop. Idempotent: the first confirmation wins.
    Nothing in the system calls this from GPS - proximity alone never confirms arrival."""
    trip = get_driver_active_trip(db, vehicle_id)
    if trip and trip_id_str and trip.trip_id_str != trip_id_str:
        raise reject(status.HTTP_409_CONFLICT, "RUN_MISMATCH", "That run is not your live run.", False)
    trip = _require_workable_run(trip, stop_id)
    existing = db.query(StopArrival).filter(
        StopArrival.trip_id == trip.trip_id_str,
        StopArrival.manifest_version == trip.manifest_version,
        StopArrival.vehicle_id == trip.vehicle_id,
        StopArrival.stop_id == stop_id,
    ).first()
    if existing:
        return existing
    if stop_id in _recorded_stop_ids(db, trip):
        raise reject(status.HTTP_409_CONFLICT, "STOP_ALREADY_RECORDED", f"Stop {stop_id} already has a recorded outcome.", False)
    _require_stop_sequence(db, trip, stop_id)
    now_utc = datetime.now(timezone.utc)
    arrival = StopArrival(
        trip_id=trip.trip_id_str,
        manifest_version=trip.manifest_version,
        vehicle_id=trip.vehicle_id,
        stop_id=stop_id,
        arrived_at=_parse_device_time(arrived_at, now_utc),
        recorded_at=now_utc,
        source="manual",
        latitude=latitude,
        longitude=longitude,
        arrived_by=actor,
    )
    db.add(arrival)
    db.commit()
    db.refresh(arrival)
    outlet = db.query(Outlet).filter(Outlet.outlet_id == stop_id).first()
    record_ledger_entry(
        db,
        action="arrived",
        actor=actor or "Driver",
        outlet_id=stop_id,
        vehicle_id=trip.vehicle_id,
        trip_no=trip.trip_no,
        reason_note=f"Driver confirmed arrival at {outlet.name if outlet else stop_id} (manual).",
        plan_version=trip.manifest_version,
    )
    create_notification(
        db,
        target_role="store_manager",
        target_outlet_id=stop_id,
        kind="arrival",
        title=f"Vehicle {trip.vehicle_id} Arrived",
        text=f"The driver has confirmed arrival at your outlet on {trip.trip_id_str}.",
        plan_version=trip.manifest_version,
    )
    return arrival


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
    if trip.loading_status not in ("ready", "departed") and not refresh_trip_readiness(db, trip):
        raise reject(
            status.HTTP_409_CONFLICT, "RUN_NOT_READY",
            f"Run {trip.trip_id_str} is not ready yet ({trip.loading_status}). The loader must finish loading first.", True,
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
        raise reject(422, "INVALID_OUTCOME", f"Unknown delivery outcome '{record.outcome}'.", False)
    trip = _require_workable_run(get_driver_active_trip(db, record.vehicleId), record.stopId)
    duplicate = db.query(DeliveryRecord).filter(
        DeliveryRecord.trip_id == trip.trip_id_str,
        DeliveryRecord.manifest_version == trip.manifest_version,
        DeliveryRecord.vehicle_id == trip.vehicle_id,
        DeliveryRecord.stop_id == record.stopId,
    ).first()
    if duplicate:
        raise reject(
            status.HTTP_409_CONFLICT, "STOP_ALREADY_RECORDED",
            f"Stop {record.stopId} already has a recorded outcome ({duplicate.outcome}) on run {trip.trip_id_str}.", False,
        )
    _require_stop_sequence(db, trip, record.stopId)
    # Arrival is its own explicit, persisted step. An offline record carries the time of the
    # driver's manual confirmation; if neither exists the driver never confirmed arrival.
    arrival = db.query(StopArrival).filter(
        StopArrival.trip_id == trip.trip_id_str,
        StopArrival.manifest_version == trip.manifest_version,
        StopArrival.vehicle_id == trip.vehicle_id,
        StopArrival.stop_id == record.stopId,
    ).first()
    if not arrival:
        if not record.arrivedAt:
            raise reject(status.HTTP_409_CONFLICT, "ARRIVAL_REQUIRED", f"Confirm arrival at {record.stopId} before recording the delivery.", False)
        arrival = confirm_arrival(db, trip.vehicle_id, trip.trip_id_str, record.stopId, arrived_at=record.arrivedAt, actor=actor)
    stop_quantities = _stop_order_quantities(db, trip, record.stopId)
    expected_qty = sum(q for _, q in stop_quantities)
    discrepancy_type = None
    discrepancy_notes = None
    delivered_qty = 0
    if record.outcome == "full":
        delivered_qty = expected_qty
    elif record.outcome == "discrepancy":
        if not record.discrepancyDetails:
            raise reject(422, "DISCREPANCY_DETAILS_REQUIRED", "Discrepancy details are required for a discrepancy outcome.", False)
        delivered_qty = record.discrepancyDetails.deliveredQty
        if delivered_qty < 0 or delivered_qty > expected_qty:
            raise reject(422, "QUANTITY_INVALID", f"Delivered quantity must be between 0 and the {expected_qty} units loaded for this stop.", False)
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
        raise reject(status.HTTP_409_CONFLICT, "RUN_MISMATCH", "Issue report does not match your live run.", False)
    if issue_trip.loading_status not in ("departed", "completed"):
        raise reject(
            status.HTTP_409_CONFLICT, "RUN_NOT_DEPARTED",
            "Post-departure issues can only be reported once the trip has departed (use the loader's issue log before departure).", True,
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
