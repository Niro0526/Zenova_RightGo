"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Stop } from "./types";
import type { LocalDeliveryRecord } from "@/lib/driver/driver-offline-db";
import { useConnectivity } from "@/context/DriverConnectivityContext";
import { DriverOfflineSyncNotice } from "@/components/driver/today-run-workflow";

export interface TodayRunMobileViewProps {
  completedCount: number;
  totalCount: number;
  currentStop?: Stop | null;
  nextStop?: Stop | null;
  stops: Stop[];
  vehicleId?: string;
  tripPlanId?: string;
  planVersion?: string;
  completedRecords?: LocalDeliveryRecord[];
  onViewRecord?: (record: LocalDeliveryRecord) => void;
}

export function TodayRunMobileView({
  completedCount,
  totalCount,
  currentStop,
  nextStop,
  stops,
  vehicleId = "",
  tripPlanId = "Trip A",
  planVersion = "Plan v2",
  completedRecords = [],
  onViewRecord,
}: TodayRunMobileViewProps) {
  const pathname = usePathname();
  const { isOnline, connectionState } = useConnectivity();

  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const remainingCount = Math.max(0, totalCount - completedCount);

  // Active stop to highlight in "Current Stop"
  const activeCurrentStop =
    currentStop ||
    stops.find((s) => s.status === "next" || s.status === "upcoming") ||
    stops[0];

  // Next upcoming stop after activeCurrentStop
  const upcomingNextStop =
    nextStop ||
    stops.find(
      (s) =>
        s.id !== activeCurrentStop?.id &&
        s.status !== "completed" &&
        !completedRecords.some((r) => r.stopId === s.code)
    ) ||
    stops[1] ||
    null;

  return (
    <div
      id="driver-today-run-mobile"
      className="font-inter w-full max-w-[390px] mx-auto min-h-[844px] bg-[#F8FAFC] pb-28 relative flex flex-col shadow-xl sm:rounded-[24px] overflow-hidden border border-slate-200"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ════════════════════════════════════════════════════════════════════
          1. TOP HEADER (Height: 72px, BG: #FFFFFF)
          ════════════════════════════════════════════════════════════════════ */}
      <header className="w-full h-[72px] bg-white flex items-center justify-between px-5 border-b border-[#F1F5F9] shrink-0 sticky top-0 z-30 shadow-2xs">
        {/* RightGo Brand */}
        <span className="font-bold text-[22px] leading-[27px] text-[#ED5214] tracking-tight">
          RightGo
        </span>

        {/* Status indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              !isOnline || connectionState === "offline"
                ? "bg-[#F97316]"
                : connectionState === "syncing"
                ? "bg-[#3B82F6] animate-pulse"
                : "bg-[#1A8C4D]"
            }`}
          />
          <span
            className={`font-bold text-[12px] leading-[15px] ${
              !isOnline || connectionState === "offline"
                ? "text-[#F97316]"
                : connectionState === "syncing"
                ? "text-[#3B82F6]"
                : "text-[#1A8C4D]"
            }`}
          >
            {!isOnline || connectionState === "offline"
              ? "Offline"
              : connectionState === "syncing"
              ? "Syncing"
              : "Online"}
          </span>
        </div>
      </header>

      {/* Main Body Content with precise margins */}
      <main className="flex-1 flex flex-col gap-4 px-5 pt-5">
        {/* Offline / Sync banner if active */}
        <DriverOfflineSyncNotice />

        {/* ════════════════════════════════════════════════════════════════════
            2. PAGE TITLE & TRIP SUBTITLE
            ════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-1">
          <h1 className="font-bold text-[24px] leading-[29px] text-[#1F293B] m-0">
            Today&apos;s Run
          </h1>
          <span className="font-normal text-[13px] leading-[16px] text-[#61738F]">
            {tripPlanId.includes("Trip") ? tripPlanId : `Trip A • ${vehicleId}`}
          </span>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            3. 4 STAT CARDS (2x2 GRID, 168x76 each, bg: #FFFFFF, radius: 12px)
            ════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Card 1: Total Stops */}
          <div className="bg-white rounded-[12px] p-3.5 flex flex-col justify-between border border-[#E2E8F0] shadow-xs h-[76px]">
            <span className="font-bold text-[10px] leading-[12px] text-[#6B788C] uppercase tracking-wider">
              TOTAL STOPS
            </span>
            <span className="font-bold text-[24px] leading-[29px] text-[#1F293B]">
              {totalCount}
            </span>
          </div>

          {/* Card 2: Completed */}
          <div className="bg-white rounded-[12px] p-3.5 flex flex-col justify-between border border-[#E2E8F0] shadow-xs h-[76px]">
            <span className="font-bold text-[10px] leading-[12px] text-[#6B788C] uppercase tracking-wider">
              COMPLETED
            </span>
            <span className="font-bold text-[24px] leading-[29px] text-[#1F9457]">
              {completedCount}
            </span>
          </div>

          {/* Card 3: Remaining */}
          <div className="bg-white rounded-[12px] p-3.5 flex flex-col justify-between border border-[#E2E8F0] shadow-xs h-[76px]">
            <span className="font-bold text-[10px] leading-[12px] text-[#6B788C] uppercase tracking-wider">
              REMAINING
            </span>
            <span className="font-bold text-[24px] leading-[29px] text-[#ED5214]">
              {remainingCount}
            </span>
          </div>

          {/* Card 4: Progress */}
          <div className="bg-white rounded-[12px] p-3.5 flex flex-col justify-between border border-[#E2E8F0] shadow-xs h-[76px]">
            <span className="font-bold text-[10px] leading-[12px] text-[#6B788C] uppercase tracking-wider">
              PROGRESS
            </span>
            <span className="font-bold text-[24px] leading-[29px] text-[#ED5214]">
              {pct}%
            </span>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            4. PROGRESS SUMMARY CARD (width: 350px, radius: 12px, bg: #FFFFFF)
            ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-[12px] p-4 flex flex-col gap-3.5 border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[14px] leading-[17px] text-[#1F293B]">
              {completedCount} of {totalCount} stops complete
            </span>
            <span className="font-bold text-[14px] leading-[17px] text-[#ED5214]">
              {pct}%
            </span>
          </div>

          {/* Progress Bar (Track: #E6E8ED, Fill: #ED5214) */}
          <div
            className="w-full h-[8px] bg-[#E6E8ED] rounded-[4px] overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-[#ED5214] rounded-[4px] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            5. STOPS SECTION
            ════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-3 pt-1">
          <h2 className="font-bold text-[17px] leading-[21px] text-[#1F293B] m-0">
            Stops
          </h2>

          {/* ── 5A. CURRENT STOP CARD (width: 350px, radius: 12px) ── */}
          {activeCurrentStop && (
            <div
              id="card-current-stop-mobile"
              className="bg-white rounded-[12px] p-4 flex flex-col gap-3.5 border border-[#E2E8F0] shadow-xs relative overflow-hidden"
            >
              {/* Top Accent line */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ED5214]" />

              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-[11px] leading-[13px] text-[#ED5214] uppercase tracking-wider">
                  CURRENT STOP
                </span>
                <span className="font-bold text-[18px] leading-[22px] text-[#1F293B]">
                  {activeCurrentStop.name}
                </span>
                <span className="font-normal text-[12px] leading-[15px] text-[#66758C]">
                  {activeCurrentStop.code} • Stop {activeCurrentStop.id} of {totalCount}
                </span>
              </div>

              {/* Delivery window */}
              <div className="flex flex-col gap-0.5 pt-1 border-t border-[#F1F5F9]">
                <span className="font-normal text-[11px] leading-[13px] text-[#738094]">
                  Delivery window
                </span>
                <span className="font-bold text-[14px] leading-[17px] text-[#1F293B]">
                  {activeCurrentStop.timeWindow || "06:00 – 08:00"}
                </span>
              </div>

              {/* Action Button: "Open Current Stop" */}
              <Link
                id="btn-open-current-stop-mobile"
                href={`/driver/current-stop?stopId=${encodeURIComponent(activeCurrentStop.code || activeCurrentStop.stopId || "OUT001")}`}
                className="w-full h-[42px] bg-[#ED5214] hover:bg-[#d8460d] active:scale-[0.98] rounded-[10px] text-white font-bold text-[14px] leading-[17px] flex items-center justify-center transition-all no-underline shadow-sm border-none cursor-pointer"
              >
                Open Current Stop
              </Link>
            </div>
          )}

          {/* ── 5B. NEXT STOP CARD (width: 350px, radius: 12px) ── */}
          {upcomingNextStop && (
            <div
              id="card-next-stop-mobile"
              className="bg-white rounded-[12px] p-4 flex flex-col gap-1.5 border border-[#E2E8F0] shadow-xs"
            >
              <span className="font-bold text-[11px] leading-[13px] text-[#738094] uppercase tracking-wider">
                NEXT STOP
              </span>
              <span className="font-bold text-[16px] leading-[19px] text-[#1F293B]">
                {upcomingNextStop.name}
              </span>
              <span className="font-normal text-[12px] leading-[15px] text-[#66758C]">
                Stop {upcomingNextStop.id} of {totalCount} •{" "}
                {upcomingNextStop.timeWindow || "08:15 – 09:00"}
              </span>
            </div>
          )}

          {/* ── 5C. ALL STOPS DIRECTORY COLLAPSIBLE / LIST ── */}
          {stops.length > 2 && (
            <div className="flex flex-col gap-2 pt-2">
              <span className="font-bold text-[12px] leading-[15px] text-[#66758C] uppercase tracking-wider">
                All Stops ({stops.length})
              </span>
              <div className="flex flex-col gap-2">
                {stops.map((stop) => {
                  const isDone =
                    stop.status === "completed" ||
                    completedRecords.some(
                      (r) => r.stopId === stop.code || r.stopName.includes(stop.code)
                    );
                  const isCurrent = stop.id === activeCurrentStop?.id;

                  return (
                    <div
                      key={stop.id}
                      className={`bg-white rounded-[10px] p-3 flex items-center justify-between border ${
                        isDone
                          ? "border-emerald-300 bg-emerald-50/20"
                          : isCurrent
                          ? "border-[#ED5214]/40 bg-orange-50/20"
                          : "border-[#E2E8F0]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            isDone
                              ? "bg-emerald-600 text-white"
                              : isCurrent
                              ? "bg-[#ED5214] text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isDone ? "✓" : stop.id}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-[13px] text-[#1F293B] truncate">
                            {stop.name}
                          </span>
                          <span className="text-[11px] text-[#66758C]">
                            {stop.code} • {stop.timeWindow}
                          </span>
                        </div>
                      </div>

                      {isDone && onViewRecord ? (
                        <button
                          type="button"
                          onClick={() => {
                            const rec = completedRecords.find(
                              (r) => r.stopId === stop.code || r.stopName.includes(stop.code)
                            );
                            if (rec) onViewRecord(rec);
                          }}
                          className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 cursor-pointer transition-colors"
                        >
                          Record
                        </button>
                      ) : (
                        <Link
                          href={`/driver/current-stop?stopId=${encodeURIComponent(stop.code || stop.stopId || "OUT001")}`}
                          className="text-[11px] font-bold text-[#ED5214] hover:underline"
                        >
                          Open →
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

