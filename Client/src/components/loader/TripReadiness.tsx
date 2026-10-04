"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeftIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  CircleXIcon,
  CircleOutlineIcon,
  InfoIcon,
} from "./icons";

interface TripReadinessProps {
  onNavigate?: (tab: "assigned-trips" | "load-sequence" | "trip-readiness" | "report-issue" | "back") => void;
}

export default function TripReadiness({ onNavigate }: TripReadinessProps) {
  const router = useRouter();

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

  return (
    <main className="w-full max-w-full overflow-x-hidden bg-[#F9FAFB] flex flex-col box-border">
      {/* Mobile Top Navigation Bar */}
      <div className="flex md:hidden items-center justify-between px-4 h-14 bg-white border-b border-[#CBD5E1] sticky top-0 z-30">
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
            Trip Readiness
          </h1>
        </div>
        <span className="bg-[#ECFDF5] text-[#22C55E] font-inter text-[11px] font-bold px-2 py-1 rounded-md">
          Plan v2
        </span>
      </div>

      {/* Content Container */}
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 box-border">
        {/* Desktop Header */}
        <div className="hidden md:flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-slate-900 leading-tight m-0">
              Trip Readiness - PEL-R04 / S1-T001
            </h1>
            <p className="text-sm text-slate-500 mt-1 m-0 font-normal">
              Final departure verification checklist
            </p>
          </div>
          <div className="bg-[#ECFDF5] px-3 py-1.5 rounded-md flex items-center justify-center shrink-0">
            <span className="text-xs lg:text-[13px] font-bold text-[#F97316] leading-none">
              Plan v2 Active
            </span>
          </div>
        </div>

        {/* DESKTOP TWO-COLUMN RESPONSIVE LAYOUT */}
        <div className="hidden md:flex flex-col lg:flex-row gap-6 w-full items-start">
          {/* Left Column */}
          <div className="flex-1 min-w-0 w-full flex flex-col gap-6">
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-4 shadow-sm">
              <div className="flex justify-between items-center pb-3 border-b border-[#F1F5F9]">
                <div>
                  <h2 className="text-[17px] lg:text-[18px] font-bold text-[#202D2D] leading-[24px] m-0">
                    Readiness Checklist
                  </h2>
                  <p className="text-xs text-[#485563] m-0">
                    Mandatory pre-departure gate pass validation
                  </p>
                </div>
                <span className="bg-[#FFF4ED] text-[#F97316] text-xs font-bold px-2.5 py-1 rounded-full">
                  2 of 8 Passed
                </span>
              </div>

              <div className="flex flex-col gap-3 w-full">
                {/* Items 1 to 8 */}
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]/50 transition-all hover:shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#065F46]">
                      Expected orders: 6
                    </span>
                    <span className="text-[11px] text-[#047857]">
                      All 6 delivery orders assigned and staged in loading sequence
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-[#D1FAE5] text-[#047857] text-[11px] font-bold px-2 py-0.5 rounded">
                      VERIFIED
                    </span>
                    <span className="w-6 h-6 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-xs">
                      ✓
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA]/60 transition-all hover:shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#991B1B]">
                      Loaded: 5 of 6
                    </span>
                    <span className="text-[11px] text-[#B91C1C]">
                      Order S1-001 stopped due to chilled stock damage
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-[#FEE2E2] text-[#B91C1C] text-[11px] font-bold px-2 py-0.5 rounded">
                      INCOMPLETE
                    </span>
                    <span className="w-6 h-6 rounded-full bg-[#EF4444] text-white flex items-center justify-center font-bold text-xs">
                      ✗
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#FFF4ED] border border-[#FED7AA]/60 transition-all hover:shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#9A3412]">
                      Short/Changed: 1 order (S1-001 - 8 units damaged)
                    </span>
                    <span className="text-[11px] text-[#C2410C]">
                      Damaged chilled stock reported by loader at 05:45
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-[#FFEDD5] text-[#C2410C] text-[11px] font-bold px-2 py-0.5 rounded">
                      SHORTFALL
                    </span>
                    <span className="w-6 h-6 rounded-full bg-[#F59E0B] text-white flex items-center justify-center font-bold text-xs">
                      ⚠
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA]/60 transition-all hover:shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#991B1B]">
                      Open issues: 1
                    </span>
                    <span className="text-[11px] text-[#B91C1C]">
                      Report #SR-1049 awaiting Central Dispatch resolution
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-[#FEE2E2] text-[#B91C1C] text-[11px] font-bold px-2 py-0.5 rounded">
                      UNRESOLVED
                    </span>
                    <span className="w-6 h-6 rounded-full bg-[#EF4444] text-white flex items-center justify-center font-bold text-xs">
                      ✗
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]/50 transition-all hover:shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#065F46]">
                      Plan version: v2 acknowledged
                    </span>
                    <span className="text-[11px] text-[#047857]">
                      Updated route plan v2 accepted and synced to vehicle
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-[#D1FAE5] text-[#047857] text-[11px] font-bold px-2 py-0.5 rounded">
                      VERIFIED
                    </span>
                    <span className="w-6 h-6 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-xs">
                      ✓
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] transition-all hover:shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#485563]">
                      Weight validation: Pending recheck
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      Current: 2,420 kg / Max limit: 3,500 kg (Re-weigh on stock update)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-[#E2E8F0] text-[#475569] text-[11px] font-bold px-2 py-0.5 rounded">
                      PENDING
                    </span>
                    <span className="w-6 h-6 rounded-full bg-[#CBD5E1] text-[#485563] flex items-center justify-center font-bold text-xs">
                      ○
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] transition-all hover:shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#485563]">
                      Volume validation: Pending recheck
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      Current: 14.8 m³ / Max limit: 18.2 m³ (Re-cube on stock update)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-[#E2E8F0] text-[#475569] text-[11px] font-bold px-2 py-0.5 rounded">
                      PENDING
                    </span>
                    <span className="w-6 h-6 rounded-full bg-[#CBD5E1] text-[#485563] flex items-center justify-center font-bold text-xs">
                      ○
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] transition-all hover:shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#485563]">
                      Update acknowledgement: Pending
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      Final departure sign-off by dock supervisor upon resolution
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-[#E2E8F0] text-[#475569] text-[11px] font-bold px-2 py-0.5 rounded">
                      PENDING
                    </span>
                    <span className="w-6 h-6 rounded-full bg-[#CBD5E1] text-[#485563] flex items-center justify-center font-bold text-xs">
                      ○
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Order Manifest Status */}
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-4 shadow-sm">
              <div className="flex justify-between items-center pb-3 border-b border-[#F1F5F9]">
                <div>
                  <h3 className="text-[16px] font-bold text-[#202D2D] leading-[22px] m-0">
                    Trip Order Manifest Status (6 Stops)
                  </h3>
                  <p className="text-xs text-[#485563] m-0">
                    Sequential delivery verification for route PEL-R04
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#485563]">
                  5 of 6 Complete
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                <div className="p-3 rounded-lg bg-[#FFF4ED] border border-[#FED7AA] flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="font-jetbrains font-bold text-xs text-[#202D2D]">Stop 1 · S1-001</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FFEDD5] text-[#C2410C]">SHORTFALL</span>
                  </div>
                  <span className="text-xs text-[#485563] truncate">Colpetty Retailer</span>
                  <span className="text-[11px] text-[#C2410C] font-medium">72/80 units (8 damaged)</span>
                </div>

                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="font-jetbrains font-bold text-xs text-[#202D2D]">Stop 2 · S1-002</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#DCFCE7] text-[#166534]">LOADED</span>
                  </div>
                  <span className="text-xs text-[#485563] truncate">Bambalapitiya Fresh</span>
                  <span className="text-[11px] text-[#166534] font-medium">45/45 units verified</span>
                </div>

                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="font-jetbrains font-bold text-xs text-[#202D2D]">Stop 3 · S1-003</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#DCFCE7] text-[#166534]">LOADED</span>
                  </div>
                  <span className="text-xs text-[#485563] truncate">Havelock Mart</span>
                  <span className="text-[11px] text-[#166534] font-medium">60/60 units verified</span>
                </div>

                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="font-jetbrains font-bold text-xs text-[#202D2D]">Stop 4 · S1-004</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#DCFCE7] text-[#166534]">LOADED</span>
                  </div>
                  <span className="text-xs text-[#485563] truncate">Wellawatte Grocers</span>
                  <span className="text-[11px] text-[#166534] font-medium">55/55 units verified</span>
                </div>

                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="font-jetbrains font-bold text-xs text-[#202D2D]">Stop 5 · S1-005</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#DCFCE7] text-[#166534]">LOADED</span>
                  </div>
                  <span className="text-xs text-[#485563] truncate">Dehiwala Central</span>
                  <span className="text-[11px] text-[#166534] font-medium">70/70 units verified</span>
                </div>

                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="font-jetbrains font-bold text-xs text-[#202D2D]">Stop 6 · S1-006</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#DCFCE7] text-[#166534]">LOADED</span>
                  </div>
                  <span className="text-xs text-[#485563] truncate">Mount Lavinia Depot</span>
                  <span className="text-[11px] text-[#166534] font-medium">80/80 units verified</span>
                </div>
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
                    Loading Shortfall - Trip Held
                  </span>
                </div>
                <span className="bg-[#F59E0B] text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                  HIGH PRIORITY
                </span>
              </div>
              <p className="text-[13px] text-[#485563] leading-relaxed m-0 font-normal">
                8 units of chilled stock damaged on order <strong className="text-[#202D2D]">S1-001</strong> (OUT001 / Colpetty Retailer). Dispatcher review required before departure gate release can proceed.
              </p>
              <div className="flex flex-col gap-1 pt-1 border-t border-[#FED7AA]/60 text-xs text-[#78350F]">
                <div className="flex justify-between">
                  <span>Reported by:</span>
                  <span className="font-semibold">Kasun Perera (Loader)</span>
                </div>
                <div className="flex justify-between">
                  <span>Report Time:</span>
                  <span className="font-jetbrains font-semibold">2026-01-08 05:45</span>
                </div>
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span className="font-semibold">Bay 04 · Cold Chain Dock</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate("report-issue");
                  } else {
                    router.push("/loader/report-issue");
                  }
                }}
                className="mt-1 w-full py-2.5 bg-white hover:bg-orange-50 text-[#C2410C] border border-[#FDBA74] rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Review / Edit Shortfall Report</span>
                <span>→</span>
              </button>
            </div>

            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-4 shadow-sm">
              <div>
                <h3 className="text-[16px] font-bold text-[#202D2D] leading-[22px] m-0">
                  What happens next
                </h3>
                <p className="text-xs text-[#485563] m-0">
                  Resolution workflow required for trip release
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#FEF3C7]/40 border border-[#FDE68A]">
                  <span className="w-6 h-6 bg-[#F59E0B] text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </span>
                  <div className="flex flex-col flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] font-bold text-[#92400E]">
                        Dispatcher reviews shortfall report
                      </span>
                      <span className="text-[10px] font-bold bg-[#F59E0B] text-white px-2 py-0.5 rounded">
                        IN PROGRESS
                      </span>
                    </div>
                    <span className="text-xs text-[#78350F] mt-0.5">
                      Alert sent to Operations Dispatch. Shortage ticket #SR-1049 queued.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#F8FAFC]">
                  <span className="w-6 h-6 bg-[#E2E8F0] text-[#475569] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </span>
                  <div className="flex flex-col flex-1">
                    <span className="text-[13px] font-semibold text-[#202D2D]">
                      Dispatcher approves replacement stock or defers order
                    </span>
                    <span className="text-xs text-[#64748B] mt-0.5">
                      Will decide to dispatch buffer units or defer stop 1 to wave 2.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#F8FAFC]">
                  <span className="w-6 h-6 bg-[#E2E8F0] text-[#475569] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    3
                  </span>
                  <div className="flex flex-col flex-1">
                    <span className="text-[13px] font-semibold text-[#202D2D]">
                      Loader verifies updated order is complete
                    </span>
                    <span className="text-xs text-[#64748B] mt-0.5">
                      Final physical scan and security seal application on pallet.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#F8FAFC]">
                  <span className="w-6 h-6 bg-[#E2E8F0] text-[#475569] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    4
                  </span>
                  <div className="flex flex-col flex-1">
                    <span className="text-[13px] font-semibold text-[#202D2D]">
                      Revalidate weight and volume
                    </span>
                    <span className="text-xs text-[#64748B] mt-0.5">
                      Automated check against vehicle gross limits (3,500 kg max).
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#F8FAFC]">
                  <span className="w-6 h-6 bg-[#E2E8F0] text-[#475569] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    5
                  </span>
                  <div className="flex flex-col flex-1">
                    <span className="text-[13px] font-semibold text-[#202D2D]">
                      Acknowledge latest plan version and release trip
                    </span>
                    <span className="text-xs text-[#64748B] mt-0.5">
                      Driver gate pass generated and trip marked Ready for Departure.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-3 shadow-sm">
              <div className="flex justify-between items-center pb-2.5 border-b border-[#F1F5F9]">
                <span className="text-xs font-bold text-[#485563] uppercase tracking-wide">
                  Gate Departure Release
                </span>
                <span className="text-[11px] font-bold text-[#EF4444] bg-[#FEF2F2] px-2 py-0.5 rounded">
                  GATE LOCKED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col">
                  <span className="text-[#64748B]">Assigned Bay:</span>
                  <span className="font-bold text-[#202D2D]">Bay 04 (Cold Chain)</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#64748B]">Driver:</span>
                  <span className="font-bold text-[#202D2D]">Nimal Jayawardena</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#64748B]">Target Departure:</span>
                  <span className="font-bold text-[#202D2D]">06:15 AM (Delayed)</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#64748B]">Security Seal:</span>
                  <span className="font-bold text-[#D97706]">Pending Signoff</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 bg-[#E5E7EB] text-[#9CA3AF] rounded-xl font-bold text-sm cursor-not-allowed select-none text-center flex items-center justify-center gap-2"
                >
                  <span>🔒 Ready for Departure</span>
                </button>
                <p className="text-[11px] text-[#EF4444] font-medium leading-4 text-center m-0">
                  Cannot depart with unresolved issues. Dispatcher action required.
                </p>
              </div>

              <div className="pt-2 border-t border-[#F1F5F9] text-center">
                <span className="text-[11px] text-[#485563]">
                  Need urgent clearance? Contact Central Dispatch: <strong className="text-[#202D2D]">+94 11 234 5678</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE LAYOUT */}
        <div className="flex md:hidden flex-col gap-4 w-full">
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-[#202D2D] leading-[21px] m-0">
              Readiness Checklist
            </h2>
            <div className="bg-white rounded-xl p-4 shadow-[0px_4px_12px_rgba(15,23,42,0.03)] flex flex-col">
              <div className="flex justify-between items-center py-2 border-b border-[#CBD5E1]">
                <span className="text-sm font-medium text-[#485563]">
                  Expected Stops
                </span>
                <div className="flex items-center gap-1.5 text-[#F59E0B]">
                  <span className="text-sm font-semibold">5 Verified</span>
                  <AlertTriangleIcon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-[#CBD5E1]">
                <span className="text-sm font-medium text-[#485563]">
                  Loaded Count
                </span>
                <div className="flex items-center gap-1.5 text-[#EF4444]">
                  <span className="text-sm font-semibold">5 / 6 loaded</span>
                  <CircleXIcon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-[#CBD5E1]">
                <span className="text-sm font-medium text-[#485563]">
                  Shortfall Reported
                </span>
                <div className="flex items-center gap-1.5 text-[#F59E0B]">
                  <span className="text-sm font-semibold">1 issue flagged</span>
                  <AlertTriangleIcon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-[#CBD5E1]">
                <span className="text-sm font-medium text-[#485563]">
                  Open Issues
                </span>
                <div className="flex items-center gap-1.5 text-[#EF4444]">
                  <span className="text-sm font-semibold">1 outstanding</span>
                  <CircleXIcon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-[#CBD5E1]">
                <span className="text-sm font-medium text-[#485563]">
                  Plan Acknowledgement
                </span>
                <div className="flex items-center gap-1.5 text-[#202D2D]">
                  <span className="text-sm font-semibold">v2 Acknowledged</span>
                  <CheckCircleIcon className="w-4 h-4 text-[#22C55E]" />
                </div>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-[#485563]">
                  Vehicle & Weight Checks
                </span>
                <div className="flex items-center gap-1.5 text-[#485563]">
                  <span className="text-sm font-semibold">Pending</span>
                  <CircleOutlineIcon className="w-4 h-4 text-[#485563]" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-[#202D2D] leading-[21px] m-0">
              Resolution Summary
            </h2>
            <div className="bg-[#FFF4ED] border border-[#F59E0B] rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="bg-[#FFF4ED] text-[#F59E0B] font-inter text-[11px] font-bold px-2 py-1 rounded border border-[#F59E0B]/30 shrink-0">
                  SHORT
                </span>
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-[#202D2D] leading-5">
                    8 units damaged on order S1-001
                  </span>
                  <span className="text-xs text-[#485563] leading-[15px]">
                    OUT001 / Colpetty Retailer
                  </span>
                </div>
              </div>

              <div className="w-full border-t border-dashed border-[#F59E0B]" />

              <div className="flex items-center gap-2 text-[#F59E0B]">
                <InfoIcon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-medium text-[#F59E0B] leading-[18px]">
                  Dispatcher review required.
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              disabled
              className="w-full h-12 bg-[#E5E7EB] text-[#9CA3AF] rounded-full font-bold text-[15px] cursor-not-allowed flex items-center justify-center shadow-sm select-none"
            >
              Ready for Departure
            </button>
            <p className="text-[13px] font-medium text-[#485563] text-center leading-5 m-0">
              Cannot depart with unresolved issues.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}