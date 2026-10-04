// Typed Dispatcher API functions backed by the real FastAPI backend. Replaces
// demoAdapter (a static in-memory dataset) as the Dispatcher module's data
// source. Field-name mapping lives here: a few backend schemas (orders,
// vehicles, service allowances, district travel) are snake_case on the wire
// while the rest of this app's types are camelCase (matching dataset column
// names); plan/manifest schemas are already camelCase on the wire and pass
// through unchanged.

import { apiGet, apiPost } from './client';
import type {
  S1Order, Vehicle, FleetStatus, ServiceAllowance, DistrictTravel,
  OrderAssignment, TripMeta, Manifest, DeferReasonCode,
} from '@/types/dispatcher';
import type { FleetVehicle } from '@/lib/dispatcher/validation';
import type { PassportResult } from '@/types/dispatcher';

// --- Wire shapes (snake_case, as FastAPI actually serializes them) --------

interface WireOrder {
  scenario: string; order_ref: string; outlet_id: string; brand: string; district: string; depot: string;
  dock_type: string; parking_constraint: string; mall_window: string | null; window_open_time: string;
  window_close_time: string; temp_requirement: string; order_units: number; order_weight_kg: number;
  order_volume_m3: number; deferred_yesterday: boolean; days_since_last_served: number; status: string;
  placed_by: string | null; notes: string | null; created_at: string | null; run_date: string | null;
}

interface WireVehicle {
  vehicle_id: string; type: string; temp: string; weight_cap_kg: number; volume_cap_m3: number;
  fuel_type: string; km_per_l: number; weekly_fuel_quota_l: number; depot: string; status?: string;
}

interface WireServiceAllowance { brand: string; dock_type: string; service_allowance_min: number }
interface WireDistrictTravel {
  district: string; depot: string; road_class: string; free_flow_kmh: number; depot_to_district_km: number;
  depot_to_district_freeflow_min: number; inter_stop_km: number; inter_stop_freeflow_min: number;
}

export interface DispatcherOrder extends S1Order {
  status: string;
  placedBy: string | null;
  notes: string | null;
  createdAt: string | null;
  runDate: string | null; // operating day this order is eligible for planning on (4PM Asia/Colombo cutoff); null = legacy/seed row
}

function mapOrder(w: WireOrder): DispatcherOrder {
  return {
    scenario: 'S1', orderRef: w.order_ref, outletId: w.outlet_id, brand: w.brand as S1Order['brand'],
    district: w.district, depot: w.depot, dockType: w.dock_type as S1Order['dockType'],
    parkingConstraint: w.parking_constraint as S1Order['parkingConstraint'], mallWindow: w.mall_window,
    windowOpenTime: w.window_open_time, windowCloseTime: w.window_close_time,
    tempRequirement: w.temp_requirement as S1Order['tempRequirement'], orderUnits: w.order_units,
    orderWeightKg: w.order_weight_kg, orderVolumeM3: w.order_volume_m3, deferredYesterday: w.deferred_yesterday,
    daysSinceLastServed: w.days_since_last_served, status: w.status, placedBy: w.placed_by, notes: w.notes,
    createdAt: w.created_at, runDate: w.run_date,
  };
}

function mapVehicle(w: WireVehicle): FleetVehicle {
  return {
    vehicleId: w.vehicle_id, type: w.type as Vehicle['type'], temp: w.temp as Vehicle['temp'],
    weightCapKg: w.weight_cap_kg, volumeCapM3: w.volume_cap_m3, fuelType: w.fuel_type, kmPerL: w.km_per_l,
    weeklyFuelQuotaL: w.weekly_fuel_quota_l, depot: w.depot,
    status: (w.status as FleetStatus['status']) ?? 'available',
  };
}

function mapAllowance(w: WireServiceAllowance): ServiceAllowance {
  return { brand: w.brand as ServiceAllowance['brand'], dockType: w.dock_type as ServiceAllowance['dockType'], serviceAllowanceMin: w.service_allowance_min };
}

function mapTravel(w: WireDistrictTravel): DistrictTravel {
  return {
    district: w.district, depot: w.depot, roadClass: w.road_class, freeFlowKmh: w.free_flow_kmh,
    depotToDistrictKm: w.depot_to_district_km, depotToDistrictFreeflowMin: w.depot_to_district_freeflow_min,
    interStopKm: w.inter_stop_km, interStopFreeflowMin: w.inter_stop_freeflow_min,
  };
}

// --- Reference data ---------------------------------------------------------

