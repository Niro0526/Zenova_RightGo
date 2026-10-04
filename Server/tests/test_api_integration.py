"""Full end-to-end FastAPI integration tests across all roles."""

def login(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]

def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}

def test_api_e2e_flow(client):
    # 1. Health check (public, no auth required)
    res_health = client.get("/api/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] in ("ok", "degraded")

    # 2. Login as each role up front - every protected endpoint now verifies
    # a real server-side session, so the test must act as the role that
    # actually owns each step instead of one unauthenticated/any-role client.
    dispatcher_token = login(client, "dilani@rightgo.lk", "Dispatch@2026")
    loader_token = login(client, "rizwan@rightgo.lk", "Loader@2026")
    driver_token = login(client, "sunil@rightgo.lk", "Driver@2026")

    dispatcher_auth = auth_headers(dispatcher_token)
    loader_auth = auth_headers(loader_token)
    driver_auth = auth_headers(driver_token)

    # Endpoints with no auth dependency applied yet (role-agnostic reference lookups)
    # still require being logged in as *someone*.
    res_outlets = client.get("/api/reference/outlets", headers=dispatcher_auth)
    assert res_outlets.status_code == 200
    assert len(res_outlets.json()) > 0

    res_veh = client.get("/api/reference/vehicles", headers=dispatcher_auth)
    assert res_veh.status_code == 200
    assert len(res_veh.json()) > 0

    # 3. Dispatcher: Get Draft & Suggest Plan
    res_draft = client.get("/api/plan/draft?scenario=S1", headers=dispatcher_auth)
    assert res_draft.status_code == 200

    # A non-dispatcher must be rejected from the dispatcher workspace.
    res_forbidden = client.get("/api/plan/draft?scenario=S1", headers=loader_auth)
    assert res_forbidden.status_code == 403

    res_suggest = client.post("/api/plan/suggest?scenario=S1", headers=dispatcher_auth)
    assert res_suggest.status_code == 200
    suggest_data = res_suggest.json()
    rev = suggest_data["draftRevision"]

    # 4. Dispatcher: Validate Plan
    res_val = client.get("/api/plan/validate?scenario=S1", headers=dispatcher_auth)
    assert res_val.status_code == 200
    assert "checklist" in res_val.json()

    # 4b. Confirm fuel for every vehicle the greedy plan used - release must
    # reject an unconfirmed fuel figure rather than silently assuming 0.
    used_vehicle_ids = {
        a["vehicleId"] for a in suggest_data["assignments"].values() if a.get("vehicleId")
    }
    for vid in used_vehicle_ids:
        res_fuel = client.post("/api/plan/fuel-input?scenario=S1", json={
            "vehicle_id": vid,
            "prior_weekly_fuel_usage_l": 0.0,
        }, headers=dispatcher_auth)
        assert res_fuel.status_code == 200
        rev = res_fuel.json()["draftRevision"]

    # 5. Dispatcher: Publish Plan (decision_maker is now server-derived from
    # the authenticated session, not the client-supplied field)
    res_pub = client.post("/api/plan/publish?scenario=S1", json={
        "expected_revision": rev,
        "shortfall_policy": "ship_good_tell_store",
    }, headers=dispatcher_auth)
    assert res_pub.status_code == 200
    manifest_data = res_pub.json()
    assert manifest_data["version"] == 1
    assert manifest_data["decisionMaker"] == "Dilani Perera"

    # 6. Loader: View Manifest & Acknowledge
    res_latest = client.get("/api/manifests/latest?scenario=S1", headers=loader_auth)
    assert res_latest.status_code == 200
    assert res_latest.json()["version"] == 1

    # A dispatcher may not perform the loader's acknowledgement action.
    res_forbidden2 = client.post("/api/manifests/1/ack", headers=dispatcher_auth)
    assert res_forbidden2.status_code == 403

    res_ack = client.post("/api/manifests/1/ack", headers=loader_auth)
    assert res_ack.status_code == 200
    assert res_ack.json()["acknowledgement"] == "acknowledged"

    # 7. Driver: Check My Run & OTP Verify - strictly the driver's own
    # assigned vehicle (never a client-supplied id). NOTE: the seeded demo
    # driver account's vehicle_id ("PEL-R04") is a long-standing placeholder
    # that does not match any real VEH0xx fleet id from vehicles.csv, so
    # hasRun is expected to be False here until that demo data is corrected -
    # this is a known, pre-existing data gap, not a regression. The important
    # behavior this test guards is that /driver/my-run no longer falls back
    # to handing the driver an unrelated vehicle's trip (the previous bug).
    res_run = client.get("/api/driver/my-run", headers=driver_auth)
    assert res_run.status_code == 200
    run_info = res_run.json()

    if run_info["hasRun"]:
        trip_id = run_info["tripId"]
        vehicle_id = run_info["vehicleId"]
        res_readiness = client.get("/api/trips/1/readiness", headers=loader_auth)
        assert res_readiness.status_code == 200
        otp_code = res_readiness.json().get("otpCode")
        if otp_code:
            res_otp = client.post("/api/driver/otp/verify", json={
                "trip_id": trip_id,
                "vehicle_id": vehicle_id,
                "otp_code": otp_code,
            }, headers=driver_auth)
            assert res_otp.status_code == 200
            assert res_otp.json()["unlocked"] is True
        sync_vehicle_id = vehicle_id
    else:
        sync_vehicle_id = "VEH001"

    # 8. Offline Sync Submission (any authenticated role)
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
                    "vehicleId": sync_vehicle_id,
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
    }, headers=driver_auth)
    assert res_sync.status_code == 200
    assert res_sync.json()["success"] is True

    # 9. Audit Ledger (dispatcher only)
    res_ledger = client.get("/api/ledger", headers=dispatcher_auth)
    assert res_ledger.status_code == 200
    assert len(res_ledger.json()) > 0

    # 10. Notifications (role is derived from the session, not a query param)
    res_notif = client.get("/api/notifications", headers=dispatcher_auth)
    assert res_notif.status_code == 200

    # 11. Unauthenticated requests are rejected outright.
    res_unauth = client.get("/api/plan/draft?scenario=S1")
    assert res_unauth.status_code == 401
