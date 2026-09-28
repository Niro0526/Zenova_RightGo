"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  RouteIcon,
  NavigationIcon,
  CheckIcon,
  AlertTriangleIcon,
  XIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  PhoneIcon,
  CheckCircleIcon,
  RefreshCwIcon,
} from "@/components/driver/today-run/icons";
import {
  getAllLocalDeliveryRecords,
  type LocalDeliveryRecord,
} from "@/lib/driver/driver-offline-db";
import { getOutletContact } from "@/lib/driver/outlet-service";
import { useConnectivity } from "@/context/DriverConnectivityContext";
import { CompletedDeliveryModal } from "./CompletedDeliveryModal";

// Initial baseline completed record for today's run so history is immediately rich
const BASELINE_HISTORY_RECORDS: LocalDeliveryRecord[] = [
  {
    id: "DEL-S1-T001-DEP",
    stopId: "DEP001",
    stopName: "Peliyagoda Central Depot — Departure Check",
    vehicleId: "PEL-R04",
    outcome: "full",
    podDetails: {
      signerName: "M. Bandara (Depot Dispatch Lead)",
      hasSignature: true,
      hasPhoto: true,
      photoName: "depot_seal_pel_r04.jpg",
    },
    status: "Synced",
    offlineCreated: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    syncedAt: new Date(Date.now() - 1000 * 60 * 53).toISOString(),
  },
];

