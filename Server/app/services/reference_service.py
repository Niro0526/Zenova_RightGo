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
    Calendar,
)
from app.models.order import Order
from app.models.plan import DraftPlan, DraftAssignment, ReleasedManifest, ReleasedTrip

def find_csv_file(filename: str) -> Optional[Path]:
    """Search for dataset CSV file in configured data directories."""
    search_dirs = [
        Path(settings.RIGHTGO_DATA_DIR),
        Path(__file__).resolve().parent.parent.parent.parent / "data",
        Path(__file__).resolve().parent.parent.parent.parent / "Rules" / "data",
    ]
    for directory in search_dirs:
        if directory.exists():
            candidate = directory / filename
            if candidate.exists():
                return candidate
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
            "vehicle_id": "PEL-R04",
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

def seed_reference_data(db: Session, force_reload: bool = False):
    """Load competition CSVs and seed database tables."""
    seed_users(db)

    # 1. Check if already seeded
    has_dataset_orders = db.query(Order.delivery_id).filter(Order.delivery_id.isnot(None)).first()
    if not force_reload and db.query(Vehicle).count() > 0 and has_dataset_orders:
        return

    print("[RightGo] Seeding reference data from competition CSVs...")

    # 2. Service allowances are not part of the supplied dataset set.
    db.query(ServiceAllowance).delete()
    db.commit()

    # 3. District Travel
    travel_path = find_csv_file("district_travel.csv")
    if travel_path and travel_path.exists():
        df_tr = pd.read_csv(travel_path)
        db.query(DistrictTravel).delete()
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

    # 3b. Calendar
    calendar_path = find_csv_file("calendar.csv")
    if calendar_path and calendar_path.exists():
        df_calendar = pd.read_csv(calendar_path)
        db.query(Calendar).delete()
        for _, row in df_calendar.iterrows():
            db.add(Calendar(
                date=pd.to_datetime(row["date"]).date(),
                dow=int(row["dow"]),
                dow_name=str(row["dow_name"]),
                is_weekend=bool(row["is_weekend"]),
                iso_year=int(row["iso_year"]),
                iso_week=int(row["iso_week"]),
                is_payday=bool(row["is_payday"]),
                festival=str(row["festival"]) if pd.notna(row["festival"]) else None,
                festival_ramp=float(row["festival_ramp"]),
                is_holiday=bool(row["is_holiday"]),
                monsoon=bool(row["monsoon"]),
                is_operating=bool(row["is_operating"]),
            ))
        db.commit()

    # 4. Vehicles
    veh_path = find_csv_file("vehicles.csv")
    if veh_path and veh_path.exists():
        df_veh = pd.read_csv(veh_path)
        db.query(Vehicle).delete()
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

    # 5. Scenario fleet: the supplied vehicle dataset is the fleet source.
    db.query(ScenarioFleetEntry).delete()
    for vehicle in db.query(Vehicle).all():
        db.add(ScenarioFleetEntry(scenario="S1", vehicle_id=vehicle.vehicle_id, status="available"))
    db.commit()

    # 6. Outlets
    outlets_path = find_csv_file("outlets.csv")
    if outlets_path and outlets_path.exists():
        df_out = pd.read_csv(outlets_path)
        db.query(Outlet).delete()
        for _, row in df_out.iterrows():
            mall_win = str(row["mall_window"]) if pd.notna(row.get("mall_window")) and str(row["mall_window"]).strip() else None
            out_id = str(row["outlet_id"])
            db.add(Outlet(
                outlet_id=out_id,
                name=f"{out_id} / {row['district']} Outlet",
                brand=str(row["brand"]),
                district=str(row["district"]),
                depot=str(row["depot"]),
                dock_type=str(row["dock_type"]),
                parking_constraint=str(row["parking_constraint"]),
                mall_window=mall_win,
                window_open_time=str(row["window_open_time"]),
                window_close_time=str(row["window_close_time"]),
                address=f"No. {out_id[-3:]} Commercial Ave, {row['district']}",
                manager_name=f"Manager {out_id}",
                phone=f"+94 77 100{out_id[-3:]}",
                operating_days="Daily (Mon - Sat, Opens 08:00 AM)",
            ))
        db.commit()

    # 7. Orders: deliveries_train.csv is the supplied order/delivery source.
    deliveries_path = find_csv_file("deliveries_train.csv")
    if deliveries_path and deliveries_path.exists():
        df_deliveries = pd.read_csv(deliveries_path)
        db.query(Order).filter(Order.scenario == "S1").delete()
        outlets_by_id = {o.outlet_id: o for o in db.query(Outlet).all()}
        for _, row in df_deliveries.iterrows():
            delivery_id = str(row["delivery_id"])
            outlet = outlets_by_id.get(str(row["outlet_id"]))
            if not outlet:
                continue
            db.add(Order(
                scenario="S1",
                order_ref=delivery_id,
                delivery_id=delivery_id,
                outlet_id=str(row["outlet_id"]),
                brand=str(row["brand"]),
                district=outlet.district,
                depot=outlet.depot,
                dock_type=outlet.dock_type,
                parking_constraint=outlet.parking_constraint,
                mall_window=outlet.mall_window,
                window_open_time=str(row["window_open_time"]),
                window_close_time=str(row["window_close_time"]),
                temp_requirement=str(row["temp_requirement"]),
                order_units=int(row["order_units"]),
                order_weight_kg=float(row["order_weight_kg"]),
                order_volume_m3=float(row["order_volume_m3"]),
                deferred_yesterday=False,
                days_since_last_served=1,
                status="awaiting_planning",
                created_at=pd.to_datetime(row["order_date"], utc=True).to_pydatetime(),
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

    print("[RightGo] Reference data successfully seeded.")
