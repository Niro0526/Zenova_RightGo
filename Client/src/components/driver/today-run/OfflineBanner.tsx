"use client";

import { useConnectivity } from "@/context/DriverConnectivityContext";
import {
  AlertTriangleIcon,
  RefreshCwIcon,
  CheckCircleIcon,
} from "@/components/driver/today-run/icons";

export function OfflineBanner() {
  const { connectionState, pendingCount, lastSyncedTime } = useConnectivity();

  // In standard online state with no pending syncs, keep top area clean
  if (connectionState === "online" && pendingCount === 0) {
    return null;
  }

  return (
    <div className="hidden md:block w-full shrink-0 z-30 transition-all duration-300">
      {/* ── Offline Banner (Desktop only) ── */}
      {connectionState === "offline" && (
        <div
          id="driver-offline-banner"
          className="flex flex-row items-center justify-between px-6 py-2 bg-[#FFF4ED] border-b border-[#F97316]/30 text-[#EA580C] shadow-sm animate-in slide-in-from-top duration-200"
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#EA580C]" />
            </span>
            <span className="font-bold uppercase tracking-wider text-[11px] bg-orange-100 text-[#EA580C] px-2 py-0.5 rounded border border-orange-300">
              Offline Mode
            </span>
            <span className="text-[#9A3412]">
              Internet connection lost. Deliveries will continue normally and save locally to this device.
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold shrink-0">
            <span className="bg-white/80 border border-orange-300 text-[#EA580C] px-2.5 py-1 rounded-full">
              {pendingCount > 0 ? `${pendingCount} Pending Sync` : "Local Storage Active"}
            </span>
          </div>
        </div>
      )}

      {/* ── Syncing Banner ── */}
      {connectionState === "syncing" && (
        <div
          id="driver-syncing-banner"
          className="flex items-center justify-between px-4 py-2.5 bg-[#EFF6FF] border-b border-[#3B82F6]/40 text-[#1D4ED8] gap-2 shadow-sm animate-in slide-in-from-top duration-200"
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            <RefreshCwIcon className="w-4 h-4 text-[#1D4ED8] animate-spin shrink-0" />
            <span className="font-bold uppercase tracking-wider text-[11px] bg-blue-100 text-[#1D4ED8] px-2 py-0.5 rounded border border-blue-300">
              Syncing...
            </span>
            <span className="text-blue-900">
              Connection restored. Synchronizing {pendingCount > 0 ? `${pendingCount} delivery record(s)` : "records"} with the cloud...
            </span>
          </div>

          <span className="text-xs font-bold bg-white text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full shrink-0">
            FastAPI Dispatch
          </span>
        </div>
      )}

      {/* ── Synced Banner ── */}
      {connectionState === "synced" && (
        <div
          id="driver-synced-banner"
          className="flex items-center justify-between px-4 py-2.5 bg-[#ECFDF5] border-b border-[#22C55E]/40 text-[#15803D] gap-2 shadow-sm animate-in slide-in-from-top duration-200"
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            <CheckCircleIcon className="w-4 h-4 text-[#15803D] shrink-0" />
            <span className="font-bold uppercase tracking-wider text-[11px] bg-green-100 text-[#15803D] px-2 py-0.5 rounded border border-green-300">
              Synced
            </span>
            <span className="text-green-900">
              All delivery records verified and synchronized successfully.
            </span>
          </div>

          <span className="text-xs font-bold text-green-700 bg-white border border-green-200 px-2.5 py-1 rounded-full shrink-0">
            Confirmed at {lastSyncedTime}
          </span>
        </div>
      )}

      {/* ── Online with Pending Sync Notice (if browser reports online but sync hasn't run yet) ── */}
      {connectionState === "online" && pendingCount > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-amber-50 border-b border-amber-300 text-amber-800 text-xs font-medium">
          <span>{pendingCount} offline record(s) saved on this device.</span>
          <span className="font-bold text-amber-900">Pending Sync</span>
        </div>
      )}
    </div>
  );
}
