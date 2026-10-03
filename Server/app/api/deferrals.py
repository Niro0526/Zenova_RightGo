"""Deferral memory and store acknowledgements API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from supabase import AsyncClient
from app.database.session import get_db
from app.database.supabase import get_supabase
from app.models.memory import DeferralMemory, DeferralAcknowledgement
from app.schemas.store_manager import DeferralAckRequest
from app.services.store_manager_service import acknowledge_deferral

router = APIRouter(prefix="/deferrals", tags=["Deferrals"])

@router.get("/memory")
async def get_deferral_memory(
    outlet_id: Optional[str] = None,
    supabase: AsyncClient = Depends(get_supabase),
):
    """Get tracked consecutive deferral history."""
    query = supabase.table("deferral_memory").select("*")
    if outlet_id:
        query = query.eq("outlet_id", outlet_id)
    memories = (await query.execute()).data
    return [
        {
            "outletId": m["outlet_id"],
            "consecutiveSkips": m["consecutive_skips"],
            "lastDeferredScenario": m.get("last_deferred_scenario"),
            "lastReasonCode": m.get("last_reason_code"),
            "lastReasonNote": m.get("last_reason_note"),
            "updatedAt": m["updated_at"],
        }
        for m in memories
    ]

@router.post("/ack")
async def api_ack_deferral(
    req: DeferralAckRequest,
    supabase: AsyncClient = Depends(get_supabase),
):
    """Acknowledge order deferral with store manager explanation."""
    try:
        result = await supabase.table("deferral_acknowledgements").insert({
            "outlet_id": req.outlet_id,
            "order_ref": req.order_ref,
            "manifest_version": req.manifest_version,
            "acknowledged_by": req.acknowledged_by or "Store Manager",
            "notes": req.notes,
        }).execute()
    except Exception as e:
        print("DB Error:", str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Deferral acknowledgement could not be persisted") from e
    ack = result.data[0]
    return {"success": True, "ackId": ack["id"], "acknowledgedAt": ack["acknowledged_at"]}
