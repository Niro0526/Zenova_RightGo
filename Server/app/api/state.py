"""System state management and reproducible seeding."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.deps import get_current_user, require_role, CurrentUser
from app.database.base import Base
from app.database.session import engine
from app.services.reference_service import seed_reference_data
from app.models.plan import ReleasedManifest, DraftPlan
from app.models.order import Order
from app.models.operations import DeliveryRecord, DriverIssue, LoadingIssue

router = APIRouter(prefix="/state", tags=["System State"])

@router.post("/reset")
def reset_system_state(force_reload: bool = True, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("dispatcher"))):
    """Reset operational state and re-seed clean competition baseline. This is
    destructive (wipes operational data back to the S1 baseline) - previously
    completely unauthenticated, now dispatcher-only."""
    # Re-create tables if needed
    Base.metadata.create_all(bind=engine)
    seed_reference_data(db, force_reload=force_reload)
    return {"success": True, "message": "System state re-seeded with competition S1 baseline."}

@router.get("/summary")
def get_system_summary(db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    """Summary of server-authoritative state across all roles."""
    total_orders = db.query(Order).count()
    active_manifest = db.query(ReleasedManifest).filter(ReleasedManifest.is_active == True).first()
    draft = db.query(DraftPlan).first()
    deliveries_count = db.query(DeliveryRecord).count()
    driver_issues_count = db.query(DriverIssue).count()
    loading_issues_count = db.query(LoadingIssue).count()

    return {
        "ordersTotal": total_orders,
        "draftRevision": draft.draft_revision if draft else 0,
        "activeManifestVersion": active_manifest.version if active_manifest else None,
        "totalDeliveries": deliveries_count,
        "openLoadingIssues": db.query(LoadingIssue).filter(LoadingIssue.status.in_(["open", "escalated"])).count(),
        "driverIssuesCount": driver_issues_count,
    }
