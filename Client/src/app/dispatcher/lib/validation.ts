// Checker-parity validation layer.
//
// This is a REIMPLEMENTATION of the documented checker rule register
// (docs/SOURCE_REQUIREMENTS.md, rules C01-C17), written from that
// documentation because the actual `check_allocation.py` script is not
// part of this repository (confirmed absent; it exists only outside the
// repo at C:\Users\kirut\Desktop\Root_Code\Rules\). It is NOT a verified
// byte-for-byte port of that script. Treat any behavior difference as a
// bug in this reimplementation to reconcile against the real checker,
// not as an authoritative alternative.
//
// Rule -> function map (see plan for the full table):
//   C03/C08 -> checkTripGrouping        C07 -> checkVehicleAvailable
//   C08     -> checkDepotMatch          C09 -> checkReeferRequired
//   C10     -> checkVanOnly             C11 -> checkWeightCapacity / checkVolumeCapacity
//   C06/C12 -> checkTripLimit           C13 -> computeTripDuration
//   C14     -> checkCumulativeTimeBudget

import type {
  CheckerCheckResult,
  DistrictTravel,
  OrderDecision,
  PassportResult,
  PolicyGapResult,
  S1Order,
  ServiceAllowance,
  ValidationResult,
  Vehicle,
} from '../types';

const TOLERANCE = 1e-6;
const FRESH_BUDGET_MIN = 270;
const OTHER_BUDGET_MIN = 480;

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

/** C13: depot_to_district_freeflow_min + (n-1)*inter_stop_freeflow_min + sum(service_allowance). */
export function computeTripDuration(
  orderRefs: string[],
  ordersByRef: Map<string, S1Order>,
  allowances: ServiceAllowance[],
  districtTravel: DistrictTravel[],
): number {
  if (orderRefs.length === 0) return 0;
  const orders = orderRefs.map(ref => ordersByRef.get(ref)!);
  const district = orders[0].district;
  const depot = orders[0].depot;
  const travel = districtTravel.find(d => d.district === district && d.depot === depot);
  if (!travel) throw new Error(`No district_travel row for district=${district} depot=${depot}`);
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
  return {
    kind: pass ? 'checker_pass' : 'checker_fail',
    rule: 'VEHICLE_UNAVAILABLE',
    label: 'Vehicle Availability',
    detail: pass ? `Pass - ${vehicle.vehicleId} available` : `Fail - ${vehicle.vehicleId} is in_workshop`,
    vehicleId: vehicle.vehicleId,
  };
}

export function checkDepotMatch(order: S1Order, vehicle: FleetVehicle): CheckerCheckResult {
  const pass = order.depot === vehicle.depot;
  return {
    kind: pass ? 'checker_pass' : 'checker_fail',
    rule: 'DEPOT_MISMATCH',
    label: 'Depot Match',
    detail: pass ? `Pass - both ${vehicle.depot}` : `Fail - order is ${order.depot}, vehicle is ${vehicle.depot}`,
    orderRef: order.orderRef,
    vehicleId: vehicle.vehicleId,
  };
}

export function checkReeferRequired(order: S1Order, vehicle: FleetVehicle): CheckerCheckResult {
  const pass = order.tempRequirement !== 'chilled' || vehicle.temp === 'reefer';
  return {
    kind: pass ? 'checker_pass' : 'checker_fail',
    rule: 'REEFER_REQUIRED',
    label: 'Temperature Requirement',
    detail: order.tempRequirement === 'chilled'
      ? (pass ? `Pass - chilled order, ${vehicle.vehicleId} is reefer` : `Fail - chilled order requires reefer, ${vehicle.vehicleId} is ${vehicle.temp}`)
      : 'Pass - ambient order, no reefer required',
    orderRef: order.orderRef,
    vehicleId: vehicle.vehicleId,
  };
}

