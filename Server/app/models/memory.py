"""Audit ledger, notifications, deferral memory, and offline event idempotency models."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey, JSON
from app.database.base import Base

class DeferralMemory(Base):
    __tablename__ = "deferral_memory"

    outlet_id = Column(String(32), primary_key=True)
    consecutive_skips = Column(Integer, default=0, nullable=False)
    last_deferred_scenario = Column(String(32), nullable=True)
    last_reason_code = Column(String(64), nullable=True)
    last_reason_note = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

class DeferralAcknowledgement(Base):
    __tablename__ = "deferral_acknowledgements"

    id = Column(String(64), primary_key=True, default=lambda: f"DA-{uuid.uuid4().hex[:8].upper()}")
    outlet_id = Column(String(32), nullable=False, index=True)
    order_ref = Column(String(64), nullable=False, index=True)
    manifest_version = Column(Integer, nullable=False)
    acknowledged_by = Column(String(128), nullable=False)
    acknowledged_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    notes = Column(Text, nullable=True)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(64), primary_key=True, default=lambda: f"NOTIF-{uuid.uuid4().hex[:8].upper()}")
    target_role = Column(String(32), nullable=False, index=True) # dispatcher, loader, driver, store_manager, all
    target_user = Column(String(128), nullable=True, index=True)
    target_outlet_id = Column(String(32), nullable=True, index=True)
    kind = Column(String(64), nullable=False)
    title = Column(String(128), nullable=False)
    text = Column(Text, nullable=False)
    link = Column(String(256), nullable=True)
    plan_version = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id = Column(String(64), primary_key=True, default=lambda: f"LEDGER-{uuid.uuid4().hex[:12].upper()}")
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    action = Column(String(64), nullable=False, index=True)
    actor = Column(String(128), default="Sarah Jenkins", nullable=False)
    order_ref = Column(String(64), nullable=True, index=True)
    outlet_id = Column(String(64), nullable=True, index=True)
    vehicle_id = Column(String(32), nullable=True)
    trip_no = Column(Integer, nullable=True)
    reason_code = Column(String(64), nullable=True)
    reason_note = Column(Text, nullable=True)
    previous_state = Column(Text, nullable=True)
    updated_state = Column(Text, nullable=True)
    plan_version = Column(Integer, nullable=True)

class OfflineProcessedEvent(Base):
    __tablename__ = "offline_processed_events"

    event_id = Column(String(64), primary_key=True) # Unique event UUID
    event_type = Column(String(64), nullable=False, index=True)
    device_id = Column(String(64), nullable=True)
    recorded_at = Column(DateTime(timezone=True), nullable=False)
    synced_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    status = Column(String(32), default="applied", nullable=False) # applied, duplicate, rejected
    error_message = Column(Text, nullable=True)
    payload_json = Column(JSON, nullable=True)