export const getOrders = (scenario = 'S1') => apiGet<WireOrder[]>('/orders', { scenario }).then((rows) => rows.map(mapOrder));
export const getFleetVehicles = (scenario = 'S1') => apiGet<WireVehicle[]>('/fleet', { scenario }).then((rows) => rows.map(mapVehicle));
export const getServiceAllowances = () => apiGet<WireServiceAllowance[]>('/reference/allowances').then((rows) => rows.map(mapAllowance));
export const getDistrictTravel = () => apiGet<WireDistrictTravel[]>('/reference/travel').then((rows) => rows.map(mapTravel));

export interface CreateOrderInput { outletId: string; brand: string; units: number; notes?: string }
export const createOrder = (input: CreateOrderInput) =>
  apiPost<WireOrder>('/orders', { outlet_id: input.outletId, brand: input.brand, units: input.units, notes: input.notes }).then(mapOrder);

export const cancelOrder = (orderRef: string, reason: string) =>
  apiPost<WireOrder>(`/orders/${orderRef}/cancel`, { reason }).then(mapOrder);

// --- Draft plan --------------------------------------------------------------

export interface DraftPlanResponse {
  scenario: string;
  draftRevision: number;
  assignments: Record<string, OrderAssignment>;
  stopSequences: Record<string, string[]>;
  stopSequenceLocks: Record<string, boolean>;
  tripMeta: Record<string, TripMeta>;
  vehicleFuelInputs: Record<string, number | null>;
  vehicleFuelLocks: Record<string, boolean>;
  counts: { total: number; served: number; deferred: number; unresolved: number };
}

export const getDraft = (scenario = 'S1') => apiGet<DraftPlanResponse>('/plan/draft', { scenario });

export const assignOrder = (orderRef: string, vehicleId: string, tripNo: 1 | 2, scenario = 'S1') =>
  apiPost<DraftPlanResponse>('/plan/assign', { order_ref: orderRef, vehicle_id: vehicleId, trip_no: tripNo }, { scenario });

export const reassignOrder = (orderRef: string, vehicleId: string, tripNo: 1 | 2, reasonNote: string, scenario = 'S1') =>
  apiPost<DraftPlanResponse>('/plan/reassign', { order_ref: orderRef, vehicle_id: vehicleId, trip_no: tripNo, reason_note: reasonNote }, { scenario });

export const deferOrder = (orderRef: string, reasonCode: DeferReasonCode, reasonNote: string, scenario = 'S1') =>
  apiPost<DraftPlanResponse>('/plan/defer', { order_ref: orderRef, reason_code: reasonCode, reason_note: reasonNote }, { scenario });

export const reorderTrip = (vehicleId: string, tripNo: 1 | 2, newOutletOrder: string[], scenario = 'S1') =>
  apiPost<DraftPlanResponse>('/plan/reorder', { vehicle_id: vehicleId, trip_no: tripNo, new_outlet_order: newOutletOrder }, { scenario });

export const setTripDeparture = (vehicleId: string, tripNo: 1 | 2, departureTime: string | null, scenario = 'S1') =>
  apiPost<DraftPlanResponse>('/plan/departure', { vehicle_id: vehicleId, trip_no: tripNo, departure_time: departureTime }, { scenario });

export const setVehicleFuelInput = (vehicleId: string, priorWeeklyFuelUsageL: number | null, scenario = 'S1') =>
  apiPost<DraftPlanResponse>('/plan/fuel-input', { vehicle_id: vehicleId, prior_weekly_fuel_usage_l: priorWeeklyFuelUsageL }, { scenario });

export const suggestPlan = (scenario = 'S1') => apiPost<DraftPlanResponse>('/plan/suggest', undefined, { scenario });

export interface ValidationChecklistRow { label: string; kind: 'checker_pass' | 'checker_fail' | 'unverified'; group: string; detail: string }
export interface ValidateResponse { checklist: ValidationChecklistRow[]; checkerFeasible: boolean; operationalFeasible: boolean | null }
export const validatePlan = (scenario = 'S1') => apiGet<ValidateResponse>('/plan/validate', { scenario });

export interface RankedCandidate {
  vehicle: FleetVehicle;
  tripNo: 1 | 2;
  passport: PassportResult;
  recommended: boolean;
  reasons: string[];
}
interface WireRankedCandidate extends Omit<RankedCandidate, 'vehicle'> { vehicle: WireVehicle }
export const getCandidates = (orderRef: string, scenario = 'S1') =>
  apiGet<WireRankedCandidate[]>(`/plan/candidates/${orderRef}`, { scenario }).then((rows) =>
    rows.map((r) => ({ ...r, vehicle: mapVehicle(r.vehicle) })));

export const publishPlan = (expectedRevision: number, scenario = 'S1', shortfallPolicy = 'ship_good_tell_store') =>
  apiPost<Manifest & { version: number }>('/plan/publish', { expected_revision: expectedRevision, shortfall_policy: shortfallPolicy }, { scenario })
    .then((m) => ({ ...m, revision: m.version }));