export function checkVanOnly(order: S1Order, vehicle: FleetVehicle): CheckerCheckResult {
  const requiresVan = order.parkingConstraint === 'van_only';
  const pass = !requiresVan || vehicle.type === 'van';
  return {
    kind: pass ? 'checker_pass' : 'checker_fail',
    rule: 'VAN_ONLY',
    label: 'Access Restriction',
    detail: requiresVan
      ? (pass ? `Pass - van_only order, ${vehicle.vehicleId} is a van` : `Fail - van_only order requires a van, ${vehicle.vehicleId} is a ${vehicle.type}`)
      : 'Pass - no access restriction',
    orderRef: order.orderRef,
    vehicleId: vehicle.vehicleId,
  };
}

export function checkWeightCapacity(order: S1Order, vehicle: FleetVehicle, existingLoadKg: number): CheckerCheckResult {
  const newLoad = existingLoadKg + order.orderWeightKg;
  const pass = newLoad <= vehicle.weightCapKg + TOLERANCE;
  return {
    kind: pass ? 'checker_pass' : 'checker_fail',
    rule: 'WEIGHT_LIMIT',
    label: 'Weight Capacity',
    detail: `${pass ? 'Pass' : 'Fail'} - ${newLoad.toFixed(1)} kg / ${vehicle.weightCapKg} kg max`,
    orderRef: order.orderRef,
    vehicleId: vehicle.vehicleId,
  };
}

export function checkVolumeCapacity(order: S1Order, vehicle: FleetVehicle, existingLoadM3: number): CheckerCheckResult {
  const newLoad = existingLoadM3 + order.orderVolumeM3;
  const pass = newLoad <= vehicle.volumeCapM3 + TOLERANCE;
  return {
    kind: pass ? 'checker_pass' : 'checker_fail',
    rule: 'VOLUME_LIMIT',
    label: 'Volume Capacity',
    detail: `${pass ? 'Pass' : 'Fail'} - ${newLoad.toFixed(3)} m³ / ${vehicle.volumeCapM3} m³ max`,
    orderRef: order.orderRef,
    vehicleId: vehicle.vehicleId,
  };
}

/** C03/C08: a trip's orders must share exactly one brand and one district. */
export function checkTripGrouping(order: S1Order, existingOrdersInTrip: S1Order[]): CheckerCheckResult[] {
  if (existingOrdersInTrip.length === 0) {
    return [
      { kind: 'checker_pass', rule: 'MIXED_BRAND', label: 'Trip Brand Grouping', detail: 'Pass - first order on this trip', orderRef: order.orderRef },
      { kind: 'checker_pass', rule: 'MIXED_DISTRICT', label: 'Trip District Grouping', detail: 'Pass - first order on this trip', orderRef: order.orderRef },
    ];
  }
  const ref = existingOrdersInTrip[0];
  const brandPass = ref.brand === order.brand;
  const districtPass = ref.district === order.district;
  return [
    { kind: brandPass ? 'checker_pass' : 'checker_fail', rule: 'MIXED_BRAND', label: 'Trip Brand Grouping', detail: brandPass ? `Pass - all ${order.brand}` : `Fail - trip already has ${ref.brand}, order is ${order.brand}`, orderRef: order.orderRef },
    { kind: districtPass ? 'checker_pass' : 'checker_fail', rule: 'MIXED_DISTRICT', label: 'Trip District Grouping', detail: districtPass ? `Pass - all ${order.district}` : `Fail - trip already has ${ref.district}, order is ${order.district}`, orderRef: order.orderRef },
  ];
}

/** C06/C12: trip_no must be 1 or 2, and the chosen slot must be free or already grouping-compatible. */
export function checkTripLimit(tripNo: 1 | 2, existingOrdersInTrip: S1Order[], order: S1Order): CheckerCheckResult {
  const compatible = existingOrdersInTrip.length === 0 || (existingOrdersInTrip[0].brand === order.brand && existingOrdersInTrip[0].district === order.district);
  return {
    kind: compatible ? 'checker_pass' : 'checker_fail',
    rule: 'TRIP_LIMIT',
    label: 'Trip Limit',
    detail: compatible ? `Pass - Trip ${tripNo} of 2` : `Fail - Trip ${tripNo} already holds an incompatible brand/district group`,
    orderRef: order.orderRef,
    tripNo,
  };
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
  return {
    kind: pass ? 'checker_pass' : 'checker_fail',
    rule: budget.code,
    label: budget.label,
    detail: `${pass ? 'Pass' : 'Fail'} - ${cumulative.toFixed(1)} min cumulative / ${budget.minutes} min max (this trip: ${candidateTripDurationMin.toFixed(1)} min)`,
    orderRef: order.orderRef,
    vehicleId: undefined,
    tripNo: candidateTripNo,
  };
}

