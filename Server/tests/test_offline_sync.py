"""Tests for Offline Idempotent Sync, UUID deduplication, and event processing."""

import uuid
from app.services.offline_sync_service import process_offline_sync
from app.schemas.sync import OfflineSyncRequest, SyncEventItem

def test_offline_sync_idempotency(db_session):
    event_uuid = str(uuid.uuid4())
    req = OfflineSyncRequest(
        device_id="MOBILE-DEVICE-01",
        events=[
            SyncEventItem(
                event_id=event_uuid,
                event_type="delivery.completed",
                payload={
                    "id": f"DEL-OFFLINE-{event_uuid[:8]}",
                    "stopId": "OUT001",
                    "stopName": "Colpetty Retailer",
                    "vehicleId": "PEL-R04",
                    "outcome": "full",
                    "podDetails": {
                        "signerName": "K. Perera",
                        "hasSignature": True,
                    },
                },
                recorded_at="2026-10-02T11:00:00Z",
            )
        ],
        client_plan_version=1,
    )

    # 1. First sync submission -> should be applied
    res1 = process_offline_sync(db_session, req)
    assert res1.success is True
    assert len(res1.results) == 1
    assert res1.results[0].status == "applied"

    # 2. Duplicate sync submission with same event UUID -> should return duplicate without re-applying
    res2 = process_offline_sync(db_session, req)
    assert res2.success is True
    assert len(res2.results) == 1
    assert res2.results[0].status == "duplicate"
