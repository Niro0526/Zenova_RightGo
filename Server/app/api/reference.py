"""Reference dataset API endpoints."""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.reference import Outlet, Vehicle, ScenarioFleetEntry, ServiceAllowance, DistrictTravel
from app.schemas.reference import OutletSchema, VehicleSchema, FleetStatusSchema, ServiceAllowanceSchema, DistrictTravelSchema

router = APIRouter(prefix="/reference", tags=["Reference Data"])

@router.get("/outlets", response_model=List[OutletSchema])
def list_outlets(db: Session = Depends(get_db)):
    """List all registered retail outlets."""
    return db.query(Outlet).order_by(Outlet.outlet_id).all()

@router.get("/vehicles", response_model=List[VehicleSchema])
def list_vehicles(scenario: str = "S1", db: Session = Depends(get_db)):
    """List all vehicles with their scenario fleet availability."""
    vehicles = db.query(Vehicle).order_by(Vehicle.vehicle_id).all()
    fleet_rows = db.query(ScenarioFleetEntry).filter(ScenarioFleetEntry.scenario == scenario).all()
    fleet_map = {f.vehicle_id: f.status for f in fleet_rows}

    results = []
    for v in vehicles:
        schema = VehicleSchema.model_validate(v)
        schema.status = fleet_map.get(v.vehicle_id, "available")
        results.append(schema)
    return results

@router.get("/fleet", response_model=List[FleetStatusSchema])
def list_fleet_status(scenario: str = "S1", db: Session = Depends(get_db)):
    """List fleet availability entries for a scenario."""
    return db.query(ScenarioFleetEntry).filter(ScenarioFleetEntry.scenario == scenario).all()

@router.get("/allowances", response_model=List[ServiceAllowanceSchema])
def list_service_allowances(db: Session = Depends(get_db)):
    """List standard service dock allowances."""
    return db.query(ServiceAllowance).all()

@router.get("/travel", response_model=List[DistrictTravelSchema])
def list_district_travel(db: Session = Depends(get_db)):
    """List district travel distance and time matrix."""
    return db.query(DistrictTravel).all()
