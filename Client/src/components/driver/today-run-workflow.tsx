"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { STOPS } from "@/components/driver/today-run/types";
import {
  RouteIcon,
  ClockIcon,
  ExternalLinkIcon,
  NavigationIcon,
  CheckIcon,
  CheckCircleIcon,
  HistoryIcon,
  ArrowRightIcon,
  CalendarIcon,
  RefreshCwIcon,
} from "@/components/driver/today-run/icons";
import type { Stop, StopStatus } from "@/components/driver/today-run/types";
import ScreenHeader from "@/components/driver/today-run/ScreenHeader";
import TripInfoCard from "@/components/driver/today-run/TripInfoCard";
import ProgressBox from "@/components/driver/today-run/ProgressBox";
import NextStopCard from "@/components/driver/today-run/NextStopCard";
import StopsDirectory from "@/components/driver/today-run/StopsDirectory";
import BottomNav from "@/components/driver/today-run/BottomNav";
import { useConnectivity } from "@/context/DriverConnectivityContext";
import { useAuth } from "@/context/AuthContext";
import {
  getAllLocalDeliveryRecords,
  type LocalDeliveryRecord,
} from "@/lib/driver/driver-offline-db";
import { CompletedDeliveryModal } from "@/components/driver/today-run/CompletedDeliveryModal";
import { fetchDriverRun, type DriverRunResponse } from "@/lib/driver/driver-api";
import { TodayRunMobileView } from "@/components/driver/today-run/TodayRunMobileView";

/* ─── Reusable sub-pieces (fluid, no absolute positioning) ─── */

