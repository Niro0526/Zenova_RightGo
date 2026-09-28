# Technical Requirements Document

Version 1.0, 2026-09-28. Everything in the target sections is **proposed**. [REVIEW.md](REVIEW.md) is the authoritative description of what currently exists.

## Architecture decision

Use one Next.js App Router application styled with Tailwind, one FastAPI modular backend, and Supabase PostgreSQL for durable state. Supabase Auth is the proposed identity provider and private Supabase Storage is the proposed receipt-evidence store. The user mandated the database, not those additional products; these selections reduce separate identity/storage infrastructure and must be reflected in both hosted and local environments.

The browser owns interaction state. FastAPI owns business authorization, validation and transactions. PostgreSQL owns constraints and durable history. Never calculate final permission, capacity, price-like quantities or delivery completion solely in React.

```text
Store / Dispatcher / Loader / Driver browser
                 |
          HTTPS Next.js web
                 |
    Supabase Auth sign-in / access token
                 |
          HTTPS FastAPI /api/v1
                 |
    JWT verification -> scoped permission -> domain service
                 |
     SQLAlchemy transaction + RLS context
                 |
       Supabase PostgreSQL (app schema)
          |                 |
   durable outbox       versioned datasets/models
          |                 |
 notification worker   isolated Python batch/model worker

FastAPI -> private Storage signed upload/read intents -> browser
```

This text architecture is documentation, not deployed infrastructure. ML artifacts and job resources must be isolated from request processes; begin with a database-backed job/outbox worker to avoid unnecessary extra infrastructure. Train offline; use versioned inference adapters with bounded timeouts.

## Components and future module ownership

| Component | Proposed responsibility |
|---|---|
| `Client/src/app` | Authenticated route shells, role entry routes and detail pages. URL identifies selected order/trip; refresh/back navigation preserve context. |
| Client services/types | Typed API requests and generated DTOs from reviewed OpenAPI; centralized 401/403/409/error handling. Empty placeholders are not existing services. |
| Shared UI | One layout/navigation system, table/card views, form inputs, dialogs, alerts, statuses and mobile actions. |
| `Server/app/main` | App startup, health endpoints, router registration, CORS, request IDs and exception mapping. |
| API routers | Transport parsing and dependencies; no duplicate planning algorithms in endpoints. |
| Auth/policy layer | Verify token, active profile and scoped membership; reject unauthorized requests before domain writes. |
| Domain services | Orders, planning, trips/loading, delivery/receipt, reference data and reporting. Pure feasibility function shared by mutation/validation/export. |
| Persistence layer | Transaction handling, repositories, migrations, RLS and outbox writes. No autocommit partial workflows. |
| ML adapters/jobs | Data snapshots, feature schema, inference metadata, batch outputs and job state; no privileged browser access. |

## Authentication and database trust model

