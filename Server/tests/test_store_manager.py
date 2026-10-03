"""Tests for Store Manager replenishment orders, cancellations, receipts, and deferrals."""

import pytest
from fastapi import HTTPException
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

    # 3. Confirm receipt
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
