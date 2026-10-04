"""Store Receipts API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.deps import require_role, CurrentUser
from app.models.operations import ReceiptRecord
from app.schemas.store_manager import ReceiptConfirmRequest, ReceiptResponseSchema
from app.services.store_manager_service import confirm_store_receipt

router = APIRouter(prefix="/receipts", tags=["Receipts"])

@router.get("", response_model=List[ReceiptResponseSchema])
def list_receipts(outlet_id: Optional[str] = None, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("dispatcher", "store_manager"))):
    """List confirmed store receipts. A store_manager only sees their own outlet's."""
    query = db.query(ReceiptRecord)
    if user.role == "store_manager":
        query = query.filter(ReceiptRecord.outlet_id == user.outlet_id)
    elif outlet_id:
        query = query.filter(ReceiptRecord.outlet_id == outlet_id)
    return query.order_by(ReceiptRecord.confirmed_at.desc()).all()

@router.post("/confirm", response_model=ReceiptResponseSchema)
def confirm_receipt(req: ReceiptConfirmRequest, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("store_manager"))):
    """Confirm receipt of goods at retail store - only for the caller's own outlet."""
    if user.outlet_id and req.outlet_id != user.outlet_id:
        raise HTTPException(status_code=403, detail="You can only confirm receipts for your own outlet.")
    return confirm_store_receipt(db, req, confirmed_by=user.display_name)
