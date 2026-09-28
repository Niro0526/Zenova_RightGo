"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { STOPS } from "@/components/driver/today-run/types";
import {
  ClockIcon,
  ExternalLinkIcon,
  NavigationIcon,
  CheckIcon,
  CheckCircleIcon,
  HistoryIcon,
  ArrowRightIcon,
} from "@/components/driver/today-run/icons";
import type { Stop, StopStatus } from "@/components/driver/today-run/types";
import ScreenHeader from "@/components/driver/today-run/ScreenHeader";
import TripInfoCard from "@/components/driver/today-run/TripInfoCard";
import ProgressBox from "@/components/driver/today-run/ProgressBox";
import NextStopCard from "@/components/driver/today-run/NextStopCard";
import StopsDirectory from "@/components/driver/today-run/StopsDirectory";
import BottomNav from "@/components/driver/today-run/BottomNav";
import { useConnectivity } from "@/context/DriverConnectivityContext";
import {
  getAllLocalDeliveryRecords,
  type LocalDeliveryRecord,
} from "@/lib/driver/driver-offline-db";
import { CompletedDeliveryModal } from "@/components/driver/today-run/CompletedDeliveryModal";

/* ─── Reusable sub-pieces (fluid, no absolute positioning) ─── */

export function TripInfoBanner({
  vehicleId,
  tripPlanId,
  planVersion,
}: {
  vehicleId: string;
  tripPlanId: string;
  planVersion: string;
}) {
  return (
    <div className="flex flex-row justify-between items-center bg-white border border-[#CBD5E1] rounded-xl px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[#485563] font-semibold text-[11px] uppercase tracking-wider">
          Current Vehicle
        </span>
        <span className="text-[#202D2D] font-bold text-[18px] leading-[27px]">
          {vehicleId}
        </span>
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
    <div className="flex flex-col gap-3 bg-white border-2 border-[#F97316] rounded-2xl p-5">
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
          <span className="text-[#485563] font-semibold text-[11px] uppercase tracking-wider">Outlet</span>
          <span className="text-[#202D2D] font-bold text-[15px]">{stop.outlets} outlet</span>
        </div>
      </div>

      {/* CTA */}
      <Link
        id="btn-open-next-stop"
        href="/driver/current-stop"
        className="flex items-center justify-center gap-2 w-full py-3 bg-[#F97316] hover:bg-[#ea6c0a] active:scale-[0.98] rounded-xl transition-all duration-200 border-none cursor-pointer no-underline"
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
            {stop.outlets} outlet · {stop.orders.length}{" "}
            {stop.orders.length === 1 ? "order" : "orders"} • Window: {stop.timeWindow}
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
            href="/driver/current-stop"
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

/* ─── Mobile canvas (412×917, Figma spec) ───────────────────── */
export function TodayRunMobileCanvas({
  completedCount,
  nextStop,
  stops,
}: {
  completedCount: number;
  nextStop: Stop;
  stops: Stop[];
}) {
  return (
    <div
      className="relative bg-white overflow-hidden shadow-2xl"
      style={{ width: 412, height: 917, fontFamily: "'Poppins', sans-serif", flexShrink: 0 }}
    >
      <ScreenHeader isOnline={true} />
      <TripInfoCard vehicleId="PEL-R04" tripPlanId="S1-T001" planVersion="Plan v2" />
      <ProgressBox completedCount={completedCount} totalCount={stops.length} />
      <NextStopCard stop={nextStop} onOpenStop={(s) => console.log("Opening stop", s.id)} />
      <StopsDirectory stops={stops} />
      <BottomNav activeTab="myRun" onTabChange={() => {}} />
    </div>
  );
}

/* ─── Today Run Workflow Component ───────────────────────────── */
export function TodayRunWorkflow() {
  const { connectionState } = useConnectivity();
  const [completedRecords, setCompletedRecords] = useState<LocalDeliveryRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<LocalDeliveryRecord | null>(null);
  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    getAllLocalDeliveryRecords()
      .then((records: LocalDeliveryRecord[]) => setCompletedRecords(records))
      .catch((err: unknown) => console.error("Error loading delivery records:", err));
  }, [connectionState]);

  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  // Compute status for stops: if completed in local IndexedDB, mark as completed
  const stopsWithStatus: Stop[] = STOPS.map((stop) => {
    const isDone = completedRecords.some(
      (r) => r.stopId === stop.code || r.stopName.includes(stop.code)
    );
    if (isDone) {
      return { ...stop, status: "completed" as StopStatus };
    }
    return stop;
  });

  const completedCount = stopsWithStatus.filter((s) => s.status === "completed").length;
  const nextStop =
    stopsWithStatus.find((s) => s.status === "next" || s.status === "upcoming") ??
    stopsWithStatus[0];

  return (
    <>
      <CompletedDeliveryModal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
      />

      {/* ══════════════════════════════════════════
          DESKTOP layout  (md+) — fluid, full-width
          ══════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col gap-5 p-6 lg:p-8 min-h-full">
        {/* Page title row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#202D2D] font-bold text-2xl">Today&apos;s Run</h1>
            <p className="text-[#485563] text-sm mt-0.5">
              {dateStr}
            </p>
          </div>
        </div>

        {/* Stat chips */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Stops", value: STOPS.length, color: "text-[#202D2D]" },
            { label: "Completed", value: completedCount, color: "text-[#15803D]" },
            { label: "Remaining", value: STOPS.length - completedCount, color: "text-[#F97316]" },
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
                {Math.round((completedCount / STOPS.length) * 100)}%
              </p>
            </div>
            <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#F97316] rounded-full transition-all duration-700"
                style={{ width: `${Math.round((completedCount / STOPS.length) * 100)}%` }}
              />
            </div>
            <p className="text-[#94A3B8] text-xs">{completedCount} of {STOPS.length} stops done</p>
          </div>
        </div>

        {/* Main two-column area */}
        <div className="grid grid-cols-5 gap-6 flex-1 min-h-0">
          {/* Next stop card (2 cols) */}
          <div className="col-span-2 flex flex-col gap-4">
            <TripInfoBanner vehicleId="PEL-R04" tripPlanId="S1-T001" planVersion="Plan v2" />
            <NextStopBanner stop={nextStop} />
          </div>

          {/* Stops directory (3 cols) */}
          <div className="col-span-3 bg-white rounded-2xl shadow-sm border border-[#E2E8F0] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2">
                <h2 className="text-[#202D2D] font-bold text-[16px] m-0">Stops Directory</h2>
                <span className="text-[#94A3B8] text-[13px] font-semibold">
                  ({completedCount}/{STOPS.length} completed)
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
          MOBILE layout  (< md) — Figma 412px canvas
          ══════════════════════════════════════════ */}
      <div className="md:hidden flex items-start justify-center min-h-full bg-[#E2E8F0] py-4">
        <TodayRunMobileCanvas
          completedCount={completedCount}
          nextStop={nextStop}
          stops={stopsWithStatus}
        />
      </div>
    </>
  );
}
