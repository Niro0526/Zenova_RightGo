/**
 * RightGo Driver Portal API Client
 * Connects directly to the FastAPI server-authoritative backend.
 */

import type { LocalDeliveryRecord, IssueReportRecord } from "./driver-offline-db";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
 * Fetch assigned driver run manifest, stops, and unlock status
 */
export async function fetchDriverRun(vehicleId: string = "PEL-R04"): Promise<DriverRunResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/driver/my-run?vehicle_id=${encodeURIComponent(vehicleId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch driver run: ${res.status} ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn("Backend fetchDriverRun failed, falling back to local dataset snapshot:", err);
    // Fallback baseline for offline preview
    return {
      hasRun: true,
      tripId: "S1-T001",
      vehicleId: "PEL-R04",
      tripNo: 1,
      brand: "Fresh",
      district: "Colombo",
      depot: "Peliyagoda",
      manifestVersion: "Plan v2",
      plannedDepartureTime: "04:30",
      isUnlocked: true,
      otpAttempts: 0,
      loadingStatus: "departed",
      stops: [
        {
          id: 1,
          stopId: "OUT001",
          stopNumber: 1,
          code: "OUT001",
          name: "OUT001 / Colombo Fresh Outlet",
          address: "No. 001 Commercial Ave, Colombo",
          district: "Colombo",
          depot: "Peliyagoda",
          dockType: "street",
          parkingConstraint: "van_only",
          windowOpen: "05:00",
          windowClose: "07:30",
          timeWindow: "05:00 – 07:30",
          managerName: "Manager OUT001",
          managerPhone: "+94 77 100001",
          isCompleted: false,
          outcome: null,
          orders: ["S1-000", "S1-001"],
          outlets: 1,
          tempRequirement: "ambient, chilled",
          units: 92,
          weightKg: 546.4,
          volumeM3: 2.945,
        },
        {
          id: 2,
          stopId: "OUT002",
          stopNumber: 2,
          code: "OUT002",
          name: "OUT002 / Colombo Fresh Outlet",
          address: "No. 002 Commercial Ave, Colombo",
          district: "Colombo",
          depot: "Peliyagoda",
          dockType: "street",
          parkingConstraint: "van_only",
          windowOpen: "05:30",
          windowClose: "08:00",
          timeWindow: "05:30 – 08:00",
          managerName: "Manager OUT002",
          managerPhone: "+94 77 100002",
          isCompleted: false,
          outcome: null,
          orders: ["S1-002", "S1-003"],
          outlets: 1,
          tempRequirement: "ambient, chilled",
          units: 56,
          weightKg: 459.9,
          volumeM3: 2.509,
        },
        {
          id: 3,
          stopId: "OUT003",
          stopNumber: 3,
          code: "OUT003",
          name: "OUT003 / Colombo Fresh Outlet",
          address: "No. 003 Commercial Ave, Colombo",
          district: "Colombo",
          depot: "Peliyagoda",
          dockType: "street",
          parkingConstraint: "van_only",
          windowOpen: "05:00",
          windowClose: "07:30",
          timeWindow: "05:00 – 07:30",
          managerName: "Manager OUT003",
          managerPhone: "+94 77 100003",
          isCompleted: false,
          outcome: null,
          orders: ["S1-004", "S1-005"],
          outlets: 1,
          tempRequirement: "ambient, chilled",
          units: 70,
          weightKg: 478.7,
          volumeM3: 2.595,
        },
        {
          id: 4,
          stopId: "OUT004",
          stopNumber: 4,
          code: "OUT004",
          name: "OUT004 / Colombo Fresh Outlet",
          address: "No. 004 Commercial Ave, Colombo",
          district: "Colombo",
          depot: "Peliyagoda",
          dockType: "street",
          parkingConstraint: "normal",
          windowOpen: "05:30",
          windowClose: "08:00",
          timeWindow: "05:30 – 08:00",
          managerName: "Manager OUT004",
          managerPhone: "+94 77 100004",
          isCompleted: false,
          outcome: null,
          orders: ["S1-006", "S1-007"],
          outlets: 1,
          tempRequirement: "ambient, chilled",
          units: 114,
          weightKg: 873.3,
          volumeM3: 4.611,
        },
      ],
    };
  }
}

/**
 * Verify cryptographic 6-digit OTP to unlock run
 */
export async function verifyDriverOtp(tripId: string, vehicleId: string, otpCode: string) {
  const res = await fetch(`${API_BASE_URL}/api/driver/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trip_id: tripId, vehicle_id: vehicleId, otp_code: otpCode }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "OTP verification failed" }));
    throw new Error(errorData.detail || "Invalid OTP code");
  }
  return await res.json();
}

/**
 * Record a completed delivery outcome with POD to FastAPI backend
 */
export async function postDriverDelivery(record: LocalDeliveryRecord) {
  const res = await fetch(`${API_BASE_URL}/api/driver/deliveries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    throw new Error(`Failed to post delivery record: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Fetch delivery history for vehicle
 */
export async function fetchDriverHistory(vehicleId: string = "PEL-R04"): Promise<LocalDeliveryRecord[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/driver/history?vehicle_id=${encodeURIComponent(vehicleId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}




/**
 * Post an operational road / delivery issue report to FastAPI backend
 */
export async function postDriverIssue(report: IssueReportRecord) {
  const res = await fetch(`${API_BASE_URL}/api/driver/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
  if (!res.ok) {
    throw new Error(`Failed to post issue report: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Fetch driver road issues history for vehicle
 */
export async function fetchDriverIssuesHistory(vehicleId: string = "PEL-R04"): Promise<IssueReportRecord[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/driver/issues/history?vehicle_id=${encodeURIComponent(vehicleId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/**
 * Fetch all registered retail outlets from reference dataset
 */
export async function fetchAllOutlets(): Promise<OutletReference[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/reference/outlets`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
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
    const res = await fetch(`${API_BASE_URL}/api/storage/signed-url?path=${encodeURIComponent(storagePath)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
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
  const res = await fetch(`${API_BASE_URL}/api/storage/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket,
      dataPayload,
      identifier,
      filenameHint,
    }),
  });
  if (!res.ok) {
    throw new Error(`Storage upload failed: ${res.statusText}`);
  }
  return await res.json();
}

