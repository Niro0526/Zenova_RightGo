"""Notifications API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.memory import Notification
from app.schemas.notification import NotificationResponseSchema
from app.services.notification_service import list_notifications_for_role

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponseSchema])
def get_notifications(
    role: str = "dispatcher",
    username: Optional[str] = None,
    outlet_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List role-specific notifications, newest first."""
    return list_notifications_for_role(db, role=role, username=username, outlet_id=outlet_id)

@router.post("/{notification_id}/read")
def mark_read(notification_id: str, db: Session = Depends(get_db)):
    """Mark notification as read."""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"success": True}
