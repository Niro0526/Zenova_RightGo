"""Orders API endpoints for intake, placement, cancellation, and store manager view."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.order import Order
from app.schemas.order import OrderSchema, CreateOrderRequest, CancelOrderRequest
from app.services.store_manager_service import place_store_order, cancel_store_order

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.get("", response_model=List[OrderSchema])
def list_orders(
    scenario: str = "S1",
    outlet_id: Optional[str] = None,
    brand: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List orders with optional filters."""
    query = db.query(Order).filter(Order.scenario == scenario)
    if outlet_id:
        query = query.filter(Order.outlet_id == outlet_id)
    if brand:
        query = query.filter(Order.brand == brand)
    if status:
        query = query.filter(Order.status == status)
    return query.order_by(Order.order_ref).all()

@router.post("", response_model=OrderSchema)
def create_order(req: CreateOrderRequest, db: Session = Depends(get_db)):
    """Place a new replenishment order."""
    return place_store_order(db, req)

@router.get("/{order_ref}", response_model=OrderSchema)
def get_order(order_ref: str, db: Session = Depends(get_db)):
    """Get order details by order_ref."""
    order = db.query(Order).filter(Order.order_ref == order_ref).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.post("/{order_ref}/cancel", response_model=OrderSchema)
def cancel_order(order_ref: str, req: CancelOrderRequest, db: Session = Depends(get_db)):
    """Cancel order before warehouse loading."""
    return cancel_store_order(db, order_ref, req)