// --- Fleet status ------------------------------------------------------------

export const setVehicleStatus = (vehicleId: string, status: 'available' | 'in_workshop', scenario = 'S1') =>
  apiPost<{ success: boolean; vehicleId: string; status: string }>('/fleet/status', { scenario, vehicle_id: vehicleId, status });

// --- Manifests ----------------------------------------------------------------

export const getLatestManifest = (scenario = 'S1') =>
  apiGet<(Manifest & { version: number }) | null>('/manifests/latest', { scenario }).then((m) => (m ? { ...m, revision: m.version } : null));

export const listManifests = (scenario = 'S1') =>
  apiGet<(Manifest & { version: number })[]>('/manifests', { scenario }).then((rows) => rows.map((m) => ({ ...m, revision: m.version })));

export const acknowledgeManifest = (version: number) =>
  apiPost<Manifest & { version: number }>(`/manifests/${version}/ack`).then((m) => ({ ...m, revision: m.version }));

// --- Loading issues (Live Operations) -----------------------------------------

interface WireLoadingIssue {
  id: string; manifest_version: number; vehicle_id: string; trip_no: number; order_ref: string;
  outlet_id: string; issue_type: string; units_affected: number; status: string; action_taken: string | null;
  notes: string | null; reported_at: string; reported_by: string; resolved_at: string | null; resolved_by: string | null;
}

export interface LoadingIssue {
  id: string; manifestVersion: number; vehicleId: string; tripNo: number; orderRef: string; outletId: string;
  issueType: string; unitsAffected: number; status: string; actionTaken: string | null; notes: string | null;
  reportedAt: string; reportedBy: string; resolvedAt: string | null; resolvedBy: string | null;
}

function mapLoadingIssue(w: WireLoadingIssue): LoadingIssue {
  return {
    id: w.id, manifestVersion: w.manifest_version, vehicleId: w.vehicle_id, tripNo: w.trip_no, orderRef: w.order_ref,
    outletId: w.outlet_id, issueType: w.issue_type, unitsAffected: w.units_affected, status: w.status,
    actionTaken: w.action_taken, notes: w.notes, reportedAt: w.reported_at, reportedBy: w.reported_by,
    resolvedAt: w.resolved_at, resolvedBy: w.resolved_by,
  };
}

export const getLoadingIssues = (manifestVersion: number) =>
  apiGet<WireLoadingIssue[]>('/issues/loading', { manifest_version: manifestVersion }).then((rows) => rows.map(mapLoadingIssue));

export const resolveLoadingIssue = (issueId: string, action: 'replace_from_stock' | 'send_to_dispatcher' | 'apply_policy' | 'undo', notes?: string) =>
  apiPost<WireLoadingIssue>(`/issues/loading/${issueId}/action`, { action, notes }).then(mapLoadingIssue);

// --- Audit ledger (Reports / Decision history) ---------------------------------

interface WireLedgerEntry {
  id: string; orderRef: string; outletId: string; action: string; reasonCode: string | null; reasonNote: string | null;
  decisionMaker: string; time: string; previousAssignment: string; updatedAssignment: string; planVersion: number;
}
export type LedgerEntry = WireLedgerEntry; // already camelCase on the wire
export const getLedger = () => apiGet<LedgerEntry[]>('/ledger');

// --- Deliveries / Receipts (Reports) --------------------------------------------

interface WireDeliveryRecord { id: string; stopId: string; vehicleId: string; outcome: string; status: string }
export const getDeliveries = () => apiGet<WireDeliveryRecord[]>('/deliveries');

interface WireReceiptRecord {
  id: string; order_ref: string; outlet_id: string; confirmed_units: number; has_issue: boolean;
  issue_type: string | null; notes: string | null; confirmed_by: string; confirmed_at: string;
}
export interface ReceiptRecord {
  id: string; orderRef: string; outletId: string; confirmedUnits: number; hasIssue: boolean;
  issueType: string | null; notes: string | null; confirmedBy: string; confirmedAt: string;
}
function mapReceipt(w: WireReceiptRecord): ReceiptRecord {
  return {
    id: w.id, orderRef: w.order_ref, outletId: w.outlet_id, confirmedUnits: w.confirmed_units,
    hasIssue: w.has_issue, issueType: w.issue_type, notes: w.notes, confirmedBy: w.confirmed_by, confirmedAt: w.confirmed_at,
  };
}
export const getReceipts = () => apiGet<WireReceiptRecord[]>('/receipts').then((rows) => rows.map(mapReceipt));

