// Dispatcher domain types — field names/shapes follow the real Tech-Triathlon
// dataset columns (data/task2b_peak_day_scenarios.csv, data/vehicles.csv,
// data/task2b_peak_day_fleet.csv, data/service_allowance.csv,
// data/district_travel.csv), not an invented model.

export type Brand = 'Fresh' | 'Style' | 'Tech';
export type TempRequirement = 'ambient' | 'chilled';
export type DockType = 'street' | 'rear_dock' | 'mall_bay';
export type ParkingConstraint = 'normal' | 'van_only' | 'mall_dock';
export type VehicleType = 'truck' | 'van';
export type VehicleTemp = 'ambient' | 'reefer';
export type FleetStatusValue = 'available' | 'in_workshop';

/** One row of data/task2b_peak_day_scenarios.csv (S1 scenario, 85 rows). */
export interface S1Order {
  scenario: 'S1';
  orderRef: string; // "S1-000"
  outletId: string; // "OUT001" — the real schema has no outlet display name
  brand: Brand;
  district: string;
  depot: string; // always "Peliyagoda" for S1
  dockType: DockType;
  parkingConstraint: ParkingConstraint;
  mallWindow: string | null; // e.g. "10:00-12:00", null for most rows
  windowOpenTime: string;
  windowCloseTime: string;
  tempRequirement: TempRequirement;
  orderUnits: number;
  orderWeightKg: number;
  orderVolumeM3: number;
  deferredYesterday: boolean;
  daysSinceLastServed: number;
}

/** One row of data/vehicles.csv (60 vehicles total; only VEH001-038 are Peliyagoda/S1-relevant). */
export interface Vehicle {
  vehicleId: string;
  type: VehicleType;
  temp: VehicleTemp;
  weightCapKg: number;
  volumeCapM3: number;
  fuelType: string;
  kmPerL: number;
  weeklyFuelQuotaL: number;
  depot: string;
}

/** One row of data/task2b_peak_day_fleet.csv (38 rows for S1). */
export interface FleetStatus {
  scenario: 'S1';
  vehicleId: string;
  status: FleetStatusValue;
}

/** One row of data/service_allowance.csv (9 rows). */
export interface ServiceAllowance {
  brand: Brand;
  dockType: DockType;
  serviceAllowanceMin: number;
}

/** One row of data/district_travel.csv (12 rows). */
export interface DistrictTravel {
  district: string;
  depot: string;
  roadClass: string;
  freeFlowKmh: number;
  depotToDistrictKm: number;
  depotToDistrictFreeflowMin: number;
  interStopKm: number;
  interStopFreeflowMin: number;
}

// --- Planning / plan state -------------------------------------------------

export type OrderDecision = 'unresolved' | 'served' | 'deferred';

export type DeferReasonCode =
  | 'capacity'
  | 'vehicle_unavailable'
  | 'access_constraint'
  | 'outlet_closed'
  | 'time_budget'
  | 'other';

/** A trip is one (vehicle, trip_no) pair carrying zero or more orders. */
export interface Trip {
  vehicleId: string;
  tripNo: 1 | 2;
  orderRefs: string[]; // must share one brand + one district (C08)
}

export interface OrderAssignment {
  decision: OrderDecision;
  vehicleId: string | null;
  tripNo: 1 | 2 | null;
  reasonCode: DeferReasonCode | null;
  reasonNote: string | null;
}

export type DecisionLedgerAction = 'assigned' | 'deferred' | 'reassigned' | 'published';

export interface DecisionLedgerEntry {
  id: string;
  orderRef: string;
  outletId: string;
  action: DecisionLedgerAction;
  reasonCode: DeferReasonCode | null;
  reasonNote: string | null;
  decisionMaker: string;
  time: string; // HH:MM, session-local clock
  previousAssignment: string; // "-" or "VEHxxx · Trip n"
  updatedAssignment: string; // "-" or "VEHxxx · Trip n"
  planVersion: number;
}

// --- Validation --------------------------------------------------------

/** Every C01-C17 checker rule this app evaluates. */
export type CheckerRuleCode =
  | 'VEHICLE_UNAVAILABLE'
  | 'DEPOT_MISMATCH'
  | 'MIXED_BRAND'
  | 'MIXED_DISTRICT'
  | 'REEFER_REQUIRED'
  | 'VAN_ONLY'
  | 'WEIGHT_LIMIT'
  | 'VOLUME_LIMIT'
  | 'TRIP_LIMIT'
  | 'FRESH_BUDGET'
  | 'DAYTIME_BUDGET';

/** Things the supplied checker does not evaluate — never rendered as pass/fail. */
export type PolicyGapCode = 'DELIVERY_WINDOW' | 'FUEL_QUOTA' | 'DRIVER_OVERLAP' | 'FAIRNESS_PRIORITY';

export interface CheckerCheckResult {
  kind: 'checker_pass' | 'checker_fail';
  rule: CheckerRuleCode;
  label: string;
  detail: string;
  orderRef?: string;
  vehicleId?: string;
  tripNo?: 1 | 2;
}

export interface PolicyGapResult {
  kind: 'policy_gap';
  rule: PolicyGapCode;
  label: string;
  detail: string;
}

export type ValidationResult = CheckerCheckResult | PolicyGapResult;

export interface PassportResult {
  results: ValidationResult[];
  checkerFeasible: boolean; // true iff every checker_* row passed
  operationalFeasible: boolean | null; // null whenever a policy_gap is present
}
