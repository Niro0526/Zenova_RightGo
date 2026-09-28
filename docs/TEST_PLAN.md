# Test Plan

Version 1.0, 2026-09-28. Tests below are planned unless explicitly marked **executed**. No new test code or application code was written in this review.

## Executed review checks

| Check | Result | Meaning and limits |
|---|---|---|
| TypeScript | PASS, exit 0 | `node Client/node_modules/typescript/bin/tsc --project Client/tsconfig.json --noEmit --incremental false`. No emitted JS/build-info changes requested. Checks types, not flows. |
| ESLint direct CLI | FAIL, exit 1: 75 errors, 26 warnings | From Client: `node node_modules/eslint/bin/eslint.js src --format json`. 71 explicit-any errors, 4 unescaped-entity errors, 26 unused-variable warnings. Existing findings left unchanged. |
| Supplied checker on current Task2B template | FAIL, return 1 | Every decision contains `(served/deferred)`, which is invalid. In-memory review harness loaded unchanged script and redirected only reference discovery to repository `data/`; no source/dataset edits. This is not a submitted-plan validation. |
| Dataset profile | COMPLETE | All 17 CSV headers and row counts; training/test dates/statuses; reference/mock common-field comparison. No model performance claim. |
| PDF/source review | COMPLETE for supplied sources | 8 booklet + 40 kickoff pages, full checker; missing Part One/design not reviewed. |
| Docker/runtime/E2E/security/performance | NOT RUN | No Docker executable on PATH, implemented backend, live DB or public deployment available. No browser interaction or penetration test performed. |

These results must not be presented as "all tests pass." TypeScript passes while lint and submission-template feasibility fail.

## Strategy, environments and fixtures

Use pure domain unit tests for planning and state transitions; FastAPI integration tests against disposable PostgreSQL/Supabase with actual RLS; frontend component tests for interactive forms/errors; browser E2E with separate role sessions; fresh-container deployment and backup restoration checks. Do not substitute an in-memory DB for PostgreSQL locking/RLS behavior.

Fixtures: immutable official references (120 outlets, 60 vehicles, 12 districts, 9 allowances), S1 (85 orders, 38 fleet rows), synthetic demo users with both allowed and disallowed scopes, catalog unit examples, concurrent vehicle-day assignments, complete/partial/damaged/temperature receipts, expired tokens, stale plans and interrupted uploads. Keep synthetic SKUs separate from official aggregate scenario data. Never use production personal data or secrets in CI.

Each run records commit, environment, schema version, dataset hashes, clock/timezone, test command, counts, failures and artifact location. A test owner must classify failures before waiving anything. No critical auth, data-loss or invalid-allocation failure is waivable for an operational release.

## Planning rule suite

| Test ID / requirement | Cases | Expected result |
|---|---|---|
| T-C01 / C02-C04,P06 | Missing header; blank/unknown/case-changed decision; duplicate/unknown/missing pair | Reject with exact rule; one row per expected pair |
| T-C02 / C05-C06 | Served without vehicle/trip; unknown vehicle; trip 0/3/non-numeric; deferred with identifiers | Served invalid rejected; deferred warning in checker, exporter emits blanks; test numeric 1.0 parity |
| T-C03 / C07,P07 | Available/workshop/missing fleet pair | Only exact available pair allowed |
| T-C04 / C08 | Cross-depot, mixed brands, mixed districts; independent valid trips | Invalid group rejected; valid separate trips accepted |
| T-C05 / C09-C10 | Chilled->ambient; chilled->reefer; ambient->reefer; van-only->truck/van | Reject only incompatible pairs; UI preview and API agree |
| T-C06 / C11 | Exactly-at, below, above weight and volume capacities; overflow only in volume | Equality passes; excess beyond 1e-6 fails; both dimensions checked |
| T-C07 / C12 | Two trips; trip 3; duplicate trip IDs across independent runs on same physical day | Checker trip bounds preserved; live cross-run vehicle-day limit enforced |
| T-C08 / C13 | 0,1,2+ order rows; repeated outlet IDs; each of nine allowances | Exact published arithmetic; repeated outlet rows count separately |
| T-C09 / C14 | Fresh cumulative 270/beyond; daytime cumulative 480/beyond; two individually short trips whose sum exceeds limit | Reject cumulative violation; don't apply budgets per trip or merge them |
| T-C10 / C03-C14 | All-deferred valid keys; feasible mixed served/deferred; input row permutations | All-deferred is checker-feasible but not a quality target; stable outcomes under permutation |
| T-C11 / P08 | Individual windows, mall windows, fuel, return/turnaround and driver overlap | Policy-specific operational tests after official rules supplied; explicitly separate from checker parity |
| T-C12 / P09 | Two requests contend for last capacity; plan edited between validate/publish | One safe winner, no aggregate overflow; stale publication rejected |