export function TripInfoBanner({
  vehicleId,
  tripPlanId,
  planVersion,
  brand,
  district,
}: {
  vehicleId: string;
  tripPlanId: string;
  planVersion: string;
  brand?: string;
  district?: string;
}) {
  return (
    <div className="flex flex-row justify-between items-center bg-white border border-[#CBD5E1] rounded-xl px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[#485563] font-semibold text-[11px] uppercase tracking-wider">
          Current Vehicle
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[#202D2D] font-bold text-[18px] leading-[27px]">
            {vehicleId}
          </span>
          {brand && (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
              {brand}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-[#485563] font-semibold text-[11px] uppercase tracking-wider">
          Trip Plan
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[#202D2D] font-bold text-[16px]">{tripPlanId}</span>
          <span className="bg-[#F9FAFB] rounded px-1.5 py-0.5 text-[#485563] font-semibold text-[11px]">
            {planVersion}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProgressBanner({
  completedCount,
  totalCount,
}: {
  completedCount: number;
  totalCount: number;
}) {
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-[#202D2D] font-bold text-[14px]">
          {completedCount} of {totalCount} stops completed · {pct}%
        </span>
        <span className="text-[#485563] font-semibold text-[14px]">{pct}%</span>
      </div>
      <div
        className="w-full h-2 bg-[#F9FAFB] rounded overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-[#F97316] rounded transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function NextStopBanner({ stop }: { stop: Stop }) {
  return (
    <div className="flex flex-col gap-3 bg-white border-2 border-[#F97316] rounded-2xl p-5 shadow-sm">
      {/* Badge row */}
      <div className="flex justify-between items-center">
        <span className="inline-flex items-center px-2 py-1 bg-[#22C55E] rounded-md text-white font-bold text-[11px]">
          NEXT STOP
        </span>
        <span className="text-[#485563] font-semibold text-[13px]">Stop {stop.id}</span>
      </div>

      {/* Name + window */}
      <div className="flex flex-col gap-1">
        <span className="text-[#202D2D] font-bold text-[20px] leading-snug">
          {stop.code} / {stop.name}
        </span>
        <div className="flex items-center gap-1.5">
          <ClockIcon className="w-[14px] h-[14px] text-[#485563] shrink-0" />
          <span className="text-[#485563] font-semibold text-[13px]">
            Window: {stop.timeWindow}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="flex gap-8 pt-3 border-t border-[#CBD5E1]">
        <div className="flex flex-col gap-0.5">
          <span className="text-[#485563] font-semibold text-[11px] uppercase tracking-wider">Orders</span>
          <span className="text-[#202D2D] font-bold text-[15px]">{stop.orders.join(", ")}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[#485563] font-semibold text-[11px] uppercase tracking-wider">Demand</span>
          <span className="text-[#202D2D] font-bold text-[15px]">
            {stop.units ? `${stop.units} units (${stop.weightKg} kg)` : `${stop.outlets} outlet`}
          </span>
        </div>
      </div>

      {/* CTA */}
      <Link
        id="btn-open-next-stop"
        href={`/driver/current-stop?stopId=${encodeURIComponent(stop.code)}`}
        className="flex items-center justify-center gap-2 w-full py-3 bg-[#F97316] hover:bg-[#ea6c0a] active:scale-[0.98] rounded-xl transition-all duration-200 border-none cursor-pointer no-underline shadow-sm"
      >
        <ExternalLinkIcon className="w-[18px] h-[18px] text-white" />
        <span className="text-white font-bold text-[15px]">Open Stop</span>
      </Link>
    </div>
  );
}

export function StopRow({
  stop,
  completedRecord,
  onViewRecord,
}: {
  stop: Stop;
  completedRecord?: LocalDeliveryRecord;
  onViewRecord?: (r: LocalDeliveryRecord) => void;
}) {
  const isCompleted = stop.status === "completed" || !!completedRecord;
  const isNext = stop.status === "next" && !isCompleted;

  return (
    <div
      id={`stop-card-${stop.id}`}
      role="listitem"
      className={`flex items-center justify-between p-3.5 bg-white border rounded-xl transition-all duration-200 hover:shadow-sm ${
        isCompleted
          ? "border-green-300 bg-green-50/20"
          : isNext
          ? "border-[#22C55E] bg-white ring-1 ring-[#22C55E]/20"
          : "border-[#CBD5E1]"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
            isCompleted
              ? "bg-[#ECFDF5] text-[#15803D] border border-green-300"
              : isNext
              ? "bg-[#E0F2FE] text-[#22C55E]"
              : "bg-[#F9FAFB]"
          }`}
        >
          {isCompleted ? (
            <CheckIcon className="w-4 h-4 text-[#15803D]" />
          ) : isNext ? (
            <NavigationIcon className="w-[14px] h-[14px] text-[#22C55E]" />
          ) : (
            <span className="w-[10px] h-[10px] rounded-full border-2 border-[#485563] box-border" />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`font-bold text-[14px] truncate ${
                isCompleted
                  ? "text-[#166534]"
                  : isNext
                  ? "text-[#202D2D]"
                  : "text-[#485563]"
              }`}
            >
              Stop {stop.id}: {stop.code} / {stop.name}
            </span>
            {isCompleted && (
              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded border border-green-300">
                Completed ✓
              </span>
            )}
            {isNext && (
              <span className="text-[10px] font-bold text-[#F97316] bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                Current Stop
              </span>
            )}
          </div>
          <span className="text-[#485563] font-medium text-[12px]">
            {stop.orders.length} {stop.orders.length === 1 ? "order" : "orders"}
            {stop.units ? ` · ${stop.units} units` : ""} • Window: {stop.timeWindow}
          </span>
        </div>
      </div>

      {/* Action / Details */}
      <div className="flex items-center gap-2 shrink-0">
        {isCompleted && completedRecord && onViewRecord ? (
          <button
            type="button"
            onClick={() => onViewRecord(completedRecord)}
            className="px-2.5 py-1 rounded-lg bg-white border border-green-300 text-[#15803D] hover:bg-green-50 text-xs font-bold transition-colors cursor-pointer"
          >
            View Record
          </button>
        ) : isNext ? (
          <Link
            href={`/driver/current-stop?stopId=${encodeURIComponent(stop.code)}`}
            className="px-3 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#ea6c0a] text-white text-xs font-bold transition-all no-underline shadow-sm"
          >
            Go to Stop →
          </Link>
        ) : (
          <span className="text-[11px] text-[#94A3B8] font-semibold">Queued</span>
        )}
      </div>
    </div>
  );
}

/* ─── Offline & Cloud Sync Status Banner Card ──────────────── */
export function DriverOfflineSyncNotice() {
  const { connectionState, pendingCount, lastSyncedTime } = useConnectivity();

  if (connectionState === "online" && pendingCount === 0) {
    return null;
  }

  return (
    <div
      id="driver-offline-sync-notice"
      className={`rounded-xl p-3.5 border transition-all duration-300 shadow-sm flex flex-col gap-2 ${
        connectionState === "offline"
          ? "bg-[#FFF4ED] border-[#F97316]/40 text-[#9A3412]"
          : connectionState === "syncing"
          ? "bg-[#EFF6FF] border-[#3B82F6]/40 text-[#1E40AF]"
          : "bg-[#ECFDF5] border-[#22C55E]/40 text-[#166534]"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                connectionState === "offline"
                  ? "bg-orange-400"
                  : connectionState === "syncing"
                  ? "bg-blue-400"
                  : "bg-green-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                connectionState === "offline"
                  ? "bg-[#EA580C]"
                  : connectionState === "syncing"
                  ? "bg-[#2563EB]"
                  : "bg-[#16A34A]"
              }`}
            />
          </span>
          <span className="font-bold text-xs uppercase tracking-wider">
            {connectionState === "offline"
              ? "Offline Mode — Local Storage Active"
              : connectionState === "syncing"
              ? "Cloud Sync in Progress..."
              : "Sync Completed"}
          </span>
        </div>

        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/90 border border-current/20 shadow-xs">
          {connectionState === "offline"
            ? pendingCount > 0
              ? `${pendingCount} Saved Offline`
              : "Saved on Device"
            : connectionState === "syncing"
            ? "Syncing Fast-API"
            : `Synced at ${lastSyncedTime || "Just now"}`}
        </span>
      </div>

      <p className="text-xs font-medium m-0 leading-relaxed">
        {connectionState === "offline" ? (
          <>
            You are currently offline. Current status, delivery confirmations, and POD records are stored locally on this device. <strong className="font-bold">Once you return online, all pending data will automatically sync with Central Dispatch.</strong>
          </>
        ) : connectionState === "syncing" ? (
          <>
            Internet connection restored. Synchronizing <strong className="font-bold">{pendingCount > 0 ? `${pendingCount} pending record(s)` : "records"}</strong> with the cloud...
          </>
        ) : (
          <>
            All offline deliveries and completed stop records are verified and synced with cloud dispatch.
          </>
        )}
      </p>

      {connectionState === "offline" && pendingCount > 0 && (
        <div className="flex items-center justify-between pt-1 border-t border-orange-200/60 text-[11px] font-semibold">
          <span>{pendingCount} stop record(s) queued for sync</span>
          <span className="text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded">Auto-sync on Reconnect</span>
        </div>
      )}
    </div>
  );
}

/* ─── Mobile canvas (412×917, Figma spec) ───────────────────── */
export function TodayRunMobileCanvas({
  completedCount,
  nextStop,
  stops,
  vehicleId = "",
  tripPlanId = "S1-T001",
  planVersion = "Plan v2",
  dateStr = "Tuesday, September 29, 2026",
}: {
  completedCount: number;
  nextStop: Stop;
  stops: Stop[];
  vehicleId?: string;
  tripPlanId?: string;
  planVersion?: string;
  dateStr?: string;
}) {
  return (
    <div
      className="relative bg-white overflow-hidden shadow-2xl"
      style={{ width: 412, height: 917, fontFamily: "'Poppins', sans-serif", flexShrink: 0 }}
    >
      <ScreenHeader title="Today's Run" subtitle={dateStr} />
      <TripInfoCard vehicleId={vehicleId} tripPlanId={tripPlanId} planVersion={planVersion} />
      <ProgressBox completedCount={completedCount} totalCount={stops.length} />
      <NextStopCard stop={nextStop} onOpenStop={() => {}} />
      <StopsDirectory stops={stops} />
      <BottomNav activeTab="myRun" onTabChange={() => {}} />
    </div>
  );
}

/* ─── Today Run Workflow Component ───────────────────────────── */
export function TodayRunWorkflow() {
  const { connectionState } = useConnectivity();
  const { user } = useAuth();
  const [completedRecords, setCompletedRecords] = useState<LocalDeliveryRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<LocalDeliveryRecord | null>(null);
  const [dateStr, setDateStr] = useState<string>("Tuesday, September 29, 2026");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Dynamic run state loaded from backend
  const [tripInfo, setTripInfo] = useState({
    vehicleId: user?.vehicle_id ?? "",
    tripPlanId: "S1-T001",
    planVersion: "Plan v2",
    brand: "Fresh",
    district: "Colombo",
    stops: STOPS,
  });

  const loadRunData = useCallback(async () => {
    try {
      const run = await fetchDriverRun();
      setLoadError(null);
      if (run && run.stops && run.stops.length > 0) {
        const formattedStops: Stop[] = run.stops.map((s) => ({
          id: s.id,
          stopId: s.stopId,
          code: s.code,
          name: s.name,
          address: s.address,
          district: s.district,
          depot: s.depot,
          dockType: s.dockType,
          parkingConstraint: s.parkingConstraint,
          managerName: s.managerName,
          managerPhone: s.managerPhone,
          outlets: s.outlets || 1,
          orders: s.orders || [],
          units: s.units,
          weightKg: s.weightKg,
          volumeM3: s.volumeM3,
          tempRequirement: s.tempRequirement,
          status: "upcoming" as StopStatus,
          timeWindow: s.timeWindow,
          windowOpen: s.windowOpen,
          windowClose: s.windowClose,
        }));

        setTripInfo({
          vehicleId: run.vehicleId || user?.vehicle_id || "",
          tripPlanId: run.tripId || "S1-T001",
          planVersion: run.manifestVersion || "Plan v2",
          brand: run.brand || "Fresh",
          district: run.district || "Colombo",
          stops: formattedStops,
        });
      }
    } catch (err) {
      console.warn("Failed to load driver run from server:", err);
      setLoadError(
        err instanceof Error ? err.message : "Could not reach the RightGo server to load your assigned run."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRunData();
    getAllLocalDeliveryRecords()
      .then((records: LocalDeliveryRecord[]) => setCompletedRecords(records))
      .catch((err: unknown) => console.error("Error loading delivery records:", err));
  }, [connectionState, loadRunData]);

  useEffect(() => {
    try {
      const formatted = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (formatted) {
        setDateStr(formatted);
      }
    } catch {
      setDateStr("Tuesday, September 29, 2026");
    }
  }, []);

  // Compute status for stops: if completed in local IndexedDB or backend, mark as completed
  let foundNext = false;
  const stopsWithStatus: Stop[] = tripInfo.stops.map((stop) => {
    const isDone = completedRecords.some(
      (r) => r.stopId === stop.code || r.stopName.includes(stop.code)
    );
    if (isDone) {
      return { ...stop, status: "completed" as StopStatus };
    }
    if (!foundNext) {
      foundNext = true;
      return { ...stop, status: "next" as StopStatus };
    }
    return { ...stop, status: "upcoming" as StopStatus };
  });

  const completedCount = stopsWithStatus.filter((s) => s.status === "completed").length;
  const nextStop =
    stopsWithStatus.find((s) => s.status === "next") ??
    stopsWithStatus.find((s) => s.status === "upcoming") ??
    stopsWithStatus[0];

  return (
    <>
      <CompletedDeliveryModal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
      />

      {loadError && (
        <div className="m-4 mb-0 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Could not load your live run from the server - showing the last known data. {loadError}
        </div>
      )}

      {/* ══════════════════════════════════════════
          DESKTOP layout  (md+) — fluid, full-width
          ══════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col gap-5 p-6 lg:p-8 min-h-full">
        {/* Page Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-[#CBD5E1]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
              <RouteIcon className="w-6 h-6 text-[#F97316]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#F97316] bg-orange-50 px-2.5 py-0.5 rounded border border-orange-200">
                  Active Dispatch Run
                </span>
                <span className="text-xs font-bold text-[#485563]">
                  Vehicle: {tripInfo.vehicleId} · {tripInfo.planVersion} · {tripInfo.brand}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#202D2D] mt-1 m-0">
                Today&apos;s Run
              </h1>
              <div className="flex items-center gap-1.5 mt-1 text-[#485563] text-sm font-semibold">
                <CalendarIcon className="w-4 h-4 text-[#F97316]" />
                <span>{dateStr}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => loadRunData()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-[#485563] cursor-pointer transition-colors"
              title="Refresh Run from Server"
            >
              <RefreshCwIcon className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <Link
              href={`/driver/current-stop?stopId=${encodeURIComponent(nextStop.code)}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#F97316] hover:bg-[#ea6c0a] text-white font-bold text-xs rounded-xl shadow-sm no-underline active:scale-95 transition-all"
            >
              <NavigationIcon className="w-4 h-4 text-white" />
              <span>Current Stop</span>
            </Link>
            <Link
              href="/driver/history"
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#202D2D] font-bold text-xs rounded-xl shadow-sm no-underline transition-all"
            >
              <HistoryIcon className="w-4 h-4 text-[#485563]" />
              <span>History</span>
            </Link>
          </div>
        </div>

        {/* Offline / Cloud Sync Notice */}
        <DriverOfflineSyncNotice />

        {/* Stat chips */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Stops", value: stopsWithStatus.length, color: "text-[#202D2D]" },
            { label: "Completed", value: completedCount, color: "text-[#15803D]" },
            { label: "Remaining", value: stopsWithStatus.length - completedCount, color: "text-[#F97316]" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0] flex flex-col gap-1"
            >
              <p className="text-[#485563] text-[11px] font-semibold uppercase tracking-wider">
                {stat.label}
              </p>
              <p className={`${stat.color} font-bold text-3xl`}>{stat.value}</p>
            </div>
          ))}
          {/* Progress chip */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0] flex flex-col gap-3">
            <div className="flex justify-between">
              <p className="text-[#485563] text-[11px] font-semibold uppercase tracking-wider">Progress</p>
              <p className="text-[#202D2D] font-bold text-[13px]">
                {stopsWithStatus.length > 0 ? Math.round((completedCount / stopsWithStatus.length) * 100) : 0}%
              </p>
            </div>
            <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#F97316] rounded-full transition-all duration-700"
                style={{ width: `${stopsWithStatus.length > 0 ? Math.round((completedCount / stopsWithStatus.length) * 100) : 0}%` }}
              />
            </div>
            <p className="text-[#94A3B8] text-xs">{completedCount} of {stopsWithStatus.length} stops done</p>
          </div>
        </div>

        {/* Main two-column area */}
        <div className="grid grid-cols-5 gap-6 flex-1 min-h-0">
          {/* Next stop card (2 cols) */}
          <div className="col-span-2 flex flex-col gap-4">
            <TripInfoBanner
              vehicleId={tripInfo.vehicleId}
              tripPlanId={tripInfo.tripPlanId}
              planVersion={tripInfo.planVersion}
              brand={tripInfo.brand}
              district={tripInfo.district}
            />
            <NextStopBanner stop={nextStop} />
          </div>

          {/* Stops directory (3 cols) */}
          <div className="col-span-3 bg-white rounded-2xl shadow-sm border border-[#E2E8F0] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2">
                <h2 className="text-[#202D2D] font-bold text-[16px] m-0">Stops Directory</h2>
                <span className="text-[#94A3B8] text-[13px] font-semibold">
                  ({completedCount}/{stopsWithStatus.length} completed)
                </span>
              </div>
              <Link
                href="/driver/history"
                className="text-xs font-bold text-[#F97316] hover:underline flex items-center gap-1 no-underline"
              >
                <span>View Full History</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div role="list" className="flex flex-col gap-2 p-4 overflow-auto">
              {stopsWithStatus.map((stop) => {
                const completedRecord = completedRecords.find(
                  (r) => r.stopId === stop.code || r.stopName.includes(stop.code)
                );
                return (
                  <StopRow
                    key={stop.id}
                    stop={stop}
                    completedRecord={completedRecord}
                    onViewRecord={(r) => setSelectedRecord(r)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          MOBILE layout  (< md) — Seamless mobile view
          ══════════════════════════════════════════ */}
      <div className="md:hidden flex items-start justify-center w-full min-h-full bg-[#F8FAFC]">
        <TodayRunMobileView
          completedCount={completedCount}
          totalCount={stopsWithStatus.length}
          currentStop={nextStop}
          nextStop={stopsWithStatus.find((s) => s.id !== nextStop.id && s.status !== "completed") || null}
          stops={stopsWithStatus}
          vehicleId={tripInfo.vehicleId}
          tripPlanId={tripInfo.tripPlanId}
          planVersion={tripInfo.planVersion}
          completedRecords={completedRecords}
          onViewRecord={(r) => setSelectedRecord(r)}
        />
      </div>
    </>
  );
}
