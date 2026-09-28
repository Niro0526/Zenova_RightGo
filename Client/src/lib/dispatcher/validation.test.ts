import { describe, expect, it } from 'vitest';
import {
  ASSUMED_TURNAROUND_MIN,
  buildTripStops,
  checkFuelQuota,
  checkFuelQuotaFromDistance,
  checkTripOverlap,
  computeStopSchedule,
  computeTripDistanceKm,
  computeTripDuration,
  rankCandidates,
  validateOrderIntake,
  type FleetVehicle,
} from './validation';
import { DISTRICT_TRAVEL, SERVICE_ALLOWANCES, S1_ORDERS, S1_VEHICLES } from '@/data/dispatcher-dataset';
import type { S1Order } from '@/types/dispatcher';

const ordersByRef = new Map(S1_ORDERS.map(o => [o.orderRef, o]));
const veh037 = S1_VEHICLES.find(v => v.vehicleId === 'VEH037')!; // van, ambient, kmPerL 11.5, weeklyFuelQuotaL 340

function order(ref: string): S1Order {
  const o = ordersByRef.get(ref);
  if (!o) throw new Error(`fixture order ${ref} not found`);
  return o;
}

describe('buildTripStops', () => {
  it('groups two order rows at the same outlet into one physical stop', () => {
    const stops = buildTripStops(['OUT001'], ['S1-000', 'S1-001'], ordersByRef);
    expect(stops).toHaveLength(1);
    expect(stops[0].orderRefs).toEqual(['S1-000', 'S1-001']);
  });

  it('produces separate stops for different outlets, in the given sequence order', () => {
    const stops = buildTripStops(['OUT002', 'OUT001'], ['S1-000', 'S1-001', 'S1-002', 'S1-003'], ordersByRef);
    expect(stops.map(s => s.outletId)).toEqual(['OUT002', 'OUT001']);
  });
});

describe('computeStopSchedule', () => {
  it('propagates wait time forward: an early arrival waits, does not fail, and the wait carries into the next stop', () => {
    // OUT005 window 04:00-07:45, Fresh/Colombo/rear_dock (allowance 15 min/row), 2 rows (S1-008, S1-009).
    const stops = buildTripStops(['OUT005'], ['S1-008', 'S1-009'], ordersByRef);
    const schedule = computeStopSchedule(stops, '03:00', ordersByRef, SERVICE_ALLOWANCES, DISTRICT_TRAVEL);
    expect(schedule).toHaveLength(1);
    const [s] = schedule;
    expect(s.arrival).toBe(3 * 60 + 24); // depot_to_district_freeflow_min = 24
    expect(s.wait).toBe(36); // window opens at 04:00 = 240, arrival 204
    expect(s.serviceStart).toBe(4 * 60); // 04:00
    expect(s.serviceEnd).toBe(4 * 60 + 30); // 15+15 service minutes
    expect(s.late).toBe(false);
  });

  it('detects a late arrival (after the window has closed) as a real failure, not a wait', () => {
    const stops = buildTripStops(['OUT001'], ['S1-000'], ordersByRef); // window closes 07:30
    const schedule = computeStopSchedule(stops, '10:00', ordersByRef, SERVICE_ALLOWANCES, DISTRICT_TRAVEL);
    expect(schedule[0].late).toBe(true);
  });

  it('propagates wait+service into a second stop\'s arrival time', () => {
    const stops = buildTripStops(['OUT001', 'OUT002'], ['S1-000', 'S1-001', 'S1-002', 'S1-003'], ordersByRef);
    const schedule = computeStopSchedule(stops, '05:00', ordersByRef, SERVICE_ALLOWANCES, DISTRICT_TRAVEL);
    expect(schedule[0].serviceEnd).toBe(5 * 60 + 56); // 300 + 24 travel + 32 service (16+16) = 356
    expect(schedule[1].arrival).toBe(6 * 60 + 4); // 356 + 8 interstop = 364
    expect(schedule[1].serviceEnd).toBe(6 * 60 + 36); // 364 + 32 service = 396
  });

  it('flags a mall-window violation distinct from the outlet window', () => {
    const narrowMallOrder: S1Order = { ...order('S1-023'), windowOpenTime: '08:00', windowCloseTime: '18:00', mallWindow: '10:00-10:05' };
    const map = new Map([[narrowMallOrder.orderRef, narrowMallOrder]]);
    const stops = buildTripStops([narrowMallOrder.outletId], [narrowMallOrder.orderRef], map);
    const schedule = computeStopSchedule(stops, '09:00', map, SERVICE_ALLOWANCES, DISTRICT_TRAVEL);
    expect(schedule[0].mallWindow?.violated).toBe(true);
    expect(schedule[0].late).toBe(false); // outlet window itself is not violated - only the mall access window
  });
});

