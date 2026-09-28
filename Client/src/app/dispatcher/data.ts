// Waypoint Pulse - Dispatcher domain mock dataset (frontend only, S1 Peak Day · 8 January 2026)

export type Brand = 'Fresh' | 'Tech' | 'Style';
export type PlanningStatus = 'assigned' | 'deferred' | 'unresolved';

export interface S1Order {
  ref: string;
  outletId: string;
  outletName: string;
  district: string;
  brand: Brand;
  isChilled: boolean;
  deliveryWindow: string;
  weightKg: number;
  volumeM3: number;
  constraints: string[];
  previouslyDeferred: boolean;
  planningStatus: PlanningStatus;
}

const DISTRICTS = ['Colombo', 'Gampaha', 'Kalutara', 'Galle', 'Matara', 'Kurunegala', 'Kandy'];

function buildOrders(): S1Order[] {
  const orders: S1Order[] = [];
  const TOTAL = 85;
  const FRESH = 75;
  const TECH = 5;
  // remaining 5 are Style

  for (let i = 0; i < TOTAL; i++) {
    const num = String(i).padStart(3, '0');
    const outletNum = String(i + 1).padStart(3, '0');
    const brand: Brand = i < FRESH ? 'Fresh' : i < FRESH + TECH ? 'Tech' : 'Style';
    const district = DISTRICTS[i % DISTRICTS.length];

    const isChilled = i === 0 || i === 1; // 2 chilled orders (Cold Chain)
    const isVanOnly = i < 6; // 6 van-only orders
    const isMallWindow = brand === 'Style' && (i === 81 || i === 82); // 2 mall-window orders
    const previouslyDeferred = i === 4; // 1 previously-deferred order

    const constraints: string[] = [];
    if (isVanOnly) constraints.push('van_only', 'street');
    if (isMallWindow) constraints.push('mall_window');
    if (previouslyDeferred) constraints.push('previously_deferred');

    let deliveryWindow = '05:00-08:00';
    if (isChilled) deliveryWindow = '05:00-07:30';
    else if (brand === 'Tech') deliveryWindow = '09:00-17:00';
    else if (isMallWindow) deliveryWindow = '09:00-11:00';
    else if (brand === 'Style') deliveryWindow = '09:00-17:00';

    let weightKg: number;
    let volumeM3: number;
    if (i === 0) { weightKg = 97.8; volumeM3 = 0.5; }
    else if (i === 1) { weightKg = 448.6; volumeM3 = 2.445; }
    else {
      weightKg = Math.round((60 + ((i * 37) % 420)) * 10) / 10;
      volumeM3 = Math.round((0.3 + ((i * 13) % 27) / 10) * 1000) / 1000;
    }

    // 64 assigned, 12 deferred, 9 unresolved (sums to 85)
    let planningStatus: PlanningStatus;
    if (i < 64) planningStatus = 'assigned';
    else if (i < 76) planningStatus = 'deferred';
    else planningStatus = 'unresolved';

    orders.push({
      ref: `S1-${num}`,
      outletId: `OUT${outletNum}`,
      outletName: `${district} Outlet ${outletNum}`,
      district,
      brand,
      isChilled,
      deliveryWindow,
      weightKg,
      volumeM3,
      constraints,
      previouslyDeferred,
      planningStatus,
    });
  }

  // Match the two showcased Colombo Fresh outlets from the reference design exactly.
  orders[0].outletName = 'Colombo Outlet 001';
  orders[1].outletName = 'Colombo Outlet 001';

  return orders;
}

export const S1_ORDERS: S1Order[] = buildOrders();

export const ORDER_COUNTS = {
  total: S1_ORDERS.length,
  fresh: S1_ORDERS.filter(o => o.brand === 'Fresh').length,
  tech: S1_ORDERS.filter(o => o.brand === 'Tech').length,
  style: S1_ORDERS.filter(o => o.brand === 'Style').length,
  chilled: S1_ORDERS.filter(o => o.isChilled).length,
  vanOnly: S1_ORDERS.filter(o => o.constraints.includes('van_only')).length,
  mallWindow: S1_ORDERS.filter(o => o.constraints.includes('mall_window')).length,
  previouslyDeferred: S1_ORDERS.filter(o => o.previouslyDeferred).length,
  assigned: S1_ORDERS.filter(o => o.planningStatus === 'assigned').length,
  deferred: S1_ORDERS.filter(o => o.planningStatus === 'deferred').length,
  unresolved: S1_ORDERS.filter(o => o.planningStatus === 'unresolved').length,
};

export interface DispatchVehicle {
  id: string;
  type: string;
  depot: string;
  weightCapKg: number;
  volumeCapM3: number;
  currentLoadKg: number;
  currentLoadM3: number;
  isReefer: boolean;
  isVan: boolean;
  tripBudgetMin: number;
  tripTimeMin: number;
}

export const DISPATCH_VEHICLES: DispatchVehicle[] = [
  { id: 'VEH036', type: 'Reefer Van', depot: 'Peliyagoda', weightCapKg: 1040, volumeCapM3: 7.0, currentLoadKg: 0, currentLoadM3: 0, isReefer: true, isVan: true, tripBudgetMin: 270, tripTimeMin: 64 },
  { id: 'VEH012', type: 'Standard Van', depot: 'Peliyagoda', weightCapKg: 1200, volumeCapM3: 8.0, currentLoadKg: 400, currentLoadM3: 1.9, isReefer: false, isVan: true, tripBudgetMin: 270, tripTimeMin: 0 },
  { id: 'VEH028', type: 'Reefer Van', depot: 'Peliyagoda', weightCapKg: 1040, volumeCapM3: 7.0, currentLoadKg: 0, currentLoadM3: 0, isReefer: true, isVan: true, tripBudgetMin: 270, tripTimeMin: 0 },
];

