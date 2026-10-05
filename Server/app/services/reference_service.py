"""Reference data loading service from CSV and database seeding."""

import os
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User
from app.models.reference import (
    Outlet,
    Vehicle,
    ScenarioFleetEntry,
    ServiceAllowance,
    DistrictTravel,
    OperatingCalendarDay,
)
from app.models.order import Order
from app.models.plan import (
    DraftPlan,
    DraftAssignment,
    DraftStopSequence,
    DraftTripMeta,
    DraftVehicleFuelInput,
    ReleasedManifest,
    ReleasedTrip,
    OrderLoadingState,
)
from app.models.operations import LoadingIssue, DriverIssue, DeliveryRecord, ReceiptRecord

def find_csv_file(filename: str) -> Optional[Path]:
    """Search for dataset CSV file in configured data directories recursively."""
    root_dirs = [
        Path(settings.RIGHTGO_DATA_DIR),
        Path(__file__).resolve().parent.parent.parent.parent / "Rules" / "data",
        Path(__file__).resolve().parent.parent.parent.parent / "Rules",
        Path(__file__).resolve().parent.parent.parent.parent / "data",
        Path(__file__).resolve().parent.parent.parent,
    ]
    for directory in root_dirs:
        if directory.exists():
            direct = directory / filename
            if direct.exists() and direct.is_file():
                return direct
            try:
                for match in directory.rglob(filename):
                    if match.is_file():
                        return match
            except Exception:
                pass
    return None

def seed_users(db: Session):
    """Seed the 4 required demo accounts."""
    demo_accounts = [
        {
            "username": "dilani",
            "role": "dispatcher",
            "display_name": "Dilani (Lead Dispatcher)",
            "phone": "+94 77 1234567",
            "outlet_id": None,
            "vehicle_id": None,
        },
        {
            "username": "rizwan",
            "role": "loader",
            "display_name": "Rizwan (Head Loader)",
            "phone": "+94 77 2345678",
            "outlet_id": None,
            "vehicle_id": None,
        },
        {
            "username": "sunil",
            "role": "driver",
            "display_name": "Sunil (Senior Driver)",
            "phone": "+94 77 3456789",
            "outlet_id": None,
            "vehicle_id": "VEH036",
        },
        {
            "username": "kavitha",
            "role": "store_manager",
            "display_name": "Kavitha (Manager OUT001)",
            "phone": "+94 77 4567890",
            "outlet_id": "OUT001",
            "vehicle_id": None,
        },
    ]

    for acc in demo_accounts:
        existing = db.query(User).filter(User.username == acc["username"]).first()
        if not existing:
            user = User(
                username=acc["username"],
                password_hash=get_password_hash("password123"),
                role=acc["role"],
                display_name=acc["display_name"],
                phone=acc["phone"],
                outlet_id=acc["outlet_id"],
                vehicle_id=acc["vehicle_id"],
            )
            db.add(user)
    db.commit()

COLOMBO_COORDINATES_MAP: Dict[str, tuple[float, float]] = {
    "OUT001": (6.9034, 79.8512),  # Colpetty (Colombo 03 / Galle Road)
    "OUT002": (6.8905, 79.8587),  # Bambalapitiya (Colombo 04 / Duplication Road)
    "OUT003": (6.9147, 79.8530),  # Kollupitiya (Colombo 03 / Marine Drive)
    "OUT004": (6.8850, 79.8654),  # Havelock Town (Colombo 05)
    "OUT005": (6.9110, 79.8670),  # Cinnamon Gardens (Colombo 07)
    "OUT006": (6.9214, 79.8510),  # Slave Island (Colombo 02)
    "OUT007": (6.9150, 79.8780),  # Borella (Colombo 08)
    "OUT008": (6.8740, 79.8610),  # Wellawatte (Colombo 06)
    "OUT009": (6.9270, 79.8690),  # Maradana (Colombo 10)
    "OUT010": (6.9344, 79.8428),  # Fort (Colombo 01)
    "OUT011": (6.8800, 79.8860),  # Nugegoda
    "OUT012": (6.8950, 79.8740),  # Thimbirigasyaya
    "OUT013": (6.9050, 79.8800),  # Nawala
    "OUT014": (6.9300, 79.8550),  # Pettah
}

