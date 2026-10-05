"""
Tests for Supabase Storage Evidence Architecture, Private Buckets,
Signed URLs, Offline Sync, and Base64 Database Migration.
"""

import uuid
import base64
import pytest
from app.models.operations import DeliveryRecord, DriverIssue
from app.services.storage_service import storage_service
from app.core.config import settings

# Sample base64 test image payload (1x1 transparent PNG)
SAMPLE_BASE64_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
SAMPLE_BASE64_JPG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="

def test_storage_upload_and_signed_url_direct(client):
    """Test direct online upload of signature and private signed URL generation."""
    res = client.post("/api/storage/upload", json={
        "bucket": "pod-signatures",
        "identifier": "DEL-TEST-001",
        "dataPayload": SAMPLE_BASE64_PNG,
        "filenameHint": "sig_test.png",
    })
    assert res.status_code == 200
    data = res.json()
    assert "storagePath" in data
    assert data["storagePath"].startswith("pod-signatures/DEL-TEST-001_")
    assert data["storagePath"].endswith(".png")
    assert "signedUrl" in data
    assert data["signedUrl"] is not None

    # Test retrieval of signed URL via GET endpoint
    sig_res = client.get(f"/api/storage/signed-url?path={data['storagePath']}")
    assert sig_res.status_code == 200
    sig_data = sig_res.json()
    assert sig_data["storagePath"] == data["storagePath"]
    assert sig_data["signedUrl"] is not None

def test_driver_delivery_online_pod_storage_persistence(client, db_session, driver_auth, seed_active_trip):
    """
    Test that when a driver records a stop with a Base64 signature and photo,
    PostgreSQL stores ONLY the Supabase storage path reference, not raw Base64.
    """
    seed_active_trip("VEH036", ["OUT001"], ["S1-000", "S1-001"])
    delivery_id = f"DEL-TEST-POD-{uuid.uuid4().hex[:6]}"
    payload = {
        "id": delivery_id,
        "stopId": "OUT001",
        "stopName": "Colpetty Retailer",
        "vehicleId": "VEH036",
        "outcome": "full",
        "podDetails": {
            "signerName": "Store Lead",
            "hasSignature": True,
            "hasPhoto": True,
            "photoName": "goods_received.png",
            "photoUrl": SAMPLE_BASE64_PNG,
            "signatureUrl": SAMPLE_BASE64_PNG,
        },
        "status": "Synced",
        "offlineCreated": False,
        "createdAt": "2026-10-04T08:00:00Z",
    }

    res = client.post("/api/driver/deliveries", json=payload, headers=driver_auth)
    assert res.status_code == 200

    # Inspect directly in the database session
    db_rec = db_session.query(DeliveryRecord).filter(DeliveryRecord.id == delivery_id).first()
    assert db_rec is not None
    assert db_rec.pod_signer_name == "Store Lead"
    assert db_rec.pod_has_signature is True

    # Critical requirement: DB column must store ONLY the storage path reference, NOT Base64
    assert db_rec.pod_signature_url.startswith("pod-signatures/")
    assert not db_rec.pod_signature_url.startswith("data:")
    assert len(db_rec.pod_signature_url) < 200

    assert db_rec.pod_photo_url.startswith("pod-photos/")
    assert not db_rec.pod_photo_url.startswith("data:")
    assert len(db_rec.pod_photo_url) < 200

    # History API should resolve the storage path into a usable signed URL for the frontend
    hist_res = client.get("/api/driver/history?vehicle_id=VEH036", headers=driver_auth)
    assert hist_res.status_code == 200
    hist_items = hist_res.json()
    match = next((item for item in hist_items if item["id"] == delivery_id), None)
    assert match is not None
    assert match["podDetails"]["signatureUrl"] is not None
    assert match["podDetails"]["photoUrl"] is not None

def test_driver_issue_evidence_storage(client, db_session, driver_auth, seed_active_trip):
    """
    Test that road issue photo attachments are stored in driver-issue-evidence bucket
    and referenced cleanly in PostgreSQL.
    """
    seed_active_trip("VEH036", ["OUT001"], ["S1-000"], trip_id_str="S1-T001")
    issue_id = f"REP-TEST-ISSUE-{uuid.uuid4().hex[:6]}"
    payload = {
        "id": issue_id,
        "tripId": "S1-T001",
        "vehicleId": "VEH036",
        "categoryId": "access",
        "categoryLabel": "Access Blocked",
        "categoryIcon": "🚪",
        "relatedScope": "Stop 1",
        "outletName": "Colpetty Retailer",
        "description": "Street dock blocked by delivery van.",
        "photo": {
            "name": "dock_blocked.jpg",
            "url": SAMPLE_BASE64_JPG,
        },
        "status": "Synced",
        "offlineCreated": False,
        "createdAt": "2026-10-04T08:30:00Z",
    }

    res = client.post("/api/driver/issues", json=payload, headers=driver_auth)
    assert res.status_code == 200

    # Inspect in database
    db_issue = db_session.query(DriverIssue).filter(DriverIssue.id == issue_id).first()
    assert db_issue is not None
    assert db_issue.photo_url.startswith("driver-issue-evidence/")
    assert not db_issue.photo_url.startswith("data:")

    # Verify history retrieval returns signed URL
    hist_res = client.get("/api/driver/issues/history?vehicle_id=VEH036", headers=driver_auth)
    assert hist_res.status_code == 200
    hist_items = hist_res.json()
    match = next((item for item in hist_items if item["id"] == issue_id), None)
    assert match is not None
    assert match["photo"]["url"] is not None

