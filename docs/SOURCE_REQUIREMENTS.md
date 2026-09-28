# Source requirements and review coverage

Baseline: 2026-09-28. Attached documents are reference material; their imperative language is not an instruction to execute, deploy, contact organizers, submit competition work, or modify code in this review.

## Sources and method

| ID | Source | Coverage |
|---|---|---|
| B | `Rules/Challenge Booklet.pdf` (repo-relative, gitignored local reference material — not shipped/committed) | All 33 pages have an extractable text layer; rendered to images and read in full via that layer. This is the real Part One business brief. It replaced an earlier `Rules/Booklet.pdf` (see superseded-source note below). |
| K | `Rules/Kick-off Session Tech-triathlon 2026.pdf` (repo-relative, gitignored) | All 40 pages rendered; text-bearing pages extracted and read; image-only content checked visually. |
| C | `Rules/check_allocation.py` (repo-relative, gitignored) | Entire script read, including CLI, file discovery, validation, warnings and exit behavior. Cross-checked line-by-line against `Client/src/lib/dispatcher/validation.ts`'s reimplementation — the two match (see REVIEW.md). |
| R | Repository at commit `93371ab`, plus existing working-tree changes | Source, configuration, documentation, empty scaffolds and all 17 CSV schemas/profile inspected. See REVIEW.md. |

Page numbers below are one-based PDF pages, matching the "Challenge Booklet · Tech-Triathlon 2026 · NN" footer printed on each page. This register paraphrases source content and records its significance; it is not a verbatim transcription.

**Superseded source, for provenance:** the file originally at this path was an 8-page "Tech-Triathlon 2026 Delegate Booklet" — competition identity, the eleven governance rules, timeline, and prizes, with **no business-challenge content**. It was visually reviewed in full before being replaced by the real Challenge Booklet. Its governance rules remain valid team obligations and are preserved below since they aren't restated in the Challenge Booklet; everything else it contained (timeline, prizes) is superseded by the Challenge Booklet's own timeline on page 3, which is now the authoritative copy.

### Superseded delegate-booklet governance rules (still-valid team obligations)

1. Applicants must reside in Sri Lanka.
2. Participants must be enrolled undergraduates at a recognized university; enrollment evidence may be requested at any point.
3. Teams contain 3-9 members.
4. Membership changes are allowed during registration with written notice; replacement members must qualify. Changes after registration deadline are not accepted and may disqualify a team.
5. Deadlines are announced before rounds; missed submissions may cause point deductions or disqualification. This differs from K13; see conflicts.
6. Work must be original and not previously published or exhibited.
7. Teams retain submission rights; Rootcode may showcase selected work with team credit.
8. Finalists present to judges and an audience.
9. Cheating, plagiarism or rule violations cause disqualification.
10. A team containing a member of the previous year's top-three winning teams is ineligible.
11. Participation accepts competition rules and final, binding judging decisions.

## Challenge Booklet page ledger (the real Part One brief)

