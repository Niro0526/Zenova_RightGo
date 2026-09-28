// Bounded, deterministic frontend allocation heuristic using existing validator rules.
// Produces a "Suggested draft" plan for dispatcher review, not an automatic release.

import type {
  Brand,
  DistrictTravel,
  OrderAssignment,
  S1Order,
  ServiceAllowance,
  TripMeta,
} from '@/types/dispatcher';
import {
  buildPassport,
  buildTripStops,
  computeTripDuration,
  type FleetVehicle,
} from './validation';

export interface UnplacedOrderReason {
  orderRef: string;
  outletId: string;
  brand: Brand;
  district: string;
  tempRequirement: string;
  parkingConstraint: string;
  weightKg: number;
  volumeM3: number;
  reason: string;
  suggestedAction: 'defer_capacity' | 'defer_vehicle' | 'adjust_trip' | 'review_alternatives';
}

export interface GeneratedDraftResult {
  assignments: Record<string, OrderAssignment>;
  stopSequences: Record<string, string[]>;
  tripMeta: Record<string, TripMeta>;
  unplacedOrders: UnplacedOrderReason[];
  summary: {
    totalEligible: number;
    allocatedCount: number;
    unplacedCount: number;
    tripsCreated: number;
    vehiclesUsed: number;
    reeferVehiclesUsed: number;
  };
}

function tripKey(vehicleId: string, tripNo: 1 | 2): string {
  return `${vehicleId}-${tripNo}`;
}

