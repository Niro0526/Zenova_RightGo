/**
 * Driver Offline Storage & Synchronization via IndexedDB
 * 
 * Stores delivery records, POD info, and issue reports locally when the driver is offline.
 * Manages the lifecycle: Pending Sync -> Syncing -> Synced.
 * Automatically synchronizes with the backend API upon internet reconnection.
 */

export type SyncStatus = "Pending Sync" | "Syncing" | "Synced" | "Rejected";

/** Failure bookkeeping stored on a record by the sync loop. */
export interface SyncMeta {
  syncError?: string | null;
  syncCode?: string | null;
  syncAttempts?: number;
  nextRetryAt?: string | null;
}

export interface LocalDeliveryRecord {
  id: string; // e.g. "DEL-S1-T001-001"
  stopId: string; // "OUT001"
  stopName: string; // "OUT001 / Colpetty Retailer"
  vehicleId: string; // the authenticated driver's own assigned vehicle, e.g. "VEH036"
  outcome: "full" | "discrepancy" | "none";
  discrepancyDetails?: {
    type: string;
    expectedQty: number;
    deliveredQty: number;
    notes: string;
    photoName?: string;
    photoUrl?: string;
  };
  notDeliveredDetails?: {
    reason: string;
    notes: string;
    photoName?: string;
    photoUrl?: string;
  };
  podDetails?: {
    photoName?: string;
    photoUrl?: string;
    signerName?: string;
    signatureUrl?: string;
    hasSignature?: boolean;
    hasPhoto?: boolean;
  };
  /** Pending Sync = will be retried; Rejected = the server will never accept it (kept for review, never auto-retried). */
  status: SyncStatus;
  offlineCreated: boolean;
  createdAt: string; // ISO string
  syncedAt?: string | null;
  tripId?: string | null;
  /** ISO time of the driver's manual Confirm Arrival, carried so an offline delivery is self-contained. */
  arrivedAt?: string | null;
  syncError?: string | null;
  syncCode?: string | null;
  syncAttempts?: number;
  nextRetryAt?: string | null;
}

export interface IssueCategoryItem {
  id: string;
  label: string;
  icon: string;
}

export interface IssueReportRecord {
  id: string; // e.g. "REP-S1-T001-001"
  tripId: string; // "S1-T001"
  vehicleId: string; // the authenticated driver's own assigned vehicle, e.g. "VEH036"
  categoryId: string;
  categoryLabel: string;
  categoryIcon: string;
  categories?: IssueCategoryItem[];
  relatedScope: string;
  orderId?: string;
  stopCode?: string;
  outletName: string;
  description: string;
  photo?: {
    name: string;
    url: string;
  } | null;
  status: SyncStatus;
  offlineCreated: boolean;
  createdAt: string; // ISO string
  syncedAt?: string | null;
  syncError?: string | null;
  syncCode?: string | null;
  syncAttempts?: number;
  nextRetryAt?: string | null;

}

const DB_NAME = "RightGo_Driver_DB";
const DB_VERSION = 2;
const DELIVERY_STORE = "delivery_records";
const ISSUE_REPORT_STORE = "issue_reports";
const LOCAL_STORAGE_REPORTS_KEY = "RightGo_Driver_Issue_Reports";

/**
 * Open or upgrade the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store 1: Delivery Records & POD
      if (!db.objectStoreNames.contains(DELIVERY_STORE)) {
        const delStore = db.createObjectStore(DELIVERY_STORE, { keyPath: "id" });
        delStore.createIndex("status", "status", { unique: false });
        delStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Store 2: Issue Reports
      if (!db.objectStoreNames.contains(ISSUE_REPORT_STORE)) {
        const repStore = db.createObjectStore(ISSUE_REPORT_STORE, { keyPath: "id" });
        repStore.createIndex("status", "status", { unique: false });
        repStore.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB"));
    };
  });
}

/* ─────────────────────────────────────────────────────────────
   1. DELIVERY RECORDS & PROOF OF DELIVERY
   ───────────────────────────────────────────────────────────── */

/**
 * Save or update a delivery record locally in IndexedDB
 */
export async function saveLocalDeliveryRecord(record: LocalDeliveryRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DELIVERY_STORE], "readwrite");
    const store = transaction.objectStore(DELIVERY_STORE);
    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all delivery records pending synchronization
 */
