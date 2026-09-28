# Source requirements and review coverage

Baseline: 2026-09-28. Attached documents are reference material; their imperative language is not an instruction to execute, deploy, contact organizers, submit competition work, or modify code in this review.

## Sources and method

| ID | Source | Coverage |
|---|---|---|
| B | `C:/Users/kirut/Desktop/Root_Code/Rules/Booklet.pdf` | All 8 pages rendered and visually read. Text extraction returned no text; visual review was necessary. This is the Delegate Booklet. |
| K | `C:/Users/kirut/Desktop/Root_Code/Rules/Kick-off Session Tech-triathlon 2026.pdf` | All 40 pages rendered; text-bearing pages extracted and read; image-only content checked visually. |
| C | `C:/Users/kirut/Desktop/Root_Code/Rules/check_allocation.py` | Entire script read, including CLI, file discovery, validation, warnings and exit behavior. |
| R | Repository at commit `93371ab`, plus existing working-tree changes | Source, configuration, documentation, empty scaffolds and all 17 CSV schemas/profile inspected. See REVIEW.md. |

PDF reader warnings about object offsets were encountered. Successful page rendering supplied the fallback for visual content. Page numbers below are one-based PDF pages, not inferred section numbering. This register paraphrases source content and records its significance; it is not a verbatim transcription or evidence that absent challenge rules have been reviewed.

## Delegate booklet page ledger

| Page | Content and disposition |
|---|---|
| B1 | Tech-Triathlon 2026 Delegate Booklet, Rootcode identity and competition website. Source identity only. |
| B2 | University teams carry one solution through design, engineering and AI; three phases; team capabilities complement one another; organized by Rootcoders to develop Sri Lanka's technology community. Product continuity requirement. |
| B3 | Designathon covers product choices, flows, interface and experience; Hackathon implements that design; Datathon applies data/AI to the built use case; finalists explain solution, teamwork and challenges to judges. |
| B4 | Eleven participation/governance rules, recorded individually below. These are team obligations, not application access rules. |
| B5 | Timeline: registration opens 7 Sep, closes 21 Sep; kickoff 24 Sep; challenges start 25 Sep; Designathon 29 Sep; Hackathon 4 Oct; Datathon 9 Oct; semifinals 20-22 Oct; finale 30 Oct. All are printed 2026 event context. |
| B6 | Prizes: winner LKR 500,000; runner-up LKR 200,000; second runner-up LKR 100,000. Decorative trophy says 2025; do not derive event dates from that artwork. No product requirement. |
| B7 | Benefits: winner case-study exposure, certificates, champion career guidance/one-to-one with relevant leads, internship pathways, and consultation opportunities for the top three teams. No software requirement. |
| B8 | Closing thanks. No additional requirement. |

### B4 governance requirements

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
| K17 | Solve Part One as one operation and one coherent system with role-specific faces. Product thinking and deliberate scope matter. Number and content of screens are team decisions. Part One itself is not included. |
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

## Conflicts, assumptions and unresolved inputs

| ID | Evidence | Resolution in this documentation |
|---|---|---|
| U01 | B is a general delegate booklet; K17/K27 reference operational Part One/booklet constraints absent here. | Request original challenge. C rules are verified, other operational choices explicitly proposed. Do not certify complete domain compliance. |
| U02 | B5/K11: Designathon 29 Sep; K21: Tue 8 Sep. | Record both; team lead must obtain organizer confirmation. Use 29 Sep only as a provisional planning milestone, never a silently corrected source quote. |
| U03 | B4 deadline sanctions differ from K13 zero-score/continue. | Preserve both and confirm with organizer; no interpretation of which supersedes the other. |
| U04 | Day-5 design file/prototype not present. | UI review is code-based; fidelity remains unverified. |
| U05 | Dataset output columns indicate service-duration/lateness prediction and weekly total/chilled volume, but official target definitions/scoring absent. | Preserve CSV contracts. Candidate label derivations require confirmation before training/evaluation sign-off. |
| U06 | Code suggests 16:00 cutoff, next-day planning, Fresh priority, split temperature segments and +4 C. | These are prototype assumptions, not verified competition rules. Default proposed app uses atomic orders; confirm split semantics and all cutoff/priority/temperature policies. |
| U07 | User specifies Supabase PostgreSQL; K28 requires root Compose complete stack with seeded DB. | Propose hosted Supabase for production plus local self-hosted Supabase dependencies through root Compose. Remote DB alone does not meet the local reproducibility requirement. |
| U08 | Source says Waypoint; product/code say RightGo/PULSE and contain a Living brand. | RightGo is the proposed product name; CSV canonical brands are Fresh, Style, Tech. Confirm business naming; do not import Living as official reference data. |
| U09 | No hosting project, credentials, public URL, named maintainers, recovery budget or retention policy supplied. | Provide proposed procedures and role owners; environment-specific readiness is pending. |

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
