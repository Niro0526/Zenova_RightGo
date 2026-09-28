# Implementation Plan

Version 1.0, 2026-09-28. **Planning only; no implementation is authorized or performed in this review.** Documents describe intended work for a later implementation request. Estimates are relative work packages, not a promise that the current scaffold can meet an imminent deadline.

## Delivery order and ownership

Use role owners until named team members are assigned: product lead, frontend lead, backend lead, data/ML lead, QA lead and deployment owner. One person may cover multiple roles; team eligibility remains a separate B4 obligation. Do not infer staffing or availability.

| Phase | Owner / dependency | Work package | Exit evidence |
|---|---|---|---|
| 0. Baseline reconciliation | Product lead; these documents | Part One and the ML task/scoring definitions are now available in `Rules/Challenge Booklet.pdf` (see [source register](SOURCE_REQUIREMENTS.md)); still obtain the Day-5 design; confirm dates and scope; classify prototype departures; decide receipt-evidence policy (fuel-quota and delivery-window policy are now booklet-specified, not open decisions — see below); assign owners | U01-U09 decision log with source/version; approved scope and no hidden policy assumptions |
| 1. Reproducible foundation | Backend + deployment; phase 0 stack choices | Keep `Client/` and `Server/` naming; implement app entry/configuration/health; pin dependencies; correct container contexts/standalone output; define complete local Supabase stack and migration/seed ordering | Fresh root Compose startup; healthy services; repeatable stop/restart; explicit dev/demo config |
| 2. Schema and identity | Backend; phase 1 | Implement schema, constraints, restricted DB role, RLS, Supabase Auth verification, profiles/memberships, admin provisioning, seed accounts and validated official references | Migration from empty DB; seed rerun safe; API + DB role/scope allow/deny tests; no browser privilege secrets |
| 3. Order vertical slice | Backend + frontend; phase 2 | Typed DTOs/API client; login; outlet-scoped order list/create/detail; units/conversions, eligibility policy, closure persistence; idempotency/audit/outbox | Store submits; dispatcher sees identical record in another session; reload retains it; invalid units/scopes rejected |
| 4. Planning engine and review | Backend + data + frontend; phases 2-3 | Checker-parity validator; all rule explanations; transactional assignment/defer; coverage/counts; fairness inputs; trip aggregates; versioned publication/revision; real CSV export | Valid S1 export passes C; every invalid-rule fixture rejected; concurrent capacity tests pass; reasons/vehicle/trip persist |
| 5. Physical execution | Backend + frontend; phase 4 | Loader manifest/count checks; discrepancy hold and dispatcher resolution; driver trip/stop events; real receipt lines/attestation/private evidence | Complete four-role cycle plus loading mismatch; no clean receipt on inconsistent counts; scoped private evidence tests |
| 6. Degradation and mobile | Frontend + QA; phases 3-5 | Capacity-loss workflow, 409 recovery, timeout retry, truthful notification/sync states, shared responsive shell, keyboard/dialog fixes; durable offline queue only if included | One detailed all-role failure recovery; phone/keyboard checks; duplicate retries produce one event; no fabricated schedule |
| 7. Intelligence | Data/ML; phase 0 labels + phases 1-2 data provenance | Profile/join data; temporal baseline; training/validation; feature availability checks; Task1/2A predictions; Task2B objective refinement; bounded serving/fallback; artifacts/notebooks/disclosure | Reproducible run, exact CSV key coverage, model checksums and actual metrics; K36 restrictions met |
| 8. Release and demonstration | QA + deployment + product; phases 1-6, phase 7 where included | Full tests, CI gates, public TLS deployment, backup/restore rehearsal, seeded demo reset, videos and README departures; freeze reviewed commit | Clean deployment from documented instructions; public multi-role walkthrough; release evidence and submission bundle |

This sequence deliberately completes a thin shared workflow before optional analytics. All four designed operational roles and required failure handling remain part of the Hackathon completion gate; reducing scope must be an explicit product decision with design-departure documentation.

