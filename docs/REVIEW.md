# Existing project review

Reviewed 2026-09-28 against commit `93371ab` and the working tree. This is a static architecture and behavior review with a non-emitting TypeScript check and dataset profiling. It is not a live penetration test, browser acceptance test or production inspection.

## Executive assessment

RightGo has working local React interactions for store management and dispatcher planning, but it is not yet an integrated logistics system. No FastAPI application, API routes, persistent database schema, authentication, RBAC, policy migrations, loader/driver pages or ML implementation exist in the inspected source. The requested stack is suitable as a **target**, not a description of an implemented backend.

## Observed architecture

`Browser -> Next.js App Router -> React component state / static mock objects`

There is no observed frontend-to-backend or backend-to-database data path. `NEXT_PUBLIC_API_URL` appears in the frontend example environment, but no client request implementation consumes it. `Server/app` and `Server/tests` contain `.gitkeep`; ML subdirectories and architecture/data-model folders were also placeholders.

| Area | Evidence | Observed implementation |
|---|---|---|
| Frontend | `Client/package.json`, lockfile | Next.js 15.5.26, React/React DOM 18.3.1, Tailwind 3.4.19, TypeScript 5.9.3, ESLint 8.57.1 in current lockfile. Manifest uses ranges. |
| Entry | `Client/src/app/page.tsx` | Root renders StoreManagerPage directly; no login gate. |
| Store views | `Client/src/app/store-manager/page.tsx` | Six in-memory views switched by string state; orders, selected order and closure live only in the mounted component. |
| Dispatcher | `Client/src/app/dispatcher/{Dashboard,orders,planning}.tsx` | Separate hardcoded fixtures per page; navigation via App Router links; limited local assign/defer interaction. |
| Layout | `Client/src/components/layout`, `globals.css` | Store sidebar/navbar plus duplicated dispatcher sidebars; CSS variables, Tailwind and extensive inline styling coexist. |
| Reference data | `Client/src/data/mockData.ts`, `data/` | 120 mock outlets and 60 mock vehicles match all official common fields in row-order comparison; added names/contact/product details are frontend fixtures. Nine allowances use a differently named value field. |
| Backend | `Server/requirements.txt`, `Server/Dockerfile` | Intended FastAPI/Uvicorn/Pydantic/SQLAlchemy/Alembic stack, lower-bound-only dependencies; `app.main:app` does not exist. |
| Database | root Compose | PostgreSQL 16 image scaffold; no Supabase configuration, schema, migrations or seeds. |
| Auth/RBAC | empty `auth/sample.tsx`; no middleware, auth library or guards found | Role labels and a demo-switcher alert are presentation only. |
| Offline | empty `offline/sample.tsx` | No service worker, durable queue or synchronization implementation found. |
| ML | `ml/` | Empty task/model/notebook directories. Submission CSVs are templates, not completed model results. |
| Deployment | root Compose and Dockerfiles | Multiple static blockers; see Deployment Guide. No CI workflow or public deployment evidence found. |

## Implemented route inventory

| URL | Source | Reality |
|---|---|---|
| `/` | `Client/src/app/page.tsx` | Store manager prototype |
| `/store-manager` | `Client/src/app/store-manager/page.tsx` | Same store experience |
| `/dispatcher` | `Client/src/app/dispatcher/page.tsx` | Static dashboard wrapper |
| `/dispatcher/orders` | `Client/src/app/dispatcher/orders/page.tsx` | Brand-filtered seven-row fixture |
| `/dispatcher/planning` | `Client/src/app/dispatcher/planning/page.tsx` | Four-order fixture; local assign/defer dialogs |

`auth`, `loader` and `driver` contain `sample.tsx`, not `page.tsx`; these are not working role routes. Plan Review, Decision Ledger, Live Operations and Future Capacity navigation items have no destination. API endpoints and authentication endpoints in later documentation are proposed.

## Findings and practical consequences

Priority means release impact, not evidence of an exploited vulnerability. P0 blocks a deployable authenticated end-to-end product; P1 blocks correct operations; P2 affects quality/maintainability.

