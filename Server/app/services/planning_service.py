"""Planning service for Dispatcher workspace, draft mutations, greedy suggestions, and atomic release."""

from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
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
)
from app.models.memory import DeferralMemory
from app.services.validation_service import ValidationEngine, compute_trip_duration, format_hhmm, parse_hhmm
from app.services.notification_service import create_notification
from app.services.ledger_service import record_ledger_entry
from app.services.scheduling_service import current_run_date
from app.core.security import generate_otp_code

def planning_eligible_orders_query(db: Session, scenario: str = "S1"):
    """Orders eligible for ordinary planning: not cancelled, and either a
    legacy/seed row (run_date is NULL) or due on/before the current run."""
    run_date = current_run_date(db)
    return db.query(Order).filter(
        Order.scenario == scenario,
        Order.status != "cancelled",
    ).filter(
        (Order.run_date.is_(None)) | (Order.run_date <= run_date)
    )

def get_validation_engine(db: Session, scenario: str = "S1") -> ValidationEngine:
    orders = planning_eligible_orders_query(db, scenario).all()
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
            "locked": a.locked,
        }
        for a in assignments_rows
    }

    # Ensure all scenario orders are in assignments
    orders = planning_eligible_orders_query(db, scenario).all()
    for o in orders:
        if o.order_ref not in assignments:
            assignments[o.order_ref] = {
                "decision": "unresolved",
                "vehicleId": None,
                "tripNo": None,
                "reasonCode": None,
                "reasonNote": None,
                "locked": False,
            }

    stop_seq_rows = db.query(DraftStopSequence).filter(DraftStopSequence.scenario == scenario).all()
    stop_sequences = {f"{s.vehicle_id}-{s.trip_no}": s.stop_outlet_ids for s in stop_seq_rows}
    stop_sequence_locks = {f"{s.vehicle_id}-{s.trip_no}": s.locked for s in stop_seq_rows}

    trip_meta_rows = db.query(DraftTripMeta).filter(DraftTripMeta.scenario == scenario).all()
    trip_meta = {
        f"{m.vehicle_id}-{m.trip_no}": {"plannedDepartureTime": m.planned_departure_time, "locked": m.locked}
        for m in trip_meta_rows
    }

    fuel_input_rows = db.query(DraftVehicleFuelInput).filter(DraftVehicleFuelInput.scenario == scenario).all()
    vehicle_fuel_inputs = {f.vehicle_id: f.prior_weekly_fuel_usage_l for f in fuel_input_rows}
    vehicle_fuel_locks = {f.vehicle_id: f.locked for f in fuel_input_rows}

    served = sum(1 for a in assignments.values() if a["decision"] == "served")
    deferred = sum(1 for a in assignments.values() if a["decision"] == "deferred")
    unresolved = sum(1 for a in assignments.values() if a["decision"] == "unresolved")

    return {
        "scenario": scenario,
        "draftRevision": draft.draft_revision,
        "assignments": assignments,
        "stopSequences": stop_sequences,
        "stopSequenceLocks": stop_sequence_locks,
        "tripMeta": trip_meta,
        "vehicleFuelInputs": vehicle_fuel_inputs,
        "vehicleFuelLocks": vehicle_fuel_locks,
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
    da.locked = True  # manual dispatcher decision - "Suggest Plan" must preserve it

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
    da.locked = True  # manual dispatcher decision - "Suggest Plan" must preserve it

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
    dseq.locked = True  # manual stop order - "Suggest Plan" must preserve it

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
    meta.locked = True  # manual departure decision - "Suggest Plan" must preserve it

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
    fuel.locked = True  # dispatcher-confirmed - "Suggest Plan" must preserve it

    draft = db.query(DraftPlan).filter(DraftPlan.scenario == scenario).first()
    draft.draft_revision += 1
    draft.updated_at = datetime.now(timezone.utc)
    draft.updated_by = actor

    db.commit()
    return get_draft_state(db, scenario)

def _structural_deferral_reason(engine: ValidationEngine, order: Order) -> Tuple[str, str]:
    """Distinguish *why* the greedy planner could not place an order, instead of
    labeling every failure 'capacity'. Checked in order of how fundamental the
    blocker is: no vehicle of the right type at this depot at all, vs. the
    right type exists but every one is in_workshop today, vs. eligible
    available vehicles exist but were already filled by higher-priority
    orders this run (a heuristic-ordering artifact, not true infeasibility)."""
    needs_reefer = order.temp_requirement == "chilled"
    needs_van = order.parking_constraint == "van_only"
    type_matches = [
        v for v in engine.vehicles
        if v.depot == order.depot
        and (v.temp == "reefer" if needs_reefer else True)
        and (v.type == "van" if needs_van else True)
    ]
    if not type_matches:
        need_desc = []
        if needs_reefer:
            need_desc.append("reefer")
        if needs_van:
            need_desc.append("van")
        return (
            "no_matching_vehicle_type",
            f"No {'/'.join(need_desc) or 'matching'} vehicle exists at depot {order.depot} for this order - "
            f"not resolvable by re-running Suggest Plan; requires a fleet/depot change.",
        )
    available_matches = [v for v in type_matches if engine.fleet_status.get(v.vehicle_id, "available") == "available"]
    if not available_matches:
        return (
            "vehicle_unavailable",
            f"{len(type_matches)} matching vehicle(s) at depot {order.depot} exist but all are in_workshop today "
            f"({', '.join(v.vehicle_id for v in type_matches)}).",
        )
    return (
        "capacity",
        f"{len(available_matches)} structurally-eligible available vehicle(s) existed "
        f"({', '.join(v.vehicle_id for v in available_matches)}) but had no remaining weight/volume/time budget "
        f"after higher-priority orders were allocated this run.",
    )

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

    Manual dispatcher decisions (locked assignments, stop sequences, departure
    times, and confirmed fuel inputs) are preserved as fixed inputs - this
    function only re-plans the unlocked remainder. Locks never override hard
    constraints: a locked assignment that no longer passes the checker is left
    in place but will surface as a release-blocking failure, not silently
    dropped or silently forced through.
    """
    engine = get_validation_engine(db, scenario)
    draft_state = get_draft_state(db, scenario)

    # Seed working state from whatever is currently LOCKED (manual dispatcher
    # edits) - these are preserved verbatim and excluded from re-planning.
    assignments: Dict[str, Dict[str, Any]] = {}
    stop_seqs: Dict[str, List[str]] = {}
    trip_meta: Dict[str, str] = {}
    fuel_inputs: Dict[str, Optional[float]] = {}
    locked_order_refs: set = set()
    locked_stop_keys: set = set()
    locked_trip_meta_keys: set = set()
    locked_fuel_vehicle_ids: set = set()

    for ref, a in draft_state["assignments"].items():
        if a.get("locked"):
            assignments[ref] = {
                "decision": a["decision"],
                "vehicle_id": a.get("vehicleId"),
                "trip_no": a.get("tripNo"),
                "reason_code": a.get("reasonCode"),
                "reason_note": a.get("reasonNote"),
            }
            locked_order_refs.add(ref)
    for key, locked in draft_state["stopSequenceLocks"].items():
        if locked:
            stop_seqs[key] = list(draft_state["stopSequences"].get(key, []))
            locked_stop_keys.add(key)
    for key, meta in draft_state["tripMeta"].items():
        if meta.get("locked"):
            trip_meta[key] = meta.get("plannedDepartureTime")
            locked_trip_meta_keys.add(key)
    for vid, locked in draft_state["vehicleFuelLocks"].items():
        if locked:
            fuel_inputs[vid] = draft_state["vehicleFuelInputs"].get(vid)
            locked_fuel_vehicle_ids.add(vid)

    # Only orders that are not themselves locked get re-planned.
    orders = [o for o in engine.orders if o.order_ref not in locked_order_refs]

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

    for o in orders:
        assigned = False
        candidates = engine.rank_candidates_for_order(
            o.order_ref, assignments, stop_seqs, trip_meta, fuel_inputs
        )
        for cand in candidates:
            key = f"{cand.vehicle.vehicle_id}-{cand.tripNo}"
            if key in locked_stop_keys:
                continue  # never append onto a manually-locked trip's stop sequence
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
                curr_seq = stop_seqs.get(key, [])
                if o.outlet_id not in curr_seq:
                    curr_seq.append(o.outlet_id)
                stop_seqs[key] = curr_seq
                if key not in trip_meta and key not in locked_trip_meta_keys:
                    trip_meta[key] = "03:30" if o.brand == "Fresh" else "08:00"
                assigned = True
                break

        if not assigned:
            reason_code, reason_note = _structural_deferral_reason(engine, o)
            assignments[o.order_ref] = {
                "decision": "deferred",
                "vehicle_id": None,
                "trip_no": None,
                "reason_code": reason_code,
                "reason_note": reason_note,
            }

    # Persist suggestions - only replace rows that are not locked; locked rows
    # (filtered out of `assignments`/`stop_seqs`/`trip_meta`/`fuel_inputs` above
    # because they were never re-planned) must survive untouched.
    db.query(DraftAssignment).filter(
        DraftAssignment.scenario == scenario,
        DraftAssignment.locked == False,  # noqa: E712
    ).delete(synchronize_session=False)
    for ref, a in assignments.items():
        if ref in locked_order_refs:
            continue
        db.add(DraftAssignment(
            scenario=scenario,
            order_ref=ref,
            decision=a["decision"],
            vehicle_id=a["vehicle_id"],
            trip_no=a["trip_no"],
            reason_code=a["reason_code"],
            reason_note=a["reason_note"],
            locked=False,
        ))

    db.query(DraftStopSequence).filter(
        DraftStopSequence.scenario == scenario,
        DraftStopSequence.locked == False,  # noqa: E712
    ).delete(synchronize_session=False)
    for key, seq in stop_seqs.items():
        vid, tno_str = key.rsplit("-", 1)
        if key in locked_stop_keys:
            continue
        vid, tno_str = key.split("-")
        db.add(DraftStopSequence(
            scenario=scenario,
            vehicle_id=vid,
            trip_no=int(tno_str),
            stop_outlet_ids=seq,
            locked=False,
        ))

    db.query(DraftTripMeta).filter(
        DraftTripMeta.scenario == scenario,
        DraftTripMeta.locked == False,  # noqa: E712
    ).delete(synchronize_session=False)
    for key, dep_time in trip_meta.items():
        vid, tno_str = key.rsplit("-", 1)
        if key in locked_trip_meta_keys:
            continue
        vid, tno_str = key.split("-")
        db.add(DraftTripMeta(
            scenario=scenario,
            vehicle_id=vid,
            trip_no=int(tno_str),
            planned_departure_time=dep_time,
            locked=False,
        ))

    # Fuel inputs are never fabricated: a vehicle used by this run that has no
    # dispatcher-confirmed (locked) fuel figure is left unconfirmed (None),
    # which validate_full_plan correctly reports as "unverified" rather than a
    # false "0 L prior usage" claim, and blocks release until confirmed.
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
    existing_mems = {m.outlet_id: m for m in db.query(DeferralMemory).all()}
    for o in engine.orders:
        a = draft_state["assignments"].get(o.order_ref, {})
        mem = existing_mems.get(o.outlet_id)
    # Update order status (per order) and Deferral Memory (per outlet).
    # Deferral memory is aggregated per outlet - not per order - because one
    # release can carry both a served and a deferred order for the same
    # outlet (e.g. a Fresh outlet with two same-day orders), and upserting
    # per order would both double-insert the outlet's single-row primary key
    # and double-count its deferral streak.
    run_date = current_run_date(db)
    outlet_decisions: Dict[str, Dict[str, Any]] = {}
    for o in engine.orders:
        a = draft_state["assignments"].get(o.order_ref, {})
        dec = a.get("decision")
        if dec == "served":
            o.status = "planned"
        elif dec == "deferred":
            o.status = "deferred"
        entry = outlet_decisions.setdefault(o.outlet_id, {"served": False, "deferred": False, "reason_code": None, "reason_note": None})
        if dec == "served":
            entry["served"] = True
        elif dec == "deferred":
            entry["deferred"] = True
            entry["reason_code"] = a.get("reason_code")
            entry["reason_note"] = a.get("reason_note")

    for outlet_id, decision in outlet_decisions.items():
        mem = db.query(DeferralMemory).filter(DeferralMemory.outlet_id == outlet_id).first()
        if not mem:
            mem = DeferralMemory(outlet_id=outlet_id, consecutive_skips=0)
            db.add(mem)
            existing_mems[o.outlet_id] = mem

        if decision["served"]:
            # Any order served for this outlet this run resets its skip streak,
            # even if another order for the same outlet was deferred.
            mem.consecutive_skips = 0
            mem.last_counted_run_date = run_date
            mem.updated_at = now_utc
        elif decision["deferred"]:
            # Count at most once per eligible planning run: if this outlet's
            # streak was already bumped for this run_date (e.g. the dispatcher
            # released a corrective v2/v3 the same day), do not bump it again.
            if mem.last_counted_run_date != run_date:
                mem.consecutive_skips += 1
                mem.last_counted_run_date = run_date
            mem.last_deferred_scenario = scenario
            mem.last_reason_code = decision["reason_code"]
            mem.last_reason_note = decision["reason_note"]
            mem.updated_at = now_utc

    # Close the double-release gap: bump the draft revision past what was just
    # released, so a repeat publish call with the same expected_revision (a
    # double-click, or a second tab that hasn't refreshed) is rejected by the
    # revision check at the top of this function instead of silently creating
    # a second identical manifest version.
    draft.draft_revision += 1
    draft.updated_at = now_utc
    draft.updated_by = decision_maker

    try:
        db.commit()
    except IntegrityError:
        # A concurrent request released the same (scenario, version) first -
        # the uq_released_manifest_scenario_version constraint caught the
        # race the revision check alone cannot close. No partial state is
        # left behind: get_db() rolls back on the exception it re-raises.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Plan was released concurrently by another request. Refresh and retry.",
        )
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
