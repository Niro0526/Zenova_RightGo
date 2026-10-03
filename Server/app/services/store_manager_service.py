"""Store Manager service for replenishment ordering, cancellation, receipt confirmation, and deferrals."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.order import Order
from app.models.reference import Outlet
from app.models.plan import ReleasedTrip, OrderLoadingState
from app.models.operations import DeliveryRecord, ReceiptRecord
from app.models.memory import DeferralAcknowledgement, DeferralMemory
from app.schemas.order import CreateOrderRequest, CancelOrderRequest
from app.schemas.store_manager import ReceiptConfirmRequest, DeferralAckRequest
from app.services.notification_service import create_notification
from app.services.ledger_service import record_ledger_entry

def place_store_order(
    db: Session,
    req: CreateOrderRequest,
) -> Order:
    outlet = db.query(Outlet).filter(Outlet.outlet_id == req.outlet_id).first()
    if not outlet:
        raise HTTPException(status_code=404, detail="Outlet not found")

    temp_req = req.temp_requirement or ("chilled" if req.brand == "Fresh" else "ambient")
    order_ref = f"ORD-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"

    # Standard weight/volume estimation per unit for catalog replenishment
    weight_kg = round(req.units * (5.5 if req.brand == "Fresh" else (0.8 if req.brand == "Style" else 15.0)), 1)
    volume_m3 = round(req.units * (0.025 if req.brand == "Fresh" else (0.005 if req.brand == "Style" else 0.12)), 3)

    order = Order(
        scenario="S1",
        order_ref=order_ref,
        outlet_id=req.outlet_id,
        brand=req.brand,
        district=outlet.district,
        depot=outlet.depot,
        dock_type=outlet.dock_type,
        parking_constraint=outlet.parking_constraint,
        mall_window=outlet.mall_window,
        window_open_time=outlet.window_open_time,
        window_close_time=outlet.window_close_time,
        temp_requirement=temp_req,
        order_units=req.units,
        order_weight_kg=weight_kg,
        order_volume_m3=volume_m3,
        deferred_yesterday=False,
        days_since_last_served=1,
        status="awaiting_planning",
        placed_by=req.placed_by or "Store Manager",
        notes=req.notes,
        created_at=datetime.now(timezone.utc),
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    record_ledger_entry(
        db,
        action="order_placed",
        actor=req.placed_by or "Store Manager",
        order_ref=order_ref,
        outlet_id=req.outlet_id,
        reason_note=f"Placed replenishment order for {req.units} units of {req.brand}.",
    )

    create_notification(
        db,
        target_role="dispatcher",
        kind="order_placed",
        title=f"New Order Placed: {order_ref}",
        text=f"{outlet.name} placed an order for {req.units} units of {req.brand}.",
    )

    return order

def cancel_store_order(
    db: Session,
    order_ref: str,
    req: CancelOrderRequest,
) -> Order:
    order = db.query(Order).filter(Order.order_ref == order_ref).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Protected loading/departure check
    loading_state = db.query(OrderLoadingState).filter(
        OrderLoadingState.order_ref == order_ref,
        OrderLoadingState.is_loaded == True,
    ).first()
    if loading_state or order.status in ("loading", "loaded", "in_transit", "delivered"):
        record_ledger_entry(
            db,
            action="cancel_refused",
            actor=req.cancelled_by or "Store Manager",
            order_ref=order_ref,
            outlet_id=order.outlet_id,
            reason_note=f"Cancellation refused for {order_ref}: order is already in loading/transit/delivered state.",
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Order cannot be cancelled after warehouse loading has commenced.",
        )

    order.status = "cancelled"
    order.notes = f"{order.notes or ''} | Cancelled: {req.reason}".strip(" |")
    db.commit()
    db.refresh(order)

    record_ledger_entry(
        db,
        action="order_cancelled",
        actor=req.cancelled_by or "Store Manager",
        order_ref=order_ref,
        outlet_id=order.outlet_id,
        reason_note=f"Order cancelled by store: {req.reason}",
    )

    create_notification(
        db,
        target_role="dispatcher",
        kind="order_cancelled",
        title=f"Order Cancelled: {order_ref}",
        text=f"{order.outlet_id} cancelled order: {req.reason}",
    )

    return order

def confirm_store_receipt(
    db: Session,
    req: ReceiptConfirmRequest,
) -> ReceiptRecord:
    receipt = ReceiptRecord(
        order_ref=req.order_ref,
        outlet_id=req.outlet_id,
        delivery_record_id=req.delivery_record_id,
        confirmed_units=req.confirmed_units,
        has_issue=req.has_issue,
        issue_type=req.issue_type if req.has_issue else None,
        notes=req.notes,
        confirmed_by=req.confirmed_by or "K. Perera (Manager)",
        confirmed_at=datetime.now(timezone.utc),
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)

    record_ledger_entry(
        db,
        action="receipt_confirmed" if not req.has_issue else "receipt_issue",
        actor=receipt.confirmed_by,
        order_ref=req.order_ref,
        outlet_id=req.outlet_id,
        reason_code=req.issue_type if req.has_issue else None,
        reason_note=req.notes or f"Confirmed receipt of {req.confirmed_units} units.",
    )

    if req.has_issue:
        create_notification(
            db,
            target_role="dispatcher",
            kind="receipt_issue",
            title=f"Receipt Issue at {req.outlet_id}",
            text=f"Issue: {req.issue_type} reported for order {req.order_ref}. Confirmed units: {req.confirmed_units}.",
        )

    return receipt

def acknowledge_deferral(
    db: Session,
    req: DeferralAckRequest,
) -> DeferralAcknowledgement:
    ack = DeferralAcknowledgement(
        outlet_id=req.outlet_id,
        order_ref=req.order_ref,
        manifest_version=req.manifest_version,
        acknowledged_by=req.acknowledged_by or "Store Manager",
        acknowledged_at=datetime.now(timezone.utc),
        notes=req.notes,
    )
    db.add(ack)
    db.commit()
    db.refresh(ack)

    record_ledger_entry(
        db,
        action="deferral_acknowledged",
        actor=ack.acknowledged_by,
        order_ref=req.order_ref,
        outlet_id=req.outlet_id,
        reason_note=f"Store Manager acknowledged order deferral (Plan v{req.manifest_version}).",
        plan_version=req.manifest_version,
    )

    create_notification(
        db,
        target_role="dispatcher",
        kind="deferral_ack",
        title=f"Deferral Acknowledged by {req.outlet_id}",
        text=f"Store Manager acknowledged deferral of {req.order_ref}.",
        plan_version=req.manifest_version,
    )

    return ack