export async function getPendingDeliveryRecords(): Promise<LocalDeliveryRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DELIVERY_STORE], "readonly");
      const store = transaction.objectStore(DELIVERY_STORE);
      const statusIndex = store.index("status");
      const pendingReq = statusIndex.getAll("Pending Sync");
      // A record left "Syncing" by a reload/crash mid-transmit was never acknowledged
      // by the server - it must be retried, not stranded.
      const syncingReq = statusIndex.getAll("Syncing");

      transaction.oncomplete = () =>
        resolve(sortOldestFirst([...(pendingReq.result || []), ...(syncingReq.result || [])]));
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    return [];
  }
}

/** Queue order = the order the driver recorded things. */
function sortOldestFirst<T extends { createdAt?: string; id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ta = Date.parse(a.createdAt || "") || 0;
    const tb = Date.parse(b.createdAt || "") || 0;
    return ta - tb || a.id.localeCompare(b.id);
  });
}

/**
 * Get all delivery records stored locally
 */
export async function getAllLocalDeliveryRecords(): Promise<LocalDeliveryRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DELIVERY_STORE], "readonly");
      const store = transaction.objectStore(DELIVERY_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/**
 * Update the synchronization status of a specific delivery record
 */
export async function updateRecordSyncStatus(
  id: string,
  status: SyncStatus,
  syncedAt?: string,
  meta?: SyncMeta
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DELIVERY_STORE], "readwrite");
    const store = transaction.objectStore(DELIVERY_STORE);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const record = getRequest.result as LocalDeliveryRecord | undefined;
      if (record) {
        record.status = status;
        if (syncedAt !== undefined) {
          record.syncedAt = syncedAt;
        }
        if (meta) Object.assign(record, meta);
        if (status === "Synced") {
          record.syncError = null;
          record.syncCode = null;
          record.nextRetryAt = null;
        }
        const putRequest = store.put(record);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

/* ─────────────────────────────────────────────────────────────
   2. ISSUE REPORTS & INCIDENT LOGS
   ───────────────────────────────────────────────────────────── */

/**
 * Save or update an issue report locally in IndexedDB & localStorage
 */
export async function saveLocalIssueReport(report: IssueReportRecord): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([ISSUE_REPORT_STORE], "readwrite");
      const store = transaction.objectStore(ISSUE_REPORT_STORE);
      const request = store.put(report);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("IndexedDB issue save fallback to localStorage:", err);
  }

  // Backup to localStorage for cross-component instant reactivity
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
    let list: IssueReportRecord[] = stored ? JSON.parse(stored) : [];
    const idx = list.findIndex((r) => r.id === report.id);
    if (idx >= 0) {
      list[idx] = report;
    } else {
      list = [report, ...list];
    }
    localStorage.setItem(LOCAL_STORAGE_REPORTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to sync issue report to localStorage:", e);
  }
}

/**
 * Get all issue reports pending synchronization
 */
export async function getPendingIssueReports(): Promise<IssueReportRecord[]> {
  try {
    const db = await openDB();
    const idbPending = await new Promise<IssueReportRecord[]>((resolve, reject) => {
      const transaction = db.transaction([ISSUE_REPORT_STORE], "readonly");
      const store = transaction.objectStore(ISSUE_REPORT_STORE);
      const statusIndex = store.index("status");
      const pendingReq = statusIndex.getAll("Pending Sync");
      const syncingReq = statusIndex.getAll("Syncing");

      transaction.oncomplete = () =>
        resolve(sortOldestFirst([...(pendingReq.result || []), ...(syncingReq.result || [])]));
      transaction.onerror = () => reject(transaction.error);
    });

    if (idbPending.length > 0) return idbPending;
  } catch {
    // Fallback to localStorage check
  }

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as IssueReportRecord[];
      return sortOldestFirst(parsed.filter((r) => r.status === "Pending Sync" || r.status === "Syncing"));
    }
  } catch {
    // No storage
  }

  return [];
}

/**
 * Get all issue reports stored locally
 */
