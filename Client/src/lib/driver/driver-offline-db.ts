/**
 * Driver Offline Storage & Synchronization via IndexedDB
 * 
 * Stores delivery records locally when the driver is offline.
 * Manages the lifecycle: Pending Sync -> Syncing -> Synced.
 * Structured for plug-and-play FastAPI integration.
 */

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

const DB_NAME = "RightGo_Driver_DB";
const DB_VERSION = 1;
const STORE_NAME = "delivery_records";

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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
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

/**
 * Save or update a delivery record locally
 */
export async function saveLocalDeliveryRecord(record: LocalDeliveryRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
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
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
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
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/**
 * Update the synchronization status of a specific record
 */
export async function updateRecordSyncStatus(
  id: string,
  status: "Pending Sync" | "Syncing" | "Synced",
  syncedAt?: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
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

/**
 * Backend Transmission Dispatcher.
 * 
 * Currently simulates the sync request with an asynchronous delay.
 * To integrate with FastAPI later, simply replace the fetch call below:
 * 
 * ```ts
 * const response = await fetch(`${API_BASE_URL}/api/v1/deliveries/sync`, {
 *   method: "POST",
 *   headers: { "Content-Type": "application/json" },
 *   body: JSON.stringify(record),
 * });
 * if (!response.ok) throw new Error("FastAPI sync failed");
 * return await response.json();
 * ```
 */
export async function transmitDeliveryRecordToBackend(
  record: LocalDeliveryRecord
): Promise<{ success: boolean; remoteId?: string }> {
  // Simulate network transmission delay (700ms - 1100ms)
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Simulated FastAPI success response
  return {
    success: true,
    remoteId: `CLOUD-${record.id}`,
  };
}

/**
 * Synchronize all pending local records with the backend
 */
export async function syncAllPendingDeliveryRecords(): Promise<{
  success: boolean;
  syncedCount: number;
  syncedTimeStr: string;
}> {
  const pendingRecords = await getPendingDeliveryRecords();
  if (pendingRecords.length === 0) {
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return { success: true, syncedCount: 0, syncedTimeStr: nowTimeStr };
  }

  // 1. Mark records as Syncing
  for (const record of pendingRecords) {
    await updateRecordSyncStatus(record.id, "Syncing");
  }

  // 2. Transmit each record
  const syncedTimeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  let count = 0;

  for (const record of pendingRecords) {
    try {
      await transmitDeliveryRecordToBackend(record);
      await updateRecordSyncStatus(record.id, "Synced", new Date().toISOString());
      count++;
    } catch (err) {
      console.error(`Failed to sync record ${record.id}:`, err);
      // Revert back to Pending Sync on error
      await updateRecordSyncStatus(record.id, "Pending Sync");
    }
  }

  return {
    success: count > 0,
    syncedCount: count,
    syncedTimeStr,
  };
}
