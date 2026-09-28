# App Flow Document

Version 1.0, 2026-09-28. Existing flows are described first; target flows are proposed and use API names from BACKEND_SCHEMA_API.md. All operational dates display Asia/Colombo explicitly where ambiguity matters.

## Current behavior

- `/` and `/store-manager` open directly into the store dashboard. Local state switches dashboard -> place-order -> confirmation -> detail -> receipt or degradation. Reload resets the state. There is no user login, shared backend, durable draft or dispatcher handoff.
- Store closure writes local notice state and shows an alert; order submission creates a random frontend reference; receipt sets Delivered locally; deferral acknowledgement fabricates a fixed reschedule. Dashboard grouping mismatches hide some records (F07).
- Dispatcher dashboard links to Orders and Planning. Orders only filters local rows by brand. Planning selects an order, opens assign/defer dialogs and changes local status; selected vehicle and deferral reason are not persisted. Other navigation entries are inert.
- Loader, driver and authentication flows are absent. This existing behavior does not complete K27's multi-role cycle.

## Target navigation

One authenticated shell offers only permitted workspaces. `/login` is proposed; users return to an allowed intended route after login. Store: order list/detail/create and receipts. Dispatcher: overview, orders, planning run/review and exceptions. Loader: trip queue/manifest. Driver: assigned trips/stop detail. User-visible IDs and status language remain consistent across roles. Deep links must recheck authorization and work after reload.

## Flow A: login and scope

1. User enters seeded/invited credentials through the identity provider. Invalid credentials return a generic accessible error; no account enumeration.
2. Client sends verified access token to `GET /api/v1/me`; API returns active role memberships and authorized scopes.
3. Single-role user lands in that workspace. Multi-role user selects among granted scopes; selecting a workspace does not grant a role.
4. Expired token triggers one supported refresh attempt. Failure preserves safe unsent form state locally where appropriate, prompts login and prevents a false success message.
5. Disabled membership or unauthorized deep link yields access denied; do not automatically try a more privileged role. Logout clears cached operational data and pending identity-bound access.

## Flow B: request to planning

1. Store manager opens their outlet's orders and sees committed status, cutoff policy, last sync and any active closure.
2. Create order: select authorized catalog items/quantities or the approved aggregate order form; server derives capacity units. Display requested date and earliest eligible operating date distinctly.
3. Submit with idempotency key. On 201, show server reference and `submitted`. On 422, highlight fields. On timeout, retain draft and retry same key/check existing result; do not create a new key automatically.
4. Dispatcher intake confirms valid requests for an operating run. Cutoff/closure conflicts remain visible and require a documented date decision. Exact cutoff policy awaits U06.
5. Once confirmed and included, the run records the order once as unresolved until assigned or deferred. Store sees the real decision when committed.

## Flow C: plan and publish

1. Dispatcher selects run/depot/reference snapshot and reviews availability, order requirements and deferral history.
2. Assignment preview lists eligible and ineligible vehicles with concrete rule reasons. Choose trip 1/2 and position; preview aggregates across the whole vehicle day.
3. Confirm assignment uses expected version. Server locks relevant records and runs all applicable checks. Rejecting a rule returns observed/limit and keeps the order unresolved. Accepted assignment creates `served` decision plus allocation.
4. Deferral requires reason code and explanatory note where needed. It preserves original request and service history. A future date is either an explicit proposal or absent, never an implicit promise.
5. Review displays total/served/deferred/unresolved counts, capacities, budgets, all constraint failures, missing policies and plan version. Publication is disabled while unresolved or invalid.
6. Publish transaction commits manifests, audit and notification outbox. Loader/driver/store see that version. A stale client receives 409 and a comparison of changes before retry.
7. Task2B export maps served assignments to vehicle/trip and blank identifiers for deferred orders. Export coverage and feasibility are checked against the bound input snapshot.

## Flow D: load and dispatch

1. Loader opens only trips in their depot and the published manifest version. Start loading records actor/time.
2. Count actual loaded quantities; enter checks and exception reasons. Requested and loaded numbers remain distinct.
3. On mismatch/damage, record exception and hold readiness. Dispatcher resolves by replacement or explicit replan, preserving original quantities and audit. The UI must not quietly substitute another product.
4. When checks pass and version is current, mark ready. The assigned driver sees trip/stop sequence and acknowledges manifest version.
5. Driver starts trip; API rejects unready, unassigned or stale-plan start. Start makes the executed manifest immutable; further changes follow incident/revision policy.

## Flow E: stop and receipt

