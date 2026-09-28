# Existing project review

Reviewed 2026-09-28 against commit `93371ab` and the working tree. This is a static architecture and behavior review with a non-emitting TypeScript check and dataset profiling. It is not a live penetration test, browser acceptance test or production inspection.

**Later-same-day addendum:** the frontend working tree changed substantially after this baseline — a structural refactor moved dispatcher's route files into `Client/src/components/dispatcher/`, consolidated four separate sidebar implementations into shared `components/common/` primitives, replaced the `/` route (previously an alias of Store Manager) with a real role-selection homepage, and gave Loader a working 4-page implementation and Driver a minimal navigation-shell-plus-empty-state placeholder. The **Findings** table below has been individually re-checked and annotated (Resolved/Fixed/unchanged) rather than rewritten wholesale, so history stays legible; the **Executive assessment**, **Observed architecture**, and **Implemented route inventory** sections immediately below describe the `93371ab` baseline and are now stale on file paths and on the loader/driver/homepage claims specifically — treat the Findings table and SOURCE_REQUIREMENTS.md as current, and this narrative section as historical context for how the review was originally scoped.

## Executive assessment

RightGo has working local React interactions for store management and dispatcher planning, but it is not yet an integrated logistics system. No FastAPI application, API routes, persistent database schema, authentication, RBAC, policy migrations, or ML implementation exist in the inspected source (loader/driver status has since changed — see the addendum above and F13). The requested stack is suitable as a **target**, not a description of an implemented backend.

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
| F03 | **Fixed 2026-09-28** | `Client/next.config.ts` | `output: "standalone"` added; the Dockerfile's `.next/standalone` copy now matches what the build produces. |
| F04 | P0 (unchanged, by design — see below) | store page and all dispatcher pages | No sessions or authorization; all operational access is represented by unguarded frontend routes. No server-side trust boundary exists. **Intentional for now**: auth is explicitly deferred to a later pass; the frontend refactor (2026-09-28) added a shared, non-gating `RoleSwitcher` for demo navigation only and was told not to fake authorization with it. |
| F05 | **Resolved** (re-checked 2026-09-28 against the current working tree, which postdates this review's `93371ab` baseline) | `Client/src/components/dispatcher/PlanningView.tsx` `handleAssign` (~line 68/222) + `Client/src/store/dispatcher/PlanningContext.tsx` `getPassport`/`compatibleCandidates` | The assign button is gated on `passport.checkerFeasible`, which runs the *full* `buildPassport` check set (depot, availability, reefer, van, weight, volume, brand/district grouping, trip limit, cumulative time budget — all C01-C17-equivalent), not just vehicle selection. Verified by reading both files directly. Still not covered (booklet-level, not checker-level): delivery windows and fuel quotas — see SOURCE_REQUIREMENTS.md's phase-scope note. |
| F06 | **Resolved** (same re-check) | `PlanningContext.tsx` reducer, `DEFER` case (~line 98-120) | `deferOrder(orderRef, reasonCode, reasonNote)` persists both fields into the assignment *and* a `DecisionLedgerEntry` (visible on the Decision Ledger page). Not a discard. |
| F07 | **Resolved** (same re-check) | `Client/src/components/store-manager/DashboardView.tsx` (~lines 60-63) | Filters check `section === 'deferred' || section === 'degraded'` and `section === 'completed' || section === 'past'` (plus status-string fallbacks), so both namings already match. |
| F08 | P1, **partially fixed 2026-09-28** | `ConfirmReceiptView.tsx` `handleSubmit` (unchanged) vs `StoreManagerApp.tsx` `handleReceiptConfirmed` (fixed) | Still open, still P1: `ConfirmReceiptView` omits item-level received counts/ticks, signature is a boolean flag not captured bytes, Quick Sign writes fixed text. Fixed: the parent no longer collapses every receipt to `status: 'Delivered'` regardless of outcome — it now reads `receiptData.isFullMatch` and records `'Delivered - Exception Reported'` for damaged/shortage/temperature cases, so discrepancy outcomes survive into the order record. Minor residual: `OrderDetailView.tsx`'s `isDelivered` strict-equality check doesn't recognize the new exception string, so its badge may look slightly off for that one case. |
| F09 | P1 (unchanged) | `OrderDetailView.tsx`, `DegradationView.tsx` | Selected order does not drive actual manifest/timeline/reason content. Future orders show a static out-for-delivery timeline and receipt action. Deferral acknowledgement changes status to a hardcoded reschedule without confirmed plan. Not attempted this pass — both files are large (331 and 989 lines) and the fix needs a data-shape decision, not a mechanical patch. |
| F10 | P1, **cutoff-time claim now booklet-confirmed, not yet enforced** | `PlaceOrderView.tsx` | Fresh-only catalog/brand and hardcoded dates; weight multiplies unit weight by quantity by 5 with no reference basis; volume not submitted; browser random business reference risks collisions. The Challenge Booklet (p4) confirms the 4 PM cutoff is a real business rule, not a guess — the display text is now known-correct, but the code still doesn't check the clock, so an order placed at 5 PM is silently scheduled as if before cutoff. Not attempted this pass (800-line file; the surrounding order-creation flow needs review before a safe edit). |
| F11 | P1 (unchanged) | store page, `TopNavbar.tsx` | Live Sync, dispatcher notifications and e-POD success are static labels/alerts without network delivery or persistence. Reload loses changes; selected-outlet callback is not implemented in navbar. Inherent to the no-backend demo; not fixable without the backend this repo doesn't yet have. |
| F12 | **Resolved** (re-checked 2026-09-28) | `Client/src/components/dispatcher/Dashboard.tsx`, `Client/src/data/dispatcher-dataset.ts` | Dashboard now reads live counts from context (currently renders "26 of 85 S1 orders", not a hardcoded 842). `dataset.ts`'s S1-000 is ambient/97.8kg/0.5m3, matching the official CSV exactly. Whichever branch introduced this fixture drift, it's gone in the current working tree. |
| F13 | **Partially resolved** — Loader fixed, Driver still a placeholder, both by design | `app/loader/*`, `app/driver/*` | Loader is now a fully working, navigable 4-page module (Assigned Trips / Load Sequence / Trip Readiness / Report Issue) as of the 2026-09-28 frontend refactor — no longer absent. Driver remains an intentional navigation-shell-plus-empty-state placeholder (per explicit instruction: auth and full Driver functionality are later work); it is not a functional workspace and must not be reported as one. `offline/` support remains genuinely absent (no service worker/durable queue anywhere). |
| F14 | **Fixed 2026-09-28** | `Client/src/app/globals.css` (`.figma-sidebar`, `.main-content-viewport`), `DispatcherSidebar.tsx` | The ≤1024px media query now sets `height: auto; max-height: none` on `.figma-sidebar` (previously it kept `height: 100vh` even when stacked above content, pushing all page content off-screen on phones) and `.main-content-viewport` dropped its own redundant `height: 100vh` in favor of `flex: 1` so it fills whatever space remains instead of adding a second 100vh on top. `DispatcherSidebar.tsx`'s fixed 280px/`h-screen`/`sticky` classes are now `md:`-scoped so the same failure mode doesn't happen there. Not independently verified in a real browser at 360/390px — no browser tool available in this environment; verified by reading the resulting CSS/class logic only. |
| F15 | P2 (unchanged) | dialogs and clickable divs across components | Missing explicit dialog semantics/focus trapping/restoration and keyboard interactions in inspected markup; some icon controls lack accessible names. No accessibility audit completed. The new shared `ConfirmDialog` (2026-09-28 refactor) does implement focus-on-open, Escape-to-close, and focus restoration where it's been adopted (`OrderConfirmationModal`, `OrderDetailView`'s cancel flow); older ad hoc modals elsewhere are unchanged. |
| F16 | P2 | README files, prior AI disclosure | Root README names nonexistent backend path; client README claims Next 14; disclosure claimed trained anonymized models and regular bias audits without evidence. Disclosure corrected in this documentation update. |
| F17 | P2 (unverified this pass) | `TopNavbar.tsx`, CSV service allowances | Brand-only 15/38/43 min display ignores dock. OUT001 Fresh street allowance is 16, not 15. Not re-checked in this pass. |
| F18 | P1 (unchanged) | submission CSVs and C | Task1/2A prediction cells blank; Task2B first row contains instructional placeholders and remaining decisions are unfilled. These are not ready submissions. |
| F19 | **New finding, 2026-09-28** | root `data/` (17 CSVs), `.gitignore`, `git remote` | Root `data/` — the same competition-confidential dataset now also vendored at `Rules/data/` (content verified byte-identical) — is tracked in git and not `.gitignore`d, while the Challenge Booklet (p22) prohibits sharing/publishing/uploading these datasets to third parties. `origin` is `github.com/Niro0526/Zenova_RightGo.git`; this session cannot check that repo's visibility (no `gh` CLI / network access). Flagged, not remediated — stopping future tracking is a one-line `.gitignore` + `git rm --cached` change, but that's a decision for the repo owner, and it would not remove the data from existing history, which must not be rewritten without an explicit separate instruction. |

