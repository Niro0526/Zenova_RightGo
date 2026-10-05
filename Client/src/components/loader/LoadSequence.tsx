"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircleIcon,
  ChevronLeftIcon,
} from "./icons";
import {
  fetchLoadingSequence,
  postLoadOrder,
  type LoadingSequenceResponse,
} from "@/lib/loader/loader-api";
import { ApiError } from "@/lib/api/client";

interface LoadSequenceProps {
  onNavigate?: (
    tab: "assigned-trips" | "load-sequence" | "trip-readiness" | "report-issue" | "review-changes" | "back"
  ) => void;
}

export default function LoadSequence({ onNavigate }: LoadSequenceProps) {
  const router = useRouter();
  const [tripDbId, setTripDbId] = useState<number | null>(null);
  const [sequence, setSequence] = useState<LoadingSequenceResponse | null>(null);
  const [sequenceError, setSequenceError] = useState<string | null>(null);
  const [markingStep, setMarkingStep] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const loadSequence = useCallback(async (id: number) => {
    try {
      const data = await fetchLoadingSequence(id);
      setSequenceError(null);
      setSequence(data);
    } catch (err) {
      setSequenceError(err instanceof ApiError ? err.message : "Cannot reach the RightGo server.");
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("tripId") || params.get("trip_id");
    const id = raw ? Number(raw) : NaN;
    if (!Number.isFinite(id)) {
      setSequenceError("No trip selected. Open a trip from Assigned Trips first.");
      return;
    }
    setTripDbId(id);
    void loadSequence(id);
  }, [loadSequence]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  const steps = sequence?.loadingSequence ?? [];
  const firstPendingIndex = steps.findIndex((s) => !s.allOrdersLoaded);
  const loadedStepsCount = steps.filter((s) => s.allOrdersLoaded).length;
  const allLoaded = steps.length > 0 && loadedStepsCount === steps.length;

  const markStepLoaded = async (stepIndex: number) => {
    const step = steps[stepIndex];
    if (!step || tripDbId === null) return;
    setMarkingStep(stepIndex);
    try {
      await Promise.all(
        step.orders.map((o) => postLoadOrder(tripDbId, o.orderRef, o.effectiveUnits ?? o.plannedUnits))
      );
      await loadSequence(tripDbId);
      showToast(`Stop ${step.deliveryStopRank} marked as Loaded.`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to mark stop as loaded.");
    } finally {
      setMarkingStep(null);
    }
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate("back");
    } else if (typeof window !== "undefined" && (window.history.state?.idx > 0 || window.history.length > 1)) {
      router.back();
    } else {
      router.push("/loader");
    }
  };

  const handleOpenReportIssue = () => {
    if (onNavigate) {
      onNavigate("report-issue");
    } else if (tripDbId !== null) {
      router.push(`/loader/report-issue?tripId=${tripDbId}`);
    } else {
      router.push("/loader/report-issue");
    }
  };

  const weightPct = sequence && sequence.vehicleWeightCapKg
    ? Math.min(100, (sequence.loadedWeightKg / sequence.vehicleWeightCapKg) * 100)
    : 0;
  const volumePct = sequence && sequence.vehicleVolumeCapM3
    ? Math.min(100, (sequence.loadedVolumeM3 / sequence.vehicleVolumeCapM3) * 100)
    : 0;

  const renderStepCard = (stepIndex: number, mobile: boolean) => {
    const step = steps[stepIndex];
    if (!step) return null;
    const isLoaded = step.allOrdersLoaded;
    const isActive = stepIndex === firstPendingIndex;
    const isPending = !isLoaded && !isActive;

    return (
      <div
        key={step.step}
        className={`bg-white rounded-xl p-4 lg:p-5 flex flex-col gap-3 shadow-sm transition-all ${
          isActive ? "border-2 border-[#F97316] shadow-orange-100 shadow-md" : "border border-[#CBD5E1]"
        }`}
      >
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {mobile && (
                <span className="w-6 h-6 bg-[#202D2D] text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  {step.deliveryStopRank}
                </span>
              )}
              <span className="font-jetbrains font-bold text-sm text-[#202D2D] bg-[#F1F5F9] px-2 py-0.5 rounded">
                {step.outletId}
              </span>
              {!mobile && (
                <span className={`font-semibold text-xs px-2 py-0.5 rounded ${isLoaded ? "bg-[#ECFDF5] text-[#059669]" : isActive ? "bg-[#FFF4ED] text-[#C2410C]" : "bg-[#F1F5F9] text-[#485563]"}`}>
                  Stop {step.deliveryStopRank} ({isLoaded ? "Loaded" : isActive ? "Currently Loading" : "Pending Stage"})
                </span>
              )}
            </div>
            <h3 className="text-[15px] font-bold text-[#202D2D] leading-[22px] m-0">{step.outletName}</h3>
            <p className="text-xs text-[#485563] leading-[18px] m-0 font-normal">
              {step.orders.length} order{step.orders.length === 1 ? "" : "s"} • {step.weightKg.toLocaleString()} kg
            </p>
          </div>

          {isLoaded ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#ECFDF5] text-[#22C55E] border border-[#A7F3D0]/60 shrink-0">
              <CheckCircleIcon className="w-4 h-4" />
              <span>Loaded</span>
            </div>
          ) : isActive ? (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="bg-[#F9FAFB] hover:bg-red-50 border border-[#CBD5E1] hover:border-[#EF4444] text-[#485563] hover:text-[#EF4444] text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                onClick={handleOpenReportIssue}
              >
                Report Issue
              </button>
              <button
                type="button"
                disabled={markingStep === stepIndex}
                className="bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-xs"
                onClick={() => void markStepLoaded(stepIndex)}
              >
                {markingStep === stepIndex ? "Marking..." : "Mark Loaded"}
              </button>
            </div>
          ) : (
            <div className="flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F1F5F9] text-[#475569] shrink-0">
              <span>Pending Stage</span>
            </div>
          )}
        </div>

        {!mobile && (
          <div className="flex flex-col gap-2.5 w-full mt-1">
            {step.orders.map((o) => (
              <div key={o.orderRef} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-bold text-[#202D2D] leading-5 m-0 font-jetbrains">
                    Order {o.orderRef}
                  </span>
                  <span className="text-[11px] font-semibold text-[#485563] bg-white border border-[#E2E8F0] px-2 py-0.5 rounded-md">
                    {o.tempRequirement}
                  </span>
                </div>
                <p className="text-xs text-[#485563] leading-[18px] m-0">
                  {o.plannedUnits} units • {o.weightKg.toLocaleString()} kg • {o.volumeM3} m&sup3; • {o.brand}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const tripLabel = sequence?.tripId || "-";

  return (
    <main className="w-full max-w-full overflow-x-hidden bg-[#F9FAFB] flex flex-col box-border">
      {/* Mobile Top Navigation Bar */}
      <div className="flex lg:hidden items-center justify-between px-4 h-14 bg-white border-b border-[#CBD5E1] sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="p-1 text-[#202D2D] hover:bg-gray-100 rounded-md transition-colors"
            onClick={handleBack}
            title="Back"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-[#202D2D] leading-[27px] m-0">Load Sequence</h1>
        </div>
        <span className="bg-[#202D2D] text-white font-inter text-[11px] font-bold px-2 py-1 rounded-md">
          {tripLabel}
        </span>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-[#202D2D] text-white px-4 py-2 rounded-md text-xs font-semibold z-50 shadow-lg">
          {notification}
        </div>
      )}

      {/* Content Container */}
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 box-border p-4 lg:p-0">
        {sequenceError && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {sequenceError}
          </div>
        )}

        {/* Desktop Header */}
        <div className="hidden lg:flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-slate-900 leading-tight m-0">
              Load Sequence - Trip {tripLabel}
            </h1>
            <p className="text-sm text-slate-500 mt-1 m-0 font-normal">
              Vehicle {sequence?.vehicleId || "-"} • Departure {sequence?.plannedDepartureTime || "-"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-[#ECFDF5] text-[#22C55E] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#A7F3D0]/60">
              LIFO Mode Active
            </span>
          </div>
        </div>

        {sequence && (
          <>
            {/* DESKTOP TWO-COLUMN RESPONSIVE LAYOUT */}
            <div className="hidden lg:flex flex-col lg:flex-row gap-6 w-full items-start">
              {/* Left Column: LIFO Sequence Queue */}
              <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
                <div className="flex justify-between items-center pb-1">
                  <div>
                    <h2 className="text-[17px] font-bold text-[#202D2D] leading-[24px] m-0">
                      Loading Sequence (LIFO Order)
                    </h2>
                    <p className="text-xs text-[#485563] m-0">
                      Load last-delivered stops first. Mark each stop loaded once staged.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#485563] bg-[#F1F5F9] px-2.5 py-1 rounded-md">
                    <span>{loadedStepsCount} of {steps.length} Stops Loaded</span>
                  </div>
                </div>

                {/* Sequence Progress Bar */}
                <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden flex">
                  {steps.map((s) => (
                    <div
                      key={s.step}
                      className={`h-full transition-all ${s.allOrdersLoaded ? "bg-[#22C55E]" : "bg-[#CBD5E1]"}`}
                      style={{ width: `${100 / Math.max(steps.length, 1)}%` }}
                    ></div>
                  ))}
                </div>

                <div className="flex flex-col gap-3.5 w-full">
                  {steps.map((_, idx) => renderStepCard(idx, false))}
                </div>
              </div>

              {/* Right Column */}
              <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col gap-5">
                <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 flex flex-col gap-4 shadow-sm">
                  <div className="flex justify-between items-center pb-2.5 border-b border-[#F1F5F9]">
                    <div>
                      <h3 className="text-sm font-bold text-[#202D2D] m-0">Payload & Weight Distribution</h3>
                      <p className="text-xs text-[#485563] m-0">Gross Vehicle Limits</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${weightPct <= 100 && volumePct <= 100 ? "text-[#059669] bg-[#ECFDF5]" : "text-[#DC2626] bg-[#FEF2F2]"}`}>
                      {weightPct <= 100 && volumePct <= 100 ? "WITHIN LIMITS" : "OVER LIMIT"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3.5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-[#485563]">Current Loaded Weight:</span>
                        <span className="font-bold text-[#202D2D] font-jetbrains">
                          {sequence.loadedWeightKg.toLocaleString()} / {sequence.vehicleWeightCapKg?.toLocaleString() ?? "-"} kg Max
                        </span>
                      </div>
                      <div className="w-full bg-[#E2E8F0] h-3 rounded-full overflow-hidden">
                        <div className="bg-[#22C55E] h-full transition-all duration-500 rounded-full" style={{ width: `${weightPct}%` }}></div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-[#485563]">Cubic Volume Utilisation:</span>
                        <span className="font-bold text-[#202D2D] font-jetbrains">
                          {sequence.loadedVolumeM3} / {sequence.vehicleVolumeCapM3 ?? "-"} m&sup3; Max
                        </span>
                      </div>
                      <div className="w-full bg-[#E2E8F0] h-3 rounded-full overflow-hidden">
                        <div className="bg-[#3B82F6] h-full transition-all duration-500 rounded-full" style={{ width: `${volumePct}%` }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#F1F5F9] flex flex-col gap-2">
                    <span className="text-xs font-bold text-[#202D2D]">Weight Allocation per Stop</span>
                    <div className="flex flex-col gap-1.5 text-xs">
                      {steps.map((s) => (
                        <div
                          key={s.step}
                          className={`flex justify-between items-center p-2 rounded-lg border transition-all ${
                            s.allOrdersLoaded
                              ? "bg-[#ECFDF5] border-[#A7F3D0]/60 text-[#065F46]"
                              : "bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]"
                          }`}
                        >
                          <span className="font-medium">Stop {s.deliveryStopRank} · {s.outletName}</span>
                          <span className="font-jetbrains font-bold">
                            {s.weightKg.toLocaleString()} kg {s.allOrdersLoaded ? "OK" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 flex flex-col gap-3 shadow-sm">
                  <div className="flex justify-between items-center pb-2 border-b border-[#F1F5F9]">
                    <span className="text-xs font-bold text-[#485563] uppercase tracking-wide">Next Workflow Step</span>
                  </div>

                  <p className="text-xs text-[#485563] leading-relaxed m-0">
                    {allLoaded ? (
                      <span className="text-[#059669] font-semibold">
                        All {steps.length} stops loaded and verified in LIFO sequence! Proceed to <strong>Trip Readiness</strong> to run departure gate checks and manifest validation.
                      </span>
                    ) : (
                      <>
                        Once all {steps.length} stops are confirmed loaded in LIFO order, proceed to <strong>Trip Readiness</strong> to run departure gate checks and manifest validation.
                      </>
                    )}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigate) onNavigate("trip-readiness");
                      else router.push(`/loader/trip-readiness${tripDbId !== null ? `?tripId=${tripDbId}` : ""}`);
                    }}
                    className={`w-full py-3 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${
                      allLoaded ? "bg-[#22C55E] hover:bg-[#16A34A] shadow-[#22C55E]/20" : "bg-[#202D2D] hover:bg-[#334155]"
                    }`}
                  >
                    <span>Go to Trip Readiness Verification</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              </div>
            </div>

            {/* MOBILE SEQUENTIAL LAYOUT */}
            <div className="flex lg:hidden flex-col gap-3 w-full">
              <div className="flex flex-col p-3 gap-1 bg-white border border-[#CBD5E1] rounded-xl">
                <h2 className="text-sm font-bold text-[#202D2D] leading-[21px] m-0">
                  Loading Sequence (LIFO Order)
                </h2>
                <p className="text-xs text-[#485563] leading-[18px] m-0 font-normal">
                  Load last-delivered stops first.
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full">
                {steps.map((_, idx) => renderStepCard(idx, true))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