Proposed browser login obtains a Supabase Auth access token. FastAPI verifies signature, configured issuer, audience, expiry and accepted algorithm through a maintained JWT library and issuer-controlled key discovery; it never trusts decoded claims alone. Refresh is handled by the supported Auth client; failed refresh clears operational UI and requires login. See [Supabase JWT guidance](https://supabase.com/docs/guides/auth/jwts).

Role names in the UI or user-editable metadata confer no authority. Load an active `profiles` record and server-managed role/scope assignments. Proposed database access is through a dedicated non-owner `rightgo_runtime` SQL role with no `BYPASSRLS`. Use an explicit transaction, set a transaction-local verified `app.user_id`, and enforce RLS against profile/membership/trip scope. Policies deny missing context. Clear context via transaction completion; test pool reuse between users. SQL connections do not automatically inherit Supabase browser JWT claims.

Keep business tables in non-public `app` schema outside browser Data API exposure. Revoke direct `anon` and `authenticated` table mutations. RLS supplements FastAPI checks and business state-machine validation. Migrations/seed administration use separate credentials. Do not use the Supabase service key as ordinary per-user data access. See [grants and RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) and SECURITY_ARCHITECTURE.md.

## Consistency and workflow guarantees

1. Store authoritative timestamps as UTC `timestamptz`; operational dates/time-of-day policies use `Asia/Colombo`. Preserve source dates and ISO week/year for training and exports.
2. Use UUID internal keys, stable external business references and explicit `version` integers. Preserve official `outlet_id`, `vehicle_id`, `delivery_id`, `order_ref`, `scenario`, `leg_id` and `row_id` as source identifiers; they are not interchangeable.
3. Require `Idempotency-Key` on business POST commands. Scope by principal, operation and key; store request hash and response atomically. Same key/payload returns original result; different payload returns conflict. Proposed retention 7 days, adjustable above offline retry horizon.
4. Require `expected_version` on mutable records. Lock run/vehicle-day/trip/order records in stable order, re-read availability and aggregates, validate and commit atomically. Stale version returns 409 with current version.
5. Publish only if all included orders are decided, no duplicate active allocations exist, and current constraints pass. Transaction writes immutable plan version, manifests, audit and outbox together.
6. Replanning creates a new version. Started execution records remain historical truth; moving a load already dispatched is not an ordinary draft edit.
7. Loader quantities, requested quantities and received quantities are separate records. A receipt with an issue creates an exception, not a clean delivery flag.
8. All user-facing data claims derive from committed data or explicitly identified cached snapshots. Show sync timestamp and pending state; static success alerts are not acknowledgements.

Canonical fields and state transitions are specified in BACKEND_SCHEMA_API.md and APP_FLOW.md. No migration is authored by this documentation update.

## Planning engine boundary

Inputs: immutable reference snapshot, scenario or operating date, available vehicle statuses, selected orders, existing trips and applicable policy version. Output: feasibility result with machine-readable rule codes, entity references, observed/limit values and warnings.

Implement C03-C14 exactly for Task2B export validation; see source register. Separate `checker_feasibility` from `operational_feasibility`. Additional outlet windows, fuel, return travel, loading time and driver scheduling cannot be assumed covered by the supplied checker. Unknown operating policy is an explicit validation/configuration gap, not a hidden hardcoded constant.

Manual assignment and automatic suggestions must use the same validator. A suggestion carries no authority until the dispatcher confirms it and the server revalidates current state. Deterministic ties must use stable business identifiers after an agreed priority policy. Do not silently drop orders that do not fit.

## Data ingestion and provenance

Import official CSVs into immutable staging with filename, SHA-256, row count, schema version and import status. Validate keys, types, units, ranges, enumerations and reference joins before promotion. Preserve source blanks as nullable values where appropriate; quarantine invalid rows with reason and row number. One bad row must not produce a partially promoted dataset.

Reference data versions bind to each planning run. Product data in the prototype is synthetic and needs explicit per-order-unit conversion factors before it can drive capacity. A crate is not automatically one bottle or five units. Keep Task2B aggregate imports intact; do not infer SKUs from them.

## ML and analytics requirements

| Task | Verified contract | Proposed approach / unresolved detail |
|---|---|---|
| Task1 | `delivery_id,pred_service_min,pred_late_prob` for supplied 5,014 test rows | Candidate service duration derives from arrival/leave times joined via route/outlet/sequence/date; exact definition, overnight treatment and lateness event need official confirmation. Never guess an evaluation label. |
| Task2A | `row_id,pred_total_volume_m3,pred_chilled_volume_m3` for 60 depot/brand/ISO-week rows | Aggregate training demand with an explicit attempted/deferred/not-run policy; prevent censored served-only data from silently becoming demand. Confirm official horizon/scoring. |
| Task2B | One served/deferred decision per 85 scenario/order pairs | Deterministic baseline plus constrained allocation improvements; checker parity; objective/fairness/priority remain pending brief. |

Use chronological train/validation splits, group-aware leakage checks, fit preprocessing only on training folds, and record exact cutoffs. Actual arrival/departure/leave outcomes are candidate labels or historical features, never future-known inputs to prediction. Datasets have distinct training/test time ranges; do not use test outcomes for tuning. Record feature availability at decision time, unseen-category handling, baseline metrics, evaluation denominators and model checksum.

Do not claim bias audits, accuracy or model deployment until evidence exists. Proposed evaluation includes service-duration MAE, lateness calibration and appropriate classification metrics, weekly-volume MAE/weighted errors and slice reports by depot/brand/dock/temperature. These are diagnostic proposals, not known competition scoring weights.

Model unavailable: show an unavailable state or clearly labeled deterministic planning allowance. Preserve planning/receipt access. Reject NaN/infinite/negative durations and out-of-range probabilities. Only trusted, checksum-verified build artifacts may be loaded; never deserialize user-provided pickle files. K36 restrictions apply to Datathon preparation.

## Deployment and observability design

Production target: Next.js container and FastAPI container behind TLS, managed Supabase for Postgres/Auth/Storage, separate bounded worker. Local judging target: root Docker Compose includes frontend/API/worker and self-hosted Supabase dependencies, migration and idempotent demo seeding. Plain Postgres alone is insufficient if authentication and storage depend on Supabase services. Base local service layout on [official self-hosting guidance](https://supabase.com/docs/guides/self-hosting/docker).

Configure live/readiness checks separately; readiness checks database and schema compatibility with bounded timeout. Model failure should report degraded inference availability, not falsely mark all business endpoints down. Emit structured request logs, latency/error metrics, auth-denial counts, conflict counts, job/outbox lag and constraint failures. Never include passwords, JWTs or receipt evidence bytes in logs.

Use pinned, reviewed dependency/container versions for repeatability. Existing Python ranges are not a lockfile. Existing frontend runner requires [standalone output](https://nextjs.org/docs/15/app/api-reference/config/next-config-js/output), currently absent. Detailed environment inventory, release gates and recovery appear in the deployment and operations documents.

## Technical acceptance

The target is ready only after API/DB allow-deny tests, concurrent allocation tests, idempotent retries, complete role walkthrough, valid export, clean seeded startup, restore rehearsal and phone-size usability checks pass. TypeScript compilation of the current prototype is not evidence for any of these outcomes.