1. Assigned driver records arrival and actual timestamp. Out-of-order stop attempts follow confirmed policy; any exception is visible.
2. Driver records handover or failure. Handover is `delivered_pending_receipt`, not store acceptance.
3. Store manager opens the actual delivery manifest, counts received items, enters receiver name/event time and explicit attestation/signature evidence. Discrepancy evidence must refer to this receipt.
4. Server checks authorization, correct delivery state, nonnegative quantities, allowed units, evidence ownership and idempotency. Matching lines plus valid attestation yield `receipt_confirmed`; issues yield `exception` with a durable record.
5. Dispatcher sees receipt and unresolved issue. Resolution has reason, actor/time and allowed remedy. Completion never erases shortages or temperature incidents.
6. Driver completes trip when every stop has a terminal or explicitly handed-off exception outcome. Run completion does not imply every order was successfully delivered.

## Flow F: capacity loss (primary degradation scenario)

Trigger: a vehicle becomes unavailable before a published or draft run can safely execute. This scenario is relevant because S1 already represents ten workshop vehicles and restricted reefer/van capacity.

1. Dispatcher records unavailability with effective time and reason. The server flags impacted non-started trips and prevents new assignment/start on the unavailable vehicle.
2. Show affected order count, temp/access needs, last-served history, current plan version, remaining valid capacity and operational impact. Preserve all orders.
3. Dispatcher tries reassignment. Every alternative is validated; a red van-only/reefer/volume/time failure cannot be bypassed by confirmation.
4. If no valid fit, explicitly defer with reason and next review time. Do not promise tomorrow unless a later plan actually commits that date.
5. Commit a revised plan or recorded hold. Loader/driver get version-change notification; store sees cause, what happens next and dispatcher contact.
6. Store acknowledgement records receipt of the notice only. It does not convert deferred into scheduled.
7. Concurrent edits return conflict; notification failure retries from outbox; network failure retains draft. If vehicle is already executing, create an incident and supervised recovery, not an automatic reassignment that rewrites history.

## Flow G: network and model failure

| Failure | User sees | Recovery |
|---|---|---|
| Read fails | Last successful data timestamp, stale badge, retry | Refresh within authorized scope; do not clear visible valid history unnecessarily |
| Mutation times out | Submission outcome unknown, pending indicator | Retry stable key; use result lookup/read to avoid duplicate order/receipt |
| Offline execution (future P1) | Local pending event and queue age; no server-success tick | On reconnect reauthenticate, replay in causal order, revalidate version and show rejected conflicts |
| Conflict 409 | Current version and changed entity | Reload, compare and intentionally resubmit with new expected version |
| Auth expires | Session expired; protected action paused | Sign in, verify scope then retry preserved action |
| Inference unavailable | Prediction unavailable or labeled planning-standard fallback | Continue manual valid planning; queue bounded retry; never fabricate a probability |
| Storage upload fails | Evidence pending, receipt unsent | Retry upload or preserve issue draft; no success until final receipt commit |

## Canonical state machines

| Entity | Valid forward transitions | Guard / exceptional path |
|---|---|---|
| Order | `submitted -> confirmed -> planned -> in_transit -> delivered_pending_receipt -> receipt_confirmed` | confirmed -> deferred; deferred -> confirmed for a new planning cycle; planned -> confirmed only through audited replan before execution; in_transit/delivered_pending_receipt -> exception |
| Order exception | `exception -> receipt_confirmed` or `exception -> confirmed` | Dispatcher resolution required; second path creates a new attempt and preserves failed delivery |
| Cancellation | submitted/confirmed -> cancelled | Proposed policy: owner store before planning lock, dispatcher before release; never delete history or cancel moving cargo |
| Run | `draft -> published -> executing -> completed` | published may be superseded by new version before affected execution; validation alone is not a stored state |
| Trip | `planned -> loading -> ready -> in_transit -> completed` | readiness blocked by exception; cancelled only before start; incident during execution |
| Delivery | `pending -> arrived -> handed_over -> receipt_confirmed` | arrived/in-progress -> failed or issue_pending; issue resolved with linked history |
| Notification | `pending -> delivered` | retryable failure -> pending; exhausted -> failed with operator action |

The UI may use readable labels, but persisted states stay canonical. `served` means allocated in Task2B, not delivered to a store. Planning deferral is distinct from a failed physical delivery.

## Demonstration script

Use distinct seeded accounts. Store submits one order; dispatcher confirms, assigns and publishes a valid plan; loader checks and marks ready; driver starts/arrives/hands over; store records receipt; dispatcher verifies final audit. Then demonstrate unavailable vehicle -> invalid reassignment blocked -> valid alternative or reasoned deferral -> notification -> acknowledgement without invented scheduling. Repeat a submission once to prove idempotency, refresh another session to prove persistence, and show a cross-outlet denial.
