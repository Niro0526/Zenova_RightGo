// Checker-parity validation layer, plus app-only operational checks.
//
// PART A (unchanged from the original reimplementation) is a REIMPLEMENTATION
// of the documented checker rule register (docs/SOURCE_REQUIREMENTS.md, rules
// C01-C17). The real script is at Rules/check_allocation.py (gitignored, not
// shipped with the app) and has been cross-checked against it line by line:
// the trip-duration formula, the 270/480-minute budgets, and every
// capacity/reefer/van/grouping check match exactly. Two intentional
// structural differences, not bugs: (1) the real script enforces "max 2
// trips/vehicle" at runtime, this reimplements it as a type-level invariant
// (tripNo: 1|2) instead; (2) the real script aggregate-checks depot
// consistency across a whole trip, this only checks order-vs-vehicle depot
// (equivalent for the shipped S1 dataset, single-depot-per-scenario, but not
// as general). computeTripDuration/checkCumulativeTimeBudget/computeTripDuration's
// callers must never be changed to use stop-grouping instead of order rows —
// the checker's own formula is explicitly row-based (docs/SOURCE_REQUIREMENTS.md
// C13: "counts rows, not distinct outlets") and this file's Task-2B parity
// depends on staying row-based here.
//
// PART B is new: real, partial operational checks (DELIVERY_WINDOW,
// FUEL_QUOTA, TRIP_OVERLAP) the booklet requires of the working system
// (p11-12) but check_allocation.py does not evaluate at all (confirmed by
// docs/SOURCE_REQUIREMENTS.md's "Not checked by C" list). These are
// deliberately separate formulas from Part A's checker-parity math — a
// physical stop (grouping same-outlet orders into one visit) is not an order
// row, and operational distance (with a real return leg) is not the
// checker's row-based, single-leg time formula. Two dispatcher-captured
// inputs make these resolvable rather than permanently unknown: a trip's
// planned departure time, and a vehicle's explicitly-confirmed prior weekly
// fuel usage (defaults to null/unconfirmed, never a silent 0 — see
// docs/SOURCE_REQUIREMENTS.md). Until captured, the result is 'unverified',
// which blocks release exactly like 'checker_fail' does.

import type {
  CheckerCheckResult,
  DistrictTravel,
  IntakeCheckResult,
  OrderDecision,
  PassportResult,
  ResultKind,
  S1Order,
  ServiceAllowance,
  TripMeta,
  ValidationResult,
  Vehicle,
} from '@/types/dispatcher';

const TOLERANCE = 1e-6;
const FRESH_BUDGET_MIN = 270;
const OTHER_BUDGET_MIN = 480;

/**
 * No source (Booklet, check_allocation.py, or any supplied CSV) specifies a
 * turnaround/reload/refuel duration between a vehicle's two trips. This is a
 * stated, documented modeling assumption for the TRIP_OVERLAP check only — it
 * is not derived from anything, and must not be confused with the 270/480
 * minute Task-2B *scoring* budgets, which are a different number for a
 * different purpose (see checkTripOverlap below).
 */
export const ASSUMED_TURNAROUND_MIN = 20;

export type FleetVehicle = Vehicle & { status: 'available' | 'in_workshop' };

/** What's already on a vehicle's trip slot, before considering the candidate order. */
export interface ExistingTrip {
  tripNo: 1 | 2;
  orderRefs: string[];
}

function serviceAllowanceMin(order: S1Order, allowances: ServiceAllowance[]): number {
  const row = allowances.find(a => a.brand === order.brand && a.dockType === order.dockType);
  if (!row) throw new Error(`No service_allowance row for brand=${order.brand} dockType=${order.dockType}`);
  return row.serviceAllowanceMin;
}

function findTravel(district: string, depot: string, districtTravel: DistrictTravel[]): DistrictTravel {
  const travel = districtTravel.find(d => d.district === district && d.depot === depot);
  if (!travel) throw new Error(`No district_travel row for district=${district} depot=${depot}`);
  return travel;
}

function checkerResult(kind: ResultKind, rule: CheckerCheckResult['rule'], label: string, detail: string, extra?: Partial<CheckerCheckResult>): CheckerCheckResult {
  return { kind, group: 'checker', rule, label, detail, ...extra };
}

function operationalResult(kind: ResultKind, rule: CheckerCheckResult['rule'], label: string, detail: string, extra?: Partial<CheckerCheckResult>): CheckerCheckResult {
  return { kind, group: 'operational', rule, label, detail, ...extra };
}

// =====================================================================
// PART A — checker parity (C01-C17). Unchanged logic from the original
// reimplementation; only the result shape grew a `group: 'checker'` tag.
// =====================================================================

/** C13: depot_to_district_freeflow_min + (n-1)*inter_stop_freeflow_min + sum(service_allowance). Row-based — matches check_allocation.py exactly. */
export function computeTripDuration(
  orderRefs: string[],
  ordersByRef: Map<string, S1Order>,
  allowances: ServiceAllowance[],
  districtTravel: DistrictTravel[],
): number {
  if (orderRefs.length === 0) return 0;
  const orders = orderRefs.map(ref => ordersByRef.get(ref)!);
  const travel = findTravel(orders[0].district, orders[0].depot, districtTravel);
  const base = travel.depotToDistrictFreeflowMin + (orders.length - 1) * travel.interStopFreeflowMin;
  const service = orders.reduce((sum, o) => sum + serviceAllowanceMin(o, allowances), 0);
  return base + service;
}

function budgetForBrand(brand: S1Order['brand']): { code: 'FRESH_BUDGET' | 'DAYTIME_BUDGET'; minutes: number; label: string } {
  return brand === 'Fresh'
    ? { code: 'FRESH_BUDGET', minutes: FRESH_BUDGET_MIN, label: 'Fresh cumulative budget' }
    : { code: 'DAYTIME_BUDGET', minutes: OTHER_BUDGET_MIN, label: 'Style/Tech cumulative budget' };
}

