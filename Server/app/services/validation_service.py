"""Validation engine implementing byte-for-byte parity with check_allocation.py and operational rules."""

from typing import Dict, List, Optional, Set, Tuple, Any
from app.models.reference import Vehicle, ScenarioFleetEntry, ServiceAllowance, DistrictTravel
from app.models.order import Order
from app.schemas.plan import ValidationResultSchema, PassportResultSchema, RankedCandidateSchema, TripStopSchema, StopScheduleSchema
from app.schemas.reference import VehicleSchema

TOLERANCE = 1e-6
FRESH_BUDGET_MIN = 270.0
OTHER_BUDGET_MIN = 480.0
ASSUMED_TURNAROUND_MIN = 20


class MissingReferenceDataError(Exception):
    """Raised when a calculation needs a reference-data row (district travel,
    service allowance) that does not exist. Callers must surface this as an
    explicit failed/unverified result - never swallow it into a numeric
    default that could make an invalid plan look like it passed."""

def parse_hhmm(val: str) -> int:
    """Parse 'HH:MM' string to minutes since midnight."""
    try:
        parts = val.split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return 0

def format_hhmm(minutes: int) -> str:
    """Format minutes since midnight to 'HH:MM' string."""
    h = (minutes // 60) % 24
    m = minutes % 60
    return f"{h:02d}:{m:02d}"

def compute_trip_duration(
    orders: List[Order],
    allowances_map: Dict[Tuple[str, str], float],
    travel_map: Dict[Tuple[str, str], DistrictTravel],
) -> float:
    """
    Task-2B formula (check_allocation.py row-based):
    depot_to_district_freeflow_min + (n-1)*inter_stop_freeflow_min + sum(service_allowance)
    """
    if not orders:
        return 0.0
    first = orders[0]
    key = (first.district, first.depot)
    travel = travel_map.get(key)
    if not travel:
        raise MissingReferenceDataError(f"No district_travel row for district={key[0]!r} depot={key[1]!r}")
    base = travel.depot_to_district_freeflow_min + (len(orders) - 1) * travel.inter_stop_freeflow_min
    service = 0.0
    for o in orders:
        allow_key = (o.brand, o.dock_type)
        if allow_key not in allowances_map:
            raise MissingReferenceDataError(f"No service_allowance row for brand={o.brand!r} dock_type={o.dock_type!r}")
        service += allowances_map[allow_key]
    return base + service

def build_trip_stops(
    outlet_sequence: List[str],
    orders: List[Order],
) -> List[TripStopSchema]:
    """Group same-outlet orders into single physical stops according to outlet sequence."""
    order_map = {o.order_ref: o for o in orders}
    stops = []
    # If outlet_sequence provided, use that order
    seen_outlets = set()
    for out_id in outlet_sequence:
        refs = [o.order_ref for o in orders if o.outlet_id == out_id]
        if refs:
            stops.append(TripStopSchema(outletId=out_id, orderRefs=refs))
            seen_outlets.add(out_id)
    # Append any remaining outlets not in sequence
    for o in orders:
        if o.outlet_id not in seen_outlets:
            refs = [x.order_ref for x in orders if x.outlet_id == o.outlet_id]
            stops.append(TripStopSchema(outletId=o.outlet_id, orderRefs=refs))
            seen_outlets.add(o.outlet_id)
    return stops

def compute_stop_schedule(
    stops: List[TripStopSchema],
    departure_time: str,
    orders_map: Dict[str, Order],
    allowances_map: Dict[Tuple[str, str], float],
    travel_map: Dict[Tuple[str, str], DistrictTravel],
) -> List[StopScheduleSchema]:
    """Simulate arrival, wait time, service start/end, and delivery/mall window compliance."""
    if not stops:
        return []
    first_order = orders_map.get(stops[0].orderRefs[0])
    if not first_order:
        return []
    travel_key = (first_order.district, first_order.depot)
    travel = travel_map.get(travel_key)
    if not travel:
        raise MissingReferenceDataError(f"No district_travel row for district={travel_key[0]!r} depot={travel_key[1]!r}")

    t = parse_hhmm(departure_time)
    schedules = []

    for i, stop in enumerate(stops):
        leg_min = travel.depot_to_district_freeflow_min if i == 0 else travel.inter_stop_freeflow_min
        t += int(round(leg_min))
        arrival = t
        stop_orders = [orders_map[r] for r in stop.orderRefs if r in orders_map]
        if not stop_orders:
            continue
        window_open = parse_hhmm(stop_orders[0].window_open_time)
        window_close = parse_hhmm(stop_orders[0].window_close_time)
        service_start = max(arrival, window_open)
        wait = service_start - arrival
        service_dur = 0
        for o in stop_orders:
            allow_key = (o.brand, o.dock_type)
            if allow_key not in allowances_map:
                raise MissingReferenceDataError(f"No service_allowance row for brand={o.brand!r} dock_type={o.dock_type!r}")
            service_dur += int(round(allowances_map[allow_key]))
        service_end = service_start + service_dur
        late = arrival > window_close

        mall_window_data = None
        for o in stop_orders:
            if o.mall_window:
                parts = o.mall_window.split("-")
                if len(parts) == 2:
                    m_open = parse_hhmm(parts[0])
                    m_close = parse_hhmm(parts[1])
                    mall_window_data = {
                        "open": m_open,
                        "close": m_close,
                        "violated": service_start < m_open or service_end > m_close,
                    }
                    break

        schedules.append(StopScheduleSchema(
            outletId=stop.outletId,
            orderRefs=stop.orderRefs,
            arrival=arrival,
            wait=wait,
            serviceStart=service_start,
            serviceEnd=service_end,
            windowOpen=window_open,
            windowClose=window_close,
            late=late,
            mallWindow=mall_window_data,
        ))
        t = service_end

    return schedules

def compute_trip_distance_km(
    stops: List[TripStopSchema],
    district: str,
    depot: str,
    travel_map: Dict[Tuple[str, str], DistrictTravel],
) -> float:
    """Operational distance with return leg: depot_to_district + (n-1)*inter_stop + depot_to_district."""
    if not stops:
        return 0.0
    travel_key = (district, depot)
    travel = travel_map.get(travel_key)
    if not travel:
        raise MissingReferenceDataError(f"No district_travel row for district={travel_key[0]!r} depot={travel_key[1]!r}")
    return travel.depot_to_district_km + travel.inter_stop_km * (len(stops) - 1) + travel.depot_to_district_km

class ValidationEngine:
    def __init__(
        self,
        orders: List[Order],
        vehicles: List[Vehicle],
        fleet_status: Dict[str, str], # vehicle_id -> status
        allowances: List[ServiceAllowance],
        travel_rows: List[DistrictTravel],
        frozen_trip_keys: Optional[Set[str]] = None,
    ):
        # "<vehicle>-<trip_no>" keys of trips that already departed/completed: execution history,
        # not a draft. They keep their loads (so capacity for other trips is unaffected) but their
        # own checker/window results can no longer block releasing a corrective plan.
        self.frozen_trip_keys: Set[str] = set(frozen_trip_keys or ())
        self.orders = orders
        self.orders_map = {o.order_ref: o for o in orders}
        self.vehicles = vehicles
        self.vehicles_map = {v.vehicle_id: v for v in vehicles}
        self.fleet_status = fleet_status
        self.allowances_map = {(a.brand, a.dock_type): a.service_allowance_min for a in allowances}
        self.travel_map = {(t.district, t.depot): t for t in travel_rows}

    def evaluate_candidate_passport(
        self,
        order_ref: str,
        vehicle_id: str,
        trip_no: int,
        assignments: Dict[str, Dict[str, Any]], # ref -> {decision, vehicle_id, trip_no}
        stop_sequences: Dict[str, List[str]], # key -> list of outlet_ids
        trip_meta: Dict[str, str], # key -> planned_departure_time
        vehicle_fuel_inputs: Dict[str, Optional[float]],
    ) -> PassportResultSchema:
        order = self.orders_map.get(order_ref)
        vehicle = self.vehicles_map.get(vehicle_id)
        if not order or not vehicle:
            return PassportResultSchema(
                results=[ValidationResultSchema(
                    kind="checker_fail",
                    group="checker",
                    rule="VEHICLE_UNAVAILABLE",
                    label="Vehicle / Order not found",
                    detail="Order or vehicle does not exist.",
                )],
                checkerFeasible=False,
                operationalFeasible=False,
            )

        results: List[ValidationResultSchema] = []

        # 1. VEHICLE_UNAVAILABLE
        status = self.fleet_status.get(vehicle_id, "available")
        is_avail = status == "available"
        results.append(ValidationResultSchema(
            kind="checker_pass" if is_avail else "checker_fail",
            group="checker",
            rule="VEHICLE_UNAVAILABLE",
            label="Vehicle Availability",
            detail=f"Pass - {vehicle_id} available" if is_avail else f"Fail - {vehicle_id} is in_workshop",
            vehicleId=vehicle_id,
        ))

        # 2. DEPOT_MISMATCH
        depot_pass = order.depot == vehicle.depot
        results.append(ValidationResultSchema(
            kind="checker_pass" if depot_pass else "checker_fail",
            group="checker",
            rule="DEPOT_MISMATCH",
            label="Depot Match",
            detail=f"Pass - both {vehicle.depot}" if depot_pass else f"Fail - order is {order.depot}, vehicle is {vehicle.depot}",
            orderRef=order_ref,
            vehicleId=vehicle_id,
        ))

        # 3. REEFER_REQUIRED
        reefer_pass = order.temp_requirement != "chilled" or vehicle.temp == "reefer"
        results.append(ValidationResultSchema(
            kind="checker_pass" if reefer_pass else "checker_fail",
            group="checker",
            rule="REEFER_REQUIRED",
            label="Temperature Requirement",
            detail=f"Pass - chilled order, {vehicle_id} is reefer" if order.temp_requirement == "chilled" and reefer_pass else ("Pass - ambient order" if order.temp_requirement != "chilled" else f"Fail - chilled requires reefer, {vehicle_id} is {vehicle.temp}"),
            orderRef=order_ref,
            vehicleId=vehicle_id,
        ))

        # 4. VAN_ONLY
        van_pass = order.parking_constraint != "van_only" or vehicle.type == "van"
        results.append(ValidationResultSchema(
            kind="checker_pass" if van_pass else "checker_fail",
            group="checker",
            rule="VAN_ONLY",
            label="Access Restriction",
            detail=f"Pass - van_only on van" if order.parking_constraint == "van_only" and van_pass else ("Pass - no van constraint" if order.parking_constraint != "van_only" else f"Fail - van_only order requires van, {vehicle_id} is {vehicle.type}"),
            orderRef=order_ref,
            vehicleId=vehicle_id,
        ))

        # Existing orders on this candidate trip
        key = f"{vehicle_id}-{trip_no}"
        candidate_trip_orders = [
            self.orders_map[r] for r, a in assignments.items()
            if a.get("decision") == "served" and a.get("vehicle_id") == vehicle_id and a.get("trip_no") == trip_no and r != order_ref and r in self.orders_map
        ]
        all_candidate_orders = candidate_trip_orders + [order]

        # 5. WEIGHT_LIMIT
        total_weight = sum(o.order_weight_kg for o in all_candidate_orders)
        weight_pass = total_weight <= vehicle.weight_cap_kg + TOLERANCE
        results.append(ValidationResultSchema(
            kind="checker_pass" if weight_pass else "checker_fail",
            group="checker",
            rule="WEIGHT_LIMIT",
            label="Weight Capacity",
            detail=f"{'Pass' if weight_pass else 'Fail'} - {total_weight:.1f} kg / {vehicle.weight_cap_kg:.0f} kg max",
            orderRef=order_ref,
            vehicleId=vehicle_id,
        ))

        # 6. VOLUME_LIMIT
        total_vol = sum(o.order_volume_m3 for o in all_candidate_orders)
        vol_pass = total_vol <= vehicle.volume_cap_m3 + TOLERANCE
        results.append(ValidationResultSchema(
            kind="checker_pass" if vol_pass else "checker_fail",
            group="checker",
            rule="VOLUME_LIMIT",
            label="Volume Capacity",
            detail=f"{'Pass' if vol_pass else 'Fail'} - {total_vol:.3f} m³ / {vehicle.volume_cap_m3:.1f} m³ max",
            orderRef=order_ref,
            vehicleId=vehicle_id,
        ))

        # 7. MIXED_BRAND & MIXED_DISTRICT
        if candidate_trip_orders:
            brand_pass = candidate_trip_orders[0].brand == order.brand
            dist_pass = candidate_trip_orders[0].district == order.district
            results.append(ValidationResultSchema(
                kind="checker_pass" if brand_pass else "checker_fail",
                group="checker",
                rule="MIXED_BRAND",
                label="Trip Brand Grouping",
                detail=f"Pass - all {order.brand}" if brand_pass else f"Fail - trip has {candidate_trip_orders[0].brand}, order is {order.brand}",
                orderRef=order_ref,
            ))
            results.append(ValidationResultSchema(
                kind="checker_pass" if dist_pass else "checker_fail",
                group="checker",
                rule="MIXED_DISTRICT",
                label="Trip District Grouping",
                detail=f"Pass - all {order.district}" if dist_pass else f"Fail - trip has {candidate_trip_orders[0].district}, order is {order.district}",
                orderRef=order_ref,
            ))
        else:
            results.append(ValidationResultSchema(
                kind="checker_pass",
                group="checker",
                rule="MIXED_BRAND",
                label="Trip Brand Grouping",
                detail="Pass - first order on trip",
                orderRef=order_ref,
            ))
            results.append(ValidationResultSchema(
                kind="checker_pass",
                group="checker",
                rule="MIXED_DISTRICT",
                label="Trip District Grouping",
                detail="Pass - first order on trip",
                orderRef=order_ref,
            ))

        # 8. TRIP_LIMIT - a vehicle may run at most 2 trips/day, numbered 1 and 2.
        trip_limit_pass = trip_no in (1, 2)
        results.append(ValidationResultSchema(
            kind="checker_pass" if trip_limit_pass else "checker_fail",
            group="checker",
            rule="TRIP_LIMIT",
            label="Trip Limit",
            detail=f"Pass - Trip {trip_no} of 2" if trip_limit_pass else f"Fail - trip_no {trip_no} is not a valid trip (max 2 trips/vehicle)",
            orderRef=order_ref,
            tripNo=trip_no,
        ))

        # 9. Time budget (Fresh <= 270 / Style+Tech <= 480 cumulative)
        other_trip_no = 2 if trip_no == 1 else 1
        other_trip_orders = [
            self.orders_map[r] for r, a in assignments.items()
            if a.get("decision") == "served" and a.get("vehicle_id") == vehicle_id and a.get("trip_no") == other_trip_no and r in self.orders_map
        ]
        is_fresh = order.brand == "Fresh"
        budget_limit = FRESH_BUDGET_MIN if is_fresh else OTHER_BUDGET_MIN
        budget_rule = "FRESH_BUDGET" if is_fresh else "DAYTIME_BUDGET"
        budget_label = "Fresh cumulative budget" if is_fresh else "Style/Tech cumulative budget"
        try:
            candidate_duration = compute_trip_duration(all_candidate_orders, self.allowances_map, self.travel_map)
            other_duration = compute_trip_duration(other_trip_orders, self.allowances_map, self.travel_map) if other_trip_orders else 0.0
            other_matches = other_trip_orders and ((other_trip_orders[0].brand == "Fresh") == is_fresh)
            cumulative_time = candidate_duration + (other_duration if other_matches else 0.0)
            time_pass = cumulative_time <= budget_limit + TOLERANCE
            results.append(ValidationResultSchema(
                kind="checker_pass" if time_pass else "checker_fail",
                group="checker",
                rule=budget_rule,
                label=budget_label,
                detail=f"{'Pass' if time_pass else 'Fail'} - {cumulative_time:.1f} min cumulative / {budget_limit:.0f} min max",
                orderRef=order_ref,
                tripNo=trip_no,
            ))
        except MissingReferenceDataError as e:
            results.append(ValidationResultSchema(
                kind="checker_fail",
                group="checker",
                rule=budget_rule,
                label=budget_label,
                detail=f"Fail - cannot compute trip duration: {e}",
                orderRef=order_ref,
                tripNo=trip_no,
            ))

        # 10. Operational Check: DELIVERY_WINDOW
        dep_time = trip_meta.get(key)
        outlet_seq = stop_sequences.get(key, [])
        candidate_stops = build_trip_stops(outlet_seq, all_candidate_orders)
        if dep_time is None:
            results.append(ValidationResultSchema(
                kind="unverified",
                group="operational",
                rule="DELIVERY_WINDOW",
                label="Delivery / Mall Window",
                detail="Unverified - planned departure time not yet set for this trip.",
                orderRef=order_ref,
            ))
        else:
            try:
                scheds = compute_stop_schedule(candidate_stops, dep_time, self.orders_map, self.allowances_map, self.travel_map)
            except MissingReferenceDataError as e:
                scheds = None
                results.append(ValidationResultSchema(
                    kind="checker_fail",
                    group="operational",
                    rule="DELIVERY_WINDOW",
                    label="Delivery / Mall Window",
                    detail=f"Fail - cannot compute delivery schedule: {e}",
                    orderRef=order_ref,
                ))
            if scheds is not None:
                target_stop = next((s for s in scheds if order_ref in s.orderRefs), None)
                if not target_stop:
                    results.append(ValidationResultSchema(
                        kind="unverified",
                        group="operational",
                        rule="DELIVERY_WINDOW",
                        label="Delivery / Mall Window",
                        detail="Unverified - order not in trip stop sequence.",
                        orderRef=order_ref,
                    ))
                else:
                    mall_violated = target_stop.mallWindow.get("violated", False) if target_stop.mallWindow else False
                    win_pass = not target_stop.late and not mall_violated
                    if win_pass:
                        win_detail = f"Pass - arrival {format_hhmm(target_stop.arrival)}, service {format_hhmm(target_stop.serviceStart)}-{format_hhmm(target_stop.serviceEnd)}"
                    elif target_stop.late:
                        win_detail = f"Fail - arrival {format_hhmm(target_stop.arrival)} is after window close at {format_hhmm(target_stop.windowClose)}"
                    else:
                        win_detail = "Fail - violates mall access window"
                    results.append(ValidationResultSchema(
                        kind="checker_pass" if win_pass else "checker_fail",
                        group="operational",
                        rule="DELIVERY_WINDOW",
                        label="Delivery / Mall Window",
                        detail=win_detail,
                        orderRef=order_ref,
                    ))

        # 11. Operational Check: FUEL_QUOTA
        prior_fuel = vehicle_fuel_inputs.get(vehicle_id)
        if prior_fuel is None:
            results.append(ValidationResultSchema(
                kind="unverified",
                group="operational",
                rule="FUEL_QUOTA",
                label="Fuel Reservation",
                detail=f"Unverified - prior weekly fuel usage not yet confirmed for {vehicle_id}.",
                vehicleId=vehicle_id,
            ))
        else:
            try:
                other_key = f"{vehicle_id}-{other_trip_no}"
                other_outlet_seq = stop_sequences.get(other_key, [])
                other_stops = build_trip_stops(other_outlet_seq, other_trip_orders) if other_trip_orders else []
                dist1 = compute_trip_distance_km(candidate_stops, order.district, order.depot, self.travel_map)
                dist2 = compute_trip_distance_km(other_stops, other_trip_orders[0].district, other_trip_orders[0].depot, self.travel_map) if other_stops else 0.0
                today_dist = dist1 + dist2
                today_litres = today_dist / vehicle.km_per_l
                total_litres = prior_fuel + today_litres
                fuel_pass = total_litres <= vehicle.weekly_fuel_quota_l + TOLERANCE
                results.append(ValidationResultSchema(
                    kind="checker_pass" if fuel_pass else "checker_fail",
                    group="operational",
                    rule="FUEL_QUOTA",
                    label="Fuel Reservation",
                    detail=f"{'Pass' if fuel_pass else 'Fail'} - {total_litres:.1f} L / {vehicle.weekly_fuel_quota_l:.0f} L quota",
                    vehicleId=vehicle_id,
                ))
            except MissingReferenceDataError as e:
                results.append(ValidationResultSchema(
                    kind="checker_fail",
                    group="operational",
                    rule="FUEL_QUOTA",
                    label="Fuel Reservation",
                    detail=f"Fail - cannot compute fuel distance: {e}",
                    vehicleId=vehicle_id,
                ))

        # 12. Operational Check: TRIP_OVERLAP (if both trips present)
        if candidate_stops and other_trip_orders:
            other_dep_time = trip_meta.get(f"{vehicle_id}-{other_trip_no}")
            if dep_time is None or other_dep_time is None:
                results.append(ValidationResultSchema(
                    kind="unverified",
                    group="operational",
                    rule="TRIP_OVERLAP",
                    label="Trip Overlap",
                    detail="Unverified - both trips need a planned departure time.",
                    vehicleId=vehicle_id,
                ))
            elif (order.district, order.depot) not in self.travel_map:
                results.append(ValidationResultSchema(
                    kind="checker_fail",
                    group="operational",
                    rule="TRIP_OVERLAP",
                    label="Trip Overlap",
                    detail=f"Fail - no district_travel row for {order.district}/{order.depot}, cannot estimate return leg.",
                    vehicleId=vehicle_id,
                ))
            else:
                try:
                    trip1_stops = candidate_stops if trip_no == 1 else build_trip_stops(stop_sequences.get(f"{vehicle_id}-1", []), other_trip_orders)
                    trip1_dep = dep_time if trip_no == 1 else other_dep_time
                    trip2_dep = other_dep_time if trip_no == 1 else dep_time
                    sched1 = compute_stop_schedule(trip1_stops, trip1_dep, self.orders_map, self.allowances_map, self.travel_map)
                    last_end = sched1[-1].serviceEnd if sched1 else parse_hhmm(trip1_dep)
                    tr_info = self.travel_map[(order.district, order.depot)]
                    ret_min = tr_info.depot_to_district_freeflow_min
                    est_return = last_end + int(round(ret_min)) + ASSUMED_TURNAROUND_MIN
                    dep2_min = parse_hhmm(trip2_dep)
                    overlap_pass = dep2_min >= est_return
                    results.append(ValidationResultSchema(
                        kind="checker_pass" if overlap_pass else "checker_fail",
                        group="operational",
                        rule="TRIP_OVERLAP",
                        label="Trip Overlap",
                        detail=f"{'Pass' if overlap_pass else 'Fail'} - Trip 1 est return {format_hhmm(est_return)}, Trip 2 departs {format_hhmm(dep2_min)}",
                        vehicleId=vehicle_id,
                    ))
                except MissingReferenceDataError as e:
                    results.append(ValidationResultSchema(
                        kind="checker_fail",
                        group="operational",
                        rule="TRIP_OVERLAP",
                        label="Trip Overlap",
                        detail=f"Fail - cannot estimate trip overlap: {e}",
                        vehicleId=vehicle_id,
                    ))

        checker_results = [r for r in results if r.group == "checker"]
        checker_feasible = all(r.kind == "checker_pass" for r in checker_results)
        all_pass = all(r.kind == "checker_pass" for r in results)
        operational_feasible = True if all_pass else (None if any(r.kind == "unverified" for r in results) else False)

        return PassportResultSchema(
            results=results,
            checkerFeasible=checker_feasible,
            operationalFeasible=operational_feasible,
        )

    def validate_full_plan(
        self,
        assignments: Dict[str, Dict[str, Any]],
        stop_sequences: Dict[str, List[str]],
        trip_meta: Dict[str, str],
        vehicle_fuel_inputs: Dict[str, Optional[float]],
    ) -> List[Dict[str, Any]]:
        """Compute aggregate checklist for Plan Review."""
        checklist = []
        unresolved = [o for o in self.orders if assignments.get(o.order_ref, {}).get("decision") in ("unresolved", None)]
        checklist.append({
            "label": f"Every order has an explicit decision ({len(self.orders) - len(unresolved)} of {len(self.orders)} decided)",
            "kind": "checker_pass" if len(unresolved) == 0 else "checker_fail",
            "group": "checker",
            "detail": "Pass - no unresolved orders" if len(unresolved) == 0 else f"{len(unresolved)} unresolved orders",
        })

        deferred = [o for o in self.orders if assignments.get(o.order_ref, {}).get("decision") == "deferred"]
        deferred_no_reason = [
            o for o in deferred
            if not (assignments.get(o.order_ref, {}).get("reason_code") or assignments.get(o.order_ref, {}).get("reasonCode"))
        ]
        checklist.append({
            "label": f"Deferred orders have documented reasons ({len(deferred) - len(deferred_no_reason)}/{len(deferred)})",
            "kind": "checker_pass" if len(deferred_no_reason) == 0 else "checker_fail",
            "group": "checker",
            "detail": "Pass - every deferred order has reason code" if len(deferred_no_reason) == 0 else f"{len(deferred_no_reason)} deferred missing reason",
        })

        checklist.append({
            "label": "Whole order is served or deferred - no split allocations",
            "kind": "checker_pass",
            "group": "checker",
            "detail": "Pass - orders are assigned in whole units",
        })

        # Check vehicle capacity, reefer, van, grouping, budgets
        trip_groups: Dict[str, List[Order]] = {}
        for o in self.orders:
            a = assignments.get(o.order_ref, {})
            dec = a.get("decision")
            vid = a.get("vehicle_id") or a.get("vehicleId")
            tno = a.get("trip_no") or a.get("tripNo")
            if dec == "served" and vid and tno:
                k = f"{vid}-{tno}"
                trip_groups.setdefault(k, []).append(o)

        all_depot_ok = True
        all_reefer_ok = True
        all_van_ok = True
        all_weight_ok = True
        all_volume_ok = True
        all_grouping_ok = True
        all_budgets_ok = True
        all_trip_limit_ok = True
        missing_ref_data: List[str] = []
        vehicle_trip_nos: Dict[str, Set[int]] = {}

        for k, ords in trip_groups.items():
            vid, tno_str = k.rsplit("-", 1)
            tno = int(tno_str)
            vehicle_trip_nos.setdefault(vid, set()).add(tno)
            if k in self.frozen_trip_keys:
                continue
            if tno not in (1, 2):
                all_trip_limit_ok = False
            veh = self.vehicles_map.get(vid)
            if not veh:
                continue
            if any(o.depot != veh.depot for o in ords):
                all_depot_ok = False
            if veh.temp != "reefer" and any(o.temp_requirement == "chilled" for o in ords):
                all_reefer_ok = False
            if veh.type != "van" and any(o.parking_constraint == "van_only" for o in ords):
                all_van_ok = False
            if sum(o.order_weight_kg for o in ords) > veh.weight_cap_kg + TOLERANCE:
                all_weight_ok = False
            if sum(o.order_volume_m3 for o in ords) > veh.volume_cap_m3 + TOLERANCE:
                all_volume_ok = False
            if len(set(o.brand for o in ords)) > 1 or len(set(o.district for o in ords)) > 1:
                all_grouping_ok = False

            # Time budget
            try:
                dur = compute_trip_duration(ords, self.allowances_map, self.travel_map)
                other_k = f"{vid}-2" if tno_str == "1" else f"{vid}-1"
                other_ords = trip_groups.get(other_k, [])
                other_dur = compute_trip_duration(other_ords, self.allowances_map, self.travel_map) if other_ords else 0.0
                is_fresh = ords[0].brand == "Fresh"
                limit = FRESH_BUDGET_MIN if is_fresh else OTHER_BUDGET_MIN
                same_cat = other_ords and ((other_ords[0].brand == "Fresh") == is_fresh)
                cum_time = dur + (other_dur if same_cat else 0.0)
                if cum_time > limit + TOLERANCE:
                    all_budgets_ok = False
            except MissingReferenceDataError as e:
                all_budgets_ok = False
                missing_ref_data.append(f"{vid} Trip {tno_str}: {e}")

        if any(len(nos) > 2 for nos in vehicle_trip_nos.values()):
            all_trip_limit_ok = False

        checklist.append({"label": "Vehicle depot match", "kind": "checker_pass" if all_depot_ok else "checker_fail", "group": "checker", "detail": "Pass" if all_depot_ok else "Depot mismatch detected"})
        checklist.append({"label": "Refrigeration requirements satisfied", "kind": "checker_pass" if all_reefer_ok else "checker_fail", "group": "checker", "detail": "Pass" if all_reefer_ok else "Chilled order on non-reefer"})
        checklist.append({"label": "Van access requirements satisfied", "kind": "checker_pass" if all_van_ok else "checker_fail", "group": "checker", "detail": "Pass" if all_van_ok else "Van-only order on truck"})
        checklist.append({"label": "Weight limits within capacity", "kind": "checker_pass" if all_weight_ok else "checker_fail", "group": "checker", "detail": "Pass" if all_weight_ok else "Weight limit exceeded"})
        checklist.append({"label": "Volume limits within capacity", "kind": "checker_pass" if all_volume_ok else "checker_fail", "group": "checker", "detail": "Pass" if all_volume_ok else "Volume limit exceeded"})
        checklist.append({"label": "One brand and one district per trip", "kind": "checker_pass" if all_grouping_ok else "checker_fail", "group": "checker", "detail": "Pass" if all_grouping_ok else "Mixed brand or district"})
        checklist.append({"label": "Maximum 2 trips per vehicle", "kind": "checker_pass" if all_trip_limit_ok else "checker_fail", "group": "checker", "detail": "Pass - max 2 trips allowed" if all_trip_limit_ok else "A vehicle has more than 2 distinct trip numbers, or an invalid trip_no"})
        checklist.append({"label": "Fresh trips <=270 cumulative minutes per vehicle", "kind": "checker_pass" if all_budgets_ok else "checker_fail", "group": "checker", "detail": "Pass" if all_budgets_ok else ("Time budget exceeded" if not missing_ref_data else "Cannot verify: " + "; ".join(missing_ref_data))})
        checklist.append({"label": "Style + Tech trips <=480 cumulative minutes per vehicle", "kind": "checker_pass" if all_budgets_ok else "checker_fail", "group": "checker", "detail": "Pass" if all_budgets_ok else ("Time budget exceeded" if not missing_ref_data else "Cannot verify: " + "; ".join(missing_ref_data))})

        # Operational items
        for k, ords in trip_groups.items():
            vid, tno_str = k.rsplit("-", 1)
            tno = int(tno_str)
            dep_time = trip_meta.get(k)
            outlet_seq = stop_sequences.get(k, [])
            stops = build_trip_stops(outlet_seq, ords)
            sched_error: Optional[str] = None
            sched = None
            if dep_time is not None:
                try:
                    sched = compute_stop_schedule(stops, dep_time, self.orders_map, self.allowances_map, self.travel_map)
                except MissingReferenceDataError as e:
                    sched_error = str(e)
            for o in ([] if k in self.frozen_trip_keys else ords):
                if dep_time is None:
                    checklist.append({"label": f"Delivery window - {o.order_ref} ({vid} Trip {tno})", "kind": "unverified", "group": "operational", "detail": "Planned departure time not yet set"})
                elif sched_error:
                    checklist.append({"label": f"Delivery window - {o.order_ref} ({vid} Trip {tno})", "kind": "checker_fail", "group": "operational", "detail": f"Cannot compute delivery schedule: {sched_error}"})
                else:
                    st = next((s for s in sched if o.order_ref in s.orderRefs), None)
                    pass_win = st and not st.late and not (st.mallWindow and st.mallWindow.get("violated"))
                    checklist.append({"label": f"Delivery window - {o.order_ref} ({vid} Trip {tno})", "kind": "checker_pass" if pass_win else "checker_fail", "group": "operational", "detail": "Pass" if pass_win else "Delivery window missed"})

            # Fuel check per vehicle
            veh = self.vehicles_map.get(vid)
            if veh and tno == 1:
                prior = vehicle_fuel_inputs.get(vid)
                if prior is None:
                    checklist.append({"label": f"Fuel reservation - {vid}", "kind": "unverified", "group": "operational", "detail": "Prior fuel usage unconfirmed"})
                else:
                    try:
                        d1 = compute_trip_distance_km(stops, ords[0].district, ords[0].depot, self.travel_map)
                        other_k = f"{vid}-2"
                        other_ords = trip_groups.get(other_k, [])
                        d2 = compute_trip_distance_km(build_trip_stops(stop_sequences.get(other_k, []), other_ords), other_ords[0].district, other_ords[0].depot, self.travel_map) if other_ords else 0.0
                        tot_l = prior + (d1 + d2) / veh.km_per_l
                        checklist.append({"label": f"Fuel reservation - {vid}", "kind": "checker_pass" if tot_l <= veh.weekly_fuel_quota_l + TOLERANCE else "checker_fail", "group": "operational", "detail": f"{tot_l:.1f} L / {veh.weekly_fuel_quota_l:.0f} L quota"})
                    except MissingReferenceDataError as e:
                        checklist.append({"label": f"Fuel reservation - {vid}", "kind": "checker_fail", "group": "operational", "detail": f"Cannot compute fuel distance: {e}"})

        return checklist

    def rank_candidates_for_order(
        self,
        order_ref: str,
        assignments: Dict[str, Dict[str, Any]],
        stop_sequences: Dict[str, List[str]],
        trip_meta: Dict[str, str],
        vehicle_fuel_inputs: Dict[str, Optional[float]],
    ) -> List[RankedCandidateSchema]:
        """Rank viable vehicle and trip candidates transparently."""
        order = self.orders_map.get(order_ref)
        if not order:
            return []

        candidates = []
        for veh in self.vehicles:
            if self.fleet_status.get(veh.vehicle_id, "available") != "available":
                continue
            for trip_no in (1, 2):
                passport = self.evaluate_candidate_passport(
                    order_ref, veh.vehicle_id, trip_no, assignments, stop_sequences, trip_meta, vehicle_fuel_inputs
                )
                if passport.checkerFeasible:
                    key = f"{veh.vehicle_id}-{trip_no}"
                    existing_orders = [
                        self.orders_map[r] for r, a in assignments.items()
                        if a.get("decision") == "served" and a.get("vehicle_id") == veh.vehicle_id and a.get("trip_no") == trip_no and r != order_ref and r in self.orders_map
                    ]
                    opens_new = len(existing_orders) == 0
                    needs_scarce = order.temp_requirement == "chilled" or order.parking_constraint == "van_only"
                    uses_scarce_unnecessarily = not needs_scarce and (veh.temp == "reefer" or veh.type == "van")
                    op_risk = len([r for r in passport.results if r.group == "operational" and r.kind != "checker_pass"])
                    load_wt = sum(o.order_weight_kg for o in existing_orders) + order.order_weight_kg
                    load_vol = sum(o.order_volume_m3 for o in existing_orders) + order.order_volume_m3
                    waste = 1.0 - max(load_wt / veh.weight_cap_kg, load_vol / veh.volume_cap_m3)

                    candidates.append({
                        "vehicle": VehicleSchema.model_validate(veh),
                        "tripNo": trip_no,
                        "passport": passport,
                        "opens_new": opens_new,
                        "uses_scarce_unnecessarily": uses_scarce_unnecessarily,
                        "op_risk": op_risk,
                        "waste": waste,
                        "existing_orders": existing_orders,
                    })

        # Sort based on transparent heuristic precedence
        candidates.sort(key=lambda x: (
            int(x["uses_scarce_unnecessarily"]),
            int(x["opens_new"]),
            x["op_risk"],
            x["waste"],
        ))

        ranked = []
        for i, c in enumerate(candidates):
            reasons = []
            if i == 0:
                if not c["opens_new"]:
                    reasons.append(f"consolidates onto an existing {order.brand}/{order.district} trip")
                if c["op_risk"] == 0:
                    reasons.append("no operational risk flags")
                if order.temp_requirement == "chilled" or order.parking_constraint == "van_only":
                    reasons.append("meets required reefer / van access constraint")
                else:
                    reasons.append("preserves scarce reefer/van capacity for orders that need it")
                reasons.append("best-fits remaining vehicle capacity")
            ranked.append(RankedCandidateSchema(
                vehicle=c["vehicle"],
                tripNo=c["tripNo"],
                passport=c["passport"],
                recommended=(i == 0),
                reasons=reasons,
            ))

        return ranked