## Data review

17 CSV files were inspected. Key reference cardinalities: 120 outlets, 60 vehicles, 12 district travel records, 9 brand/dock allowances, 910 calendar days, 576 traffic profiles and 10,920 daily road conditions. S1 contains 85 orders (75 Fresh, 5 Tech, 5 Style), 38 fleet records (28 available, 10 workshop).

**Depot scope note (2026-09-28):** the Challenge Booklet (p3) describes Waypoint's wider network as spanning two depots — the Peliyagoda distribution center and a Kandy regional hub — and `vehicles.csv` does carry 22 Kandy-home vehicles (VEH039-060). Re-verified directly against the data: every one of the 85 S1 orders has `depot=Peliyagoda`, and `task2b_peak_day_fleet.csv` lists only the 38 Peliyagoda vehicles — zero Kandy vehicles appear in the S1 scenario at all. So the dispatcher Planning workspace's "(all Peliyagoda)" framing is correct *for the shipped S1 scenario*, not a bug; Kandy is a real second depot in the wider Waypoint network that this app's S1-scoped dispatcher/loader modules simply don't exercise. Worth remembering if S1 is ever swapped for a scenario that includes Kandy orders.

Training deliveries: 92,307 rows, comprising 90,351 attempted, 1,543 deferred and 413 not-run. Those 413 have no dispatch/route/vehicle/planned-arrival values. Training legs: 91,894 rows, exactly the non-not-run count but not proof of a valid one-to-one join. Training dispatch dates span 2024-01-01 to 2026-02-14. Test deliveries and legs each have 5,014 rows dated 2026-02-16 to 2026-03-28; test deliveries include 90 deferred rows. Do not drop deferred rows without official target guidance. Weekly forecast input/output each have 60 rows.