def test_offline_sync_uploads_evidence_and_saves_references(client, db_session, driver_auth, seed_active_trip):
    """
    Test offline-first driver workflow:
    Driver records offline delivery and issue with Base64 payloads.
    When connection returns, /api/sync processes events, uploads evidence to Supabase Storage,
    saves storage paths in PostgreSQL, and marks records as Synced.
    """
    seed_active_trip("VEH036", ["OUT001", "OUT002", "OUT003"], ["S1-002", "S1-003"])
    event_id = f"evt-offline-{uuid.uuid4().hex[:8]}"
    del_id = f"DEL-OFFLINE-{uuid.uuid4().hex[:6]}"

    sync_payload = {
        "device_id": "DRIVER-DEVICE-TAB-01",
        "client_plan_version": 2,
        "events": [
            {
                "event_id": event_id,
                "event_type": "delivery.completed",
                "recorded_at": "2026-10-04T09:15:00Z",
                "payload": {
                    "id": del_id,
                    "stopId": "OUT002",
                    "stopName": "Bambalapitiya Grocers",
                    "vehicleId": "VEH036",
                    "outcome": "discrepancy",
                    "discrepancyDetails": {
                        "type": "Quantity Short",
                        "expectedQty": 56,
                        "deliveredQty": 50,
                        "notes": "6 units short delivered",
                        "photoName": "shortage_evidence.png",
                        "photoUrl": SAMPLE_BASE64_PNG,
                    },
                    "podDetails": {
                        "signerName": "Store Manager M. Perera",
                        "hasSignature": True,
                        "hasPhoto": True,
                        "signatureUrl": SAMPLE_BASE64_PNG,
                    },
                },
            }
        ],
    }

    res = client.post("/api/sync", json=sync_payload, headers=driver_auth)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["results"]) == 1
    assert data["results"][0]["status"] == "applied"

    # Verify record in DB has storage reference, not Base64
    db_rec = db_session.query(DeliveryRecord).filter(DeliveryRecord.id == del_id).first()
    assert db_rec is not None
    assert db_rec.status == "Synced"
    assert db_rec.pod_signature_url.startswith("pod-signatures/")
    assert db_rec.pod_photo_url.startswith("pod-photos/")
    assert not db_rec.pod_signature_url.startswith("data:")
    assert not db_rec.pod_photo_url.startswith("data:")

def test_offline_sync_duplicate_idempotency(client, db_session, driver_auth, seed_active_trip):
    """
    Test that replaying duplicate offline events is idempotent and does not create duplicate records.
    """
    seed_active_trip("VEH036", ["OUT001", "OUT002", "OUT003"])
    event_id = f"evt-idempotent-{uuid.uuid4().hex[:8]}"
    del_id = f"DEL-IDEM-{uuid.uuid4().hex[:6]}"

    sync_payload = {
        "device_id": "DRIVER-DEVICE-TAB-01",
        "client_plan_version": 2,
        "events": [
            {
                "event_id": event_id,
                "event_type": "delivery.completed",
                "recorded_at": "2026-10-04T09:20:00Z",
                "payload": {
                    "id": del_id,
                    "stopId": "OUT003",
                    "stopName": "Kollupitiya Super",
                    "vehicleId": "VEH036",
                    "outcome": "full",
                    "podDetails": {
                        "signerName": "Lead",
                        "hasSignature": True,
                        "signatureUrl": SAMPLE_BASE64_PNG,
                    },
                },
            }
        ],
    }

    # First attempt -> applied
    res1 = client.post("/api/sync", json=sync_payload, headers=driver_auth)
    assert res1.status_code == 200
    assert res1.json()["results"][0]["status"] == "applied"

    # Second identical attempt -> duplicate, ignored
    res2 = client.post("/api/sync", json=sync_payload, headers=driver_auth)
    assert res2.status_code == 200
    assert res2.json()["results"][0]["status"] == "duplicate"

    # Verify only 1 record exists in DB
    records = db_session.query(DeliveryRecord).filter(DeliveryRecord.id == del_id).all()
    assert len(records) == 1

def test_legacy_base64_migration(client, db_session):
    """
    Test that legacy records holding raw base64 data are migrated to Supabase Storage references.
    """
    legacy_id = f"DEL-LEGACY-{uuid.uuid4().hex[:6]}"
    legacy_rec = DeliveryRecord(
        id=legacy_id,
        vehicle_id="VEH036",
        stop_id="OUT001",
        stop_name="Colpetty Retailer",
        outcome="full",
        pod_signer_name="Legacy Signer",
        pod_has_signature=True,
        pod_signature_url=SAMPLE_BASE64_PNG, # Raw base64 string
        pod_photo_url=SAMPLE_BASE64_JPG,     # Raw base64 string
        status="Synced",
    )
    db_session.add(legacy_rec)
    db_session.commit()

    # Trigger migration
    mig_res = client.post("/api/storage/migrate-legacy-base64")
    assert mig_res.status_code == 200
    mig_data = mig_res.json()
    assert mig_data["success"] is True

    # Verify DB record is now migrated to storage references
    db_session.refresh(legacy_rec)
    assert legacy_rec.pod_signature_url.startswith("pod-signatures/")
    assert legacy_rec.pod_photo_url.startswith("pod-photos/")
    assert not legacy_rec.pod_signature_url.startswith("data:")
    assert not legacy_rec.pod_photo_url.startswith("data:")
