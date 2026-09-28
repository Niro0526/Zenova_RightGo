# Backend Schema and API Specification

Version 1.0, 2026-09-28. **Proposed contract, not an implemented API or migration.** Current endpoint/table count in application source: zero. Stack: FastAPI/Pydantic, SQLAlchemy, Alembic, Supabase PostgreSQL. Requirement references: P01-P22 and C01-C17.

## Contract conventions

- Base path `/api/v1`; JSON UTF-8. Internal resource keys are UUIDs; source/business IDs are separate text columns. Enumerations are case-sensitive canonical values, with display labels handled by UI.
- UTC RFC3339 timestamps with offset on API; ISO dates for operating days; display/interpret operational windows in `Asia/Colombo`. Store source time strings as time-of-day with source date, not ambiguous localized display text.
- Decimal quantities serialize as strings, e.g. `"97.800"` kg and `"0.500000"` m3; probability may be JSON number constrained [0,1]. Reject nonfinite, negative and excessive precision/range values. No hidden unit multiplier.
- Protected endpoints use Bearer access tokens verified by FastAPI. Auth sign-in/refresh/logout use Supabase Auth, not invented FastAPI password routes. `GET /me` returns current active scopes.
- Collections default `limit=50`, maximum 100; opaque cursor bound to filters/scope; stable `(created_at,id)` or explicitly documented sort. Filters cannot expand authorized scope. Return `{items,next_cursor}`.
- POST commands require `Idempotency-Key` (UUID recommended). Request body changes under a reused key return 409. Resource edits require `expected_version >=1`.
- Standard resource response includes `id`, relevant business reference, `status`, `version`, `created_at`, `updated_at`. Actor and immutable source identifiers are server-derived. Body fields not declared by the contract are rejected.
- HTTP: 200 read/update/replayed command, 201 created resource, 202 queued job, 400 malformed request, 401 invalid/missing identity, 403 role denial, 404 absent or out-of-scope entity, 409 stale/duplicate/illegal-transition/capacity conflict, 422 field validation, 429 rate limit, 503 dependency unavailable. Do not expose existence across scopes.

Example error envelope (illustrative UUIDs omitted):

```json
{
  "error": {
    "code": "ALLOCATION_RULE_FAILED",
    "message": "This trip requires a van.",
    "details": [{"rule": "VAN_ONLY", "order_ref": "S1-000", "observed": "truck", "required": "van"}],
    "request_id": "request-reference",
    "current_version": 4
  }
}
```

Field-level validation includes `field` paths. Request IDs are safe correlation values, never secrets. OpenAPI generated from eventual request/response models is the executable contract; its schema must be reviewed against this document.

## Existing CSV data dictionary

All files are under `data/`. Counts are observed, not database row counts. Column sets below are exact and complete; interpretations/labels requiring the missing challenge are not silently inferred.

