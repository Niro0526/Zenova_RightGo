"""Orders API endpoints for intake, placement, cancellation, and store manager view."""

import uuid
from datetime import datetime
from typing import Any, List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from supabase import AsyncClient

from app.core.config import settings
from app.database.supabase import get_supabase
from app.database.session import get_db
from app.models.order import Order
from app.schemas.order import OrderSchema, CreateOrderRequest, CancelOrderRequest
from app.services.store_manager_service import cancel_store_order

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.get("", response_model=List[OrderSchema])
async def list_orders(
    scenario: str = "S1",
    outlet_id: Optional[str] = None,
    brand: Optional[str] = None,
    status: Optional[str] = None,
    supabase: AsyncClient = Depends(get_supabase),
):
    """List orders with optional filters."""
    try:
        query = supabase.table("orders").select("*").eq("scenario", scenario)
        if outlet_id:
            query = query.eq("outlet_id", outlet_id)
        if brand:
            query = query.eq("brand", brand)
        if status:
            query = query.eq("status", status)
        result = await query.order("order_ref").execute()
    except Exception as e:
        print("❌ DB Error:", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Orders lookup failed",
        ) from e
    return result.data or []

@router.post("", response_model=OrderSchema, status_code=status.HTTP_201_CREATED)
async def create_order(
    req: CreateOrderRequest,
    supabase: AsyncClient = Depends(get_supabase),
):
    now = datetime.now(ZoneInfo(settings.TIMEZONE))
    if (now.hour, now.minute) >= (16, 0):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Orders cannot be placed after the 4 PM cutoff",
        )

    try:
        outlet_result = await supabase.table("outlets").select("*").eq("outlet_id", req.outlet_id).limit(1).execute()
    except Exception as e:
        print("❌ DB Error:", str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Outlet lookup failed") from e
    if not outlet_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outlet not found")

    outlet: dict[str, Any] = outlet_result.data[0]
    temp_requirement = req.temp_requirement or ("chilled" if req.brand == "Fresh" else "ambient")
    order = {
        "scenario": "S1",
        "order_ref": f"ORD-{now:%Y%m%d}-{uuid.uuid4().hex[:4].upper()}",
        "outlet_id": req.outlet_id,
        "brand": req.brand,
        "district": outlet["district"],
        "depot": outlet["depot"],
        "dock_type": outlet["dock_type"],
        "parking_constraint": outlet["parking_constraint"],
        "mall_window": outlet.get("mall_window"),
        "window_open_time": outlet["window_open_time"],
        "window_close_time": outlet["window_close_time"],
        "temp_requirement": temp_requirement,
        "order_units": req.units,
        "order_weight_kg": round(req.units * (5.5 if req.brand == "Fresh" else (0.8 if req.brand == "Style" else 15.0)), 1),
        "order_volume_m3": round(req.units * (0.025 if req.brand == "Fresh" else (0.005 if req.brand == "Style" else 0.12)), 3),
        "deferred_yesterday": False,
        "days_since_last_served": 1,
        "status": "awaiting_planning",
        "placed_by": req.placed_by or "Store Manager",
        "notes": req.notes,
        "created_at": now.isoformat(),
    }
    order["delivery_id"] = order["order_ref"]
    try:
        result = await supabase.table("orders").insert(order).execute()
    except Exception as e:
        print("❌ DB Error:", str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Order could not be persisted") from e
    if not result.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Order could not be created")
    return result.data[0]

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
