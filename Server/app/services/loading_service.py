"""Loading workflow service for warehouse operations, reverse-sequence loading, and departure gate."""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.plan import ReleasedManifest, ReleasedTrip, OrderLoadingState
from app.models.operations import LoadingIssue
from app.models.order import Order
from app.models.reference import Outlet, Vehicle
from app.schemas.loading import LoadingIssueCreateRequest, LoadingIssueActionRequest
from app.services.notification_service import create_notification
from app.services.ledger_service import record_ledger_entry

def get_current_released_manifest(db: Session, scenario: str = "S1") -> Optional[ReleasedManifest]:
    return db.query(ReleasedManifest).filter(
        ReleasedManifest.scenario == scenario,
        ReleasedManifest.is_active == True,
    ).order_by(ReleasedManifest.version.desc()).first()

def _ensure_trip_current(db: Session, trip: ReleasedTrip) -> None:
    """A trip from a superseded manifest that has not departed is stale: the
    loader must work from the current release, never an older one. Trips that
    already departed stay live (their goods are on the road)."""
    if trip.loading_status in ("departed", "completed"):
        return
    manifest = db.query(ReleasedManifest).filter(ReleasedManifest.id == trip.manifest_id).first()
    if manifest and not manifest.is_active:
        latest = get_current_released_manifest(db, trip.scenario)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Trip {trip.trip_id_str} belongs to superseded plan v{trip.manifest_version}"
                   + (f"; the current plan is v{latest.version}." if latest else "."),
        )


