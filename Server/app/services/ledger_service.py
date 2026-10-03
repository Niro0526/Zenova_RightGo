"""Append-only audit ledger service."""

from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.memory import LedgerEntry

def record_ledger_entry(
    db: Session,
    action: str,
    actor: str = "Sarah Jenkins",
    order_ref: Optional[str] = None,
    outlet_id: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    trip_no: Optional[int] = None,
    reason_code: Optional[str] = None,
    reason_note: Optional[str] = None,
    previous_state: Optional[str] = None,
    updated_state: Optional[str] = None,
    plan_version: Optional[int] = None,
) -> LedgerEntry:
    entry = LedgerEntry(
        action=action,
        actor=actor,
        order_ref=order_ref,
        outlet_id=outlet_id,
        vehicle_id=vehicle_id,
        trip_no=trip_no,
        reason_code=reason_code,
        reason_note=reason_note,
        previous_state=previous_state,
        updated_state=updated_state,
        plan_version=plan_version,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

def list_ledger_entries(
    db: Session,
    order_ref: Optional[str] = None,
    outlet_id: Optional[str] = None,
    limit: int = 100,
) -> List[LedgerEntry]:
    query = db.query(LedgerEntry)
    if order_ref:
        query = query.filter(LedgerEntry.order_ref == order_ref)
    if outlet_id:
        query = query.filter(LedgerEntry.outlet_id == outlet_id)
    return query.order_by(LedgerEntry.timestamp.desc()).limit(limit).all()
