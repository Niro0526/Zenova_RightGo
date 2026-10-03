"""Main FastAPI application for RightGo backend."""

import contextlib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.base import Base
from app.database.session import engine, SessionLocal
from app.services.reference_service import seed_reference_data
import app.models # ensure all models are registered

# Import API Routers
from app.api.auth import router as auth_router
from app.api.reference import router as reference_router
from app.api.fleet import router as fleet_router
from app.api.plan import router as plan_router
from app.api.manifests import router as manifests_router
from app.api.trips import router as trips_router
from app.api.issues import router as issues_router
from app.api.driver import router as driver_router
from app.api.deliveries import router as deliveries_router
from app.api.orders import router as orders_router
from app.api.deferrals import router as deferrals_router
from app.api.receipts import router as receipts_router
from app.api.notifications import router as notifications_router
from app.api.ledger import router as ledger_router
from app.api.sync import router as sync_router
from app.api.health import router as health_router
from app.api.state import router as state_router

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    print("[RightGo] Starting RightGo Backend...")
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            seed_reference_data(db)
        finally:
            db.close()
        print("[RightGo] Database initialization complete.")
    except Exception as e:
        print(f"[RightGo] Database startup notice: {e}")
    yield
    print("[RightGo] Shutting down RightGo Backend...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="RightGo PULSE Logistics Backend — Team ZENOVA (Tech-Triathlon 2026). Server-authoritative logistics platform powering Dispatcher, Loader, Driver, and Store Manager workflows.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register All API Routers under /api
app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(reference_router, prefix="/api")
app.include_router(fleet_router, prefix="/api")
app.include_router(plan_router, prefix="/api")
app.include_router(manifests_router, prefix="/api")
app.include_router(trips_router, prefix="/api")
app.include_router(issues_router, prefix="/api")
app.include_router(driver_router, prefix="/api")
app.include_router(deliveries_router, prefix="/api")
app.include_router(orders_router, prefix="/api")
app.include_router(deferrals_router, prefix="/api")
app.include_router(receipts_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(ledger_router, prefix="/api")
app.include_router(sync_router, prefix="/api")
app.include_router(state_router, prefix="/api")

@app.get("/")
def root():
    return {
        "app": "RightGo Backend API",
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/api/health",
    }