| Page | Content and disposition |
|---|---|
| B1 | Cover: "Challenge Booklet." |
| B2 | Contents page — confirms the structure cited throughout this register (business problem p4, operating constraints p5, four roles p6, objective/datasets p7, Designathon p8-10, Hackathon p11-13, Datathon p14-23, data reference p24-31, submission links p32). |
| B3 | **How the competition works & Waypoint Group.** One brief and all datasets released Day 1 (Fri 25 Sep 2026, 12:01 AM SLT); Designathon deadline Day 5 (Tue 29 Sep, 11:59 PM); Hackathon deadline Day 10 (Sun 4 Oct, 11:59 PM); Datathon deadline Day 15 (Fri 9 Oct, 11:59 PM). Missing a phase scores zero for it but doesn't disqualify; all three phases weigh equally. **Waypoint Group (Pvt) Ltd** — fictional Sri Lankan retail group, three brands sharing one distribution network: Fresh (80 outlets, daily chilled/ambient groceries, before-8AM delivery), Style (25 outlets, weekly hanging-garment/carton deliveries with seasonal peaks), Tech (15 outlets, as-needed heavy/fragile appliances) = 120 outlets total. Distribution center at Peliyagoda, regional hub at Kandy. 60 vehicles: 12 refrigerated trucks, 40 dry-box trucks, 8 vans (4 refrigerated) = 16 chilled-capable vehicles total. |
| B4 | **The business problem.** Brands compete for the same capacity; Fresh needs pre-8AM arrival, chilled needs reefer, some outlets are van-only; Style fills volume before weight; Tech is heavy/fragile/variable demand. Dispatchers must allocate under outlet access, delivery windows, and weekly fuel quotas, and decide/explain deferrals. Fresh outlets can have **two orders on the same delivery day** (separate dry + chilled orders); Style orders weekly; Tech orders as-needed. **Order cutoff is 4 PM daily** — orders after cutoff wait for the next run. Today's process is spreadsheets, phone calls, printed run sheets, no shared progress visibility, no deferral record, no feedback loop, unpredictable demand, no service-time/lateness prediction, and unreliable field connectivity requiring offline-capable work with reconciliation on reconnect. |
| B5 | **Operating constraints.** Vehicles: weight AND volume limits both apply; only reefer vehicles carry chilled/frozen (reefer may also carry ambient; ambient vehicles cannot carry chilled); weekly fuel quota consumed by route distance; max 2 routes/day per vehicle; Mon-Sat operation; driver availability isn't a separate allocation constraint. Outlets: delivery windows (Fresh before 8AM, individual outlets may differ); mall outlets have fixed access windows; `van_only` outlets block trucks; unloading varies by dock type (rear dock / curb / mall bay). Demand: paydays/festivals/weekends/monsoon affect demand or travel time (`calendar.csv`); when demand exceeds capacity the dispatcher records which orders defer and why. Connectivity: coverage drops in hill country/Kandy corridor/rural districts; offline work must reconcile on reconnect. |
| B6 | **The four user roles**, with working conditions and needs — this is the canonical persona source, superseding any provisional/inferred personas elsewhere in this documentation set. **Dispatcher**: large screen, Peliyagoda planning office, stable connectivity; needs delivery-progress visibility after vehicles leave, and to explain deferrals/identify already-skipped outlets. **Loader**: Peliyagoda **or Kandy** warehouse dock, shared tablet/terminal, printed lists go stale on replan; needs stop sequence and a way to flag missing/damaged items before departure. **Driver**: personal phone, on the road, currently paper run sheet + calls; needs delivery-outcome/proof-of-delivery recording and offline recording with sync on reconnect; interactions must be safe to do only when stopped. **Store manager**: outlet counter, desktop or phone, orders currently placed by phone/message with no confirmation; needs an expected arrival time and clear deferral notice, plus receipt confirmation and issue reporting. |
| B7 | **Objective, workflow, shared datasets.** Connect ordering → planning → loading → delivery → receipt across all four roles. Workflow table: Place order (Store) → Close orders (Dispatcher) → Plan/allocate (Dispatcher) → Load (Loader) → Deliver (Driver) → Confirm receipt (Store) → Plan future capacity (Dispatcher, using demand forecasts). All three phases share the same 120 outlets/60 vehicles/2 depots/calendar (`outlets.csv`, `vehicles.csv`, `calendar.csv`). All competition data is synthetic. |
| B8-10 | **Designathon** (due Day 5). Design screens for all four roles including >=1 fully detailed degradation/failure screen, named and justified for Waypoint's operation. Deliverables: personas, screen flows with one-paragraph rationale each, degradation screen(s), high-fidelity prototype, 3-5 min demo video, AI disclosure, optional core-tradeoff page and style guide. Judging: problem framing 25%, user-context fidelity 20%, degradation quality 15%, domain accuracy 10%, scope/prioritization 15%, visual/interaction design incl. cross-role consistency 15%. Submit `TeamName_Designathon.zip` + prototype link + video link via the Designathon form (`forms.gle/H6dqUZP6pXdGC8Go8`) by Tue 29 Sep 2026, 11:59 PM SLT. |
| B11-13 | **Hackathon** (due Day 10). Build the Designathon design faithfully. Every submission: responsive web app, all four roles completable end-to-end (planning through loading/delivery to receipt), driver/loader assessed at phone size, native apps optional. **The system itself (not just the Task 2B checker) must respect capacity, temperature, outlet access, delivery windows, AND fuel quotas** — any allocation approach (automatic/assisted/manual+validation) is acceptable as long as the result respects these and identifies deferred orders. README needs a numbered judge walkthrough across all four roles from a fresh seeded install. Deliverables: deployed URL + one seeded account per role; GitHub monorepo `TeamName_SolutionName` with README (setup/accounts/walkthrough/departures), root `docker compose up`-able stack + `.env.example`, a `docs/` folder with architecture diagram + data model + AI disclosure; 5-8 min demo video (all four roles + code/architecture walkthrough). Judging: functional completeness 20%, planning/allocation engine 20%, degradation/offline/recovery 10%, Day-5 fidelity 10%, engineering quality/architecture 25%, creativity 5%, demo video 10%. Submit via `forms.gle/WurHAKjbq2XEZQhbA` by Sun 4 Oct 2026, 11:59 PM SLT; late pushes not considered; keep the deployment live through review/semifinal/finale. |
| B14-23 | **Datathon** (due Day 15), judged separately from the Hackathon — no integration required. Task 1: predict `pred_service_min` and `pred_late_prob` per `delivery_id` in `task1_test_inputs.csv`/`route_legs_test.csv`; labels aren't supplied, must be constructed and reasoning documented. Task 2A: forecast `pred_total_volume_m3` and `pred_chilled_volume_m3` per depot/brand/week for 10 future weeks (`task2a_test_inputs.csv`); count every order incl. deferred/not-run; only Fresh has chilled demand. Task 2B: peak-day (scenario S1, Peliyagoda) fleet allocation — this is the task `check_allocation.py` and this app's dispatcher module both implement; see the C-register below for exact rules and the worked trip-time example on booklet p20-21 (Gampaha 3-stop Fresh trip = 37+18+15+15+16 = 101 min; confirmed matching `computeTripDuration` in `validation.ts`). No pretrained models (except synthetic data gen/preprocessing); no proprietary preprocessing APIs; no low/no-code or fully-automated modeling tools. Deliverables: architecture diagrams, preprocessing write-up, model file(s), `TeamName_FinalNotebook.ipynb`, `submission_task1/2a/2b.csv`, written Task-2B prioritization policy (~1 page), 3-5 min demo video, AI disclosure. Judging: data wrangling/label construction 20%, model/architecture 25%, performance (Task 1/2A) 20%, Task 2B feasibility+policy 15%, creativity 10%, demo video 10%. Submit `TeamName_Datathon.zip` via `forms.gle/CcPPmttWdQgHvUdi6` by Fri 9 Oct 2026, 11:59 PM SLT. Data confidentiality terms (p22): datasets are for competition use only, must not be shared/published/uploaded to third parties or external sites — see the tracked-`data/` finding in REVIEW.md. |
| B24-31 | **Datathon data reference** — full column dictionaries for `deliveries_train.csv`, `route_legs_train/test.csv`, `outlets.csv`, `vehicles.csv`, `calendar.csv`, `district_travel.csv`, `service_allowance.csv`, `traffic_speed.csv`, `road_conditions.csv`, and the two `task2b_peak_day_*.csv` files, plus submission-template filenames. All consistent with the columns already profiled in this repo's `data/` (byte-identical content to `Rules/data/`, verified). Confirms `check_allocation.py` is the Task 2B validator ("passing confirms feasibility, not optimality"). |
| B32-33 | Submission form links (repeated per phase) and closing thanks/contact. |

