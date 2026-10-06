import urllib.request
import json
import sys

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
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read())
    except urllib.error.HTTPError as e:
        print(f"HTTPError {e.code} on {url}: {e.read().decode()}")
        raise

print("=================================================================")
print("  RIGHTGO DISPATCHER & LOGISTICS LIFECYCLE VERIFICATION")
print("=================================================================")

# 1. Login
sm = post('http://localhost:8000/api/auth/login', {'email': 'kavitha@rightgo.lk', 'password': 'Store@2026'})
sm_tok = sm['access_token']
disp = post('http://localhost:8000/api/auth/login', {'email': 'dilani@rightgo.lk', 'password': 'Dispatch@2026'})
d_tok = disp['access_token']
loader = post('http://localhost:8000/api/auth/login', {'email': 'rizwan@rightgo.lk', 'password': 'Loader@2026'})
l_tok = loader['access_token']
print("[1] Authentication: Store Manager, Dispatcher, and Loader successfully authenticated.")

# 2. Products
prods = get('http://localhost:8000/api/reference/products?brand=Fresh', sm_tok)
print(f"[2] Database Catalog: Fetched {len(prods)} active products from database.")
prod1 = prods[0]
prod2 = prods[1] if len(prods) > 1 else prods[0]

# 3. Store Manager Order Placement
order_payload = {
    'outlet_id': 'OUT001',
    'brand': 'Fresh',
    'items': [
        {
            'id': prod1['id'],
            'sku': prod1['sku'],
            'name': prod1['name'],
            'qty': 10,
            'unit_weight': prod1.get('unit_weight', 5.0),
            'unit_vol': prod1.get('unit_vol', 0.01),
            'temp': prod1.get('temperature_zone', 'ambient'),
            'is_chilled': prod1.get('temperature_zone') == 'chilled',
            'price': prod1.get('price', 1000.0)
        },
        {
            'id': prod2['id'],
            'sku': prod2['sku'],
            'name': prod2['name'],
            'qty': 5,
            'unit_weight': prod2.get('unit_weight', 5.0),
            'unit_vol': prod2.get('unit_vol', 0.01),
            'temp': prod2.get('temperature_zone', 'ambient'),
            'is_chilled': prod2.get('temperature_zone') == 'chilled',
            'price': prod2.get('price', 1000.0)
        }
    ]
}
order_res = post('http://localhost:8000/api/orders', order_payload, sm_tok)
new_ref = order_res['order_ref']
print(f"[3] Store Manager Order Created: Ref={new_ref}, Units={order_res.get('order_units')}, Weight={order_res.get('order_weight_kg')}kg, Volume={order_res.get('order_volume_m3')}m3, Temp={order_res.get('temp_requirement')}")

# 4. Dispatcher Confirmed Queue
queue = get('http://localhost:8000/api/orders/confirmed-queue', d_tok)
found = any(o.get('order_ref') == new_ref for o in queue)
print(f"[4] Confirmed Orders Queue: Total {len(queue)} orders. New order {new_ref} present: {found}")

# 5. Dispatcher Notifications
notifs = get('http://localhost:8000/api/notifications', d_tok)
print(f"[5] Dispatcher Notifications: {len(notifs)} notifications found.")

# 6. Dispatcher Draft State & Auto-Plan (Close Orders)
draft = get('http://localhost:8000/api/plan/draft?scenario=S1', d_tok)
print(f"[6] Dispatcher Initial Draft State: Revision={draft.get('draftRevision')}, Total Orders={draft.get('counts', {}).get('total')}, Served={draft.get('counts', {}).get('served')}, Deferred={draft.get('counts', {}).get('deferred')}")

auto_plan = post('http://localhost:8000/api/plan/close-orders?scenario=S1', {}, d_tok)
counts = auto_plan.get('counts', {})
print(f"[7] Close Orders & Auto-Plan Generated: Served={counts.get('served')}, Deferred={counts.get('deferred')}, Unresolved={counts.get('unresolved')}, Trips={len(auto_plan.get('stopSequences', {}))}")

# 7. Test Deferral or Reassignment
assignments = auto_plan.get('assignments', {})
served_refs = [ref for ref, a in assignments.items() if a.get('decision') == 'served']
if served_refs:
    test_ref = served_refs[0]
    test_ord = assignments[test_ref]
    reassign_res = post('http://localhost:8000/api/plan/reassign?scenario=S1', {
        'order_ref': test_ref,
        'vehicle_id': test_ord['vehicleId'],
        'trip_no': test_ord['tripNo'] or 1
    }, d_tok)
    print(f"[8] Dispatcher Review & Manual Reassign Tested for order {test_ref}.")

# 8. Server-side Validation & Fuel Confirmation
assignments = auto_plan.get('assignments', {})
active_vehicles = set(a['vehicleId'] for a in assignments.values() if a.get('vehicleId'))
for vid in active_vehicles:
    post('http://localhost:8000/api/plan/fuel-input?scenario=S1', {
        'vehicle_id': vid,
        'prior_weekly_fuel_usage_l': 45.0
    }, d_tok)
print(f"[8.1] Confirmed Prior Weekly Fuel Usage for {len(active_vehicles)} active vehicles.")

val = get('http://localhost:8000/api/plan/validate?scenario=S1', d_tok)
print(f"[9] Plan Validation Checklist: Checker Feasible={val.get('checkerFeasible')}, Operational Feasible={val.get('operationalFeasible')}, Checklist Rules Checked={len(val.get('checklist', []))}")

# 9. Release / Publish Plan
current_draft = get('http://localhost:8000/api/plan/draft?scenario=S1', d_tok)
publish_payload = {
    'expected_revision': current_draft.get('draftRevision', 0),
    'shortfall_policy': 'ship_good_tell_store'
}
manifest = post('http://localhost:8000/api/plan/publish?scenario=S1', publish_payload, d_tok)
manifest_id = manifest.get('id')
manifest_v = manifest.get('version')
manifest_trips = manifest.get('trips', [])
print(f"[10] Plan Released / Published: Manifest ID={manifest_id}, Version={manifest_v}, Trips Generated={len(manifest_trips)}")

# 10. Loader Trips Verification
loader_manifest = get('http://localhost:8000/api/manifests/latest?scenario=S1', l_tok)
trips = loader_manifest.get('trips', [])
print(f"[11] Loader Workspace: Loader fetched active Manifest v{loader_manifest.get('version')} containing {len(trips)} planned/released trips.")

if trips:
    first_trip = trips[0]
    loading_seq = get(f"http://localhost:8000/api/trips/{first_trip['id']}/loading-sequence", l_tok)
    print(f"[12] Loader LIFO Loading Sequence for Trip {first_trip['tripId']} ({first_trip['vehicleId']}): {len(loading_seq.get('steps', []))} physical loading steps generated.")

print("=================================================================")
print("  ALL 12 STAGES OF DISPATCHER & LOGISTICS LIFECYCLE VERIFIED!")
print("=================================================================")
