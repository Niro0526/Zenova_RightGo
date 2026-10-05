"""Pytest test configuration and fixtures."""

import os
import sys

# Ensure Server root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database.base import Base
from app.database.session import get_db
from app.services.reference_service import seed_reference_data
from app.main import app

# Tests always run against an isolated database: in-memory SQLite by default, or a *local*
# throw-away PostgreSQL given in RIGHTGO_TEST_DATABASE_URL (to check Postgres parity). The
# schema is dropped after every test, so it must never point at a shared/production database.
TEST_DB_URL = os.environ.get("RIGHTGO_TEST_DATABASE_URL", "sqlite:///:memory:")
if not TEST_DB_URL.startswith("sqlite"):
    from sqlalchemy.engine import make_url
    if make_url(TEST_DB_URL).host not in ("localhost", "127.0.0.1", "::1"):
        raise RuntimeError("RIGHTGO_TEST_DATABASE_URL must point at a local throw-away database (schema is dropped after each test).")

@pytest.fixture(scope="function")
def db_engine():
    # Function-scoped (not session-scoped): most planning/release/loading
    # service calls do a real db.commit(), which commits straight through a
    # shared connection's "outer" transaction too - a connection.begin() +
    # transaction.rollback() teardown on a session-scoped engine does NOT
    # undo an already-committed transaction, so data from one test silently
    # leaked into the next. A fresh engine + schema per test is the only
    # isolation that actually holds once commits are involved.
    # StaticPool: TestClient's request handling can run on a different thread
    # than the fixture setup, and a plain sqlite:///:memory: engine hands out
    # a brand new, empty database per connection/thread without it - pinning
    # a single shared connection is what makes it one database for the test.
    if TEST_DB_URL.startswith("sqlite"):
        engine = create_engine(
            TEST_DB_URL,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    else:
        from app.database.session import sanitize_db_url
        engine = create_engine(sanitize_db_url(TEST_DB_URL))
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield engine
    if not TEST_DB_URL.startswith("sqlite"):
        engine.dispose()
        engine = create_engine(sanitize_db_url(TEST_DB_URL))
        Base.metadata.drop_all(bind=engine)
    engine.dispose()

@pytest.fixture(scope="function")
def db_session(db_engine):
    SessionTest = sessionmaker(bind=db_engine)
    session = SessionTest()

    seed_reference_data(session, force_reload=True)

    yield session

    session.close()

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

def _login(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]

def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="function")
def driver_auth(client):
    """Bearer auth headers for the predefined driver account (sunil, vehicle VEH036)."""
    return _auth_headers(_login(client, "sunil@rightgo.lk", "Driver@2026"))

@pytest.fixture(scope="function")
def dispatcher_auth(client):
    return _auth_headers(_login(client, "dilani@rightgo.lk", "Dispatch@2026"))

@pytest.fixture(scope="function")
def loader_auth(client):
    return _auth_headers(_login(client, "rizwan@rightgo.lk", "Loader@2026"))

@pytest.fixture(scope="function")
def store_manager_auth(client):
    return _auth_headers(_login(client, "kavitha@rightgo.lk", "Store@2026"))

@pytest.fixture(scope="function")
def seed_active_trip(db_session):
    """Factory fixture: directly seeds one active released manifest + trip for
    a vehicle, for tests that exercise driver/sync ownership checks without
    needing to run the full suggest -> confirm-fuel -> release pipeline."""
    from app.models.plan import ReleasedManifest, ReleasedTrip

    def _seed(vehicle_id, stop_outlet_ids, order_refs=None, trip_id_str=None):
        # Reuse the one active manifest for this scenario if a prior call
        # already created it, so multiple vehicles' trips in the same test
        # live under the same real active manifest (as in production),
        # instead of each call fighting over the (scenario, version) unique
        # constraint or deactivating the other vehicle's trip.
        manifest = db_session.query(ReleasedManifest).filter(
            ReleasedManifest.scenario == "S1", ReleasedManifest.is_active == True
        ).first()
        if not manifest:
            manifest = ReleasedManifest(
                version=1,
                scenario="S1",
                published_at_str="03:15",
                decision_maker="Test Dispatcher",
                shortfall_policy="ship_good_tell_store",
                is_active=True,
                acknowledgement="acknowledged",
                acknowledged_by="Test Loader",
            )
            db_session.add(manifest)
            db_session.commit()
            db_session.refresh(manifest)

        trip = ReleasedTrip(
            manifest_id=manifest.id,
            manifest_version=manifest.version,
            scenario="S1",
            vehicle_id=vehicle_id,
            trip_no=1,
            trip_id_str=trip_id_str or f"{vehicle_id}-1",
            brand="Fresh",
            district="Colombo",
            depot="Peliyagoda",
            planned_departure_time="04:30",
            leave_by_time="04:45",
            stop_outlet_ids=stop_outlet_ids,
            order_refs=order_refs or [],
            loading_status="departed",
            otp_code="123456",
            otp_attempts=0,
            otp_unlocked=True,
        )
        db_session.add(trip)
        db_session.commit()
        db_session.refresh(trip)
        return trip

    return _seed
