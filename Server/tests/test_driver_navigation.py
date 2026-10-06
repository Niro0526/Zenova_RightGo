"""Tests for Driver Map & Navigation: Outlet coordinates persistence, API delivery stop coords, and resolution."""

import pytest
from app.models.reference import Outlet
from app.services.reference_service import resolve_outlet_coordinates, seed_reference_data
from app.services.planning_service import suggest_plan_greedy, release_plan, set_vehicle_fuel_input

def confirm_fuel_for_used_vehicles(db_session, draft, scenario="S1"):
    """Fuel is never auto-confirmed by the greedy planner - tests that release a
    greedy-suggested plan must confirm it first, the same as a real dispatcher would."""
    vehicle_ids = {a["vehicleId"] for a in draft["assignments"].values() if a.get("vehicleId")}
    for vid in vehicle_ids:
        suggested = set_vehicle_fuel_input(db_session, vid, 0.0, scenario=scenario)
    return suggested if vehicle_ids else draft

from app.models.plan import ReleasedTrip, OrderLoadingState
from app.services.loading_service import acknowledge_manifest, mark_order_loaded, depart_trip

def test_outlet_coordinates_persistence(db_session):
    """Test that outlet model stores and retrieves float latitude/longitude coordinates."""
    outlet = Outlet(
        outlet_id="OUT_TEST_NAV",
        name="Test Navigation Outlet",
        brand="Keells Super",
        district="Colombo",
        depot="Colombo",
        dock_type="street",
        parking_constraint="van_only",
        window_open_time="05:00",
        window_close_time="07:30",
        operating_days="Mon,Tue,Wed,Thu,Fri,Sat",
        manager_name="Mr. Perera",
        phone="+94 77 1234567",
        address="123 Galle Road, Colombo 03",
        latitude=6.9034,
        longitude=79.8512,
    )
    db_session.add(outlet)
    db_session.commit()

    fetched = db_session.query(Outlet).filter(Outlet.outlet_id == "OUT_TEST_NAV").first()
    assert fetched is not None
    assert fetched.latitude == pytest.approx(6.9034, 0.0001)
    assert fetched.longitude == pytest.approx(79.8512, 0.0001)

def test_resolve_outlet_coordinates_known_and_fallback():
    """Test coordinate resolution for known Sri Lankan landmarks and district centroids."""
    # Known outlet OUT001 -> Colpetty (6.9034, 79.8512)
    lat, lng = resolve_outlet_coordinates("OUT001", "Colombo")
    assert lat == pytest.approx(6.9034, 0.0001)
    assert lng == pytest.approx(79.8512, 0.0001)

    # Known outlet OUT002 -> Bambalapitiya (6.8905, 79.8587)
    lat, lng = resolve_outlet_coordinates("OUT002", "Colombo")
    assert lat == pytest.approx(6.8905, 0.0001)
    assert lng == pytest.approx(79.8587, 0.0001)

    # Unknown outlet with district fallback (Kandy) returns valid coordinates
    lat, lng = resolve_outlet_coordinates("OUT999", "Kandy")
    assert isinstance(lat, float)
    assert isinstance(lng, float)
    assert 5.0 <= lat <= 10.0
    assert 79.0 <= lng <= 82.0

def test_driver_my_run_includes_coordinates(client, db_session, driver_auth):
    """Test that driver my-run stops return outlet destination coordinates."""
    # Create and release a plan
    draft = suggest_plan_greedy(db_session, "S1")
    # Fuel must be dispatcher-confirmed before release - the greedy planner
    # deliberately leaves it unverified rather than fabricating a figure.
    draft = confirm_fuel_for_used_vehicles(db_session, draft)
    manifest = release_plan(db_session, draft["draftRevision"], scenario="S1")
    trip = db_session.query(ReleasedTrip).filter(
        ReleasedTrip.manifest_id == manifest.id,
        ReleasedTrip.vehicle_id == "VEH036",
    ).first()
    assert trip is not None, "Expected driver Sunil's own vehicle (VEH036) to have a released trip"
    acknowledge_manifest(db_session, manifest.version)
    for st in db_session.query(OrderLoadingState).filter(OrderLoadingState.released_trip_id == trip.id).all():
        mark_order_loaded(db_session, trip.id, st.order_ref)
    depart_trip(db_session, trip.id)

    # /api/driver/my-run always resolves via the authenticated driver's own
    # assigned vehicle, never a client-supplied trip id.
    response = client.get("/api/driver/my-run", headers=driver_auth)
    assert response.status_code == 200
    data = response.json()

    assert "stops" in data
    assert len(data["stops"]) > 0
    first_stop = data["stops"][0]
    assert "latitude" in first_stop
    assert "longitude" in first_stop
    assert first_stop["latitude"] is not None
    assert first_stop["longitude"] is not None
    assert isinstance(first_stop["latitude"], (int, float))
    assert isinstance(first_stop["longitude"], (int, float))
