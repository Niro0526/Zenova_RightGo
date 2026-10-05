"""Tests for Driver workflow: OTP unlock, delivery outcomes, POD metadata, and post-departure issue reporting."""

import pytest
from fastapi import HTTPException
from app.services.planning_service import suggest_plan_greedy, release_plan, set_vehicle_fuel_input
from app.services.driver_service import (
    verify_driver_otp,
    get_driver_run_progress,
    record_driver_delivery,
    record_driver_issue,
)
from app.schemas.driver import (
    LocalDeliveryRecordSchema,
    IssueReportRecordSchema,
    PodDetails,
)
from app.models.plan import ReleasedTrip, OrderLoadingState
from app.services.loading_service import acknowledge_manifest, mark_order_loaded, depart_trip

def test_driver_workflow(db_session):
    # Release plan
    draft = suggest_plan_greedy(db_session, "S1")
    # Fuel must be dispatcher-confirmed before release (greedy leaves it
    # unverified rather than fabricating a figure - see planning_service).
    for vid in {a["vehicleId"] for a in draft["assignments"].values() if a.get("vehicleId")}:
        draft = set_vehicle_fuel_input(db_session, vid, 0.0, scenario="S1")
    manifest = release_plan(db_session, draft["draftRevision"], scenario="S1")

    # A vehicle runs its trips in order: the live run is the lowest trip number.
    trip = db_session.query(ReleasedTrip).filter(ReleasedTrip.manifest_id == manifest.id).order_by(ReleasedTrip.trip_no.asc(), ReleasedTrip.id.asc()).first()
    assert trip is not None
    assert trip.otp_code is not None

    # OTP is refused until the loader has loaded and departed the trip
    with pytest.raises(HTTPException) as early:
        verify_driver_otp(db_session, trip.trip_id_str, trip.vehicle_id, trip.otp_code)
    assert early.value.status_code == 409
    acknowledge_manifest(db_session, manifest.version)
    for st in db_session.query(OrderLoadingState).filter(OrderLoadingState.released_trip_id == trip.id).all():
        mark_order_loaded(db_session, trip.id, st.order_ref)
    depart_trip(db_session, trip.id)

    # Test wrong OTP attempt
    with pytest.raises(HTTPException) as exc:
        verify_driver_otp(db_session, trip.trip_id_str, trip.vehicle_id, "999999")
    assert exc.value.status_code == 403

    # Test correct OTP unlock
    unlock_res = verify_driver_otp(db_session, trip.trip_id_str, trip.vehicle_id, trip.otp_code)
    assert unlock_res["unlocked"] is True

    # Record delivery outcome with POD metadata
    stop_id = trip.stop_outlet_ids[0]
    del_rec = record_driver_delivery(
        db_session,
        LocalDeliveryRecordSchema(
            id=f"DEL-TEST-{stop_id}",
            stopId=stop_id,
            stopName=f"{stop_id} / Outlet",
            vehicleId=trip.vehicle_id,
            outcome="full",
            arrivedAt="2026-10-02T09:59:00Z",
            podDetails=PodDetails(
                signerName="K. Perera",
                hasSignature=True,
                photoName="pod_proof_01.jpg",
            ),
            status="Synced",
            offlineCreated=False,
            createdAt="2026-10-02T10:00:00Z",
        )
    )
    assert del_rec.id == f"DEL-TEST-{stop_id}"
    assert del_rec.pod_signer_name == "K. Perera"
    assert del_rec.pod_has_signature is True

    # Progress should reflect 1 stop completed
    prog = get_driver_run_progress(db_session, trip.trip_id_str)
    assert prog.completedStops >= 1
    assert prog.progressPercentage > 0

    # Record driver post-departure issue
    issue = record_driver_issue(
        db_session,
        IssueReportRecordSchema(
            id="REP-TEST-001",
            tripId=trip.trip_id_str,
            vehicleId=trip.vehicle_id,
            categoryId="access_blocked",
            categoryLabel="Access Blocked",
            categoryIcon="AlertTriangle",
            stopCode=stop_id,
            outletName=f"{stop_id} / Outlet",
            description="Road construction blocking entrance dock.",
            status="Synced",
            offlineCreated=False,
            createdAt="2026-10-02T10:15:00Z",
        )
    )
    assert issue.id == "REP-TEST-001"
    assert issue.category_id == "access_blocked"