## Kickoff page ledger

| Page | Content and disposition |
|---|---|
| K1 | Rootcode branding, trust-focused slogan and website. |
| K2 | Kickoff title. |
| K3 | Introduction: Channuka Jayatilaka, Associate - Branding & Marketing at Rootcode. |
| K4 | Rootcode logo. |
| K5 | Trust-focused slogan. |
| K6 | Engineering, UX design and AI combined in one competition. |
| K7 | Theme: The Intelligent Enterprise. |
| K8 | Image-only participation figures: 170+ teams, 1,100+ participants. Context only. |
| K9 | Phase introduction. |
| K10 | Timeline title. |
| K11 | Image-only timeline agrees with B5 and adds semifinalist announcement 15 Oct and finalist announcement 23 Oct. |
| K12 | Competition rules title. |
| K13 | One business challenge across phases; brief and datasets released on day one; original unpublished work; missed phase scores zero but continuation allowed; three phases weighted equally; languages/frameworks/IDEs/AI tools free to choose with disclosure; Sri Lanka time UTC+05:30. |
| K14 | Same three prizes as B6; internship pathways, winner exposure, certificate, career support and consultation. |
| K15 | Designathon title. |
| K16 | Introduction: Dhanushka Liyanage, Associate Lead UX Designer at Rootcode. |
| K17 | Solve Part One as one operation and one coherent system with role-specific faces. Product thinking and deliberate scope matter. Number and content of screens are team decisions. Part One itself is not embedded in this slide — it is now available separately as `Rules/Challenge Booklet.pdf` p3-7. |
| K18 | Restraint is judged. Design job-enabling screens, including a bad-day screen; focused rationale is preferred over excessive scope. |
| K19 | At least one fully detailed failure/degradation scenario, named and justified for Waypoint's operation; depth and recovery quality matter more than count. |
| K20 | Personas per role; screen flows with a paragraph of rationale per screen; named/justified degradation screens; demo video; high-fidelity prototype; optional core-tradeoff page/diagram; optional style guide; AI disclosure. |
| K21 | One design file with distinct pages for personas/flows/rationale/degradation, `TeamName_Designathon.zip`; shareable Figma/Framer/web prototype; 3-5 minute explainer; submit file, link and video together via form still marked to-be-shared. Prints Day 5, Tue 8 Sep, 11:59 PM IST. Conflicts with B5/K11. |
| K22 | Design scoring: framing 25%, user-context fidelity 20%, visual/interaction design including cross-user coherence 15%, restraint/prioritization 15%, degradation quality 15%, domain accuracy 10%. |
| K23 | Design judged as submitted on Day 5. Hackathon development may continue; significant departures belong in README. Explain which work was AI-assisted, which was not and how assistance was used. |
| K24 | Hackathon title. |
| K25 | Introduction: Krishan Samarawickrama, Senior Technical Lead at Rootcode. |
| K26 | Build the designed solution as working, deployable, responsive web software. |
| K27 | Day-5 design is the specification; demonstrate a complete cycle touching every designed role; mandatory web app tested at phone size for mobile roles; native apps optional; runnable plans must respect operating constraints; document design departures. |
| K28 | Public working URL and one seeded account per role; GitHub monorepo `TeamName_SolutionName`; README setup/configuration/accounts/walkthrough/departures; root Docker Compose starts complete stack including seeded database and `.env.example`; architecture/data model; 5-8 minute unlisted YouTube demo including roles plus code/architecture; AI disclosure. |
| K29 | Day 10: Sunday 4 October, 11:59 PM IST; submit repository, deployed URL, seeded credentials and demo link; late pushes excluded; keep deployment live through review and later rounds if advancing; understand/explain/own every submitted line despite AI assistance. |
| K30 | Datathon title. |
| K31 | Introduction: Gajithira Puvanendran, Senior Data Scientist at Rootcode. |
| K32 | Data-to-insight and actionable intelligence framing. |
| K33 | Expected capabilities: data expertise, pipeline development, architectural design, end-to-end solutions and strategic thinking; more than model building alone. |
| K34 | Model/preprocessing/deployment diagrams; preprocessing/analysis rationale document; final `.h5` or `.pkl` model; all experiment/preprocessing notebooks with best named `TeamName_FinalNotebook.ipynb`; 3-5 minute unlisted YouTube explanation of architecture, preprocessing and challenges; AI disclosure. |
| K35 | Day 15: Friday 9 October, 11:59 PM IST; one deliverable folder compressed as `TeamName_Datathon.zip`, uploaded to submission form. |
| K36 | Form closes at deadline. Pretrained models restricted except data generation/preprocessing. Proprietary API preprocessing prohibited and affects scoring. Low/no-code AI and fully automated end-to-end modeling tools restricted. General AI permission does not erase these phase-specific restrictions. |
| K37 | Judging dimensions: data wrangling, model/architecture implementation, performance, original thinking, demo video. No numeric weights or task scoring formulas supplied here. |
| K38 | Good-luck closing. |
| K39 | Image-only Q&A title; no answers/transcript supplied. |
| K40 | Thanks. |

