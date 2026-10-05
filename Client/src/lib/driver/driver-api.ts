/**
 * RightGo Driver Portal API Client
 * Connects directly to the FastAPI server-authoritative backend, through the
 * shared authenticated client (attaches the bearer token from AuthContext).
 */

import type { LocalDeliveryRecord, IssueReportRecord } from "./driver-offline-db";
import { apiGet, apiPost, ApiError } from "@/lib/api/client";

export interface DriverRunStop {
  id: number;
  stopId: string;
  stopNumber: number;
  code: string;
  name: string;
  address: string;
  district: string;
  depot: string;
  dockType: string;
  parkingConstraint: string;
  mallWindow?: string | null;
  windowOpen: string;
  windowClose: string;
  timeWindow: string;
  managerName: string;
  managerPhone: string;
  latitude?: number | null;
  longitude?: number | null;
  isCompleted: boolean;
  outcome?: "full" | "discrepancy" | "none" | null;
  orders: string[];
  orderDetails?: { orderRef: string; units: number; plannedUnits: number; weightKg?: number; volumeM3?: number; tempRequirement?: string }[];
  loadingNotes?: { orderRef: string; issueType: string; unitsAffected: number; status: string; actionTaken?: string | null; plannedUnits?: number | null; effectiveUnits?: number | null }[];
  outlets: number;
  tempRequirement: string;
  units: number;
  weightKg: number;
  volumeM3: number;
}

export interface DriverRunResponse {
  hasRun: boolean;
  tripId: string;
  vehicleId: string;
  tripNo: number;
  brand: string;
  district: string;
  depot: string;
  manifestVersion: string;
  plannedDepartureTime?: string;
  isUnlocked: boolean;
  otpAttempts: number;
  loadingStatus: string;
  stops: DriverRunStop[];
  message?: string;
}

export interface OutletReference {
  outlet_id: string;
  name: string;
  brand: string;
  district: string;
  depot: string;
  dock_type: string;
  parking_constraint: string;
  mall_window?: string | null;
  window_open_time: string;
  window_close_time: string;
  address?: string;
  manager_name?: string;
  phone?: string;
  operating_days?: string;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Fetch assigned driver run manifest, stops, and unlock status - always for
 * the authenticated driver's own vehicle (the backend resolves this from the
 * bearer token, never from a client-supplied vehicle id). Throws ApiError on
 * failure rather than fabricating a fake run - callers must show an honest
 * error/offline state instead of a fake trip.
 */
export async function fetchDriverRun(): Promise<DriverRunResponse> {
  return apiGet<DriverRunResponse>("/driver/my-run");
}

/**
 * Verify cryptographic 6-digit OTP to unlock run
 */
export async function verifyDriverOtp(tripId: string, vehicleId: string, otpCode: string) {
  try {
    return await apiPost("/driver/otp/verify", { trip_id: tripId, vehicle_id: vehicleId, otp_code: otpCode });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message);
    throw err;
  }
}

/**
 * Record a completed delivery outcome with POD to FastAPI backend
 */
export async function postDriverDelivery(record: LocalDeliveryRecord) {
  return apiPost<{ success: boolean; deliveryId: string; status: string }>("/driver/deliveries", record);
}

/**
 * Fetch delivery history for the authenticated driver's own vehicle
 */
export async function fetchDriverHistory(): Promise<LocalDeliveryRecord[]> {
  try {
    return await apiGet<LocalDeliveryRecord[]>("/driver/history");
  } catch {
    return [];
  }
}

/**
 * Post an operational road / delivery issue report to FastAPI backend
 */
export async function postDriverIssue(report: IssueReportRecord) {
  return apiPost<{ success: boolean; issueId: string; status: string }>("/driver/issues", report);
}

/**
 * Fetch driver road issues history for the authenticated driver's own vehicle
 */
export async function fetchDriverIssuesHistory(): Promise<IssueReportRecord[]> {
  try {
    return await apiGet<IssueReportRecord[]>("/driver/issues/history");
  } catch {
    return [];
  }
}

/**
 * Fetch all registered retail outlets from reference dataset
 */
export async function fetchAllOutlets(): Promise<OutletReference[]> {
  try {
    return await apiGet<OutletReference[]>("/reference/outlets");
  } catch {
    return [];
  }
}

/**
 * Request a short-lived signed URL for a private Supabase Storage evidence path
 */
export async function fetchSignedUrl(storagePath: string): Promise<string | null> {
  if (!storagePath) return null;
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://") || storagePath.startsWith("data:")) {
    return storagePath;
  }
  try {
    const data = await apiGet<{ signedUrl?: string | null }>("/storage/signed-url", { path: storagePath });
    return data.signedUrl || null;
  } catch {
    return null;
  }
}

/**
 * Upload single evidence file/signature payload directly through FastAPI backend into Supabase Storage
 */
export async function uploadStorageEvidence(
  bucket: "pod-signatures" | "pod-photos" | "driver-issue-evidence" | "loading-issue-evidence",
  dataPayload: string,
  identifier: string,
  filenameHint?: string
): Promise<{ storagePath: string; signedUrl?: string }> {
  return apiPost("/storage/upload", { bucket, dataPayload, identifier, filenameHint });
}