| File / rows | Columns | Meaning / ingestion rules |
|---|---|---|
| `outlets.csv` / 120 | outlet_id, brand, district, depot, dock_type, parking_constraint, mall_window, window_open_time, window_close_time | PK outlet_id; canonical brands Fresh/Style/Tech; dock rear_dock/street/mall_bay; parking normal/van_only; nullable mall_window. Preserve service windows. |
| `vehicles.csv` / 60 | vehicle_id, type, temp, weight_cap_kg, volume_cap_m3, fuel_type, km_per_l, weekly_fuel_quota_l, depot | PK vehicle_id; type truck/van; temp reefer/ambient; capacities and fuel efficiency/quota numeric and positive. Scenario availability is separate. |
| `district_travel.csv` / 12 | district, depot, road_class, free_flow_kmh, depot_to_district_km, depot_to_district_freeflow_min, inter_stop_km, inter_stop_freeflow_min | Source checker keys by district; assert unique district in snapshot. Keep distance/time units distinct; do not add return duration to checker formula. |
| `service_allowance.csv` / 9 | brand, dock_type, service_allowance_min | Composite key brand/dock_type; minutes nonnegative. Frontend mock calls value `allowance_min`; explicit mapping required. |
| `calendar.csv` / 910 | date, dow, dow_name, is_weekend, iso_year, iso_week, is_payday, festival, festival_ramp, is_holiday, monsoon, is_operating | PK date; flags parsed explicitly; festival nullable; retain operating/calendar policy as source fields. |
| `traffic_speed.csv` / 576 | district, hour, monsoon, speed_index | Composite district/hour/monsoon; hour 0-23; source index semantics require brief, not a physical speed assumption. |
| `road_conditions.csv` / 10,920 | district, date, disruption_index | Composite district/date; numeric index; do not infer direction of risk from name alone. |
| `deliveries_train.csv` / 92,307 | delivery_id, order_date, dispatch_date, dispatch_status, outlet_id, brand, district, depot, temp_requirement, order_units, order_weight_kg, order_volume_m3, route_id, seq_in_route, vehicle_id, vehicle_type, vehicle_temp, planned_arrival_time, window_open_time, window_close_time | PK source delivery_id; attempted/deferred/not_run. Dispatch/route/vehicle/plan fields nullable for 413 not-run rows. Source training records, not live orders. |
| `task1_test_inputs.csv` / 5,014 | delivery_id, order_date, dispatch_date, dispatch_status, outlet_id, brand, district, depot, temp_requirement, order_units, order_weight_kg, order_volume_m3, route_id, seq_in_route, vehicle_id, vehicle_type, vehicle_temp, planned_arrival_time, window_open_time, window_close_time | Same input shape as deliveries_train; 90 deferred rows. Preserve every test delivery_id. |
| `route_legs_train.csv` / 91,894 | leg_id, date, route_id, depot, vehicle_id, vehicle_type, vehicle_temp, brand, district, seq, from_point, to_outlet, distance_km, planned_depart_time, planned_travel_duration_min, planned_arrival_time, actual_depart_time, actual_travel_duration_min, arrival_time, leave_outlet_time, monsoon, dow | PK leg_id; source outcomes separated from prediction-time features. Verify route/date/seq/outlet join cardinality before deriving labels. |
| `route_legs_test.csv` / 5,014 | leg_id, date, route_id, depot, vehicle_id, vehicle_type, vehicle_temp, brand, district, seq, from_point, to_outlet, distance_km, planned_depart_time, planned_travel_duration_min, planned_arrival_time, monsoon, dow | Same planned/context columns without actual departure/travel/arrival/leave outcomes. No delivery_id; join must be tested, not positional. |
| `task2a_test_inputs.csv` / 60 | row_id, depot, brand, iso_year, iso_week | PK row_id plus group/week uniqueness; week 1-53 validated against ISO year. |
| `task2b_peak_day_scenarios.csv` / 85 | scenario, order_ref, outlet_id, brand, district, depot, dock_type, parking_constraint, mall_window, window_open_time, window_close_time, temp_requirement, order_units, order_weight_kg, order_volume_m3, deferred_yesterday, days_since_last_served | PK scenario/order_ref; independent immutable scenario snapshot. Do not overwrite with live outlet changes. |
| `task2b_peak_day_fleet.csv` / 38 | scenario, vehicle_id, status | Composite PK; available/in_workshop; absence is ineligible. |
| `submission_task1.csv` / 5,014 | delivery_id, pred_service_min, pred_late_prob | Input-aligned output key; blank prediction template currently. Finite duration >=0; probability [0,1]. |
| `submission_task2a.csv` / 60 | row_id, pred_total_volume_m3, pred_chilled_volume_m3 | Output key must exactly match input; finite volume >=0 and chilled <= total. |
| `submission_task2b.csv` / 85 | scenario, order_ref, outlet_id, decision, vehicle_id, trip_id | Checker requires all except outlet_id; validate outlet linkage in own exporter. served/deferred; deferred identifiers blank. Existing file is template, not accepted allocation. |

Service allowances in minutes:

