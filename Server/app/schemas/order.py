"""Order schemas for intake, placement, cancellation, and list responses."""

from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class OrderSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    scenario: str = "S1"
    order_ref: str
    outlet_id: str
    brand: str
    district: str
    depot: str
    dock_type: str
    parking_constraint: str
    mall_window: Optional[str] = None
    window_open_time: str
    window_close_time: str
    temp_requirement: str
    order_units: int
    order_weight_kg: float
    order_volume_m3: float
    deferred_yesterday: bool = False
    days_since_last_served: int = 1
    status: str = "awaiting_planning"
    placed_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    # Operating day this order is eligible for planning on (4 PM Asia/Colombo cutoff
    # + operating calendar). None = legacy/seed row, always eligible for the current run.
    run_date: Optional[date] = None

    # camelCase aliases for frontend compatibility if needed
    @property
    def orderRef(self) -> str:
        return self.order_ref
    @property
    def outletId(self) -> str:
        return self.outlet_id
    @property
    def orderUnits(self) -> int:
        return self.order_units
    @property
    def orderWeightKg(self) -> float:
        return self.order_weight_kg
    @property
    def orderVolumeM3(self) -> float:
        return self.order_volume_m3
    @property
    def windowOpenTime(self) -> str:
        return self.window_open_time
    @property
    def windowCloseTime(self) -> str:
        return self.window_close_time
    @property
    def tempRequirement(self) -> str:
        return self.temp_requirement
    @property
    def dockType(self) -> str:
        return self.dock_type
    @property
    def parkingConstraint(self) -> str:
        return self.parking_constraint
    @property
    def mallWindow(self) -> Optional[str]:
        return self.mall_window
    @property
    def deferredYesterday(self) -> bool:
        return self.deferred_yesterday
    @property
    def daysSinceLastServed(self) -> int:
        return self.days_since_last_served
    @property
    def runDate(self) -> Optional[date]:
        return self.run_date

class CreateOrderRequest(BaseModel):
    outlet_id: str
    brand: str
    units: int = Field(ge=1, le=500)
    temp_requirement: Optional[str] = None # defaults to outlet brand / catalog standard
    notes: Optional[str] = None
    placed_by: Optional[str] = "Store Manager"

class CancelOrderRequest(BaseModel):
    reason: str
    cancelled_by: Optional[str] = "Store Manager"
