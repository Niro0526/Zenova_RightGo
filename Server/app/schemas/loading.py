"""Loading workflow schemas."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class OrderLoadingStatusSchema(BaseModel):
    orderRef: str
    outletId: str
    plannedUnits: int
    loadedUnits: int
    effectiveUnits: int
    isLoaded: bool

class LoadingIssueCreateRequest(BaseModel):
    manifest_version: int
    vehicle_id: str
    trip_no: int
    order_ref: str
    outlet_id: str
    issue_type: str # missing, damaged, short, vehicle_problem
    units_affected: int = 0
    notes: Optional[str] = None
    reported_by: Optional[str] = "Rizwan (Loader)"

class LoadingIssueActionRequest(BaseModel):
    action: str # replace_from_stock, send_to_dispatcher, apply_policy, undo
    notes: Optional[str] = None
    resolved_by: Optional[str] = "Rizwan (Loader)"

class LoadingIssueResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    manifest_version: int
    vehicle_id: str
    trip_no: int
    order_ref: str
    outlet_id: str
    issue_type: str
    units_affected: int
    status: str
    action_taken: Optional[str] = None
    notes: Optional[str] = None
    reported_at: datetime
    reported_by: str
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None

class TripReadinessResponseSchema(BaseModel):
    tripId: str
    vehicleId: str
    tripNo: int
    loadingStatus: str # planned, loading, ready, in_transit, completed
    totalOrders: int
    loadedOrders: int
    hasOpenIssues: bool
    isReady: bool
    leaveByTime: Optional[str] = None
    otpCode: Optional[str] = None