| Brand | rear_dock | street | mall_bay |
|---|---:|---:|---:|
| Fresh | 15 | 16 | 18 |
| Style | 38 | 46 | 59 |
| Tech | 43 | 55 | 55 |

## Proposed relational schema

Business tables reside in private `app` schema. `auth.users` remains provider-managed. Unless stated otherwise, tables have UUID `id` PK and UTC `created_at`; mutable entities also have `updated_at`, integer `version` and actor reference. PK/FK columns are NOT NULL unless explicitly marked nullable. Text lengths below are proposed validation limits. Retain historical rows instead of cascading deletion of operational evidence.

Notation: `uuid->table` is FK; `text!` required text; `?` nullable; `decimal` means bounded PostgreSQL numeric, not binary float. Default quantities: weight `numeric(14,3)`, volume `numeric(14,6)`, quantity `numeric(14,3)`, minutes `numeric(12,4)`. Archive reference data with active flag rather than deleting referenced rows.

| Table | Important fields and types | Constraints / relationships |
|---|---|---|
| profiles | user_id uuid->auth.users, display_name text(120), active boolean | user_id PK; no password; role not editable by user |
| role_memberships | user_id uuid->profiles, role enum, depot_id uuid?->depots, outlet_id uuid?->outlets, active boolean | roles store_manager/dispatcher/loader/driver/admin; store requires outlet, dispatcher/loader depot, driver assigned trip access, admin global; uniqueness by user/role/scope including null-safe handling |
| depots | code text(40)!, name text(120)!, timezone text! | unique code; timezone Asia/Colombo for current operation |
| brands | code text(20)!, name text! | unique code, canonical Fresh/Style/Tech seeded |
| districts | code text(60)!, name text!, depot_id uuid->depots | unique code in reviewed dataset |
| outlets | source_outlet_id text(32)!, brand_id uuid->brands, district_id uuid->districts, depot_id uuid->depots, dock_type enum, parking_constraint enum, mall_window text?, window_open time, window_close time, active boolean | unique source_outlet_id; validate district/depot consistency; overnight interpretation unresolved, cannot silently compare as same-day |
| vehicles | source_vehicle_id text(32)!, depot_id uuid->depots, type enum, temp enum, weight_cap_kg decimal, volume_cap_m3 decimal, fuel_type text!, km_per_l decimal, weekly_fuel_quota_l decimal, active boolean | unique source_vehicle_id; positive capacities/efficiency; nonnegative quota |
| vehicle_availability | vehicle_id uuid->vehicles, operating_date date, status enum, reason text?, effective_at timestamptz | unique vehicle/date for current value; changes audited; status available/in_workshop/unavailable (third is proposed live operation value) |
| service_allowances | brand_id uuid->brands, dock_type enum, minutes decimal, dataset_id uuid->dataset_imports | unique dataset/brand/dock; >=0 |
| district_travel | district_id uuid->districts, depot_id uuid->depots, road_class text!, free_flow_kmh decimal, depot_to_district_km decimal, depot_to_district_freeflow_min decimal, inter_stop_km decimal, inter_stop_freeflow_min decimal, dataset_id uuid->dataset_imports | unique dataset/district; nonnegative distances/times, speed >0 |
| operating_calendar | date date, dow smallint, iso_year smallint, iso_week smallint, is_operating boolean, is_holiday boolean, is_weekend boolean, is_payday boolean, festival text?, festival_ramp decimal, monsoon smallint, dataset_id uuid->dataset_imports | composite dataset/date key; dow_name can be derived but preserve raw source in staging |
| products | sku text(64)!, brand_id uuid->brands, name text(200)!, order_unit text(40)!, weight_per_order_unit_kg decimal, volume_per_order_unit_m3 decimal, temp_requirement enum, active boolean | unique sku; explicit per-unit semantics; proposed synthetic catalog, not inferred from official aggregate CSV |
| outlet_closures | outlet_id uuid->outlets, start_date date, end_date date, reason_code text!, note text(2000)?, status enum | end >= start; status active/cancelled; overlap policy validated transactionally |
| orders | order_ref text(64)!, outlet_id uuid->outlets, brand_id uuid->brands, depot_id uuid->depots, district_id uuid->districts, requested_date date, eligible_date date, submitted_at timestamptz, status enum, input_mode enum, temp_requirement enum, order_units decimal?, weight_kg decimal, volume_m3 decimal, created_by uuid->profiles | unique order_ref; input_mode catalog/aggregate; derived fields immutable after confirmation except audited revision; aggregate scenario orders need no invented item lines |
| order_items | order_id uuid->orders, product_id uuid->products, quantity decimal, unit_snapshot text!, weight_per_unit_kg decimal, volume_per_unit_m3 decimal, temp_snapshot enum | quantity >0; unique order/product; preserve conversion snapshot |
| planning_runs | depot_id uuid->depots, operating_date date, scenario_code text?, dataset_id uuid->dataset_imports, policy_version text!, status enum, current_plan_version integer | unique active run per depot/date/scenario context; draft/published/executing/completed; scenario can differ from live date and requires declared demo mapping |
| run_orders | run_id uuid->planning_runs, order_id uuid->orders, source_order_ref text?, requirement_snapshot jsonb, decision enum, reason_code text?, reason_note text(2000)?, decided_by uuid?->profiles, decided_at timestamptz? | unique run/order; unresolved/served/deferred; snapshot includes dock/windows/parking/history/totals; decided fields and reason required for deferred |
| trips | run_id uuid->planning_runs, vehicle_id uuid->vehicles, trip_no smallint, brand_id uuid->brands, district_id uuid->districts, driver_id uuid?->profiles, status enum, published_version integer?, planned_start timestamptz?, planned_end timestamptz? | trip_no 1/2; unique run/vehicle/trip_no; enforce total vehicle/day across runs too; driver required before ready |
| trip_orders | trip_id uuid->trips, run_order_id uuid->run_orders, stop_sequence integer | unique run_order_id for active assignment; unique trip/sequence; >=0; this is the indivisible Task2B allocation unit |
| plan_versions | run_id uuid->planning_runs, number integer, manifest_snapshot jsonb, validation_snapshot jsonb, published_by uuid->profiles, published_at timestamptz, supersedes_id uuid?->plan_versions | unique run/number; immutable; snapshot records dataset/policy versions and allocations |
| loading_checks | trip_id uuid->trips, plan_version_id uuid->plan_versions, loader_id uuid->profiles, status enum, note text?, completed_at timestamptz? | one active check per trip/version; pending/blocked/ready; record revisions, do not overwrite completed check |
| loading_items | loading_check_id uuid->loading_checks, order_item_id uuid?->order_items, run_order_id uuid->run_orders, loaded_qty decimal?, loaded_weight_kg decimal?, loaded_volume_m3 decimal?, condition enum, note text? | catalog uses line quantities; aggregate uses mass/volume and explicit verification; nonnegative; every manifest line/unit accounted |
| deliveries | trip_order_id uuid->trip_orders, attempt_no integer, status enum, arrived_at timestamptz?, handed_over_at timestamptz?, failure_reason text? | unique trip_order/attempt_no; positive attempt; pending/arrived/handed_over/receipt_confirmed/failed/issue_pending |
| delivery_events | delivery_id uuid->deliveries, client_event_id uuid, actor_id uuid->profiles, event_type enum, event_at timestamptz, received_at timestamptz, payload jsonb | unique actor/client_event_id; append-only; allowed event schema by event_type |
| receipts | delivery_id uuid->deliveries, receiver_id uuid->profiles, receiver_name text(120)!, occurred_at timestamptz, status enum, attestation_method enum, signature_evidence_id uuid?->evidence_objects, note text(2000)? | one final receipt per delivery; complete/partial/damaged/temperature_issue; actor attestation required; signature required only for selected signature method |
| receipt_items | receipt_id uuid->receipts, order_item_id uuid->order_items, received_qty decimal, condition enum, note text? | unique receipt/item; >=0; all expected lines covered; aggregate receipt instead verifies delivered mass/volume in receipt details, requiring explicit aggregate fields below |
| receipt_aggregates | receipt_id uuid->receipts, received_weight_kg decimal, received_volume_m3 decimal, condition enum | receipt_id PK; used only for aggregate orders; complete requires match to loaded aggregate |
| operational_exceptions | order_id uuid?->orders, trip_id uuid?->trips, delivery_id uuid?->deliveries, kind enum, reason text(2000)!, status enum, resolved_by uuid?->profiles, resolved_at timestamptz?, resolution text? | at least one entity FK; scope must agree; open/acknowledged/resolved; kind capacity/loading/delivery/temperature/closure/network |
| deferral_acknowledgements | run_order_id uuid->run_orders, actor_id uuid->profiles, acknowledged_at timestamptz | unique run_order/actor; no mutation of scheduling decision |
| evidence_objects | owner_id uuid->profiles, delivery_id uuid->deliveries, object_key text!, media_type enum, bytes bigint, sha256 text(64)!, purpose enum, status enum | unique object_key; private bucket; photo/signature; pending/verified/rejected; bounded size and content validation |
| notifications | recipient_id uuid->profiles, event_id uuid, subject_type text!, subject_id uuid, payload jsonb, read_at timestamptz? | unique recipient/event; minimum data for authorized recipient |
| outbox_events | event_id uuid, kind text!, entity_id uuid, payload jsonb, attempts integer, available_at timestamptz, delivered_at timestamptz?, last_error_code text? | event_id unique; transactionally inserted; worker retries; no credentials/picture bytes |
| audit_events | actor_id uuid?->profiles, action text!, entity_type text!, entity_id uuid, request_id text!, before_version integer?, after_version integer?, reason text?, safe_change_summary jsonb | append-only; includes denied security event metadata through trusted logger; never store token |
| idempotency_records | actor_id uuid->profiles, operation text!, key text(128)!, request_hash text(64)!, response_status integer, response_body jsonb, expires_at timestamptz | unique actor/operation/key; reserved and committed atomically with business write |
| dataset_imports | name text!, task text!, source_hash text(64)!, schema_version text!, row_count integer, status enum, validation_report jsonb, artifact_uri text! | unique task/name/hash; staged/validated/promoted/rejected; source immutable |
| model_versions | task enum, artifact_uri text!, artifact_sha256 text(64)!, feature_schema_version text!, training_dataset_id uuid->dataset_imports, cutoff date, metrics jsonb, status enum | candidate/approved/retired; trusted artifact only; metrics include split and sample counts |
| model_jobs | task enum, input_dataset_id uuid->dataset_imports, model_version_id uuid?->model_versions, status enum, started_at timestamptz?, finished_at timestamptz?, output_uri text?, error_code text? | queued/running/succeeded/failed; retry bounded; scope/submitter recorded |
| predictions | model_version_id uuid->model_versions, input_dataset_id uuid->dataset_imports, source_key text!, task enum, values jsonb, generated_at timestamptz | unique model/input/source key; values validated per Task1/2A contract; never mixed into source outcomes |

