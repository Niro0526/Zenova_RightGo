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
from app.services.scheduling_service import compute_run_date, load_operating_calendar
from app.services.driver_service import delivered_units_by_order

def place_store_order(
    db: Session,
    req: CreateOrderRequest,
    placed_by: Optional[str] = None,
) -> Order:
    outlet = db.query(Outlet).filter(Outlet.outlet_id == req.outlet_id).first()
    if not outlet:
        raise HTTPException(status_code=404, detail="Outlet not found")

    order_ref = f"ORD-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"

    if req.items and len(req.items) > 0:
        total_units = sum(int(i.qty) for i in req.items)
        weight_kg = round(sum(int(i.qty) * (float(i.unit_weight) if i.unit_weight is not None else 5.0) for i in req.items), 1)
        volume_m3 = round(sum(int(i.qty) * (float(i.unit_vol) if i.unit_vol is not None else 0.01) for i in req.items), 3)
        has_chilled = any(bool(i.is_chilled) or (bool(i.temp) and "chill" in str(i.temp).lower()) for i in req.items)
        temp_req = req.temp_requirement or ("chilled" if has_chilled else "ambient")
        items_json = [i.model_dump() for i in req.items]
        summary_notes = req.notes or ", ".join(f"{i.name} x{i.qty}" for i in req.items)
    else:
        total_units = req.units or 1
        weight_kg = round(total_units * (5.5 if req.brand == "Fresh" else (0.8 if req.brand == "Style" else 15.0)), 1)
        volume_m3 = round(total_units * (0.025 if req.brand == "Fresh" else (0.005 if req.brand == "Style" else 0.12)), 3)
        temp_req = req.temp_requirement or ("chilled" if req.brand == "Fresh" else "ambient")
        items_json = None
        summary_notes = req.notes

    confirmed_at = datetime.now(timezone.utc)
    # 4 PM Asia/Colombo cutoff: an order confirmed at/after the cutoff (or on a
    # non-operating day) rolls forward to the next real operating day's run.
    run_date = compute_run_date(confirmed_at, load_operating_calendar(db))

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
        order_units=total_units,
        order_weight_kg=weight_kg,
        order_volume_m3=volume_m3,
        deferred_yesterday=False,
        days_since_last_served=1,
        status="awaiting_planning",
        placed_by=placed_by or req.placed_by or "Store Manager",
        notes=summary_notes,
        items_json=items_json,
        created_at=confirmed_at,
        run_date=run_date,
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    record_ledger_entry(
        db,
        action="order_placed",
        actor=placed_by or req.placed_by or "Store Manager",
        order_ref=order_ref,
        outlet_id=req.outlet_id,
        reason_note=f"Placed replenishment order for {total_units} units ({weight_kg} kg, {volume_m3} m3) of {req.brand}.",
    )

    create_notification(
        db,
        target_role="dispatcher",
        kind="order_placed",
        title=f"New Order Placed: {order_ref}",
        text=f"{outlet.name} placed order {order_ref} ({total_units} units of {req.brand}).",
    )

    return order

