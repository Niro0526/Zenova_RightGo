import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import urllib.request
import json
from app.database.session import SessionLocal
from app.models.user import User
from app.services.reference_service import seed_users

def post(url, data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else b'', headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read())
    except urllib.error.HTTPError as e:
        print(f"HTTPError {e.code} on {url}: {e.read().decode()}")
        raise

def get(url, token=None):
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())

print("=================================================================")
print("  MULTI-DRIVER DYNAMIC TRIP ISOLATION & WORKFLOW VERIFICATION")
print("=================================================================")

# 1. Seed and verify DB driver users
db = SessionLocal()
seed_users(db)
drivers = db.query(User).filter(User.role == "driver").all()
print(f"[1] Database Drivers count: {len(drivers)}")
for d in drivers:
    print(f"    - Driver: {d.username} | Name: {d.display_name} | Vehicle: {d.vehicle_id} | Phone: {d.phone}")
db.close()
assert len(drivers) >= 4, "Expected at least 4 drivers in DB"

# 2. Authenticate all drivers
driver_tokens = {}
for u in ["sunil", "kamal", "nimal", "anura"]:
    res = post('http://localhost:8000/api/auth/login', {'email': f'{u}@rightgo.lk', 'password': 'Driver@2026'})
    driver_tokens[u] = res['access_token']
    print(f"[2] Authenticated Driver {u}: {res['profile']['display_name']} (vehicle: {res['profile']['vehicle_id']})")

disp = post('http://localhost:8000/api/auth/login', {'email': 'dilani@rightgo.lk', 'password': 'Dispatch@2026'})
d_tok = disp['access_token']
loader = post('http://localhost:8000/api/auth/login', {'email': 'rizwan@rightgo.lk', 'password': 'Loader@2026'})
l_tok = loader['access_token']
sm = post('http://localhost:8000/api/auth/login', {'email': 'kavitha@rightgo.lk', 'password': 'Store@2026'})
sm_tok = sm['access_token']

# 3. Reference Drivers Endpoint
ref_drivers = get('http://localhost:8000/api/reference/drivers', d_tok)
print(f"[3] Reference Drivers API (/api/reference/drivers): {len(ref_drivers)} drivers available to Dispatcher.")
assert len(ref_drivers) >= 4

# 4. Store Manager places replenishment order
prods = get('http://localhost:8000/api/reference/products?brand=Fresh', sm_tok)
p = prods[0]
order = post('http://localhost:8000/api/orders', {
    'outlet_id': 'OUT001',
    'brand': 'Fresh',
    'items': [{'id': p['id'], 'sku': p['sku'], 'name': p['name'], 'qty': 12, 'unit_weight': p.get('unit_weight', 5.0), 'unit_vol': p.get('unit_vol', 0.01), 'temp': p.get('temperature_zone', 'ambient')}]
}, sm_tok)
order_ref = order['order_ref']
print(f"[4] Store Order Placed: {order_ref}")

# 5. Dispatcher Auto-Plan
plan = post('http://localhost:8000/api/plan/close-orders?scenario=S1', {}, d_tok)
print(f"[5] Auto-Plan revision: {plan['draftRevision']}, Trips: {list(plan['stopSequences'].keys())}")

# 6. Query DB compatible candidates for this order
cands = get(f'http://localhost:8000/api/plan/candidates/{order_ref}?scenario=S1', d_tok)
print(f"[6] Compatible Candidates for Order {order_ref}: {len(cands)} feasible options.")
assert len(cands) > 0, "Expected feasible candidate vehicles for order"
best_cand = cands[0]
assigned_vid = best_cand['vehicle']['vehicle_id']
assigned_tno = best_cand['tripNo']
print(f"    Selected candidate: Vehicle={assigned_vid}, Trip={assigned_tno}, Recommended={best_cand['recommended']}")

