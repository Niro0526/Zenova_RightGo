"""Planning service for Dispatcher workspace, draft mutations, greedy suggestions, and atomic release."""

from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.reference import Outlet, Vehicle, ScenarioFleetEntry, ServiceAllowance, DistrictTravel
from app.models.order import Order
from app.models.plan import (
    DraftPlan,
    DraftAssignment,
    DraftStopSequence,
    DraftTripMeta,
    DraftVehicleFuelInput,
    ReleasedManifest,
    ReleasedTrip,
    OrderLoadingState,
    TripStop,
)
from app.models.memory import DeferralMemory
from app.services.validation_service import ValidationEngine, compute_trip_duration, format_hhmm, parse_hhmm
from app.services.notification_service import create_notification
from app.services.ledger_service import record_ledger_entry
from app.core.security import generate_otp_code

def get_validation_engine(db: Session, scenario: str = "S1") -> ValidationEngine:
    orders = db.query(Order).filter(Order.scenario == scenario).all()
    vehicles = db.query(Vehicle).all()
    fleet_rows = db.query(ScenarioFleetEntry).filter(ScenarioFleetEntry.scenario == scenario).all()
    fleet_status = {f.vehicle_id: f.status for f in fleet_rows}
    allowances = db.query(ServiceAllowance).all()
    travel_rows = db.query(DistrictTravel).all()
    return ValidationEngine(orders, vehicles, fleet_status, allowances, travel_rows)

def get_draft_state(db: Session, scenario: str = "S1") -> Dict[str, Any]:
    draft = db.query(DraftPlan).filter(DraftPlan.scenario == scenario).first()
    if not draft:
        draft = DraftPlan(scenario=scenario, draft_revision=0, updated_by="Sarah Jenkins")
        db.add(draft)
        db.commit()

    assignments_rows = db.query(DraftAssignment).filter(DraftAssignment.scenario == scenario).all()
    assignments = {
        a.order_ref: {
            "decision": a.decision,
            "vehicleId": a.vehicle_id,
            "tripNo": a.trip_no,
            "reasonCode": a.reason_code,
            "reasonNote": a.reason_note,
        }
        for a in assignments_rows
    }

    # Ensure all scenario orders are in assignments
    orders = db.query(Order).filter(Order.scenario == scenario).all()
    for o in orders:
        if o.order_ref not in assignments:
            assignments[o.order_ref] = {
                "decision": "unresolved",
                "vehicleId": None,
                "tripNo": None,
                "reasonCode": None,
                "reasonNote": None,
            }

    stop_seq_rows = db.query(DraftStopSequence).filter(DraftStopSequence.scenario == scenario).all()
    stop_sequences = {f"{s.vehicle_id}-{s.trip_no}": s.stop_outlet_ids for s in stop_seq_rows}

    trip_meta_rows = db.query(DraftTripMeta).filter(DraftTripMeta.scenario == scenario).all()
    trip_meta = {
        f"{m.vehicle_id}-{m.trip_no}": {"plannedDepartureTime": m.planned_departure_time}
        for m in trip_meta_rows
    }

    fuel_input_rows = db.query(DraftVehicleFuelInput).filter(DraftVehicleFuelInput.scenario == scenario).all()
    vehicle_fuel_inputs = {f.vehicle_id: f.prior_weekly_fuel_usage_l for f in fuel_input_rows}

    served = sum(1 for a in assignments.values() if a["decision"] == "served")
    deferred = sum(1 for a in assignments.values() if a["decision"] == "deferred")
    unresolved = sum(1 for a in assignments.values() if a["decision"] == "unresolved")

    return {
        "scenario": scenario,
        "draftRevision": draft.draft_revision,
        "assignments": assignments,
        "stopSequences": stop_sequences,
        "tripMeta": trip_meta,
        "vehicleFuelInputs": vehicle_fuel_inputs,
        "counts": {
            "total": len(orders),
            "served": served,
            "deferred": deferred,
            "unresolved": unresolved,
        },
    }

