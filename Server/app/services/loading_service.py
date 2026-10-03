"""Loading workflow service for warehouse operations, reverse-sequence loading, and departure gate."""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.plan import ReleasedManifest, ReleasedTrip, OrderLoadingState
from app.models.operations import LoadingIssue
from app.models.order import Order
from app.schemas.loading import LoadingIssueCreateRequest, LoadingIssueActionRequest
from app.services.notification_service import create_notification
from app.services.ledger_service import record_ledger_entry

def get_current_released_manifest(db: Session, scenario: str = "S1") -> Optional[ReleasedManifest]:
    return db.query(ReleasedManifest).filter(
        ReleasedManifest.scenario == scenario,
        ReleasedManifest.is_active == True,
    ).order_by(ReleasedManifest.version.desc()).first()

def acknowledge_manifest(db: Session, version: int, acknowledged_by: str = "Rizwan (Loader)") -> ReleasedManifest:
    manifest = db.query(ReleasedManifest).filter(ReleasedManifest.version == version).first()
    if not manifest:
        raise HTTPException(status_code=404, detail=f"Manifest version v{version} not found")

    manifest.acknowledgement = "acknowledged"
    manifest.acknowledged_at = datetime.now(timezone.utc)
    manifest.acknowledged_by = acknowledged_by
    db.commit()
    db.refresh(manifest)

    record_ledger_entry(
        db,
        action="manifest_acknowledged",
        actor=acknowledged_by,
        reason_note=f"Loader acknowledged manifest v{version}",
        plan_version=version,
    )
    return manifest

