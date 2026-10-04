"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  HistoryIcon,
} from "@/components/driver/today-run/icons";
import {
  getAllLocalDeliveryRecords,
  getAllLocalIssueReports,
  type LocalDeliveryRecord,
} from "@/lib/driver/driver-offline-db";
import { getOutletContact } from "@/lib/driver/outlet-service";
import { useConnectivity } from "@/context/DriverConnectivityContext";
import { CompletedDeliveryModal } from "./CompletedDeliveryModal";
import {
  ReportDetailsModal,
  type IssueReportRecord,
  type IssueCategoryItem,
} from "@/components/driver/today-run/ReportDetailsModal";
import { DriverHistoryMobileView } from "@/components/driver/history/DriverHistoryMobileView";

import { fetchDriverHistory, fetchDriverIssuesHistory } from "@/lib/driver/driver-api";

// Initial baseline completed record for today's run so history is immediately rich
const BASELINE_HISTORY_RECORDS: LocalDeliveryRecord[] = [
  {
    id: "DEL-S1-T001-DEP",
    stopId: "DEP001",
    stopName: "Peliyagoda Central Depot — Departure Gate Check",
    vehicleId: "PEL-R04",
    outcome: "full",
    podDetails: {
      signerName: "Rizwan (Head Loader)",
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

// Baseline issue reports
const BASELINE_REPORT_RECORDS: IssueReportRecord[] = [
  {
    id: "REP-S1-T001-001",
    tripId: "S1-T001",
    vehicleId: "PEL-R04",
    categoryId: "shortfall",
    categoryLabel: "Shortfall / Stock Discrepancy",
    categoryIcon: "📦",
    categories: [
      { id: "shortfall", label: "Shortfall / Stock Discrepancy", icon: "📦" },
    ],
    relatedScope: "Order S1-001 (Stop 1 – OUT001 / Colombo Fresh Outlet)",
    orderId: "S1-001",
    stopCode: "OUT001",
    outletName: "OUT001 / Colombo Fresh Outlet",
    description:
      "8 damaged chilled units identified during morning vehicle load. Replaced before depot departure with verified replacement stock (Plan v2).",
    photo: null,
    status: "Synced",
    offlineCreated: false,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "REP-S1-T001-002",
    tripId: "S1-T001",
    vehicleId: "PEL-R04",
    categoryId: "access",
    categoryLabel: "Outlet Closed / Access Restricted",
    categoryIcon: "🚪",
    categories: [
      { id: "access", label: "Outlet Closed / Access Restricted", icon: "🚪" },
    ],
    relatedScope: "Entire Stop 1 (OUT001 / Colombo Fresh Outlet)",
    stopCode: "OUT001",
    outletName: "OUT001 / Colombo Fresh Outlet",
    description:
      "Delivery street dock entrance was blocked by market utility van. Driver contacted store lead and dock access cleared by 05:20 AM.",
    photo: null,
    status: "Synced",
    offlineCreated: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

const LOCAL_STORAGE_REPORTS_KEY = "RightGo_Driver_Issue_Reports";

export function DriverHistoryWorkflow() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "reports" ? "reports" : "deliveries";

  const { connectionState, syncNow, isOnline, pendingCount } = useConnectivity();

  // Top-level History View State: "deliveries" | "reports"
  const [historySection, setHistorySection] = useState<"deliveries" | "reports">(initialTab);

  // Delivery Records State
  const [deliveryRecords, setDeliveryRecords] = useState<LocalDeliveryRecord[]>([]);
  const [selectedDeliveryRecord, setSelectedDeliveryRecord] = useState<LocalDeliveryRecord | null>(null);
  const [deliveryFilter, setDeliveryFilter] = useState<"all" | "full" | "discrepancy" | "none" | "pending">("all");

  // Issue Reports State
  const [reportRecords, setReportRecords] = useState<IssueReportRecord[]>(BASELINE_REPORT_RECORDS);
  const [selectedReportRecord, setSelectedReportRecord] = useState<IssueReportRecord | null>(null);
  const [reportFilter, setReportFilter] = useState<string>("all");

  const [isLoading, setIsLoading] = useState(true);

  // Load delivery records from backend API + IndexedDB and combine with baseline
  const loadDeliveryRecords = async () => {
    try {
      const [localRecords, remoteRecords] = await Promise.all([
        getAllLocalDeliveryRecords(),
        fetchDriverHistory("PEL-R04").catch(() => []),
      ]);
      const mergedMap = new Map<string, LocalDeliveryRecord>();

      // Put baseline first
      BASELINE_HISTORY_RECORDS.forEach((r: LocalDeliveryRecord) => {
        mergedMap.set(r.id, r);
      });
      // Put remote records
      remoteRecords.forEach((r: LocalDeliveryRecord) => mergedMap.set(r.id, r));
      // Put local records (most recent)
      localRecords.forEach((r: LocalDeliveryRecord) => mergedMap.set(r.id, r));

      const sorted = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setDeliveryRecords(sorted);
    } catch (err) {
      console.error("Failed to load delivery history records:", err);
      setDeliveryRecords(BASELINE_HISTORY_RECORDS);
    } finally {
      setIsLoading(false);
    }
  };

  // Load issue reports from backend API + IndexedDB / localStorage and combine with baseline
  const loadReportRecords = async () => {
    try {
      const [localReports, remoteReports] = await Promise.all([
        getAllLocalIssueReports(),
        fetchDriverIssuesHistory("PEL-R04").catch(() => []),
      ]);
      const mergedMap = new Map<string, IssueReportRecord>();

      BASELINE_REPORT_RECORDS.forEach((r: IssueReportRecord) => {
        mergedMap.set(r.id, r);
      });
      remoteReports.forEach((r: IssueReportRecord) => mergedMap.set(r.id, r));
      localReports.forEach((r: IssueReportRecord) => mergedMap.set(r.id, r));

      const sorted = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setReportRecords(sorted);
    } catch (e) {
      console.error("Failed to load stored issue reports:", e);
      setReportRecords(BASELINE_REPORT_RECORDS);
    }
  };

  useEffect(() => {
    loadDeliveryRecords();
    loadReportRecords();
  }, [connectionState]);

  // Delivery Filter counts
  const filteredDeliveries = deliveryRecords.filter((r) => {
    if (deliveryFilter === "all") return true;
    if (deliveryFilter === "full") return r.outcome === "full";
    if (deliveryFilter === "discrepancy") return r.outcome === "discrepancy";
    if (deliveryFilter === "none") return r.outcome === "none";
    if (deliveryFilter === "pending") return r.status === "Pending Sync";
    return true;
  });

  const fullCount = deliveryRecords.filter((r) => r.outcome === "full").length;
  const discrepancyCount = deliveryRecords.filter((r) => r.outcome === "discrepancy").length;
  const notDeliveredCount = deliveryRecords.filter((r) => r.outcome === "none").length;
  const pendingDeliverySyncCount = deliveryRecords.filter((r) => r.status === "Pending Sync").length;

  // Report Filter counts
  const filteredReports = reportRecords.filter((r) => {
    if (reportFilter === "all") return true;
    if (reportFilter === "synced") return r.status === "Synced";
    if (reportFilter === "pending") return r.status === "Pending Sync";
    return (
      r.categoryId === reportFilter ||
      (r.categories && r.categories.some((c: IssueCategoryItem) => c.id === reportFilter))
    );
  });

  const shortfallReportCount = reportRecords.filter(
    (r) => r.categoryId === "shortfall" || r.categories?.some((c) => c.id === "shortfall")
  ).length;
  const damagedReportCount = reportRecords.filter(
    (r) => r.categoryId === "damaged" || r.categories?.some((c) => c.id === "damaged")
  ).length;
  const accessReportCount = reportRecords.filter(
    (r) => r.categoryId === "access" || r.categories?.some((c) => c.id === "access")
  ).length;
  const vehicleReportCount = reportRecords.filter(
    (r) => r.categoryId === "vehicle" || r.categories?.some((c) => c.id === "vehicle")
  ).length;
  const pendingReportSyncCount = reportRecords.filter((r) => r.status === "Pending Sync").length;
  const syncedReportCount = reportRecords.filter((r) => r.status === "Synced").length;

  return (
    <>
      {/* Delivery Inspection Modal */}
      <CompletedDeliveryModal
        isOpen={!!selectedDeliveryRecord}
        onClose={() => setSelectedDeliveryRecord(null)}
        record={selectedDeliveryRecord}
      />

      {/* Report Inspection Modal */}
      <ReportDetailsModal
        isOpen={!!selectedReportRecord}
        onClose={() => setSelectedReportRecord(null)}
        report={selectedReportRecord}
      />

      {/* Desktop Main Container */}
      <div className="hidden md:flex flex-col gap-6 p-4 sm:p-6 lg:p-8 min-h-full max-w-6xl mx-auto w-full">
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
                  Driver History Hub
                </span>
                <span className="text-xs font-bold text-[#485563]">Vehicle: PEL-R04</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#202D2D] mt-1 m-0">
                {historySection === "deliveries" ? "Delivery History" : "Report History"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {pendingCount > 0 && isOnline && (
              <button
                type="button"
                onClick={syncNow}
                disabled={connectionState === "syncing"}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-all active:scale-95"
              >
                <RefreshCwIcon className={`w-3.5 h-3.5 ${connectionState === "syncing" ? "animate-spin" : ""}`} />
                <span>{connectionState === "syncing" ? "Syncing..." : `Sync (${pendingCount})`}</span>
              </button>
            )}
            <Link
              href="/driver/current-stop"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#F97316] hover:bg-[#ea6c0a] text-white font-bold text-xs rounded-xl shadow-sm no-underline active:scale-95 transition-all"
            >
              <NavigationIcon className="w-4 h-4 text-white" />
              <span>Current Stop</span>
            </Link>
          </div>
        </div>

        {/* ── TOP LEVEL SECTION SWITCHER (Delivery History vs Report History) ── */}
        <div className="flex items-center gap-2.5 p-2 bg-slate-100/90 rounded-2xl border border-slate-200 shrink-0 min-h-[56px]">
          <button
            type="button"
            onClick={() => setHistorySection("deliveries")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none flex items-center gap-2 ${
              historySection === "deliveries"
                ? "bg-[#202D2D] text-white border-[#202D2D] shadow-sm"
                : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#202D2D]"
            }`}
          >
            <CheckCircleIcon className="w-4 h-4" />
            <span>Delivery History ({deliveryRecords.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setHistorySection("reports")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none flex items-center gap-2 ${
              historySection === "reports"
                ? "bg-[#F97316] text-white border-[#F97316] shadow-sm"
                : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#F97316]"
            }`}
          >
            <AlertTriangleIcon className="w-4 h-4" />
            <span>Report History ({reportRecords.length})</span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════
            SECTION 1: DELIVERY HISTORY
            ══════════════════════════════════════════════════════ */}
        {historySection === "deliveries" && (
          <div className="flex flex-col gap-6">
            {/* Distinction Banner: Completed Stops vs Current & Upcoming Stops */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-[#CBD5E1] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                  <CheckCircleIcon className="w-6 h-6 text-[#F97316]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F97316] uppercase tracking-wider">
                      Run Progress: {deliveryRecords.length} Completed
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
                  {deliveryRecords.length}
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
                  {pendingDeliverySyncCount}
                </span>
                <span className="text-[11px] text-orange-600 font-medium">
                  {pendingDeliverySyncCount > 0 ? "Saved in local DB" : "All records synced ✓"}
                </span>
              </div>
            </div>

            {/* Filter Tabs Bar */}
            <div className="flex items-center gap-2.5 overflow-x-auto p-2 bg-slate-100/90 rounded-2xl border border-slate-200 shrink-0 min-h-[56px]">
              <button
                type="button"
                onClick={() => setDeliveryFilter("all")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none ${
                  deliveryFilter === "all"
                    ? "bg-[#202D2D] text-white border-[#202D2D] shadow-sm"
                    : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#202D2D]"
                }`}
              >
                All Stops ({deliveryRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setDeliveryFilter("full")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none ${
                  deliveryFilter === "full"
                    ? "bg-[#15803D] text-white border-[#15803D] shadow-sm"
                    : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#15803D]"
                }`}
              >
                Delivered in Full ({fullCount})
              </button>
              <button
                type="button"
                onClick={() => setDeliveryFilter("discrepancy")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none ${
                  deliveryFilter === "discrepancy"
                    ? "bg-[#B45309] text-white border-[#B45309] shadow-sm"
                    : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#B45309]"
                }`}
              >
                Discrepancies ({discrepancyCount})
              </button>
              {notDeliveredCount > 0 && (
                <button
                  type="button"
                  onClick={() => setDeliveryFilter("none")}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none ${
                    deliveryFilter === "none"
                      ? "bg-[#DC2626] text-white border-[#DC2626] shadow-sm"
                      : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#DC2626]"
                  }`}
                >
                  Not Delivered ({notDeliveredCount})
                </button>
              )}
              {pendingDeliverySyncCount > 0 && (
                <button
                  type="button"
                  onClick={() => setDeliveryFilter("pending")}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none ${
                    deliveryFilter === "pending"
                      ? "bg-[#C2410C] text-white border-[#C2410C] shadow-sm"
                      : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#C2410C]"
                  }`}
                >
                  Pending Sync ({pendingDeliverySyncCount})
                </button>
              )}
            </div>

            {/* Completed Delivery Records List */}
            <div className="flex flex-col gap-4 pb-12">
              {filteredDeliveries.length === 0 ? (
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
                filteredDeliveries.map((record) => {
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
                          onClick={() => setSelectedDeliveryRecord(record)}
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
        )}

        {/* ══════════════════════════════════════════════════════
            SECTION 2: REPORT HISTORY
            ══════════════════════════════════════════════════════ */}
        {historySection === "reports" && (
          <div className="flex flex-col gap-6">
            {/* History Summary Distinction Banner */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-[#CBD5E1] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                  <AlertTriangleIcon className="w-6 h-6 text-[#F97316]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F97316] uppercase tracking-wider">
                      Trip Reports Logged: {reportRecords.length}
                    </span>
                    <span className="text-slate-300 text-xs">•</span>
                    <span className="text-xs text-[#485563] font-semibold">
                      Trip Plan S1-T001
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#202D2D] mt-0.5 m-0">
                    Logged Issue Reports (Read-Only)
                  </h3>
                  <p className="text-xs text-[#485563] m-0 mt-0.5">
                    View verified issue reports, shortfall replacements, and cloud sync status for vehicle PEL-R04.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/driver/today-run"
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#202D2D] font-bold text-xs transition-colors no-underline flex items-center gap-1.5 border border-slate-200 shadow-sm"
                >
                  <span>Back to My Run</span>
                  <ArrowRightIcon className="w-3.5 h-3.5 text-[#202D2D]" />
                </Link>
              </div>
            </div>

            {/* Metric Summary Chips for Reports */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#CBD5E1] flex flex-col gap-1">
                <span className="text-[#485563] text-[11px] font-bold uppercase tracking-wider">
                  Total Reports
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#202D2D]">
                  {reportRecords.length}
                </span>
                <span className="text-[11px] text-slate-400">Current Trip Log</span>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#CBD5E1] flex flex-col gap-1">
                <span className="text-[#B45309] text-[11px] font-bold uppercase tracking-wider">
                  Shortfall / Stock
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#B45309]">
                  {shortfallReportCount}
                </span>
                <span className="text-[11px] text-amber-600 font-medium">Discrepancy logs</span>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#CBD5E1] flex flex-col gap-1">
                <span className="text-[#F97316] text-[11px] font-bold uppercase tracking-wider">
                  Access &amp; Vehicle
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#F97316]">
                  {accessReportCount + vehicleReportCount}
                </span>
                <span className="text-[11px] text-orange-600 font-medium">Route / stop delays</span>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#CBD5E1] flex flex-col gap-1">
                <span className="text-[#15803D] text-[11px] font-bold uppercase tracking-wider">
                  Cloud Synced
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#15803D]">
                  {syncedReportCount}
                </span>
                <span className="text-[11px] text-green-600 font-medium">
                  {pendingReportSyncCount > 0 ? `${pendingReportSyncCount} Pending Sync` : "All Synced ✓"}
                </span>
              </div>
            </div>

            {/* Filter Tabs for History */}
            <div className="flex items-center gap-2 overflow-x-auto p-2 bg-slate-100/90 rounded-2xl border border-slate-200 shrink-0 min-h-[56px]">
              <button
                type="button"
                onClick={() => setReportFilter("all")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none ${
                  reportFilter === "all"
                    ? "bg-[#202D2D] text-white border-[#202D2D] shadow-sm"
                    : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#202D2D]"
                }`}
              >
                All Reports ({reportRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setReportFilter("shortfall")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none ${
                  reportFilter === "shortfall"
                    ? "bg-[#F97316] text-white border-[#F97316] shadow-sm"
                    : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#F97316]"
                }`}
              >
                Shortfall ({shortfallReportCount})
              </button>
              <button
                type="button"
                onClick={() => setReportFilter("damaged")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none ${
                  reportFilter === "damaged"
                    ? "bg-[#F97316] text-white border-[#F97316] shadow-sm"
                    : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#F97316]"
                }`}
              >
                Damaged ({damagedReportCount})
              </button>
              <button
                type="button"
                onClick={() => setReportFilter("access")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none ${
                  reportFilter === "access"
                    ? "bg-[#F97316] text-white border-[#F97316] shadow-sm"
                    : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#F97316]"
                }`}
              >
                Access / Closed ({accessReportCount})
              </button>
              <button
                type="button"
                onClick={() => setReportFilter("synced")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none ${
                  reportFilter === "synced"
                    ? "bg-[#15803D] text-white border-[#15803D] shadow-sm"
                    : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#15803D]"
                }`}
              >
                Synced ({syncedReportCount})
              </button>
              {pendingReportSyncCount > 0 && (
                <button
                  type="button"
                  onClick={() => setReportFilter("pending")}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none ${
                    reportFilter === "pending"
                      ? "bg-[#C2410C] text-white border-[#C2410C] shadow-sm"
                      : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#C2410C]"
                  }`}
                >
                  Pending Sync ({pendingReportSyncCount})
                </button>
              )}
            </div>

            {/* Reports List */}
            <div className="flex flex-col gap-4 pb-12">
              {filteredReports.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-[#CBD5E1] flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <CheckCircleIcon className="w-6 h-6" />
                  </div>
                  <p className="text-base font-bold text-[#202D2D] m-0">
                    No issue reports match this filter
                  </p>
                  <p className="text-xs text-[#485563] m-0">
                    Issue reports recorded for this trip will appear here with full verification details.
                  </p>
                </div>
              ) : (
                filteredReports.map((report) => {
                  const formattedTime = new Date(report.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const formattedDate = new Date(report.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <div
                      key={report.id}
                      className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-[#CBD5E1] hover:border-slate-400 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left: Category Icon & Summary */}
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border bg-orange-50 border-orange-200 text-xl">
                          {report.categoryIcon ? report.categoryIcon.split(" ")[0] : "📦"}
                        </div>

                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {report.id}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                              {formattedDate} • {formattedTime}
                            </span>
                          </div>

                          <h3 className="text-base sm:text-lg font-bold text-[#202D2D] m-0">
                            {report.outletName}
                          </h3>

                          {/* Chips row */}
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {report.categories && report.categories.length > 0 ? (
                              report.categories.map((cat: IssueCategoryItem) => (
                                <span
                                  key={cat.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#FFFBEB] text-[#B45309] text-[11px] font-bold border border-[#FDE68A]"
                                >
                                  <span>{cat.icon}</span>
                                  <span>{cat.label}</span>
                                </span>
                              ))
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#FFFBEB] text-[#B45309] text-[11px] font-bold border border-[#FDE68A]">
                                <span>{report.categoryIcon}</span>
                                <span>{report.categoryLabel}</span>
                              </span>
                            )}

                            <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium">
                              {report.relatedScope}
                            </span>

                            {report.photo && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                <span>📷</span>
                                <span>Photo Evidence</span>
                              </span>
                            )}

                            {report.status === "Synced" ? (
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

                      {/* Right: View Details CTA */}
                      <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedReportRecord(report)}
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
        )}
      </div>

      {/* ══════════════════════════════════════════
          MOBILE layout  (< md) — Full Responsive Figma Spec
          ══════════════════════════════════════════ */}
      <div className="md:hidden flex items-start justify-center min-h-full bg-[#F6F8FB] py-0">
        <DriverHistoryMobileView
          deliveryRecords={deliveryRecords}
          reportRecords={reportRecords}
          activeTab={historySection}
          onTabChange={(tab) => setHistorySection(tab)}
          selectedDeliveryRecord={selectedDeliveryRecord}
          onSelectDeliveryRecord={(rec) => setSelectedDeliveryRecord(rec)}
          selectedReportRecord={selectedReportRecord}
          onSelectReportRecord={(rep) => setSelectedReportRecord(rep)}
        />
      </div>
    </>
  );
}
