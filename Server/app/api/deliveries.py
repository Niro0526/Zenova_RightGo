"""Deliveries API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.deps import require_role, CurrentUser
from app.models.operations import DeliveryRecord
from app.schemas.driver import LocalDeliveryRecordSchema, DiscrepancyDetails, NotDeliveredDetails, PodDetails

router = APIRouter(prefix="/deliveries", tags=["Deliveries"])

def to_schema(d: DeliveryRecord) -> LocalDeliveryRecordSchema:
    disc = None
    if d.discrepancy_type:
        disc = DiscrepancyDetails(
            type=d.discrepancy_type,
            expectedQty=d.expected_qty,
            deliveredQty=d.delivered_qty,
            notes=d.discrepancy_notes or "",
            photoName=d.pod_photo_name,
        )
    not_del = None
    if d.not_delivered_reason:
        not_del = NotDeliveredDetails(
            reason=d.not_delivered_reason,
            notes=d.not_delivered_notes or "",
            photoName=d.pod_photo_name,
        )
    pod = PodDetails(
        photoName=d.pod_photo_name,
        photoUrl=d.pod_photo_url,
        signerName=d.pod_signer_name,
        hasSignature=d.pod_has_signature,
        signatureUrl=d.pod_signature_url,
    )
    return LocalDeliveryRecordSchema(
        id=d.id,
        stopId=d.stop_id,
        stopName=d.stop_name,
        vehicleId=d.vehicle_id,
        outcome=d.outcome,
        discrepancyDetails=disc,
        notDeliveredDetails=not_del,
        podDetails=pod,
        status=d.status,
        offlineCreated=d.offline_created,
        createdAt=d.recorded_at.isoformat(),
        syncedAt=d.synced_at.isoformat() if d.synced_at else None,
    )

@router.get("", response_model=List[LocalDeliveryRecordSchema])
def list_deliveries(
    outlet_id: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("dispatcher", "store_manager")),
):
    """List completed deliveries with POD metadata. A store_manager only sees their own outlet's."""
    query = db.query(DeliveryRecord)
    if user.role == "store_manager":
        query = query.filter(DeliveryRecord.stop_id == user.outlet_id)
    elif outlet_id:
        query = query.filter(DeliveryRecord.stop_id == outlet_id)
    if vehicle_id:
        query = query.filter(DeliveryRecord.vehicle_id == vehicle_id)
    return [to_schema(d) for d in query.order_by(DeliveryRecord.recorded_at.desc()).all()]

@router.get("/{delivery_id}", response_model=LocalDeliveryRecordSchema)
def get_delivery(delivery_id: str, db: Session = Depends(get_db), user: CurrentUser = Depends(require_role("dispatcher", "store_manager"))):
    """Get single delivery by ID."""
    d = db.query(DeliveryRecord).filter(DeliveryRecord.id == delivery_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Delivery record not found")
    if user.role == "store_manager" and d.stop_id != user.outlet_id:
        raise HTTPException(status_code=403, detail="You can only view deliveries for your own outlet.")
    return to_schema(d)
