# RightGo PULSE — Team ZENOVA, Tech-Triathlon 2026

RightGo is a logistics operations web app with four role workspaces that share one server-authoritative backend:
**Dispatcher** (plan and release), **Loader** (load and depart), **Driver** (run, deliver, report) and **Store Manager** (order and receive).

- Frontend: Next.js 15 (App Router), React 18, Tailwind CSS, TypeScript — `Client/`
- Backend: FastAPI, SQLAlchemy 2, Alembic, Pydantic v2 — `Server/`
- Database: PostgreSQL (Docker locally; Supabase in production)
- Architecture: [docs/architecture.md](docs/architecture.md) · Data model: [docs/data-model.md](docs/data-model.md) · AI use: [AI_DISCLOSURE.md](AI_DISCLOSURE.md)

## Quick start (local Docker Compose)

Requires Docker with Compose v2.

```bash
cp .env.example .env          # placeholder values are fine for local use
# put the competition CSVs in ./data  (see "Dataset" below)
docker compose up --build
```

| Service | URL |
|---|---|
| Web app | http://localhost:3000 |
| API + Swagger | http://localhost:8000/docs |
| Health | http://localhost:8000/api/health |

On start the backend container waits for PostgreSQL, runs `alembic upgrade head`, then starts the API. The API seeds reference data on startup; seeding only fills empty tables, so restarting is safe and repeatable. Data lives in the `rightgo_pgdata` Docker volume and survives `docker compose down`. Only `docker compose down -v` deletes it.

To reset the local demo state, sign in as the dispatcher and call `POST /api/state/reset` (local database only; it wipes operational data back to the seeded baseline).

Frontend and backend ports can be changed with `CLIENT_PORT` / `BACKEND_PORT` in `.env` (the client is built with the matching `NEXT_PUBLIC_API_URL`).

### Without Docker

```bash
# Backend (Python 3.11+; a local PostgreSQL URL in Server/.env, or leave the placeholder for SQLite)
cd Server && pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Frontend
cd Client && cp .env.example .env.local && npm install && npm run dev
```

### Dataset (confidential — not in this repository)

The competition CSVs and booklet are confidential and are deliberately excluded from Git (`data/`, `Rules/`, `*.pdf` are in `.gitignore`). Authorized judges or reviewers supply them privately:

1. Obtain the dataset through the organisers' private channel.
2. Copy the CSV files into `./data/` (sub-folders are fine; files are found recursively). Required: `calendar.csv`, `district_travel.csv`, `outlets.csv`, `service_allowance.csv`, `vehicles.csv`, `task2b_peak_day_fleet.csv`, `task2b_peak_day_scenarios.csv`.
3. Run `docker compose up --build`. `./data` is mounted read-only into the backend container.

If required files are missing the backend container stops with a message naming them (override with `REQUIRE_DATASET=false` only to start the API without reference data). Never commit the dataset or paste it into issues or pull requests.

## Demo accounts

Sign in at http://localhost:3000/login with a username or email.

| Role | Username / email | Password | Lands on |
|---|---|---|---|
| Dispatcher | `dilani` / `dilani@rightgo.lk` | `Dispatch@2026` | `/dispatcher` |
| Loader | `rizwan` / `rizwan@rightgo.lk` | `Loader@2026` | `/loader` |
| Driver (vehicle VEH036) | `sunil` / `sunil@rightgo.lk` | `Driver@2026` | `/driver` |
| Store Manager (outlet OUT001) | `kavitha` / `kavitha@rightgo.lk` | `Store@2026` | `/store-manager` |

These are fixed demo credentials defined in [Server/app/api/auth.py](Server/app/api/auth.py). They are not for production use (see Known limitations).

## Cross-role walkthrough

The seed gives a baseline with 85 orders awaiting planning (scenario S1) and **no** released plan: every run below comes from the real workflow. (Setting `RIGHTGO_SEED_DEMO_RUN=true` pre-seeds a canned, already-departed v1 for VEH036/VEH006 — not recommended; it is not a valid plan.)

