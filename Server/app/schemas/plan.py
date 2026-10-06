"""Planning schemas for dispatcher workflows and validations."""

from typing import Dict, List, Literal, Optional, Any
from pydantic import BaseModel, Field
from app.schemas.reference import VehicleSchema

TripNo = Literal[1, 2]

class OrderAssignmentSchema(BaseModel):
    decision: str = "unresolved" # unresolved, served, deferred
    vehicleId: Optional[str] = None
    tripNo: Optional[int] = None
    reasonCode: Optional[str] = None
    reasonNote: Optional[str] = None
    locked: bool = False # manual decision - preserved across "Suggest Plan" re-runs

class AssignOrderRequest(BaseModel):
    order_ref: str
    vehicle_id: str
    trip_no: TripNo

class ReassignOrderRequest(BaseModel):
    order_ref: str
    vehicle_id: str
    trip_no: TripNo
    reason_note: Optional[str] = None

class DeferOrderRequest(BaseModel):
    order_ref: str
    reason_code: str
    reason_note: Optional[str] = None

class ReorderTripRequest(BaseModel):
    vehicle_id: str
    trip_no: TripNo
    new_outlet_order: List[str]

class SetTripDepartureRequest(BaseModel):
    vehicle_id: str
    trip_no: TripNo
    departure_time: Optional[str] = None # e.g. "03:30"

class SetTripDriverRequest(BaseModel):
    vehicle_id: str
    trip_no: TripNo
    driver_username: str
    driver_name: Optional[str] = None

class SetVehicleFuelInputRequest(BaseModel):
    vehicle_id: str
    prior_weekly_fuel_usage_l: Optional[float] = None

class ValidationResultSchema(BaseModel):
    kind: str # checker_pass, checker_fail, unverified
    group: str # checker, operational
    rule: str
    label: str
    detail: str
    orderRef: Optional[str] = None
    vehicleId: Optional[str] = None
    tripNo: Optional[int] = None

class PassportResultSchema(BaseModel):
    results: List[ValidationResultSchema]
    checkerFeasible: bool
    operationalFeasible: Optional[bool] = None

class RankedCandidateSchema(BaseModel):
    vehicle: VehicleSchema
    tripNo: int
    passport: PassportResultSchema
    recommended: bool
    reasons: List[str]

class TripStopSchema(BaseModel):
    outletId: str
    orderRefs: List[str]

class StopScheduleSchema(BaseModel):
    outletId: str
    orderRefs: List[str]
    arrival: int
    wait: int
    serviceStart: int
    serviceEnd: int
    windowOpen: int
    windowClose: int
    late: bool
    mallWindow: Optional[Dict[str, Any]] = None

class PublishPlanRequest(BaseModel):
    expected_revision: int
    shortfall_policy: Optional[str] = "ship_good_tell_store"
    decision_maker: Optional[str] = "Sarah Jenkins"

class DraftPlanResponse(BaseModel):
    scenario: str
    draftRevision: int
    ordersClosed: bool = False
    ordersClosedAt: Optional[str] = None
    assignments: Dict[str, OrderAssignmentSchema]
    stopSequences: Dict[str, List[str]]
    stopSequenceLocks: Dict[str, bool] = {}
    tripMeta: Dict[str, Dict[str, Any]]
    vehicleFuelInputs: Dict[str, Optional[float]]
    vehicleFuelLocks: Dict[str, bool] = {}
    counts: Dict[str, int]
