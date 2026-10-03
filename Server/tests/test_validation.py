"""Tests for ValidationEngine matching competition check_allocation.py rules and operational checks."""

import pytest
from app.services.planning_service import get_validation_engine

def test_validation_engine_rules(db_session):
    engine = get_validation_engine(db_session, scenario="S1")
    assert len(engine.orders) > 0
    assert len(engine.vehicles) > 0

    # 1. Available vs in_workshop vehicle check
    # VEH001 is in_workshop for S1
    passport_workshop = engine.evaluate_candidate_passport(
        order_ref="S1-000",
        vehicle_id="VEH001",
        trip_no=1,
        assignments={},
        stop_sequences={},
        trip_meta={},
        vehicle_fuel_inputs={},
    )
    assert passport_workshop.checkerFeasible is False
    assert any(r.rule == "VEHICLE_UNAVAILABLE" and r.kind == "checker_fail" for r in passport_workshop.results)

    # 2. Available vehicle check (VEH003 is available reefer truck in Peliyagoda)
    passport_avail = engine.evaluate_candidate_passport(
        order_ref="S1-000",
        vehicle_id="VEH003",
        trip_no=1,
        assignments={},
        stop_sequences={},
        trip_meta={},
        vehicle_fuel_inputs={},
    )
    # S1-000 has parking_constraint == 'van_only', so on truck VEH003 it should fail VAN_ONLY
    assert any(r.rule == "VAN_ONLY" and r.kind == "checker_fail" for r in passport_avail.results)
    assert passport_avail.checkerFeasible is False

    # 3. Van assignment for van_only order (find an available van, e.g. VEH010 or similar)
    van = next((v for v in engine.vehicles if v.type == "van" and engine.fleet_status.get(v.vehicle_id) == "available"), None)
    if van:
        passport_van = engine.evaluate_candidate_passport(
            order_ref="S1-000",
            vehicle_id=van.vehicle_id,
            trip_no=1,
            assignments={},
            stop_sequences={},
            trip_meta={},
            vehicle_fuel_inputs={},
        )
        assert any(r.rule == "VAN_ONLY" and r.kind == "checker_pass" for r in passport_van.results)

def test_rank_candidates(db_session):
    engine = get_validation_engine(db_session, scenario="S1")
    candidates = engine.rank_candidates_for_order(
        order_ref="S1-001",
        assignments={},
        stop_sequences={},
        trip_meta={},
        vehicle_fuel_inputs={},
    )
    assert isinstance(candidates, list)
    if candidates:
        assert candidates[0].recommended is True
        assert len(candidates[0].reasons) > 0
