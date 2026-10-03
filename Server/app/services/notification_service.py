"""Notification and Alerting service."""

from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.memory import Notification
from app.schemas.notification import NotificationResponseSchema

def create_notification(
    db: Session,
    target_role: str,
    kind: str,
    title: str,
    text: str,
    target_user: Optional[str] = None,
    target_outlet_id: Optional[str] = None,
    link: Optional[str] = None,
    plan_version: Optional[int] = None,
) -> Notification:
    notif = Notification(
        target_role=target_role,
        target_user=target_user,
        target_outlet_id=target_outlet_id,
        kind=kind,
        title=title,
        text=text,
        link=link,
        plan_version=plan_version,
        is_read=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

def list_notifications_for_role(
    db: Session,
    role: str,
    username: Optional[str] = None,
    outlet_id: Optional[str] = None,
    limit: int = 50,
) -> List[Notification]:
    query = db.query(Notification).filter(
        (Notification.target_role == role) | (Notification.target_role == "all")
    )
    if username:
        query = query.filter((Notification.target_user == username) | (Notification.target_user == None))
    if outlet_id:
        query = query.filter((Notification.target_outlet_id == outlet_id) | (Notification.target_outlet_id == None))
    return query.order_by(Notification.created_at.desc()).limit(limit).all()
