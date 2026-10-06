"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeftIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  CircleXIcon,
  CircleOutlineIcon,
  InfoIcon,
} from "./icons";
import {
  fetchTripReadiness,
  fetchLoadingIssues,
  fetchLatestManifest,
  postDepartTrip,
  postMarkTripReady,
  postAckManifest,
  type TripReadiness as TripReadinessData,
  type LoadingIssue,
  type ManifestResponse,
} from "@/lib/loader/loader-api";
import { ApiError } from "@/lib/api/client";

interface TripReadinessProps {
  onNavigate?: (tab: "assigned-trips" | "load-sequence" | "trip-readiness" | "report-issue" | "back") => void;
}

function formatReportTime(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function TripReadiness({ onNavigate }: TripReadinessProps) {
  const router = useRouter();
  const [tripDbId, setTripDbId] = useState<number | null>(null);
  const [readiness, setReadiness] = useState<TripReadinessData | null>(null);
  const [manifest, setManifest] = useState<ManifestResponse | null>(null);
  const [issues, setIssues] = useState<LoadingIssue[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDeparting, setIsDeparting] = useState(false);
  const [isAcking, setIsAcking] = useState(false);

  const load = useCallback(async (id: number) => {
    try {
      const r = await fetchTripReadiness(id);
      setReadiness(r);
      const m = await fetchLatestManifest();
      setManifest(m);
      const allIssues = m ? await fetchLoadingIssues(m.version) : [];
      setIssues(allIssues.filter((i) => i.vehicle_id === r.vehicleId && i.trip_no === r.tripNo));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Cannot reach the RightGo server.");
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("tripId") || params.get("trip_id");
    const id = raw ? Number(raw) : NaN;
    if (!Number.isFinite(id)) {
      setLoadError("No trip selected. Open a trip from Assigned Trips first.");
      return;
    }
    setTripDbId(id);
    void load(id);
  }, [load]);

  const unresolvedIssues = issues.filter((i) => i.status === "open" || i.status === "escalated");
  const latestIssue = issues[0] ?? null;
  const activeIssue = unresolvedIssues[0] ?? null;
  const isHeld = unresolvedIssues.length > 0;
  const expectedCount = readiness?.totalOrders ?? 0;
  const loadedCount = readiness?.loadedOrders ?? 0;
  const ordersVerified = expectedCount > 0;
  const loadingVerified = expectedCount > 0 && loadedCount === expectedCount;
  const manifestAcknowledged = manifest?.acknowledgement === "acknowledged";
  const isReady = !!readiness?.isReady;

  const checklistItems = [
    {
      label: `Expected orders: ${expectedCount}`,
      detail: ordersVerified ? `All ${expectedCount} delivery orders assigned to this trip` : "No delivery orders assigned",
      verified: ordersVerified,
    },
    {
      label: `Loaded: ${loadedCount} of ${expectedCount}`,
      detail: loadingVerified ? "All sequence items are loaded" : "Loading not yet complete",
      verified: loadingVerified,
    },
    {
      label: `Open loading issues: ${unresolvedIssues.length}`,
      detail: unresolvedIssues.length ? "Must be resolved before departure" : "No open issue reports",
      verified: unresolvedIssues.length === 0,
    },
    {
      label: `Manifest v${manifest?.version ?? "-"} acknowledgement`,
      detail: manifestAcknowledged ? "Manifest acknowledged by loader" : "Awaiting loader acknowledgement",
      verified: manifestAcknowledged,
    },
  ];
  const checklistPassed = checklistItems.filter((c) => c.verified).length;

  const handleBack = () => {
    if (onNavigate) onNavigate("back");
    else if (typeof window !== "undefined" && (window.history.state?.idx > 0 || window.history.length > 1)) router.back();
    else router.push("/loader");
  };

  const handleAck = async () => {
    if (!manifest) return;
    setIsAcking(true);
    try {
      const updated = await postAckManifest(manifest.version);
      setManifest(updated);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to acknowledge manifest.");
    } finally {
      setIsAcking(false);
    }
  };

  const handleMarkReady = async () => {
    if (tripDbId === null) return;
    setIsDeparting(true);
    try {
      await postMarkTripReady(tripDbId);
      await load(tripDbId);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to mark trip ready.");
    } finally {
      setIsDeparting(false);
    }
  };

  const isTripReady = readiness?.loadingStatus === "ready";
  const alreadyDeparted = readiness?.loadingStatus === "departed" || readiness?.loadingStatus === "completed";
  const canMarkReady = isReady && !isTripReady && !alreadyDeparted;

  return (
    <main className="w-full max-w-full overflow-x-hidden bg-[#F9FAFB] flex flex-col box-border">
      {/* Mobile Top Navigation Bar */}
      <div className="flex lg:hidden items-center justify-between px-4 h-14 bg-white border-b border-[#CBD5E1] sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button type="button" className="p-1 text-[#202D2D] hover:bg-gray-100 rounded-md transition-colors" onClick={handleBack} title="Back">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-[#202D2D] leading-[27px] m-0">Trip Readiness</h1>
        </div>
        {manifest && (
          <span className="bg-[#ECFDF5] text-[#22C55E] font-inter text-[11px] font-bold px-2 py-1 rounded-md">
            Plan v{manifest.version}
          </span>
        )}
      </div>

      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 box-border p-4 lg:p-0">
        {loadError && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {loadError}
          </div>
        )}

        {/* Desktop Header */}
        <div className="hidden lg:flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-slate-900 leading-tight m-0">
              Trip Readiness - {readiness?.vehicleId ?? "Vehicle"} / {readiness?.tripId ?? "-"}
            </h1>
            <p className="text-sm text-slate-500 mt-1 m-0 font-normal">Final departure verification checklist</p>
          </div>
        </div>

        {readiness && (
          <div className="hidden lg:flex flex-col lg:flex-row gap-6 w-full items-start">
            {/* Left Column */}
            <div className="flex-1 min-w-0 w-full flex flex-col gap-6">
              <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-4 shadow-sm">
                <div className="flex justify-between items-center pb-3 border-b border-[#F1F5F9]">
                  <div>
                    <h2 className="text-[17px] lg:text-[18px] font-bold text-[#202D2D] leading-[24px] m-0">Readiness Checklist</h2>
                    <p className="text-xs text-[#485563] m-0">Mandatory pre-departure gate pass validation</p>
                  </div>
                  <span className="bg-[#FFF4ED] text-[#F97316] text-xs font-bold px-2.5 py-1 rounded-full">
                    {checklistPassed} of {checklistItems.length} Passed
                  </span>
                </div>

                <div className="flex flex-col gap-3 w-full">
                  {checklistItems.map((item) => (
                    <div
                      key={item.label}
                      className={`flex justify-between items-center p-3.5 rounded-xl border transition-all hover:shadow-xs ${
                        item.verified ? "bg-[#ECFDF5] border-[#A7F3D0]/50" : "bg-[#FEF2F2] border-[#FECACA]/60"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className={`text-sm font-semibold ${item.verified ? "text-[#065F46]" : "text-[#991B1B]"}`}>{item.label}</span>
                        <span className={`text-[11px] ${item.verified ? "text-[#047857]" : "text-[#B91C1C]"}`}>{item.detail}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${item.verified ? "bg-[#D1FAE5] text-[#047857]" : "bg-[#FEE2E2] text-[#B91C1C]"}`}>
                          {item.verified ? "VERIFIED" : "PENDING"}
                        </span>
                        <span className={`w-6 h-6 rounded-full text-white flex items-center justify-center font-bold text-xs ${item.verified ? "bg-[#10B981]" : "bg-[#EF4444]"}`}>
                          {item.verified ? "✓" : "✗"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!manifestAcknowledged && manifest && (
                    <button
                      type="button"
                      disabled={isAcking}
                      onClick={() => void handleAck()}
                      className="self-start bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-xs"
                    >
                      {isAcking ? "Acknowledging..." : `Acknowledge Manifest v${manifest.version}`}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col gap-6">
              <div className="bg-[#FFF4ED] border-2 border-[#F59E0B] rounded-xl p-5 lg:p-6 flex flex-col gap-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                      <AlertTriangleIcon className="w-5 h-5" />
                    </div>
                    <span className="text-base font-bold text-[#B45309] leading-tight">
                      {isHeld ? "Loading Issue - Trip Held" : "All Clear - Ready to Depart"}
                    </span>
                  </div>
                  <span className="bg-[#F59E0B] text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                    {isHeld ? "OPEN" : "CLEAR"}
                  </span>
                </div>
                <p className="text-[13px] text-[#485563] leading-relaxed m-0 font-normal">
                  {activeIssue
                    ? `${activeIssue.issue_type} on order ${activeIssue.order_ref} (${activeIssue.units_affected} units affected). Dispatcher review required before departure.`
                    : latestIssue
                    ? `Latest issue report is ${latestIssue.status}. No unresolved issues remain for this trip.`
                    : "No issues reported."}
                </p>
                {latestIssue && (
                  <div className="flex flex-col gap-1 pt-1 border-t border-[#FED7AA]/60 text-xs text-[#78350F]">
                    <div className="flex justify-between">
                      <span>Reported by:</span>
                      <span className="font-semibold">{latestIssue.reported_by}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Report Time:</span>
                      <span className="font-jetbrains font-semibold">{formatReportTime(latestIssue.reported_at)}</span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (onNavigate) onNavigate("report-issue");
                    else router.push(`/loader/report-issue${tripDbId !== null ? `?tripId=${tripDbId}` : ""}`);
                  }}
                  className="mt-1 w-full py-2.5 bg-white hover:bg-orange-50 text-[#C2410C] border border-[#FDBA74] rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span>Report / Review Loading Issue</span>
                  <span>&rarr;</span>
                </button>
              </div>

              <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-3 shadow-sm">
                <div className="flex justify-between items-center pb-2.5 border-b border-[#F1F5F9]">
                  <span className="text-xs font-bold text-[#485563] uppercase tracking-wide">Gate Departure Release</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${alreadyDeparted || isTripReady ? "text-[#059669] bg-[#ECFDF5]" : canMarkReady ? "text-[#0284C7] bg-[#F0F9FF]" : "text-[#EF4444] bg-[#FEF2F2]"}`}>
                    {alreadyDeparted ? "DEPARTED" : isTripReady ? "TRIP READY" : canMarkReady ? "READY TO MARK" : "GATE LOCKED"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col">
                    <span className="text-[#64748B]">Trip:</span>
                    <span className="font-bold text-[#202D2D]">{readiness.tripId}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#64748B]">Vehicle:</span>
                    <span className="font-bold text-[#202D2D]">{readiness.vehicleId}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#64748B]">Leave By:</span>
                    <span className="font-bold text-[#202D2D]">{readiness.leaveByTime || "-"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#64748B]">Status:</span>
                    <span className="font-bold text-[#202D2D] capitalize">{readiness.loadingStatus}</span>
                  </div>
                  {(isReady || alreadyDeparted) && readiness.otpCode && (
                    <div className="flex flex-col sm:col-span-2">
                      <span className="text-[#64748B]">Driver unlock code (give to {readiness.vehicleId} driver):</span>
                      <span className="font-bold text-[#202D2D] tracking-[0.3em] text-base">{readiness.otpCode}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <button
                    type="button"
                    disabled={!canMarkReady || isDeparting}
                    onClick={() => void handleMarkReady()}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2 transition-colors ${
                      canMarkReady && !isDeparting
                        ? "bg-[#22C55E] hover:bg-[#16A34A] text-white cursor-pointer shadow-sm"
                        : isTripReady
                        ? "bg-[#ECFDF5] border border-[#22C55E] text-[#15803D] cursor-default"
                        : "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed select-none"
                    }`}
                  >
                    <span>
                      {alreadyDeparted
                        ? "Trip Departed (On Road)"
                        : isTripReady
                        ? "Trip Ready (Handed off to Driver)"
                        : isDeparting
                        ? "Marking Ready..."
                        : "Mark Trip Ready"}
                    </span>
                  </button>
                  <p className="text-[11px] font-medium leading-4 text-center m-0">
                    {alreadyDeparted ? (
                      <span className="text-[#64748B]">This trip has departed and is currently in transit.</span>
                    ) : isTripReady ? (
                      <span className="text-[#15803D]">Trip marked ready! Assigned driver can now start trip in Current Stop flow.</span>
                    ) : canMarkReady ? (
                      <span className="text-[#15803D]">All readiness checks passed. Ready to mark trip ready for driver.</span>
                    ) : (
                      <span className="text-[#EF4444]">Cannot mark ready until all checklist items are complete.</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MOBILE LAYOUT */}
        {readiness && (
          <div className="flex lg:hidden flex-col gap-4 w-full">
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-bold text-[#202D2D] leading-[21px] m-0">Readiness Checklist</h2>
              <div className="bg-white rounded-xl p-4 shadow-[0px_4px_12px_rgba(15,23,42,0.03)] flex flex-col">
                {checklistItems.map((item, idx) => (
                  <div key={item.label} className={`flex justify-between items-center py-2 ${idx < checklistItems.length - 1 ? "border-b border-[#CBD5E1]" : ""}`}>
                    <span className="text-sm font-medium text-[#485563]">{item.label}</span>
                    <div className={`flex items-center gap-1.5 ${item.verified ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                      <span className="text-sm font-semibold">{item.verified ? "Verified" : "Pending"}</span>
                      {item.verified ? <CheckCircleIcon className="w-4 h-4" /> : <CircleXIcon className="w-4 h-4" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isHeld && (
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-bold text-[#202D2D] leading-[21px] m-0">Open Issue</h2>
                <div className="bg-[#FFF4ED] border border-[#F59E0B] rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-[#FFF4ED] text-[#F59E0B] font-inter text-[11px] font-bold px-2 py-1 rounded border border-[#F59E0B]/30 shrink-0">
                      {activeIssue?.issue_type?.toUpperCase() ?? "ISSUE"}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-[#202D2D] leading-5">
                        {activeIssue ? `${activeIssue.units_affected} units affected on ${activeIssue.order_ref}` : "Unresolved issue"}
                      </span>
                    </div>
                  </div>
                  <div className="w-full border-t border-dashed border-[#F59E0B]" />
                  <div className="flex items-center gap-2 text-[#F59E0B]">
                    <InfoIcon className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-medium text-[#F59E0B] leading-[18px]">Dispatcher review required.</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                disabled={!canMarkReady || isDeparting}
                onClick={() => void handleMarkReady()}
                className={`w-full h-12 rounded-full font-bold text-[15px] flex items-center justify-center shadow-sm ${
                  canMarkReady && !isDeparting
                    ? "bg-[#22C55E] text-white cursor-pointer"
                    : isTripReady
                    ? "bg-[#ECFDF5] border border-[#22C55E] text-[#15803D] cursor-default"
                    : "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed select-none"
                }`}
              >
                {alreadyDeparted
                  ? "Trip Departed (On Road)"
                  : isTripReady
                  ? "Trip Ready (Handed off to Driver)"
                  : isDeparting
                  ? "Marking Ready..."
                  : "Mark Trip Ready"}
              </button>
              <p className="text-[13px] font-medium text-center leading-5 m-0">
                {alreadyDeparted ? (
                  <span className="text-[#64748B]">This trip has departed and is currently in transit.</span>
                ) : isTripReady ? (
                  <span className="text-[#15803D]">Trip marked ready! Assigned driver can start trip now.</span>
                ) : canMarkReady ? (
                  <span className="text-[#15803D]">All readiness checks passed. Ready to mark trip ready.</span>
                ) : (
                  <span className="text-[#EF4444]">Cannot mark ready until all checklist items are complete.</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
