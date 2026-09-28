# Security Architecture and Checklist

Version 1.0, 2026-09-28. Static review and proposed controls. No backend security control, Supabase policy or production configuration was verified as implemented. Do not read unchecked release criteria as completed work.

## Current exposure and trust boundaries

The prototype has no authentication or server-side authorization. Route access and role labels do not establish user identity. Because there is no implemented backend or database connection in the inspected source, this review does not claim a live data breach or exploitable API. It does establish that the prototype cannot safely become a real operational system by attaching credentials alone.

Proposed protected assets: orders, depot plans, load/receipt evidence, private contact information, scope memberships, audit history, auth credentials, ML artifacts and model/dataset provenance. Trust boundaries are browser -> Auth, browser -> FastAPI, FastAPI -> database, authorized upload -> private Storage, worker -> database/artifact store and operator -> deployment control plane.

## Authentication and sessions

Use invited/seeded Supabase Auth accounts. FastAPI verifies signature, issuer, audience, expiry, allowed algorithm and key ID through configured issuer keys; arbitrary token-supplied URLs must not control discovery. Reject invalid/expired tokens and disabled profiles. Cache keys with bounded refresh and support rotation without accepting unverifiable tokens. Use maintained libraries; see [Supabase JWT guidance](https://supabase.com/docs/guides/auth/jwts).

Proposed initial browser pattern uses the supported Supabase client for sign-in/refresh and Bearer tokens for API calls. Any persisted client session is sensitive to XSS: restrict script sources, escape rendered user data, avoid unsafe HTML and clear session/cache on logout. Never store access tokens in logs or URLs. An HttpOnly-cookie/BFF variant is a separate architecture decision that requires CSRF protection, cookie flags and server refresh design; do not mix patterns casually.

Memberships are server-managed relational records. Do not trust editable user metadata, request-body roles, route prefixes or a demo switcher. Check active memberships on protected requests so access removal is effective independently of stale UI claims. Apply stronger authentication to deployment/Supabase administrator accounts and keep operational demo accounts low privilege.

## RBAC plus resource scope

Legend: own=assigned outlet, depot=assigned depot, assigned=explicit trip assignment. All omitted permissions deny. Admin support does not impersonate store/loader/driver events.

| Action | Store manager | Dispatcher | Loader | Driver | Administrator |
|---|---|---|---|---|---|
| View reference profile | Own | Depot | Depot minimum | Assigned stop minimum | Manage reference |
| Create/edit submitted order | Own before lock | Controlled correction, depot | Deny | Deny | Deny business action by default |
| View order | Own | Depot | Manifest minimum | Assigned stop minimum | Audited support read |
| Confirm/cancel planning intake | Own cancel before lock only | Depot per state | Deny | Deny | Deny |
| Closure report/cancel | Own | Depot | Read relevant | Read assigned impact | Audited support |
| Assign/defer/publish/revise | Deny | Depot | Deny | Deny | Deny unless separately granted dispatcher |
| Fleet availability change | Deny | Depot | Read | Read assigned | Reference administration |
| Loading checks/readiness | Deny | Read/resolve exception | Depot | Read assigned | Deny |
| Start/stop/complete trip | Deny | Read/incident coordination | Read depot | Assigned only | Deny |
| Receipt/attestation | Own delivery only | Read/resolve issue | Deny | Handover only, no store sign-off | Deny |
| Private receipt evidence | Own | Depot when necessary | Relevant loading evidence only if introduced | Own issue evidence/minimal receipt result | Audited support only |
| Deferral acknowledge | Own | Read | Deny | Deny | Deny |
| Exception resolution | Read own | Depot | Report loading issue | Report assigned issue | Deny business resolution |
| Notification read/mark | Own user | Own user | Own user | Own user | Own user |
| Audit read | Own safe timeline | Depot redacted | Own action subset | Own action subset | Audited support |
| Users/roles/imports/models | Deny | Prediction read only | Deny | Deny | Controlled administration |

Enforce both role and scope in API and database. Protect list, detail, export, evidence-link and mutation endpoints equally. Driver assignments cannot be supplied by the driver as a self-grant. Admin scope changes require reason/audit and protection against accidental self-lockout or self-escalation.

## PostgreSQL and Supabase policies

Use private `app` schema, revoke browser roles' direct access, and enable RLS on business tables as defense in depth. A dedicated `rightgo_runtime` role is neither owner nor superuser and lacks BYPASSRLS. FastAPI starts a transaction and sets only a verified user UUID via transaction-local context; RLS policies derive scopes from active memberships and assigned entities. Missing or malformed context denies. Pool-reuse tests prove one request cannot inherit another's subject.

Apply row policies independently for SELECT/INSERT/UPDATE/DELETE; ensure `WITH CHECK` prevents moving an owned row into another outlet. Restrict immutable columns and business transitions through privileges and domain logic. A scoped SELECT policy alone is insufficient to secure mutation. Views and SECURITY DEFINER functions need explicit review, fixed search paths and minimum grants. Supabase service-role credentials can bypass RLS and must stay server-side; normal API data calls must not use them. See [Supabase grants and RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

Role provisioning and migrations use distinct operator credentials, not request credentials. Worker uses a narrow role for outbox/job operations; audit final business commands under original actor as well as worker execution identity. Exposed public health responses reveal no connection strings, schema names or stack traces.

## Threats and required mitigations

| Threat | Risk | Control / verification |
|---|---|---|
| Role/scope spoofing or guessed IDs | Unauthorized outlet/depot operations | JWT verification + relational membership + entity scoping + deny tests T-S01-S04 |
| Double allocation or stale plan | Invalid physical operations | Vehicle-day locks, expected version, atomic publication and immutable manifests; T-C12 |
| Forged receipt/evidence | False completion or private data access | Server identity, actual line checks, explicit attestation, delivery-bound private evidence, append-only history; T-P07/T-S06 |
| Injection/XSS | Data theft or unsafe actions | Parameterized DB operations, strict DTOs, safe text rendering, script restrictions, upload allowlist; T-S05 |
| Privileged key in browser/logs | Broad database access | Server-only secret store, separate runtime role, bundle/log scans and rotation procedure; T-S07 |
| Malicious/oversized file or pickle | Resource abuse or code execution | Bounded image validation, private upload intent, trusted-only model artifacts; no public pickle loading |
| Cross-user response cache | Disclosure despite correct endpoint authorization | No shared cache for protected personalized responses; user/scope-bound cache keys and logout clearing |
| Notification retry/replay | Duplicated or misleading actions | Transactional outbox, deduplication and idempotent event consumers |
| Lost database/evidence | Incomplete operational recovery | Independent DB/object backups with restoration tests and verified RPO/RTO |
| Dependency/container compromise | Supply chain exposure | Lockfiles, image digest/scan, least privilege runtime, reviewed updates and reproducible builds |

## API, infrastructure and privacy controls

Allow only declared CORS origins; credentials settings must match the selected session design. CORS is a browser constraint, not authorization; see [FastAPI CORS guidance](https://fastapi.tiangolo.com/tutorial/cors/). Enforce TLS externally and verified encrypted DB connections in hosted environments. Trust forwarded headers only from the configured reverse proxy. Restrict security-sensitive admin/API docs exposure according to environment.

Use non-root containers, read-only filesystems where feasible, resource/body/time limits and private network access for DB/admin services. Proposed throttles: ordinary authenticated API 120 requests/minute/user, uploads 10/minute/user, login controls at Auth/edge, costly jobs one active job per authorized scope. Tune from measured usage; return 429 with retry guidance. Limits are proposed and not configured today.

Never use `NEXT_PUBLIC_` for DB passwords, JWT signing secrets or privileged Supabase keys. A public publishable/anon key is not an authorization bypass, but its associated grants/policies still require testing. Render uploaded evidence through short-lived scoped links; reject arbitrary remote fetch URLs to avoid SSRF. Validate MIME content, hash, image size and ownership before receipt attachment.

Minimize private names/contact/signature data. Proposed retention: operational/audit metadata 180 days, evidence 90 days, ordinary logs 30 days, pending upload debris 24h, idempotency results 7 days. These are product decisions requiring confirmation, not legal retention advice. Subject access/deletion processes must consider operational evidence and backup expiry; do not promise immediate deletion from immutable backups. Competition demo must use isolated synthetic identities and never actual production customers.

## Release checklist (not yet satisfied)

- [ ] Verify Part One and deployed threat model match selected flows and evidence needs.
- [ ] Identity validation, session expiry, disabled-user and key-rotation tests pass.
- [ ] API and RLS allow/deny matrix passes including lists/exports/private evidence.
- [ ] Runtime, migrations, admin and worker privileges are separated; no owner/BYPASSRLS runtime.
- [ ] Concurrency, idempotency, plan version and transition checks pass.
- [ ] Receipt quantities and evidence ownership verified server-side; no demo signature/photo shortcuts in live flow.
- [ ] Private storage, signed URL expiry, limits/content checks and orphan cleanup verified.
- [ ] CORS/TLS/cache/header and cookie/CSRF controls match actual deployment.
- [ ] Secret scan, dependency audit, container scan and log review complete; findings triaged.
- [ ] Backups/restoration include both DB and evidence; restore preserves authorization.
- [ ] Access roster, incident owners, secret rotation and revocation rehearsal recorded.
- [ ] Public demo accounts are scoped, isolated, documented and safely resettable.

No code hardening, live scan or remediation was performed in this documentation-only task. F04 and the related current-state findings remain open.