Raw CSV staging keeps all source columns, including traffic/road/route history. Use task-specific typed staging tables or versioned Parquet with a manifest; their final physical layout is a future implementation decision, not an existing schema. Do not overload live order tables with 92,307 training rows.

### Integrity, indexes and migration rules

Foreign-key deletion defaults to RESTRICT for operational history. Deactivate users/reference entities; follow retention policy for sensitive evidence. Index all high-use scope/filter FKs: orders(outlet_id,status,created_at,id), orders(depot_id,eligible_date,status), role_memberships(user_id,active), run_orders(run_id,decision), trips(vehicle_id,status), trips(driver_id,status), deliveries(trip_order_id), notifications(recipient_id,read_at,created_at), outbox_events(available_at) where undelivered. Preserve external-key uniqueness in staging; index route/date/seq/outlet join keys only after profiling.

Simple CHECK constraints cover positivity, dates, enum domains, trip numbers and receipt shapes. Group capacities, mixed-brand/district, availability, cross-run vehicle-day budgets and state transitions require domain transactions plus database integrity routines/triggers where necessary; a row CHECK cannot enforce an aggregate sum safely. Lock a common vehicle-day/run guard so two concurrent assignments cannot both use the same remaining capacity.

Migration order: schema/roles -> reference and identity mappings -> orders -> planning -> manifests/execution -> receipt/evidence -> outbox/audit/idempotency -> ML metadata -> grants/RLS -> validated reference seed -> Auth demo users and memberships. One migration system owns application tables; proposed choice is Alembic with reviewed SQL for policies. Never mutate provider-owned Auth tables directly to provision passwords.