// --- Policy gaps: the checker does not evaluate these -----------------------
export const POLICY_GAPS: PolicyGapResult[] = [
  { kind: 'policy_gap', rule: 'DELIVERY_WINDOW', label: 'Delivery / Mall Window', detail: 'Not evaluated - outlet and mall arrival-window timing is outside the supplied checker (C01-C17); operational policy for this is unconfirmed.' },
  { kind: 'policy_gap', rule: 'FUEL_QUOTA', label: 'Fuel Reservation', detail: 'Not evaluated - weekly_fuel_quota_l exists in vehicles.csv but no consumption/reservation policy is defined by the checker or docs.' },
];

export interface PassportContext {
  order: S1Order;
  vehicle: FleetVehicle;
  candidateTripNo: 1 | 2;
  /** Orders already sitting on the candidate trip slot, before this order. */
  existingOrdersInCandidateTrip: S1Order[];
  /** The OTHER trip slot on this vehicle (1 or 2, whichever isn't the candidate), if it has orders. */
  otherTripOrders: S1Order[];
  ordersByRef: Map<string, S1Order>;
  allowances: ServiceAllowance[];
  districtTravel: DistrictTravel[];
}

/** Full constraint passport for one candidate (order, vehicle, tripNo). */
export function buildPassport(ctx: PassportContext): PassportResult {
  const { order, vehicle, candidateTripNo, existingOrdersInCandidateTrip, otherTripOrders, ordersByRef, allowances, districtTravel } = ctx;

  const existingLoadKg = existingOrdersInCandidateTrip.reduce((s, o) => s + o.orderWeightKg, 0);
  const existingLoadM3 = existingOrdersInCandidateTrip.reduce((s, o) => s + o.orderVolumeM3, 0);

  const candidateOrderRefs = [...existingOrdersInCandidateTrip.map(o => o.orderRef), order.orderRef];
  const candidateTripDuration = computeTripDuration(candidateOrderRefs, ordersByRef, allowances, districtTravel);
  const otherTripDuration = otherTripOrders.length > 0
    ? computeTripDuration(otherTripOrders.map(o => o.orderRef), ordersByRef, allowances, districtTravel)
    : 0;

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
    ...POLICY_GAPS,
  ];

  const checkerResults = results.filter((r): r is CheckerCheckResult => r.kind !== 'policy_gap');
  const checkerFeasible = checkerResults.every(r => r.kind === 'checker_pass');
  const hasPolicyGap = results.some(r => r.kind === 'policy_gap');

  return {
    results,
    checkerFeasible,
    operationalFeasible: hasPolicyGap ? null : checkerFeasible,
  };
}

// --- Whole-plan validation (Plan Review checklist) --------------------------

export interface PlanState {
  orders: S1Order[];
  decisions: Map<string, { decision: OrderDecision; vehicleId: string | null; tripNo: 1 | 2 | null; reasonCode: string | null }>;
  vehiclesById: Map<string, FleetVehicle>;
  allowances: ServiceAllowance[];
  districtTravel: DistrictTravel[];
}

export interface PlanCheckRow {
  label: string;
  kind: 'checker_pass' | 'checker_fail' | 'policy_gap';
  detail: string;
}

