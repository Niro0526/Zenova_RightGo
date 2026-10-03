"""Deferral memory and store acknowledgements API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.memory import DeferralMemory, DeferralAcknowledgement
from app.schemas.store_manager import DeferralAckRequest
from app.services.store_manager_service import acknowledge_deferral

router = APIRouter(prefix="/deferrals", tags=["Deferrals"])

@router.get("/memory")
def get_deferral_memory(outlet_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Get tracked consecutive deferral history."""
    query = db.query(DeferralMemory)
    if outlet_id:
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
def api_ack_deferral(req: DeferralAckRequest, db: Session = Depends(get_db)):
    """Acknowledge order deferral with store manager explanation."""
    ack = acknowledge_deferral(db, req)
    return {"success": True, "ackId": ack.id, "acknowledgedAt": ack.acknowledged_at}
