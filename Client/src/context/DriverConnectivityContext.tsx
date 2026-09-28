"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getPendingDeliveryRecords,
  syncAllPendingDeliveryRecords,
} from "@/lib/driver/driver-offline-db";

export type ConnectionState = "online" | "offline" | "syncing" | "synced";

interface DriverConnectivityContextType {
  isOnline: boolean;
  connectionState: ConnectionState;
  pendingCount: number;
  lastSyncedTime: string;
  syncNow: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
}

const DriverConnectivityContext = createContext<DriverConnectivityContextType | null>(null);

export function DriverConnectivityProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>("online");
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>("10:42 AM");

  const refreshPendingCount = useCallback(async () => {
    try {
      const pending = await getPendingDeliveryRecords();
      setPendingCount(pending.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  // Perform synchronization
  const triggerSync = useCallback(async () => {
    setConnectionState("syncing");
    try {
      const result = await syncAllPendingDeliveryRecords();
      setLastSyncedTime(result.syncedTimeStr);
      await refreshPendingCount();
      setConnectionState("synced");

      // Auto-transition back to online state after 3.5 seconds of showing Synced confirmation
      setTimeout(() => {
        setConnectionState((prev) => (prev === "synced" ? "online" : prev));
      }, 3500);
    } catch (err) {
      console.error("Auto sync failed:", err);
      setConnectionState("online");
    }
  }, [refreshPendingCount]);

  const syncNow = useCallback(async () => {
    await triggerSync();
  }, [triggerSync]);

  useEffect(() => {
    // Initial client check
    if (typeof window !== "undefined") {
      const online = navigator.onLine;
      setIsOnline(online);
      setConnectionState(online ? "online" : "offline");
      refreshPendingCount();

      const handleOnline = async () => {
        setIsOnline(true);
        const pending = await getPendingDeliveryRecords();
        setPendingCount(pending.length);

        if (pending.length > 0) {
          // Required flow: Connection Returns -> Syncing -> Synced -> Online
          await triggerSync();
        } else {
          setConnectionState("online");
        }
      };

      const handleOffline = () => {
        // Required flow: Online -> Connection Lost -> Offline
        setIsOnline(false);
        setConnectionState("offline");
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, [refreshPendingCount, triggerSync]);

  return (
    <DriverConnectivityContext.Provider
      value={{
        isOnline,
        connectionState,
        pendingCount,
        lastSyncedTime,
        syncNow,
        refreshPendingCount,
      }}
    >
      {children}
    </DriverConnectivityContext.Provider>
  );
}

export function useConnectivity() {
  const context = useContext(DriverConnectivityContext);
  if (!context) {
    // Graceful fallback if used outside provider
    return {
      isOnline: true,
      connectionState: "online" as ConnectionState,
      pendingCount: 0,
      lastSyncedTime: "10:42 AM",
      syncNow: async () => {},
      refreshPendingCount: async () => {},
    };
  }
  return context;
}
