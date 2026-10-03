"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowUpDown,
  ShieldCheck,
  Truck,
  Info,
  Sparkles,
  FileCheck2,
} from "lucide-react";
import { ChevronLeftIcon } from "./icons";

interface ReviewChangesProps {
  onNavigate?: (
    tab: "assigned-trips" | "load-sequence" | "trip-readiness" | "report-issue" | "review-changes" | "back"
  ) => void;
}

export default function ReviewChanges({ onNavigate }: ReviewChangesProps) {
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const handleBack = () => {
    if (onNavigate) {
      onNavigate("load-sequence");
    } else {
      if (typeof window !== "undefined" && (window.history.state?.idx > 0 || window.history.length > 1)) {
        router.back();
      } else {
        router.push("/loader/load-sequence");
      }
    }
  };

  const handleAcknowledge = () => {
    setAcknowledged(true);
    setNotification("Plan v2 successfully acknowledged! Loading sequence updated to revised schedule.");
    setTimeout(() => {
      handleBack();
    }, 1800);
  };

  return (
    <main className="w-full max-w-full overflow-x-hidden bg-[#F9FAFB] flex flex-col box-border">
      {/* Mobile Top Navigation Bar */}
      <div className="flex md:hidden items-center justify-between px-4 h-14 bg-white border-b border-[#CBD5E1] sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="p-1 text-[#202D2D] hover:bg-gray-100 rounded-md transition-colors"
            onClick={handleBack}
            title="Back to Load Sequence"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-[#202D2D] leading-[27px] m-0">
            Review Changes
          </h1>
        </div>
        <span className="bg-[#FEF3C7] text-[#D97706] font-inter text-[11px] font-bold px-2 py-1 rounded-md border border-[#FDE68A]">
          Plan v2
        </span>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-[#202D2D] text-white px-5 py-3 rounded-xl text-xs font-semibold z-50 shadow-2xl border border-gray-700 animate-fade-in text-center max-w-[90%] flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#22C55E] shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Content Container */}
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 box-border">
        {/* Desktop Header */}
        <div className="hidden md:flex flex-col gap-3 pb-4 border-b border-[#CBD5E1]">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#485563] hover:text-[#202D2D] transition-colors bg-white border border-[#CBD5E1] px-3 py-1.5 rounded-lg shadow-xs"
            >
              <ChevronLeft size={15} />
              <span>Back to Load Sequence</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#64748B] flex items-center gap-1">
                <Clock size={13} />
                Published 15 mins ago
              </span>
              <span className="bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#F59E0B]" />
                Plan v2 Proposed
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[22px] lg:text-2xl font-bold text-[#202D2D] leading-[33px] m-0">
                Review Route & Sequence Changes
              </h1>
              <p className="text-[13px] lg:text-sm text-[#485563] leading-5 m-0 font-normal mt-0.5">
                Verify adjustments proposed by Central Dispatch for Trip PEL-R04 / S1-T001 before proceeding.
              </p>
            </div>

            {/* Trip Specs Tag */}
            <div className="flex items-center gap-2">
              <div className="bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs font-semibold text-[#202D2D] flex items-center gap-1.5 shadow-xs">
                <Truck size={14} className="text-[#F97316]" />
                <span>PEL-R04 (14ft Chilled/Ambient)</span>
              </div>
              <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs font-jetbrains font-bold text-[#202D2D]">
                S1-T001
              </div>
            </div>
          </div>
        </div>

        {/* Change Rationale Banner */}
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4 lg:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={20} />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-[#92400E]">
                  Dispatch Optimization Notice: Corridor Re-sequencing
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]/80 uppercase">
                  1 Order Re-sequenced
                </span>
              </div>
              <p className="text-xs text-[#78350F] leading-relaxed m-0 max-w-3xl">
                Central Dispatch has re-ordered Stop 1 and Stop 2 to bypass morning peak congestion along the Galle Road arterial route. Departure window has been buffered by <strong>+10 minutes</strong> (05:30 → 05:40). Mount Lavinia (Stop 3) remains the deepest cab-front stow.
              </p>
            </div>
          </div>

          <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#FDE68A]">
            <span className="text-[11px] text-[#92400E] font-medium">Dispatcher:</span>
            <span className="text-xs font-bold text-[#78350F] bg-[#FEF3C7] px-2.5 py-1 rounded border border-[#FDE68A]">
              P. Silva (Peliyagoda Hub)
            </span>
          </div>
        </div>

        {/* Key Metrics Comparison Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 w-full">
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-3.5 lg:p-4 flex flex-col gap-1 shadow-xs">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">
              Planned Departure
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-medium text-[#94A3B8] line-through">05:30</span>
              <ArrowRight size={12} className="text-[#F97316]" />
              <span className="text-base font-bold text-[#202D2D]">05:40 AM</span>
            </div>
            <span className="text-[10px] font-semibold text-[#059669]">+10m schedule buffer</span>
          </div>

          <div className="bg-white border border-[#CBD5E1] rounded-xl p-3.5 lg:p-4 flex flex-col gap-1 shadow-xs">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">
              Total Stops
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-[#202D2D]">3 Outlets</span>
            </div>
            <span className="text-[10px] font-semibold text-[#485563]">Sequence order inverted</span>
          </div>

          <div className="bg-white border border-[#CBD5E1] rounded-xl p-3.5 lg:p-4 flex flex-col gap-1 shadow-xs">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">
              Payload Weight
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-[#202D2D]">1,320 kg</span>
            </div>
            <span className="text-[10px] font-semibold text-[#059669]">0 kg discrepancy (No variance)</span>
          </div>

          <div className="bg-white border border-[#CBD5E1] rounded-xl p-3.5 lg:p-4 flex flex-col gap-1 shadow-xs">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">
              Cold Chain Status
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-[#059669]">+2°C to +4°C</span>
            </div>
            <span className="text-[10px] font-semibold text-[#059669]">Bay 1 partition intact</span>
          </div>
        </div>

        {/* Side-by-Side Sequence Comparison */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base lg:text-[17px] font-bold text-[#202D2D] m-0 flex items-center gap-2">
              <ArrowUpDown size={18} className="text-[#F97316]" />
              <span>Loading Sequence Comparison (LIFO Order)</span>
            </h2>
            <span className="text-xs text-[#64748B]">Last stop loaded = First stop delivered</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full items-start">
            {/* Column A: Current Plan v1 */}
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 lg:p-5 flex flex-col gap-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#485563]">Current Plan (v1)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-[#485563]">
                    ORIGINAL
                  </span>
                </div>
                <span className="text-xs text-[#64748B]">Depart: 05:30</span>
              </div>

              {/* Steps List v1 */}
              <div className="flex flex-col gap-3">
                {/* Stop 3: Mount Lavinia */}
                <div className="p-3.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-jetbrains font-bold text-xs text-[#202D2D]">OUT003 · Stop 3</span>
                    <span className="text-[11px] font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded">
                      Bay 1 (Cab Front) • Loaded ✓
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#202D2D] m-0">Mount Lavinia Super</h4>
                  <p className="text-[11px] text-[#64748B] m-0">520 kg • Chilled zone (+2°C to +4°C)</p>
                </div>

                {/* Stop 2: Nugegoda */}
                <div className="p-3.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-jetbrains font-bold text-xs text-[#202D2D]">OUT002 · Stop 2</span>
                    <span className="text-[11px] font-semibold text-[#485563] bg-gray-200/80 px-2 py-0.5 rounded">
                      Bay 2 (Center Bay)
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#202D2D] m-0">Nugegoda Corner Store</h4>
                  <p className="text-[11px] text-[#64748B] m-0">150 kg • Ambient zone • 2 cases</p>
                </div>

                {/* Stop 1: Colpetty */}
                <div className="p-3.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-jetbrains font-bold text-xs text-[#202D2D]">OUT001 · Stop 1</span>
                    <span className="text-[11px] font-semibold text-[#485563] bg-gray-200/80 px-2 py-0.5 rounded">
                      Bay 3 (Rear Door)
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#202D2D] m-0">Colpetty Retailer</h4>
                  <p className="text-[11px] text-[#64748B] m-0">650 kg • Ambient & Fresh zone • 8 cases</p>
                </div>
              </div>
            </div>

            {/* Column B: Proposed Plan v2 */}
            <div className="bg-white border-2 border-[#F97316] rounded-xl p-4 lg:p-5 flex flex-col gap-4 shadow-sm shadow-orange-100">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#202D2D]">Proposed Plan (v2)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFF4ED] text-[#F97316] border border-[#FDBA74]">
                    RECOMMENDED
                  </span>
                </div>
                <span className="text-xs font-bold text-[#F97316]">Depart: 05:40 (+10m)</span>
              </div>

              {/* Steps List v2 */}
              <div className="flex flex-col gap-3">
                {/* Stop 3: Mount Lavinia (Unchanged) */}
                <div className="p-3.5 rounded-lg border border-[#A7F3D0] bg-[#F0FDF4] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-jetbrains font-bold text-xs text-[#202D2D]">OUT003 · Stop 3</span>
                    <span className="text-[11px] font-bold text-[#059669] bg-white px-2 py-0.5 rounded border border-[#A7F3D0]">
                      No Change • Already Loaded ✓
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#202D2D] m-0">Mount Lavinia Super</h4>
                  <p className="text-[11px] text-[#485563] m-0">Bay 1 (Cab Front) • 520 kg Chilled</p>
                </div>

                {/* Stop 2: Colpetty Retailer (Swapped into Stop 2) */}
                <div className="p-3.5 rounded-lg border-2 border-[#F97316] bg-[#FFF4ED]/40 flex flex-col gap-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-jetbrains font-bold text-xs text-[#202D2D]">OUT001 · Stop 2</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F97316] text-white">
                        NEW ORDER
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-[#C2410C] bg-[#FFF4ED] px-2 py-0.5 rounded border border-[#FDBA74]">
                      Load Next • Mid Bay #02
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#202D2D] m-0">Colpetty Retailer</h4>
                  <p className="text-[11px] text-[#485563] m-0">
                    650 kg • Prioritized delivery window to beat Colombo 03 congestion
                  </p>
                </div>

                {/* Stop 1: Nugegoda Corner Store (Swapped into Stop 1) */}
                <div className="p-3.5 rounded-lg border-2 border-[#F97316] bg-[#FFF4ED]/40 flex flex-col gap-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-jetbrains font-bold text-xs text-[#202D2D]">OUT002 · Stop 1</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F97316] text-white">
                        NEW ORDER
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-[#C2410C] bg-[#FFF4ED] px-2 py-0.5 rounded border border-[#FDBA74]">
                      Load Last • Rear Door #03
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#202D2D] m-0">Nugegoda Corner Store</h4>
                  <p className="text-[11px] text-[#485563] m-0">
                    150 kg • Unloading window matches 07:15 AM store opening
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Safety Checklist */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 flex flex-col gap-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
            <h3 className="text-sm font-bold text-[#202D2D] m-0 flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#22C55E]" />
              <span>Operational Pre-Check for Plan v2</span>
            </h3>
            <span className="text-xs text-[#059669] font-bold">ALL CHECKS PASSED ✓</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <CheckCircle2 size={15} className="text-[#22C55E] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#202D2D] block">Axle Load Balanced</span>
                <span className="text-[#64748B]">Weight distribution remains balanced across front & rear axles.</span>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <CheckCircle2 size={15} className="text-[#22C55E] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#202D2D] block">No Re-handling Required</span>
                <span className="text-[#64748B]">Stop 3 already in Bay 1 stays undisturbed. Only upcoming stops shift.</span>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <CheckCircle2 size={15} className="text-[#22C55E] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#202D2D] block">Driver Route Synced</span>
                <span className="text-[#64748B]">Driver navigation terminal will update immediately upon loader signoff.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 lg:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <Info size={15} className="text-[#F97316] shrink-0" />
            <span>Acknowledging will update your active sequence queue and inform central dispatch.</span>
          </div>

          <div className="flex items-center w-full sm:w-auto">
            <button
              type="button"
              onClick={handleAcknowledge}
              disabled={acknowledged}
              className="w-full sm:w-auto px-6 py-3 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              <FileCheck2 size={16} />
              <span>{acknowledged ? "Plan v2 Adopted ✓" : "Acknowledge & Adopt Plan v2"}</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}