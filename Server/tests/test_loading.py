"""Tests for Warehouse Loading workflow, LIFO loading, loading issues, and departure gate."""

import pytest
from fastapi import HTTPException
from app.services.planning_service import suggest_plan_greedy, release_plan, set_vehicle_fuel_input
from app.services.loading_service import (
    acknowledge_manifest,
    get_trip_loading_sequence,
    mark_order_loaded,
    create_loading_issue,
    resolve_loading_issue,
    depart_trip,
)
from app.schemas.loading import LoadingIssueCreateRequest, LoadingIssueActionRequest
from app.models.plan import ReleasedTrip

def test_loading_workflow(db_session):
    # Release plan v1
    draft = suggest_plan_greedy(db_session, "S1")
    # Fuel must be dispatcher-confirmed before release (greedy leaves it
    # unverified rather than fabricating a figure - see planning_service).
    for vid in {a["vehicleId"] for a in draft["assignments"].values() if a.get("vehicleId")}:
        draft = set_vehicle_fuel_input(db_session, vid, 0.0, scenario="S1")
    manifest = release_plan(db_session, draft["draftRevision"], scenario="S1")

    # Acknowledge manifest
    ack_manifest = acknowledge_manifest(db_session, version=manifest.version, acknowledged_by="Rizwan")
    assert ack_manifest.acknowledgement == "acknowledged"

    # Get first released trip
    trip = db_session.query(ReleasedTrip).filter(ReleasedTrip.manifest_id == manifest.id).first()
    assert trip is not None

    # Get LIFO sequence
    seq_info = get_trip_loading_sequence(db_session, trip.id)
    assert "loadingSequence" in seq_info
    assert len(seq_info["loadingSequence"]) > 0

    # Load all orders in trip
    for step in seq_info["loadingSequence"]:
        for ord_info in step["orders"]:
            mark_order_loaded(db_session, trip.id, ord_info["orderRef"])

    # Trip should now be ready
    db_session.refresh(trip)
    assert trip.loading_status == "ready"

    # Create loading issue
    first_order_ref = seq_info["loadingSequence"][0]["orders"][0]["orderRef"]
    outlet_id = seq_info["loadingSequence"][0]["outletId"]
    issue = create_loading_issue(
        db_session,
        LoadingIssueCreateRequest(
            manifest_version=manifest.version,
            vehicle_id=trip.vehicle_id,
            trip_no=trip.trip_no,
            order_ref=first_order_ref,
            outlet_id=outlet_id,
            issue_type="short",
            units_affected=2,
            notes="Damaged box during staging",
        )
    )
    assert issue.status == "open"

    # Departure should now be blocked
    with pytest.raises(HTTPException) as exc:
        depart_trip(db_session, trip.id)
    assert exc.value.status_code == 409

    # Resolve issue via replace_from_stock
    resolve_loading_issue(
        db_session,
        issue.id,
        LoadingIssueActionRequest(action="replace_from_stock", notes="Replaced from warehouse reserve"),
    )

    # Departure should now succeed
    departed_trip = depart_trip(db_session, trip.id)
    assert departed_trip.loading_status == "departed"