export interface DeferredOrderRow {
  ref: string;
  outlet: string;
  reason: string;
  skipCount: number;
}

export const DEFERRED_ORDERS: DeferredOrderRow[] = [
  { ref: 'WP-S-1042', outlet: 'Cargills FoodCity', reason: 'Capacity Exhausted', skipCount: 3 },
  { ref: 'WP-D-2091', outlet: 'Keells Super', reason: 'No Refrigerated Space', skipCount: 2 },
  { ref: 'WP-F-0814', outlet: 'Arpico Super', reason: 'Customer Closed', skipCount: 1 },
  { ref: 'WP-F-1102', outlet: 'Laughs One', reason: 'Access Restricted', skipCount: 1 },
  { ref: 'WP-S-3042', outlet: 'Spars Market', reason: 'Volume Exceeded', skipCount: 1 },
  { ref: 'WP-S-4402', outlet: 'Glitz Grand', reason: 'Outside Route Boundary', skipCount: 0 },
];

export type DecisionType = 'Deferred' | 'Reassigned' | 'Assigned';

export interface DecisionLedgerRow {
  orderId: string;
  outletId: string;
  decision: DecisionType;
  reason: string;
  decisionMaker: string;
  time: string;
  previousAssignment: string;
  updatedAssignment: string;
  planVersion: string;
}

export const DECISION_LEDGER: DecisionLedgerRow[] = [
  { orderId: 'S1-042', outletId: 'OUT034', decision: 'Deferred', reason: 'Not enough refrigerated capacity on assigned reefer trip', decisionMaker: 'Sarah Jenkins', time: '06:45', previousAssignment: '-', updatedAssignment: '-', planVersion: 'v1' },
  { orderId: 'S1-058', outletId: 'OUT051', decision: 'Deferred', reason: 'outlet_deferred_yesterday - van_only slot unavailable', decisionMaker: 'Sarah Jenkins', time: '07:02', previousAssignment: '-', updatedAssignment: '-', planVersion: 'v1' },
  { orderId: 'S1-023', outletId: 'OUT018', decision: 'Reassigned', reason: 'Loading shortfall on VEH012 · Trip 1', decisionMaker: 'Sarah Jenkins', time: '08:15', previousAssignment: 'VEH012 · Trip 1', updatedAssignment: 'VEH036 · Trip 2', planVersion: 'v2' },
  { orderId: 'S1-071', outletId: 'OUT062', decision: 'Deferred', reason: 'days_since_last_served: 5 - priority review flagged', decisionMaker: 'Sarah Jenkins', time: '07:30', previousAssignment: '-', updatedAssignment: '-', planVersion: 'v1' },
];

export type TripStatus = 'Loading' | 'In Transit' | 'Departed' | 'Awaiting';

export interface LiveTripRow {
  vehicle: string;
  district: string;
  status: TripStatus;
  lastUpdate: string;
  issue?: string;
}

export const LIVE_TRIPS: LiveTripRow[] = [
  { vehicle: 'VEH036', district: 'Colombo', status: 'Loading', lastUpdate: '06:15' },
  { vehicle: 'VEH012', district: 'Gampaha', status: 'In Transit', lastUpdate: '06:45', issue: 'Loading shortfall reported' },
  { vehicle: 'VEH008', district: 'Kurunegala', status: 'Departed', lastUpdate: '05:30' },
  { vehicle: 'VEH021', district: 'Kalutara', status: 'Loading', lastUpdate: '06:20' },
  { vehicle: 'VEH003', district: 'Galle', status: 'Departed', lastUpdate: '05:15' },
  { vehicle: 'VEH045', district: 'Matara', status: 'Awaiting', lastUpdate: '-', issue: 'Connectivity stale (>15 min)' },
];

export const LOADING_SHORTFALL = {
  vehicle: 'VEH012',
  trip: 'Trip 1',
  district: 'Gampaha',
  affectedOrder: 'S1-023',
  affectedOutlet: 'OUT018',
  reportedIssue: '2 cases of WP-F-2741 missing from load',
};

export interface CapacityWeek {
  week: number;
  label: string;
  totalDemandM3: number;
  chilledDemandM3: number;
  availableCapacityM3: number;
  limitExceeded: boolean;
  poyaDay: boolean;
}

const RAW_WEEKS: Array<[number, boolean, boolean]> = [
  [180, false, false],
  [160, false, false],
  [190, false, false],
  [220, true, false],
  [175, false, false],
  [185, false, false],
  [240, true, true],
  [195, false, false],
  [180, false, false],
  [170, false, false],
];

export const CAPACITY_FORECAST: CapacityWeek[] = RAW_WEEKS.map(([demand, limitExceeded, poyaDay], idx) => ({
  week: idx + 1,
  label: poyaDay ? `Week ${idx + 1} (Poya Festival)` : `Week ${idx + 1}`,
  totalDemandM3: demand,
  chilledDemandM3: 0,
  availableCapacityM3: 200,
  limitExceeded,
  poyaDay,
}));

export function capacityPressure(week: CapacityWeek): 'Normal' | 'Elevated' | 'High Pressure' {
  const ratio = week.totalDemandM3 / week.availableCapacityM3;
  if (ratio > 1) return week.poyaDay ? 'High Pressure' : 'Elevated';
  if (ratio >= 0.9) return 'Elevated';
  return 'Normal';
}
