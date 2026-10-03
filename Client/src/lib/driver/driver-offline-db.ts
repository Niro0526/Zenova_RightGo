/**
 * Driver Offline Storage & Synchronization via IndexedDB
 * 
 * Stores delivery records, POD info, and issue reports locally when the driver is offline.
 * Manages the lifecycle: Pending Sync -> Syncing -> Synced.
 * Automatically synchronizes with the backend API upon internet reconnection.
 */

import { apiPost } from "@/lib/api-client";

export interface LocalDeliveryRecord {
  id: string; // e.g. "DEL-S1-T001-001"
  stopId: string; // "OUT001"
  stopName: string; // "OUT001 / Colpetty Retailer"
  vehicleId: string; // "PEL-R04"
  outcome: "full" | "discrepancy" | "none";
  discrepancyDetails?: {
    type: string;
    expectedQty: number;
    deliveredQty: number;
    notes: string;
    photoName?: string;
  };
  notDeliveredDetails?: {
    reason: string;
    notes: string;
    photoName?: string;
  };
  podDetails?: {
    photoName?: string;
    signerName?: string;
    hasSignature?: boolean;
    hasPhoto?: boolean;
  };
  status: "Pending Sync" | "Syncing" | "Synced";
  offlineCreated: boolean;
  createdAt: string; // ISO string
  syncedAt?: string | null;
}

export interface IssueCategoryItem {
  id: string;
  label: string;
  icon: string;
}

export interface IssueReportRecord {
  id: string; // e.g. "REP-S1-T001-001"
  tripId: string; // "S1-T001"
  vehicleId: string; // "PEL-R04"
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
  status: "Pending Sync" | "Syncing" | "Synced";
  offlineCreated: boolean;
  createdAt: string; // ISO string
  syncedAt?: string | null;
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
      const request = statusIndex.getAll("Pending Sync");

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
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
  status: "Pending Sync" | "Syncing" | "Synced",
  syncedAt?: string
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
      const request = statusIndex.getAll("Pending Sync");

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    if (idbPending.length > 0) return idbPending;
  } catch {
    // Fallback to localStorage check
  }

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as IssueReportRecord[];
      return parsed.filter((r) => r.status === "Pending Sync");
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
  status: "Pending Sync" | "Syncing" | "Synced",
  syncedAt?: string
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

export interface DeliverySyncResult {
  success: boolean;
  remoteId?: string;
  tripStops?: Array<{
    id: number;
    trip_id: number;
    outlet_id: string;
    seq: number;
    delivery_status: string;
  }>;
  nextStop?: {
    id: number;
    trip_id: number;
    outlet_id: string;
    seq: number;
    delivery_status: string;
  } | null;
}

/**
 * Persist delivery record to FastAPI / Supabase.
 */
export async function transmitDeliveryRecordToBackend(
  record: LocalDeliveryRecord
): Promise<DeliverySyncResult> {
  const payload = {
    id: record.id,
    stopId: record.stopId,
    stopName: record.stopName,
    vehicleId: record.vehicleId,
    outcome: record.outcome,
    discrepancyDetails: record.discrepancyDetails,
    notDeliveredDetails: record.notDeliveredDetails,
    podDetails: record.podDetails,
    status: record.status,
    offlineCreated: record.offlineCreated,
    createdAt: record.createdAt,
    syncedAt: record.syncedAt,
  };
  const result = await apiPost<{
    success: boolean;
    deliveryId?: string;
    tripStops?: DeliverySyncResult["tripStops"];
    nextStop?: DeliverySyncResult["nextStop"];
  }>("/driver/deliveries", payload);

  return {
    success: Boolean(result.success),
    remoteId: result.deliveryId || record.id,
    tripStops: result.tripStops,
    nextStop: result.nextStop,
  };
}

/**
 * Persist driver issue report to FastAPI / Supabase.
 */
export async function transmitIssueReportToBackend(
  report: IssueReportRecord
): Promise<{ success: boolean; remoteId?: string }> {
  const result = await apiPost<{ success: boolean; issueId?: string }>(
    "/driver/issues",
    {
      id: report.id,
      tripId: report.tripId,
      vehicleId: report.vehicleId,
      categoryId: report.categoryId,
      categoryLabel: report.categoryLabel,
      categoryIcon: report.categoryIcon,
      categories: report.categories,
      relatedScope: report.relatedScope,
      orderId: report.orderId,
      stopCode: report.stopCode,
      outletName: report.outletName,
      description: report.description,
      photo: report.photo,
      status: report.status,
      offlineCreated: report.offlineCreated,
      createdAt: report.createdAt,
      syncedAt: report.syncedAt,
    }
  );
  return {
    success: Boolean(result.success),
    remoteId: result.issueId || report.id,
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

  return {
    deliveriesCount: pendingDeliveries.length,
    reportsCount: pendingReports.length,
    totalPending: pendingDeliveries.length + pendingReports.length,
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
  const [pendingDeliveries, pendingReports] = await Promise.all([
    getPendingDeliveryRecords(),
    getPendingIssueReports(),
  ]);

  const totalPending = pendingDeliveries.length + pendingReports.length;
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

  // 1. Mark records as Syncing
  for (const del of pendingDeliveries) {
    await updateRecordSyncStatus(del.id, "Syncing");
  }
  for (const rep of pendingReports) {
    await updateIssueReportSyncStatus(rep.id, "Syncing");
  }

  let syncedDeliveries = 0;
  let syncedReports = 0;
  const syncTimestamp = new Date().toISOString();

  // 2. Transmit delivery records
  for (const del of pendingDeliveries) {
    try {
      await transmitDeliveryRecordToBackend(del);
      await updateRecordSyncStatus(del.id, "Synced", syncTimestamp);
      syncedDeliveries++;
    } catch (err) {
      console.error(`Failed to sync delivery record ${del.id}:`, err);
      await updateRecordSyncStatus(del.id, "Pending Sync");
    }
  }

  // 3. Transmit issue reports
  for (const rep of pendingReports) {
    try {
      await transmitIssueReportToBackend(rep);
      await updateIssueReportSyncStatus(rep.id, "Synced", syncTimestamp);
      syncedReports++;
    } catch (err) {
      console.error(`Failed to sync issue report ${rep.id}:`, err);
      await updateIssueReportSyncStatus(rep.id, "Pending Sync");
    }
  }

  const totalSynced = syncedDeliveries + syncedReports;

  if (typeof window !== "undefined" && totalSynced > 0) {
    window.dispatchEvent(new Event("driver-run-refresh"));
  }

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
