# Product Requirements Document

Version: review baseline 1.0, 2026-09-28. Status: proposed product specification grounded in available sources; missing-input decisions remain open. Product: RightGo PULSE. Stack mandated by the user: Next.js + Tailwind CSS, FastAPI/Python, Supabase/PostgreSQL.

## Problem and desired outcome

Store requests, dispatcher allocations, loading checks and delivery receipts need one shared operational record. A plan must respect constrained vehicles and time budgets, account for every order, and show staff what to do when capacity or execution fails. The current prototype demonstrates parts of this experience, but its independent mock screens cannot coordinate a real operation.

The product should let an authorized team complete a reproducible cycle from order creation to receipt or documented exception, with a dispatcher retaining control over allocation. Machine learning should support decisions through identified, versioned predictions. Missing predictions must never authorize an otherwise invalid plan.

## Evidence and scope

Source IDs B/K/C refer to [SOURCE_REQUIREMENTS.md](SOURCE_REQUIREMENTS.md). The user selected the stack. K17-K29 require a coherent, scoped, responsive product, one complete multi-role cycle, detailed degradation behavior and reproducible deployment. C defines verified Task2B feasibility. Exact business cutoff, prioritization, outlet service commitments and ML labels are unresolved until Part One is supplied.

### Users and accountability

| Role | Main outcome | Scope |
|---|---|---|
| Store manager | Submit correct replenishment requests; see decisions; report closure; reconcile delivered goods | Assigned outlets only |
| Dispatcher | Resolve each order, allocate valid trips, publish plans, monitor exceptions and justify deferrals | Assigned depots |
| Loader | Verify the released manifest, actual load and discrepancies before dispatch | Assigned depot trips |
| Driver | Execute assigned trips, record stop outcomes and problems on a phone | Assigned trips only |
| Administrator | Provision users/scopes and reference data; manage access | Separate support role, not an invented competition persona |

The four operational personas are now sourced from the Challenge Booklet (p6), not inferred from project directories and UI interactions — see UI_UX_DESIGN_BRIEF.md's Personas section. Fidelity to the Day-5 design remains unconfirmed since that artifact still hasn't been supplied. Administrator is a proposed operational necessity, not a fifth required business persona from the supplied PDFs.

### Release priorities

**P0: complete coherent operation.** Authentication, scoped authorization, canonical data, order intake, server-side feasibility, decision accounting, loader/driver/store handoffs, receipt/exception records, one complete failure recovery, seeded local stack, public demo and documentation.

**P1: intelligence and additional resilience.** Reproducible Task1/Task2A pipelines and Task2B allocation export, richer capacity analytics, durable offline execution queue, broader exception reporting. Datathon deliverables remain required for that phase even when separately scheduled from the Hackathon.

**Out of current proposed scope:** native apps, payments, procurement, billing/credit issuance, live GPS optimization, arbitrary split-order allocation, automated dispatcher overrides, a full warehouse management system and generic enterprise reporting. UI mentions of credit notes or split temperature segments do not establish implemented or approved features.

## Requirements and acceptance criteria

