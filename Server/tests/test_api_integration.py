"""Full end-to-end FastAPI integration tests across all roles."""

def test_api_e2e_flow(client):
    # 1. Health check
    res_health = client.get("/api/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] in ("ok", "degraded")

    # 2. Login as Dispatcher
    res_login = client.post("/api/auth/login", json={"username": "dilani", "password": "password123"})
    assert res_login.status_code == 200
    assert res_login.json()["role"] == "dispatcher"

    # 3. Fetch reference outlets & vehicles
    res_outlets = client.get("/api/reference/outlets")
    assert res_outlets.status_code == 200
    assert len(res_outlets.json()) > 0

    res_veh = client.get("/api/reference/vehicles")
    assert res_veh.status_code == 200
    assert len(res_veh.json()) > 0

    # 4. Dispatcher: Get Draft & Suggest Plan
    res_draft = client.get("/api/plan/draft?scenario=S1")
    assert res_draft.status_code == 200

    res_suggest = client.post("/api/plan/suggest?scenario=S1")
    assert res_suggest.status_code == 200
    suggest_data = res_suggest.json()
    rev = suggest_data["draftRevision"]

    # 5. Dispatcher: Validate Plan
    res_val = client.get("/api/plan/validate?scenario=S1")
    assert res_val.status_code == 200
    assert "checklist" in res_val.json()

    # 6. Dispatcher: Publish Plan
    res_pub = client.post("/api/plan/publish?scenario=S1", json={
        "expected_revision": rev,
        "shortfall_policy": "ship_good_tell_store",
        "decision_maker": "Dilani (Lead Dispatcher)",
    })
    assert res_pub.status_code == 200
    manifest_data = res_pub.json()
    assert manifest_data["version"] == 1

    # 7. Loader: View Manifest & Acknowledge
    res_latest = client.get("/api/manifests/latest?scenario=S1")
    assert res_latest.status_code == 200
    assert res_latest.json()["version"] == 1

    res_ack = client.post("/api/manifests/1/ack", json={"acknowledged_by": "Rizwan (Loader)"})
    assert res_ack.status_code == 200
    assert res_ack.json()["acknowledgement"] == "acknowledged"

    # 8. Driver: Check My Run & OTP Verify
    res_run = client.get("/api/driver/my-run")
    assert res_run.status_code == 200
    run_info = res_run.json()
    assert run_info["hasRun"] is True
    trip_id = run_info["tripId"]
    vehicle_id = run_info["vehicleId"]

    # In-app demo OTP verify
    # Fetch trip readiness to get demo OTP
    res_readiness = client.get(f"/api/trips/1/readiness")
    otp_code = res_readiness.json().get("otpCode")

    if otp_code:
        res_otp = client.post("/api/driver/otp/verify", json={
            "trip_id": trip_id,
            "vehicle_id": vehicle_id,
            "otp_code": otp_code,
        })
        assert res_otp.status_code == 200
        assert res_otp.json()["unlocked"] is True

    # 9. Offline Sync Submission
    res_sync = client.post("/api/sync", json={
        "device_id": "DRIVER-DEVICE-01",
        "events": [
            {
                "event_id": "99999999-0000-0000-0000-000000000001",
                "event_type": "delivery.completed",
                "payload": {
                    "id": "DEL-E2E-001",
                    "stopId": "OUT001",
                    "stopName": "Colpetty Retailer",
                    "vehicleId": vehicle_id,
                    "outcome": "full",
                    "podDetails": {
                        "signerName": "K. Perera",
                        "hasSignature": True,
                    },
                },
                "recorded_at": "2026-10-02T12:00:00Z",
            }
        ],
        "client_plan_version": 1,
    })
    assert res_sync.status_code == 200
    assert res_sync.json()["success"] is True

    # 10. Audit Ledger
    res_ledger = client.get("/api/ledger")
    assert res_ledger.status_code == 200
    assert len(res_ledger.json()) > 0

    # 11. Notifications
    res_notif = client.get("/api/notifications?role=dispatcher")
    assert res_notif.status_code == 200
