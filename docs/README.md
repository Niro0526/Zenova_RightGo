# RightGo documentation baseline

Reviewed: 28 September 2026. Scope: documentation only. Application code, datasets, dependencies and deployment configuration were not changed.

The repository is a frontend prototype with backend and ML scaffolding. The following documents distinguish **Observed** implementation, **Required** source requirements, **Proposed** future design, and **Unresolved** decisions. Proposed tables, routes, services and commands are not claims that they exist.

| Document | Purpose |
|---|---|
| [Review and evidence](REVIEW.md) | Current architecture, defects, verification and limitations |
| [Source requirements register](SOURCE_REQUIREMENTS.md) | Complete PDF page coverage, checker rules, conflicts and missing inputs |
| [1. PRD](PRD.md) | Product scope, requirements and acceptance criteria |
| [2. TRD](TRD.md) | Target Next.js, FastAPI and Supabase architecture |
| [3. App Flow](APP_FLOW.md) | Role journeys, states and recovery paths |
| [4. UI/UX Design Brief](UI_UX_DESIGN_BRIEF.md) | Personas, screen rationale, responsive and accessible behavior |
| [5. Backend Schema and API Specification](BACKEND_SCHEMA_API.md) | Data dictionary, relational design, constraints, API contracts and permissions |
| [6. Implementation Plan](IMPLEMENTATION_PLAN.md) | Dependency-ordered future work and completion gates |
| [7. Test Plan](TEST_PLAN.md) | Behavioral, security, data, deployment and acceptance tests |
| [8. Security Architecture and Checklist](SECURITY_ARCHITECTURE.md) | Trust boundaries, authentication, scoped RBAC, RLS and release checks |
| [9. Deployment Guide](DEPLOYMENT_GUIDE.md) | Existing blockers and proposed reproducible deployment procedure |
| [10. Maintenance and Operations Runbook](OPERATIONS_RUNBOOK.md) | Monitoring, incidents, recovery, backups and model operations |
| [AI disclosure](AI_DISCLOSURE.md) | Actual assistance and unverified prior assertions |

Read the review and source register first. Requirement identifiers in the ten documents refer to the PRD and source register. The API/schema document owns canonical names and states; the security document owns the permission matrix.

## Decisions still requiring external evidence

**Update, 28 September 2026 (later same day):** the file originally supplied at `Rules/Booklet.pdf` was an 8-page "Tech-Triathlon 2026 Delegate Booklet" — competition identity, governance rules, timeline, and prizes only, with no business-challenge content. It has since been replaced with the real 33-page **`Rules/Challenge Booklet.pdf`**, which does contain the Part One business brief: the Waypoint Group problem statement, operating constraints, the four user roles, and the Designathon/Hackathon/Datathon phase requirements. That brief has now been read and reconciled into the documents below. See [the source register](SOURCE_REQUIREMENTS.md) for the full page-by-page citation.

Still not supplied or found: the Day-5 Designathon design/prototype (Figma or equivalent) and its fidelity baseline, the deployment account, and the confirmed submission form links (the Challenge Booklet gives Google Form URLs per phase, but no account/credential material). Full design-fidelity certification remains blocked on the Day-5 artifact specifically — that is a separate gap from the business brief, which is now available.

The Designathon date conflicts between kickoff page 21 and both published timelines. See [the source register](SOURCE_REQUIREMENTS.md) before relying on a submission date. No code implementation or deployment is authorized by completing these documents.