## Permission summary

SM=store manager, D=dispatcher, L=loader, DR=driver, A=administrator. Role alone is insufficient; every request also checks entity scope. A is not automatically allowed to execute business actions under another person's identity. Full matrix: SECURITY_ARCHITECTURE.md.

## Endpoint inventory

Every endpoint below is proposed. Standard errors and pagination apply; mutation outputs include changed entity and new version.

| Method / path | Role and scope | Request -> response / behavior |
|---|---|---|
| GET `/health/live` | public minimal | process alive -> `{status}`; no internals |
| GET `/health/ready` | infrastructure/minimal public | bounded DB/schema check -> ready or 503; detailed dependency report internal |
| GET `/me` | authenticated | profile, active memberships/scopes, server time |
| GET `/outlets` | SM own; D/L depot; DR assigned stop minimum; A | paginated outlet operational profile |
| GET `/catalog` | SM outlet brand; D scoped | `outlet_id` -> products with explicit order units/conversions |
| GET `/vehicles` | D/L depot; A | `depot_id,date` -> capacities and effective availability |
| GET `/reference/planning` | D; A | `dataset_id` -> versioned travel/allowance/calendar subset |
| POST `/outlets/{id}/closures` | SM own; D depot | start_date,end_date,reason_code,note -> closure + affected run references |
| POST `/closures/{id}/cancel` | SM own; D depot | expected_version,reason -> cancelled notice; no implicit republish |
| GET `/orders` | SM own; D depot | status/date/brand filters -> authorized order collection |
| POST `/orders` | SM own | outlet_id,requested_date,items OR approved aggregate fields -> order `submitted`; totals/brand derived |
| GET `/orders/{id}` | SM own; D depot; L/DR assigned minimum | actual order, quantities, permitted timeline, current decision |
| PATCH `/orders/{id}` | SM own while submitted; D before lock | expected_version,allowed mutable fields -> revised draft; reject locked changes |
| POST `/orders/{id}/confirm` | D depot | expected_version,eligible_date,reason? -> confirmed order |
| POST `/orders/{id}/cancel` | SM own/D depot per state policy | expected_version,reason -> cancelled; reject dispatched |
| POST `/planning-runs` | D depot | depot_id,operating_date,dataset_id,scenario_code?,policy_version,order_ids -> draft run + unresolved rows |
| GET `/planning-runs/{id}` | D depot; L assigned manifest subset | run counts, decisions, trips, current version |
| POST `/planning-runs/{id}/trips` | D depot | expected_version,vehicle_id,trip_no,brand_id,district_id,driver_id? -> planned trip |
| POST `/planning-runs/{id}/assignments` | D depot | expected_version,order_id,trip_id,stop_sequence -> served decision and allocation after validation |
| POST `/planning-runs/{id}/deferrals` | D depot | expected_version,order_id,reason_code,note,next_review_at -> deferred; remove any pre-execution allocation atomically |
| POST `/planning-runs/{id}/validate` | D depot | expected_version -> coverage, checker rules, operational rules, unresolved policy gaps; read-only evaluation |
| POST `/planning-runs/{id}/publish` | D depot | expected_version,validation_reference -> immutable published version; always revalidate current state |
| POST `/planning-runs/{id}/revisions` | D depot | expected_version,reason,changes -> revised draft; no rewrite of started execution |
| GET `/planning-runs/{id}/allocation.csv` | D depot | published version -> exact Task2B CSV and snapshot/checksum metadata |
| PATCH `/vehicles/{id}/availability` | D depot; A reference admin | date,status,reason,expected_version -> availability + impacted trips; immutable change audit |
| GET `/trips` | D/L depot; DR assigned | date/status filters -> scoped queue |
| GET `/trips/{id}/manifest` | D/L depot; DR assigned | published version, ordered stops and immutable quantity snapshots |
| POST `/trips/{id}/loading-checks` | L depot | expected_version,plan_version,items/checks,note -> pending/blocked/ready check; mismatch creates exception |
| POST `/trips/{id}/ready` | L depot | expected_version,loading_check_id -> ready if complete and current |
| POST `/trips/{id}/start` | DR assigned | expected_version,plan_version,event_at -> in_transit; must be ready |
| POST `/deliveries/{id}/events` | DR assigned | client_event_id,event_type,event_at,expected_version,payload -> arrival/handover/failure event |
| POST `/trips/{id}/complete` | DR assigned | expected_version,event_at -> complete only if every stop resolved or accepted exception |
| POST `/deliveries/{id}/evidence-intents` | SM own; DR assigned issue evidence | purpose,media_type,bytes,sha256 -> scoped short-lived upload intent + evidence ID |
| POST `/evidence/{id}/complete` | original authorized uploader | intent token/reference -> verified/rejected after content/size/hash/ownership validation |
| POST `/deliveries/{id}/receipts` | SM own | expected_version,receipt body below -> confirmed or issue-pending receipt |
| GET `/receipts/{id}` | SM own; D depot; DR own minimal acknowledgment | receipt fields plus authorized short-lived evidence links; no public bucket |
| POST `/run-orders/{id}/acknowledgements` | SM own | decision_version -> notice acknowledgment only |
| GET `/exceptions` | D depot; SM own subset; L/DR associated | type/status/date -> scoped queue |
| POST `/exceptions/{id}/resolve` | D depot | expected_version,resolution_code,note,related_revision_id? -> auditable resolution |
| GET `/notifications` | own user | paginated committed notifications |
| POST `/notifications/{id}/read` | own user | read marker, idempotent |
| GET `/audit-events` | D depot; A authorized support | scoped, redacted append-only history; no ordinary write/delete endpoint |
| GET `/insights/service` | D depot | delivery/source ID -> prediction, units, generated_at, model_version, availability |
| GET `/insights/demand` | D depot | depot,brand,iso_year,iso_week -> forecast with provenance |
| GET `/model-jobs/{id}` | authorized job owner/D scoped/A | job status + validated output reference; no arbitrary file path access |
| POST `/admin/dataset-imports` | A | approved task and bounded file upload -> 202 staged validation job; no arbitrary URL fetch |
| POST `/admin/users` | A | invitation/demo provision + explicit scope -> user reference; credential secret never returned in normal logs |
| PATCH `/admin/users/{id}/memberships` | A | expected_version,memberships,reason -> audited scopes; no self-escalation |