## Allocation checker: exact behavior register

| Rule | Observed rule in C | Documentation/test implication |
|---|---|---|
| C01 | Recursively locates reference CSVs under a `data` directory adjacent to the script, returning the first filename match. | Preserve shipped paths and avoid duplicate filenames. The supplied Rules folder lacks that data directory; repository data must be staged beside an unchanged checker or injected in a read-only review harness. |
| C02 | Required columns: `scenario,order_ref,decision,vehicle_id,trip_id`. | Additional columns allowed. `outlet_id` is not validated from submission. |
| C03 | Exactly one row for every scenario/order pair; rejects duplicate, unknown or missing pairs. | Whole order is served or deferred; no split allocations in this CSV contract. |
| C04 | Decision must be nonblank and exactly `served` or `deferred`. | Case/whitespace variants are not normalized by the checker. |
| C05 | Deferred rows with vehicle/trip identifiers warn; identifiers are ignored. | Export blanks for deferred identifiers even though the checker only warns. |
| C06 | Served rows require known vehicle and nonblank trip; trip is coerced numeric and must equal 1 or 2. | Numeric `1.0`/`2.0` may pass; use integer export. No requirement to use trip 1 before trip 2. |
| C07 | Only scenario/vehicle pairs whose fleet status equals `available` are eligible. | A missing fleet pair also fails, despite the error text saying workshop. |
| C08 | Each scenario/vehicle/trip group has one depot matching the vehicle, one brand, one district. | Atomic group-level constraints. |
| C09 | Any chilled order requires `vehicle.temp == reefer`. | Ambient cargo is not prohibited in a reefer. |
| C10 | Any `van_only` order requires vehicle type `van`. | Evaluate all orders in a trip. |
| C11 | Trip sums of weight and volume must not exceed vehicle capacities plus `1e-6`. | Both dimensions mandatory; equality allowed. |
| C12 | At most two distinct trips per vehicle per scenario. | The 1/2 ID validation also enforces the maximum. |
| C13 | Duration = depot-to-district free-flow minutes + `(number of rows - 1) * inter-stop free-flow minutes` + sum of brand/dock service allowances. Empty list duration is zero. | Counts rows, not distinct outlets. No rounding before validation. |
| C14 | Sum of Fresh trip durations per scenario/vehicle <=270 min (03:30-08:00); sum of all other-brand durations <=480 min; both allow `1e-6` tolerance. | These are separate cumulative budgets, not per-trip budgets or a single 750-minute constraint. Daytime start/end is not defined. |
| C15 | Mixed-brand/district trips are already failed and skipped in duration calculation. | Do not interpret skipped calculation as valid duration. |
| C16 | Return 0 on success, 1 on submission read/validation failure, 2 for wrong CLI argument count; reports up to 40 feasibility errors. | Reference lookup failure exits; malformed reference data may raise an exception. Warnings do not fail. |
| C17 | `--example` is parsed and passed, but does not change reference loading or checking. Other `--...` arguments are filtered out of positional args. | Do not promise an example mode or strict unknown-option validation. |

