"""Orders API endpoints for intake, placement, cancellation, and store manager view."""

from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.deps import require_role, CurrentUser
from app.models.order import Order
from app.schemas.order import OrderSchema, CreateOrderRequest, CancelOrderRequest
from app.services.store_manager_service import place_store_order, cancel_store_order
from app.services.scheduling_service import current_run_date, colombo_now, CUTOFF_HOUR

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.get("", response_model=List[OrderSchema])
def list_orders(
    scenario: str = "S1",
    outlet_id: Optional[str] = None,
    brand: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("dispatcher", "store_manager")),
):
    """List orders with optional filters. A store_manager only ever sees
    their own outlet's orders, regardless of what outlet_id they pass."""
    query = db.query(Order).filter(Order.scenario == scenario)
    if user.role == "store_manager":
        query = query.filter(Order.outlet_id == user.outlet_id)
    elif outlet_id:
        query = query.filter(Order.outlet_id == outlet_id)
    if brand:
        query = query.filter(Order.brand == brand)
    if status:
        query = query.filter(Order.status == status)
    return query.order_by(Order.order_ref).all()

@router.get("/confirmed-queue", response_model=List[OrderSchema])
def get_confirmed_queue(
    scenario: str = "S1",
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("dispatcher")),
):
    """Dispatcher-only: return all awaiting_planning orders for the current
    planning run_date. These are the confirmed store orders that the
    dispatcher's planning screen should display and schedule.

    Includes both:
    - Legacy/seed rows (run_date IS NULL) with status awaiting_planning
    - New store-placed orders (run_date <= current_run_date) with status awaiting_planning
    """
    run_date = current_run_date(db)
    return (
        db.query(Order)
        .filter(
            Order.scenario == scenario,
            Order.status == "awaiting_planning",
        )
        .filter(
            (Order.run_date.is_(None)) | (Order.run_date <= run_date)
        )
        .order_by(Order.created_at.asc(), Order.order_ref.asc())
        .all()
    )

@router.get("/cutoff-status")
def get_cutoff_status(
    scenario: str = "S1",
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("dispatcher")),
):
    """Return 4 PM cutoff status and the current confirmed-order queue counts.
    The dispatcher planning screen polls this to decide whether to show
    'cutoff has passed - auto-plan available' UI state.
    """
    local_now = colombo_now()
    cutoff_passed = local_now.hour >= CUTOFF_HOUR
    run_date = current_run_date(db)

    # Count eligible awaiting_planning orders
    confirmed_count = (
        db.query(Order)
        .filter(
            Order.scenario == scenario,
            Order.status == "awaiting_planning",
        )
        .filter(
            (Order.run_date.is_(None)) | (Order.run_date <= run_date)
        )
        .count()
    )

    # Per-brand breakdown
    brand_counts = {}
    for brand in ["Fresh", "Style", "Tech"]:
        cnt = (
            db.query(Order)
            .filter(
                Order.scenario == scenario,
                Order.status == "awaiting_planning",
                Order.brand == brand,
            )
            .filter(
                (Order.run_date.is_(None)) | (Order.run_date <= run_date)
            )
            .count()
        )
        if cnt > 0:
            brand_counts[brand] = cnt

    # Newest order placed timestamp
    newest = (
        db.query(Order)
        .filter(
            Order.scenario == scenario,
            Order.status == "awaiting_planning",
        )
        .filter(
            (Order.run_date.is_(None)) | (Order.run_date <= run_date)
        )
        .order_by(Order.created_at.desc())
        .first()
    )

    return {
        "cutoffPassed": cutoff_passed,
        "localTime": local_now.strftime("%H:%M"),
        "cutoffHour": CUTOFF_HOUR,
        "runDate": run_date.isoformat(),
        "confirmedCount": confirmed_count,
        "brandCounts": brand_counts,
        "newestOrderAt": newest.created_at.isoformat() if newest and newest.created_at else None,
    }

@router.post("", response_model=OrderSchema)
def create_order(req: CreateOrderRequest, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("store_manager"))):
    """Place a new replenishment order for the caller's own outlet."""
    if user.outlet_id and req.outlet_id != user.outlet_id:
        raise HTTPException(status_code=403, detail=f"You can only place orders for your own outlet ({user.outlet_id}).")
    return place_store_order(db, req, placed_by=user.display_name)

@router.get("/{order_ref}", response_model=OrderSchema)
def get_order(order_ref: str, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("dispatcher", "store_manager"))):
    """Get order details by order_ref."""
    order = db.query(Order).filter(Order.order_ref == order_ref).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if user.role == "store_manager" and order.outlet_id != user.outlet_id:
        raise HTTPException(status_code=403, detail="You can only view orders for your own outlet.")
    return order

@router.post("/{order_ref}/cancel", response_model=OrderSchema)
def cancel_order(order_ref: str, req: CancelOrderRequest, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("store_manager"))):
    """Cancel order before warehouse loading - only the owning outlet may cancel its own order."""
    order = db.query(Order).filter(Order.order_ref == order_ref).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if user.outlet_id and order.outlet_id != user.outlet_id:
        raise HTTPException(status_code=403, detail="You can only cancel orders for your own outlet.")
    return cancel_store_order(db, order_ref, req, cancelled_by=user.display_name)