/** Aggregate, computed-from-live-state checklist for Plan Review. Never a static boolean list. */
export function validatePlan(state: PlanState): PlanCheckRow[] {
  const { orders, decisions, vehiclesById, allowances, districtTravel } = state;
  const ordersByRef = new Map(orders.map(o => [o.orderRef, o]));
  const rows: PlanCheckRow[] = [];

  const unresolved = orders.filter(o => (decisions.get(o.orderRef)?.decision ?? 'unresolved') === 'unresolved');
  rows.push({
    label: `Every order has an explicit decision (${orders.length - unresolved.length} of ${orders.length} decided)`,
    kind: unresolved.length === 0 ? 'checker_pass' : 'checker_fail',
    detail: unresolved.length === 0 ? 'Pass - no unresolved orders remain' : `${unresolved.length} unresolved: ${unresolved.slice(0, 5).map(o => o.orderRef).join(', ')}${unresolved.length > 5 ? '...' : ''}`,
  });

  const deferred = orders.filter(o => decisions.get(o.orderRef)?.decision === 'deferred');
  const deferredMissingReason = deferred.filter(o => !decisions.get(o.orderRef)?.reasonCode);
  rows.push({
    label: `Deferred orders have documented reasons (${deferred.length - deferredMissingReason.length}/${deferred.length})`,
    kind: deferredMissingReason.length === 0 ? 'checker_pass' : 'checker_fail',
    detail: deferredMissingReason.length === 0 ? 'Pass - every deferred order has a reason code' : `${deferredMissingReason.length} deferred orders missing a reason`,
  });

  rows.push({ label: 'Whole order is served or deferred - no split allocations', kind: 'checker_pass', detail: 'Pass - the UI has no path to partially assign an order (C03/C08)' });

  // Group served orders by vehicle/trip to re-check grouping + capacity + budgets from live state.
  const served = orders.filter(o => decisions.get(o.orderRef)?.decision === 'served');
  let allDepotOk = true, allReeferOk = true, allVanOk = true, allWeightOk = true, allVolumeOk = true, allGroupingOk = true;
  let firstFailure = '';
  const tripKey = (vehicleId: string, tripNo: number) => `${vehicleId}-${tripNo}`;
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

  rows.push({ label: 'Vehicle depot match (all Peliyagoda)', kind: allDepotOk ? 'checker_pass' : 'checker_fail', detail: allDepotOk ? 'Pass' : firstFailure });
  rows.push({ label: 'Refrigeration requirements satisfied', kind: allReeferOk ? 'checker_pass' : 'checker_fail', detail: allReeferOk ? 'Pass' : firstFailure });
  rows.push({ label: 'Van access requirements satisfied', kind: allVanOk ? 'checker_pass' : 'checker_fail', detail: allVanOk ? 'Pass' : firstFailure });
  rows.push({ label: 'Weight limits within capacity', kind: allWeightOk ? 'checker_pass' : 'checker_fail', detail: allWeightOk ? 'Pass' : firstFailure });
  rows.push({ label: 'Volume limits within capacity', kind: allVolumeOk ? 'checker_pass' : 'checker_fail', detail: allVolumeOk ? 'Pass' : firstFailure });
  rows.push({ label: 'One brand and one district per trip', kind: allGroupingOk ? 'checker_pass' : 'checker_fail', detail: allGroupingOk ? 'Pass' : firstFailure });

  // Max 2 trips/vehicle is a type-level invariant (tripNo: 1|2) - true by construction.
  rows.push({ label: 'Maximum 2 trips per vehicle', kind: 'checker_pass', detail: 'Pass - trip slots are limited to 1 or 2 by construction' });

  // Cumulative time budgets, per vehicle, recomputed from the live trip contents.
  let budgetsOk = true;
  let budgetFailure = '';
  for (const [key, list] of tripOrders) {
    const [vehicleId] = key.split('-');
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
  rows.push({ label: 'Fresh trips <=270 cumulative minutes per vehicle', kind: budgetsOk ? 'checker_pass' : 'checker_fail', detail: budgetsOk ? 'Pass' : budgetFailure });
  rows.push({ label: 'Style + Tech trips <=480 cumulative minutes per vehicle', kind: budgetsOk ? 'checker_pass' : 'checker_fail', detail: budgetsOk ? 'Pass' : budgetFailure });

  for (const gap of POLICY_GAPS) {
    rows.push({ label: gap.label, kind: 'policy_gap', detail: gap.detail });
  }

  return rows;
}
