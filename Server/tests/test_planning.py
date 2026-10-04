"""Tests for Planning service, greedy suggestions, and atomic release."""

import pytest
from fastapi import HTTPException
from app.services.planning_service import (
    get_draft_state,
    assign_order,
    defer_order,
    reorder_trip_stops,
    suggest_plan_greedy,
    set_vehicle_fuel_input,
    release_plan,
)
from app.services.loading_service import acknowledge_manifest, get_trip_loading_sequence, mark_order_loaded, depart_trip
from app.models.plan import ReleasedTrip

def confirm_fuel_for_used_vehicles(db_session, draft, scenario="S1"):
    """Fuel is never auto-confirmed by the greedy planner (a vehicle used by a
    run with no dispatcher-confirmed prior usage is left unverified, which
    correctly blocks release) - tests that release a greedy-suggested plan
    must confirm it first, the same as a real dispatcher would."""
    vehicle_ids = {a["vehicleId"] for a in draft["assignments"].values() if a.get("vehicleId")}
    for vid in vehicle_ids:
        suggested = set_vehicle_fuel_input(db_session, vid, 0.0, scenario=scenario)
    return suggested if vehicle_ids else draft

def test_draft_lifecycle_and_greedy_suggest(db_session):
    state = get_draft_state(db_session, "S1")
    assert state["counts"]["total"] > 0
    assert state["draftRevision"] == 0

    # Test Defer
    state_after_defer = defer_order(
        db_session,
        order_ref="S1-000",
        reason_code="capacity",
        reason_note="Capacity shortfall in morning fleet",
        scenario="S1",
    )
    assert state_after_defer["draftRevision"] == 1
    assert state_after_defer["assignments"]["S1-000"]["decision"] == "deferred"
    assert state_after_defer["assignments"]["S1-000"]["reasonCode"] == "capacity"

    # Test Suggest Plan Greedy
    suggested = suggest_plan_greedy(db_session, scenario="S1")
    assert suggested["draftRevision"] >= 2
    assert suggested["counts"]["served"] + suggested["counts"]["deferred"] == suggested["counts"]["total"]
    assert suggested["counts"]["unresolved"] == 0

def test_atomic_release(db_session):
    # Run greedy suggest to populate feasible plan
    draft = suggest_plan_greedy(db_session, scenario="S1")
    # Fuel must be dispatcher-confirmed before release - the greedy planner
    # deliberately leaves it unverified rather than fabricating a figure.
    draft = confirm_fuel_for_used_vehicles(db_session, draft)
    rev = draft["draftRevision"]

    # Release Plan v1
    manifest = release_plan(
        db_session,
        expected_revision=rev,
        shortfall_policy="ship_good_tell_store",
        decision_maker="Sarah Jenkins",
        scenario="S1",
    )
    assert manifest.version == 1
    assert manifest.is_active is True
    assert manifest.decision_maker == "Sarah Jenkins"

    # Stale release attempt should raise conflict (409)
    with pytest.raises(HTTPException) as exc:
        release_plan(
            db_session,
            expected_revision=rev - 1, # stale revision
            scenario="S1",
        )
    assert exc.value.status_code == 409

def test_dispatched_order_cannot_be_moved_by_ordinary_draft_edit(db_session):
    """Per the documented rule (started execution records remain historical
    truth), once a trip has departed, none of assign/defer/reorder/re-suggest
    may move its orders - only release_plan's own revision/version machinery
    (release of a NEW manifest) may ever touch them again, and even then
    only by carrying them forward unchanged."""
    draft = suggest_plan_greedy(db_session, "S1")
    draft = confirm_fuel_for_used_vehicles(db_session, draft)
    manifest = release_plan(db_session, draft["draftRevision"], scenario="S1")
    acknowledge_manifest(db_session, version=manifest.version, acknowledged_by="Rizwan")

    trip = db_session.query(ReleasedTrip).filter(ReleasedTrip.manifest_id == manifest.id).first()
    seq_info = get_trip_loading_sequence(db_session, trip.id)
    for step in seq_info["loadingSequence"]:
        for ord_info in step["orders"]:
            mark_order_loaded(db_session, trip.id, ord_info["orderRef"])
    depart_trip(db_session, trip.id)

    dispatched_order_ref = trip.order_refs[0]
    other_vehicle = db_session.query(ReleasedTrip).filter(ReleasedTrip.id != trip.id).first()
    fallback_vehicle = other_vehicle.vehicle_id if other_vehicle else "VEH999"

    with pytest.raises(HTTPException) as exc:
        assign_order(db_session, dispatched_order_ref, fallback_vehicle, 1, scenario="S1")
    assert exc.value.status_code == 409

    with pytest.raises(HTTPException) as exc:
        defer_order(db_session, dispatched_order_ref, reason_code="capacity", scenario="S1")
    assert exc.value.status_code == 409

    with pytest.raises(HTTPException) as exc:
        reorder_trip_stops(db_session, trip.vehicle_id, trip.trip_no, list(reversed(trip.stop_outlet_ids)), scenario="S1")
    assert exc.value.status_code == 409

    # And a fresh re-suggest must still carry the dispatched order forward
    # unchanged rather than silently dropping its decision.
    draft2 = suggest_plan_greedy(db_session, "S1")
    assert draft2["assignments"][dispatched_order_ref]["decision"] == "served"
    assert draft2["assignments"][dispatched_order_ref]["vehicleId"] == trip.vehicle_id