| ID | Priority / source | Requirement and measurable acceptance |
|---|---|---|
| P01 | P0; K17/K27 | One integrated product. Store-created order becomes visible to its dispatcher; published manifest is visible to loader and assigned driver; receipt is visible to store and dispatcher using the same IDs. Reload and a second session preserve state. |
| P02 | P0; proposed security control | Invite/seeded login, logout and session expiry. Missing/invalid identity fails protected API calls; inactive users are denied. No public sign-up or self-assigned operational roles. |
| P03 | P0; proposed security control | Backend permission checks and DB policies enforce role plus outlet/depot/trip scope. Cross-scope identifiers fail even if guessed or submitted directly. |
| P04 | P0; existing UI intent | Store submits a positive-quantity order for an assigned outlet. Backend derives brand/depot/temperature/totals, returns a durable unique reference and eligible planning date; server time and configured policy govern cutoff. Unknown policy blocks final sign-off, not an invented default. |
| P05 | P0; existing UI intent | Closure start/end and reason persist; overlapping planning is flagged. Existing published trips require dispatcher acknowledgement/replan; cancellation does not silently reinstate a promise. |
| P06 | P0; C03-C06 | Every order in a planning run has exactly one active decision. Draft may contain unresolved orders; publication requires `served + deferred = included orders`, with no overlap or omissions. Deferred orders retain reason and history. |
| P07 | P0; C07-C14 | Each served assignment satisfies scenario availability, matching depot, one brand and district per trip, chilled/reefer and van-only compatibility, both capacities, trip numbers and cumulative time budgets. Reject invalid mutations and publication at the API, not only in UI. |
| P08 | P0; K27 plus U01 | Operational execution additionally checks confirmed outlet/mall windows, loading/return/turnaround, fuel and driver constraints once Part One defines them. Checker success alone is insufficient for a release called operationally compliant. |
| P09 | P0; K19/K27 | Dispatcher publishes a versioned plan; loader and driver receive that version. Concurrent edits produce a recoverable conflict, never silent overwrite/double allocation. |
| P10 | P0; inferred loader role | Loader records actual quantities and checks. Shortfall/damage blocks readiness until dispatcher records an explicit resolution and revised manifest if needed. Original request and actual loading both remain available. |
| P11 | P0; inferred driver role | Only assigned driver may start a ready trip, record arrival, handover or delivery failure, and complete the trip when stops are resolved. Invalid sequence is rejected. |
| P12 | P0; store UI | Receipt captures receiver, event time, per-line received quantities, evidence references and attestation. Full receipt requires quantity agreement; shortage/damage/temperature issues remain exceptions until resolved. No fabricated signature/photo or automatic clean completion. |
| P13 | P0; K19 | Fully specified capacity-loss degradation journey: invalidate affected proposed assignments, show reasons and affected orders, permit valid alternatives/deferral, publish revision, notify relevant roles, acknowledge without inventing a new delivery date. |
| P14 | P0; K27 | Responsive web cycle on 360px and 390px mobile widths for loader/driver/store and desktop dispatcher. All essential controls reachable; no clipped submit actions; keyboard/focus/error semantics tested. |
| P15 | P0; K28 | Root Compose starts complete seeded local environment; one account per implemented role; README walkthrough and design departures; public demo URL, architecture/data model and `.env.example`. |
| P16 | P0; K23/K28/K29 | Truthful AI/tool disclosure and source attribution; record significant departures from submitted design; team can explain implementation. Keep public deployment available through judging/later rounds as applicable. |
| P17 | P1; CSV + K34 | Task1 output covers 5,014 `delivery_id` rows with finite nonnegative `pred_service_min` and `pred_late_prob` in [0,1]. Confirm label/scoring definitions before model selection. Record split, preprocessing, baseline, version and limitations. |
| P18 | P1; CSV + K34 | Task2A output covers 60 `row_id` rows with nonnegative total/chilled volume and chilled <= total. Grouping uses depot, brand, ISO year/week. Validate chronological forecasting and unseen groups. |
| P19 | P1; C + CSV | Task2B export covers 85 S1 pairs with exact decisions and valid vehicle/trip fields; passes unchanged checker against corresponding reference snapshot. Feasibility does not imply objective quality; present served/deferred and fairness measures separately. |
| P20 | P1; K34-K36 | Deliver diagrams, preprocessing rationale, trained artifact, notebooks, video and disclosure, obeying restrictions on pretrained models/proprietary preprocessing/automated modeling. No fabricated metrics or artifacts. |
| P21 | P0; proposed operational control | API errors identify safe next action and request ID; audit stores actor, entity, transition/reason, timestamp and version. Notifications follow durable commits; their failure does not undo an accepted business event. |
| P22 | P1; existing offline scaffold | If offline support is delivered, distinguish locally saved from server accepted. Retry with stable event ID; reauthorize/revalidate on sync; surface conflict. MVP must at least retain an unsent form while mounted and never claim success on network failure. |

## Verified planning standard

One Task2B row is one indivisible allocation unit. Each trip belongs to one available vehicle, depot, brand and district. A reefer may carry ambient loads; any chilled order makes reefer compatibility mandatory. Both weight in kg and volume in m3 constrain the full trip.

`planned_minutes = depot_to_district_freeflow_min + (order_rows - 1) * inter_stop_freeflow_min + sum(service_allowance_min for each order's brand/dock)`.

Sum Fresh trips per scenario/vehicle <=270 minutes; sum other trips <=480 minutes. At most two trips; IDs are 1 or 2. Preserve numeric tolerance `1e-6` only for parity with checker arithmetic. The app should use decimal units and must not round display values back into calculations. Source: C, detailed rule IDs in the register.

Fairness inputs `deferred_yesterday` and `days_since_last_served` should be visible to the dispatcher. A priority policy, optimization objective, tie-break and exceptions require confirmation; do not equate Fresh priority text in a mock screen with official scoring.

## Success measures and proposed nonfunctional targets

These are proposed engineering targets, not measured results or organizer criteria.

| Measure | Acceptance target |
|---|---|
| Data integrity | Zero lost/duplicated accepted orders, allocations or receipts in retry/concurrency tests |
| Constraint integrity | Zero invalid published allocations against verified checker rules and confirmed additional rules |
| Accountable planning | 100% run order coverage; every deferral has reason/actor/time; served ratio reported without invented minimum |
| Authorization | Every allow/deny case in role/scope matrix passes at API and DB boundaries |
| Latency | p95 ordinary reads <=500ms and writes <=1s at 20 concurrent demo users, excluding uploads; measure on seeded staging |
| Plan validation | S1's 85-order validation <=3s p95 on declared test hardware; no long-running model training in request handlers |
| Availability | Proposed 99.5% during agreed demo support hours; confirm hosting budget and review duration |
| Accessibility | WCAG 2.2 AA as a design target; verify actual contrast, keyboard and assistive-tech behavior |
| Recovery | Proposed recovery time <=4h; daily-backup recovery point <=24h, improved if verified PITR is enabled |

## Release acceptance and unresolved decisions

Run the Test Plan's four-role walkthrough and degradation scenario from a fresh seeded installation. Supply durable evidence, not a screen-only demo. No P0/P1 correctness or access-control finding may be declared closed without verification. UI fidelity remains pending the Day-5 artifact. Part One is now available (see SOURCE_REQUIREMENTS.md); confirm the source register's still-open items (U03, U04, U09, U10) before turning any remaining provisional product policy into hard-coded behavior.
