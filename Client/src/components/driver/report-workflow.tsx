"use client";

import { useState, useRef, useId, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  AlertTriangleIcon,
  CameraIcon,
  RouteIcon,
  NavigationIcon,
  ArrowRightIcon,
  CheckIcon,
  CheckCircleIcon,
  HistoryIcon,
} from "@/components/driver/today-run/icons";
import { CameraModal } from "@/components/driver/today-run/CameraModal";
import { Toast, ToastState } from "@/components/driver/today-run/Toast";
import { useConnectivity } from "@/context/DriverConnectivityContext";
import { useAuth } from "@/context/AuthContext";
import { saveLocalIssueReport, updateIssueReportSyncStatus } from "@/lib/driver/driver-offline-db";
import { postDriverIssue, fetchDriverRun } from "@/lib/driver/driver-api";
import {
  ReportDetailsModal,
  type IssueReportRecord,
  type IssueCategoryItem,
} from "@/components/driver/today-run/ReportDetailsModal";
import { DriverReportMobileView } from "@/components/driver/report/DriverReportMobileView";

export const FIGMA_TO_ID_MAP: Record<string, string> = {
  "Store Closed": "access",
  "Access Blocked": "access",
  "Delivery Quantity Issue": "shortfall",
  "Damaged Goods": "damaged",
  "Vehicle Issue": "vehicle",
  "Other": "other",
};

export const ID_TO_FIGMA_MAP: Record<string, string> = {
  shortfall: "Delivery Quantity Issue",
  damaged: "Damaged Goods",
  access: "Store Closed",
  vehicle: "Vehicle Issue",
  other: "Other",
};

export const ISSUE_TYPES = [
  {
    id: "shortfall",
    label: "Shortfall / Stock Discrepancy",
    icon: "📦",
    requiresOrder: true,
    hint: "Requires selecting an order from run",
  },
  {
    id: "damaged",
    label: "Damaged Goods at Unloading",
    icon: "⚠️",
    requiresOrder: true,
    hint: "Requires selecting an order from run",
  },
  {
    id: "access",
    label: "Outlet Closed / Access Restricted",
    icon: "🚪",
    requiresOrder: false,
    hint: "Applies to entire stop or specific outlet",
  },
  {
    id: "vehicle",
    label: "Vehicle Issue / Delay",
    icon: "🚚",
    requiresOrder: false,
    hint: "Applies to this trip & your assigned vehicle",
  },
  {
    id: "other",
    label: "Other Issue",
    icon: "📝",
    requiresOrder: false,
    hint: "Requires description details",
  },
] as const;

export interface ReportTripInfo {
  tripId: string;
  driverName: string;
  planVersion: string;
  stops: { stopId: number; stopCode: string; stopName: string; orders: { orderId: string; details: string }[] }[];
}

/** Placeholder until the driver's live run loads - never sample trip data. */
const NO_TRIP_INFO: ReportTripInfo = { tripId: "", driverName: "", planVersion: "", stops: [] };

const LOCAL_STORAGE_REPORTS_KEY = "RightGo_Driver_Issue_Reports";