Model training/approval remains an operator-controlled batch workflow; no public arbitrary-code/model-upload API. Additional administrator reference edit endpoints should be added only with an actual operational need and the same version/audit model.

## Core request/response shapes

### Create order

Catalog request fields: `outlet_id: uuid`, `requested_date: date`, `items: [{product_id:uuid,quantity:decimal-string}]`, optional `note` <=2000 characters. Proposed limits: 1-100 distinct lines, maximum 100,000 order units per line subject to stricter catalog limits. No client-supplied actor/brand/depot/status/totals. Response adds `order_ref`, `eligible_date`, normalized items, totals/temperature, cutoff policy version and `status=submitted`.

Aggregate mode is restricted to authorized scenario import or an explicitly approved business form: required positive `weight_kg`, `volume_m3`, `temp_requirement`, optional `order_units`, source dataset/key. Normal browser users cannot label an arbitrary request as an official scenario. Duplicate products, mixed-brand catalog lines, inaccessible outlet and absent conversion factor return 422/404 as appropriate.

### Assign / defer / validation

Assignment body: `expected_version`, `order_id`, `trip_id`, `stop_sequence`. Server obtains the vehicle, depot, brand, district and order snapshot through these IDs. Return new run version, decision and complete recomputed trip/vehicle-day totals.