# Assign to that feasible vehicle and link to driver Kamal
post('http://localhost:8000/api/plan/assign?scenario=S1', {
    'order_ref': order_ref,
    'vehicle_id': assigned_vid,
    'trip_no': assigned_tno
}, d_tok)
post('http://localhost:8000/api/plan/trip-driver?scenario=S1', {
    'vehicle_id': assigned_vid,
    'trip_no': assigned_tno,
    'driver_username': 'kamal',
    'driver_name': 'Kamal Silva'
}, d_tok)
print(f"[6.1] Dispatcher assigned order {order_ref} to Vehicle {assigned_vid} Trip {assigned_tno}, Driver: Kamal Silva")

# Confirm fuel input
post('http://localhost:8000/api/plan/fuel-input?scenario=S1', {
    'vehicle_id': assigned_vid,
    'prior_weekly_fuel_usage_l': 40.0
}, d_tok)

# 7. Release Plan
current_draft = get('http://localhost:8000/api/plan/draft?scenario=S1', d_tok)
manifest = post('http://localhost:8000/api/plan/publish?scenario=S1', {
    'expected_revision': current_draft['draftRevision'],
    'shortfall_policy': 'ship_good_tell_store'
}, d_tok)
print(f"[7] Manifest Released: Version={manifest['version']}, Trips={len(manifest['trips'])}")

# Find Kamal's trip in the released manifest
kamal_trip = next((t for t in manifest['trips'] if t['vehicleId'] == assigned_vid and t['tripNo'] == assigned_tno), None)
assert kamal_trip is not None, "Kamal's trip should be in the released manifest"
print(f"[8] Kamal's Released Trip: ID={kamal_trip['id']}, TripId={kamal_trip['tripId']}, Status={kamal_trip['loadingStatus']}, Driver={kamal_trip.get('driverName')}")

# 8. Verify driver isolation BEFORE Loader marks Ready
kamal_run_before = get('http://localhost:8000/api/driver/my-run', driver_tokens['kamal'])
print(f"[9] Kamal's run before Loader marks ready: hasRun={kamal_run_before.get('hasRun')} | msg='{kamal_run_before.get('message')}'")
assert kamal_run_before.get('hasRun') is False

# 9. Loader loads all assigned orders and marks trip Ready
loader_trips = get('http://localhost:8000/api/manifests/latest?scenario=S1', l_tok)['trips']
target_trip = next(t for t in loader_trips if t['id'] == kamal_trip['id'])
for oref in target_trip.get('orderRefs', []):
    post(f"http://localhost:8000/api/trips/{target_trip['id']}/load-order", {'order_ref': oref}, l_tok)
ready_res = post(f"http://localhost:8000/api/trips/{target_trip['id']}/mark-ready", {}, l_tok)
print(f"[10] Loader marked trip Ready! OTP Code Generated: {ready_res.get('otpCode')}")

# 10. Verify Kamal sees the trip in Current Stop flow
kamal_run_after = get('http://localhost:8000/api/driver/my-run', driver_tokens['kamal'])
print(f"[11] Kamal's run AFTER Ready: hasRun={kamal_run_after.get('hasRun')}, TripId={kamal_run_after.get('tripId')}, Stops={len(kamal_run_after.get('stops', []))}")
assert kamal_run_after.get('hasRun') is True
assert kamal_run_after.get('tripId') == kamal_trip['tripId']

# 11. Verify OTHER drivers (Nimal, Anura) do NOT see Kamal's trip
nimal_run = get('http://localhost:8000/api/driver/my-run', driver_tokens['nimal'])
print(f"[12] Nimal's run check: hasRun={nimal_run.get('hasRun')}")
anura_run = get('http://localhost:8000/api/driver/my-run', driver_tokens['anura'])
print(f"[13] Anura's run check: hasRun={anura_run.get('hasRun')}")
assert nimal_run.get('tripId') != kamal_trip['tripId']
assert anura_run.get('tripId') != kamal_trip['tripId']

print("=================================================================")
print("  MULTI-DRIVER ISOLATION & DYNAMIC ASSIGNMENT FULLY VERIFIED!")
print("=================================================================")
