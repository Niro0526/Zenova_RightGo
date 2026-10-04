"""Reference dataset models representing competition domains."""

from sqlalchemy import Column, String, Float, Integer, Boolean, Date, ForeignKey
from app.database.base import Base

class Outlet(Base):
    __tablename__ = "outlets"

    outlet_id = Column(String(32), primary_key=True) # e.g. OUT001
    name = Column(String(128), nullable=False)
    brand = Column(String(32), nullable=False) # Fresh, Style, Tech
    district = Column(String(64), nullable=False) # Colombo, Gampaha, etc.
    depot = Column(String(64), nullable=False) # Peliyagoda, Kandy
    dock_type = Column(String(32), nullable=False) # street, rear_dock, mall_bay
    parking_constraint = Column(String(32), nullable=False) # normal, van_only, mall_dock
    mall_window = Column(String(32), nullable=True) # e.g. "10:00-12:00"
    window_open_time = Column(String(16), nullable=False) # e.g. "05:00"
    window_close_time = Column(String(16), nullable=False) # e.g. "07:30"
    address = Column(String(256), nullable=True)
    manager_name = Column(String(128), nullable=True)
    phone = Column(String(32), nullable=True)
    operating_days = Column(String(128), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

class Vehicle(Base):
    __tablename__ = "vehicles"

    vehicle_id = Column(String(32), primary_key=True) # e.g. VEH001
    type = Column(String(32), nullable=False) # truck, van
    temp = Column(String(32), nullable=False) # ambient, reefer
    weight_cap_kg = Column(Float, nullable=False)
    volume_cap_m3 = Column(Float, nullable=False)
    fuel_type = Column(String(32), nullable=False) # diesel
    km_per_l = Column(Float, nullable=False)
    weekly_fuel_quota_l = Column(Float, nullable=False)
    depot = Column(String(64), nullable=False)

class ScenarioFleetEntry(Base):
    __tablename__ = "scenario_fleet_entries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scenario = Column(String(32), nullable=False, index=True) # S1
    vehicle_id = Column(String(32), ForeignKey("vehicles.vehicle_id"), nullable=False, index=True)
    status = Column(String(32), nullable=False) # available, in_workshop

class ServiceAllowance(Base):
    __tablename__ = "service_allowances"

    id = Column(Integer, primary_key=True, autoincrement=True)
    brand = Column(String(32), nullable=False, index=True)
    dock_type = Column(String(32), nullable=False, index=True)
    service_allowance_min = Column(Float, nullable=False)

class DistrictTravel(Base):
    __tablename__ = "district_travel"

    id = Column(Integer, primary_key=True, autoincrement=True)
    district = Column(String(64), nullable=False, index=True)
    depot = Column(String(64), nullable=False, index=True)
    road_class = Column(String(32), nullable=False)
    free_flow_kmh = Column(Float, nullable=False)
    depot_to_district_km = Column(Float, nullable=False)
    depot_to_district_freeflow_min = Column(Float, nullable=False)
    inter_stop_km = Column(Float, nullable=False)
    inter_stop_freeflow_min = Column(Float, nullable=False)

class OperatingCalendarDay(Base):
    """Operating calendar from calendar.csv - used to roll a confirmation past the
    4 PM cutoff forward to the next real operating day (Waypoint operates Mon-Sat)."""
    __tablename__ = "operating_calendar_days"

    date = Column(Date, primary_key=True)
    is_operating = Column(Boolean, nullable=False)
    is_weekend = Column(Boolean, nullable=False, default=False)
    is_holiday = Column(Boolean, nullable=False, default=False)