describe('computeTripDistanceKm vs computeTripDuration', () => {
  it('scales with unique-outlet count, not order-row count, and includes a return leg', () => {
    const oneOutletStops = buildTripStops(['OUT001'], ['S1-000', 'S1-001'], ordersByRef); // 2 rows, 1 stop
    const distance = computeTripDistanceKm(oneOutletStops, 'Colombo', 'Peliyagoda', DISTRICT_TRAVEL);
    expect(distance).toBe(12 + 12); // outbound + return, no inter-stop leg for a single stop

    const twoOutletStops = buildTripStops(['OUT001', 'OUT002'], ['S1-000', 'S1-001', 'S1-002', 'S1-003'], ordersByRef); // 4 rows, 2 stops
    const distance2 = computeTripDistanceKm(twoOutletStops, 'Colombo', 'Peliyagoda', DISTRICT_TRAVEL);
    expect(distance2).toBe(12 + 4 * 1 + 12); // outbound + one inter-stop leg + return
  });

  it('never derives from or equals computeTripDuration\'s row-based, single-leg number', () => {
    const stops = buildTripStops(['OUT001'], ['S1-000', 'S1-001'], ordersByRef);
    const distanceKm = computeTripDistanceKm(stops, 'Colombo', 'Peliyagoda', DISTRICT_TRAVEL);
    const durationMin = computeTripDuration(['S1-000', 'S1-001'], ordersByRef, SERVICE_ALLOWANCES, DISTRICT_TRAVEL);
    // Different units and different formulas entirely - this assertion just guards against someone
    // accidentally wiring computeTripDistanceKm to reuse computeTripDuration's row-based result.
    expect(distanceKm).toBe(24);
    expect(durationMin).toBe(24 + 1 * 8 + 32); // checker formula DOES add an inter-stop leg between the two rows, even though they share an outlet
    expect(durationMin).not.toBe(distanceKm);
  });
});

describe('checkFuelQuota', () => {
  it('is unverified when prior weekly usage has not been confirmed (null), never a silent pass', () => {
    const stops = buildTripStops(['OUT001'], ['S1-000', 'S1-001'], ordersByRef);
    const result = checkFuelQuota(veh037 as FleetVehicle, [{ stops, district: 'Colombo', depot: 'Peliyagoda' }], null, DISTRICT_TRAVEL);
    expect(result.kind).toBe('unverified');
  });

  it('resolves to a real pass/fail once a confirmed figure (including an explicit 0) is supplied', () => {
    const stops = buildTripStops(['OUT001'], ['S1-000', 'S1-001'], ordersByRef);
    const result = checkFuelQuota(veh037 as FleetVehicle, [{ stops, district: 'Colombo', depot: 'Peliyagoda' }], 0, DISTRICT_TRAVEL);
    expect(result.kind).toBe('checker_pass'); // 24km / 11.5 km/L ≈ 2.09L, well under 340L quota
  });

  it('fails when today\'s route alone exceeds the weekly quota, regardless of prior usage', () => {
    const result = checkFuelQuotaFromDistance(veh037 as FleetVehicle, 10000, 0); // absurd distance, deliberately synthetic
    expect(result.kind).toBe('checker_fail');
  });
});

describe('checkTripOverlap', () => {
  it('is unverified until both trips have a planned departure time', () => {
    const stops = buildTripStops(['OUT005'], ['S1-008', 'S1-009'], ordersByRef);
    const result = checkTripOverlap({ stops, departureTime: null, district: 'Colombo', depot: 'Peliyagoda' }, '09:00', ordersByRef, SERVICE_ALLOWANCES, DISTRICT_TRAVEL);
    expect(result.kind).toBe('unverified');
  });

  it('estimates Trip 1\'s return from the real stop schedule (incl. wait) + return leg + assumed turnaround - not computeTripDuration\'s number', () => {
    const stops = buildTripStops(['OUT005'], ['S1-008', 'S1-009'], ordersByRef);
    // Schedule (see computeStopSchedule test above): arrival 204, wait 36, serviceEnd 270.
    const estimatedReturn = 270 + 24 /* return leg */ + ASSUMED_TURNAROUND_MIN;
    const naiveDurationBasedReturn = 180 /* departure */ + computeTripDuration(['S1-008', 'S1-009'], ordersByRef, SERVICE_ALLOWANCES, DISTRICT_TRAVEL);
    expect(estimatedReturn).not.toBe(naiveDurationBasedReturn); // proves the two are genuinely different numbers

    const fail = checkTripOverlap({ stops, departureTime: '03:00', district: 'Colombo', depot: 'Peliyagoda' }, '05:00', ordersByRef, SERVICE_ALLOWANCES, DISTRICT_TRAVEL);
    expect(fail.kind).toBe('checker_fail'); // 05:00 (300) is before the estimated return (314)

    const pass = checkTripOverlap({ stops, departureTime: '03:00', district: 'Colombo', depot: 'Peliyagoda' }, '05:14', ordersByRef, SERVICE_ALLOWANCES, DISTRICT_TRAVEL);
    expect(pass.kind).toBe('checker_pass'); // exactly at the estimated return
  });
});