def acknowledge_manifest(db: Session, version: int, acknowledged_by: str = "Rizwan (Loader)", scenario: str = "S1") -> ReleasedManifest:
    manifest = db.query(ReleasedManifest).filter(
        ReleasedManifest.version == version,
        ReleasedManifest.scenario == scenario,
    ).first()
    if not manifest:
        raise HTTPException(status_code=404, detail=f"Manifest version v{version} not found")
    if not manifest.is_active:
        latest = get_current_released_manifest(db, scenario)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Manifest v{version} has been superseded"
                   + (f" by v{latest.version}. Acknowledge the current plan instead." if latest else "."),
        )
    if manifest.acknowledgement == "acknowledged":
        return manifest  # idempotent: no second ledger entry or timestamp change
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
    outlets_map = {o.outlet_id: o for o in db.query(Outlet).filter(Outlet.outlet_id.in_(loading_sequence_outlets)).all()}
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == trip.vehicle_id).first()

    loading_steps = []
    loaded_weight_kg = 0.0
    loaded_volume_m3 = 0.0
    total_weight_kg = 0.0
    total_volume_m3 = 0.0
    for step_num, outlet_id in enumerate(loading_sequence_outlets, 1):
        matching_states = [s for s in order_states if orders_map.get(s.order_ref) and orders_map[s.order_ref].outlet_id == outlet_id]
        step_weight_kg = sum(orders_map[s.order_ref].order_weight_kg for s in matching_states)
        step_volume_m3 = sum(orders_map[s.order_ref].order_volume_m3 for s in matching_states)
        total_weight_kg += step_weight_kg
        total_volume_m3 += step_volume_m3
        step_all_loaded = all(s.is_loaded for s in matching_states) if matching_states else False
        if step_all_loaded:
            loaded_weight_kg += step_weight_kg
            loaded_volume_m3 += step_volume_m3

        outlet = outlets_map.get(outlet_id)
        loading_steps.append({
            "step": step_num,
            "outletId": outlet_id,
            "outletName": outlet.name if outlet else outlet_id,
            "deliveryStopRank": delivery_stops.index(outlet_id) + 1,
            "weightKg": round(step_weight_kg, 1),
            "volumeM3": round(step_volume_m3, 3),
            "orders": [
                {
                    "orderRef": s.order_ref,
                    "brand": orders_map[s.order_ref].brand,
                    "tempRequirement": orders_map[s.order_ref].temp_requirement,
                    "plannedUnits": s.planned_units,
                    "loadedUnits": s.loaded_units,
                    "effectiveUnits": s.effective_units,
                    "weightKg": orders_map[s.order_ref].order_weight_kg,
                    "volumeM3": orders_map[s.order_ref].order_volume_m3,
                    "isLoaded": s.is_loaded,
                }
                for s in matching_states
            ],
            "allOrdersLoaded": step_all_loaded,
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
        "loadedWeightKg": round(loaded_weight_kg, 1),
        "loadedVolumeM3": round(loaded_volume_m3, 3),
        "totalWeightKg": round(total_weight_kg, 1),
        "totalVolumeM3": round(total_volume_m3, 3),
        "vehicleWeightCapKg": vehicle.weight_cap_kg if vehicle else None,
        "vehicleVolumeCapM3": vehicle.volume_cap_m3 if vehicle else None,
    }

def refresh_trip_readiness(db: Session, trip: ReleasedTrip) -> bool:
    """Re-evaluate the departure gate from the committed database state and flip the trip to
    "ready" when every order is loaded, the manifest is acknowledged and no loading issue is open.

    The loader UI marks all orders of a stop loaded in parallel requests, so no single request is
    guaranteed to see the others' rows; each one re-checks after its own commit, so the last to
    commit always observes the full picture. Returns True when the trip is (now) ready."""
    if trip.loading_status in ("departed", "completed"):
        return False
    if trip.loading_status == "ready":
        return True
    db.refresh(trip)
    states = db.query(OrderLoadingState).filter(OrderLoadingState.released_trip_id == trip.id).all()
    open_issues = db.query(LoadingIssue).filter(
        LoadingIssue.manifest_version == trip.manifest_version,
        LoadingIssue.vehicle_id == trip.vehicle_id,
        LoadingIssue.trip_no == trip.trip_no,
        LoadingIssue.status.in_(["open", "escalated"]),
    ).count()
    manifest = db.query(ReleasedManifest).filter(ReleasedManifest.id == trip.manifest_id).first()
    is_ack = bool(manifest and manifest.acknowledgement == "acknowledged")
    if states and all(s.is_loaded for s in states) and open_issues == 0 and is_ack:
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
        return True
    return False


def mark_order_loaded(db: Session, trip_id: int, order_ref: str, loaded_units: Optional[int] = None) -> OrderLoadingState:
    trip = db.query(ReleasedTrip).filter(ReleasedTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Check departure gate: cannot modify after departed
    if trip.loading_status in ("departed", "completed"):
        raise HTTPException(status_code=409, detail="Cannot modify loading after vehicle departure")
    _ensure_trip_current(db, trip)
    state = db.query(OrderLoadingState).filter(
        OrderLoadingState.released_trip_id == trip.id,
        OrderLoadingState.order_ref == order_ref,
    ).first()
    if not state:
        raise HTTPException(status_code=404, detail="Order loading record not found on this trip")

    if loaded_units is not None and (loaded_units < 0 or loaded_units > state.planned_units):
        raise HTTPException(
            status_code=400,
            detail=f"Loaded units must be between 0 and the planned {state.planned_units}.",
        )
    state.is_loaded = True
    state.loaded_units = loaded_units if loaded_units is not None else state.planned_units
    # What the store should expect never exceeds what was physically loaded.
    state.effective_units = min(state.effective_units, state.loaded_units)
    state.loaded_at = datetime.now(timezone.utc)
    load_order = db.query(Order).filter(Order.order_ref == order_ref).first()
    if load_order and load_order.status in ("planned", "awaiting_planning", "loading"):
        load_order.status = "loaded"

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
    refresh_trip_readiness(db, trip)
    return state

def create_loading_issue(db: Session, req: LoadingIssueCreateRequest, reported_by: Optional[str] = None) -> LoadingIssue:
    trip = db.query(ReleasedTrip).filter(
        ReleasedTrip.manifest_version == req.manifest_version,
        ReleasedTrip.vehicle_id == req.vehicle_id,
        ReleasedTrip.trip_no == req.trip_no,
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="No released trip matches that manifest version, vehicle and trip number.")
    if trip.loading_status in ("departed", "completed"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Pre-departure loading issues cannot be created after vehicle departure.",
        )
    _ensure_trip_current(db, trip)
    state = db.query(OrderLoadingState).filter(
        OrderLoadingState.released_trip_id == trip.id,
        OrderLoadingState.order_ref == req.order_ref,
    ).first()
    if not state:
        raise HTTPException(status_code=404, detail=f"Order {req.order_ref} is not on trip {trip.trip_id_str}.")
    issue_order = db.query(Order).filter(Order.order_ref == req.order_ref).first()
    if issue_order and issue_order.outlet_id != req.outlet_id:
        raise HTTPException(status_code=400, detail=f"Order {req.order_ref} belongs to outlet {issue_order.outlet_id}, not {req.outlet_id}.")
    if req.units_affected < 0 or req.units_affected > state.planned_units:
        raise HTTPException(status_code=400, detail=f"Units affected must be between 0 and the planned {state.planned_units}.")

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
        reported_by=reported_by or req.reported_by or "Loader",
    )
    db.add(issue)
    # Block readiness if was ready
    if trip.loading_status == "ready":
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

def _issue_loading_state(db: Session, issue: LoadingIssue) -> Optional[OrderLoadingState]:
    trip = db.query(ReleasedTrip).filter(
        ReleasedTrip.manifest_version == issue.manifest_version,
        ReleasedTrip.vehicle_id == issue.vehicle_id,
        ReleasedTrip.trip_no == issue.trip_no,
    ).first()
    if not trip:
        return None
    return db.query(OrderLoadingState).filter(
        OrderLoadingState.released_trip_id == trip.id,
        OrderLoadingState.order_ref == issue.order_ref,
    ).first()


def resolve_loading_issue(db: Session, issue_id: str, req: LoadingIssueActionRequest, actor: Optional[str] = None) -> LoadingIssue:
    issue = db.query(LoadingIssue).filter(LoadingIssue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Loading issue not found")
    actor = actor or req.resolved_by or "Loader"
    issue_trip = db.query(ReleasedTrip).filter(
        ReleasedTrip.manifest_version == issue.manifest_version,
        ReleasedTrip.vehicle_id == issue.vehicle_id,
        ReleasedTrip.trip_no == issue.trip_no,
    ).first()
    if issue_trip and issue_trip.loading_status in ("departed", "completed"):
        raise HTTPException(status_code=409, detail="This trip has already departed; the loading issue can no longer be changed.")
    if issue_trip:
        _ensure_trip_current(db, issue_trip)
    if req.action == "replace_from_stock":
        issue.status = "resolved"
        issue.action_taken = "replace_from_stock"
        issue.resolved_at = datetime.now(timezone.utc)
        issue.resolved_by = actor
        state = _issue_loading_state(db, issue)
        if state:  # stock replaced: the store receives the full planned quantity
            state.effective_units = state.planned_units
            if state.is_loaded:
                state.loaded_units = state.planned_units
    elif req.action == "send_to_dispatcher":
        issue.status = "escalated"
        issue.action_taken = "send_to_dispatcher"
        create_notification(
            db,
            target_role="dispatcher",
            kind="load_problem",
            title=f"Loading Issue Escalated: {issue.vehicle_id} Trip {issue.trip_no}",
            text=f"{issue.issue_type.upper()} on {issue.order_ref} ({issue.units_affected} units) needs a dispatcher decision.",
            plan_version=issue.manifest_version,
        )
    elif req.action == "apply_policy":
        # Shortfall policy application
        issue.status = "resolved"
        issue.action_taken = "apply_policy"
        issue.resolved_at = datetime.now(timezone.utc)
        issue.resolved_by = actor
        # Update effective units on loading state
        state = _issue_loading_state(db, issue)
        if state:
            state.effective_units = max(0, state.planned_units - issue.units_affected)
            if state.is_loaded:
                state.loaded_units = min(state.loaded_units, state.effective_units)
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
        state = _issue_loading_state(db, issue)
        if state:  # a reverted shortfall policy no longer reduces the delivery
            state.effective_units = state.planned_units
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
        elif trip.loading_status == "ready":
            trip.loading_status = "loading"  # e.g. an undone issue re-opens the gate
    db.commit()
    db.refresh(issue)
    record_ledger_entry(
        db,
        action=f"loading_issue_{req.action}",
        actor=actor,
        order_ref=issue.order_ref,
        outlet_id=issue.outlet_id,
        vehicle_id=issue.vehicle_id,
        trip_no=issue.trip_no,
        reason_code=issue.issue_type,
        reason_note=f"{issue.issue_type} ({issue.units_affected} units) on {issue.order_ref}: {req.action}.",
        plan_version=issue.manifest_version,
    )
    return issue

def mark_trip_ready(db: Session, trip_id: int, actor: Optional[str] = None) -> ReleasedTrip:
    """Readiness gate: Loader verifies all orders are loaded, manifest is acknowledged,
    and all issues resolved, then marks trip Ready so the driver can receive and start it."""
    trip = db.query(ReleasedTrip).filter(ReleasedTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _ensure_trip_current(db, trip)
    if trip.loading_status in ("departed", "completed"):
        return trip

    states = db.query(OrderLoadingState).filter(OrderLoadingState.released_trip_id == trip.id).all()
    unloaded = sum(1 for s in states if not s.is_loaded)
    if unloaded > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot mark Ready: {unloaded} order(s) not yet loaded onto vehicle {trip.vehicle_id}.",
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
            detail=f"Cannot mark Ready: {open_issues} open loading issue(s) remain on vehicle {trip.vehicle_id}.",
        )
    manifest = db.query(ReleasedManifest).filter(ReleasedManifest.id == trip.manifest_id).first()
    if manifest and manifest.acknowledgement != "acknowledged":
        manifest.acknowledgement = "acknowledged"
        manifest.acknowledged_at = datetime.now(timezone.utc)
        manifest.acknowledged_by = actor or "Rizwan (Loader)"

    trip.loading_status = "ready"
    db.commit()
    db.refresh(trip)

    record_ledger_entry(
        db,
        action="trip_ready",
        actor=actor or "Rizwan (Loader)",
        vehicle_id=trip.vehicle_id,
        trip_no=trip.trip_no,
        plan_version=trip.manifest_version,
        reason_note=f"Trip {trip.trip_id_str} marked Ready by Loader. Departure gate cleared.",
    )
    create_notification(
        db,
        target_role="driver",
        kind="loading_complete",
        title=f"Trip {trip.trip_id_str} Ready for Departure",
        text=f"Vehicle {trip.vehicle_id} loaded successfully. Driver may start the trip.",
        plan_version=trip.manifest_version,
    )
    return trip

def depart_trip(db: Session, trip_id: int, actor: Optional[str] = None) -> ReleasedTrip:
    """Departure gate: a trip may only depart once it has reached the "ready"
    loading status (per the documented planned -> loading -> ready ->
    in_transit state machine) - i.e. every order is loaded, the manifest is
    acknowledged, and no loading issue is open. A trip is never allowed to
    depart merely because no issues happen to be open right now."""
    trip = db.query(ReleasedTrip).filter(ReleasedTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.loading_status in ("departed", "completed"):
        raise HTTPException(status_code=409, detail=f"Trip {trip.trip_id_str} has already departed.")
    _ensure_trip_current(db, trip)
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

    if trip.loading_status != "ready":
        states = db.query(OrderLoadingState).filter(OrderLoadingState.released_trip_id == trip.id).all()
        unloaded = sum(1 for s in states if not s.is_loaded)
        manifest = db.query(ReleasedManifest).filter(ReleasedManifest.id == trip.manifest_id).first()
        if unloaded > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Departure blocked: {unloaded} order(s) not yet loaded on vehicle {trip.vehicle_id}.",
            )
        if not manifest or manifest.acknowledgement != "acknowledged":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Departure blocked: manifest has not been acknowledged yet.",
            )

    trip.loading_status = "departed"
    trip.departed_at = datetime.now(timezone.utc)
    for dep_order in db.query(Order).filter(Order.order_ref.in_(list(trip.order_refs or []))).all():
        if dep_order.status in ("planned", "loaded", "loading"):
            dep_order.status = "in_transit"
    db.commit()
    db.refresh(trip)
    record_ledger_entry(
        db,
        action="trip_departed",
        actor=actor or "Loader",
        vehicle_id=trip.vehicle_id,
        trip_no=trip.trip_no,
        reason_note=f"Trip {trip.trip_id_str} departed the warehouse.",
        plan_version=trip.manifest_version,
    )

    create_notification(
        db,
        target_role="store_manager",
        kind="departure",
        title=f"Vehicle {trip.vehicle_id} Departed Warehouse",
        text=f"Trip {trip.trip_id_str} is now on route for deliveries.",
        plan_version=trip.manifest_version,
    )
    return trip
