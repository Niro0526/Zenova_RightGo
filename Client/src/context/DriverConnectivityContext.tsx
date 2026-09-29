"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getAllPendingCount,
  syncAllPendingOfflineData,
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
      const { totalPending } = await getAllPendingCount();
      setPendingCount(totalPending);
    } catch {
      setPendingCount(0);
    }
  }, []);

  // Perform automatic or manual synchronization
  const triggerSync = useCallback(async () => {
    setConnectionState("syncing");
    try {
      const result = await syncAllPendingOfflineData();
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

      // Trigger automatic sync whenever connection is restored
      const handleOnline = async () => {
        setIsOnline(true);
        const { totalPending } = await getAllPendingCount();
        setPendingCount(totalPending);

        if (totalPending > 0) {
          // Flow: Connection Restored -> Syncing -> Synced -> Online
          await triggerSync();
        } else {
          setConnectionState("online");
        }
      };

      // Handle offline connection loss
      const handleOffline = () => {
        setIsOnline(false);
        setConnectionState("offline");
      };

      // Periodic check when tab gains focus or on interval if pending records exist
      const handleFocus = async () => {
        if (navigator.onLine) {
          const { totalPending } = await getAllPendingCount();
          setPendingCount(totalPending);
          if (totalPending > 0 && connectionState !== "syncing") {
            await triggerSync();
          }
        }
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      window.addEventListener("focus", handleFocus);

      // Auto-heartbeat sync check every 15 seconds if there are pending offline records and online
      const interval = setInterval(async () => {
        if (navigator.onLine) {
          const { totalPending } = await getAllPendingCount();
          if (totalPending > 0 && connectionState === "online") {
            await triggerSync();
          }
        }
      }, 15000);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("focus", handleFocus);
        clearInterval(interval);
      };
    }
  }, [refreshPendingCount, triggerSync, connectionState]);

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
