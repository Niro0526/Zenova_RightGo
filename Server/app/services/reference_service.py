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
    Product,
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
            "username": "kamal",
            "role": "driver",
            "display_name": "Kamal (Colombo Specialist Driver)",
            "phone": "+94 77 3456780",
            "outlet_id": None,
            "vehicle_id": "VEH006",
        },
        {
            "username": "nimal",
            "role": "driver",
            "display_name": "Nimal (Cold-Chain Reefer Driver)",
            "phone": "+94 77 3456781",
            "outlet_id": None,
            "vehicle_id": "PEL-R04",
        },
        {
            "username": "anura",
            "role": "driver",
            "display_name": "Anura (Heavy Commercial Driver)",
            "phone": "+94 77 3456782",
            "outlet_id": None,
            "vehicle_id": "VEH014",
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
                email=f"{acc['username']}@rightgo.lk",
                password_hash=get_password_hash("password123"),
                role=acc["role"],
                display_name=acc["display_name"],
                phone=acc["phone"],
                outlet_id=acc["outlet_id"],
                vehicle_id=acc["vehicle_id"],
                email_verified=True,
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

    # 7. Orders (Scenario S1) - Only loaded if force_reload=True (e.g. during pytest suite or explicit scenario seed)
    if force_reload:
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
        draft = DraftPlan(scenario="S1", draft_revision=0, updated_by="Dilani Perera (Chief Dispatcher)")
        db.add(draft)
        db.commit()

        # Seed initial draft assignments for existing scenario orders if any
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
                decision_maker="Dilani Perera (Chief Dispatcher)",
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

    seed_product_catalog(db)
    print("[RightGo] Reference data, product catalog, and active trips successfully seeded.")

def seed_product_catalog(db: Session):
    """Seed central depot product catalog for all 3 brands with realistic images and physical specs."""
    catalog_items = [
        # --- FRESH: Chilled Dairy & Perishables ---
        {
            "id": "PRD-FR-001",
            "sku": "SKU-MILK-1L",
            "name": "Peliyagoda Farm Fresh Whole Milk (1L x 12 Crates)",
            "brand": "Fresh",
            "category": "Chilled Dairy",
            "temp": "chilled",
            "is_chilled": True,
            "unit": "crates",
            "unit_weight": 12.5,
            "unit_vol": 0.024,
            "price": 4800.0,
            "stock_quantity": 450,
            "stock_status": "in_stock",
            "image": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80",
            "description": "Grade A pasteurized full cream milk crates. Must be kept at +4°C reefer compartment.",
        },
        {
            "id": "PRD-FR-002",
            "sku": "SKU-YOGURT-GREEK",
            "name": "Highland Greek Style Probiotic Yogurt (1kg Tub x 6)",
            "brand": "Fresh",
            "category": "Chilled Dairy",
            "temp": "chilled",
            "is_chilled": True,
            "unit": "packs",
            "unit_weight": 6.2,
            "unit_vol": 0.012,
            "price": 3600.0,
            "stock_quantity": 280,
            "stock_status": "in_stock",
            "image": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&auto=format&fit=crop&q=80",
            "description": "Rich artisanal Greek yogurt tub pack for dairy shelf replenishment.",
        },
        {
            "id": "PRD-FR-003",
            "sku": "SKU-BUTTER-SALTED",
            "name": "Ceylon Pasture Salted Creamery Butter (250g x 20)",
            "brand": "Fresh",
            "category": "Chilled Dairy",
            "temp": "chilled",
            "is_chilled": True,
            "unit": "boxes",
            "unit_weight": 5.2,
            "unit_vol": 0.009,
            "price": 8200.0,
            "stock_quantity": 190,
            "stock_status": "in_stock",
            "image": "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&auto=format&fit=crop&q=80",
            "description": "Pure cream butter slabs wrapped in gold foil packaging.",
        },
        {
            "id": "PRD-FR-004",
            "sku": "SKU-STRAWBERRY-NUV",
            "name": "Nuwara Eliya Hydroponic Strawberries (500g Clamshell x 8)",
            "brand": "Fresh",
            "category": "Chilled Perishables",
            "temp": "chilled",
            "is_chilled": True,
            "unit": "trays",
            "unit_weight": 4.3,
            "unit_vol": 0.015,
            "price": 5400.0,
            "stock_quantity": 85,
            "stock_status": "low_stock",
            "image": "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=500&auto=format&fit=crop&q=80",
            "description": "Freshly hand-picked highland strawberries packed in breathable ventilated trays.",
        },
        {
            "id": "PRD-FR-005",
            "sku": "SKU-SALMON-NOR",
            "name": "Fresh Atlantic Salmon Fillet Vacuum Portions (1kg x 5)",
            "brand": "Fresh",
            "category": "Poultry & Meats",
            "temp": "chilled",
            "is_chilled": True,
            "unit": "boxes",
            "unit_weight": 5.5,
            "unit_vol": 0.011,
            "price": 18500.0,
            "stock_quantity": 120,
            "stock_status": "in_stock",
            "image": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500&auto=format&fit=crop&q=80",
            "description": "Sashimi-grade salmon portions pre-chilled on gel ice packs.",
        },
        {
            "id": "PRD-FR-006",
            "sku": "SKU-CHICKEN-BREAST",
            "name": "Skinless Tender Chicken Breast Trays (1kg x 10)",
            "brand": "Fresh",
            "category": "Poultry & Meats",
            "temp": "chilled",
            "is_chilled": True,
            "unit": "crates",
            "unit_weight": 10.5,
            "unit_vol": 0.020,
            "price": 12000.0,
            "stock_quantity": 310,
            "stock_status": "in_stock",
            "image": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=500&auto=format&fit=crop&q=80",
            "description": "HACCP certified fresh poultry breast cuts for retail chillers.",
        },
        # --- FRESH: Ambient Dry Goods & Staples ---
        {
            "id": "PRD-FR-007",
            "sku": "SKU-RICE-BASMATI",
            "name": "Imperial Royal Basmati Aged Long Grain Rice (5kg Bag x 4)",
            "brand": "Fresh",
            "category": "Grains & Pantry Staples",
            "temp": "ambient",
            "is_chilled": False,
            "unit": "bags",
            "unit_weight": 20.0,
            "unit_vol": 0.035,
            "price": 14000.0,
            "stock_quantity": 600,
            "stock_status": "in_stock",
            "image": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80",
            "description": "Premium 2-year aged aromatic basmati rice bulk sack carton.",
        },
        {
            "id": "PRD-FR-008",
            "sku": "SKU-TEA-BOPF",
            "name": "Pure Ceylon Single Estate BOPF Black Tea (500g Tin x 12)",
            "brand": "Fresh",
            "category": "Beverages & Spices",
            "temp": "ambient",
            "is_chilled": False,
            "unit": "cartons",
            "unit_weight": 6.5,
            "unit_vol": 0.016,
            "price": 16800.0,
            "stock_quantity": 420,
            "stock_status": "in_stock",
            "image": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80",
            "description": "High-grown Ceylon tea master export quality tin canister cases.",
        },
        {
            "id": "PRD-FR-009",
            "sku": "SKU-HONEY-WILD",
            "name": "Bee Honey Pure Organic Highlands Jar (500ml x 12)",
            "brand": "Fresh",
            "category": "Grains & Pantry Staples",
            "temp": "ambient",
            "is_chilled": False,
            "unit": "cases",
            "unit_weight": 8.0,
            "unit_vol": 0.014,
            "price": 19200.0,
            "stock_quantity": 210,
            "stock_status": "in_stock",
            "image": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500&auto=format&fit=crop&q=80",
            "description": "100% unfiltered raw forest honey in glass jar master packs.",
        },
        {
            "id": "PRD-FR-010",
            "sku": "SKU-SPICE-CINNAMON",
            "name": "Alba Pure Ceylon Cinnamon Quills Box (250g x 16)",
            "brand": "Fresh",
            "category": "Beverages & Spices",
            "temp": "ambient",
            "is_chilled": False,
            "unit": "boxes",
            "unit_weight": 4.5,
            "unit_vol": 0.010,
            "price": 22400.0,
            "stock_quantity": 350,
            "stock_status": "in_stock",
            "image": "https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=500&auto=format&fit=crop&q=80",
            "description": "True Alba grade Ceylon cinnamon quills in airtight luxury tins.",
        },

        # --- TECH: Consumer Electronics & Computing ---
        {
            "id": "PRD-TC-001",
            "sku": "SKU-PHONE-NOVA5",
            "name": "Zenova Nova 5G Pro Smartphone (256GB Sapphire Blue x 5)",
            "brand": "Tech",
            "category": "Smartphones & Mobile",
            "temp": "ambient",
            "is_chilled": False,
            "unit": "cartons",
            "unit_weight": 2.8,
            "unit_vol": 0.008,
            "price": 375000.0,
            "stock_quantity": 140,
            "stock_status": "in_stock",
            "image": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=80",
            "description": "High-tier AMOLED 120Hz smartphones in retail secure tamper-evident cases.",
        },
        {
            "id": "PRD-TC-002",
            "sku": "SKU-EARBUDS-PRO",
            "name": "Pulse Wireless Active Noise-Cancelling Earbuds (Pack of 10)",
            "brand": "Tech",
            "category": "Audio & Accessories",
            "temp": "ambient",
            "is_chilled": False,
            "unit": "packs",
            "unit_weight": 1.6,
            "unit_vol": 0.005,
            "price": 98000.0,
            "stock_quantity": 250,
            "stock_status": "in_stock",
            "image": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80",
            "description": "Hi-Res LDAC ANC earbuds with 36hr battery case retail packs.",
        },
        {
            "id": "PRD-TC-003",
            "sku": "SKU-LAPTOP-AIR14",
            "name": "Zenova Book Air 14 Ultralight Laptop M-Series (Master Carton x 3)",
            "brand": "Tech",
            "category": "Computing & Hardware",
            "temp": "ambient",
            "is_chilled": False,
            "unit": "cartons",
            "unit_weight": 6.8,
            "unit_vol": 0.022,
            "price": 645000.0,
            "stock_quantity": 60,
            "stock_status": "in_stock",
            "image": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&auto=format&fit=crop&q=80",
            "description": "High efficiency magnesium chassis ultra-portable notebooks.",
        },
        {
            "id": "PRD-TC-004",
            "sku": "SKU-CHARGER-65W",
            "name": "GaN Ultra-Fast 65W Triple-Port USB-C Hub Adapter (Box of 20)",
            "brand": "Tech",
            "category": "Accessories & Power",
            "temp": "ambient",
            "is_chilled": False,
            "unit": "boxes",
            "unit_weight": 3.4,
            "unit_vol": 0.007,
            "price": 84000.0,
            "stock_quantity": 400,
            "stock_status": "in_stock",
            "image": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&auto=format&fit=crop&q=80",
            "description": "Gallium nitride fast chargers compatible with laptops and mobiles.",
        },
        {
            "id": "PRD-TC-005",
            "sku": "SKU-KEYBOARD-MECH",
            "name": "Vanguard RGB Mechanical Hot-Swap Keyboard (Box of 6)",
            "brand": "Tech",
            "category": "Computing & Hardware",
            "temp": "ambient",
            "is_chilled": False,
            "unit": "boxes",
            "unit_weight": 7.2,
            "unit_vol": 0.018,
            "price": 102000.0,
            "stock_quantity": 110,
            "stock_status": "in_stock",
            "image": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop&q=80",
            "description": "Aluminum chassis mechanical gaming keyboards with PBT keycaps.",
        },

        # --- STYLE: Apparel, Footwear, Fashion Accessories ---
        {
            "id": "PRD-ST-001",
            "sku": "SKU-SHIRT-LINEN",
            "name": "Coastal Breathable 100% Linen Resort Shirts (Pack of 12 Assorted)",
            "brand": "Style",
            "category": "Apparel & Tops",
            "temp": "ambient",
            "is_chilled": False,
            "unit": "packs",
            "unit_weight": 3.2,
            "unit_vol": 0.014,
            "price": 54000.0,
            "stock_quantity": 320,
            "stock_status": "in_stock",
            "image": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop&q=80",
            "description": "Premium garment-dyed linen button-downs on hanger sets.",
        },
        {
            "id": "PRD-ST-002",
            "sku": "SKU-JEANS-SELVEDGE",
            "name": "Heritage Raw Selvedge Denim Tapered Jeans (Carton of 10)",
            "brand": "Style",
            "category": "Apparel & Bottoms",
            "temp": "ambient",
            "is_chilled": False,
            "unit": "cartons",
            "unit_weight": 8.5,
            "unit_vol": 0.026,
            "price": 78000.0,
            "stock_quantity": 210,
            "stock_status": "in_stock",
            "image": "https://images.unsplash.com/photo-1542272604-780c96856592?w=500&auto=format&fit=crop&q=80",
            "description": "13.5oz indigo Japanese selvedge denim jeans master carton.",
        },
        {
            "id": "PRD-ST-003",
            "sku": "SKU-SNEAKER-RUNNER",
            "name": "Aero Knit Lightweight Performance Sneakers (Carton of 8 Pairs)",
            "brand": "Style",
            "category": "Footwear",
            "temp": "ambient",
            "is_chilled": False,
            "unit": "cartons",
            "unit_weight": 7.4,
            "unit_vol": 0.038,
            "price": 112000.0,
            "stock_quantity": 175,
            "stock_status": "in_stock",
            "image": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80",
            "description": "Responsive cushioned breathable running footwear boxed pairs.",
        },
        {
            "id": "PRD-ST-004",
            "sku": "SKU-BAG-DUFFEL",
            "name": "Voyager Full-Grain Leather Weekend Travel Duffel (Box of 4)",
            "brand": "Style",
            "category": "Bags & Luggage",
            "temp": "ambient",
            "is_chilled": False,
            "unit": "boxes",
            "unit_weight": 6.8,
            "unit_vol": 0.032,
            "price": 96000.0,
            "stock_quantity": 90,
            "stock_status": "in_stock",
            "image": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=80",
            "description": "Handcrafted vegetable-tanned leather duffel bags with brass hardware.",
        },
        {
            "id": "PRD-ST-005",
            "sku": "SKU-SUNGLASS-POLAR",
            "name": "Aviator Polarized Titanium Sunglasses Display Set (Case of 15)",
            "brand": "Style",
            "category": "Accessories",
            "temp": "ambient",
            "is_chilled": False,
            "unit": "cases",
            "unit_weight": 1.9,
            "unit_vol": 0.006,
            "price": 67500.0,
            "stock_quantity": 160,
            "stock_status": "in_stock",
            "image": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&auto=format&fit=crop&q=80",
            "description": "UV400 anti-glare polarized aviator sunglasses with protective hard cases.",
        },
    ]

    for item in catalog_items:
        existing = db.query(Product).filter(Product.id == item["id"]).first()
        if not existing:
            db.add(Product(**item))
        else:
            for k, v in item.items():
                setattr(existing, k, v)
    db.commit()