DISTRICT_CENTROIDS: Dict[str, tuple[float, float]] = {
    "Colombo": (6.9271, 79.8612),
    "Gampaha": (7.0840, 79.9939),
    "Kalutara": (6.5854, 79.9607),
    "Kandy": (7.2906, 80.6337),
    "Galle": (6.0329, 80.2170),
    "Matara": (5.9549, 80.5550),
    "Kurunegala": (7.4863, 80.3623),
    "Ratnapura": (6.6828, 80.4034),
    "Anuradhapura": (8.3114, 80.4037),
}

def resolve_outlet_coordinates(out_id: str, district: str) -> tuple[float, float]:
    """Resolve accurate Sri Lankan coordinates for outlet destination routing."""
    if out_id in COLOMBO_COORDINATES_MAP:
        return COLOMBO_COORDINATES_MAP[out_id]
    base_lat, base_lon = DISTRICT_CENTROIDS.get(district, (6.9271, 79.8612))
    num_suffix = int("".join(c for c in out_id if c.isdigit()) or "1")
    offset_lat = ((num_suffix * 13) % 40 - 20) * 0.003
    offset_lon = ((num_suffix * 17) % 40 - 20) * 0.003
    return (round(base_lat + offset_lat, 4), round(base_lon + offset_lon, 4))
def seed_calendar(db: Session, force_reload: bool = False):
    """Seed the operating calendar independently of the rest of reference data,
    so an existing (already-seeded) database picks it up additively on next
    startup instead of needing a full reseed."""
    if not force_reload and db.query(OperatingCalendarDay).count() > 0:
        return
    calendar_path = find_csv_file("calendar.csv")
    if calendar_path and calendar_path.exists():
        df_cal = pd.read_csv(calendar_path)
        db.query(OperatingCalendarDay).delete()
        for _, row in df_cal.iterrows():
            db.add(OperatingCalendarDay(
                date=pd.to_datetime(row["date"]).date(),
                is_operating=bool(row["is_operating"]),
                is_weekend=bool(row.get("is_weekend", False)),
                is_holiday=bool(row.get("is_holiday", False)),
            ))
        db.commit()
        print("[RightGo] Operating calendar seeded.")

