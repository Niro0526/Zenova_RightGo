"""Offline synchronization schemas."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class SyncEventItem(BaseModel):
    event_id: str # UUID
    event_type: str # delivery.completed, driver_issue.reported, manifest.ack, etc.
    payload: Dict[str, Any]
    recorded_at: str # ISO string device timestamp
    device_id: Optional[str] = None

class OfflineSyncRequest(BaseModel):
    device_id: str
    events: List[SyncEventItem]
    client_plan_version: Optional[int] = None

class EventSyncResult(BaseModel):
    event_id: str
    status: str # applied, duplicate, rejected
    message: Optional[str] = None
    remote_id: Optional[str] = None
    code: Optional[str] = None          # machine-readable reason when rejected
    retryable: Optional[bool] = None    # True: may succeed later (retry); False: permanent, needs attention

class OfflineSyncResponse(BaseModel):
    success: bool
    results: List[EventSyncResult]
    synced_at: str
    current_plan_version: int
    pending_plan_review: bool