def assign_order(
    db: Session,
    order_ref: str,
    vehicle_id: str,
    trip_no: int,
    scenario: str = "S1",
    actor: str = "Sarah Jenkins",
) -> Dict[str, Any]:
    engine = get_validation_engine(db, scenario)
    draft_state = get_draft_state(db, scenario)
    assignments = draft_state["assignments"]
    stop_seqs = draft_state["stopSequences"]
    trip_meta = {k: v.get("plannedDepartureTime") for k, v in draft_state["tripMeta"].items()}
    fuel_inputs = draft_state["vehicleFuelInputs"]

    passport = engine.evaluate_candidate_passport(
        order_ref, vehicle_id, trip_no, assignments, stop_seqs, trip_meta, fuel_inputs
    )
    if not passport.checkerFeasible:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Assignment violates hard checker feasibility constraints.",
        )

    order = engine.orders_map.get(order_ref)
    prev_assignment = assignments.get(order_ref, {})
    prev_str = f"{prev_assignment.get('vehicleId')} · Trip {prev_assignment.get('tripNo')}" if prev_assignment.get("decision") == "served" else "-"
    new_str = f"{vehicle_id} · Trip {trip_no}"

    # Update or insert draft assignment
    da = db.query(DraftAssignment).filter(
        DraftAssignment.scenario == scenario,
        DraftAssignment.order_ref == order_ref,
    ).first()
    if not da:
        da = DraftAssignment(scenario=scenario, order_ref=order_ref)
        db.add(da)

    da.decision = "served"
    da.vehicle_id = vehicle_id
    da.trip_no = trip_no
    da.reason_code = None
    da.reason_note = None

    # Update stop sequence
    key = f"{vehicle_id}-{trip_no}"
    old_key = f"{prev_assignment.get('vehicleId')}-{prev_assignment.get('tripNo')}" if prev_assignment.get("decision") == "served" else None

    dseq = db.query(DraftStopSequence).filter(
        DraftStopSequence.scenario == scenario,
        DraftStopSequence.vehicle_id == vehicle_id,
        DraftStopSequence.trip_no == trip_no,
    ).first()
    if not dseq:
        dseq = DraftStopSequence(scenario=scenario, vehicle_id=vehicle_id, trip_no=trip_no, stop_outlet_ids=[])
        db.add(dseq)

    curr_seq = list(dseq.stop_outlet_ids or [])
    if order and order.outlet_id not in curr_seq:
        curr_seq.append(order.outlet_id)
        dseq.stop_outlet_ids = curr_seq

    # Increment revision
    draft = db.query(DraftPlan).filter(DraftPlan.scenario == scenario).first()
    draft.draft_revision += 1
    draft.updated_at = datetime.now(timezone.utc)
    draft.updated_by = actor

    db.commit()

    record_ledger_entry(
        db,
        action="reassigned" if prev_assignment.get("decision") == "served" else "assigned",
        actor=actor,
        order_ref=order_ref,
        outlet_id=order.outlet_id if order else "-",
        vehicle_id=vehicle_id,
        trip_no=trip_no,
        previous_state=prev_str,
        updated_state=new_str,
        plan_version=draft.draft_revision,
    )

    return get_draft_state(db, scenario)