**Not checked by C:** route stop sequencing, individual arrival/service windows, mall windows, return-to-depot travel, turnaround/loading time, actual driver overlap, fuel quotas, safety/temperature measurements, fairness, priority, days-since-service, minimum served count, optimality or prediction quality. An all-deferred complete submission is feasible under the checker. The app must not describe checker feasibility as complete operational or scoring compliance.

**Phase-scope distinction (booklet p12, Hackathon deliverables):** `check_allocation.py` grades the *Datathon Task 2B* submission against exactly C01-C17. The *Hackathon* requirement is broader — "the system itself... must respect capacity, temperature requirements, outlet access, delivery windows, and fuel quotas" for the working app, not just the checker's rule set. This app's dispatcher Planning workspace (`Client/src/lib/dispatcher/validation.ts`) faithfully implements C01-C17 (verified against the real script) but does not yet evaluate delivery-window or fuel-quota constraints — these remain explicit, labeled policy gaps (`POLICY_GAPS` in that file) rather than silently-passed checks. Treat "checker-feasible" and "meets the Hackathon's operating-constraint requirement" as two different, non-interchangeable claims.

## Dispatcher operational checks added 2026-09-28 (beyond the C01-C17 checker)

`check_allocation.py` never evaluates delivery windows, fuel quotas, or trip-timing overlap (see the "Not checked by C" note above) — the Hackathon requirement is broader than the Datathon checker (booklet p11-12). As of this audit, `Client/src/lib/dispatcher/validation.ts` implements three real, partial operational checks for these, replacing the two permanently-informational `POLICY_GAPS` rows that previously existed. All three can resolve to `unverified` (blocks release, same as `checker_fail`) until a dispatcher-captured input is supplied — they are never silently assumed.