| ID | Priority | Evidence | Finding / required future outcome |
|---|---|---|---|
| F01 | P0 | `Server/app/.gitkeep` | API/data/auth layers absent. Build and verify before any live operational use. |
| F02 | P0 | root `docker-compose.yml` | Build points at missing `./backend`, ML has no Dockerfile, no frontend service, DB variables are literal backslashes, no seed/health/migration jobs. A valid YAML file would still not be a runnable complete stack. |
| F03 | P0 | `Client/Dockerfile`, `Client/next.config.ts` | Runner copies `.next/standalone`, but config does not enable standalone output. Static deployment blocker. |
| F04 | P0 | store page and all dispatcher pages | No sessions or authorization; all operational access is represented by unguarded frontend routes. No server-side trust boundary exists. |
| F05 | P1 | `dispatcher/planning.tsx`, `handleAssign` and confirm button | UI displays reefer and van checks but confirm disables only for selected vehicle, hardcoded blocked status and weight. Non-van reefer truck can pass button gate for a van-only order. Depot/district/brand/volume/trip/time/fuel checks absent; assignment saves only status, not vehicle/trip or revised load. |
| F06 | P1 | same file, `handleDefer` | Requires reason in dialog but persists only status and discards the reason. No decision ledger or cross-role notification. |
| F07 | P1 | store page vs `DashboardView.tsx` | Parent uses `section: degraded/past`; dashboard filters `deferred/completed`. Seeded deferred/completed records and newly confirmed receipts therefore fail those list filters. Reason fields also differ (`reason` vs `deferral_reason`). |
| F08 | P1 | `ConfirmReceiptView.tsx`, `handleSubmit` | Submission omits item received counts, ticks, signature bytes, actual photo references and complete-delivery notes. Full match is inferred from selected status rather than quantities. Signature is a local boolean; Quick Sign writes fixed text. All results become Delivered in parent, including damaged/temperature cases. |
| F09 | P1 | `OrderDetailView.tsx`, `DegradationView.tsx` | Selected order does not drive actual manifest/timeline/reason content. Future orders show a static out-for-delivery timeline and receipt action. Deferral acknowledgement changes status to a hardcoded reschedule without confirmed plan. |
| F10 | P1 | `PlaceOrderView.tsx` | Fresh-only catalog/brand and hardcoded dates; weight multiplies unit weight by quantity by 5 with no reference basis; volume not submitted; browser random business reference risks collisions. Cutoff is displayed, not enforced. |
| F11 | P1 | store page, `TopNavbar.tsx` | Live Sync, dispatcher notifications and e-POD success are static labels/alerts without network delivery or persistence. Reload loses changes; selected-outlet callback is not implemented in navbar. |
| F12 | P1 | dispatcher fixtures vs CSV | Dashboard says 85, order subtitle says 842, order list has 7, planning has 4. S1-000 is changed from official ambient/97.8kg/0.5m3 to chilled/320kg/1.8m3. Planning fleet includes vehicles not in S1 availability. Fixtures must not masquerade as official scenario results. |
| F13 | P1 | `auth`, `loader`, `driver`, `offline` | No all-role cycle or real failure recovery. Store closure and deferral are only local simulations. |
| F14 | P2 | `globals.css`, inline grids, dispatcher sidebars | Store mobile media query changes flex direction but retains 100vh sidebar height; several 340/360/420px fixed columns and 280px dispatcher sidebar lack equivalent small-screen handling. Phone operability remains unverified and at risk. |
| F15 | P2 | dialogs and clickable divs across components | Missing explicit dialog semantics/focus trapping/restoration and keyboard interactions in inspected markup; some icon controls lack accessible names. No accessibility audit completed. |
| F16 | P2 | README files, prior AI disclosure | Root README names nonexistent backend path; client README claims Next 14; disclosure claimed trained anonymized models and regular bias audits without evidence. Disclosure corrected in this documentation update. |
| F17 | P2 | `TopNavbar.tsx`, CSV service allowances | Brand-only 15/38/43 min display ignores dock. OUT001 Fresh street allowance is 16, not 15. |
| F18 | P1 | submission CSVs and C | Task1/2A prediction cells blank; Task2B first row contains instructional placeholders and remaining decisions are unfilled. These are not ready submissions. |

## Data review

17 CSV files were inspected. Key reference cardinalities: 120 outlets, 60 vehicles, 12 district travel records, 9 brand/dock allowances, 910 calendar days, 576 traffic profiles and 10,920 daily road conditions. S1 contains 85 orders (75 Fresh, 5 Tech, 5 Style), 38 fleet records (28 available, 10 workshop).

Training deliveries: 92,307 rows, comprising 90,351 attempted, 1,543 deferred and 413 not-run. Those 413 have no dispatch/route/vehicle/planned-arrival values. Training legs: 91,894 rows, exactly the non-not-run count but not proof of a valid one-to-one join. Training dispatch dates span 2024-01-01 to 2026-02-14. Test deliveries and legs each have 5,014 rows dated 2026-02-16 to 2026-03-28; test deliveries include 90 deferred rows. Do not drop deferred rows without official target guidance. Weekly forecast input/output each have 60 rows.

Official data is aggregate delivery/route data; product SKUs, case conversions, personal names, addresses and phone numbers in the UI are not supplied official reference fields. Fuel quotas exist in vehicle CSV but their required operational policy is not defined by the checker. Detailed source dictionary is in BACKEND_SCHEMA_API.md.

## Verification and boundaries

- Non-emitting `node Client/node_modules/typescript/bin/tsc --project Client/tsconfig.json --noEmit --incremental false`: **passed**, exit 0. Does not establish business correctness or build/deploy success.
- Static source inspection and complete CSV shape/count profiling: completed. No data corrections or migrations applied.
- ESLint and supplied-checker diagnostics: see TEST_PLAN.md for captured results.
- Docker executable was not found on PATH in the review environment. Compose startup, container builds, database policies, migrations and external deployment were not executed.
- No live Supabase connection, API contract implementation, seeded accounts, auth integration, model artifact, E2E suite or Day-5 design was available to validate.
- No browser UI, performance/load test, real device test, dependency vulnerability scan or penetration test was performed. Responsive/accessibility findings are source-based.
- No assertion is made that all operating rules are known; the missing challenge brief and target definitions are explicit blockers to domain sign-off.

## Preserved working-tree state

Before this review, Git showed modified `Client/package-lock.json`, `Client/src/app/globals.css`, `Client/src/app/layout.tsx`, `Client/tailwind.config.js`, and deleted `Client/postcss.config.js`, `Client/tailwind.config.ts`. These changes were preserved. Per-command `safe.directory` was used to read Git due to sandbox ownership; global Git configuration was not altered. A SHA-256 baseline of 84 tracked paths was captured before documentation edits for the final no-code-change check.