Official data is aggregate delivery/route data; product SKUs, case conversions, personal names, addresses and phone numbers in the UI are not supplied official reference fields. Fuel quotas exist in vehicle CSV and the Challenge Booklet (p11) does require the Hackathon system to respect them — `check_allocation.py` just doesn't check them (see SOURCE_REQUIREMENTS.md's phase-scope note), so a specific *consumption/reservation formula* is still undefined by any source. Detailed source dictionary is in BACKEND_SCHEMA_API.md.

## Verification and boundaries

- Non-emitting `node Client/node_modules/typescript/bin/tsc --project Client/tsconfig.json --noEmit --incremental false`: **passed**, exit 0. Does not establish business correctness or build/deploy success.
- Static source inspection and complete CSV shape/count profiling: completed. No data corrections or migrations applied.
- ESLint and supplied-checker diagnostics: see TEST_PLAN.md for captured results.
- Docker executable was not found on PATH in the review environment. Compose startup, container builds, database policies, migrations and external deployment were not executed.
- No live Supabase connection, API contract implementation, seeded accounts, auth integration, model artifact, E2E suite or Day-5 design was available to validate.
- No browser UI, performance/load test, real device test, dependency vulnerability scan or penetration test was performed. Responsive/accessibility findings are source-based.
- The Part One business brief and Datathon target definitions are now available (`Rules/Challenge Booklet.pdf` p3-7, p15-17; see SOURCE_REQUIREMENTS.md) and reconciled into this documentation set as of 2026-09-28. The Day-5 Designathon design/prototype remains the one still-missing input and is a separate, ongoing blocker to domain/fidelity sign-off — not resolved by the brief becoming available.

## Preserved working-tree state

Before this review, Git showed modified `Client/package-lock.json`, `Client/src/app/globals.css`, `Client/src/app/layout.tsx`, `Client/tailwind.config.js`, and deleted `Client/postcss.config.js`, `Client/tailwind.config.ts`. These changes were preserved. Per-command `safe.directory` was used to read Git due to sandbox ownership; global Git configuration was not altered. A SHA-256 baseline of 84 tracked paths was captured before documentation edits for the final no-code-change check.
