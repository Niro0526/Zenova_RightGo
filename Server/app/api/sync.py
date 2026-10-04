"""Offline synchronization API endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.deps import require_role, CurrentUser
from app.schemas.sync import OfflineSyncRequest, OfflineSyncResponse
from app.services.offline_sync_service import process_offline_sync

router = APIRouter(prefix="/sync", tags=["Offline Sync"])

@router.post("", response_model=OfflineSyncResponse)
def sync_offline_events(
    req: OfflineSyncRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("driver", "loader")),
):
    """Idempotently process queued offline events from field client - every
    event is additionally checked against the caller's own role/vehicle/trip
    inside process_offline_sync, never trusted from the payload alone."""
    return process_offline_sync(db, req, user)
