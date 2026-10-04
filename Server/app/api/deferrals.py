"""Deferral memory and store acknowledgements API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.deps import require_role, CurrentUser
from app.models.memory import DeferralMemory, DeferralAcknowledgement
from app.schemas.store_manager import DeferralAckRequest
from app.services.store_manager_service import acknowledge_deferral

router = APIRouter(prefix="/deferrals", tags=["Deferrals"])

@router.get("/memory")
def get_deferral_memory(outlet_id: Optional[str] = None, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("dispatcher", "store_manager"))):
    """Get tracked consecutive deferral history. A store_manager only sees their own outlet's."""
    query = db.query(DeferralMemory)
    if user.role == "store_manager":
        query = query.filter(DeferralMemory.outlet_id == user.outlet_id)
    elif outlet_id:
        query = query.filter(DeferralMemory.outlet_id == outlet_id)
    memories = query.all()
    return [
        {
            "outletId": m.outlet_id,
            "consecutiveSkips": m.consecutive_skips,
            "lastDeferredScenario": m.last_deferred_scenario,
            "lastReasonCode": m.last_reason_code,
            "lastReasonNote": m.last_reason_note,
            "updatedAt": m.updated_at,
        }
        for m in memories
    ]

@router.post("/ack")
def api_ack_deferral(req: DeferralAckRequest, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("store_manager"))):
    """Acknowledge order deferral with store manager explanation - only for the caller's own outlet."""
    if user.outlet_id and req.outlet_id != user.outlet_id:
        raise HTTPException(status_code=403, detail="You can only acknowledge deferrals for your own outlet.")
    ack = acknowledge_deferral(db, req, acknowledged_by=user.display_name)
    return {"success": True, "ackId": ack.id, "acknowledgedAt": ack.acknowledged_at}
