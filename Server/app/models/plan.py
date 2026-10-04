"""Planning and Released Manifest domain models."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, Text, DateTime, ForeignKey, JSON, UniqueConstraint
from app.database.base import Base

class DraftPlan(Base):
    __tablename__ = "draft_plans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scenario = Column(String(32), nullable=False, default="S1", unique=True)
    draft_revision = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_by = Column(String(128), default="Sarah Jenkins", nullable=False)

class DraftAssignment(Base):
    __tablename__ = "draft_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scenario = Column(String(32), nullable=False, default="S1", index=True)
    order_ref = Column(String(64), ForeignKey("orders.order_ref"), nullable=False, index=True)
    decision = Column(String(32), default="unresolved", nullable=False) # unresolved, served, deferred
    vehicle_id = Column(String(32), nullable=True)
    trip_no = Column(Integer, nullable=True) # 1 or 2
    reason_code = Column(String(64), nullable=True) # capacity, vehicle_unavailable, etc.
    reason_note = Column(Text, nullable=True)
    locked = Column(Boolean, default=False, nullable=False) # manual decision - greedy re-suggest must not overwrite

class DraftStopSequence(Base):
    __tablename__ = "draft_stop_sequences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scenario = Column(String(32), nullable=False, default="S1", index=True)
    vehicle_id = Column(String(32), nullable=False)
    trip_no = Column(Integer, nullable=False)
    stop_outlet_ids = Column(JSON, default=list, nullable=False) # Ordered list of outletId strings
    locked = Column(Boolean, default=False, nullable=False) # manual stop order - greedy re-suggest must not overwrite

class DraftTripMeta(Base):
    __tablename__ = "draft_trip_meta"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scenario = Column(String(32), nullable=False, default="S1", index=True)
    vehicle_id = Column(String(32), nullable=False)
    trip_no = Column(Integer, nullable=False)
    planned_departure_time = Column(String(16), nullable=True) # e.g. "03:30"
    locked = Column(Boolean, default=False, nullable=False) # manual departure - greedy re-suggest must not overwrite

class DraftVehicleFuelInput(Base):
    __tablename__ = "draft_vehicle_fuel_inputs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scenario = Column(String(32), nullable=False, default="S1", index=True)
    vehicle_id = Column(String(32), nullable=False)
    prior_weekly_fuel_usage_l = Column(Float, nullable=True) # null = unconfirmed
    locked = Column(Boolean, default=False, nullable=False) # dispatcher-confirmed - greedy re-suggest must not overwrite

class ReleasedManifest(Base):
    __tablename__ = "released_manifests"
    __table_args__ = (UniqueConstraint("scenario", "version", name="uq_released_manifest_scenario_version"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    version = Column(Integer, nullable=False, index=True) # 1, 2, 3...
    scenario = Column(String(32), nullable=False, default="S1", index=True)
    published_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    published_at_str = Column(String(16), nullable=False) # "03:15"
    decision_maker = Column(String(128), default="Sarah Jenkins", nullable=False)
    shortfall_policy = Column(String(64), default="ship_good_tell_store", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    acknowledgement = Column(String(32), default="pending", nullable=False) # pending, acknowledged
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_by = Column(String(128), nullable=True)

class ReleasedTrip(Base):
    __tablename__ = "released_trips"

    id = Column(Integer, primary_key=True, autoincrement=True)
    manifest_id = Column(Integer, ForeignKey("released_manifests.id"), nullable=False, index=True)
    manifest_version = Column(Integer, nullable=False, index=True)
    scenario = Column(String(32), default="S1", nullable=False)
    vehicle_id = Column(String(32), nullable=False, index=True)
    trip_no = Column(Integer, nullable=False)
    trip_id_str = Column(String(64), nullable=False, index=True) # e.g. "S1-T001" or "VEH036-1"
    brand = Column(String(32), nullable=False)
    district = Column(String(64), nullable=False)
    depot = Column(String(64), nullable=False)
    planned_departure_time = Column(String(16), nullable=True)
    leave_by_time = Column(String(16), nullable=True)
    stop_outlet_ids = Column(JSON, default=list, nullable=False) # Physical stop sequence
    order_refs = Column(JSON, default=list, nullable=False) # All order refs in trip
    loading_status = Column(String(32), default="planned", nullable=False) # planned, loading, ready, departed, completed
    otp_code = Column(String(16), nullable=True)
    otp_attempts = Column(Integer, default=0, nullable=False)
    otp_unlocked = Column(Boolean, default=False, nullable=False)
    otp_unlocked_at = Column(DateTime(timezone=True), nullable=True)
    departed_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

class OrderLoadingState(Base):
    __tablename__ = "order_loading_states"

    id = Column(Integer, primary_key=True, autoincrement=True)
    manifest_version = Column(Integer, nullable=False, index=True)
    released_trip_id = Column(Integer, ForeignKey("released_trips.id"), nullable=False, index=True)
    order_ref = Column(String(64), ForeignKey("orders.order_ref"), nullable=False, index=True)
    planned_units = Column(Integer, nullable=False)
    loaded_units = Column(Integer, default=0, nullable=False)
    effective_units = Column(Integer, nullable=False)
    is_loaded = Column(Boolean, default=False, nullable=False)
    loaded_at = Column(DateTime(timezone=True), nullable=True)
