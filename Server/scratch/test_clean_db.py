import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import urllib.request
import json
from app.database.session import SessionLocal
from app.models.order import Order
from app.models.plan import DraftPlan, DraftAssignment, DraftStopSequence, DraftTripMeta, DraftVehicleFuelInput, ReleasedManifest, ReleasedTrip, OrderLoadingState
from app.models.operations import LoadingIssue, DriverIssue, DeliveryRecord, ReceiptRecord
from app.models.memory import Notification, LedgerEntry
from app.services.reference_service import seed_reference_data

def post(url, data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else b'', headers=headers)
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())

def get(url, token=None):
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())

print("--- 1. Manually Clearing Dynamic Orders & Transaction Data ---")
db = SessionLocal()
try:
    db.query(ReceiptRecord).delete()
    db.query(DeliveryRecord).delete()
    db.query(DriverIssue).delete()
    db.query(LoadingIssue).delete()
    db.query(OrderLoadingState).delete()
    db.query(ReleasedTrip).delete()
    db.query(ReleasedManifest).delete()
    db.query(DraftVehicleFuelInput).delete()
    db.query(DraftTripMeta).delete()
    db.query(DraftStopSequence).delete()
    db.query(DraftAssignment).delete()
    db.query(DraftPlan).delete()
    db.query(Order).delete()
    db.commit()
    print("All transaction orders wiped cleanly.")
    
    print("--- 2. Simulating Server Startup (seed_reference_data) ---")
    seed_reference_data(db, force_reload=False)
    
    order_count = db.query(Order).count()
    print(f"Order count after startup seed: {order_count} (Expected: 0)")
    assert order_count == 0, f"Expected 0 orders but found {order_count}"
finally:
    db.close()

print("--- 3. Verifying Dispatcher & Store Manager API on Clean DB ---")
disp = post('http://localhost:8000/api/auth/login', {'email': 'dilani@rightgo.lk', 'password': 'Dispatch@2026'})
d_tok = disp['access_token']
sm = post('http://localhost:8000/api/auth/login', {'email': 'kavitha@rightgo.lk', 'password': 'Store@2026'})
sm_tok = sm['access_token']

queue = get('http://localhost:8000/api/orders/confirmed-queue', d_tok)
print(f"Dispatcher Confirmed Queue count on clean DB: {len(queue)} (Expected: 0)")
assert len(queue) == 0

print("--- 4. Store Manager Places a Real Dynamic Order ---")
prods = get('http://localhost:8000/api/reference/products?brand=Fresh', sm_tok)
prod1 = prods[0]
order_payload = {
    'outlet_id': 'OUT001',
    'brand': 'Fresh',
    'items': [
        {
            'id': prod1['id'],
            'sku': prod1['sku'],
            'name': prod1['name'],
            'qty': 8,
            'unit_weight': prod1.get('unit_weight', 5.0),
            'unit_vol': prod1.get('unit_vol', 0.01),
            'temp': prod1.get('temperature_zone', 'ambient'),
            'price': prod1.get('price', 1000.0)
        }
    ]
}
new_order = post('http://localhost:8000/api/orders', order_payload, sm_tok)
print(f"New Order Placed: Ref={new_order['order_ref']}, RunDate={new_order.get('run_date')}")

queue_after = get('http://localhost:8000/api/orders/confirmed-queue', d_tok)
print(f"Dispatcher Confirmed Queue count after order placed: {len(queue_after)} (Expected: 1)")
assert len(queue_after) == 1
assert queue_after[0]['order_ref'] == new_order['order_ref']
assert queue_after[0]['run_date'] is not None

print("--- 5. Dispatcher Auto-Plan, Validation & Release on Clean DB ---")
auto_plan = post('http://localhost:8000/api/plan/close-orders?scenario=S1', {}, d_tok)
print(f"Auto-Plan: Served={auto_plan['counts']['served']}, Trips={len(auto_plan['stopSequences'])}")

# Confirm fuel for active vehicles
for a in auto_plan['assignments'].values():
    if a.get('vehicleId'):
        post('http://localhost:8000/api/plan/fuel-input?scenario=S1', {
            'vehicle_id': a['vehicleId'],
            'prior_weekly_fuel_usage_l': 30.0
        }, d_tok)

val = get('http://localhost:8000/api/plan/validate?scenario=S1', d_tok)
print(f"Validation Feasible: Checker={val['checkerFeasible']}, Operational={val['operationalFeasible']}")

curr_draft = get('http://localhost:8000/api/plan/draft?scenario=S1', d_tok)
manifest = post('http://localhost:8000/api/plan/publish?scenario=S1', {
    'expected_revision': curr_draft['draftRevision'],
    'shortfall_policy': 'ship_good_tell_store'
}, d_tok)
print(f"Manifest Released! ID={manifest['id']}, Version={manifest['version']}, DecisionMaker={manifest['decisionMaker']}")
assert manifest['decisionMaker'] == "Dilani Perera"

print("=================================================================")
print("  CLEAN DATABASE BEHAVIOR FULLY TESTED AND VERIFIED!")
print("=================================================================")
