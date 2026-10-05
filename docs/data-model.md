# Data model

Source of truth: `Server/app/models/*.py` and `Server/alembic/versions/`. Timestamps are timezone-aware UTC; JSON columns hold ordered lists.

## Reference data (loaded from the confidential CSVs)

| Table | Key | Purpose / main columns |
|---|---|---|
| `outlets` | `outlet_id` | brand, district, depot, dock_type, parking_constraint, mall_window, window_open/close_time, address, manager_name, phone, latitude, longitude |
| `vehicles` | `vehicle_id` | type, temp (ambient/reefer), weight_cap_kg, volume_cap_m3, fuel_type, km_per_l, weekly_fuel_quota_l, depot |
| `scenario_fleet_entries` | `id` | scenario, vehicle_id → vehicles, status (available/in_workshop) |
| `service_allowances` | `id` | brand, dock_type, service_allowance_min |
| `district_travel` | `id` | district, depot, road_class, free-flow speed and travel km/min figures |
| `operating_calendar_days` | `date` | is_operating, is_weekend, is_holiday (drives the 4 PM cutoff roll-forward) |

## Orders and planning

| Table | Key | Purpose |
|---|---|---|
| `orders` | `order_ref` | scenario, run_date, outlet_id → outlets, brand, constraints copied from the outlet, temp_requirement, units/weight/volume, deferral counters, status (default `awaiting_planning`), placed_by, notes |
| `draft_plans` | `id` (scenario unique) | draft_revision, updated_by |
| `draft_assignments` | `id` | scenario, order_ref → orders, decision (unresolved/served/deferred), vehicle_id, trip_no, reason_code/note, `locked` |
| `draft_stop_sequences` | `id` | scenario, vehicle_id, trip_no, stop_outlet_ids (JSON), `locked` |
| `draft_trip_meta` | `id` | planned_departure_time, `locked` |
| `draft_vehicle_fuel_inputs` | `id` | prior_weekly_fuel_usage_l, `locked` |
| `released_manifests` | `id`, unique (scenario, version) | version, published_at, shortfall_policy, is_active, acknowledgement (pending/acknowledged), acknowledged_by/at |
| `released_trips` | `id` | manifest_id → released_manifests, vehicle_id, trip_no, trip_id_str, stop_outlet_ids, order_refs, loading_status, otp_code/attempts/unlocked, departed_at, completed_at |
| `order_loading_states` | `id` | released_trip_id → released_trips, order_ref → orders, planned/loaded/effective units, is_loaded |

`locked` flags let manual dispatcher decisions survive a re-run of the greedy suggest.

## Operations

| Table | Key | Purpose |
|---|---|---|
| `loading_issues` | `id` | Loader pre-departure issue: type (missing/damaged/short/vehicle_problem), units_affected, status, action_taken |
| `stop_arrivals` | one row per (trip, stop), unique: the driver's **manual** Confirm Arrival (`arrived_at`, optional GPS evidence). Written only by `POST /api/driver/arrival` (or an offline delivery that carries `arrivedAt`); never by proximity. |
| `delivery_records` | `id` | Driver stop outcome (full/discrepancy/none), quantities, reasons, POD photo/signature references, sync status, source_device_id |
| `driver_issues` | `id` | Post-departure incident with category, description, photo reference, sync status |
| `receipt_records` | `id` | Store receipt: order_ref, outlet_id, confirmed_units, issue flag/type, confirmed_by |

## Cross-cutting

| Table | Key | Purpose |
|---|---|---|
| `deferral_memory` | `outlet_id` | consecutive_skips, last deferral reason, last_counted_run_date |
| `deferral_acknowledgements` | `id` | Store acknowledgement of a deferral |
| `notifications` | `id` | Targeted by role/user/outlet; kind, title, text, link, is_read |
| `ledger_entries` | `id` | Decision/audit log: action, actor, order/outlet/vehicle, previous/updated state, plan_version |
| `offline_processed_events` | `event_id` | Idempotency record for driver offline sync (applied/duplicate/rejected) |
| `auth_sessions` | `token` | Bearer sessions: user_id, username, role, outlet_id/vehicle_id, expires_at |
| `users` | `id` | Seeded demo users (salted SHA-256 hash). **Not used for login**; login checks the fixed accounts in `app/api/auth.py`. |

## Evolution

Alembic head is `0005_stop_arrivals` (adds `stop_arrivals`, after `0004_merge_heads`): `0001_initial_schema` → (`0002_locks_cutoff_dedup` → `0003_auth_sessions`) and (`0002_add_outlet_coordinates`), merged by `0004`. Fresh databases are migrated with `alembic upgrade head` (the Docker entrypoint does this); the API also calls `create_all()` at startup for tables missing from older databases.

## Seeding

`seed_reference_data` (run at API startup) inserts users, calendar, allowances, travel, vehicles, scenario fleet, outlets and the S1 orders only into empty tables, and creates the S1 draft plan with unresolved assignments. It does **not** create a released plan: runs come from the real workflow. `RIGHTGO_SEED_DEMO_RUN=true` additionally seeds a canned, already-departed v1 (VEH036, VEH006) for demos; that trip is not a valid plan, so it is off by default and departed history never blocks a corrective release. Re-running changes nothing (verified: identical row counts after a second start). `force_reload=True` (used only by `POST /api/state/reset`) deletes operational data first.

## State machine (as implemented)

| Entity | States |
|---|---|
| `orders.status` | `awaiting_planning` → `planned` (released) → `loaded` (loader marked loaded) → `in_transit` (trip departed) → `delivered` / `delivered_short` / `not_delivered` (driver outcome) → `received` (store receipt); also `deferred`, `cancelled` |
| `released_trips.loading_status` | `planned` → `loading` → `ready` → `departed` → `completed` (all stops have an outcome). Unlocking with the OTP is a separate flag (`otp_unlocked`) and requires `ready`/`departed`. |
| `released_manifests` | `is_active` (latest) + `acknowledgement` `pending` → `acknowledged`; an older manifest can no longer be acknowledged or loaded |
| `delivery_records` | one row per (trip, stop); quantities are computed server-side from `order_loading_states.effective_units` |