Add property-based generation around capacity/time boundaries and differential checks against unchanged C for valid-shaped reference data. Test malformed reference data in ingestion, since checker is not a hardened import validator. Include no minimum served-count assertion until official objective/scoring is available.

## Product, API and persistence suite

| Test ID / requirements | Procedure | Acceptance |
|---|---|---|
| T-P01 / P01-P04 | Store creates order; dispatcher reads in second session; refresh both | Same persisted reference/quantities and authorized visibility |
| T-P02 / P04 | Invalid quantity, duplicate product, mixed brand, missing conversion, inaccessible outlet | 422 or scoped 404; no partial insert |
| T-P03 / P04-P05 | Cutoff just before/at/after; UTC day boundary; holiday/closure interval and cancelled closure | Configured eligible date correct; no hardcoded Jan date; exact cutoff equality awaits policy |
| T-P04 / P06-P09 | Assign then defer; inspect history and coverage; publish with unresolved row | Vehicle/trip and reasons persist; one active decision; incomplete plan blocked |
| T-P05 / P10 | Partial load, damage, outdated manifest, valid replacement/revision | Readiness blocked until explicit resolution; original request retained |
| T-P06 / P11 | Wrong driver, unready start, duplicate arrival, invalid event order | Denied/conflict; one accepted event per key; correct chronology |
| T-P07 / P12 | Complete receipt with mismatched counts; partial/damaged/temp cases; missing attestation | No false complete status; evidence/counts/notes persist; issue creates exception |
| T-P08 / P12 | Actual order with different lines; navigate future order to receipt; receipt amendment | Correct manifest; illegal state blocked; final receipt not overwritten |
| T-P09 / P13 | Unavailability after draft, after publication and after trip start | Safe hold/revision for not-started work; incident for started work; no history rewrite |
| T-P10 / P21-P22 | Disconnect after server commit but before response; retry same/different payload key | Same result once; changed payload gets conflict; UI honest about unknown outcome |
| T-P11 / P21 | Worker crash after notification delivery before ack | At-least-once worker retry with deduplicated recipient event; no repeated business mutation |
| T-P12 / P22 | Offline event queue, session expiry, changed plan during offline period | Reauth + revalidate; conflicts visible; no silently discarded or duplicated event |
| T-P13 / F07,F09 | Delivered/deferred lists, acknowledgement and detail navigation | Canonical states consistently mapped; no hidden receipt or invented next date |
| T-P14 / API | Unknown fields, invalid decimal, overlong body, pagination cursor tampering, 429/503 | Contract-compatible safe errors, stable scope, no traceback/secrets |

## Authentication, authorization and security suite

