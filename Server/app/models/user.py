"""User database model."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from app.database.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(64), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(32), nullable=False, index=True) # dispatcher, loader, driver, store_manager
    display_name = Column(String(128), nullable=False)
    outlet_id = Column(String(32), nullable=True) # For store_manager
    vehicle_id = Column(String(32), nullable=True) # For driver
    phone = Column(String(32), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
