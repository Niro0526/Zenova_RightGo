"""Dispatcher Planning API endpoints."""

from typing import Dict, List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.deps import require_role, CurrentUser
from app.schemas.plan import (
    AssignOrderRequest,
    ReassignOrderRequest,
    DeferOrderRequest,
    ReorderTripRequest,
    SetTripDepartureRequest,
    SetVehicleFuelInputRequest,
    PublishPlanRequest,
    DraftPlanResponse,
    RankedCandidateSchema,
    PassportResultSchema,
)
from app.schemas.manifest import ManifestResponseSchema, ManifestTripSnapshotSchema
from app.services.planning_service import (
    get_draft_state,
    assign_order,
    defer_order,
    reorder_trip_stops,
    set_trip_departure,
    set_vehicle_fuel_input,
    suggest_plan_greedy,
    release_plan,
    get_validation_engine,
)

router = APIRouter(prefix="/plan", tags=["Planning"])

@router.get("/draft", response_model=DraftPlanResponse)
def get_draft(scenario: str = "S1", db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("dispatcher"))):
    """Retrieve current draft plan state."""
    return get_draft_state(db, scenario)

@router.post("/assign", response_model=DraftPlanResponse)
def api_assign_order(req: AssignOrderRequest, scenario: str = "S1", db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("dispatcher"))):
    """Assign an order to a vehicle trip."""
    return assign_order(db, req.order_ref, req.vehicle_id, req.trip_no, scenario=scenario, actor=user.display_name)

@router.post("/reassign", response_model=DraftPlanResponse)
def api_reassign_order(req: ReassignOrderRequest, scenario: str = "S1", db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("dispatcher"))):
    """Reassign an order with documented rationale."""
    return assign_order(db, req.order_ref, req.vehicle_id, req.trip_no, scenario=scenario, actor=user.display_name)

@router.post("/defer", response_model=DraftPlanResponse)
def api_defer_order(req: DeferOrderRequest, scenario: str = "S1", db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("dispatcher"))):
    """Defer an order with documented reason code and note."""
    return defer_order(db, req.order_ref, req.reason_code, req.reason_note, scenario=scenario, actor=user.display_name)

@router.post("/reorder", response_model=DraftPlanResponse)
def api_reorder_trip(req: ReorderTripRequest, scenario: str = "S1", db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("dispatcher"))):
    """Reorder the physical delivery stop sequence for a trip."""
    return reorder_trip_stops(db, req.vehicle_id, req.trip_no, req.new_outlet_order, scenario=scenario, actor=user.display_name)

@router.post("/departure", response_model=DraftPlanResponse)
def api_set_trip_departure(req: SetTripDepartureRequest, scenario: str = "S1", db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("dispatcher"))):
    """Set planned departure time for a trip."""
    return set_trip_departure(db, req.vehicle_id, req.trip_no, req.departure_time, scenario=scenario, actor=user.display_name)

@router.post("/fuel-input", response_model=DraftPlanResponse)
def api_set_vehicle_fuel_input(req: SetVehicleFuelInputRequest, scenario: str = "S1", db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("dispatcher"))):
    """Set confirmed prior weekly fuel usage for a vehicle."""
    return set_vehicle_fuel_input(db, req.vehicle_id, req.prior_weekly_fuel_usage_l, scenario=scenario, actor=user.display_name)

@router.post("/suggest", response_model=DraftPlanResponse)
def api_suggest_plan(scenario: str = "S1", db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("dispatcher"))):
    """Run transparent heuristic greedy plan generator."""
    return suggest_plan_greedy(db, scenario=scenario, actor=user.display_name)

@router.get("/validate")
def api_validate_plan(scenario: str = "S1", db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("dispatcher"))):
    """Full server-side revalidation checklist for the current plan draft."""
    engine = get_validation_engine(db, scenario)
    draft_state = get_draft_state(db, scenario)
    checklist = engine.validate_full_plan(
        draft_state["assignments"],
        draft_state["stopSequences"],
        {k: v.get("plannedDepartureTime") for k, v in draft_state["tripMeta"].items()},
        draft_state["vehicleFuelInputs"],
    )
    all_pass = all(c["kind"] == "checker_pass" for c in checklist)
    checker_pass = all(c["kind"] == "checker_pass" for c in checklist if c["group"] == "checker")
    return {
        "checklist": checklist,
        "checkerFeasible": checker_pass,
        "operationalFeasible": all_pass if not any(c["kind"] == "unverified" for c in checklist) else None,
    }

@router.get("/candidates/{order_ref}", response_model=List[RankedCandidateSchema])
def api_get_candidates(order_ref: str, scenario: str = "S1", db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("dispatcher"))):
    """Get transparent ranked recommendations for an order."""
    engine = get_validation_engine(db, scenario)
    draft_state = get_draft_state(db, scenario)
    return engine.rank_candidates_for_order(
        order_ref,
        draft_state["assignments"],
        draft_state["stopSequences"],
        {k: v.get("plannedDepartureTime") for k, v in draft_state["tripMeta"].items()},
        draft_state["vehicleFuelInputs"],
    )

@router.post("/publish", response_model=ManifestResponseSchema)
def api_publish_plan(req: PublishPlanRequest, scenario: str = "S1", db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("dispatcher"))):
    """Atomic release of plan to create immutable manifest version."""
    manifest = release_plan(
        db,
        expected_revision=req.expected_revision,
        shortfall_policy=req.shortfall_policy or "ship_good_tell_store",
        decision_maker=user.display_name,
        scenario=scenario,
    )
    trips = manifest.released_trips if hasattr(manifest, "released_trips") else []
    # Query trips from DB
    from app.models.plan import ReleasedTrip
    trip_rows = db.query(ReleasedTrip).filter(ReleasedTrip.manifest_id == manifest.id).all()
    trip_snapshots = [
        ManifestTripSnapshotSchema(
            id=t.id,
            vehicleId=t.vehicle_id,
            tripNo=t.trip_no,
            tripId=t.trip_id_str,
            brand=t.brand,
            district=t.district,
            depot=t.depot,
            plannedDepartureTime=t.planned_departure_time,
            leaveByTime=t.leave_by_time,
            stopOutletIds=t.stop_outlet_ids or [],
            orderRefs=t.order_refs or [],
            loadingStatus=t.loading_status,
            otpUnlocked=t.otp_unlocked,
        )
        for t in trip_rows
    ]
    return ManifestResponseSchema(
        id=manifest.id,
        version=manifest.version,
        scenario=manifest.scenario,
        publishedAt=manifest.published_at_str,
        decisionMaker=manifest.decision_maker,
        shortfallPolicy=manifest.shortfall_policy,
        acknowledgement=manifest.acknowledgement,
        trips=trip_snapshots,
    )