1. **Store Manager (`kavitha`)** → *Place Order*: create a replenishment order for OUT001. Orders confirmed after 4 PM Asia/Colombo, or on a non-operating day, roll to the next operating day. See it under *My Orders*.
2. **Dispatcher (`dilani`)** → *Orders*: the new order appears as awaiting planning and a notification is raised.
3. Dispatcher → *Planning*: generate the suggested plan (greedy suggest), review the validation results, assign orders or defer them **with a reason code**, confirm fuel and departure times, then publish. Publishing creates a new manifest version and trips, and writes decision-ledger entries. A stale or repeated publish is rejected; orders already on a departed trip are never shipped twice.
   - To drive the demo's VEH036 driver (`sunil`), the plan needs a VEH036 trip; the greedy suggest creates one when it fits, otherwise assign orders to VEH036 manually.
4. **Loader (`rizwan`)** → open the new manifest and acknowledge it, follow the reverse-stop (LIFO) *Load Sequence*, mark orders loaded, optionally log a pre-departure issue (a shortfall holds the trip until resolved), then depart the trip from *Trip Readiness* once it is ready. *Trip Readiness* shows the 6-digit driver unlock code once the trip is ready.
5. **Driver (`sunil`)** → *Today's Run*: enter the unlock code, then *Current Stop*: confirm arrival (a button; GPS never confirms it for you), start delivery and record the outcome (full, discrepancy or not delivered) with POD photo and signature. Quantities come from what the loader actually loaded. Use *Report* for road or vehicle incidents. With no network, records queue in the browser and sync later in recorded order.
6. **Store Manager (`kavitha`)** → open the delivered order and *Confirm Receipt*: the expected units are what the driver delivered; confirming fewer is recorded as a receipt issue. A deferred or not-delivered order shows on the dashboard and can be acknowledged.
7. **Dispatcher** → *Live Operations* and *Reports*: see trips, deliveries and the audit ledger across roles.

## Verification

```bash
cd Server && python -m pytest          # 27 backend tests
cd Client && npm run build && npm test # production build + 30 unit tests
```

## Implementation notes versus the Designathon design

The Designathon design file is not part of this repository, so this README does not list design-by-design differences. Verifiable implementation facts:

- All four roles are backed by one API; role access is enforced server-side (bearer session tokens stored in `auth_sessions`).
- Dispatcher planning uses a deterministic greedy heuristic plus a rule validator, not a machine-learning model.
- Maps use Mapbox only if `NEXT_PUBLIC_MAPBOX_TOKEN` is set.

> **Team to confirm:** add the list of screens or flows that deliberately changed from the Designathon Figma file here.

## Known limitations

- **Demo credentials** are hard-coded in the backend and shared across deployments; there is no user management or password reset. The `users` table is seeded but not used for login.
- **Single scenario**: planning, seeding and the seeded active manifest are built around scenario S1 from the competition data.
- **Driver arrival is not persisted**: *Confirm Arrival* / *Start Delivery* live in browser state only (a refresh returns the stop to "en route") and the dispatcher cannot see arrival; there is no arrival API.
- **Stop order is not enforced** by the server (the driver UI offers the next stop first).
- **Rejected offline records** (e.g. a stop already recorded) stay *Pending Sync* with the server's refusal in the console; there is no separate "conflict" state in the UI.
- **No ML models**: `ml/` contains placeholders only; no trained model is shipped or used.
- **CORS** is permissive (`*`) and `/api/state/reset` is a dispatcher-only destructive endpoint; tighten both before any real deployment.
- **Local evidence storage**: uploaded POD/issue evidence is written to the `rightgo_storage` volume locally; production uses Supabase Storage when `SUPABASE_SERVICE_ROLE_KEY` is set.
- **Docker verification**: the Compose file was written and the same migration + seed sequence was verified against an isolated PostgreSQL 18 instance, but `docker compose up` itself has not been run on the build machine (Docker was unavailable there).
- Offline sync is browser-only (IndexedDB queue); there is no service worker or background sync.
- `docs/` planning documents (PRD, TRD, etc.) are an early baseline written before the backend existed and are partly out of date. `docs/architecture.md` and `docs/data-model.md` are current.
