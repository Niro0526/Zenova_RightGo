"""Audit Ledger schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class LedgerEntryResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    orderRef: str
    outletId: str
    action: str # assigned, deferred, reassigned, published, resequenced, etc.
    reasonCode: Optional[str] = None
    reasonNote: Optional[str] = None
    decisionMaker: str
    time: str
    previousAssignment: str
    updatedAssignment: str
    planVersion: int