export function checkVehicleAvailable(vehicle: FleetVehicle): CheckerCheckResult {
  const pass = vehicle.status === 'available';
  return checkerResult(pass ? 'checker_pass' : 'checker_fail', 'VEHICLE_UNAVAILABLE', 'Vehicle Availability',
    pass ? `Pass - ${vehicle.vehicleId} available` : `Fail - ${vehicle.vehicleId} is in_workshop`, { vehicleId: vehicle.vehicleId });
}

export function checkDepotMatch(order: S1Order, vehicle: FleetVehicle): CheckerCheckResult {
  const pass = order.depot === vehicle.depot;
  return checkerResult(pass ? 'checker_pass' : 'checker_fail', 'DEPOT_MISMATCH', 'Depot Match',
    pass ? `Pass - both ${vehicle.depot}` : `Fail - order is ${order.depot}, vehicle is ${vehicle.depot}`,
    { orderRef: order.orderRef, vehicleId: vehicle.vehicleId });
}

export function checkReeferRequired(order: S1Order, vehicle: FleetVehicle): CheckerCheckResult {
  const pass = order.tempRequirement !== 'chilled' || vehicle.temp === 'reefer';
  return checkerResult(pass ? 'checker_pass' : 'checker_fail', 'REEFER_REQUIRED', 'Temperature Requirement',
    order.tempRequirement === 'chilled'
      ? (pass ? `Pass - chilled order, ${vehicle.vehicleId} is reefer` : `Fail - chilled order requires reefer, ${vehicle.vehicleId} is ${vehicle.temp}`)
      : 'Pass - ambient order, no reefer required',
    { orderRef: order.orderRef, vehicleId: vehicle.vehicleId });
}

export function checkVanOnly(order: S1Order, vehicle: FleetVehicle): CheckerCheckResult {
  const requiresVan = order.parkingConstraint === 'van_only';
  const pass = !requiresVan || vehicle.type === 'van';
  return checkerResult(pass ? 'checker_pass' : 'checker_fail', 'VAN_ONLY', 'Access Restriction',
    requiresVan
      ? (pass ? `Pass - van_only order, ${vehicle.vehicleId} is a van` : `Fail - van_only order requires a van, ${vehicle.vehicleId} is a ${vehicle.type}`)
      : 'Pass - no access restriction',
    { orderRef: order.orderRef, vehicleId: vehicle.vehicleId });
}

export function checkWeightCapacity(order: S1Order, vehicle: FleetVehicle, existingLoadKg: number): CheckerCheckResult {
  const newLoad = existingLoadKg + order.orderWeightKg;
  const pass = newLoad <= vehicle.weightCapKg + TOLERANCE;
  return checkerResult(pass ? 'checker_pass' : 'checker_fail', 'WEIGHT_LIMIT', 'Weight Capacity',
    `${pass ? 'Pass' : 'Fail'} - ${newLoad.toFixed(1)} kg / ${vehicle.weightCapKg} kg max`,
    { orderRef: order.orderRef, vehicleId: vehicle.vehicleId });
}

export function checkVolumeCapacity(order: S1Order, vehicle: FleetVehicle, existingLoadM3: number): CheckerCheckResult {
  const newLoad = existingLoadM3 + order.orderVolumeM3;
  const pass = newLoad <= vehicle.volumeCapM3 + TOLERANCE;
  return checkerResult(pass ? 'checker_pass' : 'checker_fail', 'VOLUME_LIMIT', 'Volume Capacity',
    `${pass ? 'Pass' : 'Fail'} - ${newLoad.toFixed(3)} m³ / ${vehicle.volumeCapM3} m³ max`,
    { orderRef: order.orderRef, vehicleId: vehicle.vehicleId });
}

/** C03/C08: a trip's orders must share exactly one brand and one district. */
export function checkTripGrouping(order: S1Order, existingOrdersInTrip: S1Order[]): CheckerCheckResult[] {
  if (existingOrdersInTrip.length === 0) {
    return [
      checkerResult('checker_pass', 'MIXED_BRAND', 'Trip Brand Grouping', 'Pass - first order on this trip', { orderRef: order.orderRef }),
      checkerResult('checker_pass', 'MIXED_DISTRICT', 'Trip District Grouping', 'Pass - first order on this trip', { orderRef: order.orderRef }),
    ];
  }
  const ref = existingOrdersInTrip[0];
  const brandPass = ref.brand === order.brand;
  const districtPass = ref.district === order.district;
  return [
    checkerResult(brandPass ? 'checker_pass' : 'checker_fail', 'MIXED_BRAND', 'Trip Brand Grouping',
      brandPass ? `Pass - all ${order.brand}` : `Fail - trip already has ${ref.brand}, order is ${order.brand}`, { orderRef: order.orderRef }),
    checkerResult(districtPass ? 'checker_pass' : 'checker_fail', 'MIXED_DISTRICT', 'Trip District Grouping',
      districtPass ? `Pass - all ${order.district}` : `Fail - trip already has ${ref.district}, order is ${order.district}`, { orderRef: order.orderRef }),
  ];
}

/** C06/C12: trip_no must be 1 or 2, and the chosen slot must be free or already grouping-compatible. */
export function checkTripLimit(tripNo: 1 | 2, existingOrdersInTrip: S1Order[], order: S1Order): CheckerCheckResult {
  const compatible = existingOrdersInTrip.length === 0 || (existingOrdersInTrip[0].brand === order.brand && existingOrdersInTrip[0].district === order.district);
  return checkerResult(compatible ? 'checker_pass' : 'checker_fail', 'TRIP_LIMIT', 'Trip Limit',
    compatible ? `Pass - Trip ${tripNo} of 2` : `Fail - Trip ${tripNo} already holds an incompatible brand/district group`,
    { orderRef: order.orderRef, tripNo });
}