def defer_order(
    db: Session,
    order_ref: str,
    reason_code: str,
    reason_note: Optional[str] = None,
    scenario: str = "S1",
    actor: str = "Sarah Jenkins",
) -> Dict[str, Any]:
    order = db.query(Order).filter(Order.order_ref == order_ref).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    da = db.query(DraftAssignment).filter(
        DraftAssignment.scenario == scenario,
        DraftAssignment.order_ref == order_ref,
    ).first()
    if not da:
        da = DraftAssignment(scenario=scenario, order_ref=order_ref)
        db.add(da)

    prev_str = f"{da.vehicle_id} · Trip {da.trip_no}" if da.decision == "served" else "-"
    da.decision = "deferred"
    da.vehicle_id = None
    da.trip_no = None
    da.reason_code = reason_code
    da.reason_note = reason_note

    draft = db.query(DraftPlan).filter(DraftPlan.scenario == scenario).first()
    draft.draft_revision += 1
    draft.updated_at = datetime.now(timezone.utc)
    draft.updated_by = actor

    db.commit()

    record_ledger_entry(
        db,
        action="deferred",
        actor=actor,
        order_ref=order_ref,
        outlet_id=order.outlet_id,
        reason_code=reason_code,
        reason_note=reason_note,
        previous_state=prev_str,
        updated_state="-",
        plan_version=draft.draft_revision,
    )

    return get_draft_state(db, scenario)

def reorder_trip_stops(
    db: Session,
    vehicle_id: str,
    trip_no: int,
    new_outlet_order: List[str],
    scenario: str = "S1",
    actor: str = "Sarah Jenkins",
) -> Dict[str, Any]:
    dseq = db.query(DraftStopSequence).filter(
        DraftStopSequence.scenario == scenario,
        DraftStopSequence.vehicle_id == vehicle_id,
        DraftStopSequence.trip_no == trip_no,
    ).first()
    if not dseq:
        dseq = DraftStopSequence(scenario=scenario, vehicle_id=vehicle_id, trip_no=trip_no, stop_outlet_ids=[])
        db.add(dseq)

    old_seq = list(dseq.stop_outlet_ids or [])
    dseq.stop_outlet_ids = new_outlet_order

    draft = db.query(DraftPlan).filter(DraftPlan.scenario == scenario).first()
    draft.draft_revision += 1
    draft.updated_at = datetime.now(timezone.utc)
    draft.updated_by = actor

    db.commit()

    record_ledger_entry(
        db,
        action="resequenced",
        actor=actor,
        order_ref="(trip)",
        outlet_id=f"{vehicle_id} Trip {trip_no}",
        vehicle_id=vehicle_id,
        trip_no=trip_no,
        reason_note=f"Stop sequence updated: {' -> '.join(old_seq)} became {' -> '.join(new_outlet_order)}",
        previous_state=", ".join(old_seq),
        updated_state=", ".join(new_outlet_order),
        plan_version=draft.draft_revision,
    )

    return get_draft_state(db, scenario)

def set_trip_departure(
    db: Session,
    vehicle_id: str,
    trip_no: int,
    departure_time: Optional[str],
    scenario: str = "S1",
    actor: str = "Sarah Jenkins",
) -> Dict[str, Any]:
    meta = db.query(DraftTripMeta).filter(
        DraftTripMeta.scenario == scenario,
        DraftTripMeta.vehicle_id == vehicle_id,
        DraftTripMeta.trip_no == trip_no,
    ).first()
    if not meta:
        meta = DraftTripMeta(scenario=scenario, vehicle_id=vehicle_id, trip_no=trip_no)
        db.add(meta)

    meta.planned_departure_time = departure_time

    draft = db.query(DraftPlan).filter(DraftPlan.scenario == scenario).first()
    draft.draft_revision += 1
    draft.updated_at = datetime.now(timezone.utc)
    draft.updated_by = actor

    db.commit()
    return get_draft_state(db, scenario)

def set_vehicle_fuel_input(
    db: Session,
    vehicle_id: str,
    prior_weekly_fuel_usage_l: Optional[float],
    scenario: str = "S1",
    actor: str = "Sarah Jenkins",
) -> Dict[str, Any]:
    fuel = db.query(DraftVehicleFuelInput).filter(
        DraftVehicleFuelInput.scenario == scenario,
        DraftVehicleFuelInput.vehicle_id == vehicle_id,
    ).first()
    if not fuel:
        fuel = DraftVehicleFuelInput(scenario=scenario, vehicle_id=vehicle_id)
        db.add(fuel)

    fuel.prior_weekly_fuel_usage_l = prior_weekly_fuel_usage_l

    draft = db.query(DraftPlan).filter(DraftPlan.scenario == scenario).first()
    draft.draft_revision += 1
    draft.updated_at = datetime.now(timezone.utc)
    draft.updated_by = actor

    db.commit()
    return get_draft_state(db, scenario)

