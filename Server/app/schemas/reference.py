"""Reference data schemas matching frontend naming and competition CSVs."""

from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class OutletSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    outlet_id: str
    name: str
    brand: str
    district: str
    depot: str
    dock_type: str
    parking_constraint: str
    mall_window: Optional[str] = None
    window_open_time: str
    window_close_time: str
    address: Optional[str] = None
    manager_name: Optional[str] = None
    phone: Optional[str] = None
    operating_days: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class VehicleSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    vehicle_id: str
    type: str # truck, van
    temp: str # ambient, reefer
    weight_cap_kg: float
    volume_cap_m3: float
    fuel_type: str
    km_per_l: float
    weekly_fuel_quota_l: float
    depot: str
    status: Optional[str] = "available" # available, in_workshop

class FleetStatusSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    scenario: str = "S1"
    vehicle_id: str
    status: str

class ServiceAllowanceSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    brand: str
    dock_type: str
    service_allowance_min: float

class DistrictTravelSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    district: str
    depot: str
    road_class: str
    free_flow_kmh: float
    depot_to_district_km: float
    depot_to_district_freeflow_min: float
    inter_stop_km: float
    inter_stop_freeflow_min: float