| Rule | What it checks | Resolvable via | Documented assumption |
|---|---|---|---|
| `DELIVERY_WINDOW` | A sequential per-stop schedule (arrival = cumulative travel; service starts at `max(arrival, window_open)`, so an early arrival waits rather than fails; a stop's wait+service carries forward into every later stop's arrival; arriving after `window_close` is a real failure). Mall orders are additionally checked against `mall_window`. | Dispatcher sets a trip's `plannedDepartureTime`. Fresh trips are pre-filled with a suggested `03:30` (sourced from the booklet's stated 3:30–8:00 Fresh window) but the stored, editable value is what's actually used — never a hidden constant. | None beyond the Fresh-only suggested default; Style/Tech get no default since no source specifies one. |
| `FUEL_QUOTA` | A new stop-based (unique-outlet, not order-row) operational distance formula — `depot_to_district_km + inter_stop_km × (stops − 1) + depot_to_district_km` (a real return leg) — converted to liters via `km_per_l`, added to a dispatcher-confirmed prior weekly usage figure, compared to `weekly_fuel_quota_l`. | Dispatcher explicitly confirms a prior-weekly-usage number per vehicle (including confirming `0` — a real answer, distinct from never having answered). Defaults to `null`/unconfirmed, never a silent `0`, since no supplied dataset carries this figure. | Return leg assumed symmetric to the outbound leg via the same `district_travel` row — no separate return-distance field exists in any source. |
| `TRIP_OVERLAP` (app-only; not a C-rule at all, not even "not checked by C" — it's a new operational concept) | Trip 2 must not depart before Trip 1's estimated return, where the return estimate = Trip 1's real stop schedule (including wait/service, from the `DELIVERY_WINDOW` simulation) + a return-to-depot travel leg + `ASSUMED_TURNAROUND_MIN` (a named, documented 20-minute constant — no source specifies vehicle turnaround/reload time between a day's two trips). Deliberately does **not** reuse the 270/480-minute Task-2B scoring budgets as a return-time estimate — those are a different number for a different purpose, and the booklet's "budgets already allow for the return leg" statement (C14 note above) is about that scoring context only. | Dispatcher sets both trips' `plannedDepartureTime`. | `ASSUMED_TURNAROUND_MIN = 20` minutes, stated as a modeling choice, not derived from anything. |

Distinct from `computeTripDuration` (Part A, checker-parity, row-based, single depot leg, untouched by this work): the operational distance/schedule functions above are stop-based (two order rows delivered at one outlet are one physical visit, not two driving legs) and return-leg-aware. The two formulas must never be substituted for one another — `computeTripDuration` still scores Task-2B exactly as `check_allocation.py` does; the operational functions answer a different, real-world question the checker was never asked.

Order intake (`validateOrderIntake` in the same file) is a separate, unrelated live-derived check (weight/volume/units > 0, window_open < window_close, mall orders carry a `mall_window`) feeding the Orders page's Confirmed/Needs Correction badge — kept visually and structurally distinct from both the checker rules and the three operational rules above, since it answers "is this order record well-formed," not "is this allocation feasible."

## Conflicts, assumptions and unresolved inputs