export function DriverReportWorkflow() {
  const router = useRouter();
  const { connectionState } = useConnectivity();

  // Navigation tab state: "new" | "history"
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  // Form State: Support MULTIPLE selected issue categories
  const [selectedIssues, setSelectedIssues] = useState<string[]>(["shortfall"]);
  const [selectedOrder, setSelectedOrder] = useState<string>("S1-001");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<{ name: string; url: string } | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedReportId, setSubmittedReportId] = useState("");

  const { user } = useAuth();
  const vehicleId = user?.vehicle_id ?? "";
  // The driver's real, live run (trip id, plan version, stops and orders come from the server).
  const [tripInfo, setTripInfo] = useState<ReportTripInfo>(NO_TRIP_INFO);
  useEffect(() => {
    let alive = true;
    fetchDriverRun()
      .then((run) => {
        if (!alive || !run?.hasRun) return;
        setTripInfo({
          tripId: run.tripId,
          driverName: user?.display_name ?? "",
          planVersion: run.manifestVersion,
          stops: run.stops.map((st) => ({
            stopId: st.stopNumber,
            stopCode: st.stopId,
            stopName: st.name,
            orders: (st.orderDetails ?? []).map((o) => ({
              orderId: o.orderRef,
              details: `${o.units} ${o.tempRequirement ?? ""} units${o.weightKg != null ? ` • ${o.weightKg.toFixed(1)} kg` : ""}`,
            })),
          })),
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user?.display_name]);

  // Reports History State
  const [reports, setReports] = useState<IssueReportRecord[]>([]);
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<IssueReportRecord | null>(null);
  const [historyFilter, setHistoryFilter] = useState<string>("all");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const orderSelectId = useId();

  // Load reports from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as IssueReportRecord[];
        const mergedMap = new Map<string, IssueReportRecord>();
        parsed.forEach((r) => mergedMap.set(r.id, r));
        const sorted = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setReports(sorted);
      }
    } catch (e) {
      console.error("Failed to load stored issue reports:", e);
    }
  }, []);

  // Multi-select toggle handler
  const handleToggleCategory = (categoryId: string) => {
    setSelectedIssues((prev) => {
      let next: string[];
      if (prev.includes(categoryId)) {
        if (prev.length === 1) {
          // Keep at least one category selected
          return prev;
        }
        next = prev.filter((id) => id !== categoryId);
      } else {
        next = [...prev, categoryId];
      }

      // Check if any selected category requires an order
      const hasOrderRequired = next.some(
        (id) => id === "shortfall" || id === "damaged"
      );
      if (
        hasOrderRequired &&
        (selectedOrder.startsWith("STOP_") ||
          selectedOrder.startsWith("VEHICLE_") ||
          !selectedOrder)
      ) {
        setSelectedOrder("S1-001");
      } else if (next.length === 1 && next[0] === "vehicle") {
        setSelectedOrder("VEHICLE_PEL_R04");
      }
      return next;
    });
  };

  const selectedCategoryObjects = ISSUE_TYPES.filter((i) =>
    selectedIssues.includes(i.id)
  );
  const primaryCategory = selectedCategoryObjects[0] || ISSUE_TYPES[0];
  const requiresOrderAny = selectedCategoryObjects.some((c) => c.requiresOrder);

  const handleCameraCapture = (captured: { name: string; url: string }) => {
    setPhoto(captured);
    setToast({
      type: "success",
      title: "Photo Attached",
      message: "Photo captured from camera and attached to report.",
      duration: 3500,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto({
        name: file.name,
        url: URL.createObjectURL(file),
      });
      setToast({
        type: "success",
        title: "Photo Uploaded",
        message: `${file.name} attached to report.`,
        duration: 3000,
      });
    }
    e.target.value = "";
  };

  const getSelectedScopeDisplay = () => {
    if (selectedOrder === "VEHICLE_PEL_R04") {
      return `Trip & Vehicle Level (${vehicleId}) — ${tripInfo.tripId}`;
    }
    if (selectedOrder.startsWith("STOP_")) {
      const stopNum = selectedOrder.split("_")[1];
      const matchedStop = tripInfo.stops.find((s) => s.stopId === Number(stopNum));
      return matchedStop
        ? `Entire Stop ${matchedStop.stopId} (${matchedStop.stopCode} / ${matchedStop.stopName})`
        : "Entire Stop / Not Applicable";
    }
    for (const stop of tripInfo.stops) {
      const order = stop.orders.find((o) => o.orderId === selectedOrder);
      if (order) {
        return `Order ${order.orderId} (Stop ${stop.stopId} – ${stop.stopCode} / ${stop.stopName})`;
      }
    }
    return selectedOrder || "Not Specified";
  };

  const getTargetOutletName = () => {
    if (selectedOrder === "VEHICLE_PEL_R04") {
      return `Trip ${tripInfo.tripId} • Vehicle ${vehicleId}`;
    }
    if (selectedOrder.startsWith("STOP_")) {
      const stopNum = selectedOrder.split("_")[1];
      const matchedStop = tripInfo.stops.find((s) => s.stopId === Number(stopNum));
      return matchedStop ? `${matchedStop.stopCode} / ${matchedStop.stopName}` : "Stop Level";
    }
    for (const stop of tripInfo.stops) {
      const order = stop.orders.find((o) => o.orderId === selectedOrder);
      if (order) {
        return `${stop.stopCode} / ${stop.stopName}`;
      }
    }
    return "OUT001 / Colpetty Retailer";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedIssues.length === 0) {
      setToast({
        type: "warning",
        title: "Select Issue Category",
        message: "Please select at least one issue category for this report.",
        duration: 4000,
      });
      return;
    }

    // Validation 1: Description required if "other" is one of the selected categories
    if (selectedIssues.includes("other") && !description.trim()) {
      setToast({
        type: "warning",
        title: "Issue Details Required",
        message: "You selected 'Other Issue'. Please describe and mention the specific issue details before submitting.",
        duration: 4500,
      });
      return;
    }

    // Validation 2: Order-related issue requires a valid order
    if (requiresOrderAny) {
      if (
        !selectedOrder ||
        selectedOrder === "" ||
        selectedOrder.startsWith("STOP_") ||
        selectedOrder.startsWith("VEHICLE_")
      ) {
        setToast({
          type: "warning",
          title: "Related Order Required",
          message: "One or more selected categories require an assigned order. Please select the specific order from the dropdown.",
          duration: 5000,
        });
        return;
      }
    }

    setIsSubmitting(true);
    const reportSeq = reports.length + 1;
    const reportId = `REP-${tripInfo.tripId}-${String(reportSeq).padStart(3, "0")}`;

    const categoriesList: IssueCategoryItem[] = selectedCategoryObjects.map((c) => ({
      id: c.id,
      label: c.label,
      icon: c.icon,
    }));

    const combinedLabel = selectedCategoryObjects.map((c) => c.label).join(", ");
    const combinedIcons = selectedCategoryObjects.map((c) => c.icon).join(" ");

    const newRecord: IssueReportRecord = {
      id: reportId,
      tripId: tripInfo.tripId,
      vehicleId,
      categoryId: primaryCategory.id,
      categoryLabel: combinedLabel,
      categoryIcon: combinedIcons,
      categories: categoriesList,
      relatedScope: getSelectedScopeDisplay(),
      orderId: selectedOrder.startsWith("STOP_") || selectedOrder.startsWith("VEHICLE_") ? undefined : selectedOrder,
      outletName: getTargetOutletName(),
      description: description.trim(),
      photo: photo ? { ...photo } : null,
      // Always starts Pending Sync - only flipped to Synced below once the
      // backend actually acknowledges the POST, never just because the
      // browser reports itself online.
      status: "Pending Sync",
      offlineCreated: connectionState === "offline",
      createdAt: new Date().toISOString(),
    };

    const persistReports = (list: IssueReportRecord[]) => {
      setReports(list);
      try {
        localStorage.setItem(LOCAL_STORAGE_REPORTS_KEY, JSON.stringify(list));
      } catch (err) {
        console.error("Failed to save report to localStorage:", err);
      }
    };

    setTimeout(async () => {
      const updatedReports = [newRecord, ...reports];
      persistReports(updatedReports);
      saveLocalIssueReport(newRecord).catch((err: unknown) =>
        console.error("Failed to save issue report to IndexedDB:", err)
      );
      if (connectionState !== "offline") {
        try {
          await postDriverIssue(newRecord);
          const syncedAt = new Date().toISOString();
          await updateIssueReportSyncStatus(newRecord.id, "Synced", syncedAt);
          persistReports(
            updatedReports.map((r) => (r.id === newRecord.id ? { ...r, status: "Synced", syncedAt } : r))
          );
        } catch (postErr) {
          console.warn("Direct postDriverIssue failed, will retry via background sync:", postErr);
        }
      }

      setIsSubmitting(false);
      setSubmittedReportId(reportId);
      setIsSubmitted(true);
      setToast({
        type: "success",
        title: "Report Submitted",
        message: `Issue report ${reportId} with ${selectedCategoryObjects.length} categories logged.`,
        duration: 4500,
      });
    }, 500);
  };

  const handleResetForNewReport = () => {
    setIsSubmitted(false);
    setSelectedIssues(["shortfall"]);
    setSelectedOrder("S1-001");
    setDescription("");
    setPhoto(null);
    setActiveTab("new");
  };

  const handleProceedNextStop = () => {
    router.push("/driver/today-run");
  };

  // Filtered reports for history tab
  const filteredReports = reports.filter((r) => {
    if (historyFilter === "all") return true;
    if (historyFilter === "synced") return r.status === "Synced";
    if (historyFilter === "pending") return r.status === "Pending Sync";
    return (
      r.categoryId === historyFilter ||
      (r.categories && r.categories.some((c: IssueCategoryItem) => c.id === historyFilter))
    );
  });

  return (
    <>
      {/* Hidden File Input for fallback upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Toastify-style Notification */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Direct Device Camera Modal */}
      <CameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handleCameraCapture}
        title="Capture Issue Photo — Device Camera"
      />

      {/* Read-Only Report Inspection Modal */}
      <ReportDetailsModal
        isOpen={!!selectedHistoryReport}
        onClose={() => setSelectedHistoryReport(null)}
        report={selectedHistoryReport}
      />

      {/* ══════════════════════════════════════════
          DESKTOP layout  (md+) — fluid, full-width
          ══════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col gap-6 p-6 lg:p-8 min-h-full max-w-6xl mx-auto w-full">
        {/* Navigation / Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-[#E2E8F0]">
          <div className="flex items-center gap-4">
            <Link
              href="/driver/current-stop"
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#202D2D] hover:bg-[#E2E8F0] transition-colors"
              aria-label="Back to Current Stop"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[#F97316] font-bold text-xs uppercase tracking-wider bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200">
                  Driver Issue Management
                </span>
                <span className="text-[#485563] font-bold text-sm">
                  Trip: {tripInfo.tripId} • Vehicle: {vehicleId}
                </span>
              </div>
              <h1 className="text-[#202D2D] font-extrabold text-2xl lg:text-3xl mt-1 m-0">
                {activeTab === "new" ? "Report Delivery Issue" : "Driver Report History"}
              </h1>
            </div>
          </div>

          {/* Current Trip & Vehicle Identification Pill */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Assigned Run
              </span>
              <span className="text-xs font-bold text-[#202D2D]">
                {tripInfo.tripId} ({tripInfo.planVersion})
              </span>
            </div>
            <div
              id="desktop-report-connectivity-pill"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
                connectionState === "offline"
                  ? "bg-orange-50 border-orange-200"
                  : connectionState === "syncing"
                  ? "bg-blue-50 border-blue-200"
                  : "bg-white border-[#CBD5E1]"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionState === "offline"
                    ? "bg-[#F97316]"
                    : connectionState === "syncing"
                    ? "bg-[#3B82F6] animate-pulse"
                    : "bg-[#22C55E]"
                }`}
              />
              <span
                className={`font-bold text-xs ${
                  connectionState === "offline"
                    ? "text-[#F97316]"
                    : connectionState === "syncing"
                    ? "text-[#3B82F6]"
                    : "text-[#22C55E]"
                }`}
              >
                {connectionState === "offline"
                  ? "Offline Mode"
                  : connectionState === "syncing"
                  ? "Syncing..."
                  : "Online"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Top Level Tabs: New Report | Report History ── */}
        <div className="flex items-center gap-2.5 p-2 bg-slate-100/90 rounded-2xl border border-slate-200 shrink-0 min-h-[56px]">
          <button
            type="button"
            onClick={() => setActiveTab("new")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none flex items-center gap-2 ${
              activeTab === "new"
                ? "bg-[#202D2D] text-white border-[#202D2D] shadow-sm"
                : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#202D2D]"
            }`}
          >
            <AlertTriangleIcon className="w-4 h-4" />
            <span>New Report</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-[#F97316] text-white border-[#F97316] shadow-sm"
                : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#F97316]"
            }`}
          >
            <HistoryIcon className="w-4 h-4" />
            <span>Report History ({reports.length})</span>
          </button>
        </div>

        {/* ── TAB 1: NEW REPORT ── */}
        {activeTab === "new" && (
          <>
            {isSubmitted ? (
              /* Report Submitted View */
              <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-8 sm:p-12 border border-[#E2E8F0] shadow-sm text-center gap-6 max-w-2xl mx-auto w-full my-auto">
                <div className="w-20 h-20 rounded-full bg-[#ECFDF5] border-2 border-[#22C55E] flex items-center justify-center shadow-lg">
                  <CheckIcon className="w-10 h-10 text-[#22C55E]" />
                </div>

                <div className="bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-2xl p-6 w-full flex flex-col gap-3 text-left">
                  <div className="flex items-center justify-between border-b border-green-200 pb-3">
                    <span className="text-xs font-bold text-green-800 uppercase tracking-wider">
                      Issue Report Logged ({selectedCategoryObjects.length} Categories)
                    </span>
                    <span className="font-mono font-bold text-xs bg-white px-2.5 py-0.5 rounded border border-green-300 text-green-900">
                      {submittedReportId}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div className="col-span-2">
                      <span className="text-slate-500 font-medium block">Selected Categories</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {selectedCategoryObjects.map((cat) => (
                          <span
                            key={cat.id}
                            className="font-bold text-[#F97316] bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200 flex items-center gap-1.5"
                          >
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Trip &amp; Vehicle</span>
                      <span className="font-bold text-[#202D2D] mt-0.5 block">
                        {tripInfo.tripId} • {vehicleId}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Related Scope / Order</span>
                      <span className="font-bold text-[#202D2D] mt-0.5 block">
                        {getSelectedScopeDisplay()}
                      </span>
                    </div>
                    {description && (
                      <div className="col-span-2 bg-white p-3 rounded-xl border border-green-200">
                        <span className="text-slate-500 font-medium block">Driver Notes</span>
                        <p className="font-medium text-slate-800 text-xs m-0 mt-1">
                          {description}
                        </p>
                      </div>
                    )}
                    {photo && (
                      <div className="col-span-2 flex items-center gap-2 text-green-800 font-bold text-xs bg-white p-2.5 rounded-xl border border-green-200">
                        <span>📷</span>
                        <span>Photo Evidence Attached: {photo.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full max-w-md">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSubmitted(false);
                      setActiveTab("history");
                    }}
                    className="flex-1 py-3.5 rounded-xl border-2 border-[#202D2D] text-[#202D2D] font-bold text-center text-sm hover:bg-[#202D2D] hover:text-white transition-all cursor-pointer"
                  >
                    View in Report History
                  </button>
                  <button
                    type="button"
                    onClick={handleResetForNewReport}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#F97316] hover:bg-[#ea6c0a] text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer border-none"
                  >
                    <span>+ Create Another</span>
                    <ArrowRightIcon className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            ) : (
              /* Report Submission Form */
              <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
                {/* Left Column (Trip Context & Multiple Issue Categories Selection) - 5 cols */}
                <div className="lg:col-span-5 flex flex-col gap-5 bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1]">
                  {/* Trip Context Card */}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Current Assigned Trip
                      </span>
                      <span className="text-[11px] font-bold text-[#15803D] bg-green-50 px-2 py-0.5 rounded border border-green-200">
                        Active Run
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-extrabold text-[#202D2D]">
                        {tripInfo.tripId}
                      </span>
                      <span className="text-sm font-bold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                        Vehicle: {vehicleId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 m-0">
                      Issue reports will be linked directly to Trip {tripInfo.tripId} and your vehicle manifest.
                    </p>
                  </div>

                  {/* Multi-Select Category selector */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#485563] font-bold text-xs uppercase tracking-wider">
                        1. ISSUE CATEGORIES <span className="text-red-500">*</span>
                      </span>
                      <span className="text-[11px] font-bold text-[#F97316] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                        {selectedIssues.length} Selected (Multi-select)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 m-0">
                      Select all categories that apply to this issue (e.g. Shortfall + Damaged Goods).
                    </p>

                    <div className="flex flex-col gap-2.5 mt-1">
                      {ISSUE_TYPES.map((issue) => {
                        const isSelected = selectedIssues.includes(issue.id);
                        return (
                          <button
                            key={issue.id}
                            type="button"
                            onClick={() => handleToggleCategory(issue.id)}
                            className={`flex items-center justify-between p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                              isSelected
                                ? "bg-[#FFF4ED] border-[#F97316] ring-1 ring-[#F97316]/30 shadow-sm"
                                : "bg-white border-[#CBD5E1] hover:bg-slate-50 hover:border-slate-400"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{issue.icon}</span>
                              <div className="flex flex-col">
                                <span
                                  className={`font-bold text-sm ${
                                    isSelected ? "text-[#202D2D]" : "text-[#485563]"
                                  }`}
                                >
                                  {issue.label}
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {issue.hint}
                                </span>
                              </div>
                            </div>
                            {/* Checkbox square */}
                            <div
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                isSelected
                                  ? "border-[#F97316] bg-[#F97316] text-white shadow-sm"
                                  : "border-[#CBD5E1] bg-white"
                              }`}
                            >
                              {isSelected && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Column (Related Order Dropdown, Details & Photo) - 7 cols */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1] flex flex-col gap-5">
                    {/* 2. Related Order Dropdown (Grouped by Stop/Outlet) */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor={orderSelectId}
                          className="text-xs font-bold text-[#485563] uppercase tracking-wider"
                        >
                          2. RELATED ORDER <span className="text-red-500">*</span>
                        </label>
                        {requiresOrderAny ? (
                          <span className="text-xs font-bold text-[#F97316] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                            Order Required
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">
                            Order / Stop / Vehicle Level
                          </span>
                        )}
                      </div>

                      <div className="relative">
                        <select
                          id={orderSelectId}
                          value={selectedOrder}
                          onChange={(e) => setSelectedOrder(e.target.value)}
                          className={`w-full p-3.5 bg-white rounded-xl text-sm font-semibold text-[#202D2D] border focus:outline-none transition-all cursor-pointer ${
                            requiresOrderAny &&
                            (!selectedOrder ||
                              selectedOrder.startsWith("STOP_") ||
                              selectedOrder.startsWith("VEHICLE_"))
                              ? "border-orange-400 ring-2 ring-orange-100 bg-orange-50/20"
                              : "border-[#CBD5E1] focus:border-[#F97316] hover:border-slate-400"
                          }`}
                        >
                          <option value="" disabled>
                            [ Select Order from Current Stop 1 ▼ ]
                          </option>

                          {/* CURRENT STOP 1 (OUT001) ORDERS ONLY */}
                          <optgroup label="📍 Stop 1 (OUT001 / Colpetty Retailer) Orders">
                            <option value="S1-000">
                              📦 Order S1-000 — 12 ambient units • 97.8 kg
                            </option>
                            <option value="S1-001">
                              📦 Order S1-001 — 80 chilled units • 448.6 kg
                            </option>
                          </optgroup>

                          {/* GENERAL / VEHICLE SCOPE */}
                          {!requiresOrderAny && (
                            <optgroup label="🚚 Stop / Vehicle Level">
                              <option value="STOP_1_ENTIRE">
                                🚪 Entire Stop 1 (OUT001 / Colpetty Retailer)
                              </option>
                              <option value="VEHICLE_PEL_R04">
                                🚚 Vehicle {vehicleId} / Trip {tripInfo.tripId} General Delay
                              </option>
                            </optgroup>
                          )}
                        </select>
                      </div>

                      <p className="text-xs text-slate-500 m-0">
                        {requiresOrderAny
                          ? "Showing only orders assigned to your current run (Trip S1-T001). Please select the affected order."
                          : selectedIssues.includes("vehicle")
                          ? `This issue is associated with your vehicle ${vehicleId} and trip manifest.`
                          : "You can associate this issue with a specific order or the entire stop."}
                      </p>
                    </div>

                    {/* 3. Description & Details */}
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="issue-description"
                          className="text-xs font-bold text-[#485563] uppercase tracking-wider"
                        >
                          3. DESCRIPTION / OBSERVATIONS
                        </label>
                        {selectedIssues.includes("other") ? (
                          <span className="text-red-600 font-bold text-xs bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            * Required for &apos;Other Issue&apos;
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal text-xs">(Optional)</span>
                        )}
                      </div>
                      <textarea
                        id="issue-description"
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={
                          selectedIssues.includes("other")
                            ? "Please mention the exact issue and describe it in detail (Required for Other Issue)..."
                            : selectedIssues.includes("shortfall")
                            ? "Describe quantity shortfall or missing SKU details for the selected order..."
                            : selectedIssues.includes("damaged")
                            ? "Describe damaged packaging, crushed cartons, or temperature issues..."
                            : selectedIssues.includes("access")
                            ? "Describe store closure, narrow access gate, or contact unreachability..."
                            : "Describe vehicle warning light, tire pressure, or traffic delay..."
                        }
                        className={`w-full p-3 bg-[#F9FAFB] rounded-xl text-sm text-[#202D2D] focus:outline-none transition-all ${
                          selectedIssues.includes("other") && !description.trim()
                            ? "border-2 border-orange-400 ring-2 ring-orange-100"
                            : "border border-[#CBD5E1] focus:border-[#F97316]"
                        }`}
                      />
                      {selectedIssues.includes("other") && !description.trim() && (
                        <p className="text-xs text-[#C2410C] font-semibold m-0 flex items-center gap-1.5 pt-0.5">
                          <AlertTriangleIcon className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                          <span>You selected &apos;Other Issue&apos;. Please provide a description before submitting.</span>
                        </p>
                      )}
                    </div>

                    {/* 4. Single Photo Evidence Section */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#485563] uppercase tracking-wider">
                          4. PHOTO EVIDENCE (OPTIONAL)
                        </span>
                        <span className="text-[11px] font-semibold text-[#F97316] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                          Camera Ready
                        </span>
                      </div>

                      {photo ? (
                        <div className="flex items-center justify-between p-3.5 bg-orange-50/70 border border-orange-300 rounded-xl">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={photo.url}
                              alt="Photo evidence preview"
                              className="w-12 h-12 rounded-lg object-cover border border-orange-300 shrink-0 shadow-sm"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-orange-950 truncate">
                                {photo.name}
                              </span>
                              <span className="text-[11px] text-green-700 font-semibold">
                                Photo Evidence Attached ✓
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowCameraModal(true)}
                              className="text-xs font-bold text-orange-700 hover:text-orange-900 px-2.5 py-1 bg-white border border-orange-200 rounded-md cursor-pointer"
                            >
                              Retake
                            </button>
                            <button
                              type="button"
                              onClick={() => setPhoto(null)}
                              className="text-xs font-bold text-red-600 hover:text-red-800 px-2.5 py-1 bg-white border border-red-200 rounded-md cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setShowCameraModal(true)}
                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-[#F97316] bg-orange-50/40 hover:bg-orange-50 text-[#F97316] font-bold text-xs cursor-pointer transition-colors active:scale-95"
                          >
                            <CameraIcon className="w-4 h-4 text-[#F97316]" />
                            <span>Take Photo (Camera)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#485563] font-semibold text-xs cursor-pointer transition-colors"
                          >
                            <span>Upload File</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <Link
                      href="/driver/current-stop"
                      className="flex-1 py-3.5 rounded-xl border-2 border-[#202D2D] text-[#202D2D] font-bold text-center text-sm hover:bg-[#202D2D] hover:text-white transition-all no-underline"
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-3.5 rounded-xl bg-[#F97316] hover:bg-[#ea6c0a] text-white font-bold text-sm shadow-md transition-all cursor-pointer border-none flex items-center justify-center gap-2 active:scale-95"
                    >
                      <AlertTriangleIcon className="w-4 h-4 text-white" />
                      <span>{isSubmitting ? "Submitting..." : "Submit Issue Report"}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </>
        )}

        {/* ── TAB 2: REPORT HISTORY ── */}
        {activeTab === "history" && (
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
                      Trip Reports Logged: {reports.length}
                    </span>
                    <span className="text-slate-300 text-xs">•</span>
                    <span className="text-xs text-[#485563] font-semibold">
                      Trip Plan {tripInfo.tripId}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#202D2D] mt-0.5 m-0">
                    Logged Issue Reports (Read-Only)
                  </h3>
                  <p className="text-xs text-[#485563] m-0 mt-0.5">
                    View verified issue reports, shortfall replacements, and cloud sync status for this vehicle.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("new")}
                  className="px-4 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#ea6c0a] text-white font-bold text-xs transition-colors cursor-pointer border-none shadow-sm flex items-center gap-1.5"
                >
                  <span>+ New Report</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs for History */}
            <div className="flex items-center gap-2 overflow-x-auto p-2 bg-slate-100/90 rounded-2xl border border-slate-200 shrink-0 min-h-[56px]">
              <button
                type="button"
                onClick={() => setHistoryFilter("all")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none ${
                  historyFilter === "all"
                    ? "bg-[#202D2D] text-white border-[#202D2D] shadow-sm"
                    : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#202D2D]"
                }`}
              >
                All Reports ({reports.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter("shortfall")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none ${
                  historyFilter === "shortfall"
                    ? "bg-[#F97316] text-white border-[#F97316] shadow-sm"
                    : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#F97316]"
                }`}
              >
                Shortfall ({reports.filter((r) => r.categoryId === "shortfall" || r.categories?.some((c: IssueCategoryItem) => c.id === "shortfall")).length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter("access")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none ${
                  historyFilter === "access"
                    ? "bg-[#F97316] text-white border-[#F97316] shadow-sm"
                    : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#F97316]"
                }`}
              >
                Access / Closed ({reports.filter((r) => r.categoryId === "access" || r.categories?.some((c: IssueCategoryItem) => c.id === "access")).length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter("synced")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 whitespace-nowrap leading-none ${
                  historyFilter === "synced"
                    ? "bg-[#15803D] text-white border-[#15803D] shadow-sm"
                    : "bg-white text-[#485563] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#15803D]"
                }`}
              >
                Synced ({reports.filter((r) => r.status === "Synced").length})
              </button>
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
                  <button
                    type="button"
                    onClick={() => setActiveTab("new")}
                    className="px-4 py-2 rounded-xl bg-[#F97316] hover:bg-[#ea6c0a] text-white font-bold text-xs cursor-pointer border-none shadow-sm mt-2"
                  >
                    Submit New Issue Report
                  </button>
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
                          {report.categoryIcon.split(" ")[0]}
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
                          onClick={() => setSelectedHistoryReport(report)}
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
        <DriverReportMobileView
          outletCode="OUT001"
          outletName="Colpetty Retailer"
          tripId="Trip A"
          stopSequence="Stop 1 of 4"
          vehicleId={vehicleId}
          selectedIssueType={ID_TO_FIGMA_MAP[selectedIssues[0]] || "Delivery Quantity Issue"}
          onSelectIssueType={(label: string) => {
            const mappedId = FIGMA_TO_ID_MAP[label] || "shortfall";
            setSelectedIssues([mappedId]);
            if (mappedId === "vehicle") {
              setSelectedOrder("VEHICLE_PEL_R04");
            } else if (mappedId === "shortfall" || mappedId === "damaged") {
              if (!selectedOrder || selectedOrder.startsWith("STOP_") || selectedOrder.startsWith("VEHICLE_")) {
                setSelectedOrder("S1-001");
              }
            }
          }}
          selectedOrder={selectedOrder}
          onSelectOrder={(ord: string) => setSelectedOrder(ord)}
          description={description}
          onChangeDescription={(desc: string) => setDescription(desc)}
          photo={photo}
          onTriggerPhotoCapture={() => setShowCameraModal(true)}
          onTriggerFileUpload={() => fileInputRef.current?.click()}
          onRemovePhoto={() => setPhoto(null)}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          isSubmitted={isSubmitted}
          submittedReportId={submittedReportId}
          submittedIssueTypeLabel={ID_TO_FIGMA_MAP[selectedIssues[0]] || "Delivery Quantity Issue"}
          onViewHistory={() => router.push("/driver/history")}
          onReturnToStop={() => router.push("/driver/current-stop")}
        />
      </div>
    </>
  );
}