## Existing findings mapped to work

| Findings | Required treatment |
|---|---|
| F01-F04 | Phases 1-2: backend, infrastructure and real access control |
| F05-F06, F12 | Phase 4: authoritative rule engine, persisted decisions and dataset-consistent counts |
| F07, F09-F11, F17 | Phases 3-5: canonical DTO/state mapping, real manifests, conversions and notifications |
| F08, F13 | Phase 5: loader/driver cycle and complete receipt records |
| F14-F15 | Phase 6: responsive layout and accessibility verification |
| F16 | Documentation corrected in this review; future design-baseline comparison still pending |
| F18 | Phase 7: generate validated outputs; do not submit instructional templates |

## Decisions to close before dependent code

| Decision | Owner | Dependent work |
|---|---|---|
| Official challenge and role/device conditions | Product lead | All domain-compliance claims and persona validation |
| Submitted design and departure log | Product + frontend | Screen scope/fidelity acceptance |
| 16:00 cutoff, eligible date, holiday behavior | Product + backend | Order validation/calendar boundary tests |
| Priorities, fairness objective, fuel/time/mall rules | Product + data | Operational validator and Task2B objective |
| Whole-order vs temperature split semantics | Product + backend | Live order/execution schema; Task2B remains indivisible |
| Service-duration and lateness targets, scoring, deferred-row policy | Data lead | Labels, validation metrics and final model selection |
| Receipt attestation/evidence and retention policy | Product + security/deployment | Receipt UX, privacy, storage cleanup/backups |
| Hosted environment, region, budgets and support owners | Deployment owner | Production sizing, recovery objectives and support schedule |

Documentation completion does not resolve these external questions. Use configurable policy with versioned provenance; never treat an unknown official rule as permission to invent a favorable assumption.

## Competition packaging checklist

**Designathon (K20-K23):** personas for each designed role; flows and rationale per screen; at least one named/justified detailed degradation screen; high-fidelity share link; 3-5 minute walkthrough; AI disclosure; one design file with distinct pages inside `TeamName_Designathon.zip`. Tradeoff explanation/style guide are optional. These docs support, but do not replace, the design artifact.

**Hackathon (K28-K29):** GitHub monorepo `TeamName_SolutionName`; public URL; seeded account per role; root Compose with complete stack/database/seed; `.env.example`; architecture and data model; README setup/configuration/accounts/walkthrough/design departures; 5-8 minute unlisted YouTube walkthrough of all roles plus code/architecture; AI disclosure. No late code; keep deployment online through the required review period and later rounds if advanced.

**Datathon (K34-K36):** model/preprocessing/deployment diagrams; analysis/preprocessing rationale; final `.h5` or `.pkl`; all notebooks with `TeamName_FinalNotebook.ipynb`; validated task outputs when required by detailed brief; 3-5 minute unlisted video; AI disclosure; `TeamName_Datathon.zip`. A serializer's filename alone is not a validated trained model. Pretrained-model, proprietary preprocessing API and automated modeling restrictions remain in force.

## Schedule evidence and risk

Dates are source-reported 2026 Sri Lanka times, not verified organizer updates. B5/K11 show Designathon 29 Sep, while K21 prints Tue 8 Sep at 23:59. Confirm the conflict. K29 states Hackathon 4 Oct 23:59; K35 Datathon 9 Oct 23:59. K11 adds semifinalist announcement 15 Oct, semifinals 20-22 Oct, finalist announcement 23 Oct and finale 30 Oct. General missed-deadline sanctions also conflict (B4 vs K13).

As of this review (28 Sep), the gap between the prototype and deployable four-role system is substantial. Track completion evidence by phase rather than claiming a finished system from frontend screenshots. Dependencies, access/security, missing domain source and deployment reproducibility are the critical path. Do not schedule automatic submission, public deployment or code changes from this plan.
