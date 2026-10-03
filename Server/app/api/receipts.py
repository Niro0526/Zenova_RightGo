"""Store Receipts API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from supabase import AsyncClient
from app.database.supabase import get_supabase
from app.database.session import get_db
from app.models.operations import ReceiptRecord
from app.schemas.store_manager import ReceiptConfirmRequest, ReceiptResponseSchema
from app.services.store_manager_service import confirm_store_receipt

router = APIRouter(prefix="/receipts", tags=["Receipts"])

@router.get("", response_model=List[ReceiptResponseSchema])
def list_receipts(outlet_id: Optional[str] = None, db: Session = Depends(get_db)):
    """List confirmed store receipts."""
    query = db.query(ReceiptRecord)
    if outlet_id:
        query = query.filter(ReceiptRecord.outlet_id == outlet_id)
    return query.order_by(ReceiptRecord.confirmed_at.desc()).all()

@router.post("/confirm", response_model=ReceiptResponseSchema)
async def confirm_receipt(
    req: ReceiptConfirmRequest,
    supabase: AsyncClient = Depends(get_supabase),
):
    """Confirm receipt of goods at retail store."""
    if req.delivery_record_id:
        try:
            delivery = await supabase.table("delivery_records").select("id").eq("id", req.delivery_record_id).limit(1).execute()
        except Exception as e:
            print("DB Error:", str(e))
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Delivery lookup failed") from e
        if not delivery.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery record not found")
        try:
            await supabase.table("delivery_records").update({
                "pod_signer_name": req.pod_signer_name or req.confirmed_by,
                "pod_signature_url": req.pod_signature_url,
                "pod_has_signature": bool(req.pod_signature_url or req.pod_signer_name),
                "status": "completed",
            }).eq("id", req.delivery_record_id).execute()
        except Exception as e:
            print("DB Error:", str(e))
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Delivery update failed") from e

    try:
        result = await supabase.table("receipt_records").insert({
            "order_ref": req.order_ref,
            "outlet_id": req.outlet_id,
            "delivery_record_id": req.delivery_record_id,
            "confirmed_units": req.confirmed_units,
            "has_issue": req.has_issue,
            "issue_type": req.issue_type if req.has_issue else None,
            "notes": req.notes,
            "confirmed_by": req.confirmed_by or "K. Perera (Manager)",
        }).execute()
    except Exception as e:
        print("DB Error:", str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Receipt could not be persisted") from e
    if not result.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Receipt could not be recorded")
    return result.data[0]
