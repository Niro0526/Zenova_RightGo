# UI/UX Design Brief

Version 1.0, 2026-09-28. Proposed design direction based on source code and K17-K23. No Figma file or Day-5 prototype was supplied; fidelity to the submitted design is unverified. This document specifies the future interface and records current gaps, without changing UI code or creating a prototype.

## Product principles

Use one shared visual language for all roles. Prioritize the next safe operational action and the reason an action is unavailable. Make requested, planned, loaded and received quantities visibly different. Show source/time/version for data that may be stale. Prefer a small set of complete, connected screens to inactive navigation that implies nonexistent capabilities.

Keep brand names Fresh, Style and Tech consistent with source CSVs. RightGo/PULSE is the product identity; Waypoint is the name in the source scenario reference. Confirm naming against Part One. Never use invented contact data or stock quantities as production facts.

## Personas (provisional pending Part One)

**Store manager:** responsible for an outlet's supply continuity and receiving accuracy. Needs a clear replenishment form, honest delivery status and a fast discrepancy workflow at the dock. The prototype suggests desktop administration, but receiving must also work on a phone. Main pain points are uncertain delivery promises, repeated deferral and disagreement between ordered and received goods.

**Dispatcher:** responsible for a depot's feasible daily plan. Works with many orders and constrained fleet at once, usually on a larger screen. Needs constraint explanations, complete order accounting, service history and a review-before-publication step. Main risks are allocating against stale capacity and losing the reason an order was deferred.

**Loader:** responsible for physical manifest accuracy before dispatch. Needs large, sequential checks with units and visible deviations, workable on a shared mobile device. Main risk is a screen saying ready despite a missing or damaged load. User/device assumptions need confirmation; do not invent research findings.

**Driver:** responsible for executing assigned stops and reporting failures while mobile. Needs low-density trip/stop screens, large touch controls, timestamps, stable stop order and clear sync state. Main risk is network loss being mistaken for a saved event. Interactions must be safe to perform while stopped; no product requirement assumes interaction while driving.

## Screen inventory and rationale

| Screen | Role / current coverage | Rationale and required behavior |
|---|---|---|
| Login / access denied | All; absent | Establish identity and explain inaccessible workspaces. Preserve allowed return location and support reauthentication without accidental duplicate actions. |
| Order overview | Store; prototype | Group active, upcoming, deferred and completed work using canonical states. Put real next action first, show sync age and make deferred/completed history reachable. |
| New order | Store; prototype | Capture correct quantities/units with server-derived capacity and honest eligible date. Use a compact review summary before submit and field-specific errors after validation. |
| Order confirmation | Store; prototype | Confirm only durable acceptance with server reference and requested/eligible dates. Acceptance is distinct from dispatch confirmation; remove guaranteed delivery language until a valid promise exists. |
| Order detail / receipt | Store; partial | Present this order's manifest and timeline, then count actual receipts. Make discrepancy status, evidence and explicit attestation auditable; no fixed sample manifest or Quick Sign as a substitute for identity. |
| Closure / deferral detail | Store; prototype | Explain changed availability or missed service with reason, actor and next review. Acknowledgement records understanding and must not silently reschedule. |
| Dispatch overview and orders | Dispatcher; prototype | Reconcile counts from real state, highlight unresolved/at-risk work and provide functioning filters. Counts must equal visible backing records, not decorative metrics. |
| Planning workspace | Dispatcher; partial | Queue + selected-order detail + vehicle/trip feasibility preview. Explain every failed rule, show both weight and volume, and retain decision reasons. |
| Plan review / publish | Dispatcher; absent | Provide a single commitment checkpoint with coverage, rules, version, affected roles and reviewable changes. Publication is a consequential business action and should be explicit in the UI. |
| Exceptions / decision history | Dispatcher; absent | Connect capacity loss, loading mismatches, failed stops and store complaints. Preserve immutable history, accountable resolution and next action without creating a generic analytics suite. |
| Load manifest | Loader; absent | Verify physical counts against published manifest version and block dispatch when unresolved. Keep checks easy to repeat without overwriting already committed evidence. |
| Trip and stop detail | Driver; absent | Show only assigned work, arrival window, contact permission, ordered stops and event actions. Require a clear distinction between locally pending and server-recorded events. |
| Capacity/prediction detail | Dispatcher; deferred | Show forecast/prediction only with date, model version and limitations; use available/unavailable states. Add after the operational cycle works and only if consistent with submitted design. |

