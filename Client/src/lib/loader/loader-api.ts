/**
 * RightGo Loader Portal API Client
 * Connects directly to the FastAPI server-authoritative backend, through the
 * shared authenticated client (attaches the bearer token from AuthContext).
 * Replaces the old direct-to-Supabase calls, which read/wrote tables the
 * FastAPI backend never touches.
 */

import { apiGet, apiPost } from "@/lib/api/client";

export interface ManifestTripSnapshot {
  id: number;
  vehicleId: string;
  tripNo: number;
  tripId?: string | null;
  brand?: string | null;
  district?: string | null;
  depot?: string | null;
  plannedDepartureTime?: string | null;
  leaveByTime?: string | null;
  stopOutletIds: string[];
  orderRefs: string[];
  loadingStatus: string;
  otpUnlocked: boolean;
  driverUsername?: string | null;
  driverName?: string | null;
}

export interface ManifestResponse {
  id: number;
  version: number;
  scenario: string;
  publishedAt: string;
  decisionMaker: string;
  shortfallPolicy: string;
  acknowledgement: string;
  trips: ManifestTripSnapshot[];
}

export interface LoadingSequenceOrder {
  orderRef: string;
  brand: string;
  tempRequirement: string;
  plannedUnits: number;
  loadedUnits: number;
  effectiveUnits: number;
  weightKg: number;
  volumeM3: number;
  isLoaded: boolean;
}

export interface LoadingSequenceStep {
  step: number;
  outletId: string;
  outletName: string;
  deliveryStopRank: number;
  weightKg: number;
  volumeM3: number;
  orders: LoadingSequenceOrder[];
  allOrdersLoaded: boolean;
}

export interface LoadingSequenceResponse {
  tripId: string;
  vehicleId: string;
  tripNo: number;
  manifestVersion: number;
  brand: string;
  district?: string | null;
  plannedDepartureTime?: string | null;
  leaveByTime?: string | null;
  loadingStatus: string;
  loadingSequence: LoadingSequenceStep[];
  loadedWeightKg: number;
  loadedVolumeM3: number;
  totalWeightKg: number;
  totalVolumeM3: number;
  vehicleWeightCapKg: number | null;
  vehicleVolumeCapM3: number | null;
}

export interface TripReadiness {
  tripId: string;
  vehicleId: string;
  tripNo: number;
  loadingStatus: string;
  totalOrders: number;
  loadedOrders: number;
  hasOpenIssues: boolean;
  isReady: boolean;
  leaveByTime?: string | null;
  otpCode?: string | null;
}

export interface LoadingIssue {
  id: string;
  manifest_version: number;
  vehicle_id: string;
  trip_no: number;
  order_ref: string;
  outlet_id: string;
  issue_type: string;
  units_affected: number;
  status: string;
  action_taken?: string | null;
  notes?: string | null;
  reported_at: string;
  reported_by: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
}

export async function fetchLatestManifest(scenario = "S1"): Promise<ManifestResponse | null> {
  return apiGet<ManifestResponse | null>("/manifests/latest", { scenario });
}

export async function fetchLoadingSequence(tripId: number): Promise<LoadingSequenceResponse> {
  return apiGet<LoadingSequenceResponse>(`/trips/${tripId}/loading-sequence`);
}

export async function postLoadOrder(tripId: number, orderRef: string, loadedUnits?: number) {
  return apiPost<{ success: boolean; orderRef: string; isLoaded: boolean; loadedUnits: number }>(
    `/trips/${tripId}/load-order`,
    { order_ref: orderRef, loaded_units: loadedUnits }
  );
}

export async function postDepartTrip(tripId: number) {
  return apiPost<{ success: boolean; tripId: string; status: string; departedAt: string | null }>(
    `/trips/${tripId}/depart`
  );
}

export async function postMarkTripReady(tripId: number) {
  return apiPost<{ success: boolean; tripId: string; status: string; isReady: boolean }>(
    `/trips/${tripId}/mark-ready`
  );
}

export async function fetchTripReadiness(tripId: number): Promise<TripReadiness> {
  return apiGet<TripReadiness>(`/trips/${tripId}/readiness`);
}

export async function fetchLoadingIssues(manifestVersion: number): Promise<LoadingIssue[]> {
  return apiGet<LoadingIssue[]>("/issues/loading", { manifest_version: manifestVersion });
}

export async function postLoadingIssue(payload: {
  manifest_version: number;
  vehicle_id: string;
  trip_no: number;
  order_ref: string;
  outlet_id: string;
  issue_type: string;
  units_affected?: number;
  notes?: string;
}): Promise<LoadingIssue> {
  return apiPost<LoadingIssue>("/issues/loading", payload);
}

export async function postLoadingIssueAction(
  issueId: string,
  action: string,
  notes?: string
): Promise<LoadingIssue> {
  return apiPost<LoadingIssue>(`/issues/loading/${issueId}/action`, { action, notes });
}

export async function postAckManifest(version: number): Promise<ManifestResponse> {
  return apiPost<ManifestResponse>(`/manifests/${version}/ack`);
}

export async function fetchFleet(scenario = "S1") {
  return apiGet<{ vehicle_id: string; type: string; temp: string; weight_cap_kg: number; volume_cap_m3: number }[]>(
    "/fleet",
    { scenario }
  );
}

export async function uploadLoadingIssueEvidence(dataPayload: string, identifier: string, filenameHint?: string) {
  return apiPost<{ storagePath: string; signedUrl?: string }>("/storage/upload", {
    bucket: "loading-issue-evidence",
    dataPayload,
    identifier,
    filenameHint,
  });
}