def seed_reference_data(db: Session, force_reload: bool = False):
    """Load competition CSVs and seed database tables."""
    seed_users(db)
    seed_calendar(db, force_reload=force_reload)

    # If already seeded, ensure coordinates are populated on all outlets
    if not force_reload and db.query(Vehicle).count() > 0 and db.query(Outlet).count() > 0 and (db.query(ReleasedTrip).count() > 0 or not settings.RIGHTGO_SEED_DEMO_RUN):
        unassigned_outlets = db.query(Outlet).filter(Outlet.latitude == None).all()
        if unassigned_outlets:
            for out in unassigned_outlets:
                lat, lon = resolve_outlet_coordinates(out.outlet_id, out.district)
                out.latitude = lat
                out.longitude = lon
            db.commit()
        return

    print("[RightGo] Seeding reference data from competition CSVs in Rules/data...")

    # Clean tables in strict foreign-key dependency order
    if force_reload:
        try:
            db.query(OrderLoadingState).delete()
            db.query(LoadingIssue).delete()
            db.query(DeliveryRecord).delete()
            db.query(DriverIssue).delete()
            db.query(ReceiptRecord).delete()
            db.query(ReleasedTrip).delete()
            db.query(ReleasedManifest).delete()
            db.query(DraftAssignment).delete()
            db.query(DraftStopSequence).delete()
            db.query(DraftTripMeta).delete()
            db.query(DraftVehicleFuelInput).delete()
            db.query(DraftPlan).delete()
            db.query(ScenarioFleetEntry).delete()
            db.query(Order).delete()
            db.query(Vehicle).delete()
            db.query(Outlet).delete()
            db.query(ServiceAllowance).delete()
            db.query(DistrictTravel).delete()
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"[RightGo] Cascade delete notice: {e}")

    # 2. Service Allowance
    allowance_path = find_csv_file("service_allowance.csv")
    if allowance_path and allowance_path.exists():
        df_al = pd.read_csv(allowance_path)
        if db.query(ServiceAllowance).count() == 0:
            for _, row in df_al.iterrows():
                db.add(ServiceAllowance(
                    brand=str(row["brand"]),
                    dock_type=str(row["dock_type"]),
                    service_allowance_min=float(row["service_allowance_min"]),
                ))
            db.commit()

    # 3. District Travel
    travel_path = find_csv_file("district_travel.csv")
    if travel_path and travel_path.exists():
        df_tr = pd.read_csv(travel_path)
        if db.query(DistrictTravel).count() == 0:
            for _, row in df_tr.iterrows():
                db.add(DistrictTravel(
                    district=str(row["district"]),
                    depot=str(row["depot"]),
                    road_class=str(row["road_class"]),
                    free_flow_kmh=float(row["free_flow_kmh"]),
                    depot_to_district_km=float(row["depot_to_district_km"]),
                    depot_to_district_freeflow_min=float(row["depot_to_district_freeflow_min"]),
                    inter_stop_km=float(row["inter_stop_km"]),
                    inter_stop_freeflow_min=float(row["inter_stop_freeflow_min"]),
                ))
            db.commit()

    # 4. Vehicles
    veh_path = find_csv_file("vehicles.csv")
    if veh_path and veh_path.exists():
        df_veh = pd.read_csv(veh_path)
        if db.query(Vehicle).count() == 0:
            for _, row in df_veh.iterrows():
                db.add(Vehicle(
                    vehicle_id=str(row["vehicle_id"]),
                    type=str(row["type"]),
                    temp=str(row["temp"]),
                    weight_cap_kg=float(row["weight_cap_kg"]),
                    volume_cap_m3=float(row["volume_cap_m3"]),
                    fuel_type=str(row["fuel_type"]),
                    km_per_l=float(row["km_per_l"]),
                    weekly_fuel_quota_l=float(row["weekly_fuel_quota_l"]),
                    depot=str(row["depot"]),
                ))
            db.commit()

    # 5. Scenario Fleet
    fleet_path = find_csv_file("task2b_peak_day_fleet.csv")
    if fleet_path and fleet_path.exists():
        df_fleet = pd.read_csv(fleet_path)
        if db.query(ScenarioFleetEntry).count() == 0:
            for _, row in df_fleet.iterrows():
                db.add(ScenarioFleetEntry(
                    scenario=str(row["scenario"]),
                    vehicle_id=str(row["vehicle_id"]),
                    status=str(row["status"]),
                ))
            db.commit()

    # 6. Outlets
    outlets_path = find_csv_file("outlets.csv")
    if outlets_path and outlets_path.exists():
        df_out = pd.read_csv(outlets_path)
        if db.query(Outlet).count() == 0:
            for _, row in df_out.iterrows():
                mall_win = str(row["mall_window"]) if pd.notna(row.get("mall_window")) and str(row["mall_window"]).strip() else None
                out_id = str(row["outlet_id"])
                district = str(row["district"])
                brand = str(row["brand"])
                lat, lon = resolve_outlet_coordinates(out_id, district)
                db.add(Outlet(
                    outlet_id=out_id,
                    name=f"{out_id} / {district} {brand} Outlet",
                    brand=brand,
                    district=district,
                    depot=str(row["depot"]),
                    dock_type=str(row["dock_type"]),
                    parking_constraint=str(row["parking_constraint"]),
                    mall_window=mall_win,
                    window_open_time=str(row["window_open_time"]),
                    window_close_time=str(row["window_close_time"]),
                    address=f"No. {out_id[-3:]} Commercial Ave, {district}",
                    manager_name=f"Manager {out_id}",
                    phone=f"+94 77 100{out_id[-3:]}",
                    operating_days="Daily (Mon - Sat, Opens 08:00 AM)",
                    latitude=lat,
                    longitude=lon,
                ))
            db.commit()

    # 7. Orders (Scenario S1)
    scenarios_path = find_csv_file("task2b_peak_day_scenarios.csv")
    if scenarios_path and scenarios_path.exists():
        df_scn = pd.read_csv(scenarios_path)
        if db.query(Order).filter(Order.scenario == "S1").count() == 0:
            for _, row in df_scn.iterrows():
                mall_win = str(row["mall_window"]) if pd.notna(row.get("mall_window")) and str(row["mall_window"]).strip() else None
                db.add(Order(
                    scenario=str(row["scenario"]),
                    order_ref=str(row["order_ref"]),
                    outlet_id=str(row["outlet_id"]),
                    brand=str(row["brand"]),
                    district=str(row["district"]),
                    depot=str(row["depot"]),
                    dock_type=str(row["dock_type"]),
                    parking_constraint=str(row["parking_constraint"]),
                    mall_window=mall_win,
                    window_open_time=str(row["window_open_time"]),
                    window_close_time=str(row["window_close_time"]),
                    temp_requirement=str(row["temp_requirement"]),
                    order_units=int(row["order_units"]),
                    order_weight_kg=float(row["order_weight_kg"]),
                    order_volume_m3=float(row["order_volume_m3"]),
                    deferred_yesterday=bool(row["deferred_yesterday"]),
                    days_since_last_served=int(row["days_since_last_served"]),
                    status="awaiting_planning",
                ))
            db.commit()

    # 8. Initialize Draft Plan for S1 if not exists
    draft = db.query(DraftPlan).filter(DraftPlan.scenario == "S1").first()
    if not draft:
        draft = DraftPlan(scenario="S1", draft_revision=0, updated_by="Sarah Jenkins")
        db.add(draft)
        db.commit()

        # Seed initial draft assignments as unresolved
        orders = db.query(Order).filter(Order.scenario == "S1").all()
        for o in orders:
            db.add(DraftAssignment(
                scenario="S1",
                order_ref=o.order_ref,
                decision="unresolved",
                vehicle_id=None,
                trip_no=None,
                reason_code=None,
                reason_note=None,
            ))
        db.commit()

    # 9. Optional canned demo run (RIGHTGO_SEED_DEMO_RUN=true): an already-departed v1 for the driver demo
    if not force_reload and settings.RIGHTGO_SEED_DEMO_RUN:
        active_manifest = db.query(ReleasedManifest).filter(ReleasedManifest.is_active == True).first()
        if not active_manifest:
            active_manifest = ReleasedManifest(
                version=1,
                scenario="S1",
                published_at_str="03:15",
                decision_maker="Sarah Jenkins",
                shortfall_policy="ship_good_tell_store",
                is_active=True,
                acknowledgement="acknowledged",
                acknowledged_by="Rizwan (Head Loader)",
            )
            db.add(active_manifest)
            db.commit()
            db.refresh(active_manifest)

            # Seed Driver Sunil's Active Trip VEH036 (Trip 1)
            driver_trip = ReleasedTrip(
                manifest_id=active_manifest.id,
                manifest_version=1,
                scenario="S1",
                vehicle_id="VEH036",
                trip_no=1,
                trip_id_str="S1-T001",
            brand="Fresh",
            district="Colombo",
            depot="Peliyagoda",
            planned_departure_time="04:30",
            leave_by_time="04:45",
            stop_outlet_ids=["OUT001", "OUT002", "OUT003", "OUT004"],
            order_refs=["S1-000", "S1-001", "S1-002", "S1-003", "S1-004", "S1-005", "S1-006", "S1-007"],
            loading_status="departed",
            otp_code="849201",
            otp_attempts=0,
            otp_unlocked=True,
        )
        db.add(driver_trip)

        # Also seed VEH006 trip
        trip2 = ReleasedTrip(
            manifest_id=active_manifest.id,
            manifest_version=2,
            scenario="S1",
            vehicle_id="VEH006",
            trip_no=1,
            trip_id_str="S1-T002",
            brand="Fresh",
            district="Colombo",
            depot="Peliyagoda",
            planned_departure_time="04:00",
            leave_by_time="04:15",
            stop_outlet_ids=["OUT005", "OUT008", "OUT009", "OUT010"],
            order_refs=["S1-008", "S1-009", "S1-013", "S1-014", "S1-015", "S1-016", "S1-017"],
            loading_status="departed",
            otp_code="521943",
            otp_attempts=0,
            otp_unlocked=True,
        )
        db.add(trip2)
        db.commit()

    print("[RightGo] Reference data and active trips successfully seeded.")