Deferral body: `expected_version`, `order_id`, `reason_code` from capacity/vehicle_unavailable/access_constraint/outlet_closed/time_budget/other, `note`, `next_review_at`. Other requires note. Store a review timestamp without converting it to promised delivery date. Proposed enum must be reconciled with Part One.

Validation response: `run_id`, `version`, `dataset_hash`, `policy_version`, `counts:{total,served,deferred,unresolved}`, `checker_feasible:boolean`, `operational_feasible:boolean|null`, `violations:[]`, `warnings:[]`, `policy_gaps:[]`, `trip_totals:[]`, `vehicle_budgets:[]`. Operational feasibility is null while required policy definitions are missing; publication for a production operational run is blocked. A deliberately labeled checker-only scenario demonstration may expose checker results without making production claims.

Rule codes include UNKNOWN_ORDER, DUPLICATE_DECISION, MISSING_DECISION, VEHICLE_UNAVAILABLE, DEPOT_MISMATCH, MIXED_BRAND, MIXED_DISTRICT, REEFER_REQUIRED, VAN_ONLY, WEIGHT_LIMIT, VOLUME_LIMIT, TRIP_LIMIT, FRESH_BUDGET, DAYTIME_BUDGET. Additional operational rules have a distinct namespace and confirmed policy source.

