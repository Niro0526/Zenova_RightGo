"""Decision and Audit Ledger API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.deps import require_role, CurrentUser
from app.models.memory import LedgerEntry
from app.schemas.ledger import LedgerEntryResponseSchema
from app.services.ledger_service import list_ledger_entries

router = APIRouter(prefix="/ledger", tags=["Audit Ledger"])

@router.get("", response_model=List[LedgerEntryResponseSchema])
def get_ledger(
    order_ref: Optional[str] = None,
    outlet_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("dispatcher")),
):
    """List append-only audit trail of planning and operational decisions."""
    entries = list_ledger_entries(db, order_ref=order_ref, outlet_id=outlet_id)
    return [
        LedgerEntryResponseSchema(
            id=e.id,
            orderRef=e.order_ref or "-",
            outletId=e.outlet_id or "-",
            action=e.action,
            reasonCode=e.reason_code,
            reasonNote=e.reason_note,
            decisionMaker=e.actor,
            time=e.timestamp.strftime("%H:%M") if e.timestamp else "00:00",
            previousAssignment=e.previous_state or "-",
            updatedAssignment=e.updated_state or "-",
            planVersion=e.plan_version or 0,
        )
        for e in entries
    ]
