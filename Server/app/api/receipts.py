"""Store Receipts API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
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
def confirm_receipt(req: ReceiptConfirmRequest, db: Session = Depends(get_db)):
    """Confirm receipt of goods at retail store."""
    return confirm_store_receipt(db, req)
