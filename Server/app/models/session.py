"""Server-side auth session model - the token issued by /auth/login is looked
up here on every subsequent request, instead of being trusted unverified."""

from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from app.database.base import Base

class AuthSession(Base):
    __tablename__ = "auth_sessions"

    token = Column(String(128), primary_key=True)
    user_id = Column(String(36), nullable=False, index=True)
    username = Column(String(64), nullable=False)
    role = Column(String(32), nullable=False, index=True)  # dispatcher, loader, driver, store_manager
    display_name = Column(String(128), nullable=False)
    outlet_id = Column(String(32), nullable=True)  # store_manager's own outlet
    vehicle_id = Column(String(32), nullable=True)  # driver's own vehicle
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
