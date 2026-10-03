# RightGo PULSE — Tech-Triathlon 2026
**Team ZENOVA**

RightGo is a unified logistics operations platform supporting Dispatchers, Warehouse Loaders, Field Drivers, and Retail Store Managers.

## Architecture

```
Client/ (Next.js 15, React, Tailwind CSS, IndexedDB PWA)
      ↓ REST API
Server/ (FastAPI, Pydantic V2, SQLAlchemy 2.0, Alembic)
      ↓
Supabase PostgreSQL (Hosted PostgreSQL Database)
```

## Workspaces & Roles
- **Dispatcher (`/dispatcher`)**: Feasibility analysis, greedy plan suggestion, stop sequencing, atomic release, decision ledger.
- **Loader (`/loader`)**: Manifest acknowledgment, reverse-stop (LIFO) load sequence, pre-departure issue logging, departure gate.
- **Driver (`/driver`)**: Cryptographic OTP run access, stop navigation, delivery outcome recording, Proof of Delivery (POD) photo & digital signature, offline sync queue via IndexedDB, post-departure incident reporting.
- **Store Manager (`/store-manager`)**: Outlet replenishment ordering, pre-loading cancellation, delivery status, store goods receipt confirmation, deferral acknowledgment.

## Getting Started

### 1. Backend Setup (FastAPI & Supabase)
```bash
cd Server
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Supabase DATABASE_URL
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```
- Swagger UI: `http://localhost:8000/docs`

### 2. Frontend Setup (Next.js)
```bash
cd Client
npm install
npm run dev
```
- Web Application: `http://localhost:3000`

### 3. Docker Compose
```bash
docker-compose up --build
```