### Receipt

Required: `expected_version`, `receiver_name`, `occurred_at`, `status`, `attestation:{method,accepted,signature_evidence_id?}`, and either `items:[{order_item_id,received_qty,condition,note?}]` or `aggregate:{received_weight_kg,received_volume_m3,condition}` matching order input mode. Optional `note` and `photo_evidence_ids` (proposed maximum 5). Signature method requires verified image; explicit attestation method records authenticated actor and acceptance. Never infer full match solely from status.

Receipt response: resource ID, actual receipt state, delivery/order state, discrepancies, evidence references, exception ID if created and committed time. Changed manifest version returns 409. An evidence upload by another user/delivery or incomplete intent cannot be attached. Corrections create a linked amendment; no silent overwrite of final evidence.

### Evidence limits and lifecycle

Proposed allowlist JPEG/PNG, maximum 5 MiB each, maximum 5 photos plus 1 signature per receipt; validate file signature and decoded dimensions (maximum 20 megapixels), reject active formats such as SVG, strip unnecessary metadata. Content validation remains server-side even if upload goes directly to Storage. Expire upload URL after 5 minutes, read URL after 60 seconds; keep both configurable. Garbage-collect unattached pending objects after proposed 24h retention with audit. These limits are design choices, not current behavior.

### Idempotency and authorization example

Two SM POSTs with the same key, same outlet and same payload return one order. Same key with changed quantity returns 409. Another actor has a separate key namespace but still cannot target the first actor's outlet. Two dispatchers assigning the last capacity concurrently lock the same vehicle-day guard; one succeeds and one receives a conflict, regardless of frontend preview state.

## Import/export acceptance

Validate all reference IDs against the bound snapshot and all numeric fields before attempting C. Export exact expected keys and stable ordering; Task2B `outlet_id` must match source even though C ignores it. Preserve all 5,014 Task1 and 60 Task2A keys. CSV cells containing formula-leading user text must be safely encoded for human-facing exports; competition numeric/ID outputs must remain exact contract values. Never export credentials, receipt evidence or internal-only audit payloads with allocation data.

Schema sign-off is pending U01/U04/U05/U06: official business constraints, submitted design, ML labels and product policy. Physical indexes and query plans must be validated with real staged data after implementation.
