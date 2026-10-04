"""Notifications API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.deps import get_current_user, CurrentUser
from app.models.memory import Notification
from app.schemas.notification import NotificationResponseSchema
from app.services.notification_service import list_notifications_for_role

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponseSchema])
def get_notifications(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """List notifications for the authenticated user's own role/identity -
    never a client-supplied role, which would otherwise let any caller read
    another role's notifications."""
    return list_notifications_for_role(db, role=user.role, username=user.username, outlet_id=user.outlet_id)

@router.post("/{notification_id}/read")
def mark_read(notification_id: str, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    """Mark notification as read."""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"success": True}