describe('validateOrderIntake', () => {
  it('confirms every real S1 order (the shipped dataset is clean)', () => {
    for (const o of S1_ORDERS) {
      expect(validateOrderIntake(o).status).toBe('confirmed');
    }
  });

  it('flags each malformed field independently on a deliberately synthetic order', () => {
    const malformed: S1Order = {
      ...order('S1-000'),
      orderWeightKg: 0,
      orderVolumeM3: -1,
      orderUnits: 0,
      windowOpenTime: '08:00',
      windowCloseTime: '07:00', // open after close
    };
    const result = validateOrderIntake(malformed);
    expect(result.status).toBe('needs_correction');
    expect(result.issues.length).toBeGreaterThanOrEqual(4);
  });

  it('flags a mall-bay order missing its mall window', () => {
    const malformed: S1Order = { ...order('S1-023'), mallWindow: null };
    expect(validateOrderIntake(malformed).status).toBe('needs_correction');
  });
});

describe('rankCandidates', () => {
  const chilledOrder = order('S1-001'); // chilled - needs reefer
  const ambientOrder = order('S1-000'); // ambient, van_only - needs a van, but not a reefer
  const plainOrder = order('S1-006'); // ambient, normal parking - needs neither reefer nor van

  function fakeVehicle(overrides: Partial<FleetVehicle>): FleetVehicle {
    return { vehicleId: 'X', type: 'truck', temp: 'ambient', weightCapKg: 1000, volumeCapM3: 10, fuelType: 'diesel', kmPerL: 5, weeklyFuelQuotaL: 100, depot: 'Peliyagoda', status: 'available', ...overrides };
  }

  it('ranks consolidating onto an active compatible trip above opening a fresh one', () => {
    const consolidating = { vehicle: fakeVehicle({ vehicleId: 'A' }), tripNo: 1 as const, order: ambientOrder, existingOrdersInCandidateTrip: [ambientOrder], passport: { results: [], checkerFeasible: true, operationalFeasible: true } };
    const freshTrip = { vehicle: fakeVehicle({ vehicleId: 'B' }), tripNo: 1 as const, order: ambientOrder, existingOrdersInCandidateTrip: [], passport: { results: [], checkerFeasible: true, operationalFeasible: true } };
    const ranked = rankCandidates([freshTrip, consolidating]);
    expect(ranked[0].vehicle.vehicleId).toBe('A');
    expect(ranked[0].recommended).toBe(true);
  });

  it('ranks best-fit (tighter leftover headroom) above an oversized vehicle for a small order', () => {
    const tight = { vehicle: fakeVehicle({ vehicleId: 'TIGHT', weightCapKg: 200, volumeCapM3: 1 }), tripNo: 1 as const, order: ambientOrder, existingOrdersInCandidateTrip: [], passport: { results: [], checkerFeasible: true, operationalFeasible: true } };
    const oversized = { vehicle: fakeVehicle({ vehicleId: 'BIG', weightCapKg: 7000, volumeCapM3: 40 }), tripNo: 1 as const, order: ambientOrder, existingOrdersInCandidateTrip: [], passport: { results: [], checkerFeasible: true, operationalFeasible: true } };
    const ranked = rankCandidates([oversized, tight]);
    expect(ranked[0].vehicle.vehicleId).toBe('TIGHT');
  });

  it('never top-ranks a reefer/van onto a non-scarce-requiring order when an equal ambient-truck candidate exists', () => {
    const reefer = { vehicle: fakeVehicle({ vehicleId: 'REEFER', temp: 'reefer' }), tripNo: 1 as const, order: plainOrder, existingOrdersInCandidateTrip: [], passport: { results: [], checkerFeasible: true, operationalFeasible: true } };
    const plainTruck = { vehicle: fakeVehicle({ vehicleId: 'TRUCK' }), tripNo: 1 as const, order: plainOrder, existingOrdersInCandidateTrip: [], passport: { results: [], checkerFeasible: true, operationalFeasible: true } };
    const ranked = rankCandidates([reefer, plainTruck]);
    expect(ranked[0].vehicle.vehicleId).toBe('TRUCK');
  });

  it('does rank a reefer for a chilled order (it needs the scarce capacity, so using it is warranted)', () => {
    const reefer = { vehicle: fakeVehicle({ vehicleId: 'REEFER', temp: 'reefer' }), tripNo: 1 as const, order: chilledOrder, existingOrdersInCandidateTrip: [], passport: { results: [], checkerFeasible: true, operationalFeasible: true } };
    const ranked = rankCandidates([reefer]);
    expect(ranked[0].recommended).toBe(true);
  });
});
