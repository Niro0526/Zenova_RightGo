"""Tests for Store Manager replenishment orders, cancellations, receipts, and deferrals."""

import pytest
from fastapi import HTTPException
from app.models.operations import DeliveryRecord
from app.services.store_manager_service import (
    place_store_order,
    cancel_store_order,
    confirm_store_receipt,
    acknowledge_deferral,
)
from app.schemas.order import CreateOrderRequest, CancelOrderRequest
from app.schemas.store_manager import ReceiptConfirmRequest, DeferralAckRequest

def test_store_manager_flow(db_session):
    # 1. Place replenishment order
    order = place_store_order(
        db_session,
        CreateOrderRequest(
            outlet_id="OUT001",
            brand="Fresh",
            units=50,
            notes="Weekend inventory replenishment",
            placed_by="Kavitha",
        )
    )
    assert order.order_ref.startswith("ORD-")
    assert order.order_units == 50
    assert order.status == "awaiting_planning"

    # 2. Cancel order
    cancelled = cancel_store_order(
        db_session,
        order.order_ref,
        CancelOrderRequest(reason="Adjusted forecast demand", cancelled_by="Kavitha"),
    )
    assert cancelled.status == "cancelled"

    # 3. Confirm receipt - requires a real recorded delivery at the outlet first
    db_session.add(DeliveryRecord(
        id="DEL-TEST-S1-000",
        vehicle_id="VEH036",
        stop_id="OUT001",
        stop_name="OUT001 Outlet",
        outcome="full",
        delivered_qty=999,
    ))
    db_session.commit()

    rcp = confirm_store_receipt(
        db_session,
        ReceiptConfirmRequest(
            order_ref="S1-000",
            outlet_id="OUT001",
            confirmed_units=12,
            has_issue=False,
            notes="All 12 crates received in good condition",
            confirmed_by="Kavitha",
        )
    )
    assert rcp.confirmed_units == 12
    assert rcp.has_issue is False

    # 4. Acknowledge deferral
    ack = acknowledge_deferral(
        db_session,
        DeferralAckRequest(
            outlet_id="OUT001",
            order_ref="S1-000",
            manifest_version=1,
            notes="Understood deferral due to warehouse capacity limit",
            acknowledged_by="Kavitha",
        )
    )
    assert ack.id is not None

def test_confirm_receipt_rejects_order_from_wrong_outlet(db_session):
    """S1-000 belongs to OUT001 - confirming it against OUT002 must be rejected,
    not silently recorded against the wrong outlet."""
    db_session.add(DeliveryRecord(
        id="DEL-TEST-WRONG-OUTLET", vehicle_id="VEH036", stop_id="OUT002",
        stop_name="OUT002 Outlet", outcome="full", delivered_qty=999,
    ))
    db_session.commit()
    with pytest.raises(HTTPException) as exc:
        confirm_store_receipt(
            db_session,
            ReceiptConfirmRequest(order_ref="S1-000", outlet_id="OUT002", confirmed_units=5),
        )
    assert exc.value.status_code == 403

def test_confirm_receipt_rejects_quantity_exceeding_delivered(db_session):
    """Confirming more units than were actually delivered must be rejected."""
    db_session.add(DeliveryRecord(
        id="DEL-TEST-UNDERDELIVER", vehicle_id="VEH036", stop_id="OUT003",
        stop_name="OUT003 Outlet", outcome="discrepancy", delivered_qty=2,
    ))
    db_session.commit()
    with pytest.raises(HTTPException) as exc:
        confirm_store_receipt(
            db_session,
            ReceiptConfirmRequest(order_ref="S1-004", outlet_id="OUT003", confirmed_units=50),
        )
    assert exc.value.status_code == 400

def test_confirm_receipt_rejects_duplicate(db_session):
    """The same order/outlet receipt cannot be confirmed twice."""
    db_session.add(DeliveryRecord(
        id="DEL-TEST-DUP", vehicle_id="VEH036", stop_id="OUT004",
        stop_name="OUT004 Outlet", outcome="full", delivered_qty=999,
    ))
    db_session.commit()
    confirm_store_receipt(db_session, ReceiptConfirmRequest(order_ref="S1-006", outlet_id="OUT004", confirmed_units=3))
    with pytest.raises(HTTPException) as exc:
        confirm_store_receipt(db_session, ReceiptConfirmRequest(order_ref="S1-006", outlet_id="OUT004", confirmed_units=3))
    assert exc.value.status_code == 409
