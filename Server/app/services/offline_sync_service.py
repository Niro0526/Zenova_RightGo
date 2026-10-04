"""Offline synchronization service with idempotency, ownership validation, and
event processing. Every event is checked against the authenticated caller's
own role/vehicle/trip before being applied - a client-supplied vehicleId,
tripId or stopId is never trusted on its own, only as a claim to verify."""

import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.core.deps import CurrentUser
from app.models.memory import OfflineProcessedEvent
from app.models.plan import ReleasedManifest
from app.schemas.sync import (
    OfflineSyncRequest,
    OfflineSyncResponse,
    EventSyncResult,
)
from app.schemas.driver import LocalDeliveryRecordSchema, IssueReportRecordSchema
from app.services.driver_service import record_driver_delivery, record_driver_issue, get_driver_active_trip
from app.services.loading_service import acknowledge_manifest

class SyncOwnershipError(Exception):
    """Raised when an event's claimed role/vehicle/trip/stop does not match
    the authenticated caller - caught the same way as any other per-event
    failure, so the event is rejected without aborting the rest of the batch
    and without ever being marked applied/synced."""

def process_offline_sync(
    db: Session,
    request: OfflineSyncRequest,
    user: CurrentUser,
) -> OfflineSyncResponse:
    now_utc = datetime.now(timezone.utc)
    results: List[EventSyncResult] = []
    # Resolved lazily (at most once) the first time a driver-owned event needs it.
    driver_trip = "unresolved"

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
        except Exception:
            rec_dt = now_utc

        event_record = OfflineProcessedEvent(
            event_id=item.event_id,
            event_type=item.event_type,
            device_id=request.device_id,
            recorded_at=rec_dt,
            synced_at=now_utc,
            payload_json=item.payload,
        )

        try:
            # Process specific event types
            if item.event_type in ("delivery.completed", "delivery_record"):
                if user.role != "driver":
                    raise SyncOwnershipError("Only the driver role may submit delivery records.")

                del_data = item.payload
                claimed_vehicle = del_data.get("vehicleId")
                if not claimed_vehicle or claimed_vehicle != user.vehicle_id:
                    raise SyncOwnershipError("You can only sync delivery records for your own assigned vehicle.")

                if driver_trip == "unresolved":
                    driver_trip = get_driver_active_trip(db, user.vehicle_id)
                if not driver_trip:
                    raise SyncOwnershipError("You have no active released trip to record deliveries against.")

                claimed_stop = del_data.get("stopId")
                if claimed_stop and claimed_stop not in (driver_trip.stop_outlet_ids or []):
                    raise SyncOwnershipError(f"Stop '{claimed_stop}' is not part of your assigned trip.")

                del_schema = LocalDeliveryRecordSchema(
                    id=del_data.get("id") or f"DEL-{item.event_id[:8]}",
                    stopId=del_data.get("stopId", ""),
                    stopName=del_data.get("stopName", ""),
                    vehicleId=claimed_vehicle,
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
                if user.role != "driver":
                    raise SyncOwnershipError("Only the driver role may submit issue reports.")

                rep_data = item.payload
                claimed_vehicle = rep_data.get("vehicleId")
                if not claimed_vehicle or claimed_vehicle != user.vehicle_id:
                    raise SyncOwnershipError("You can only sync issue reports for your own assigned vehicle.")

                if driver_trip == "unresolved":
                    driver_trip = get_driver_active_trip(db, user.vehicle_id)
                if not driver_trip:
                    raise SyncOwnershipError("You have no active released trip to report issues against.")

                claimed_trip = rep_data.get("tripId")
                if claimed_trip and claimed_trip != driver_trip.trip_id_str:
                    raise SyncOwnershipError("Issue report's trip does not match your assigned trip.")

                claimed_stop = rep_data.get("stopCode")
                if claimed_stop and claimed_stop not in (driver_trip.stop_outlet_ids or []):
                    raise SyncOwnershipError(f"Stop '{claimed_stop}' is not part of your assigned trip.")

                rep_schema = IssueReportRecordSchema(
                    id=rep_data.get("id") or f"REP-{item.event_id[:8]}",
                    tripId=claimed_trip or driver_trip.trip_id_str,
                    vehicleId=claimed_vehicle,
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
                if user.role != "loader":
                    raise SyncOwnershipError("Only the loader role may acknowledge a manifest.")

                ver = item.payload.get("version", current_version)
                acknowledged_by_name = item.payload.get("acknowledged_by") or user.display_name
                acknowledge_manifest(db, version=ver, acknowledged_by=acknowledged_by_name)
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
