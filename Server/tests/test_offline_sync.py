"""Tests for Offline Idempotent Sync, UUID deduplication, and event processing."""

import uuid
from types import SimpleNamespace
from app.services.offline_sync_service import process_offline_sync
from app.schemas.sync import OfflineSyncRequest, SyncEventItem

# Duck-typed stand-in for CurrentUser - process_offline_sync only reads
# .role/.vehicle_id/.display_name, so a real AuthSession-backed instance
# isn't needed to exercise the service function directly.
DRIVER_USER = SimpleNamespace(
    user_id="usr-003", username="sunil", role="driver",
    display_name="Sunil Bandara", outlet_id=None, vehicle_id="VEH036",
)

def test_offline_sync_idempotency(db_session, seed_active_trip):
    seed_active_trip("VEH036", ["OUT001", "OUT002", "OUT003", "OUT004"])
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
                    "vehicleId": "VEH036",
                    "arrivedAt": "2026-10-04T09:00:00Z",
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
    res1 = process_offline_sync(db_session, req, DRIVER_USER)
    assert res1.success is True
    assert len(res1.results) == 1
    assert res1.results[0].status == "applied"

    # 2. Duplicate sync submission with same event UUID -> should return duplicate without re-applying
    res2 = process_offline_sync(db_session, req, DRIVER_USER)
    assert res2.success is True
    assert len(res2.results) == 1
    assert res2.results[0].status == "duplicate"

def test_offline_sync_rejects_foreign_vehicle(db_session, seed_active_trip):
    """A driver must never be able to sync a delivery claiming a vehicle that
    isn't their own, even if the vehicle itself has a real active trip."""
    seed_active_trip("VEH036", ["OUT001"])
    seed_active_trip("VEH037", ["OUT002"])
    req = OfflineSyncRequest(
        device_id="MOBILE-DEVICE-01",
        events=[SyncEventItem(
            event_id=str(uuid.uuid4()),
            event_type="delivery.completed",
            payload={"id": "DEL-FOREIGN", "stopId": "OUT002", "stopName": "Bambalapitiya", "vehicleId": "VEH037", "outcome": "full"},
            recorded_at="2026-10-02T11:00:00Z",
        )],
    )
    res = process_offline_sync(db_session, req, DRIVER_USER)  # DRIVER_USER's own vehicle is VEH036
    assert res.success is False
    assert res.results[0].status == "rejected"
    assert "own assigned vehicle" in res.results[0].message

def test_offline_sync_rejects_foreign_stop(db_session, seed_active_trip):
    """A driver must never be able to record a delivery against a stop that
    isn't part of their own assigned trip."""
    seed_active_trip("VEH036", ["OUT001", "OUT002"])
    req = OfflineSyncRequest(
        device_id="MOBILE-DEVICE-01",
        events=[SyncEventItem(
            event_id=str(uuid.uuid4()),
            event_type="delivery.completed",
            payload={"id": "DEL-FOREIGN-STOP", "stopId": "OUT999", "stopName": "Unrelated Outlet", "vehicleId": "VEH036", "outcome": "full"},
            recorded_at="2026-10-02T11:00:00Z",
        )],
    )
    res = process_offline_sync(db_session, req, DRIVER_USER)
    assert res.success is False
    assert res.results[0].status == "rejected"
    assert "not part of your assigned trip" in res.results[0].message

def test_offline_sync_rejects_wrong_role(db_session, seed_active_trip):
    """A loader-role caller must never be able to submit a driver delivery
    event through the shared offline sync endpoint."""
    seed_active_trip("VEH036", ["OUT001"])
    loader_user = SimpleNamespace(
        user_id="usr-002", username="rizwan", role="loader",
        display_name="Rizwan Farook", outlet_id=None, vehicle_id=None,
    )
    req = OfflineSyncRequest(
        device_id="MOBILE-DEVICE-01",
        events=[SyncEventItem(
            event_id=str(uuid.uuid4()),
            event_type="delivery.completed",
            payload={"id": "DEL-WRONG-ROLE", "stopId": "OUT001", "stopName": "Colpetty", "vehicleId": "VEH036", "outcome": "full"},
            recorded_at="2026-10-02T11:00:00Z",
        )],
    )
    res = process_offline_sync(db_session, req, loader_user)
    assert res.success is False
    assert res.results[0].status == "rejected"
    assert "driver role" in res.results[0].message

def test_offline_sync_rejects_driver_acknowledging_manifest(db_session, seed_active_trip):
    """A driver-role caller must never be able to acknowledge a manifest -
    that is exclusively the loader's action."""
    seed_active_trip("VEH036", ["OUT001"])
    req = OfflineSyncRequest(
        device_id="MOBILE-DEVICE-01",
        events=[SyncEventItem(
            event_id=str(uuid.uuid4()),
            event_type="manifest.ack",
            payload={"version": 1},
            recorded_at="2026-10-02T11:00:00Z",
        )],
    )
    res = process_offline_sync(db_session, req, DRIVER_USER)
    assert res.success is False
    assert res.results[0].status == "rejected"
    assert "loader role" in res.results[0].message
