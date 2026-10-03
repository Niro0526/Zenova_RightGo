"""Store Manager schemas."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class ReceiptConfirmRequest(BaseModel):
    order_ref: str
    outlet_id: str
    confirmed_units: int
    delivery_record_id: Optional[str] = None
    has_issue: bool = False
    issue_type: Optional[str] = None # short, damaged, temperature, late
    notes: Optional[str] = None
    confirmed_by: Optional[str] = "K. Perera (Manager)"

class DeferralAckRequest(BaseModel):
    outlet_id: str
    order_ref: str
    manifest_version: int
    acknowledged_by: Optional[str] = "Store Manager"
    notes: Optional[str] = None

class ReceiptResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    order_ref: str
    outlet_id: str
    confirmed_units: int
    has_issue: bool
    issue_type: Optional[str] = None
    notes: Optional[str] = None
    confirmed_by: str
    confirmed_at: datetime
