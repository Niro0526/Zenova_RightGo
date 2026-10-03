"""Notification schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class NotificationResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    target_role: str
    target_user: Optional[str] = None
    target_outlet_id: Optional[str] = None
    kind: str
    title: str
    text: str
    link: Optional[str] = None
    plan_version: Optional[int] = None
    is_read: bool
    created_at: datetime