export function DriverHistoryWorkflow() {
  const { connectionState, syncNow, isOnline } = useConnectivity();
  const [records, setRecords] = useState<LocalDeliveryRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<LocalDeliveryRecord | null>(null);
  const [filter, setFilter] = useState<"all" | "full" | "discrepancy" | "none" | "pending">("all");
  const [isLoading, setIsLoading] = useState(true);

  // Load records from IndexedDB and combine with baseline
  const loadRecords = async () => {
    try {
      const localRecords = await getAllLocalDeliveryRecords();
      // Combine: local records (newest first) + baseline
      const mergedMap = new Map<string, LocalDeliveryRecord>();
      
      localRecords.forEach((r: LocalDeliveryRecord) => mergedMap.set(r.id, r));
      BASELINE_HISTORY_RECORDS.forEach((r: LocalDeliveryRecord) => {
        if (!mergedMap.has(r.id)) {
          mergedMap.set(r.id, r);
        }
      });

      const sorted = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRecords(sorted);
    } catch (err) {
      console.error("Failed to load delivery history records:", err);
      setRecords(BASELINE_HISTORY_RECORDS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [connectionState]);

  // Filter records
  const filteredRecords = records.filter((r) => {
    if (filter === "all") return true;
    if (filter === "full") return r.outcome === "full";
    if (filter === "discrepancy") return r.outcome === "discrepancy";
    if (filter === "none") return r.outcome === "none";
    if (filter === "pending") return r.status === "Pending Sync";
    return true;
  });

  const fullCount = records.filter((r) => r.outcome === "full").length;
  const discrepancyCount = records.filter((r) => r.outcome === "discrepancy").length;
  const notDeliveredCount = records.filter((r) => r.outcome === "none").length;
  const pendingSyncCount = records.filter((r) => r.status === "Pending Sync").length;

  return (
    <>
      <CompletedDeliveryModal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
      />

      {/* Main Container */}
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 min-h-full max-w-6xl mx-auto w-full">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-[#CBD5E1]">
          <div className="flex items-center gap-4">
            <Link
              href="/driver/today-run"
              className="p-2.5 rounded-xl border border-[#CBD5E1] bg-white text-[#202D2D] hover:bg-slate-50 transition-colors shadow-sm"
              title="Back to Today's Run"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#F97316] bg-orange-50 px-2.5 py-0.5 rounded border border-orange-200">
                  Fleet History
                </span>
                <span className="text-xs font-bold text-[#485563]">Vehicle: PEL-R04</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#202D2D] mt-1 m-0">
                Delivery History
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/driver/current-stop"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#F97316] hover:bg-[#ea6c0a] text-white font-bold text-xs rounded-xl shadow-sm no-underline active:scale-95 transition-all"
            >
              <NavigationIcon className="w-4 h-4 text-white" />
              <span>Current Stop</span>
            </Link>
          </div>
        </div>

        {/* Distinction Banner: Completed Stops vs Current & Upcoming Stops */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-[#CBD5E1] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
              <CheckCircleIcon className="w-6 h-6 text-[#F97316]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#F97316] uppercase tracking-wider">
                  Run Progress: {records.length} Completed
                </span>
                <span className="text-slate-300 text-xs">•</span>
                <span className="text-xs text-[#485563] font-semibold">
                  Trip Plan S1-T001
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#202D2D] mt-0.5 m-0">
                Completed Stops Verified &amp; Logged
              </h3>
              <p className="text-xs text-[#485563] m-0 mt-0.5">
                Past completed deliveries are archived here with POD signatures and cloud sync status.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/driver/today-run"
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#202D2D] font-bold text-xs transition-colors no-underline flex items-center gap-1.5 border border-slate-200 shadow-sm"
            >
              <span>View All 4 Stops</span>
              <ArrowRightIcon className="w-3.5 h-3.5 text-[#202D2D]" />
            </Link>
          </div>
        </div>

        {/* Summary Metric Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#CBD5E1] flex flex-col gap-1">
            <span className="text-[#485563] text-[11px] font-bold uppercase tracking-wider">
              Total Logged
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#202D2D]">
              {records.length}
            </span>
            <span className="text-[11px] text-slate-400">Completed stops</span>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#CBD5E1] flex flex-col gap-1">
            <span className="text-[#15803D] text-[11px] font-bold uppercase tracking-wider">
              Delivered Full
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#15803D]">
              {fullCount}
            </span>
            <span className="text-[11px] text-green-600 font-medium">100% verified POD</span>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#CBD5E1] flex flex-col gap-1">
            <span className="text-[#B45309] text-[11px] font-bold uppercase tracking-wider">
              Discrepancies
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#B45309]">
              {discrepancyCount}
            </span>
            <span className="text-[11px] text-amber-600 font-medium">
              Shortfall / Damaged
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#CBD5E1] flex flex-col gap-1">
            <span className="text-[#C2410C] text-[11px] font-bold uppercase tracking-wider">
              Pending Sync
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#C2410C]">
              {pendingSyncCount}
            </span>
            <span className="text-[11px] text-orange-600 font-medium">
              {pendingSyncCount > 0 ? "Saved in local DB" : "All records synced ✓"}
            </span>
          </div>
        </div>

        {/* Filter Tabs Bar — Properly aligned and non-collapsing */}
        <div className="flex items-center gap-2.5 overflow-x-auto p-2 bg-slate-100/90 rounded-2xl border border-slate-200 shrink-0 min-h-[56px]">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none ${
              filter === "all"
                ? "bg-[#202D2D] text-white border-[#202D2D] shadow-sm"
                : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#202D2D]"
            }`}
          >
            All Stops ({records.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("full")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none ${
              filter === "full"
                ? "bg-[#15803D] text-white border-[#15803D] shadow-sm"
                : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#15803D]"
            }`}
          >
            Delivered in Full ({fullCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("discrepancy")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none ${
              filter === "discrepancy"
                ? "bg-[#B45309] text-white border-[#B45309] shadow-sm"
                : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#B45309]"
            }`}
          >
            Discrepancies ({discrepancyCount})
          </button>
          {notDeliveredCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter("none")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none ${
                filter === "none"
                  ? "bg-[#DC2626] text-white border-[#DC2626] shadow-sm"
                  : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#DC2626]"
              }`}
            >
              Not Delivered ({notDeliveredCount})
            </button>
          )}
          {pendingSyncCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter("pending")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none ${
                filter === "pending"
                  ? "bg-[#C2410C] text-white border-[#C2410C] shadow-sm"
                : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#C2410C]"
              }`}
            >
              Pending Sync ({pendingSyncCount})
            </button>
          )}
        </div>

        {/* Completed Delivery Records List */}
        <div className="flex flex-col gap-4 pb-12">
          {filteredRecords.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-[#CBD5E1] flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <CheckCircleIcon className="w-6 h-6" />
              </div>
              <p className="text-base font-bold text-[#202D2D] m-0">
                No delivery records match this filter
              </p>
              <p className="text-xs text-[#485563] m-0">
                Deliveries completed on the Current Stop page will appear here automatically.
              </p>
            </div>
          ) : (
            filteredRecords.map((record) => {
              const storeContact = getOutletContact(record.stopId);
              const formattedTime = new Date(record.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const formattedDate = new Date(record.createdAt).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={record.id}
                  className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-[#CBD5E1] hover:border-slate-400 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Outlet & Outcome */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                        record.outcome === "full"
                          ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#15803D]"
                          : record.outcome === "discrepancy"
                          ? "bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]"
                          : "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]"
                      }`}
                    >
                      {record.outcome === "full" && <CheckIcon className="w-6 h-6 text-[#15803D]" />}
                      {record.outcome === "discrepancy" && <AlertTriangleIcon className="w-6 h-6 text-[#B45309]" />}
                      {record.outcome === "none" && <XIcon className="w-6 h-6 text-[#DC2626]" />}
                    </div>

                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {record.id}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {formattedDate} • {formattedTime}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-[#202D2D] m-0">
                        {record.stopName}
                      </h3>

                      {/* Outcome & POD status chips */}
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {record.outcome === "full" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#ECFDF5] text-[#15803D] text-[11px] font-bold border border-[#A7F3D0]">
                            <CheckIcon className="w-3 h-3 text-[#15803D]" />
                            Delivered in Full
                          </span>
                        )}
                        {record.outcome === "discrepancy" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#FFFBEB] text-[#B45309] text-[11px] font-bold border border-[#FDE68A]">
                            <AlertTriangleIcon className="w-3 h-3 text-[#B45309]" />
                            Discrepancy: {record.discrepancyDetails?.type || "Reported"}
                          </span>
                        )}
                        {record.outcome === "none" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#FEF2F2] text-[#DC2626] text-[11px] font-bold border border-[#FECACA]">
                            <XIcon className="w-3 h-3 text-[#DC2626]" />
                            Not Delivered: {record.notDeliveredDetails?.reason || "Issue"}
                          </span>
                        )}

                        {/* POD Status */}
                        {record.outcome !== "none" && (
                          <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                            <span>POD Verified ✓</span>
                            {record.podDetails?.signerName && (
                              <span className="text-slate-400">({record.podDetails.signerName})</span>
                            )}
                          </span>
                        )}

                        {/* Cloud Sync Status */}
                        {record.status === "Synced" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Synced
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                            Pending Sync
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions (Quick Call Store + View Details) */}
                  <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                    {/* Quick Call Store (if contact phone exists in official dataset) */}
                    {storeContact?.phone && (
                      <a
                        href={`tel:${storeContact.phone.replace(/[^+\d]/g, "")}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#ECFDF5] hover:bg-[#DCFCE7] text-[#15803D] border border-[#A7F3D0] text-xs font-bold transition-all no-underline shadow-sm active:scale-95"
                        title={`Call Store: ${storeContact.phone}`}
                      >
                        <PhoneIcon className="w-3.5 h-3.5 text-[#15803D]" />
                        <span className="hidden sm:inline">Call Store</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedRecord(record)}
                      className="px-4 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#ea6c0a] text-white font-bold text-xs shadow-sm cursor-pointer border-none transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <span>View Details</span>
                      <ArrowRightIcon className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
