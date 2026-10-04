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
