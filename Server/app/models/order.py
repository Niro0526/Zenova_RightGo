"""Order database model."""

from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, Text, DateTime, ForeignKey
from app.database.base import Base

class Order(Base):
    __tablename__ = "orders"

    order_ref = Column(String(64), primary_key=True) # e.g. S1-000 or ORD-2026-001
    delivery_id = Column(String(64), unique=True, nullable=True, index=True)
    scenario = Column(String(32), nullable=False, default="S1", index=True)
    outlet_id = Column(String(32), ForeignKey("outlets.outlet_id"), nullable=False, index=True)
    brand = Column(String(32), nullable=False, index=True) # Fresh, Style, Tech
    district = Column(String(64), nullable=False)
    depot = Column(String(64), nullable=False)
    dock_type = Column(String(32), nullable=False)
    parking_constraint = Column(String(32), nullable=False)
    mall_window = Column(String(32), nullable=True)
    window_open_time = Column(String(16), nullable=False)
    window_close_time = Column(String(16), nullable=False)
    temp_requirement = Column(String(32), nullable=False) # ambient, chilled
    order_units = Column(Integer, nullable=False)
    order_weight_kg = Column(Float, nullable=False)
    order_volume_m3 = Column(Float, nullable=False)
    deferred_yesterday = Column(Boolean, default=False, nullable=False)
    days_since_last_served = Column(Integer, default=1, nullable=False)
    status = Column(String(32), default="awaiting_planning", nullable=False, index=True)
    placed_by = Column(String(128), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