export async function getAllLocalIssueReports(): Promise<IssueReportRecord[]> {
  try {
    const db = await openDB();
    const records = await new Promise<IssueReportRecord[]>((resolve, reject) => {
      const transaction = db.transaction([ISSUE_REPORT_STORE], "readonly");
      const store = transaction.objectStore(ISSUE_REPORT_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    if (records.length > 0) return records;
  } catch {
    // Fallback
  }

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
    if (stored) {
      return JSON.parse(stored) as IssueReportRecord[];
    }
  } catch {
    // No storage
  }

  return [];
}

/**
 * Update the synchronization status of a specific issue report
 */
export async function updateIssueReportSyncStatus(
  id: string,
  status: SyncStatus,
  syncedAt?: string,
  meta?: SyncMeta
): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([ISSUE_REPORT_STORE], "readwrite");
      const store = transaction.objectStore(ISSUE_REPORT_STORE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const record = getRequest.result as IssueReportRecord | undefined;
        if (record) {
          record.status = status;
          if (syncedAt !== undefined) {
            record.syncedAt = syncedAt;
          }
          if (meta) Object.assign(record, meta);
          const putRequest = store.put(record);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch {
    // Fallback
  }

  // Update in localStorage
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
    if (stored) {
      const list = JSON.parse(stored) as IssueReportRecord[];
      const target = list.find((r) => r.id === id);
      if (target) {
        target.status = status;
        if (syncedAt !== undefined) {
          target.syncedAt = syncedAt;
        }
        if (meta) Object.assign(target, meta);
        localStorage.setItem(LOCAL_STORAGE_REPORTS_KEY, JSON.stringify(list));
      }
    }
  } catch {
    // Ignore
  }
}

/* ─────────────────────────────────────────────────────────────
   3. BACKEND API TRANSMISSION & DISPATCH ENGINE
   ───────────────────────────────────────────────────────────── */

import { postDriverDelivery, postDriverIssue, postDriverArrival } from "./driver-api";
import { ApiError, refusalInfo } from "@/lib/api/client";

/**
 * Why a send failed, and what the queue must do about it:
 *  - "transient": network down / 5xx / 408 / 429 / 401 - stop this pass (keep order), retry with backoff.
 *  - "retryable-refusal": the server understood but the run is not ready yet (not departed, locked, an earlier
 *    stop still queued) - keep the record Pending and retry later with backoff.
 *  - "permanent": the server will never accept it (stop already recorded, not on this run, bad quantity...)
 *    - mark it Rejected with the reason, keep all its data, and never auto-retry.
 */
type FailureKind = "transient" | "retryable-refusal" | "permanent";

function classifyFailure(err: unknown): { kind: FailureKind; message: string; code?: string } {
  if (!(err instanceof ApiError)) return { kind: "transient", message: err instanceof Error ? err.message : "Network error" };
  const { code, retryable } = refusalInfo(err);
  const s = err.status;
  if (s === 0 || s >= 500 || s === 408 || s === 429 || s === 401) return { kind: "transient", message: err.message, code };
  if (s >= 400 && s < 500) {
    // structured refusals say so explicitly; an unstructured 4xx (validation, role) will never succeed
    return { kind: retryable === true ? "retryable-refusal" : "permanent", message: err.message, code };
  }
  return { kind: "transient", message: err.message, code };
}

/** 15s, 30s, 60s ... capped at 5 minutes. */
function backoffMs(attempts: number): number {
  return Math.min(5 * 60_000, 15_000 * 2 ** Math.max(0, attempts - 1));
}

function isDue(r: { nextRetryAt?: string | null }): boolean {
  return !r.nextRetryAt || Date.parse(r.nextRetryAt) <= Date.now();
}

async function markFailure<T extends { id: string; syncAttempts?: number }>(
  record: T,
  failure: { kind: FailureKind; message: string; code?: string },
  setStatus: (id: string, status: SyncStatus, syncedAt?: string, meta?: SyncMeta) => Promise<void>
) {
  const attempts = (record.syncAttempts ?? 0) + 1;
  if (failure.kind === "permanent") {
    await setStatus(record.id, "Rejected", undefined, {
      syncError: failure.message, syncCode: failure.code ?? null, syncAttempts: attempts, nextRetryAt: null,
    });
  } else {
    await setStatus(record.id, "Pending Sync", undefined, {
      syncError: failure.message, syncCode: failure.code ?? null, syncAttempts: attempts,
      nextRetryAt: new Date(Date.now() + backoffMs(attempts)).toISOString(),
    });
  }
}

/** Put a Rejected record back in the queue (e.g. after the dispatcher fixed the underlying problem). */
export async function retryRejectedRecord(kind: "delivery" | "report", id: string): Promise<void> {
  const reset: SyncMeta = { syncError: null, syncCode: null, syncAttempts: 0, nextRetryAt: null };
  if (kind === "delivery") await updateRecordSyncStatus(id, "Pending Sync", undefined, reset);
  else await updateIssueReportSyncStatus(id, "Pending Sync", undefined, reset);
}

/* ── Manual arrival queue (small, localStorage): arrival confirmed while offline is kept and sent first ── */
const LOCAL_STORAGE_ARRIVALS_KEY = "RightGo_Driver_Arrivals";

export interface LocalArrival {
  id: string; // `${tripId}:${stopId}`
  tripId: string;
  stopId: string;
  arrivedAt: string; // ISO
  latitude?: number;
  longitude?: number;
  status: SyncStatus;
  syncError?: string | null;
  syncCode?: string | null;
  syncAttempts?: number;
  nextRetryAt?: string | null;
}

function readArrivals(): LocalArrival[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ARRIVALS_KEY);
    return raw ? (JSON.parse(raw) as LocalArrival[]) : [];
  } catch {
    return [];
  }
}