def suggest_plan_greedy(
    db: Session,
    scenario: str = "S1",
    actor: str = "Greedy Planner",
) -> Dict[str, Any]:
    """
    Transparent rule-based heuristic planner:
    Priority:
    1. Previously deferred outlets (consecutive skips > 0 or deferred_yesterday)
    2. Tightest delivery window
    3. Chilled orders
    4. Order reference
    Consolidates into active compatible trips first, respecting capacity and constraints.
    """
    engine = get_validation_engine(db, scenario)
    draft_state = get_draft_state(db, scenario)
    orders = list(engine.orders)

    # Sort orders by heuristic priority
    def order_sort_key(o: Order):
        mem = db.query(DeferralMemory).filter(DeferralMemory.outlet_id == o.outlet_id).first()
        skips = mem.consecutive_skips if mem else 0
        window_width = parse_hhmm(o.window_close_time) - parse_hhmm(o.window_open_time)
        is_chilled = 0 if o.temp_requirement == "chilled" else 1
        return (
            -skips,
            -int(o.deferred_yesterday),
            window_width,
            is_chilled,
            o.order_ref,
        )

    orders.sort(key=order_sort_key)

    # Get available fleet
    avail_vehicles = [
        v for v in engine.vehicles
        if engine.fleet_status.get(v.vehicle_id, "available") == "available"
    ]

    assignments = {}
    stop_seqs = {}
    trip_meta = {}
    fuel_inputs = {v.vehicle_id: 0.0 for v in avail_vehicles} # seed default 0 for planner verification

    for o in orders:
        assigned = False
        candidates = engine.rank_candidates_for_order(
            o.order_ref, assignments, stop_seqs, trip_meta, fuel_inputs
        )
        for cand in candidates:
            if cand.passport.checkerFeasible:
                vid = cand.vehicle.vehicle_id
                tno = cand.tripNo
                assignments[o.order_ref] = {
                    "decision": "served",
                    "vehicle_id": vid,
                    "trip_no": tno,
                    "reason_code": None,
                    "reason_note": None,
                }
                key = f"{vid}-{tno}"
                curr_seq = stop_seqs.get(key, [])
                if o.outlet_id not in curr_seq:
                    curr_seq.append(o.outlet_id)
                stop_seqs[key] = curr_seq
                if key not in trip_meta:
                    trip_meta[key] = "03:30" if o.brand == "Fresh" else "08:00"
                assigned = True
                break

        if not assigned:
            assignments[o.order_ref] = {
                "decision": "deferred",
                "vehicle_id": None,
                "trip_no": None,
                "reason_code": "capacity",
                "reason_note": "Capacity limit reached during automated allocation",
            }

    # Persist all suggestions to database
    db.query(DraftAssignment).filter(DraftAssignment.scenario == scenario).delete()
    for ref, a in assignments.items():
        db.add(DraftAssignment(
            scenario=scenario,
            order_ref=ref,
            decision=a["decision"],
            vehicle_id=a["vehicle_id"],
            trip_no=a["trip_no"],
            reason_code=a["reason_code"],
            reason_note=a["reason_note"],
        ))

    db.query(DraftStopSequence).filter(DraftStopSequence.scenario == scenario).delete()
    for key, seq in stop_seqs.items():
        vid, tno_str = key.rsplit("-", 1)
        db.add(DraftStopSequence(
            scenario=scenario,
            vehicle_id=vid,
            trip_no=int(tno_str),
            stop_outlet_ids=seq,
        ))

    db.query(DraftTripMeta).filter(DraftTripMeta.scenario == scenario).delete()
    for key, dep_time in trip_meta.items():
        vid, tno_str = key.rsplit("-", 1)
        db.add(DraftTripMeta(
            scenario=scenario,
            vehicle_id=vid,
            trip_no=int(tno_str),
            planned_departure_time=dep_time,
        ))

    for vid, val in fuel_inputs.items():
        f_row = db.query(DraftVehicleFuelInput).filter(
            DraftVehicleFuelInput.scenario == scenario,
            DraftVehicleFuelInput.vehicle_id == vid,
        ).first()
        if not f_row:
            db.add(DraftVehicleFuelInput(scenario=scenario, vehicle_id=vid, prior_weekly_fuel_usage_l=val))
        else:
            f_row.prior_weekly_fuel_usage_l = val

    draft = db.query(DraftPlan).filter(DraftPlan.scenario == scenario).first()
    draft.draft_revision += 1
    draft.updated_at = datetime.now(timezone.utc)
    draft.updated_by = actor
    db.commit()

    record_ledger_entry(
        db,
        action="reassigned",
        actor=actor,
        order_ref="(all)",
        outlet_id="-",
        reason_note="Greedy plan generated with priority for deferred outlets and capacity fit.",
        plan_version=draft.draft_revision,
    )

    return get_draft_state(db, scenario)

