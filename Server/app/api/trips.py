"""Trip execution and warehouse loading API endpoints."""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.deps import require_role, CurrentUser
from app.models.plan import ReleasedTrip, OrderLoadingState, ReleasedManifest
from app.models.operations import LoadingIssue
from app.schemas.loading import TripReadinessResponseSchema
from app.services.loading_service import (
    get_trip_loading_sequence,
    mark_order_loaded,
    depart_trip,
)

router = APIRouter(prefix="/trips", tags=["Trips & Loading"])

class LoadOrderRequest(BaseModel):
    order_ref: str
    loaded_units: Optional[int] = None

@router.get("/{trip_id}/loading-sequence")
def api_get_loading_sequence(trip_id: int, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("loader", "dispatcher"))):
    """Get LIFO loading steps for warehouse team."""
    return get_trip_loading_sequence(db, trip_id)

@router.post("/{trip_id}/load-order")
def api_load_order(trip_id: int, req: LoadOrderRequest, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("loader"))):
    """Mark an order loaded onto the vehicle."""
    state = mark_order_loaded(db, trip_id, req.order_ref, req.loaded_units)
    return {"success": True, "orderRef": state.order_ref, "isLoaded": state.is_loaded, "loadedUnits": state.loaded_units}

@router.post("/{trip_id}/depart")
def api_depart_trip(trip_id: int, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("loader"))):
    """Departure gate: advance trip to departed state."""
    trip = depart_trip(db, trip_id, actor=user.display_name)
    return {"success": True, "tripId": trip.trip_id_str, "status": trip.loading_status, "departedAt": trip.departed_at}

@router.get("/{trip_id}/readiness", response_model=TripReadinessResponseSchema)
def api_get_trip_readiness(trip_id: int, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("loader", "dispatcher"))):
    """Check departure gate status for a trip."""
    trip = db.query(ReleasedTrip).filter(ReleasedTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    states = db.query(OrderLoadingState).filter(OrderLoadingState.released_trip_id == trip.id).all()
    open_issues = db.query(LoadingIssue).filter(
        LoadingIssue.manifest_version == trip.manifest_version,
        LoadingIssue.vehicle_id == trip.vehicle_id,
        LoadingIssue.trip_no == trip.trip_no,
        LoadingIssue.status.in_(["open", "escalated"]),
    ).count()

    total_orders = len(states)
    loaded_orders = sum(1 for s in states if s.is_loaded)
    has_open_issues = open_issues > 0

    manifest = db.query(ReleasedManifest).filter(ReleasedManifest.id == trip.manifest_id).first()
    is_ack = manifest and manifest.acknowledgement == "acknowledged"

    is_ready = total_orders > 0 and loaded_orders == total_orders and not has_open_issues and is_ack

    return TripReadinessResponseSchema(
        tripId=trip.trip_id_str,
        vehicleId=trip.vehicle_id,
        tripNo=trip.trip_no,
        loadingStatus=trip.loading_status,
        totalOrders=total_orders,
        loadedOrders=loaded_orders,
        hasOpenIssues=has_open_issues,
        isReady=is_ready,
        leaveByTime=trip.leave_by_time,
        otpCode=trip.otp_code,
    )
