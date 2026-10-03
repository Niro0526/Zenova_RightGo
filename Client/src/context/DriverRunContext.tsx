"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiGet } from "@/lib/api-client";

export interface DriverRunStop {
  stopId: string;
  stopNumber: number;
  name: string;
  address?: string;
  district?: string;
  dockType?: string;
  parkingConstraint?: string;
  windowOpen?: string;
  windowClose?: string;
  managerName?: string;
  managerPhone?: string;
  orderRefs?: string[];
  isCompleted: boolean;
  outcome?: string | null;
}

export interface DriverRunPayload {
  hasRun: boolean;
  message?: string;
  tripId?: string;
  vehicleId?: string;
  tripNo?: number;
  brand?: string;
  district?: string;
  manifestVersion?: number;
  plannedDepartureTime?: string;
  isUnlocked?: boolean;
  otpAttempts?: number;
  loadingStatus?: string;
  stops?: DriverRunStop[];
}

interface DriverRunContextValue {
  isMounted: boolean;
  loading: boolean;
  run: DriverRunPayload | null;
  stops: DriverRunStop[];
  currentStop: DriverRunStop | null;
  nextStop: DriverRunStop | null;
  completedCount: number;
  refreshRun: () => Promise<void>;
}

const DriverRunContext = createContext<DriverRunContextValue | null>(null);

const DEFAULT_DRIVER = "sunil";

export function DriverRunProvider({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState<DriverRunPayload | null>(null);

  const refreshRun = useCallback(async () => {
    if (typeof window === "undefined") return;
    setLoading(true);
    try {
      const data = await apiGet<DriverRunPayload>(
        `/driver/my-run?driver_id=${encodeURIComponent(DEFAULT_DRIVER)}`
      );
      setRun(data);
    } catch (err) {
      console.error("Failed to load driver run:", err);
      setRun({ hasRun: false, message: "Run unavailable" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    void refreshRun();
  }, [refreshRun]);

  useEffect(() => {
    const onRefresh = () => {
      void refreshRun();
    };
    window.addEventListener("driver-run-refresh", onRefresh);
    return () => window.removeEventListener("driver-run-refresh", onRefresh);
  }, [refreshRun]);

  const stops = useMemo(() => {
    const list = run?.stops ?? [];
    let seenNext = false;
    return list.map((stop) => {
      if (stop.isCompleted) return stop;
      if (!seenNext) {
        seenNext = true;
        return { ...stop, status: "next" as const };
      }
      return { ...stop, status: "upcoming" as const };
    });
  }, [run]);

  const currentStop = useMemo(
    () => stops.find((s) => !s.isCompleted) ?? null,
    [stops]
  );

  const nextStop = useMemo(() => {
    if (!currentStop) return null;
    const idx = stops.findIndex((s) => s.stopId === currentStop.stopId);
    if (idx >= 0 && idx + 1 < stops.length) return stops[idx + 1];
    return null;
  }, [stops, currentStop]);

  const completedCount = useMemo(
    () => stops.filter((s) => s.isCompleted).length,
    [stops]
  );

  const value: DriverRunContextValue = {
    isMounted,
    loading,
    run,
    stops,
    currentStop,
    nextStop,
    completedCount,
    refreshRun,
  };

  return (
    <DriverRunContext.Provider value={value}>{children}</DriverRunContext.Provider>
  );
}

export function useDriverRun(): DriverRunContextValue {
  const ctx = useContext(DriverRunContext);
  if (!ctx) {
    return {
      isMounted: false,
      loading: true,
      run: null,
      stops: [],
      currentStop: null,
      nextStop: null,
      completedCount: 0,
      refreshRun: async () => {},
    };
  }
  return ctx;
}