| ID | Evidence | Resolution in this documentation |
|---|---|---|
| U01 | **Resolved.** The real Challenge Booklet (`Rules/Challenge Booklet.pdf`, p3-7) supplies the Part One business brief that B/K17/K27 reference. | Business problem, operating constraints, and the four roles are now sourced from booklet p3-7, not inferred. Only the Day-5 design artifact (U04) remains genuinely missing. |
| U02 | Challenge Booklet p3 gives Designathon deadline as Tue 29 Sep 2026, 11:59 PM, internally consistent with Day1=Fri 25 Sep; the kickoff deck (K21) says "Tue 8 Sep." | Per this task's instruction to prefer the full Challenge Booklet as primary reference absent an explicit later organizer correction: treat **29 Sep** as authoritative. Kickoff's "8 Sep" is recorded as a conflicting, likely-stale source, not corrected silently. |
| U03 | B4 deadline sanctions differ from K13 zero-score/continue. | Preserve both and confirm with organizer; no interpretation of which supersedes the other. |
| U04 | Day-5 design file/prototype not present. | UI review is code-based; fidelity remains unverified. This is the one Part One-adjacent gap that is *not* resolved by the Challenge Booklet. |
| U05 | Dataset output columns indicate service-duration/lateness prediction and weekly total/chilled volume; the Challenge Booklet (p15-17) now gives the exact target definitions (`pred_service_min`, `pred_late_prob`, `pred_total_volume_m3`, `pred_chilled_volume_m3`) and label-construction rules, but no official scoring formula. | Preserve CSV contracts; label semantics are now booklet-confirmed. Scoring formula/weights beyond the stated judging-criteria percentages remain unconfirmed. |
| U06 | **Partly resolved.** Booklet p4 confirms the 4 PM order cutoff and that Fresh outlets can carry two same-day orders (separate dry + chilled) as real business rules, not code guesses. Still unconfirmed: any Fresh-over-Style/Tech deferral *priority*, and the specific "+4°C" chilled setpoint shown in store-manager mock copy (the booklet only distinguishes `chilled`/`ambient`, no degree value). | Cite booklet p4 for cutoff-time and dual-order-per-day behavior going forward. Keep deferral-priority ordering and the specific temperature figure flagged as UI-invented, not sourced. |
| U07 | User specifies Supabase PostgreSQL; K28 requires root Compose complete stack with seeded DB. | Propose hosted Supabase for production plus local self-hosted Supabase dependencies through root Compose. Remote DB alone does not meet the local reproducibility requirement. |
| U08 | Booklet p3 confirms "Waypoint Group (Pvt) Ltd" as the fictional client/operation name; product/code independently use RightGo/PULSE as the team's own solution name, plus a non-canonical "Living" brand in store-manager mock data. | Both namings are now confirmed-intentional and distinct: Waypoint = the brief's client, RightGo = this team's product. CSV canonical brands remain Fresh/Style/Tech; "Living" stays flagged as non-canonical demo content, not official reference data. |
| U09 | No hosting project, credentials, public URL, named maintainers, recovery budget or retention policy supplied. | Provide proposed procedures and role owners; environment-specific readiness is pending. |
| U10 | Root `data/` (17 CSVs, the same competition-confidential dataset now also vendored at `Rules/data/`) is tracked in git and not covered by `.gitignore`, while the Challenge Booklet (p22) prohibits sharing/publishing/uploading these datasets to third parties. The repo's `origin` remote is `github.com/Niro0526/Zenova_RightGo.git`; this session has no way to check that repo's visibility (private/public). | Flagged, not fixed, in this pass — remediation (stop future tracking, confirm remote visibility) is a decision for the repo owner; git history must not be rewritten without an explicit separate instruction. See REVIEW.md. |

## Requirement destinations

| Source requirement | Documents responsible |
|---|---|
| B2-B4, K13, K23 disclosure/originality/continuity | PRD, Implementation Plan, AI Disclosure |
| K17-K22 roles, rationale, degradation, prototype and scoring | PRD, App Flow, UI/UX Brief, Test Plan |
| K26-K29 complete cycle, responsive web, deployability, seeds | TRD, Backend/API, Deployment Guide, Test Plan |
| C01-C17 operational allocation contract | PRD, TRD, Backend/API, Test Plan, Operations Runbook |
| K33-K37 ML pipeline and deliverables/restrictions | TRD, Implementation Plan, Test Plan, Operations Runbook, AI Disclosure |
| B5/K11/K21/K29/K35 dates and conflicts | Implementation Plan, Deployment Guide, Operations Runbook |

## Primary technical references

Consulted on 2026-09-28 for proposed implementation guidance, not evidence of repository behavior:

- [Next.js 15 standalone output](https://nextjs.org/docs/15/app/api-reference/config/next-config-js/output): required output setting for the artifact expected by the current frontend Dockerfile.
- [Supabase JWT verification](https://supabase.com/docs/guides/auth/jwts): verify signatures and claims with a supported library and the configured issuer's keys.
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security): combine grants and row policies; privileged service credentials bypass RLS and stay server-side.
- [Supabase Docker self-hosting](https://supabase.com/docs/guides/self-hosting/docker): basis for the proposed complete local environment.
- [Supabase backups](https://supabase.com/docs/guides/platform/backups): database backups do not contain Storage object bytes.
- [FastAPI container deployment](https://fastapi.tiangolo.com/deployment/docker/) and [CORS](https://fastapi.tiangolo.com/tutorial/cors/): deployment and explicit origin configuration guidance.
