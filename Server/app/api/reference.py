from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.deps import get_current_user, CurrentUser
from app.models.reference import Outlet, Vehicle, ScenarioFleetEntry, ServiceAllowance, DistrictTravel, Product
from app.schemas.reference import (
    OutletSchema,
    VehicleSchema,
    FleetStatusSchema,
    ServiceAllowanceSchema,
    DistrictTravelSchema,
    ProductSchema,
)

router = APIRouter(prefix="/reference", tags=["Reference Data"])

@router.get("/products", response_model=List[ProductSchema])
def list_products(
    brand: Optional[str] = None,
    category: Optional[str] = None,
    temp: Optional[str] = None,
    search: Optional[str] = None,
    in_stock_only: bool = False,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """List central depot products for replenishment ordering with optional filters."""
    query = db.query(Product)
    if brand and brand.lower() != "all":
        query = query.filter(Product.brand.ilike(brand))
    if category and category.lower() != "all":
        query = query.filter(Product.category.ilike(f"%{category}%"))
    if temp and temp.lower() != "all":
        query = query.filter(Product.temp.ilike(temp))
    if in_stock_only:
        query = query.filter(Product.stock_status != "out_of_stock")
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(search_pattern))
            | (Product.sku.ilike(search_pattern))
            | (Product.category.ilike(search_pattern))
        )
    return query.order_by(Product.id.asc()).all()

@router.get("/outlets", response_model=List[OutletSchema])
def list_outlets(db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    """List all registered retail outlets."""
    return db.query(Outlet).order_by(Outlet.outlet_id).all()

@router.get("/vehicles", response_model=List[VehicleSchema])
def list_vehicles(scenario: str = "S1", db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
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
def list_fleet_status(scenario: str = "S1", db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    """List fleet availability entries for a scenario."""
    return db.query(ScenarioFleetEntry).filter(ScenarioFleetEntry.scenario == scenario).all()

@router.get("/allowances", response_model=List[ServiceAllowanceSchema])
def list_service_allowances(db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    """List standard service dock allowances."""
    return db.query(ServiceAllowance).all()

@router.get("/travel", response_model=List[DistrictTravelSchema])
def list_district_travel(db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    """List district travel distance and time matrix."""
    return db.query(DistrictTravel).all()

@router.get("/drivers")
def list_drivers(db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    """List all registered drivers in the database for assignment."""
    from app.models.user import User
    drivers = db.query(User).filter(User.role == "driver").order_by(User.id).all()
    return [
        {
            "id": d.id,
            "username": d.username,
            "display_name": d.display_name,
            "displayName": d.display_name,
            "phone": d.phone,
            "vehicle_id": d.vehicle_id,
            "vehicleId": d.vehicle_id,
        }
        for d in drivers
    ]


