"""Fleet management API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.reference import Vehicle, ScenarioFleetEntry
from app.models.plan import DraftVehicleFuelInput
from app.schemas.reference import VehicleSchema

router = APIRouter(prefix="/fleet", tags=["Fleet"])

class VehicleStatusUpdateRequest(BaseModel):
    scenario: str = "S1"
    vehicle_id: str
    status: str # available, in_workshop

@router.get("", response_model=List[VehicleSchema])
def get_fleet(scenario: str = "S1", db: Session = Depends(get_db)):
    """Get active scenario fleet with status and fuel details."""
    vehicles = db.query(Vehicle).order_by(Vehicle.vehicle_id).all()
    fleet_rows = db.query(ScenarioFleetEntry).filter(ScenarioFleetEntry.scenario == scenario).all()
    fleet_map = {f.vehicle_id: f.status for f in fleet_rows}

    results = []
    for v in vehicles:
        schema = VehicleSchema.model_validate(v)
        schema.status = fleet_map.get(v.vehicle_id, "available")
        results.append(schema)
    return results

@router.post("/status")
def update_vehicle_status(req: VehicleStatusUpdateRequest, db: Session = Depends(get_db)):
    """Update vehicle operational status (available vs in_workshop)."""
    entry = db.query(ScenarioFleetEntry).filter(
        ScenarioFleetEntry.scenario == req.scenario,
        ScenarioFleetEntry.vehicle_id == req.vehicle_id,
    ).first()
    if not entry:
        entry = ScenarioFleetEntry(scenario=req.scenario, vehicle_id=req.vehicle_id, status=req.status)
        db.add(entry)
    else:
        entry.status = req.status
    db.commit()
    return {"success": True, "vehicleId": req.vehicle_id, "status": req.status}
