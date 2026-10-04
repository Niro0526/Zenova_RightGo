"""Released Manifests API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.deps import get_current_user, require_role, CurrentUser
from app.models.plan import ReleasedManifest, ReleasedTrip
from app.schemas.manifest import ManifestResponseSchema, ManifestTripSnapshotSchema, AcknowledgeManifestRequest
from app.services.loading_service import get_current_released_manifest, acknowledge_manifest

router = APIRouter(prefix="/manifests", tags=["Manifests"])

def build_manifest_schema(db: Session, manifest: ReleasedManifest) -> ManifestResponseSchema:
    trip_rows = db.query(ReleasedTrip).filter(ReleasedTrip.manifest_id == manifest.id).all()
    trip_snapshots = [
        ManifestTripSnapshotSchema(
            vehicleId=t.vehicle_id,
            tripNo=t.trip_no,
            tripId=t.trip_id_str,
            brand=t.brand,
            district=t.district,
            depot=t.depot,
            plannedDepartureTime=t.planned_departure_time,
            leaveByTime=t.leave_by_time,
            stopOutletIds=t.stop_outlet_ids or [],
            orderRefs=t.order_refs or [],
            loadingStatus=t.loading_status,
            otpUnlocked=t.otp_unlocked,
        )
        for t in trip_rows
    ]
    return ManifestResponseSchema(
        id=manifest.id,
        version=manifest.version,
        scenario=manifest.scenario,
        publishedAt=manifest.published_at_str,
        decisionMaker=manifest.decision_maker,
        shortfallPolicy=manifest.shortfall_policy,
        acknowledgement=manifest.acknowledgement,
        trips=trip_snapshots,
    )

@router.get("/latest", response_model=Optional[ManifestResponseSchema])
def get_latest_manifest(scenario: str = "S1", db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    """Get the currently active released manifest version."""
    manifest = get_current_released_manifest(db, scenario)
    if not manifest:
        return None
    return build_manifest_schema(db, manifest)

@router.get("", response_model=List[ManifestResponseSchema])
def list_manifests(scenario: str = "S1", db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    """List all released manifest versions."""
    manifests = db.query(ReleasedManifest).filter(
        ReleasedManifest.scenario == scenario
    ).order_by(ReleasedManifest.version.desc()).all()
    return [build_manifest_schema(db, m) for m in manifests]

@router.get("/{version}", response_model=ManifestResponseSchema)
def get_manifest_by_version(version: int, scenario: str = "S1", db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    """Get a specific historical manifest version snapshot."""
    manifest = db.query(ReleasedManifest).filter(
        ReleasedManifest.scenario == scenario,
        ReleasedManifest.version == version,
    ).first()
    if not manifest:
        raise HTTPException(status_code=404, detail="Manifest version not found")
    return build_manifest_schema(db, manifest)

@router.post("/{version}/ack", response_model=ManifestResponseSchema)
def api_ack_manifest(version: int, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("loader"))):
    """Acknowledge manifest by warehouse Loader - actor identity is the
    authenticated session, never a client-supplied name."""
    manifest = acknowledge_manifest(db, version, acknowledged_by=user.display_name)
    return build_manifest_schema(db, manifest)
