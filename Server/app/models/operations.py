"""Operational execution models (Loading Issues, Driver Issues, Deliveries, Receipts)."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, Text, DateTime, ForeignKey, JSON
from app.database.base import Base

class LoadingIssue(Base):
    __tablename__ = "loading_issues"

    id = Column(String(64), primary_key=True, default=lambda: f"LI-{uuid.uuid4().hex[:8].upper()}")
    manifest_version = Column(Integer, nullable=False, index=True)
    vehicle_id = Column(String(32), nullable=False, index=True)
    trip_no = Column(Integer, nullable=False)
    order_ref = Column(String(64), ForeignKey("orders.order_ref"), nullable=False, index=True)
    outlet_id = Column(String(32), nullable=False)
    issue_type = Column(String(32), nullable=False) # missing, damaged, short, vehicle_problem
    units_affected = Column(Integer, default=0, nullable=False)
    status = Column(String(32), default="open", nullable=False) # open, escalated, resolved, undone
    action_taken = Column(String(64), nullable=True) # replace_from_stock, send_to_dispatcher, apply_policy, undo
    notes = Column(Text, nullable=True)
    reported_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    reported_by = Column(String(128), default="Rizwan (Loader)", nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(String(128), nullable=True)

class DriverIssue(Base):
    __tablename__ = "driver_issues"

    id = Column(String(64), primary_key=True) # e.g. "REP-S1-T001-001" or UUID
    trip_id = Column(String(64), nullable=False, index=True)
    vehicle_id = Column(String(32), nullable=False, index=True)
    stop_code = Column(String(32), nullable=True) # outlet_id
    order_ref = Column(String(64), nullable=True)
    outlet_name = Column(String(128), nullable=False)
    category_id = Column(String(64), nullable=False)
    category_label = Column(String(128), nullable=False)
    category_icon = Column(String(64), default="AlertTriangle", nullable=False)
    categories = Column(JSON, nullable=True)
    related_scope = Column(String(64), default="stop", nullable=False)
    description = Column(Text, nullable=False)
    photo_name = Column(String(128), nullable=True)
    photo_url = Column(Text, nullable=True)
    status = Column(String(32), default="Synced", nullable=False) # Pending Sync, Syncing, Synced
    offline_created = Column(Boolean, default=False, nullable=False)
    recorded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    synced_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    source_device_id = Column(String(64), nullable=True)

class DeliveryRecord(Base):
    __tablename__ = "delivery_records"

    id = Column(String(64), primary_key=True) # e.g. "DEL-S1-T001-001" or UUID
    manifest_version = Column(Integer, nullable=True, index=True)
    trip_id = Column(String(64), nullable=True, index=True)
    vehicle_id = Column(String(32), nullable=False)
    stop_id = Column(String(32), nullable=False, index=True) # outlet_id
    stop_name = Column(String(128), nullable=False)
    outcome = Column(String(32), nullable=False) # full, discrepancy, none
    expected_qty = Column(Integer, default=0, nullable=False)
    delivered_qty = Column(Integer, default=0, nullable=False)
    discrepancy_type = Column(String(64), nullable=True)
    discrepancy_notes = Column(Text, nullable=True)
    not_delivered_reason = Column(String(64), nullable=True)
    not_delivered_notes = Column(Text, nullable=True)
    pod_photo_name = Column(String(128), nullable=True)
    pod_photo_url = Column(Text, nullable=True)
    pod_signer_name = Column(String(128), nullable=True)
    pod_has_signature = Column(Boolean, default=False, nullable=False)
    pod_signature_url = Column(Text, nullable=True)
    status = Column(String(32), default="Synced", nullable=False) # Pending Sync, Syncing, Synced
    offline_created = Column(Boolean, default=False, nullable=False)
    recorded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    synced_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    source_device_id = Column(String(64), nullable=True)

class ReceiptRecord(Base):
    __tablename__ = "receipt_records"

    id = Column(String(64), primary_key=True, default=lambda: f"RCP-{uuid.uuid4().hex[:8].upper()}")
    order_ref = Column(String(64), ForeignKey("orders.order_ref"), nullable=False, index=True)
    outlet_id = Column(String(32), ForeignKey("outlets.outlet_id"), nullable=False, index=True)
    delivery_record_id = Column(String(64), nullable=True)
    confirmed_units = Column(Integer, nullable=False)
    has_issue = Column(Boolean, default=False, nullable=False)
    issue_type = Column(String(32), nullable=True) # short, damaged, temperature, late
    notes = Column(Text, nullable=True)
    confirmed_by = Column(String(128), nullable=False)
    confirmed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