def release_plan(
    db: Session,
    expected_revision: int,
    shortfall_policy: str = "ship_good_tell_store",
    decision_maker: str = "Sarah Jenkins",
    scenario: str = "S1",
) -> ReleasedManifest:
    """
    Atomic Plan Release:
    - Verifies revision optimism
    - Re-validates entire plan server-side
    - Creates immutable manifest v(N)
    - Creates released trip rows with reverse loading sequence
    - Updates deferral memory
    - Emits notifications and ledger entries
    """
    draft = db.query(DraftPlan).filter(DraftPlan.scenario == scenario).first()
    if not draft or draft.draft_revision != expected_revision:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Plan revision conflict. Expected revision {expected_revision}, but server is at revision {draft.draft_revision if draft else 0}.",
        )

    # Server-side full revalidation
    engine = get_validation_engine(db, scenario)
    draft_state = get_draft_state(db, scenario)
    checklist = engine.validate_full_plan(
        draft_state["assignments"],
        draft_state["stopSequences"],
        {k: v.get("plannedDepartureTime") for k, v in draft_state["tripMeta"].items()},
        draft_state["vehicleFuelInputs"],
    )

    has_failures = any(c["kind"] in ("checker_fail", "unverified") for c in checklist)
    if has_failures:
        failures = [c["label"] for c in checklist if c["kind"] in ("checker_fail", "unverified")]
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Cannot release plan: {len(failures)} validation rule(s) failed or unverified: {', '.join(failures[:3])}",
        )

    # Determine next manifest version
    latest_manifest = db.query(ReleasedManifest).filter(
        ReleasedManifest.scenario == scenario
    ).order_by(ReleasedManifest.version.desc()).first()
    next_version = (latest_manifest.version + 1) if latest_manifest else 1

    # Mark prior manifests inactive
    db.query(ReleasedManifest).filter(ReleasedManifest.scenario == scenario).update({"is_active": False})

    now_utc = datetime.now(timezone.utc)
    now_str = now_utc.strftime("%H:%M")

    manifest = ReleasedManifest(
        version=next_version,
        scenario=scenario,
        published_at=now_utc,
        published_at_str=now_str,
        decision_maker=decision_maker,
        shortfall_policy=shortfall_policy,
        is_active=True,
        acknowledgement="pending",
    )
    db.add(manifest)
    db.flush()

    trip_map: Dict[str, List[Order]] = {}
    for o in engine.orders:
        a = draft_state["assignments"].get(o.order_ref, {})
        dec = a.get("decision")
        vid = a.get("vehicle_id") or a.get("vehicleId")
        tno = a.get("trip_no") or a.get("tripNo")
        if dec == "served" and vid and tno:
            k = f"{vid}-{tno}"
            trip_map.setdefault(k, []).append(o)

    trip_counter = 1
    for key, trip_orders in trip_map.items():
        vid, tno_str = key.rsplit("-", 1)
        tno = int(tno_str)
        outlet_seq = draft_state["stopSequences"].get(key, list(dict.fromkeys(o.outlet_id for o in trip_orders)))
        dep_time = draft_state["tripMeta"].get(key, {}).get("plannedDepartureTime")

        # Leave by time assumption (e.g. 15 min before departure)
        leave_by = None
        if dep_time:
            dep_min = parse_hhmm(dep_time)
            leave_by = format_hhmm(max(0, dep_min - 15))

        otp = generate_otp_code(6)
        trip_id_str = f"S1-T{trip_counter:03d}"
        trip_counter += 1

        rel_trip = ReleasedTrip(
            manifest_id=manifest.id,
            manifest_version=next_version,
            scenario=scenario,
            vehicle_id=vid,
            trip_no=tno,
            trip_id_str=trip_id_str,
            brand=trip_orders[0].brand,
            district=trip_orders[0].district,
            depot=trip_orders[0].depot,
            planned_departure_time=dep_time,
            leave_by_time=leave_by,
            stop_outlet_ids=outlet_seq,
            order_refs=[o.order_ref for o in trip_orders],
            loading_status="planned",
            otp_code=otp,
            otp_attempts=0,
            otp_unlocked=False,
        )
        db.add(rel_trip)
        db.flush()

        for seq, outlet_id in enumerate(outlet_seq, 1):
            db.add(
                TripStop(
                    trip_id=rel_trip.id,
                    outlet_id=outlet_id,
                    seq=seq,
                    delivery_status="pending",
                )
            )

        # Seed order loading states
        for o in trip_orders:
            db.add(OrderLoadingState(
                manifest_version=next_version,
                released_trip_id=rel_trip.id,
                order_ref=o.order_ref,
                planned_units=o.order_units,
                loaded_units=0,
                effective_units=o.order_units,
                is_loaded=False,
            ))

    # Update Deferral Memory & Orders
    for o in engine.orders:
        a = draft_state["assignments"].get(o.order_ref, {})
        mem = db.query(DeferralMemory).filter(DeferralMemory.outlet_id == o.outlet_id).first()
        if not mem:
            mem = DeferralMemory(outlet_id=o.outlet_id, consecutive_skips=0, updated_at=now_utc)
            db.add(mem)

        if a.get("decision") == "served":
            mem.consecutive_skips = 0
            mem.updated_at = now_utc
            o.status = "planned"
        elif a.get("decision") == "deferred":
            mem.consecutive_skips += 1
            mem.last_deferred_scenario = scenario
            mem.last_reason_code = a.get("reason_code")
            mem.last_reason_note = a.get("reason_note")
            mem.updated_at = now_utc
            o.status = "deferred"

    db.commit()
    db.refresh(manifest)

    # Ledger and Notifications
    record_ledger_entry(
        db,
        action="published",
        actor=decision_maker,
        order_ref="(plan)",
        outlet_id="-",
        reason_note=f"Plan Released v{next_version} ({shortfall_policy}).",
        previous_state=f"v{latest_manifest.version}" if latest_manifest else "(none)",
        updated_state=f"v{next_version}",
        plan_version=next_version,
    )

    create_notification(
        db,
        target_role="loader",
        kind="plan_released",
        title=f"Plan Released v{next_version}",
        text=f"New immutable manifest version v{next_version} has been released by {decision_maker}. Please review and acknowledge.",
        plan_version=next_version,
    )
    create_notification(
        db,
        target_role="driver",
        kind="plan_released",
        title=f"New Delivery Run Available (v{next_version})",
        text=f"Plan v{next_version} published. Unlock your trip with OTP upon warehouse readiness.",
        plan_version=next_version,
    )

    return manifest
