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


## Cross-role walkthrough

The seed gives a baseline with 85 orders awaiting planning (scenario S1) and **no** released plan: every run below comes from the real workflow. (Setting `RIGHTGO_SEED_DEMO_RUN=true` pre-seeds a canned, already-departed v1 for VEH036/VEH006 — not recommended; it is not a valid plan.)

1. **Store Manager (`kavitha`)** → *Place Order*: create a replenishment order for OUT001. Orders confirmed after 4 PM Asia/Colombo, or on a non-operating day, roll to the next operating day. See it under *My Orders*.
2. **Dispatcher (`dilani`)** → *Orders*: the new order appears as awaiting planning and a notification is raised.
3. Dispatcher → *Planning*: generate the suggested plan (greedy suggest), review the validation results, assign orders or defer them **with a reason code**, confirm fuel and departure times, then publish. Publishing creates a new manifest version and trips, and writes decision-ledger entries. A stale or repeated publish is rejected; orders already on a departed trip are never shipped twice.
   - To drive the demo's VEH036 driver (`sunil`), the plan needs a VEH036 trip; the greedy suggest creates one when it fits, otherwise assign orders to VEH036 manually.
4. **Loader (`rizwan`)** → open the new manifest and acknowledge it, follow the reverse-stop (LIFO) *Load Sequence*, mark orders loaded, optionally log a pre-departure issue (a shortfall holds the trip until resolved), then depart the trip from *Trip Readiness* once it is ready. *Trip Readiness* shows the 6-digit driver unlock code as soon as the trip is ready.
5. **Driver (`sunil`)** — *Today's Run*: enter the unlock code, then *Current Stop*: **Confirm Arrival** (a button you press; GPS only reveals it, and *I'm at the store* is always available if GPS is missing or inaccurate), **Start Delivery**, then record the outcome (full, discrepancy or not delivered) with POD photo and signature. Arrival is saved on the server and survives a refresh. Quantities come from what the loader actually loaded. Use *Report* for road or vehicle incidents. With no network, arrivals and records queue on the device and sync later in recorded order.
   - **Order of events (as enforced by the backend):** the unlock code is shown when the trip is *ready*; the driver *may* unlock from that point, but **arrival and delivery need both** the loader's *departure* **and** the unlock. Stops must then be worked in the released order; the only way past a stop that cannot be served is recording it *not delivered* (reason + photo).
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
- **Start Delivery is not persisted**: only *Confirm Arrival* is saved server-side; after a refresh the stop returns to *arrived* and the driver presses *Start Delivery* again.
- **Offline failures**: a record the server will *never* accept (stop already recorded, not on this run, bad quantity, no arrival) is marked **Rejected** with the reason, kept with all its data, shown in *History* with a *Retry sync* button, and never retried automatically. A record the server may accept *later* (run not departed/unlocked yet, an earlier stop still queued) stays *Pending Sync* and is retried with 15 s → 5 min back-off.
- **Database migration**: this release adds the `stop_arrivals` table — run `alembic upgrade head` (revision `0005_stop_arrivals`). It is additive; a database already created by the app's startup `create_all()` is handled (the migration skips an existing table).
- **No ML models**: `ml/` contains placeholders only; no trained model is shipped or used.
- **CORS** is permissive (`*`) and `/api/state/reset` is a dispatcher-only destructive endpoint; tighten both before any real deployment.
- **Local evidence storage**: uploaded POD/issue evidence is written to the `rightgo_storage` volume locally; production uses Supabase Storage when `SUPABASE_SERVICE_ROLE_KEY` is set.
- **Docker verification**: the Compose file was written and the same migration + seed sequence was verified against an isolated PostgreSQL 18 instance, but `docker compose up` itself has not been run on the build machine (Docker was unavailable there).
- Offline sync is browser-only (IndexedDB queue); there is no service worker or background sync.
- `docs/` planning documents (PRD, TRD, etc.) are an early baseline written before the backend existed and are partly out of date. `docs/architecture.md` and `docs/data-model.md` are current.
