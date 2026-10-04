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
