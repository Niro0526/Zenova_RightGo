"""Offline synchronization service with idempotency and event processing."""

import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.memory import OfflineProcessedEvent
from app.models.plan import ReleasedManifest
from app.schemas.sync import (
    OfflineSyncRequest,
    OfflineSyncResponse,
    EventSyncResult,
)
from app.schemas.driver import LocalDeliveryRecordSchema, IssueReportRecordSchema
from app.services.driver_service import record_driver_delivery, record_driver_issue
from app.services.loading_service import acknowledge_manifest

def process_offline_sync(
    db: Session,
    request: OfflineSyncRequest,
) -> OfflineSyncResponse:
    now_utc = datetime.now(timezone.utc)
    results: List[EventSyncResult] = []

    # Get latest active manifest version on server
    latest_manifest = db.query(ReleasedManifest).filter(
        ReleasedManifest.scenario == "S1",
        ReleasedManifest.is_active == True,
    ).order_by(ReleasedManifest.version.desc()).first()
    current_version = latest_manifest.version if latest_manifest else 1

    pending_review = False
    if request.client_plan_version is not None and request.client_plan_version < current_version:
        pending_review = True

    for item in request.events:
        # Check idempotency UUID
        existing_event = db.query(OfflineProcessedEvent).filter(
            OfflineProcessedEvent.event_id == item.event_id
        ).first()

        if existing_event:
            results.append(EventSyncResult(
                event_id=item.event_id,
                status="duplicate",
                message="Event already processed previously. Replay ignored.",
            ))
            continue

        # Parse recorded_at
        try:
            rec_dt = datetime.fromisoformat(item.recorded_at.replace("Z", "+00:00"))
            if rec_dt.tzinfo is None:
                rec_dt = rec_dt.replace(tzinfo=timezone.utc)
            else:
                rec_dt = rec_dt.astimezone(timezone.utc)
        except (TypeError, ValueError):
            rec_dt = now_utc

        event_record = OfflineProcessedEvent(
            event_id=item.event_id,
            event_type=item.event_type,
            device_id=item.device_id or request.device_id,
            recorded_at=rec_dt,
            synced_at=now_utc,
            payload_json=item.payload,
        )

        try:
            # Process specific event types
            if item.event_type in ("delivery.completed", "delivery_record"):
                del_data = item.payload
                del_schema = LocalDeliveryRecordSchema(
                    id=del_data.get("id") or f"DEL-{item.event_id[:8]}",
                    stopId=del_data.get("stopId", ""),
                    stopName=del_data.get("stopName", ""),
                    vehicleId=del_data.get("vehicleId", "PEL-R04"),
                    outcome=del_data.get("outcome", "full"),
                    discrepancyDetails=del_data.get("discrepancyDetails"),
                    notDeliveredDetails=del_data.get("notDeliveredDetails"),
                    podDetails=del_data.get("podDetails"),
                    status="Synced",
                    offlineCreated=True,
                    createdAt=item.recorded_at,
                    syncedAt=now_utc.isoformat(),
                )
                rec = record_driver_delivery(db, del_schema, source_device_id=request.device_id)
                event_record.status = "applied"
                db.add(event_record)
                db.commit()

                results.append(EventSyncResult(
                    event_id=item.event_id,
                    status="applied",
                    message="Delivery record applied successfully.",
                    remote_id=rec.id,
                ))

            elif item.event_type in ("driver_issue.reported", "issue.reported", "issue_report"):
                rep_data = item.payload
                rep_schema = IssueReportRecordSchema(
                    id=rep_data.get("id") or f"REP-{item.event_id[:8]}",
                    tripId=rep_data.get("tripId", "S1-T001"),
                    vehicleId=rep_data.get("vehicleId", "PEL-R04"),
                    categoryId=rep_data.get("categoryId", "other"),
                    categoryLabel=rep_data.get("categoryLabel", "General Issue"),
                    categoryIcon=rep_data.get("categoryIcon", "AlertTriangle"),
                    categories=rep_data.get("categories"),
                    relatedScope=rep_data.get("relatedScope", "stop"),
                    orderId=rep_data.get("orderId"),
                    stopCode=rep_data.get("stopCode"),
                    outletName=rep_data.get("outletName", "Outlet"),
                    description=rep_data.get("description", ""),
                    photo=rep_data.get("photo"),
                    status="Synced",
                    offlineCreated=True,
                    createdAt=item.recorded_at,
                    syncedAt=now_utc.isoformat(),
                )
                iss = record_driver_issue(db, rep_schema, source_device_id=request.device_id)
                event_record.status = "applied"
                db.add(event_record)
                db.commit()

                results.append(EventSyncResult(
                    event_id=item.event_id,
                    status="applied",
                    message="Driver issue report applied successfully.",
                    remote_id=iss.id,
                ))

            elif item.event_type in ("manifest.ack", "manifest_ack"):
                ver = item.payload.get("version", current_version)
                user = item.payload.get("acknowledged_by", "Loader")
                acknowledge_manifest(db, version=ver, acknowledged_by=user)
                event_record.status = "applied"
                db.add(event_record)
                db.commit()

                results.append(EventSyncResult(
                    event_id=item.event_id,
                    status="applied",
                    message=f"Manifest v{ver} acknowledged.",
                ))

            else:
                event_record.status = "rejected"
                event_record.error_message = f"Unsupported event type: {item.event_type}"
                db.add(event_record)
                db.commit()

                results.append(EventSyncResult(
                    event_id=item.event_id,
                    status="rejected",
                    message=f"Unsupported event type '{item.event_type}'.",
                ))

        except Exception as e:
            db.rollback()
            event_record.status = "rejected"
            event_record.error_message = str(e)
            db.add(event_record)
            db.commit()

            results.append(EventSyncResult(
                event_id=item.event_id,
                status="rejected",
                message=f"Error applying event: {str(e)}",
            ))

    all_applied = all(r.status in ("applied", "duplicate") for r in results)
    return OfflineSyncResponse(
        success=all_applied,
        results=results,
        synced_at=now_utc.isoformat(),
        current_plan_version=current_version,
        pending_plan_review=pending_review,
    )