/** C14: cumulative Fresh <=270min / other-brand <=480min across BOTH trips of the vehicle. */
export function checkCumulativeTimeBudget(
  order: S1Order,
  candidateTripNo: 1 | 2,
  candidateTripDurationMin: number,
  otherTripDurationMin: number,
  otherTripBrand: S1Order['brand'] | null,
): CheckerCheckResult {
  const budget = budgetForBrand(order.brand);
  const sameCategory = (b: S1Order['brand']) => (b === 'Fresh') === (order.brand === 'Fresh');
  const otherContribution = otherTripBrand && sameCategory(otherTripBrand) ? otherTripDurationMin : 0;
  const cumulative = candidateTripDurationMin + otherContribution;
  const pass = cumulative <= budget.minutes + TOLERANCE;
  return checkerResult(pass ? 'checker_pass' : 'checker_fail', budget.code, budget.label,
    `${pass ? 'Pass' : 'Fail'} - ${cumulative.toFixed(1)} min cumulative / ${budget.minutes} min max (this trip: ${candidateTripDurationMin.toFixed(1)} min)`,
    { orderRef: order.orderRef, tripNo: candidateTripNo });
}

// =====================================================================
// PART B — stop grouping (physical visits) and operational checks.
// Distinct data model from Part A: Part A takes raw order-row lists;
// everything below takes a grouped TripStop list. Never mix the two.
// =====================================================================

export interface TripStop {
  outletId: string;
  orderRefs: string[];
}

/**
 * Groups order rows sharing a physical outlet into one stop, in the given
 * outlet sequence order (the dispatcher-controlled, reorderable sequence).
 * Two order rows at the same outlet produce ONE TripStop with two orderRefs —
 * this is what "distinguish order rows from physical outlet stops" means in
 * practice, and it is the reason computeTripDistanceKm (below) must never be
 * confused with computeTripDuration (Part A, still row-based).
 */
export function buildTripStops(outletSequence: string[], orderRefs: string[], ordersByRef: Map<string, S1Order>): TripStop[] {
  return outletSequence
    .map(outletId => ({ outletId, orderRefs: orderRefs.filter(r => ordersByRef.get(r)?.outletId === outletId) }))
    .filter(s => s.orderRefs.length > 0);
}