def cancel_store_order(
    db: Session,
    order_ref: str,
    req: CancelOrderRequest,
    cancelled_by: Optional[str] = None,
) -> Order:
    actor_name = cancelled_by or req.cancelled_by or "Store Manager"
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
            actor=actor_name,
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
    # If the order was already released but not yet loaded, take it off its trip
    # so the loader is never asked to load a cancelled order.
    for st in db.query(OrderLoadingState).filter(OrderLoadingState.order_ref == order_ref).all():
        trip = db.query(ReleasedTrip).filter(ReleasedTrip.id == st.released_trip_id).first()
        if not trip or trip.loading_status not in ("planned", "loading", "ready"):
            continue
        db.delete(st)
        trip.order_refs = [r for r in (trip.order_refs or []) if r != order_ref]
        still_here = db.query(Order).filter(Order.order_ref.in_(trip.order_refs or []), Order.outlet_id == order.outlet_id).count() if trip.order_refs else 0
        if not still_here:
            trip.stop_outlet_ids = [s for s in (trip.stop_outlet_ids or []) if s != order.outlet_id]
        create_notification(
            db,
            target_role="loader",
            kind="order_cancelled",
            title=f"Order {order_ref} Cancelled Before Loading",
            text=f"{order.outlet_id} cancelled {order_ref}; it was removed from trip {trip.trip_id_str} ({trip.vehicle_id}).",
            plan_version=trip.manifest_version,
        )
    db.commit()
    db.refresh(order)

    record_ledger_entry(
        db,
        action="order_cancelled",
        actor=actor_name,
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

def find_delivery_for_order(db: Session, order: Order) -> Optional[DeliveryRecord]:
    """The driver's delivery record that carried THIS order (its trip + stop) - not merely
    the latest delivery at the outlet. Legacy deliveries with no trip fall back to the
    outlet's latest only when the order was never on a released trip."""
    carrying = db.query(ReleasedTrip).filter(ReleasedTrip.scenario == order.scenario).order_by(ReleasedTrip.manifest_version.desc()).all()
    for t in carrying:
        if order.order_ref in (t.order_refs or []):
            return db.query(DeliveryRecord).filter(
                DeliveryRecord.trip_id == t.trip_id_str,
                DeliveryRecord.manifest_version == t.manifest_version,
                DeliveryRecord.stop_id == order.outlet_id,
            ).first()
    return db.query(DeliveryRecord).filter(DeliveryRecord.stop_id == order.outlet_id).order_by(
        DeliveryRecord.recorded_at.desc()
    ).first()


def get_receipt_expectation(db: Session, order_ref: str, outlet_id: str) -> Dict[str, Any]:
    """What the store should expect to confirm for an order: the quantity the driver actually
    delivered (after any loading shortfall / delivery discrepancy), never the order quantity."""
    order = db.query(Order).filter(Order.order_ref == order_ref).first()
    if not order or order.outlet_id != outlet_id:
        raise HTTPException(status_code=404, detail=f"Order {order_ref} not found for outlet {outlet_id}.")
    delivery = find_delivery_for_order(db, order)
    already = db.query(ReceiptRecord).filter(ReceiptRecord.order_ref == order_ref, ReceiptRecord.outlet_id == outlet_id).first()
    if not delivery:
        return {"orderRef": order_ref, "outletId": outlet_id, "delivered": False, "plannedUnits": order.order_units,
                "deliveredUnits": 0, "outcome": None, "alreadyConfirmed": bool(already)}
    per_order = delivered_units_by_order(db, delivery)
    delivered_units = per_order.get(order_ref, min(delivery.delivered_qty, order.order_units))
    return {
        "orderRef": order_ref,
        "outletId": outlet_id,
        "delivered": True,
        "plannedUnits": order.order_units,
        "deliveredUnits": delivered_units,
        "outcome": delivery.outcome,
        "vehicleId": delivery.vehicle_id,
        "tripId": delivery.trip_id,
        "deliveredAt": delivery.recorded_at.isoformat() if delivery.recorded_at else None,
        "deliveryRecordId": delivery.id,
        "alreadyConfirmed": bool(already),
    }


def confirm_store_receipt(
    db: Session,
    req: ReceiptConfirmRequest,
    confirmed_by: Optional[str] = None,
) -> ReceiptRecord:
    if req.confirmed_units < 0:
        raise HTTPException(status_code=400, detail="Confirmed units cannot be negative.")

    order = db.query(Order).filter(Order.order_ref == req.order_ref).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {req.order_ref} not found.")
    if order.outlet_id != req.outlet_id:
        raise HTTPException(status_code=403, detail=f"Order {req.order_ref} does not belong to outlet {req.outlet_id}.")

    delivery = find_delivery_for_order(db, order)
    if not delivery:
        raise HTTPException(status_code=409, detail=f"Order {req.order_ref} has not been delivered yet - the driver has not recorded this stop.")
    if delivery.outcome == "none":
        raise HTTPException(status_code=409, detail="This stop was recorded as not delivered - nothing to confirm receipt of.")
    per_order = delivered_units_by_order(db, delivery)
    delivered_for_order = per_order.get(req.order_ref, min(delivery.delivered_qty, order.order_units))
    max_allowed = min(delivered_for_order, order.order_units)
    if req.confirmed_units > max_allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Confirmed units ({req.confirmed_units}) cannot exceed the delivered/ordered amount ({max_allowed}).",
        )

    existing = db.query(ReceiptRecord).filter(
        ReceiptRecord.order_ref == req.order_ref,
        ReceiptRecord.outlet_id == req.outlet_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Receipt for order {req.order_ref} at {req.outlet_id} was already confirmed.")

    if req.confirmed_units < delivered_for_order and not req.has_issue:
        # Confirming fewer units than the driver delivered is a receipt discrepancy.
        req.has_issue = True
        req.issue_type = req.issue_type or "short"
    receipt = ReceiptRecord(
        order_ref=req.order_ref,
        outlet_id=req.outlet_id,
        delivery_record_id=req.delivery_record_id or delivery.id,
        confirmed_units=req.confirmed_units,
        has_issue=req.has_issue,
        issue_type=req.issue_type if req.has_issue else None,
        notes=req.notes,
        confirmed_by=confirmed_by or req.confirmed_by or "K. Perera (Manager)",
        confirmed_at=datetime.now(timezone.utc),
    )
    db.add(receipt)
    # Receipt is its own state, separate from the driver's delivery outcome.
    if order.status in ("delivered", "delivered_short"):
        order.status = "received"
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
    acknowledged_by: Optional[str] = None,
) -> DeferralAcknowledgement:
    ack_order = db.query(Order).filter(Order.order_ref == req.order_ref).first()
    if not ack_order or ack_order.outlet_id != req.outlet_id:
        raise HTTPException(status_code=404, detail=f"Order {req.order_ref} not found for outlet {req.outlet_id}.")
    if ack_order.status not in ("deferred", "not_delivered"):
        raise HTTPException(status_code=409, detail=f"Order {req.order_ref} is not deferred (status: {ack_order.status}).")
    already = db.query(DeferralAcknowledgement).filter(
        DeferralAcknowledgement.order_ref == req.order_ref,
        DeferralAcknowledgement.outlet_id == req.outlet_id,
    ).first()
    if already:
        return already  # idempotent
    ack = DeferralAcknowledgement(
        outlet_id=req.outlet_id,
        order_ref=req.order_ref,
        manifest_version=req.manifest_version,
        acknowledged_by=acknowledged_by or req.acknowledged_by or "Store Manager",
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