export function generateSuggestedDraftPlan({
  orders,
  fleetVehicles,
  allowances,
  districtTravel,
  preserveExistingAssignments = false,
  existingAssignments = {},
}: {
  orders: S1Order[];
  fleetVehicles: FleetVehicle[];
  allowances: ServiceAllowance[];
  districtTravel: DistrictTravel[];
  preserveExistingAssignments?: boolean;
  existingAssignments?: Record<string, OrderAssignment>;
}): GeneratedDraftResult {
  const ordersByRef = new Map(orders.map((o) => [o.orderRef, o]));
  const vehiclesById = new Map(fleetVehicles.map((v) => [v.vehicleId, v]));

  // Output maps
  const assignments: Record<string, OrderAssignment> = {};
  const stopSequences: Record<string, string[]> = {};
  const tripMeta: Record<string, TripMeta> = {};
  const unplacedOrders: UnplacedOrderReason[] = [];

  // Initialize all orders as unresolved
  for (const o of orders) {
    if (preserveExistingAssignments && existingAssignments[o.orderRef]?.decision === 'served') {
      assignments[o.orderRef] = existingAssignments[o.orderRef];
    } else if (preserveExistingAssignments && existingAssignments[o.orderRef]?.decision === 'deferred') {
      assignments[o.orderRef] = existingAssignments[o.orderRef];
    } else {
      assignments[o.orderRef] = {
        decision: 'unresolved',
        vehicleId: null,
        tripNo: null,
        reasonCode: null,
        reasonNote: null,
      };
    }
  }

  // Active state tracker for vehicles: key -> S1Order[]
  const tripOrdersMap = new Map<string, S1Order[]>();

  // If preserving existing, populate tripOrdersMap
  if (preserveExistingAssignments) {
    for (const o of orders) {
      const a = assignments[o.orderRef];
      if (a?.decision === 'served' && a.vehicleId && a.tripNo) {
        const key = tripKey(a.vehicleId, a.tripNo);
        const list = tripOrdersMap.get(key) ?? [];
        list.push(o);
        tripOrdersMap.set(key, list);
      }
    }
  }

  const availableVehicles = fleetVehicles.filter((v) => v.status === 'available');

  // Categorize vehicles for optimal assignment:
  // 1. Reefer Vans (Scarce - can handle chilled + van_only)
  // 2. Reefer Lorries (Chilled normal dock)
  // 3. Ambient Vans (Ambient van_only)
  // 4. Ambient Lorries (General ambient)
  const sortedVehicles = [...availableVehicles].sort((a, b) => {
    const aScarce = (a.temp === 'reefer' ? 2 : 0) + (a.type === 'van' ? 1 : 0);
    const bScarce = (b.temp === 'reefer' ? 2 : 0) + (b.type === 'van' ? 1 : 0);
    return aScarce - bScarce; // Use generic/abundant vehicles first when possible
  });

  // Filter orders that need placement
  const ordersToPlace = orders.filter((o) => assignments[o.orderRef].decision === 'unresolved');

  // Sort orders by planning priorities:
  // 1. Priority deferred orders (deferred yesterday or 4+ days unserved)
  // 2. High constraint orders (chilled + van_only > chilled > van_only > ambient)
  // 3. Group by Brand and District to maximize consolidation
  // 4. Earlier window close times
  ordersToPlace.sort((a, b) => {
    const aPriority = (a.deferredYesterday ? 10 : 0) + (a.daysSinceLastServed >= 4 ? 5 : 0);
    const bPriority = (b.deferredYesterday ? 10 : 0) + (b.daysSinceLastServed >= 4 ? 5 : 0);
    if (aPriority !== bPriority) return bPriority - aPriority;

    const aConst = (a.tempRequirement === 'chilled' ? 4 : 0) + (a.parkingConstraint === 'van_only' ? 2 : 0);
    const bConst = (b.tempRequirement === 'chilled' ? 4 : 0) + (b.parkingConstraint === 'van_only' ? 2 : 0);
    if (aConst !== bConst) return bConst - aConst;

    // Cluster by brand then district
    if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
    if (a.district !== b.district) return a.district.localeCompare(b.district);

    // Then tighter window
    return a.windowCloseTime.localeCompare(b.windowCloseTime);
  });

  // Helper to test feasibility of adding order to (vehicle, tripNo)
  function testFeasible(order: S1Order, vehicle: FleetVehicle, tripNo: 1 | 2): boolean {
    const key = tripKey(vehicle.vehicleId, tripNo);
    const otherKey = tripKey(vehicle.vehicleId, tripNo === 1 ? 2 : 1);
    const currentOrders = tripOrdersMap.get(key) ?? [];
    const otherOrders = tripOrdersMap.get(otherKey) ?? [];

    const candidateOutletSeq = Array.from(new Set([...currentOrders.map((o) => o.outletId), order.outletId]));
    const otherOutletSeq = Array.from(new Set(otherOrders.map((o) => o.outletId)));

    const departure = tripMeta[key]?.plannedDepartureTime ?? (order.brand === 'Fresh' ? '03:30' : tripNo === 1 ? '06:00' : '09:30');
    const otherDeparture = tripMeta[otherKey]?.plannedDepartureTime ?? (otherOrders[0]?.brand === 'Fresh' ? '03:30' : tripNo === 1 ? '09:30' : '06:00');

    const passport = buildPassport({
      order,
      vehicle,
      candidateTripNo: tripNo,
      existingOrdersInCandidateTrip: currentOrders,
      otherTripOrders: otherOrders,
      ordersByRef,
      allowances,
      districtTravel,
      candidateOutletSequence: candidateOutletSeq,
      otherTripOutletSequence: otherOutletSeq,
      candidateDepartureTime: departure,
      otherTripDepartureTime: otherDeparture,
      priorWeeklyFuelUsageL: null,
    });

    return passport.checkerFeasible;
  }

  // Iteratively place orders
  for (const order of ordersToPlace) {
    let placed = false;

    // Strategy 1: Attempt to consolidate with an existing active trip of same brand & district
    for (const vehicle of sortedVehicles) {
      for (const tripNo of [1, 2] as const) {
        const key = tripKey(vehicle.vehicleId, tripNo);
        const currentOrders = tripOrdersMap.get(key);
        if (!currentOrders || currentOrders.length === 0) continue;

        // Check if matching brand & district
        if (currentOrders[0].brand === order.brand && currentOrders[0].district === order.district) {
          if (testFeasible(order, vehicle, tripNo)) {
            // Place on this trip
            currentOrders.push(order);
            assignments[order.orderRef] = {
              decision: 'served',
              vehicleId: vehicle.vehicleId,
              tripNo,
              reasonCode: null,
              reasonNote: null,
            };
            placed = true;
            break;
          }
        }
      }
      if (placed) break;
    }

    // Strategy 2: If no existing trip consolidated, open a new trip on an empty slot of a compatible vehicle
    if (!placed) {
      // Find eligible vehicle whose capabilities best match order without wasting scarce capacity
      const eligibleVehicles = sortedVehicles.filter((v) => {
        if (order.tempRequirement === 'chilled' && v.temp !== 'reefer') return false;
        if (order.parkingConstraint === 'van_only' && v.type !== 'van') return false;
        return true;
      });

      // Sort candidate vehicles so we prefer non-reefer for ambient, non-van for normal dock
      eligibleVehicles.sort((a, b) => {
        const aWaste = (order.tempRequirement === 'ambient' && a.temp === 'reefer' ? 10 : 0) + (order.parkingConstraint !== 'van_only' && a.type === 'van' ? 5 : 0);
        const bWaste = (order.tempRequirement === 'ambient' && b.temp === 'reefer' ? 10 : 0) + (order.parkingConstraint !== 'van_only' && b.type === 'van' ? 5 : 0);
        return aWaste - bWaste;
      });

      for (const vehicle of eligibleVehicles) {
        for (const tripNo of [1, 2] as const) {
          const key = tripKey(vehicle.vehicleId, tripNo);
          const currentOrders = tripOrdersMap.get(key) ?? [];
          if (currentOrders.length > 0) continue; // slot already occupied

          if (testFeasible(order, vehicle, tripNo)) {
            tripOrdersMap.set(key, [order]);
            assignments[order.orderRef] = {
              decision: 'served',
              vehicleId: vehicle.vehicleId,
              tripNo,
              reasonCode: null,
              reasonNote: null,
            };
            // Set default suggested departure time
            const depTime = order.brand === 'Fresh' ? '03:30' : tripNo === 1 ? '06:00' : '09:30';
            tripMeta[key] = { plannedDepartureTime: depTime };
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
    }

    // If still unplaced, record an honest explanation with suggested action
    if (!placed) {
      let reason = 'Remaining compatible fleet capacity exhausted for this district and brand.';
      let suggestedAction: UnplacedOrderReason['suggestedAction'] = 'defer_capacity';

      if (order.tempRequirement === 'chilled') {
        const reeferAvail = availableVehicles.filter((v) => v.temp === 'reefer');
        if (order.parkingConstraint === 'van_only') {
          reason = 'No remaining reefer van capacity with matching delivery window and access constraint.';
          suggestedAction = 'defer_vehicle';
        } else {
          reason = `Reefer capacity exhausted across all ${reeferAvail.length} active refrigerated vehicles.`;
          suggestedAction = 'defer_capacity';
        }
      } else if (order.parkingConstraint === 'van_only') {
        reason = 'No remaining ambient van capacity with available time budget.';
        suggestedAction = 'defer_vehicle';
      }

      unplacedOrders.push({
        orderRef: order.orderRef,
        outletId: order.outletId,
        brand: order.brand,
        district: order.district,
        tempRequirement: order.tempRequirement,
        parkingConstraint: order.parkingConstraint,
        weightKg: order.orderWeightKg,
        volumeM3: order.orderVolumeM3,
        reason,
        suggestedAction,
      });
    }
  }

  // Populate stop sequences and default departures for all active trips
  let tripsCreated = 0;
  const vehiclesUsedSet = new Set<string>();
  let reeferVehiclesUsed = 0;

  for (const [key, tripOrders] of tripOrdersMap.entries()) {
    if (tripOrders.length === 0) continue;
    tripsCreated++;
    const [vId, tNo] = key.split('-');
    vehiclesUsedSet.add(vId);

    const vehicle = vehiclesById.get(vId);
    if (vehicle?.temp === 'reefer') {
      reeferVehiclesUsed++;
    }

    // Default physical stop sequence: unique outlet IDs in order of discovery
    const uniqueOutlets = Array.from(new Set(tripOrders.map((o) => o.outletId)));
    stopSequences[key] = uniqueOutlets;

    // Default departure time if not set
    if (!tripMeta[key]) {
      const isFresh = tripOrders[0].brand === 'Fresh';
      const defaultDep = isFresh ? '03:30' : tNo === '1' ? '06:00' : '09:30';
      tripMeta[key] = { plannedDepartureTime: defaultDep };
    }
  }

  const allocatedCount = orders.length - unplacedOrders.length;

  return {
    assignments,
    stopSequences,
    tripMeta,
    unplacedOrders,
    summary: {
      totalEligible: orders.length,
      allocatedCount,
      unplacedCount: unplacedOrders.length,
      tripsCreated,
      vehiclesUsed: vehiclesUsedSet.size,
      reeferVehiclesUsed,
    },
  };
}
