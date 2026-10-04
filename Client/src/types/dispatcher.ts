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
  /** True once set by a manual dispatcher action (assign/defer/reorder/departure/fuel) -
   * the server preserves locked rows verbatim when "Suggest Plan" re-runs. */
  locked?: boolean;
}

export type DecisionLedgerAction = 'assigned' | 'deferred' | 'reassigned' | 'published' | 'resequenced';

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

/** Every C01-C17 checker rule this app evaluates — byte-for-byte parity with check_allocation.py. */
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

/**
 * App-only operational rules the booklet requires of the working system (p11-12)
 * but check_allocation.py does not evaluate (confirmed in docs/SOURCE_REQUIREMENTS.md's
 * "Not checked by C" list). These are real, partial checks — not decorative —
 * and can resolve to 'unverified' when an essential planning input (a trip's
 * planned departure time, a vehicle's confirmed prior weekly fuel usage) hasn't
 * been captured yet. 'unverified' blocks release exactly like 'checker_fail'
 * blocks it, until the dispatcher supplies the missing input.
 */
export type OperationalRuleCode = 'DELIVERY_WINDOW' | 'FUEL_QUOTA' | 'TRIP_OVERLAP';

/** Not modeled anywhere in this app — no driver roster and no defined fairness objective exist in any supplied source. Documented here for completeness, never rendered as a result. */
export type NotModeledCode = 'DRIVER_OVERLAP' | 'FAIRNESS_PRIORITY';

export type ResultKind = 'checker_pass' | 'checker_fail' | 'unverified';

/** group: which regime a result belongs to, so the UI can visually separate checker-parity results from app-only operational ones. */
export interface CheckerCheckResult {
  kind: ResultKind;
  group: 'checker' | 'operational';
  rule: CheckerRuleCode | OperationalRuleCode;
  label: string;
  detail: string;
  orderRef?: string;
  vehicleId?: string;
  tripNo?: 1 | 2;
}

export type ValidationResult = CheckerCheckResult;

export interface PassportResult {
  results: ValidationResult[];
  checkerFeasible: boolean; // true iff every group:'checker' row passed (C01-C17 only)
  operationalFeasible: boolean | null; // null whenever any row (checker or operational) is 'unverified' or 'checker_fail'; true only when every row passed
}

// --- Trip metadata (dispatcher-captured operational inputs) ----------------

/** Per (vehicleId, tripNo) dispatcher-entered planning inputs. Missing values are null, never a silent default — see docs/SOURCE_REQUIREMENTS.md. */
export interface TripMeta {
  plannedDepartureTime: string | null; // "HH:MM", Asia/Colombo, dispatcher-entered (Fresh trips are pre-filled with a suggested 03:30, editable)
  locked?: boolean;
}

/** Per-vehicle dispatcher-confirmed prior fuel usage. null = not yet confirmed (never defaulted to 0). */
export interface VehicleFuelInput {
  priorWeeklyFuelUsageL: number | null;
}

// --- Order intake validation (Orders page) ---------------------------------

export interface IntakeCheckResult {
  status: 'confirmed' | 'needs_correction';
  issues: string[];
}

// --- Manifest lifecycle (Plan Review / Live Operations) --------------------

export interface ManifestTripSnapshot {
  vehicleId: string;
  tripNo: 1 | 2;
  tripId?: string | null;
  brand?: string | null;
  district?: string | null;
  depot?: string | null;
  plannedDepartureTime?: string | null;
  leaveByTime?: string | null;
  stopOutletIds: string[]; // physical stop sequence at the moment of release
  orderRefs: string[];
  loadingStatus?: string | null; // planned, loading, ready, departed, completed
  otpUnlocked?: boolean;
}

export interface Manifest {
  id?: number;
  revision: number; // == the server's manifest `version` - the draftRevision that was live at publish time
  publishedAt: string; // HH:MM
  decisionMaker?: string;
  shortfallPolicy?: string;
  trips: ManifestTripSnapshot[];
  acknowledgement: 'pending' | 'acknowledged';
}

export interface ShortfallEvent {
  id: string;
  orderRef: string;
  outletId: string;
  reportedAt: string; // HH:MM, session-local clock
  manifestVersionAtReport: number | null; // stamped once, inside the reducer, at creation — never recomputed later
  resolution: 'replace' | 'defer' | null;
  resolvedNote: string | null;
}