def get_trip_loading_sequence(db: Session, trip_id: int) -> Dict[str, Any]:
    """Return LIFO loading sequence (last delivery stop loaded first)."""
    trip = db.query(ReleasedTrip).filter(ReleasedTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    delivery_stops = list(trip.stop_outlet_ids or [])
    # Reverse stop sequence for loading (LIFO)
    loading_sequence_outlets = list(reversed(delivery_stops))

    order_states = db.query(OrderLoadingState).filter(OrderLoadingState.released_trip_id == trip.id).all()
    orders_map = {o.order_ref: o for o in db.query(Order).filter(Order.order_ref.in_([s.order_ref for s in order_states])).all()}

    loading_steps = []
    for step_num, outlet_id in enumerate(loading_sequence_outlets, 1):
        matching_states = [s for s in order_states if orders_map.get(s.order_ref) and orders_map[s.order_ref].outlet_id == outlet_id]
        loading_steps.append({
            "step": step_num,
            "outletId": outlet_id,
            "deliveryStopRank": delivery_stops.index(outlet_id) + 1,
            "orders": [
                {
                    "orderRef": s.order_ref,
                    "brand": orders_map[s.order_ref].brand,
                    "tempRequirement": orders_map[s.order_ref].temp_requirement,
                    "plannedUnits": s.planned_units,
                    "loadedUnits": s.loaded_units,
                    "effectiveUnits": s.effective_units,
                    "isLoaded": s.is_loaded,
                }
                for s in matching_states
            ],
            "allOrdersLoaded": all(s.is_loaded for s in matching_states),
        })

    return {
        "tripId": trip.trip_id_str,
        "vehicleId": trip.vehicle_id,
        "tripNo": trip.trip_no,
        "manifestVersion": trip.manifest_version,
        "brand": trip.brand,
        "district": trip.district,
        "plannedDepartureTime": trip.planned_departure_time,
        "leaveByTime": trip.leave_by_time,
        "loadingStatus": trip.loading_status,
        "loadingSequence": loading_steps,
    }

def mark_order_loaded(db: Session, trip_id: int, order_ref: str, loaded_units: Optional[int] = None) -> OrderLoadingState:
    trip = db.query(ReleasedTrip).filter(ReleasedTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Check departure gate: cannot modify after departed
    if trip.loading_status in ("departed", "completed"):
        raise HTTPException(status_code=409, detail="Cannot modify loading after vehicle departure")

    state = db.query(OrderLoadingState).filter(
        OrderLoadingState.released_trip_id == trip.id,
        OrderLoadingState.order_ref == order_ref,
    ).first()
    if not state:
        raise HTTPException(status_code=404, detail="Order loading record not found on this trip")

    state.is_loaded = True
    state.loaded_units = loaded_units if loaded_units is not None else state.planned_units
    state.loaded_at = datetime.now(timezone.utc)

    if trip.loading_status == "planned":
        trip.loading_status = "loading"

    # Check if all orders are loaded and evaluate departure gate
    all_states = db.query(OrderLoadingState).filter(OrderLoadingState.released_trip_id == trip.id).all()
    open_issues = db.query(LoadingIssue).filter(
        LoadingIssue.manifest_version == trip.manifest_version,
        LoadingIssue.vehicle_id == trip.vehicle_id,
        LoadingIssue.trip_no == trip.trip_no,
        LoadingIssue.status.in_(["open", "escalated"]),
    ).count()

    manifest = db.query(ReleasedManifest).filter(ReleasedManifest.id == trip.manifest_id).first()
    is_ack = manifest and manifest.acknowledgement == "acknowledged"

    if all(s.is_loaded for s in all_states) and open_issues == 0 and is_ack:
        trip.loading_status = "ready"
        create_notification(
            db,
            target_role="driver",
            kind="loading_complete",
            title=f"Trip {trip.trip_id_str} Ready for Departure",
            text=f"Vehicle {trip.vehicle_id} loaded successfully. OTP unlock available.",
            plan_version=trip.manifest_version,
        )

    db.commit()
    db.refresh(state)
    return state

def create_loading_issue(db: Session, req: LoadingIssueCreateRequest) -> LoadingIssue:
    # Check that trip is not yet departed
    trip = db.query(ReleasedTrip).filter(
        ReleasedTrip.manifest_version == req.manifest_version,
        ReleasedTrip.vehicle_id == req.vehicle_id,
        ReleasedTrip.trip_no == req.trip_no,
    ).first()
    if trip and trip.loading_status in ("departed", "completed"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Pre-departure loading issues cannot be created after vehicle departure.",
        )

    issue = LoadingIssue(
        manifest_version=req.manifest_version,
        vehicle_id=req.vehicle_id,
        trip_no=req.trip_no,
        order_ref=req.order_ref,
        outlet_id=req.outlet_id,
        issue_type=req.issue_type,
        units_affected=req.units_affected,
        status="open",
        notes=req.notes,
        reported_at=datetime.now(timezone.utc),
        reported_by=req.reported_by or "Rizwan (Loader)",
    )
    db.add(issue)

    # Block readiness if was ready
    if trip and trip.loading_status == "ready":
        trip.loading_status = "loading"

    db.commit()
    db.refresh(issue)

    create_notification(
        db,
        target_role="dispatcher",
        kind="load_problem",
        title=f"Loading Issue on {req.vehicle_id} Trip {req.trip_no}",
        text=f"{req.issue_type.upper()} reported for order {req.order_ref} ({req.units_affected} units).",
        plan_version=req.manifest_version,
    )

    return issue

def resolve_loading_issue(db: Session, issue_id: str, req: LoadingIssueActionRequest) -> LoadingIssue:
    issue = db.query(LoadingIssue).filter(LoadingIssue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Loading issue not found")

    if req.action == "replace_from_stock":
        issue.status = "resolved"
        issue.action_taken = "replace_from_stock"
        issue.resolved_at = datetime.now(timezone.utc)
        issue.resolved_by = req.resolved_by or "Rizwan (Loader)"
    elif req.action == "send_to_dispatcher":
        issue.status = "escalated"
        issue.action_taken = "send_to_dispatcher"
    elif req.action == "apply_policy":
        # Shortfall policy application
        issue.status = "resolved"
        issue.action_taken = "apply_policy"
        issue.resolved_at = datetime.now(timezone.utc)
        issue.resolved_by = req.resolved_by or "Rizwan (Loader)"

        # Update effective units on loading state
        state = db.query(OrderLoadingState).filter(
            OrderLoadingState.manifest_version == issue.manifest_version,
            OrderLoadingState.order_ref == issue.order_ref,
        ).first()
        if state:
            state.effective_units = max(0, state.planned_units - issue.units_affected)
            create_notification(
                db,
                target_role="store_manager",
                target_outlet_id=issue.outlet_id,
                kind="arriving_short",
                title=f"Order {issue.order_ref} Arriving Short",
                text=f"Warehouse shortfall of {issue.units_affected} units. Effective delivery: {state.effective_units} units.",
                plan_version=issue.manifest_version,
            )
    elif req.action == "undo":
        issue.status = "open"
        issue.action_taken = "undo"
        issue.resolved_at = None
        issue.resolved_by = None

    if req.notes:
        issue.notes = f"{issue.notes or ''} | Action Note: {req.notes}".strip(" |")

    # Re-evaluate trip readiness
    trip = db.query(ReleasedTrip).filter(
        ReleasedTrip.manifest_version == issue.manifest_version,
        ReleasedTrip.vehicle_id == issue.vehicle_id,
        ReleasedTrip.trip_no == issue.trip_no,
    ).first()
    if trip:
        all_states = db.query(OrderLoadingState).filter(OrderLoadingState.released_trip_id == trip.id).all()
        open_issues = db.query(LoadingIssue).filter(
            LoadingIssue.manifest_version == trip.manifest_version,
            LoadingIssue.vehicle_id == trip.vehicle_id,
            LoadingIssue.trip_no == trip.trip_no,
            LoadingIssue.status.in_(["open", "escalated"]),
        ).count()
        manifest = db.query(ReleasedManifest).filter(ReleasedManifest.id == trip.manifest_id).first()
        is_ack = manifest and manifest.acknowledgement == "acknowledged"

        if all(s.is_loaded for s in all_states) and open_issues == 0 and is_ack:
            trip.loading_status = "ready"

    db.commit()
    db.refresh(issue)
    return issue

def depart_trip(db: Session, trip_id: int) -> ReleasedTrip:
    """Departure gate: verifies loading complete and no blocking issues before vehicle departs warehouse."""
    trip = db.query(ReleasedTrip).filter(ReleasedTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.loading_status in ("in_transit", "departed", "completed"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Trip has already departed")

    states = db.query(OrderLoadingState).filter(
        OrderLoadingState.released_trip_id == trip.id,
    ).all()
    if not states or any(not state.is_loaded for state in states):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Departure blocked: all orders must be loaded first.",
        )

    manifest = db.query(ReleasedManifest).filter(ReleasedManifest.id == trip.manifest_id).first()
    if not manifest or manifest.acknowledgement != "acknowledged":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Departure blocked: manifest acknowledgement is required.",
        )

    open_issues = db.query(LoadingIssue).filter(
        LoadingIssue.manifest_version == trip.manifest_version,
        LoadingIssue.vehicle_id == trip.vehicle_id,
        LoadingIssue.trip_no == trip.trip_no,
        LoadingIssue.status.in_(["open", "escalated"]),
    ).count()
    if open_issues > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Departure blocked: {open_issues} open loading issue(s) remain on vehicle {trip.vehicle_id}.",
        )

    trip.loading_status = "in_transit"
    trip.departed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(trip)

    create_notification(
        db,
        target_role="store_manager",
        kind="departure",
        title=f"Vehicle {trip.vehicle_id} Departed Warehouse",
        text=f"Trip {trip.trip_id_str} is now on route for deliveries.",
        plan_version=trip.manifest_version,
    )
    return trip