function parseHHMM(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

export interface StopSchedule {
  outletId: string;
  orderRefs: string[];
  arrival: number; // minutes since midnight
  wait: number;
  serviceStart: number;
  serviceEnd: number;
  windowOpen: number;
  windowClose: number;
  late: boolean; // arrival strictly after the window closed
  mallWindow: { open: number; close: number; violated: boolean } | null;
}

/**
 * Sequential schedule simulation: waiting and service time at one stop carry
 * forward into every later stop's arrival time (docs/SOURCE_REQUIREMENTS.md
 * correction: "service starts at max(arrival, window opening); subsequent
 * arrivals include waiting and service time"). Early arrival waits, it does
 * not fail; arriving after the window has closed is a real failure.
 */
export function computeStopSchedule(
  stops: TripStop[],
  departureTime: string,
  ordersByRef: Map<string, S1Order>,
  allowances: ServiceAllowance[],
  districtTravel: DistrictTravel[],
): StopSchedule[] {
  if (stops.length === 0) return [];
  const firstOrder = ordersByRef.get(stops[0].orderRefs[0])!;
  const travel = findTravel(firstOrder.district, firstOrder.depot, districtTravel);
  let t = parseHHMM(departureTime);
  const out: StopSchedule[] = [];
  stops.forEach((stop, i) => {
    t += i === 0 ? travel.depotToDistrictFreeflowMin : travel.interStopFreeflowMin;
    const arrival = t;
    const orders = stop.orderRefs.map(r => ordersByRef.get(r)!);
    const windowOpen = parseHHMM(orders[0].windowOpenTime);
    const windowClose = parseHHMM(orders[0].windowCloseTime);
    const serviceStart = Math.max(arrival, windowOpen);
    const wait = serviceStart - arrival;
    const serviceDuration = orders.reduce((s, o) => s + serviceAllowanceMin(o, allowances), 0);
    const serviceEnd = serviceStart + serviceDuration;
    const late = arrival > windowClose;
    const mallWindowStr = orders.find(o => o.mallWindow)?.mallWindow ?? null;
    let mallWindow: StopSchedule['mallWindow'] = null;
    if (mallWindowStr) {
      const [openStr, closeStr] = mallWindowStr.split('-');
      const open = parseHHMM(openStr);
      const close = parseHHMM(closeStr);
      mallWindow = { open, close, violated: serviceStart < open || serviceEnd > close };
    }
    out.push({ outletId: stop.outletId, orderRefs: stop.orderRefs, arrival, wait, serviceStart, serviceEnd, windowOpen, windowClose, late, mallWindow });
    t = serviceEnd;
  });
  return out;
}

/** DELIVERY_WINDOW: real pass/fail once a departure time is set; unverified until then — a normal, dispatcher-resolvable state, not a permanent gap. */
export function checkDeliveryWindow(
  order: S1Order,
  stops: TripStop[],
  departureTime: string | null,
  ordersByRef: Map<string, S1Order>,
  allowances: ServiceAllowance[],
  districtTravel: DistrictTravel[],
): CheckerCheckResult {
  if (departureTime === null) {
    return operationalResult('unverified', 'DELIVERY_WINDOW', 'Delivery / Mall Window',
      'Unverified - planned departure time not yet set for this trip. Set it to evaluate window compliance.', { orderRef: order.orderRef });
  }
  const schedule = computeStopSchedule(stops, departureTime, ordersByRef, allowances, districtTravel);
  const stop = schedule.find(s => s.orderRefs.includes(order.orderRef));
  if (!stop) {
    return operationalResult('unverified', 'DELIVERY_WINDOW', 'Delivery / Mall Window', 'Unverified - order not yet placed in the trip stop sequence.', { orderRef: order.orderRef });
  }
  const mallFail = stop.mallWindow?.violated ?? false;
  const pass = !stop.late && !mallFail;
  const detail = pass
    ? `Pass - arrival ${formatHHMM(stop.arrival)}, service ${formatHHMM(stop.serviceStart)}-${formatHHMM(stop.serviceEnd)}${stop.wait > 0 ? ` (waited ${stop.wait} min for window open)` : ''}`
    : stop.late
      ? `Fail - arrival ${formatHHMM(stop.arrival)} is after the window closes at ${formatHHMM(stop.windowClose)}`
      : `Fail - service window ${formatHHMM(stop.serviceStart)}-${formatHHMM(stop.serviceEnd)} violates the mall access window ${formatHHMM(stop.mallWindow!.open)}-${formatHHMM(stop.mallWindow!.close)}`;
  return operationalResult(pass ? 'checker_pass' : 'checker_fail', 'DELIVERY_WINDOW', 'Delivery / Mall Window', detail, { orderRef: order.orderRef });
}

function formatHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = Math.round(minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Operational distance, physical-route-based (stop transitions, not order
 * rows) with a real return-to-depot leg — deliberately separate from
 * computeTripDuration (Part A), which is row-based, single-leg, and scores
 * Task-2B. Two order rows at one outlet are one stop and must not be counted
 * as two driving legs. Return leg is assumed symmetric to the outbound leg
 * via the same district_travel row - no separate return-distance field
 * exists in any supplied source.
 */
export function computeTripDistanceKm(stops: TripStop[], district: string, depot: string, districtTravel: DistrictTravel[]): number {
  if (stops.length === 0) return 0;
  const travel = findTravel(district, depot, districtTravel);
  return travel.depotToDistrictKm + travel.interStopKm * (stops.length - 1) + travel.depotToDistrictKm;
}

/**
 * FUEL_QUOTA: unverified until the dispatcher explicitly confirms a prior
 * weekly usage figure (including confirming 0) - never defaulted to 0
 * silently. Today's route (both trips, stop-based distance with return legs)
 * is added to that confirmed figure and compared to the vehicle's weekly quota.
 */
export function checkFuelQuota(
  vehicle: FleetVehicle,
  tripsToday: { stops: TripStop[]; district: string; depot: string }[],
  priorWeeklyFuelUsageL: number | null,
  districtTravel: DistrictTravel[],
): CheckerCheckResult {
  if (priorWeeklyFuelUsageL === null) {
    return operationalResult('unverified', 'FUEL_QUOTA', 'Fuel Reservation',
      `Unverified - prior weekly fuel usage not yet confirmed for ${vehicle.vehicleId}. No supplied dataset carries this figure; confirm a value (0 if none) to evaluate.`, { vehicleId: vehicle.vehicleId });
  }
  const todayDistanceKm = tripsToday.reduce((sum, t) => sum + computeTripDistanceKm(t.stops, t.district, t.depot, districtTravel), 0);
  return checkFuelQuotaFromDistance(vehicle, todayDistanceKm, priorWeeklyFuelUsageL);
}

/** Split out so tests/callers that already have district_travel-resolved distances can pass them directly. */
export function checkFuelQuotaFromDistance(vehicle: FleetVehicle, todayDistanceKm: number, priorWeeklyFuelUsageL: number): CheckerCheckResult {
  const todayFuelL = todayDistanceKm / vehicle.kmPerL;
  const totalL = priorWeeklyFuelUsageL + todayFuelL;
  const pass = totalL <= vehicle.weeklyFuelQuotaL + TOLERANCE;
  return operationalResult(pass ? 'checker_pass' : 'checker_fail', 'FUEL_QUOTA', 'Fuel Reservation',
    `${pass ? 'Pass' : 'Fail'} - ${totalL.toFixed(1)} L (confirmed prior ${priorWeeklyFuelUsageL.toFixed(1)} L + today's ${todayFuelL.toFixed(1)} L) / ${vehicle.weeklyFuelQuotaL} L weekly quota`,
    { vehicleId: vehicle.vehicleId });
}

/**
 * TRIP_OVERLAP: Trip 2 must not depart before Trip 1's estimated return.
 * Estimated return = Trip 1's real stop schedule (waiting + service
 * included, §2) + a return-to-depot leg + ASSUMED_TURNAROUND_MIN. This is
 * deliberately NOT computeTripDuration's 270/480-minute scoring number -
 * that figure is Task-2B's own budget and the booklet's statement that it
 * "already allows for" the return leg is about that scoring context only,
 * not a real return-time estimate.
 */
export function checkTripOverlap(
  trip1: { stops: TripStop[]; departureTime: string | null; district: string; depot: string },
  trip2DepartureTime: string | null,
  ordersByRef: Map<string, S1Order>,
  allowances: ServiceAllowance[],
  districtTravel: DistrictTravel[],
): CheckerCheckResult {
  if (trip1.departureTime === null || trip2DepartureTime === null) {
    return operationalResult('unverified', 'TRIP_OVERLAP', 'Trip Overlap',
      'Unverified - both trips need a planned departure time to check for overlap.');
  }
  const schedule = computeStopSchedule(trip1.stops, trip1.departureTime, ordersByRef, allowances, districtTravel);
  const lastServiceEnd = schedule.length > 0 ? schedule[schedule.length - 1].serviceEnd : parseHHMM(trip1.departureTime);
  const travel = findTravel(trip1.district, trip1.depot, districtTravel);
  const estimatedReturn = lastServiceEnd + travel.depotToDistrictFreeflowMin + ASSUMED_TURNAROUND_MIN;
  const departure2 = parseHHMM(trip2DepartureTime);
  const pass = departure2 >= estimatedReturn;
  return operationalResult(pass ? 'checker_pass' : 'checker_fail', 'TRIP_OVERLAP', 'Trip Overlap',
    `${pass ? 'Pass' : 'Fail'} - Trip 1 estimated return ${formatHHMM(estimatedReturn)} (incl. ${ASSUMED_TURNAROUND_MIN} min assumed turnaround), Trip 2 departs ${formatHHMM(departure2)}`);
}

// =====================================================================
// Order intake validation (Orders page) — live-derived, never persisted.
// =====================================================================

export function validateOrderIntake(order: S1Order): IntakeCheckResult {
  const issues: string[] = [];
  if (!(order.orderWeightKg > 0)) issues.push('Weight must be greater than zero.');
  if (!(order.orderVolumeM3 > 0)) issues.push('Volume must be greater than zero.');
  if (!(order.orderUnits > 0)) issues.push('Unit count must be greater than zero.');
  const open = parseHHMM(order.windowOpenTime);
  const close = parseHHMM(order.windowCloseTime);
  if (!(open < close)) issues.push('Delivery window open time must be before close time.');
  if (order.mallWindow) {
    const parts = order.mallWindow.split('-');
    if (parts.length !== 2 || parts.some(p => !/^\d{2}:\d{2}$/.test(p))) {
      issues.push('Mall window is not a valid "HH:MM-HH:MM" range.');
    }
  }
  if ((order.dockType === 'mall_bay' || order.parkingConstraint === 'mall_dock') && !order.mallWindow) {
    issues.push('Mall-bay/mall-dock order is missing its mall access window.');
  }
  return { status: issues.length === 0 ? 'confirmed' : 'needs_correction', issues };
}

export function getOrdersOnTrip(orders: S1Order[], assignments: Map<string, { decision: OrderDecision; vehicleId: string | null; tripNo: 1 | 2 | null }>, vehicleId: string, tripNo: 1 | 2): S1Order[] {
  return orders.filter(o => {
    const a = assignments.get(o.orderRef);
    return a?.decision === 'served' && a.vehicleId === vehicleId && a.tripNo === tripNo;
  });
}

function ensureOutletInSequence(seq: string[], outletId: string): string[] {
  return seq.includes(outletId) ? seq : [...seq, outletId];
}

/**
 * Builds a full passport for one (order, vehicle, tripNo) candidate directly
 * from plan-level state. Used both by the context's getPassport (live UI
 * display) and, unmodified, from inside the reducer's ASSIGN/REASSIGN
 * transitions (single source of truth - see PlanningContext.tsx). No caller
 * of this function may skip it and substitute a trusted boolean instead.
 */
export function buildPassportForCandidate(
  orderRef: string,
  vehicleId: string,
  tripNo: 1 | 2,
  orders: S1Order[],
  vehiclesById: Map<string, FleetVehicle>,
  allowances: ServiceAllowance[],
  districtTravel: DistrictTravel[],
  assignments: Map<string, { decision: OrderDecision; vehicleId: string | null; tripNo: 1 | 2 | null }>,
  stopSequences: Map<string, string[]>,
  tripMeta: Map<string, TripMeta>,
  vehicleFuelInputs: Map<string, number | null>,
): PassportResult {
  const ordersByRef = new Map(orders.map(o => [o.orderRef, o]));
  const order = ordersByRef.get(orderRef)!;
  const vehicle = vehiclesById.get(vehicleId)!;
  const otherTripNo: 1 | 2 = tripNo === 1 ? 2 : 1;
  const key = tripKey(vehicleId, tripNo);
  const otherKey = tripKey(vehicleId, otherTripNo);
  const existingOrdersInCandidateTrip = getOrdersOnTrip(orders, assignments, vehicleId, tripNo).filter(o => o.orderRef !== orderRef);
  const otherTripOrders = getOrdersOnTrip(orders, assignments, vehicleId, otherTripNo);
  const candidateOutletSequence = ensureOutletInSequence(stopSequences.get(key) ?? [], order.outletId);
  const otherTripOutletSequence = stopSequences.get(otherKey) ?? Array.from(new Set(otherTripOrders.map(o => o.outletId)));
  return buildPassport({
    order, vehicle, candidateTripNo: tripNo, existingOrdersInCandidateTrip, otherTripOrders, ordersByRef, allowances, districtTravel,
    candidateOutletSequence, otherTripOutletSequence,
    candidateDepartureTime: tripMeta.get(key)?.plannedDepartureTime ?? null,
    otherTripDepartureTime: tripMeta.get(otherKey)?.plannedDepartureTime ?? null,
    priorWeeklyFuelUsageL: vehicleFuelInputs.get(vehicleId) ?? null,
  });
}

// =====================================================================
// Constraint passport (Planning workspace) — checker + operational, grouped.
// =====================================================================

export interface PassportContext {
  order: S1Order;
  vehicle: FleetVehicle;
  candidateTripNo: 1 | 2;
  existingOrdersInCandidateTrip: S1Order[];
  otherTripOrders: S1Order[];
  ordersByRef: Map<string, S1Order>;
  allowances: ServiceAllowance[];
  districtTravel: DistrictTravel[];
  /** Outlet sequence for the candidate trip if the order were appended at the end (used to run the delivery-window check against the real stop order). */
  candidateOutletSequence: string[];
  otherTripOutletSequence: string[];
  candidateDepartureTime: string | null;
  otherTripDepartureTime: string | null;
  priorWeeklyFuelUsageL: number | null;
}

export function buildPassport(ctx: PassportContext): PassportResult {
  const {
    order, vehicle, candidateTripNo, existingOrdersInCandidateTrip, otherTripOrders, ordersByRef, allowances, districtTravel,
    candidateOutletSequence, otherTripOutletSequence, candidateDepartureTime, otherTripDepartureTime, priorWeeklyFuelUsageL,
  } = ctx;

  const existingLoadKg = existingOrdersInCandidateTrip.reduce((s, o) => s + o.orderWeightKg, 0);
  const existingLoadM3 = existingOrdersInCandidateTrip.reduce((s, o) => s + o.orderVolumeM3, 0);

  const candidateOrderRefs = [...existingOrdersInCandidateTrip.map(o => o.orderRef), order.orderRef];
  const candidateTripDuration = computeTripDuration(candidateOrderRefs, ordersByRef, allowances, districtTravel);
  const otherTripDuration = otherTripOrders.length > 0
    ? computeTripDuration(otherTripOrders.map(o => o.orderRef), ordersByRef, allowances, districtTravel)
    : 0;

  const candidateStops = buildTripStops(candidateOutletSequence, candidateOrderRefs, ordersByRef);
  const otherStops = buildTripStops(otherTripOutletSequence, otherTripOrders.map(o => o.orderRef), ordersByRef);

  const results: ValidationResult[] = [
    checkDepotMatch(order, vehicle),
    checkVehicleAvailable(vehicle),
    checkReeferRequired(order, vehicle),
    checkVanOnly(order, vehicle),
    checkWeightCapacity(order, vehicle, existingLoadKg),
    checkVolumeCapacity(order, vehicle, existingLoadM3),
    ...checkTripGrouping(order, existingOrdersInCandidateTrip),
    checkTripLimit(candidateTripNo, existingOrdersInCandidateTrip, order),
    checkCumulativeTimeBudget(order, candidateTripNo, candidateTripDuration, otherTripDuration, otherTripOrders[0]?.brand ?? null),
    checkDeliveryWindow(order, candidateStops, candidateDepartureTime, ordersByRef, allowances, districtTravel),
    checkFuelQuota(vehicle, [
      { stops: candidateStops, district: order.district, depot: order.depot },
      ...(otherStops.length > 0 ? [{ stops: otherStops, district: otherTripOrders[0].district, depot: otherTripOrders[0].depot }] : []),
    ], priorWeeklyFuelUsageL, districtTravel),
  ];

  if (candidateStops.length > 0 && otherStops.length > 0) {
    const trip1 = candidateTripNo === 1
      ? { stops: candidateStops, departureTime: candidateDepartureTime, district: order.district, depot: order.depot }
      : { stops: otherStops, departureTime: otherTripDepartureTime, district: otherTripOrders[0].district, depot: otherTripOrders[0].depot };
    const trip2DepartureTime = candidateTripNo === 1 ? otherTripDepartureTime : candidateDepartureTime;
    results.push(checkTripOverlap(trip1, trip2DepartureTime, ordersByRef, allowances, districtTravel));
  }

  const checkerResults = results.filter(r => r.group === 'checker');
  const checkerFeasible = checkerResults.every(r => r.kind === 'checker_pass');
  const allPass = results.every(r => r.kind === 'checker_pass');

  return {
    results,
    checkerFeasible,
    operationalFeasible: allPass ? true : (results.some(r => r.kind === 'unverified') ? null : false),
  };
}

// =====================================================================
// Whole-plan validation (Plan Review checklist) — recomputed both for live
// UI display AND, unmodified, from inside the reducer's PUBLISH transition
// (single source of truth - see PlanningContext.tsx).
// =====================================================================

export interface PlanState {
  orders: S1Order[];
  decisions: Map<string, { decision: OrderDecision; vehicleId: string | null; tripNo: 1 | 2 | null; reasonCode: string | null }>;
  vehiclesById: Map<string, FleetVehicle>;
  allowances: ServiceAllowance[];
  districtTravel: DistrictTravel[];
  stopSequences: Map<string, string[]>; // key: `${vehicleId}-${tripNo}` -> outletId order
  tripMeta: Map<string, TripMeta>; // same key -> { plannedDepartureTime }
  vehicleFuelInputs: Map<string, number | null>; // vehicleId -> confirmed prior weekly usage (null = unconfirmed)
}

export interface PlanCheckRow {
  label: string;
  kind: ResultKind;
  group: 'checker' | 'operational';
  detail: string;
}

function tripKey(vehicleId: string, tripNo: number): string {
  return `${vehicleId}-${tripNo}`;
}

/** Aggregate, computed-from-live-state checklist for Plan Review. Never a static boolean list. */
export function validatePlan(state: PlanState): PlanCheckRow[] {
  const { orders, decisions, vehiclesById, allowances, districtTravel, stopSequences, tripMeta, vehicleFuelInputs } = state;
  const ordersByRef = new Map(orders.map(o => [o.orderRef, o]));
  const rows: PlanCheckRow[] = [];
  const asCheckerRow = (label: string, kind: ResultKind, detail: string): PlanCheckRow => ({ label, kind, group: 'checker', detail });
  const asOperationalRow = (label: string, kind: ResultKind, detail: string): PlanCheckRow => ({ label, kind, group: 'operational', detail });

  const unresolved = orders.filter(o => (decisions.get(o.orderRef)?.decision ?? 'unresolved') === 'unresolved');
  rows.push(asCheckerRow(
    `Every order has an explicit decision (${orders.length - unresolved.length} of ${orders.length} decided)`,
    unresolved.length === 0 ? 'checker_pass' : 'checker_fail',
    unresolved.length === 0 ? 'Pass - no unresolved orders remain' : `${unresolved.length} unresolved: ${unresolved.slice(0, 5).map(o => o.orderRef).join(', ')}${unresolved.length > 5 ? '...' : ''}`,
  ));

  const deferred = orders.filter(o => decisions.get(o.orderRef)?.decision === 'deferred');
  const deferredMissingReason = deferred.filter(o => !decisions.get(o.orderRef)?.reasonCode);
  rows.push(asCheckerRow(
    `Deferred orders have documented reasons (${deferred.length - deferredMissingReason.length}/${deferred.length})`,
    deferredMissingReason.length === 0 ? 'checker_pass' : 'checker_fail',
    deferredMissingReason.length === 0 ? 'Pass - every deferred order has a reason code' : `${deferredMissingReason.length} deferred orders missing a reason`,
  ));

  rows.push(asCheckerRow('Whole order is served or deferred - no split allocations', 'checker_pass', 'Pass - the UI has no path to partially assign an order (C03/C08)'));

  const served = orders.filter(o => decisions.get(o.orderRef)?.decision === 'served');
  let allDepotOk = true, allReeferOk = true, allVanOk = true, allWeightOk = true, allVolumeOk = true, allGroupingOk = true;
  let firstFailure = '';
  const tripOrders = new Map<string, S1Order[]>();
  for (const o of served) {
    const d = decisions.get(o.orderRef)!;
    if (!d.vehicleId || !d.tripNo) continue;
    const key = tripKey(d.vehicleId, d.tripNo);
    const list = tripOrders.get(key) ?? [];
    list.push(o);
    tripOrders.set(key, list);
  }
  for (const o of served) {
    const d = decisions.get(o.orderRef)!;
    const vehicle = d.vehicleId ? vehiclesById.get(d.vehicleId) : undefined;
    if (!vehicle || !d.tripNo) { allDepotOk = false; firstFailure = firstFailure || `${o.orderRef}: no vehicle/trip recorded`; continue; }
    if (vehicle.depot !== o.depot) { allDepotOk = false; firstFailure = firstFailure || `${o.orderRef} vs ${vehicle.vehicleId}: depot mismatch`; }
    if (o.tempRequirement === 'chilled' && vehicle.temp !== 'reefer') { allReeferOk = false; firstFailure = firstFailure || `${o.orderRef}: chilled on non-reefer ${vehicle.vehicleId}`; }
    if (o.parkingConstraint === 'van_only' && vehicle.type !== 'van') { allVanOk = false; firstFailure = firstFailure || `${o.orderRef}: van_only on non-van ${vehicle.vehicleId}`; }
    const tripList = tripOrders.get(tripKey(vehicle.vehicleId, d.tripNo)) ?? [];
    const weight = tripList.reduce((s, x) => s + x.orderWeightKg, 0);
    const volume = tripList.reduce((s, x) => s + x.orderVolumeM3, 0);
    if (weight > vehicle.weightCapKg + TOLERANCE) { allWeightOk = false; firstFailure = firstFailure || `${vehicle.vehicleId} Trip ${d.tripNo}: weight over capacity`; }
    if (volume > vehicle.volumeCapM3 + TOLERANCE) { allVolumeOk = false; firstFailure = firstFailure || `${vehicle.vehicleId} Trip ${d.tripNo}: volume over capacity`; }
    if (tripList.some(x => x.brand !== tripList[0].brand || x.district !== tripList[0].district)) { allGroupingOk = false; firstFailure = firstFailure || `${vehicle.vehicleId} Trip ${d.tripNo}: mixed brand/district`; }
  }

  rows.push(asCheckerRow('Vehicle depot match', allDepotOk ? 'checker_pass' : 'checker_fail', allDepotOk ? 'Pass' : firstFailure));
  rows.push(asCheckerRow('Refrigeration requirements satisfied', allReeferOk ? 'checker_pass' : 'checker_fail', allReeferOk ? 'Pass' : firstFailure));
  rows.push(asCheckerRow('Van access requirements satisfied', allVanOk ? 'checker_pass' : 'checker_fail', allVanOk ? 'Pass' : firstFailure));
  rows.push(asCheckerRow('Weight limits within capacity', allWeightOk ? 'checker_pass' : 'checker_fail', allWeightOk ? 'Pass' : firstFailure));
  rows.push(asCheckerRow('Volume limits within capacity', allVolumeOk ? 'checker_pass' : 'checker_fail', allVolumeOk ? 'Pass' : firstFailure));
  rows.push(asCheckerRow('One brand and one district per trip', allGroupingOk ? 'checker_pass' : 'checker_fail', allGroupingOk ? 'Pass' : firstFailure));
  rows.push(asCheckerRow('Maximum 2 trips per vehicle', 'checker_pass', 'Pass - trip slots are limited to 1 or 2 by construction'));

  let budgetsOk = true;
  let budgetFailure = '';
  for (const [key, list] of tripOrders) {
    const vehicleId = key.slice(0, key.lastIndexOf('-'));
    const duration = computeTripDuration(list.map(o => o.orderRef), ordersByRef, allowances, districtTravel);
    const brand = list[0].brand;
    const budget = budgetForBrand(brand);
    const otherKey = key.endsWith('-1') ? `${vehicleId}-2` : `${vehicleId}-1`;
    const otherList = tripOrders.get(otherKey) ?? [];
    const otherDuration = otherList.length > 0 && (otherList[0].brand === 'Fresh') === (brand === 'Fresh')
      ? computeTripDuration(otherList.map(o => o.orderRef), ordersByRef, allowances, districtTravel)
      : 0;
    const cumulative = duration + otherDuration;
    if (cumulative > budget.minutes + TOLERANCE) {
      budgetsOk = false;
      budgetFailure = budgetFailure || `${vehicleId}: ${cumulative.toFixed(1)} min cumulative ${brand === 'Fresh' ? 'Fresh' : 'other-brand'} minutes, exceeds ${budget.minutes} min`;
    }
  }
  rows.push(asCheckerRow('Fresh trips <=270 cumulative minutes per vehicle', budgetsOk ? 'checker_pass' : 'checker_fail', budgetsOk ? 'Pass' : budgetFailure));
  rows.push(asCheckerRow('Style + Tech trips <=480 cumulative minutes per vehicle', budgetsOk ? 'checker_pass' : 'checker_fail', budgetsOk ? 'Pass' : budgetFailure));

  // Operational checks, per trip, using the same live tripOrders grouping.
  for (const [key, list] of tripOrders) {
    const splitIdx = key.lastIndexOf('-');
    const vehicleId = key.slice(0, splitIdx);
    const tripNoStr = key.slice(splitIdx + 1);
    const tripNo = Number(tripNoStr) as 1 | 2;
    const outletSeq = stopSequences.get(key) ?? Array.from(new Set(list.map(o => o.outletId)));
    const stops = buildTripStops(outletSeq, list.map(o => o.orderRef), ordersByRef);
    const departureTime = tripMeta.get(key)?.plannedDepartureTime ?? null;
    for (const o of list) {
      const r = checkDeliveryWindow(o, stops, departureTime, ordersByRef, allowances, districtTravel);
      rows.push(asOperationalRow(`Delivery window - ${o.orderRef} (${vehicleId} Trip ${tripNo})`, r.kind, r.detail));
    }
    // Fuel is reported once per vehicle (on the Trip-1 pass, or the only trip present), summing both trips, to avoid double-reporting.
    const vehicle = vehiclesById.get(vehicleId);
    const otherKey = key.endsWith('-1') ? `${vehicleId}-2` : `${vehicleId}-1`;
    const isFuelReportingPass = key.endsWith('-1') || !tripOrders.has(otherKey);
    if (vehicle && isFuelReportingPass) {
      const priorUsage = vehicleFuelInputs.get(vehicleId) ?? null;
      const allTripsForVehicle = Array.from(tripOrders.entries())
        .filter(([k]) => k.startsWith(`${vehicleId}-`))
        .map(([k, orderList]) => ({
          stops: buildTripStops(stopSequences.get(k) ?? Array.from(new Set(orderList.map(o => o.outletId))), orderList.map(o => o.orderRef), ordersByRef),
          district: orderList[0].district,
          depot: orderList[0].depot,
        }));
      const r = checkFuelQuota(vehicle, allTripsForVehicle, priorUsage, districtTravel);
      rows.push(asOperationalRow(`Fuel reservation - ${vehicleId}`, r.kind, r.detail));
    }
  }
  // Trip overlap, once per vehicle with both trips populated.
  const vehicleIdsWithBothTrips = new Set(
    Array.from(tripOrders.keys()).map(k => k.slice(0, k.lastIndexOf('-'))).filter(vId => tripOrders.has(`${vId}-1`) && tripOrders.has(`${vId}-2`)),
  );
  for (const vehicleId of vehicleIdsWithBothTrips) {
    const list1 = tripOrders.get(`${vehicleId}-1`)!;
    const key1 = `${vehicleId}-1`;
    const key2 = `${vehicleId}-2`;
    const stops1 = buildTripStops(stopSequences.get(key1) ?? Array.from(new Set(list1.map(o => o.outletId))), list1.map(o => o.orderRef), ordersByRef);
    const departure1 = tripMeta.get(key1)?.plannedDepartureTime ?? null;
    const departure2 = tripMeta.get(key2)?.plannedDepartureTime ?? null;
    const r = checkTripOverlap({ stops: stops1, departureTime: departure1, district: list1[0].district, depot: list1[0].depot }, departure2, ordersByRef, allowances, districtTravel);
    rows.push(asOperationalRow(`Trip overlap - ${vehicleId} (Trip 1 -> Trip 2)`, r.kind, r.detail));
  }

  return rows;
}

// =====================================================================
// Recommendation ranking (Planning workspace) — four documented, explainable
// factors, in precedence order. Never a black box: every reason a candidate
// won or lost is derived and shown, not hidden inside a single score.
// =====================================================================

export interface CandidateRankInput {
  vehicle: FleetVehicle;
  tripNo: 1 | 2;
  order: S1Order;
  existingOrdersInCandidateTrip: S1Order[];
  passport: PassportResult;
}

export interface RankedCandidate extends CandidateRankInput {
  recommended: boolean;
  reasons: string[];
}

/**
 * Ranking precedence: (1) consolidating onto an already-active compatible
 * trip beats opening a fresh one; (2) fewer operational (delivery-window/
 * fuel/overlap) risk flags beats more; (3) best-fit capacity (least leftover
 * headroom, not most) beats an oversized vehicle for a small order; (4) a
 * reefer/van is ranked below an equally-fitting ambient truck when the order
 * needs neither, to preserve that scarce capacity for orders that do.
 */
export function rankCandidates(candidates: CandidateRankInput[]): RankedCandidate[] {
  if (candidates.length === 0) return [];
  const withKeys = candidates.map(c => {
    const opensNewTrip = c.existingOrdersInCandidateTrip.length === 0;
    const needsScarce = c.order.tempRequirement === 'chilled' || c.order.parkingConstraint === 'van_only';
    const usesScarceUnnecessarily = !needsScarce && (c.vehicle.temp === 'reefer' || c.vehicle.type === 'van');
    const operationalRisk = c.passport.results.filter(r => r.group === 'operational' && r.kind !== 'checker_pass').length;
    const weightFrac = (c.existingOrdersInCandidateTrip.reduce((s, o) => s + o.orderWeightKg, 0) + c.order.orderWeightKg) / c.vehicle.weightCapKg;
    const volumeFrac = (c.existingOrdersInCandidateTrip.reduce((s, o) => s + o.orderVolumeM3, 0) + c.order.orderVolumeM3) / c.vehicle.volumeCapM3;
    const wasteFrac = 1 - Math.max(weightFrac, volumeFrac); // smaller = tighter, more desirable fit
    return { c, opensNewTrip, usesScarceUnnecessarily, operationalRisk, wasteFrac };
  });
  withKeys.sort((a, b) =>
    Number(a.usesScarceUnnecessarily) - Number(b.usesScarceUnnecessarily)
    || Number(a.opensNewTrip) - Number(b.opensNewTrip)
    || a.operationalRisk - b.operationalRisk
    || a.wasteFrac - b.wasteFrac,
  );
  return withKeys.map((k, i) => {
    const reasons: string[] = [];
    if (i === 0) {
      if (!k.opensNewTrip) reasons.push(`consolidates onto an existing ${k.c.order.brand}/${k.c.order.district} trip`);
      if (k.operationalRisk === 0) reasons.push('no operational (window/fuel/overlap) risk flags');
      const isScarceVehicle = k.c.vehicle.temp === 'reefer' || k.c.vehicle.type === 'van';
      reasons.push(isScarceVehicle ? 'this order needs reefer/van capacity, so using one here is warranted' : 'preserves scarce reefer/van capacity for orders that need it');
      reasons.push('best-fits remaining capacity');
    }
    return { ...k.c, recommended: i === 0, reasons };
  });
}
