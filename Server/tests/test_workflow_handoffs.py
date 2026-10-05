"""End-to-end handoff tests across Store Manager -> Dispatcher -> Loader -> Driver -> Store.

Every call goes through the real HTTP API with real per-role sessions, against an
isolated in-memory database (see conftest.py) - never production.
"""
from datetime import date, datetime, timezone

import pytest

from app.models.operations import DeliveryRecord
from app.models.order import Order
from app.models.plan import OrderLoadingState, ReleasedManifest, ReleasedTrip
from app.services.scheduling_service import compute_run_date

DRIVER_ORDERS = ["S1-000", "S1-001", "S1-002", "S1-003"]  # OUT001 x2, OUT002 x2 (verified feasible for VEH036)


def _login(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.fixture()
def roles(client):
    return {
        "dispatcher": _login(client, "dilani@rightgo.lk", "Dispatch@2026"),
        "loader": _login(client, "rizwan@rightgo.lk", "Loader@2026"),
        "driver": _login(client, "sunil@rightgo.lk", "Driver@2026"),
        "store": _login(client, "kavitha@rightgo.lk", "Store@2026"),
    }


def _plan_and_publish(client, roles, extra_orders=()):
    """Assign DRIVER_ORDERS (+ extra) to VEH036 trip 1, defer everything else with a
    reason, confirm fuel, publish. Returns (manifest_json, trip_row)."""
    d = roles["dispatcher"]
    draft = client.get("/api/plan/draft?scenario=S1", headers=d).json()
    wanted = list(DRIVER_ORDERS) + list(extra_orders)
    for ref in wanted:
        res = client.post("/api/plan/assign?scenario=S1", json={"order_ref": ref, "vehicle_id": "VEH036", "trip_no": 1}, headers=d)
        assert res.status_code == 200, (ref, res.text)
    for ref in draft["assignments"]:
        if ref in wanted:
            continue
        res = client.post("/api/plan/defer?scenario=S1", json={"order_ref": ref, "reason_code": "capacity", "reason_note": "test"}, headers=d)
        assert res.status_code == 200, (ref, res.text)
    res = client.post("/api/plan/departure?scenario=S1", json={"vehicle_id": "VEH036", "trip_no": 1, "departure_time": "04:00"}, headers=d)
    assert res.status_code == 200, res.text
    res = client.post("/api/plan/fuel-input?scenario=S1", json={"vehicle_id": "VEH036", "prior_weekly_fuel_usage_l": 0.0}, headers=d)
    assert res.status_code == 200, res.text
    rev = res.json()["draftRevision"]
    res = client.post("/api/plan/publish?scenario=S1", json={"expected_revision": rev, "shortfall_policy": "ship_good_tell_store"}, headers=d)
    if res.status_code != 200:
        bad = [c for c in client.get("/api/plan/validate?scenario=S1", headers=d).json()["checklist"] if c["kind"] != "checker_pass"]
        raise AssertionError(f"publish failed: {res.text} :: {bad}")
    return res.json(), rev


def _trip(db_session, manifest_version=None, vehicle="VEH036"):
    q = db_session.query(ReleasedTrip).filter(ReleasedTrip.vehicle_id == vehicle)
    if manifest_version:
        q = q.filter(ReleasedTrip.manifest_version == manifest_version)
    db_session.expire_all()
    return q.order_by(ReleasedTrip.id.desc()).first()


def _delivery(stop, outcome="full", vehicle="VEH036", rec_id=None, delivered=None, expected=0):
    body = {
        "id": rec_id or f"DEL-TEST-{stop}",
        "stopId": stop,
        "stopName": f"{stop} Outlet",
        "vehicleId": vehicle,
        "outcome": outcome,
        "podDetails": {"signerName": "Store", "hasSignature": True},
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    if outcome == "discrepancy":
        body["discrepancyDetails"] = {"type": "Quantity Short", "expectedQty": expected, "deliveredQty": delivered, "notes": "short"}
    if outcome == "none":
        body["notDeliveredDetails"] = {"reason": "Store Closed", "notes": "closed"}
    return body


# --------------------------------------------------------------------------- 4 PM cutoff / run eligibility
def test_four_pm_colombo_cutoff_and_operating_day():
    cal = {}  # empty calendar: Sunday closed by default
    mon_before = datetime(2026, 10, 5, 10, 29, tzinfo=timezone.utc)  # 15:59 Colombo
    mon_after = datetime(2026, 10, 5, 10, 30, tzinfo=timezone.utc)   # 16:00 Colombo
    sat_after = datetime(2026, 10, 3, 10, 30, tzinfo=timezone.utc)   # Sat 16:00 -> Sun closed -> Mon
    assert compute_run_date(mon_before, cal) == date(2026, 10, 5)
    assert compute_run_date(mon_after, cal) == date(2026, 10, 6)
    assert compute_run_date(sat_after, cal) == date(2026, 10, 5)


# --------------------------------------------------------------------------- order intake + ownership
def test_order_intake_queue_and_ownership(client, roles):
    res = client.post("/api/orders", json={"outlet_id": "OUT001", "brand": "Fresh", "units": 10}, headers=roles["store"])
    assert res.status_code == 200, res.text
    order = res.json()
    assert order["status"] == "awaiting_planning" and order["run_date"] is not None
    # Dispatcher queue sees it; store manager cannot place for another outlet or act as dispatcher
    queue = client.get("/api/orders?scenario=S1", headers=roles["dispatcher"]).json()
    assert any(o["order_ref"] == order["order_ref"] for o in queue)
    assert client.post("/api/orders", json={"outlet_id": "OUT002", "brand": "Fresh", "units": 5}, headers=roles["store"]).status_code == 403
    assert client.post("/api/orders", json={"outlet_id": "OUT001", "brand": "Fresh", "units": 5}, headers=roles["dispatcher"]).status_code == 403
    assert client.get("/api/plan/draft?scenario=S1", headers=roles["store"]).status_code == 403
    # Defer requires a reason
    bad = client.post("/api/plan/defer?scenario=S1", json={"order_ref": order["order_ref"], "reason_code": " "}, headers=roles["dispatcher"])
    assert bad.status_code == 422


# --------------------------------------------------------------------------- the complete delivery, with a loading shortfall
def test_full_cross_role_delivery_with_loading_shortfall(client, roles, db_session):
    d, l, drv, st = roles["dispatcher"], roles["loader"], roles["driver"], roles["store"]

    # Order -> dispatcher queue -> plan (store order joins the planned trip)
    new_order = client.post("/api/orders", json={"outlet_id": "OUT001", "brand": "Fresh", "units": 3}, headers=st).json()
    manifest, rev = _plan_and_publish(client, roles, extra_orders=[new_order["order_ref"]])
    assert manifest["version"] == 1
    trip = manifest["trips"][0]
    trip_db_id, trip_id = trip["id"], trip["tripId"]

    # Stale / duplicate release is rejected
    dup = client.post("/api/plan/publish?scenario=S1", json={"expected_revision": rev}, headers=d)
    assert dup.status_code == 409

    # Loader sees it; cannot depart before acknowledgement / loading
    assert client.get("/api/manifests/latest?scenario=S1", headers=l).json()["version"] == 1
    assert client.post(f"/api/trips/{trip_db_id}/depart", headers=l).status_code == 409
    assert client.post("/api/manifests/1/ack", headers=d).status_code == 403
    ack = client.post("/api/manifests/1/ack", headers=l)
    assert ack.status_code == 200 and ack.json()["acknowledgement"] == "acknowledged"
    assert client.post("/api/manifests/1/ack", headers=l).status_code == 200  # idempotent

    # Loading: LIFO sequence is the reverse of the stop order
    seq = client.get(f"/api/trips/{trip_db_id}/loading-sequence", headers=l).json()
    assert [s["outletId"] for s in seq["loadingSequence"]] == list(reversed(trip["stopOutletIds"]))
    refs = trip["orderRefs"]
    assert set(refs) == set(DRIVER_ORDERS) | {new_order["order_ref"]}
    assert client.post(f"/api/trips/{trip_db_id}/load-order", json={"order_ref": "S1-000", "loaded_units": 9999}, headers=l).status_code == 400
    for ref in refs:
        assert client.post(f"/api/trips/{trip_db_id}/load-order", json={"order_ref": ref}, headers=l).status_code == 200
    ready = client.get(f"/api/trips/{trip_db_id}/readiness", headers=l).json()
    assert ready["isReady"] is True and ready["otpCode"]
    otp = ready["otpCode"]

    # Loading shortfall: issue blocks readiness and departure, policy restores the gate
    planned_001 = db_session.query(OrderLoadingState).filter(OrderLoadingState.order_ref == "S1-001").one().planned_units
    assert planned_001 > 3
    issue = client.post("/api/issues/loading", json={
        "manifest_version": 1, "vehicle_id": "VEH036", "trip_no": 1, "order_ref": "S1-001",
        "outlet_id": "OUT001", "issue_type": "short", "units_affected": 3, "reported_by": "Spoofed Name",
    }, headers=l)
    assert issue.status_code == 200, issue.text
    assert issue.json()["reported_by"] == "Rizwan Farook"  # actor is the session, not the payload
    blocked = client.get(f"/api/trips/{trip_db_id}/readiness", headers=l).json()
    assert blocked["hasOpenIssues"] is True and blocked["isReady"] is False
    assert client.post(f"/api/trips/{trip_db_id}/depart", headers=l).status_code == 409
    wrong_order = client.post("/api/issues/loading", json={
        "manifest_version": 1, "vehicle_id": "VEH036", "trip_no": 1, "order_ref": "S1-050",
        "outlet_id": "OUT001", "issue_type": "short", "units_affected": 1}, headers=l)
    assert wrong_order.status_code == 404
    act = client.post(f"/api/issues/loading/{issue.json()['id']}/action", json={"action": "apply_policy"}, headers=l)
    assert act.status_code == 200 and act.json()["status"] == "resolved"
    db_session.expire_all()
    assert db_session.query(OrderLoadingState).filter(OrderLoadingState.order_ref == "S1-001").one().effective_units == planned_001 - 3
    assert client.get(f"/api/trips/{trip_db_id}/readiness", headers=l).json()["isReady"] is True
    # store was told it is arriving short
    notifs = client.get("/api/notifications", headers=st).json()
    assert any(n["kind"] == "arriving_short" for n in notifs)

    # Driver cannot deliver or unlock before departure; ownership enforced
    pre = client.post("/api/driver/deliveries", json=_delivery("OUT001"), headers=drv)
    assert pre.status_code == 409  # not departed
    assert client.post("/api/driver/otp/verify", json={"trip_id": trip_id, "vehicle_id": "VEH006", "otp_code": otp}, headers=drv).status_code == 403
    dep = client.post(f"/api/trips/{trip_db_id}/depart", headers=l)
    assert dep.status_code == 200 and dep.json()["status"] == "departed"
    assert client.post(f"/api/trips/{trip_db_id}/depart", headers=l).status_code == 409
    assert client.post(f"/api/trips/{trip_db_id}/load-order", json={"order_ref": "S1-000"}, headers=l).status_code == 409
    db_session.expire_all()
    assert {o.status for o in db_session.query(Order).filter(Order.order_ref.in_(refs)).all()} == {"in_transit"}

    run = client.get("/api/driver/my-run", headers=drv).json()
    assert run["hasRun"] and run["tripId"] == trip_id and run["isUnlocked"] is False
    assert [s["stopId"] for s in run["stops"]] == trip["stopOutletIds"]
    out1 = next(s for s in run["stops"] if s["stopId"] == "OUT001")
    db_session.expire_all()
    eff = {x.order_ref: x.effective_units for x in db_session.query(OrderLoadingState).all()}
    assert out1["units"] == sum(eff[r] for r in ("S1-000", "S1-001", new_order["order_ref"]))  # shown units = effective (shortfall applied)
    assert sorted(out1["orders"]) == sorted(r for r in refs if r != "S1-002" and r != "S1-003")
    assert not any(s["isCompleted"] for s in run["stops"])

    # Locked run: no delivery. Wrong OTP counts attempts. Right OTP unlocks (idempotent).
    assert client.post("/api/driver/deliveries", json=_delivery("OUT001"), headers=drv).status_code == 403
    bad = client.post("/api/driver/otp/verify", json={"trip_id": trip_id, "vehicle_id": "VEH036", "otp_code": "000000" if otp != "000000" else "111111"}, headers=drv)
    assert bad.status_code == 403
    ok = client.post("/api/driver/otp/verify", json={"trip_id": trip_id, "vehicle_id": "VEH036", "otp_code": otp}, headers=drv)
    assert ok.status_code == 200 and ok.json()["unlocked"] is True
    assert client.get("/api/driver/my-run", headers=drv).json()["isUnlocked"] is True

    # Outcomes: wrong stop, over-delivery, then real outcomes with server-computed quantities
    assert client.post("/api/driver/deliveries", json=_delivery("OUT009"), headers=drv).status_code == 409
    assert client.post("/api/driver/deliveries", json=_delivery("OUT001", vehicle="VEH006"), headers=drv).status_code == 403
    expected_out1 = out1["units"]
    over = client.post("/api/driver/deliveries", json=_delivery("OUT001", "discrepancy", delivered=expected_out1 + 5, expected=expected_out1), headers=drv)
    assert over.status_code == 422
    full = client.post("/api/driver/deliveries", json=_delivery("OUT001", "full"), headers=drv)
    assert full.status_code == 200, full.text
    assert client.post("/api/driver/deliveries", json=_delivery("OUT001", "full"), headers=drv).status_code == 200  # idempotent same id
    assert client.post("/api/driver/deliveries", json=_delivery("OUT001", "none", rec_id="DEL-OTHER"), headers=drv).status_code == 409  # second outcome, same stop
    rec = db_session.query(DeliveryRecord).filter(DeliveryRecord.id == "DEL-TEST-OUT001").one()
    assert rec.expected_qty == rec.delivered_qty == expected_out1
    assert rec.trip_id == trip_id and rec.manifest_version == 1

    prog = client.get(f"/api/driver/progress?trip_id={trip_id}", headers=drv).json()
    assert prog["completedStops"] == 1 and prog["isCompleted"] is False
    assert client.get(f"/api/driver/progress?trip_id={trip_id}", headers=l).status_code == 403

    # Second stop is delivered short (discrepancy)
    out2_expected = sum(s["units"] for s in run["stops"] if s["stopId"] == "OUT002")
    short = client.post("/api/driver/deliveries", json=_delivery("OUT002", "discrepancy", delivered=out2_expected - 4, expected=out2_expected), headers=drv)
    assert short.status_code == 200, short.text
    db_session.expire_all()
    assert db_session.query(ReleasedTrip).filter(ReleasedTrip.trip_id_str == trip_id).one().loading_status == "completed"
    run_after = client.get("/api/driver/my-run", headers=drv).json()
    assert all(s["isCompleted"] for s in run_after["stops"])

    # Separate driver issue (post-departure) vs loader issue
    iss = client.get("/api/issues/loading?manifest_version=1", headers=d).json()
    assert len(iss) == 1 and iss[0]["order_ref"] == "S1-001"

    # Store receipt: bound to the order's own delivery and quantity
    assert client.post("/api/receipts/confirm", json={"order_ref": "S1-002", "outlet_id": "OUT001", "confirmed_units": 1}, headers=st).status_code in (403, 404, 409)
    over_receipt = client.post("/api/receipts/confirm", json={"order_ref": "S1-001", "outlet_id": "OUT001", "confirmed_units": planned_001}, headers=st)
    assert over_receipt.status_code == 400  # only planned-3 was shipped
    rcpt = client.post("/api/receipts/confirm", json={"order_ref": "S1-001", "outlet_id": "OUT001", "confirmed_units": planned_001 - 3}, headers=st)
    assert rcpt.status_code == 200, rcpt.text
    assert client.post("/api/receipts/confirm", json={"order_ref": "S1-001", "outlet_id": "OUT001", "confirmed_units": planned_001 - 3}, headers=st).status_code == 409
    db_session.expire_all()
    assert db_session.query(Order).filter(Order.order_ref == "S1-001").one().status == "received"
    assert db_session.query(Order).filter(Order.order_ref == "S1-000").one().status in ("delivered", "delivered_short")  # delivered, not yet received

    # Dispatcher tracking and audit
    deliveries = client.get("/api/deliveries", headers=d).json()
    assert {x["stopId"] for x in deliveries} == {"OUT001", "OUT002"}
    assert {x["stopId"] for x in client.get("/api/deliveries", headers=st).json()} == {"OUT001"}  # store sees only own outlet
    actions = {e["action"] for e in client.get("/api/ledger", headers=d).json()}
    assert {"assigned", "deferred", "published", "manifest_acknowledged", "trip_departed", "trip_unlocked", "delivered", "trip_completed", "receipt_confirmed"} <= actions | {"receipt_issue"}


# --------------------------------------------------------------------------- stale release / superseded manifests
def test_rerelease_after_departure_keeps_run_live_and_does_not_duplicate(client, roles, db_session):
    d, l, drv = roles["dispatcher"], roles["loader"], roles["driver"]
    manifest, rev = _plan_and_publish(client, roles)
    trip = manifest["trips"][0]
    client.post("/api/manifests/1/ack", headers=l)
    for ref in trip["orderRefs"]:
        client.post(f"/api/trips/{trip['id']}/load-order", json={"order_ref": ref}, headers=l)
    assert client.post(f"/api/trips/{trip['id']}/depart", headers=l).status_code == 200

    # A departed load cannot be edited, and its vehicle trip cannot take new orders
    assert client.post("/api/plan/defer?scenario=S1", json={"order_ref": "S1-000", "reason_code": "capacity"}, headers=d).status_code == 409
    assert client.post("/api/plan/assign?scenario=S1", json={"order_ref": "S1-004", "vehicle_id": "VEH036", "trip_no": 1}, headers=d).status_code == 409

    # Corrective re-release: nothing new ships for already-dispatched orders
    rev2 = client.get("/api/plan/draft?scenario=S1", headers=d).json()["draftRevision"]
    res = client.post("/api/plan/publish?scenario=S1", json={"expected_revision": rev2}, headers=d)
    assert res.status_code == 200, res.text
    assert res.json()["version"] == 2 and res.json()["trips"] == []
    db_session.expire_all()
    assert db_session.query(ReleasedTrip).filter(ReleasedTrip.vehicle_id == "VEH036").count() == 1

    # The in-flight run stays live for the driver, the old manifest can no longer be acknowledged
    run = client.get("/api/driver/my-run", headers=drv).json()
    assert run["hasRun"] and run["loadingStatus"] == "departed"
    assert client.post("/api/manifests/1/ack", headers=l).status_code == 409  # v1 is superseded
    db_session.expire_all()
    for ref in trip["orderRefs"]:
        assert db_session.query(Order).filter(Order.order_ref == ref).one().status == "in_transit"


def test_unacknowledged_superseded_manifest_is_rejected(client, roles, db_session):
    d, l = roles["dispatcher"], roles["loader"]
    manifest, rev = _plan_and_publish(client, roles)
    old_trip = manifest["trips"][0]
    client.post("/api/plan/defer?scenario=S1", json={"order_ref": "S1-003", "reason_code": "capacity"}, headers=d)
    rev2 = client.get("/api/plan/draft?scenario=S1", headers=d).json()["draftRevision"]
    assert client.post("/api/plan/publish?scenario=S1", json={"expected_revision": rev2}, headers=d).status_code == 200
    assert client.post("/api/manifests/1/ack", headers=l).status_code == 409
    assert client.post(f"/api/trips/{old_trip['id']}/load-order", json={"order_ref": "S1-000"}, headers=l).status_code == 409
    assert client.post(f"/api/trips/{old_trip['id']}/depart", headers=l).status_code == 409
    assert client.post("/api/manifests/2/ack", headers=l).status_code == 200


# --------------------------------------------------------------------------- cancellation after release
def test_cancel_before_loading_removes_order_from_released_trip(client, roles, db_session):
    st, l = roles["store"], roles["loader"]
    new_order = client.post("/api/orders", json={"outlet_id": "OUT001", "brand": "Fresh", "units": 3}, headers=st).json()
    manifest, _ = _plan_and_publish(client, roles, extra_orders=[new_order["order_ref"]])
    trip = manifest["trips"][0]
    res = client.post(f"/api/orders/{new_order['order_ref']}/cancel", json={"reason": "changed mind"}, headers=st)
    assert res.status_code == 200, res.text
    db_session.expire_all()
    assert new_order["order_ref"] not in db_session.query(ReleasedTrip).filter(ReleasedTrip.id == trip["id"]).one().order_refs
    seq = client.get(f"/api/trips/{trip['id']}/loading-sequence", headers=l).json()
    assert new_order["order_ref"] not in [o["orderRef"] for s in seq["loadingSequence"] for o in s["orders"]]
    assert any(n["kind"] == "order_cancelled" for n in client.get("/api/notifications", headers=l).json())


# --------------------------------------------------------------------------- receipt only after delivery
def test_receipt_before_delivery_is_rejected(client, roles):
    manifest, _ = _plan_and_publish(client, roles)
    res = client.post("/api/receipts/confirm", json={"order_ref": "S1-000", "outlet_id": "OUT001", "confirmed_units": 1}, headers=roles["store"])
    assert res.status_code == 409


# --------------------------------------------------------------------------- sessions
def test_logout_only_ends_the_current_session(client):
    a = _login(client, "kavitha@rightgo.lk", "Store@2026")
    b = _login(client, "kavitha@rightgo.lk", "Store@2026")  # second browser
    assert client.get("/api/auth/me", headers=a).status_code == 200
    assert client.post("/api/auth/logout", headers=a).status_code == 200
    assert client.get("/api/auth/me", headers=a).status_code == 401
    assert client.get("/api/auth/me", headers=b).status_code == 200


# --------------------------------------------------------------------------- offline sync
def test_offline_sync_rejected_events_are_retryable_and_duplicates_ignored(client, roles, db_session):
    d, l, drv = roles["dispatcher"], roles["loader"], roles["driver"]
    manifest, _ = _plan_and_publish(client, roles)
    trip = manifest["trips"][0]
    event = {
        "event_id": "00000000-0000-0000-0000-00000000aaaa",
        "event_type": "delivery.completed",
        "payload": _delivery("OUT001", rec_id="DEL-OFFLINE-1"),
        "recorded_at": datetime.now(timezone.utc).isoformat(),
    }
    req = {"device_id": "DEV-1", "events": [event]}

    # Run not departed/unlocked yet: rejected, NOT recorded as processed
    first = client.post("/api/sync", json=req, headers=drv).json()
    assert first["results"][0]["status"] == "rejected" and first["success"] is False
    assert db_session.query(DeliveryRecord).count() == 0

    # Loader departs, driver unlocks; the same queued event now applies on retry
    client.post("/api/manifests/1/ack", headers=l)
    for ref in trip["orderRefs"]:
        client.post(f"/api/trips/{trip['id']}/load-order", json={"order_ref": ref}, headers=l)
    otp = client.get(f"/api/trips/{trip['id']}/readiness", headers=l).json()["otpCode"]
    assert client.post(f"/api/trips/{trip['id']}/depart", headers=l).status_code == 200
    assert client.post("/api/driver/otp/verify", json={"trip_id": trip["tripId"], "vehicle_id": "VEH036", "otp_code": otp}, headers=drv).status_code == 200
    second = client.post("/api/sync", json=req, headers=drv).json()
    assert second["results"][0]["status"] == "applied", second
    # Replay of an applied event is a duplicate, and no second record is created
    third = client.post("/api/sync", json=req, headers=drv).json()
    assert third["results"][0]["status"] == "duplicate"
    assert db_session.query(DeliveryRecord).count() == 1
    # A loader cannot submit driver events
    assert client.post("/api/sync", json={"device_id": "X", "events": [dict(event, event_id="00000000-0000-0000-0000-00000000bbbb")]}, headers=l).json()["results"][0]["status"] == "rejected"


# --------------------------------------------------------------------------- departed history never blocks a corrective release
def test_infeasible_departed_trip_does_not_block_new_release(client, roles, db_session, seed_active_trip):
    """The demo baseline seeds an already-departed VEH036 trip that is far over the vehicle's
    weight cap. That history must not make every later release fail validation, and its
    orders must not be shipped a second time."""
    seed_active_trip(
        "VEH036", ["OUT001", "OUT002", "OUT003", "OUT004"],
        [f"S1-00{i}" for i in range(8)], trip_id_str="S1-T001",
    )
    d = roles["dispatcher"]
    draft = client.post("/api/plan/suggest?scenario=S1", headers=d).json()
    assert draft["assignments"]["S1-000"]["vehicleId"] == "VEH036"  # history stays in the draft
    rev = draft["draftRevision"]
    for vid in {a["vehicleId"] for a in draft["assignments"].values() if a.get("vehicleId")}:
        res = client.post("/api/plan/fuel-input?scenario=S1", json={"vehicle_id": vid, "prior_weekly_fuel_usage_l": 0.0}, headers=d)
        assert res.status_code == 200
        rev = res.json()["draftRevision"]
    val = client.get("/api/plan/validate?scenario=S1", headers=d).json()
    blocking = [c for c in val["checklist"] if c["kind"] == "checker_fail"]
    assert blocking == [], blocking
    res = client.post("/api/plan/publish?scenario=S1", json={"expected_revision": rev}, headers=d)
    assert res.status_code == 200, res.text
    refs_in_new_trips = {r for t in res.json()["trips"] for r in t["orderRefs"]}
    assert not refs_in_new_trips & {f"S1-00{i}" for i in range(8)}
    assert not any(t["vehicleId"] == "VEH036" and t["tripNo"] == 1 for t in res.json()["trips"])