function writeArrivals(list: LocalArrival[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_ARRIVALS_KEY, JSON.stringify(list));
  } catch {
    // storage unavailable: the arrival still travels inside the delivery record
  }
}

export function getLocalArrivals(): LocalArrival[] {
  return readArrivals();
}

export function queueLocalArrival(a: Omit<LocalArrival, "id" | "status">): LocalArrival {
  const entry: LocalArrival = { ...a, id: `${a.tripId}:${a.stopId}`, status: "Pending Sync" };
  const list = readArrivals().filter((x) => x.id !== entry.id);
  list.push(entry);
  writeArrivals(list);
  return entry;
}

function removeLocalArrival(id: string) {
  writeArrivals(readArrivals().filter((x) => x.id !== id));
}

function patchLocalArrival(id: string, patch: Partial<LocalArrival>) {
  writeArrivals(readArrivals().map((x) => (x.id === id ? { ...x, ...patch } : x)));
}

let syncInFlight: ReturnType<typeof runSync> | null = null;

/**
 * Backend Transmission Dispatcher for Delivery Records.
 * Sends real delivery record & POD directly to FastAPI backend.
 */
export async function transmitDeliveryRecordToBackend(
  record: LocalDeliveryRecord
): Promise<{ success: boolean; remoteId?: string }> {
  // Deliberately does not catch: a failed transmission must propagate to the
  // caller so the record stays "Pending Sync" instead of being marked
  // Synced when the backend never actually acknowledged it.
  const res = await postDriverDelivery(record);
  return {
    success: true,
    remoteId: res.deliveryId || `DEL-${record.id}`,
  };
}

/**
 * Backend Transmission Dispatcher for Issue Reports.
 * Sends driver road issue report directly to FastAPI backend.
 */
export async function transmitIssueReportToBackend(
  report: IssueReportRecord
): Promise<{ success: boolean; remoteId?: string }> {
  // Deliberately does not catch: a failed transmission must propagate to the
  // caller so the report stays "Pending Sync" instead of being marked
  // Synced when the backend never actually acknowledged it.
  const res = await postDriverIssue(report);
  return {
    success: true,
    remoteId: res.issueId || `REP-${report.id}`,
  };
}

/**
 * Query total pending items across all offline domains
 */
export async function getAllPendingCount(): Promise<{
  deliveriesCount: number;
  reportsCount: number;
  totalPending: number;
}> {
  const [pendingDeliveries, pendingReports] = await Promise.all([
    getPendingDeliveryRecords(),
    getPendingIssueReports(),
  ]);
  const pendingArrivals = readArrivals().filter((a) => a.status === "Pending Sync").length;

  return {
    deliveriesCount: pendingDeliveries.length,
    reportsCount: pendingReports.length,
    totalPending: pendingDeliveries.length + pendingReports.length + pendingArrivals,
  };
}

/**
 * Synchronize all pending local delivery records & issue reports with the backend
 */
