"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
} from "./icons";

interface LoadSequenceProps {
  onNavigate?: (
    tab: "assigned-trips" | "load-sequence" | "trip-readiness" | "report-issue" | "review-changes" | "back"
  ) => void;
}

export default function LoadSequence({ onNavigate }: LoadSequenceProps) {
  const router = useRouter();
  const [stop2Loaded, setStop2Loaded] = useState<boolean>(false);
  const [stop1Loaded, setStop1Loaded] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const handleBack = () => {
    if (onNavigate) {
      onNavigate("back");
    } else {
      if (typeof window !== "undefined" && (window.history.state?.idx > 0 || window.history.length > 1)) {
        router.back();
      } else {
        router.push("/loader");
      }
    }
  };

  const handleOpenReportIssue = () => {
    if (onNavigate) {
      onNavigate("report-issue");
    } else {
      router.push("/loader/report-issue");
    }
  };

  const handleOpenReviewChanges = () => {
    if (onNavigate) {
      onNavigate("review-changes");
    } else {
      router.push("/loader/review-changes");
    }
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  return (
      <main className="flex-1 md:ml-[220px] lg:ml-[240px] bg-[#F9FAFB] min-h-screen flex flex-col w-full overflow-x-hidden pb-[85px] md:pb-12">
        {/* Mobile Top Navigation Bar (< Load Sequence  [PEL-R04]) */}
        <div className="flex md:hidden items-center justify-between px-5 h-14 bg-white border-b border-[#CBD5E1]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="p-1 text-[#202D2D] hover:bg-gray-100 rounded-md transition-colors"
              onClick={handleBack}
              title="Back"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-[#202D2D] leading-[27px] m-0">
              Load Sequence
            </h1>
          </div>
          <span className="bg-[#202D2D] text-white font-inter text-[11px] font-bold px-2 py-1 rounded-md">
            PEL-R04
          </span>
        </div>

        {/* Mobile Plan v2 Banner */}
        <div className="flex md:hidden justify-between items-center px-4 py-3 bg-[#FFF4ED] border-y border-[#F59E0B]">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="w-[18px] h-[18px] text-[#F59E0B]" />
            <span className="text-[13px] font-semibold text-[#F59E0B] m-0">
              Plan v2 - 1 change
            </span>
          </div>
          <button
            type="button"
            className="bg-[#F97316] hover:bg-[#EA580C] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-md transition-colors"
            onClick={handleOpenReviewChanges}
          >
            Review
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-[#202D2D] text-white px-4 py-2 rounded-md text-xs font-semibold z-50 shadow-lg">
            {notification}
          </div>
        )}

        {/* Content Container - Full Screen Width */}
        <div className="w-full p-4 md:p-6 lg:p-8 flex flex-col gap-5 box-border">
          {/* Desktop Header */}
          <div className="hidden md:flex justify-between items-center pb-4 border-b border-[#CBD5E1]">
            <div className="flex flex-col gap-1">
              <h1 className="text-[22px] lg:text-2xl font-bold text-[#202D2D] leading-[33px] m-0">
                Load Sequence - Trip PEL-R04 / S1-T001
              </h1>
              <p className="text-[13px] lg:text-sm text-[#485563] leading-5 m-0 font-normal">
                Vehicle PEL-R04 (Refrigerated Truck) · Plan v1 · Departure 05:30 · Dock Bay 04
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-[#ECFDF5] text-[#22C55E] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#A7F3D0]/60">
                LIFO Mode Active
              </span>
              <span className="bg-[#202D2D] text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                Bay 04
              </span>
            </div>
          </div>

          {/* Desktop Plan v2 Callout Banner */}
          <div className="hidden md:flex justify-between items-center p-3.5 bg-[#FEF3C7] border border-[#FDE68A] rounded-xl shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangleIcon className="w-5 h-5 text-[#F59E0B] shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#92400E] m-0">
                  Plan v2 update available — 1 order adjustment pending
                </span>
                <span className="text-xs text-[#B45309]">
                  Route re-sequencing proposed by dispatch for Colombo corridor
                </span>
              </div>
            </div>
            <div>
              <button
                type="button"
                className="bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-xs"
                onClick={handleOpenReviewChanges}
              >
                Review Changes
              </button>
            </div>
          </div>

          {/* DESKTOP TWO-COLUMN FULL-WIDTH LAYOUT */}
          <div className="hidden md:grid md:grid-cols-12 gap-6 w-full items-start">
            {/* Left Column: LIFO Sequence Queue (col-span-7) */}
            <div className="md:col-span-6 lg:col-span-7 flex flex-col gap-4">
              <div className="flex justify-between items-center pb-1">
                <div>
                  <h2 className="text-[17px] font-bold text-[#202D2D] leading-[24px] m-0">
                    Loading Sequence (LIFO Order)
                  </h2>
                  <p className="text-xs text-[#485563] m-0">
                    Load last-delivered stops first. Scan parcel barcode to verify sequence.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#485563] bg-[#F1F5F9] px-2.5 py-1 rounded-md">
                  <span>{stop1Loaded ? "3 of 3" : stop2Loaded ? "2 of 3" : "1 of 3"} Stops Loaded</span>
                </div>
              </div>

              {/* Sequence Progress Bar */}
              <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden flex">
                <div className="bg-[#22C55E] h-full w-1/3 transition-all"></div>
                <div className={`h-full w-1/3 transition-all ${stop2Loaded ? "bg-[#22C55E]" : "bg-[#F97316] animate-pulse"}`}></div>
                <div className={`h-full w-1/3 transition-all ${stop1Loaded ? "bg-[#22C55E]" : stop2Loaded ? "bg-[#F97316] animate-pulse" : "bg-[#CBD5E1]"}`}></div>
              </div>

              {/* Sequence Cards List */}
              <div className="flex flex-col gap-3.5 w-full">
                {/* STOP 3: Mount Lavinia Super (Loaded) */}
                <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-jetbrains font-bold text-sm text-[#202D2D] bg-[#F1F5F9] px-2 py-0.5 rounded">
                          OUT003
                        </span>
                        <span className="font-semibold text-xs text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded">
                          Stop 3 (Load First • Cab Front)
                        </span>
                      </div>
                      <h3 className="text-[15px] font-bold text-[#202D2D] leading-[22px] m-0">
                        Mount Lavinia Super
                      </h3>
                      <p className="text-xs text-[#485563] leading-[18px] m-0 font-normal">
                        1 order • 520 kg • Chilled zone (+2°C to +4°C) • 4 cases
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#ECFDF5] text-[#22C55E] border border-[#A7F3D0]/60 shrink-0">
                      <CheckCircleIcon className="w-4 h-4" />
                      <span>Loaded</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#F1F5F9] flex justify-between items-center text-[11px] text-[#64748B]">
                    <span>Compartment: Deep Front Section (Bay #01)</span>
                    <span className="text-[#059669] font-semibold">Barcode Verified ✓</span>
                  </div>
                </div>

                {/* STOP 2: Nugegoda Corner Store (Active Loading -> Loaded) */}
                <div
                  className={`bg-white rounded-xl p-5 flex flex-col gap-3 shadow-sm transition-all ${
                    !stop2Loaded
                      ? "border-2 border-[#F97316] shadow-orange-100 shadow-md"
                      : "border border-[#CBD5E1]"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-jetbrains font-bold text-sm text-[#202D2D] bg-[#F1F5F9] px-2 py-0.5 rounded">
                          OUT002
                        </span>
                        <span className={`font-semibold text-xs px-2 py-0.5 rounded ${!stop2Loaded ? "bg-[#FFF4ED] text-[#C2410C]" : "bg-[#ECFDF5] text-[#059669]"}`}>
                          Stop 2 ({!stop2Loaded ? "Currently Loading • Mid Bay" : "Loaded"})
                        </span>
                      </div>
                      <h3 className="text-[15px] font-bold text-[#202D2D] leading-[22px] m-0">
                        Nugegoda Corner Store
                      </h3>
                      <p className="text-xs text-[#485563] leading-[18px] m-0 font-normal">
                        1 order • 150 kg • Ambient zone • 2 cases
                      </p>
                    </div>

                    {stop2Loaded ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#ECFDF5] text-[#22C55E] border border-[#A7F3D0]/60 shrink-0">
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>Loaded</span>
                      </div>
                    ) : (
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
                          className="bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-xs"
                          onClick={() => {
                            setStop2Loaded(true);
                            showToast("Stop 2 marked as Loaded! Stop 1 is now loading.");
                          }}
                        >
                          Mark Loaded
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#F1F5F9] flex justify-between items-center text-[11px] text-[#64748B]">
                    <span>Compartment: Center Bay Partition (Bay #02)</span>
                    <span className={!stop2Loaded ? "text-[#D97706] font-semibold animate-pulse" : "text-[#059669] font-semibold"}>
                      {!stop2Loaded ? "⚡ Staging in progress" : "Verified ✓"}
                    </span>
                  </div>
                </div>

                {/* STOP 1: Colpetty Retailer (Pending -> Currently Loading -> Loaded) */}
                <div
                  className={`bg-white rounded-xl p-5 flex flex-col gap-3 shadow-sm transition-all ${
                    stop1Loaded
                      ? "border border-[#CBD5E1]"
                      : stop2Loaded
                      ? "border-2 border-[#F97316] shadow-orange-100 shadow-md"
                      : "border border-[#CBD5E1]"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-jetbrains font-bold text-sm text-[#202D2D] bg-[#F1F5F9] px-2 py-0.5 rounded">
                          OUT001
                        </span>
                        <span
                          className={`font-semibold text-xs px-2 py-0.5 rounded ${
                            stop1Loaded
                              ? "bg-[#ECFDF5] text-[#059669]"
                              : stop2Loaded
                              ? "bg-[#FFF4ED] text-[#C2410C]"
                              : "bg-[#F1F5F9] text-[#485563]"
                          }`}
                        >
                          Stop 1 ({stop1Loaded ? "Loaded" : stop2Loaded ? "Currently Loading • Rear Doors" : "Pending Stage"})
                        </span>
                      </div>
                      <h3 className="text-[15px] font-bold text-[#202D2D] leading-[22px] m-0">
                        Colpetty Retailer
                      </h3>
                      <p className="text-xs text-[#485563] leading-[18px] m-0 font-normal">
                        Two orders for one outlet — grouped shipment (546.4 kg)
                      </p>
                    </div>

                    {stop1Loaded ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#ECFDF5] text-[#22C55E] border border-[#A7F3D0]/60 shrink-0">
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>Loaded</span>
                      </div>
                    ) : stop2Loaded ? (
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
                          className="bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-xs"
                          onClick={() => {
                            setStop1Loaded(true);
                            showToast("Stop 1 marked as Loaded! All stops complete.");
                          }}
                        >
                          Mark Loaded
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F1F5F9] text-[#475569] shrink-0">
                        <span>Pending Stage</span>
                      </div>
                    )}
                  </div>

                  {/* Grouped Orders List */}
                  <div className="flex flex-col gap-2.5 w-full mt-1">
                    {/* Order S1-000 */}
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[13px] font-bold text-[#202D2D] leading-5 m-0 font-jetbrains">
                          Order S1-000
                        </span>
                        <span className="text-[11px] font-semibold text-[#485563] bg-white border border-[#E2E8F0] px-2 py-0.5 rounded-md">
                          Ambient
                        </span>
                      </div>
                      <p className="text-xs text-[#485563] leading-[18px] m-0">
                        12 units • 97.8 kg • 0.500 m³ • General Merchandise
                      </p>
                    </div>

                    {/* Order S1-001 (Report Issue button removed from pending card) */}
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[13px] font-bold text-[#202D2D] leading-5 m-0 font-jetbrains">
                          Order S1-001
                        </span>
                        <span className="text-[11px] font-semibold text-[#1E40AF] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded-md">
                          Chilled (+2°C to +4°C)
                        </span>
                      </div>
                      <p className="text-xs text-[#485563] leading-[18px] m-0">
                        80 units • 448.6 kg • 2.445 m³ • Fresh Milk & Dairy
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#F1F5F9] flex justify-between items-center text-[11px] text-[#64748B]">
                    <span>Compartment: Rear Doors & Tailgate Section (Bay #03)</span>
                    <span
                      className={
                        stop1Loaded
                          ? "text-[#059669] font-semibold"
                          : stop2Loaded
                          ? "text-[#D97706] font-semibold animate-pulse"
                          : "text-[#64748B]"
                      }
                    >
                      {stop1Loaded
                        ? "Verified ✓"
                        : stop2Loaded
                        ? "⚡ Staging in progress"
                        : "Awaiting Prior Stop"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Payload Analytics & Dock Operations (col-span-5) */}
            <div className="md:col-span-6 lg:col-span-5 flex flex-col gap-5">
              {/* Card 1: Payload, Gross Weight & Volume Balance (Moved Up) */}
              <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-4 shadow-sm">
                <div className="flex justify-between items-center pb-2.5 border-b border-[#F1F5F9]">
                  <div>
                    <h3 className="text-sm font-bold text-[#202D2D] m-0">
                      Payload & Weight Distribution
                    </h3>
                    <p className="text-xs text-[#485563] m-0">
                      Refrigerated Truck PEL-R04 (Gross Vehicle Limits)
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded">
                    WITHIN LIMITS
                  </span>
                </div>

                <div className="flex flex-col gap-3.5">
                  {/* Weight Metric */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-[#485563]">Current Loaded Weight:</span>
                      <span className="font-bold text-[#202D2D] font-jetbrains">
                        {stop1Loaded ? "1,216.4 kg" : stop2Loaded ? "670.0 kg" : "520.0 kg"} / 3,500 kg Max
                      </span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-[#22C55E] h-full transition-all duration-500 rounded-full"
                        style={{ width: stop1Loaded ? "34.8%" : stop2Loaded ? "19.1%" : "14.8%" }}
                      ></div>
                    </div>
                    <span className="text-[11px] text-[#64748B]">
                      {stop1Loaded
                        ? "2,283.6 kg remaining payload margin"
                        : stop2Loaded
                        ? "2,830.0 kg remaining payload margin"
                        : "2,980.0 kg remaining payload margin"}
                    </span>
                  </div>

                  {/* Volume Metric */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-[#485563]">Cubic Volume Utilisation:</span>
                      <span className="font-bold text-[#202D2D] font-jetbrains">
                        {stop1Loaded ? "6.1 m³" : stop2Loaded ? "3.2 m³" : "2.4 m³"} / 18.0 m³ Max
                      </span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-[#3B82F6] h-full transition-all duration-500 rounded-full"
                        style={{ width: stop1Loaded ? "33.9%" : stop2Loaded ? "17.7%" : "13.3%" }}
                      ></div>
                    </div>
                    <span className="text-[11px] text-[#64748B]">
                      {stop1Loaded
                        ? "11.9 m³ available cargo space"
                        : stop2Loaded
                        ? "14.8 m³ available cargo space"
                        : "15.6 m³ available cargo space"}
                    </span>
                  </div>

                </div>

                {/* Stop Payload Weight Breakdown */}
                <div className="pt-3 border-t border-[#F1F5F9] flex flex-col gap-2">
                  <span className="text-xs font-bold text-[#202D2D]">
                    Weight Allocation per Stop
                  </span>
                  <div className="flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between items-center p-2 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0]/60">
                      <span className="text-[#065F46] font-medium">Stop 3 · Mount Lavinia Super (Chilled)</span>
                      <span className="font-jetbrains font-bold text-[#065F46]">520.0 kg ✓</span>
                    </div>
                    <div className={`flex justify-between items-center p-2 rounded-lg border transition-all ${
                      stop2Loaded
                        ? "bg-[#ECFDF5] border-[#A7F3D0]/60 text-[#065F46]"
                        : "bg-[#FFF4ED] border-[#FED7AA] text-[#9A3412]"
                    }`}>
                      <span className="font-medium">Stop 2 · Nugegoda Corner Store (Ambient)</span>
                      <span className="font-jetbrains font-bold">150.0 kg {stop2Loaded ? "✓" : "⚡"}</span>
                    </div>
                    <div className={`flex justify-between items-center p-2 rounded-lg border transition-all ${
                      stop1Loaded
                        ? "bg-[#ECFDF5] border-[#A7F3D0]/60 text-[#065F46]"
                        : stop2Loaded
                        ? "bg-[#FFF4ED] border-[#FED7AA] text-[#9A3412]"
                        : "bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]"
                    }`}>
                      <span className="font-medium">Stop 1 · Colpetty Retailer (2 Orders)</span>
                      <span className="font-jetbrains font-bold">
                        546.4 kg {stop1Loaded ? "✓" : stop2Loaded ? "⚡" : "(Pending)"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Fast Departure Readiness Navigation */}
              <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-3 shadow-sm">
                <div className="flex justify-between items-center pb-2 border-b border-[#F1F5F9]">
                  <span className="text-xs font-bold text-[#485563] uppercase tracking-wide">
                    Next Workflow Step
                  </span>
                  <span className="text-xs text-[#F97316] font-bold">
                    Bay 04 · Docked
                  </span>
                </div>

                <p className="text-xs text-[#485563] leading-relaxed m-0">
                  {stop1Loaded ? (
                    <span className="text-[#059669] font-semibold">
                      ✓ All 3 stops loaded and verified in LIFO sequence! Proceed to <strong>Trip Readiness</strong> to run departure gate checks and manifest validation.
                    </span>
                  ) : (
                    <>
                      Once all 3 stops are confirmed loaded in LIFO order, proceed to <strong>Trip Readiness</strong> to run departure gate checks and manifest validation.
                    </>
                  )}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate("trip-readiness");
                    } else {
                      router.push("/loader/trip-readiness");
                    }
                  }}
                  className={`w-full py-3 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${
                    stop1Loaded
                      ? "bg-[#22C55E] hover:bg-[#16A34A] shadow-[#22C55E]/20"
                      : "bg-[#202D2D] hover:bg-[#334155]"
                  }`}
                >
                  <span>Go to Trip Readiness Verification</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>

          {/* MOBILE SEQUENTIAL LAYOUT (Preserved Exactly) */}
          <div className="flex md:hidden flex-col gap-3 w-full">
            {/* Mobile LIFO Instruction Card */}
            <div className="flex flex-col p-3 gap-1 bg-white border border-[#CBD5E1] rounded-xl">
              <h2 className="text-sm font-bold text-[#202D2D] leading-[21px] m-0">
                Loading Sequence (LIFO Order)
              </h2>
              <p className="text-xs text-[#485563] leading-[18px] m-0 font-normal">
                Load last-delivered stops first. Scan parcel barcode to verify sequence.
              </p>
            </div>

            {/* Sequence Cards List */}
            <div className="flex flex-col gap-3 w-full">
              {/* STOP 3: Mount Lavinia Super (Loaded) */}
              <div className="bg-white border border-[#CBD5E1] rounded-[10px] p-4 flex flex-col gap-3 shadow-[0px_4px_12px_rgba(15,23,42,0.03)] box-border">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-[#202D2D] text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                        3
                      </span>
                      <span className="font-jetbrains font-bold text-sm text-[#202D2D] leading-[18px]">
                        OUT003
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#202D2D] leading-[21px] m-0">
                      Mount Lavinia Super
                    </h3>
                    <p className="text-xs text-[#485563] leading-[18px] m-0 font-normal">
                      1 order • 520 kg • Chilled zone • 4 cases
                    </p>
                  </div>

                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold bg-[#ECFDF5] text-[#22C55E]">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    <span>Loaded</span>
                  </div>
                </div>
              </div>

              {/* STOP 2: Nugegoda Corner Store (Active Loading) */}
              <div
                className={`bg-white rounded-[10px] p-4 flex flex-col gap-3 shadow-[0px_4px_12px_rgba(15,23,42,0.03)] box-border ${
                  !stop2Loaded
                    ? "border-2 border-[#F97316]"
                    : "border border-[#CBD5E1]"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-[#202D2D] text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                        2
                      </span>
                      <span className="font-jetbrains font-bold text-sm text-[#202D2D] leading-[18px]">
                        OUT002
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#202D2D] leading-[21px] m-0">
                      Nugegoda Corner Store
                    </h3>
                    <p className="text-xs text-[#485563] leading-[18px] m-0 font-normal">
                      1 order • 150 kg • Ambient zone • 2 cases
                    </p>
                  </div>

                  {stop2Loaded ? (
                    <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold bg-[#ECFDF5] text-[#22C55E]">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      <span>Loaded</span>
                    </div>
                  ) : (
                    <div className="flex items-center px-2 py-1 rounded-md text-[11px] font-semibold bg-[#FFF7ED] text-[#F97316]">
                      <span>Loading</span>
                    </div>
                  )}
                </div>

                {/* Mobile Action Row at Bottom of Card 2 */}
                {!stop2Loaded && (
                  <div className="flex items-center gap-2 w-full mt-1">
                    <button
                      type="button"
                      className="flex-1 h-9 bg-[#F97316] hover:bg-[#EA580C] text-white text-[13px] font-bold rounded-lg flex items-center justify-center transition-colors"
                      onClick={() => {
                        setStop2Loaded(true);
                        showToast("Stop 2 marked as Loaded! Stop 1 is now loading.");
                      }}
                    >
                      Mark Loaded
                    </button>
                    <button
                      type="button"
                      className="flex-1 h-9 bg-white border border-[#CBD5E1] text-[#EF4444] text-[13px] font-semibold rounded-lg flex items-center justify-center transition-colors"
                      onClick={handleOpenReportIssue}
                    >
                      Report Issue
                    </button>
                  </div>
                )}
              </div>

              {/* STOP 1: Colpetty Retailer (Pending / Currently Loading / Loaded) */}
              <div
                className={`bg-white rounded-[10px] p-4 flex flex-col gap-3 shadow-[0px_4px_12px_rgba(15,23,42,0.03)] box-border ${
                  stop1Loaded
                    ? "border border-[#CBD5E1]"
                    : stop2Loaded
                    ? "border-2 border-[#F97316]"
                    : "border border-[#CBD5E1]"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-[#202D2D] text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                        1
                      </span>
                      <span className="font-jetbrains font-bold text-sm text-[#202D2D] leading-[18px]">
                        OUT001
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#202D2D] leading-[21px] m-0">
                      Colpetty Retailer
                    </h3>
                    <p className="text-xs text-[#485563] leading-[18px] m-0 font-normal">
                      Two orders for one outlet — grouped
                    </p>
                  </div>

                  {stop1Loaded ? (
                    <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold bg-[#ECFDF5] text-[#22C55E]">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      <span>Loaded</span>
                    </div>
                  ) : stop2Loaded ? (
                    <div className="flex items-center px-2 py-1 rounded-md text-[11px] font-semibold bg-[#FFF7ED] text-[#F97316]">
                      <span>Loading</span>
                    </div>
                  ) : (
                    <div className="flex items-center px-2.5 py-1.5 rounded-md text-xs font-bold bg-[#F9FAFB] text-[#485563]">
                      <span>Pending</span>
                    </div>
                  )}
                </div>

                {/* Mobile Action Row for Stop 1 when Currently Loading */}
                {stop2Loaded && !stop1Loaded && (
                  <div className="flex items-center gap-2 w-full mt-1">
                    <button
                      type="button"
                      className="flex-1 h-9 bg-[#F97316] hover:bg-[#EA580C] text-white text-[13px] font-bold rounded-lg flex items-center justify-center transition-colors"
                      onClick={() => {
                        setStop1Loaded(true);
                        showToast("Stop 1 marked as Loaded! All stops complete.");
                      }}
                    >
                      Mark Loaded
                    </button>
                    <button
                      type="button"
                      className="flex-1 h-9 bg-white border border-[#CBD5E1] text-[#EF4444] text-[13px] font-semibold rounded-lg flex items-center justify-center transition-colors"
                      onClick={handleOpenReportIssue}
                    >
                      Report Issue
                    </button>
                  </div>
                )}

                {/* Grouped Orders List */}
                <div className="flex flex-col gap-2.5 w-full mt-1">
                  {/* Order S1-000 */}
                  <div className="bg-[#F9FAFB] rounded-lg p-3 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] font-bold text-[#202D2D] leading-5 m-0 font-jetbrains">
                        Order S1-000
                      </span>
                      <span className="text-[11px] font-semibold text-[#485563] bg-white border border-[#E2E8F0] px-2 py-0.5 rounded-md">
                        Ambient
                      </span>
                    </div>
                    <p className="text-xs text-[#485563] leading-[18px] m-0">
                      12 units • 97.8 kg • 0.500 m³
                    </p>
                  </div>

                  {/* Order S1-001 (Report Issue button removed from pending card) */}
                  <div className="bg-[#F9FAFB] rounded-lg p-3 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] font-bold text-[#202D2D] leading-5 m-0 font-jetbrains">
                        Order S1-001
                      </span>
                      <span className="text-[11px] font-semibold text-[#485563] bg-white border border-[#E2E8F0] px-2 py-0.5 rounded-md">
                        Chilled
                      </span>
                    </div>
                    <p className="text-xs text-[#485563] leading-[18px] m-0">
                      80 units • 448.6 kg • 2.445 m³
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
  );
}
