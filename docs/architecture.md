# Architecture

Current as of the code in this repository. Older planning documents in `docs/` (PRD, TRD, REVIEW, …) pre-date the backend and are historical.

## Components

```
Browser (Next.js 15 / React 18 / Tailwind, IndexedDB offline queue for the driver)
   │  REST + JSON, Authorization: Bearer <session token>
   ▼
FastAPI app  (Server/app/main.py, routers under /api)
   ├─ api/        thin routers, role checks via require_role(...)
   ├─ services/   business rules (planning, validation, loading, driver, store manager, sync, ledger, storage)
   ├─ models/     SQLAlchemy 2 ORM
   └─ core/       settings (pydantic-settings), enums, security helpers, auth deps
   │  SQLAlchemy (psycopg)
   ▼
PostgreSQL   (SQLite fallback only when DATABASE_URL is unset or a placeholder)
   + object storage for POD/issue evidence (local directory, or Supabase Storage when configured)
```

- **Frontend** `Client/`: App Router workspaces `/dispatcher`, `/loader`, `/driver`, `/store-manager`, plus `/login`. `src/lib/api/client.ts` is the shared API client (`NEXT_PUBLIC_API_URL`, default `http://localhost:8000`). Built with `output: "standalone"`.
- **Backend** `Server/`: stateless API. All operational state is server-side; the browser keeps only the session token and the driver's offline queue.
- **Auth**: four fixed demo users in `app/api/auth.py`. Login issues a random bearer token stored in `auth_sessions`; protected routes resolve it through `app/core/deps.py` and enforce roles (`dispatcher`, `loader`, `driver`, `store_manager`).
- **Migrations**: Alembic (`Server/alembic`, single head `0004_merge_heads`). The API also runs `Base.metadata.create_all()` at startup and seeds reference data (`reference_service.seed_reference_data`); seeding only fills empty tables.

## Domain flow

Store Manager places order → Dispatcher plans (greedy suggest + rule validation) and publishes a manifest version → Loader acknowledges, loads in reverse-stop order, departs the trip → Driver delivers with POD, reports incidents, syncs offline events → Store Manager confirms receipt. State changes write `ledger_entries` and `notifications` rows. Orders confirmed after 16:00 Asia/Colombo (or on a closed day) roll to the next operating day.

## Deployment targets

### Local (Docker Compose) — `docker-compose.yml`

| Service | Image / build | Notes |
|---|---|---|
| `db` | `postgres:16-alpine` | Named volume `rightgo_pgdata`; healthcheck gates the backend. |
| `backend` | `Server/Dockerfile`, command `Server/docker-entrypoint.sh` | Checks dataset, runs `alembic upgrade head`, starts uvicorn on 8000; seeds at API startup. `./data` mounted read-only at `/app/data`; named volume `rightgo_storage` for evidence files. |
| `client` | `Client/Dockerfile` (multi-stage, standalone) | `NEXT_PUBLIC_API_URL` baked in at build time. |

Configuration comes from `.env` (see `.env.example`, placeholders only). Intended for development, demos and judging; the confidential dataset is supplied privately into `./data`.

### Production — AWS EC2 + Supabase

The hosted deployment runs on an AWS EC2 instance with a Supabase-hosted PostgreSQL database (via `DATABASE_URL`, pooler port 6543 or direct 5432) and Supabase Storage for evidence (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). `Server/Dockerfile` keeps its original `uvicorn` `CMD`; the entrypoint script is used only by Compose, so the production start command is unchanged.

The EC2 provisioning, reverse proxy, process manager and environment files are **not stored in this repository**, so this document does not describe them. Production secrets live only in the server environment. Do not point local Compose at the production database, and never call `/api/state/reset` there.

| Concern | Local Compose | Production |
|---|---|---|
| Database | Postgres 16 container + volume | Supabase PostgreSQL |
| Evidence files | `rightgo_storage` volume | Supabase Storage buckets |
| Secrets | `.env` (local only, gitignored) | Server environment |
| Dataset | `./data`, supplied privately | Provided on the server by the team |
| Entry command | `docker-entrypoint.sh` (migrate, then API) | Original image `CMD` |

## Known gaps

Permissive CORS, hard-coded demo credentials, destructive `/api/state/reset` (dispatcher-only), `AuthContext` hard-coding `localhost:8000`, no ML component shipped.