export async function syncAllPendingOfflineData(): Promise<{
  success: boolean;
  syncedDeliveries: number;
  syncedReports: number;
  totalSynced: number;
  syncedTimeStr: string;
}> {
  // One sync pass at a time (interval + "online" event + manual retry must not race
  // and double-send the same queue).
  if (syncInFlight) return syncInFlight;
  syncInFlight = runSync().finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

async function runSync(): Promise<{
  success: boolean;
  syncedDeliveries: number;
  syncedReports: number;
  totalSynced: number;
  syncedTimeStr: string;
}> {
  const [allPendingDeliveries, allPendingReports] = await Promise.all([
    getPendingDeliveryRecords(),
    getPendingIssueReports(),
  ]);
  // Records still inside their backoff window wait; everything else is due now.
  const pendingDeliveries = allPendingDeliveries.filter(isDue);
  const pendingReports = allPendingReports.filter(isDue);
  const pendingArrivals = readArrivals()
    .filter((a) => a.status === "Pending Sync" && isDue(a))
    .sort((a, b) => Date.parse(a.arrivedAt) - Date.parse(b.arrivedAt));

  const totalPending = pendingDeliveries.length + pendingReports.length + pendingArrivals.length;
  const nowTimeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (totalPending === 0) {
    return {
      success: true,
      syncedDeliveries: 0,
      syncedReports: 0,
      totalSynced: 0,
      syncedTimeStr: nowTimeStr,
    };
  }

  let syncedDeliveries = 0;
  let syncedReports = 0;
  const syncTimestamp = new Date().toISOString();
  let stopPass = false;

  // 1. Manual arrivals first (they gate the delivery of the same stop)
  for (const arr of pendingArrivals) {
    try {
      await postDriverArrival({ tripId: arr.tripId, stopId: arr.stopId, arrivedAt: arr.arrivedAt, latitude: arr.latitude, longitude: arr.longitude });
      removeLocalArrival(arr.id);
    } catch (err) {
      const failure = classifyFailure(err);
      const attempts = (arr.syncAttempts ?? 0) + 1;
      patchLocalArrival(arr.id, failure.kind === "permanent"
        ? { status: "Rejected", syncError: failure.message, syncCode: failure.code ?? null, syncAttempts: attempts, nextRetryAt: null }
        : { syncError: failure.message, syncCode: failure.code ?? null, syncAttempts: attempts, nextRetryAt: new Date(Date.now() + backoffMs(attempts)).toISOString() });
      if (failure.kind === "transient") { stopPass = true; break; }
    }
  }

  // 2. Transmit delivery records strictly in recorded order. A record is only marked Synced
  //    after the server acknowledged it; on a transient failure we stop, so later records
  //    are never delivered ahead of an earlier one.
  for (const del of stopPass ? [] : pendingDeliveries) {
    await updateRecordSyncStatus(del.id, "Syncing");
    try {
      await transmitDeliveryRecordToBackend(del);
      await updateRecordSyncStatus(del.id, "Synced", syncTimestamp);
      syncedDeliveries++;
    } catch (err) {
      const failure = classifyFailure(err);
      console.error(`Failed to sync delivery record ${del.id} (${failure.kind}):`, failure.message);
      await markFailure(del, failure, updateRecordSyncStatus);
      if (failure.kind === "transient") { stopPass = true; break; }
    }
  }

  // 3. Transmit issue reports (same rules)
  for (const rep of stopPass ? [] : pendingReports) {
    await updateIssueReportSyncStatus(rep.id, "Syncing");
    try {
      await transmitIssueReportToBackend(rep);
      await updateIssueReportSyncStatus(rep.id, "Synced", syncTimestamp);
      syncedReports++;
    } catch (err) {
      const failure = classifyFailure(err);
      console.error(`Failed to sync issue report ${rep.id} (${failure.kind}):`, failure.message);
      await markFailure(rep, failure, updateIssueReportSyncStatus);
      if (failure.kind === "transient") break;
    }
  }

  const totalSynced = syncedDeliveries + syncedReports;

  return {
    success: totalSynced > 0,
    syncedDeliveries,
    syncedReports,
    totalSynced,
    syncedTimeStr: nowTimeStr,
  };
}

/**
 * Backwards-compatibility alias for delivery-specific sync
 */
export async function syncAllPendingDeliveryRecords() {
  return syncAllPendingOfflineData();
}