Each rationale is a design intention, not a claim of user research. The Designathon deliverable must still include a high-fidelity prototype, named degradation pages, per-role personas/flows and a 3-5 minute walkthrough (K20-K21); these Markdown documents alone do not replace those artifacts.

## Visual system

Preserve existing dark navigation/light content/orange action identity while consolidating conflicting values. Current observed tokens include sidebar `#161A1D`, page `#F9FAFB`, card `#FFFFFF`, primary orange `#F97316`, hover `#EA580C`, text `#202D2D`, secondary text `#485563`, muted `#64748B` and border `#CBD5E1`. Some components use `#FF6600`; choose a single reviewed token after contrast checks. Existing green text on pale blue badges is a contrast risk to measure, not an approved palette.

Use the existing system-sans stack unless the actual prototype requires a bundled font. Current Poppins declarations lack an observed font load and are not reliable evidence of rendered typography. Proposed scale: 14-16px body/forms, 12px secondary labels, 20-28px page headings; consistent 4/8px spacing, 8-12px card radii and 44px touch controls. Test measured contrast; do not assume orange/white body text passes.

Status combines text, icon and color: unresolved, assigned, deferred, loading, ready, in transit, receipt pending, complete and issue. Never rely on color alone or use green for a pending/unverified state. Unavailable vehicle explanations name the rule and a valid next action.

## Responsive and accessibility behavior

- Desktop dispatcher: queue/detail split with sticky context and review action. Tablet: collapsible queue. Phone: one pane at a time, explicit Back, persistent selected entity, and bottom action area that does not cover content.
- Store/loader/driver: single-column phone layouts; key identifiers and status first, optional detail collapsible. Convert wide comparison tables to accessible cards or labeled scroll regions. Remove fixed sidebars from mobile content flow.
- Test 360px, 390px, 768px and 1440px widths, portrait/landscape, 200% zoom and long identifiers. Avoid fixed `100vh` sidebars consuming the small-screen viewport; account for mobile browser UI and safe areas.
- Native buttons/links for interaction; visible focus; labels tied to controls; errors tied with descriptive IDs; appropriate live region for save/sync status. Dialogs require name, focus trap, Escape/cancel, focus restoration and background inertness.
- Signature entry needs an accessible explicit attestation alternative defined by product policy. Store the chosen method, actor/time and consent; a fixed default name is not an acceptable substitute. Legal acceptance is not asserted by this brief.
- Reduce animation for motion preference. Do not place critical meaning in tooltip-only or hover-only content. Loading, empty, no-results, permission-denied, stale-data, offline and failure states are designed for every core screen.

## Primary degradation design: unavailable reefer/van

Show a persistent banner identifying failed vehicle, affected run version and orders. The dispatcher view shows remaining eligible capacity and blocked reasons; the store view shows the actual consequence and next review time; loader/driver views identify revoked or revised manifests before work starts. This creates one coherent event across four faces of the same system.

Recovery sequence: inspect impact -> attempt validated reassignment -> record deferral if no fit -> review/publish revision -> notify -> acknowledge. Preserve draft during failed submit, show stale-version conflict, retry notifications independently, and escalate already-started trips as incidents. Required final state is a safe committed decision with accountable history, not a success toast alone.

## Content and acceptance checklist

Use "Order received; awaiting planning" after intake. Use "Deferred; next review [time]" when no confirmed date exists. Use "Saved on this device; awaiting sync" for a durable offline queue only after that queue is implemented. Never display Live Sync, guaranteed delivery, submitted evidence or automatic routing changes without corresponding verified backend state.

Review against K22: problem framing 25%, context fidelity 20%, visual/interaction coherence 15%, restraint 15%, degradation quality 15%, domain accuracy 10%. Validate with the four-role walkthrough, keyboard/mobile tests and source-derived constraint examples. Document every significant difference from the Day-5 design in the project README once that baseline is available.
