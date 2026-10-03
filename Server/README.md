# RightGo Backend — FastAPI & Supabase PostgreSQL
**Team ZENOVA | Tech-Triathlon 2026**

Server-authoritative backend powering the RightGo PULSE logistics platform across all four operational roles:
1. **Dispatcher** (Planning, Capacity Analysis, Feasibility Validation, Plan Release, Decision Ledger)
2. **Loader** (LIFO Reverse-Sequence Loading, Manifest Acknowledgment, Pre-departure Issues, Departure Gate)
3. **Driver** (OTP Trip Unlock, Stop Navigation, Delivery Outcomes, Proof of Delivery POD Metadata, Post-departure Road Issues, Run History)
4. **Store Manager** (Replenishment Ordering, Pre-loading Order Cancellation, Delivery Tracking, Receipt Confirmation, Deferral Ack)

---

## 1. Technology Stack

- **Framework**: FastAPI (Python 3.11 / 3.13)
- **Validation & Serialization**: Pydantic V2
- **ORM & Data Layer**: SQLAlchemy 2.0
- **Database**: Supabase PostgreSQL (or PostgreSQL 16)
- **Database Migrations**: Alembic
- **Testing**: Pytest & FastAPI TestClient
- **Server**: Uvicorn ASGI

---

## 2. Directory Structure

```
Server/
├── app/
│   ├── main.py                  # FastAPI Application & Lifespan Hooks
│   ├── core/
│   │   ├── config.py            # Pydantic Settings & Environment Configurations
│   │   ├── enums.py             # Domain Enums (Roles, Statuses, Rules)
│   │   └── security.py          # Security, Password Hashing, OTP Generation
│   ├── database/
│   │   ├── base.py              # SQLAlchemy Declarative Base
│   │   └── session.py           # Engine, Sessionmaker & Dependency
│   ├── models/                  # SQLAlchemy PostgreSQL Models
│   │   ├── user.py              # User Accounts
│   │   ├── reference.py         # Outlets, Vehicles, Fleet, Allowances, Travel
│   │   ├── order.py             # Orders
│   │   ├── plan.py              # Draft Plans, Assignments, Manifests, Trips
│   │   ├── operations.py        # Loading Issues, Driver Issues, Deliveries, Receipts
│   │   └── memory.py            # Deferral Memory, Notifications, Ledger, Offline Events
│   ├── schemas/                 # Pydantic Request & Response Schemas
│   │   ├── auth.py
│   │   ├── reference.py
│   │   ├── order.py
│   │   ├── plan.py
│   │   ├── manifest.py
│   │   ├── loading.py
│   │   ├── driver.py
│   │   ├── store_manager.py
│   │   ├── sync.py
│   │   ├── notification.py
│   │   └── ledger.py
│   ├── services/                # Pure Business Logic Services
│   │   ├── reference_service.py # Dataset CSV Loader & Reproducible Seeder
│   │   ├── validation_service.py# Task-2B Checker & Operational Engine
│   │   ├── planning_service.py  # Greedy Heuristics & Atomic Plan Release
│   │   ├── loading_service.py   # Warehouse LIFO Loading & Departure Gate
│   │   ├── driver_service.py    # OTP, Progress, POD, Driver Issues
│   │   ├── store_manager_service.py # Orders, Receipts, Cancellations
│   │   ├── offline_sync_service.py  # Idempotent Event Synchronization
│   │   ├── notification_service.py  # Role Notifications & Alerts
│   │   └── ledger_service.py    # Append-only Audit Trail
│   └── api/                     # REST API HTTP Endpoints
│       ├── auth.py
│       ├── reference.py
│       ├── fleet.py
│       ├── plan.py
│       ├── manifests.py
│       ├── trips.py
│       ├── issues.py
│       ├── driver.py
│       ├── deliveries.py
│       ├── orders.py
│       ├── deferrals.py
│       ├── receipts.py
│       ├── notifications.py
│       ├── ledger.py
│       ├── sync.py
│       ├── health.py
│       └── state.py
├── tests/                       # Comprehensive Pytest Suite
│   ├── conftest.py
│   ├── test_validation.py
│   ├── test_planning.py
│   ├── test_loading.py
│   ├── test_driver.py
│   ├── test_store_manager.py
│   ├── test_offline_sync.py
│   └── test_api_integration.py
├── alembic/                     # Database Migrations
├── alembic.ini
├── requirements.txt
├── Dockerfile
├── .env.example
└── README.md
```

---

## 3. Database & Supabase Configuration

1. Create a project in [Supabase](https://supabase.com).
2. Obtain your **Database Connection String** from **Project Settings > Database > Connection string** (Transaction Pooler or Session Mode).
3. Set your environment variable in `Server/.env`:
   ```bash
   DATABASE_URL=postgresql://postgres.your-project-id:your-password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
4. Run migrations to create all database tables:
   ```bash
   alembic upgrade head
   ```

---

## 4. Local Run Instructions

### Step 1: Install Dependencies
```bash
cd Server
pip install -r requirements.txt
```

### Step 2: Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### Step 3: Run FastAPI Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- **API Base**: `http://localhost:8000`
- **Swagger UI**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/api/health`

---

## 5. Running with Docker

### Build and Run with Docker Compose:
```bash
docker-compose up --build
```
Or run backend independently:
```bash
cd Server
docker build -t rightgo-backend .
docker run -p 8000:8000 -e DATABASE_URL="postgresql://..." rightgo-backend
```

---

## 6. Running Tests

Run the complete test suite:
```bash
cd Server
python -m pytest -v
```

All 9 test suites validate:
- Checker Parity (C01–C17)
- Candidate Ranking & Greedy Planning
- Atomic Plan Release & Versioning
- Warehouse LIFO Loading & Departure Gate
- OTP Attempt Throttling & Driver Run Access
- POD Metadata & Post-departure Road Issues
- Idempotent Offline Sync & UUID Deduplication
- Store Replenishment Orders & Protected Cancellation
- End-to-End HTTP API Integration Flow