| Test ID | Cases / expected evidence |
|---|---|
| T-S01 | Missing, expired, wrong issuer/audience/signature/algorithm JWTs rejected; key rotation and bounded JWKS refresh handled; failed identity provider is fail-closed. |
| T-S02 | Every allow/deny cell in SECURITY_ARCHITECTURE.md checked through direct API calls, not UI visibility alone. Include SM other outlet, D/L other depot, DR other trip and disabled membership. |
| T-S03 | Runtime DB role has no owner/BYPASSRLS/superuser privileges; absent subject denies; pooled connection reused by another user cannot see prior user rows. Direct browser Data API writes denied. |
| T-S04 | User metadata/role-body tampering cannot elevate membership. Admin operations audited; login throttling and generic errors verified. |
| T-S05 | SQL-injection strings, stored HTML/script content, path traversal and external upload URLs handled as data or rejected; parameterized queries and safe rendering proven. |
| T-S06 | Oversized/mismatched/active-format image, another delivery's evidence ID, expired signed URL, guessed object path and duplicate upload complete denied; storage is private. |
| T-S07 | Access tokens, DB passwords, service keys and signature/photos absent from browser bundles, logs, errors and repository artifacts. Secrets scan evidence recorded. |
| T-S08 | Exact CORS origins, auth cache isolation, secure session handling and header policy checked in staging. If cookies are introduced, add CSRF tests before release. |
| T-S09 | Rate/body limits and long-running import/job cancellation prevent resource exhaustion; output sanitization protects human CSV exports. |
| T-S10 | Restore includes database authorization plus evidence objects; retired users and expired access remain denied after restore. |

## UI and accessibility suite

T-U01: complete all designed role tasks at 360/390px, 768px and 1440px; no clipped fixed-column UI or full-height sidebar obstruction. T-U02: keyboard-only navigation, visible focus, dialog focus/close/return, screen reader labels/status/errors and 200% zoom. T-U03: measured contrast, non-color status cues, long text and reduced motion. T-U04: loading/empty/error/permission/stale/offline states with honest labels. T-U05: compare to supplied Day-5 design once obtained; log significant departures. No source-only CSS inspection can mark these runtime tests passed.

## ML and dataset suite

- T-M01: source schema/cardinality/key/range/enum/null validation; verify actual join uniqueness and unmatched rows for route/date/sequence/outlet. Report join rates, not only matching row counts.
- T-M02: preprocessing fit only on train; chronological holdout; no future actual-time features; no train/test overlap; group/time slice coverage and deterministic seed recorded.
- T-M03: confirm service-time/lateness label definition, treatment of early waiting, overnight times and deferred/not-run rows against detailed brief before accepting any metric.
- T-M04: Task1 exact 5,014 keys, finite service >=0 and probability [0,1]; Task2A exact 60 keys, nonnegative volumes/chilled<=total and correct ISO-year/week boundaries.
- T-M05: baseline versus candidate metrics with units/denominators and slice results; no unsupported official leaderboard claims.
- T-M06: trusted artifact hash/version/feature compatibility; cold start, missing/corrupt artifact, inference timeout and explicit unavailable/fallback behavior.
- T-M07: Task2B exact 85 pairs and official checker pass; report served count, deferred history and objective components separately. K36 tool/model restrictions and K34 artifact completeness verified manually.

## Deployment, performance and recovery suite

T-D01: fresh checkout + documented environment + root `docker compose up --build` yields complete seeded stack, no manual hidden DB step. T-D02: migration job failure blocks application readiness; seed rerun creates no duplicate accounts/records. T-D03: frontend standalone image includes assets and serves all real routes; backend health checks check correct import/schema. T-D04: public TLS URL and seeded-role walkthrough; demo accounts isolated from real data. T-D05: restart/worker interruption leaves accepted state intact. T-D06: restore database **and Storage objects** into isolated environment and verify representative evidence plus role denials. T-D07: rollback last known good image against compatible schema; incompatible schema rollback requires explicit restore/forward-fix decision. T-D08: record p95 read/write/validation latency for PRD load target and job/outbox lag; never invent measurements.

## Entry, exit and reporting

Entry: frozen candidate commit, installed/pinned tools, disposable test services, versioned fixtures and confirmed policies for tests that depend on them. Current repository does not meet integration-test entry conditions.

Exit: all P0/P1 behavioral/security/data-integrity cases pass; lint/type/build checks pass; no untriaged critical/high dependency issue; complete role and failure walkthrough proven; CSV contracts/required checker pass; restore and rollout rehearsed; documentation matches deployed commit. Publish a report listing executed/passed/failed/blocked/not-run counts with links to logs/screenshots. Keep blocked-policy tests visibly blocked rather than silently skipped.
