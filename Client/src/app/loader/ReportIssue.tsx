"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./components/Sidebar";
import BottomNavBar from "./components/BottomNavBar";
import {
  ChevronLeftIcon,
  HelpCircleIcon,
  AlertTriangleIcon,
  MinusIcon,
  SettingsIcon,
  CameraIcon,
  BadgeAlertIcon,
  AlertCircleIcon,
  CheckCircleIcon,
} from "./components/icons";

interface ReportIssueProps {
  onNavigate?: (tab: "assigned-trips" | "load-sequence" | "trip-readiness" | "report-issue" | "back") => void;
}

export default function ReportIssue({ onNavigate }: ReportIssueProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "assigned-trips" | "load-sequence" | "trip-readiness"
  >("load-sequence");
  const [issueType, setIssueType] = useState<"missing" | "damaged" | "short" | "vehicle">("damaged");
  const [resolution, setResolution] = useState<"replace" | "defer">("replace");
  const [affectedQty, setAffectedQty] = useState<string>("8 units");
  const [notes, setNotes] = useState<string>(
    "Packaging compromised - visible moisture damage on 8 units of chilled stock"
  );
  const [notification, setNotification] = useState<string | null>(null);

  const handleTabChange = (tab: "assigned-trips" | "load-sequence" | "trip-readiness") => {
    setActiveTab(tab);
    if (onNavigate) {
      onNavigate(tab);
    } else {
      if (tab === "assigned-trips") router.push("/loader");
      else if (tab === "load-sequence") router.push("/loader/load-sequence");
      else if (tab === "trip-readiness") router.push("/loader/trip-readiness");
    }
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate("back");
    } else {
      if (typeof window !== "undefined" && (window.history.state?.idx > 0 || window.history.length > 1)) {
        router.back();
      } else {
        router.push("/loader/load-sequence");
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setNotification("Shortfall reported successfully to dispatch! Trip status updated.");
    setTimeout(() => {
      handleBack();
    }, 1500);
  };

  return (
    <div className="flex min-h-screen w-full bg-[#F9FAFB] font-poppins text-[#202D2D]">
      {/* Desktop Sidebar (Load Sequence is active) */}
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-[220px] lg:ml-[240px] bg-[#F9FAFB] min-h-screen flex flex-col w-full overflow-x-hidden pb-[95px] md:pb-12">
        {/* Mobile Top Navigation Bar (< Report Issue) */}
        <div className="flex md:hidden items-center px-5 h-14 bg-white border-b border-[#CBD5E1] sticky top-0 z-30">
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
              Report Issue
            </h1>
          </div>
        </div>

        {/* Toast Notification */}
        {notification && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-[#202D2D] text-white px-4 py-2.5 rounded-lg text-xs font-semibold z-50 shadow-xl border border-gray-700 animate-fade-in text-center max-w-[90%]">
            {notification}
          </div>
        )}

        {/* Content Container - Full Screen Width */}
        <div className="w-full p-4 md:p-6 lg:p-8 flex flex-col gap-5 box-border">
          {/* Desktop Header */}
          <div className="hidden md:flex flex-col gap-1 pb-4 border-b border-[#CBD5E1]">
            <h1 className="text-[22px] lg:text-2xl font-bold text-[#202D2D] leading-[33px] m-0">
              Report Issue
            </h1>
            <p className="text-[13px] lg:text-sm text-[#485563] leading-5 m-0 font-normal">
              Loading shortfall before departure - fast issue logging to alert dispatch and operations
            </p>
          </div>

          {/* Desktop Pre-filled Context Bar - Stretches full width */}
          <div className="hidden md:grid md:grid-cols-4 bg-[#F9FAFB] rounded-xl p-4 gap-6 border border-[#E2E8F0]/60">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold text-[#485563] uppercase tracking-wide">
                Active Trip
              </span>
              <span className="text-sm font-bold text-[#202D2D]">
                PEL-R04 / S1-T001
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold text-[#485563] uppercase tracking-wide">
                Vehicle
              </span>
              <span className="text-sm font-bold text-[#202D2D]">
                PEL-R04
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold text-[#485563] uppercase tracking-wide">
                Outlet
              </span>
              <span className="text-sm font-semibold text-[#485563]">
                OUT001 / Colpetty Retailer
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold text-[#485563] uppercase tracking-wide">
                Order Ref
              </span>
              <span className="font-jetbrains text-sm font-bold text-[#202D2D]">
                S1-001
              </span>
            </div>
          </div>

          {/* Mobile Pre-filled Context Box */}
          <div className="flex md:hidden flex-col bg-[#F9FAFB] rounded-lg p-3 gap-1.5 border border-[#E2E8F0]/60">
            <span className="text-[13px] font-semibold text-[#202D2D] leading-5">
              Trip: PEL-R04 / S1-T001 · Order: S1-001
            </span>
            <span className="text-[13px] font-semibold text-[#202D2D] leading-5">
              Outlet: OUT001 / Colpetty Retailer
            </span>
          </div>

          {/* Issue Type Section - Stretches across full width */}
          <div className="flex flex-col gap-2 md:gap-3 w-full">
            <label className="text-[13px] font-bold md:text-[#485563] text-[#202D2D] leading-5">
              Select Issue Type
            </label>

            {/* Desktop: 4 columns | Mobile: 2x2 grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4 w-full">
              {/* Option 1: Missing */}
              <button
                type="button"
                onClick={() => setIssueType("missing")}
                className={`flex flex-col items-center justify-center p-3 md:p-4 gap-2 md:gap-3 rounded-xl transition-all shadow-[0px_4px_12px_rgba(15,23,42,0.03)] h-[72px] md:h-[88px] ${
                  issueType === "missing"
                    ? "bg-white border-2 border-[#F97316]"
                    : "bg-white border border-[#CBD5E1] hover:border-gray-400"
                }`}
              >
                <HelpCircleIcon className="hidden md:block w-6 h-6 text-[#485563]" />
                <AlertCircleIcon className="md:hidden w-5 h-5 text-[#485563]" />
                <span className="text-xs md:text-[13px] font-bold text-[#202D2D]">
                  Missing
                </span>
              </button>

              {/* Option 2: Damaged */}
              <button
                type="button"
                onClick={() => setIssueType("damaged")}
                className={`flex flex-col items-center justify-center p-3 md:p-4 gap-2 md:gap-3 rounded-xl transition-all shadow-[0px_4px_12px_rgba(15,23,42,0.03)] h-[72px] md:h-[88px] ${
                  issueType === "damaged"
                    ? "bg-white border-2 border-[#F97316]"
                    : "bg-white border border-[#CBD5E1] hover:border-gray-400"
                }`}
              >
                <AlertTriangleIcon className="hidden md:block w-6 h-6 text-[#F59E0B]" />
                <CheckCircleIcon className="md:hidden w-5 h-5 text-[#D1A108]" />
                <span className="text-xs md:text-[13px] font-bold text-[#202D2D]">
                  Damaged
                </span>
              </button>

              {/* Option 3: Short Quantity */}
              <button
                type="button"
                onClick={() => setIssueType("short")}
                className={`flex flex-col items-center justify-center p-3 md:p-4 gap-2 md:gap-3 rounded-xl transition-all shadow-[0px_4px_12px_rgba(15,23,42,0.03)] h-[72px] md:h-[88px] ${
                  issueType === "short"
                    ? "bg-white border-2 border-[#F97316]"
                    : "bg-white border border-[#CBD5E1] hover:border-gray-400"
                }`}
              >
                <MinusIcon className="hidden md:block w-6 h-6 text-[#485563]" />
                <AlertCircleIcon className="md:hidden w-5 h-5 text-[#485563]" />
                <span className="text-xs md:text-[13px] font-bold text-[#202D2D]">
                  <span className="md:hidden">Short</span>
                  <span className="hidden md:inline">Short Quantity</span>
                </span>
              </button>

              {/* Option 4: Vehicle Problem */}
              <button
                type="button"
                onClick={() => setIssueType("vehicle")}
                className={`flex flex-col items-center justify-center p-3 md:p-4 gap-2 md:gap-3 rounded-xl transition-all shadow-[0px_4px_12px_rgba(15,23,42,0.03)] h-[72px] md:h-[88px] ${
                  issueType === "vehicle"
                    ? "bg-white border-2 border-[#F97316]"
                    : "bg-white border border-[#CBD5E1] hover:border-gray-400"
                }`}
              >
                <SettingsIcon className="hidden md:block w-6 h-6 text-[#485563]" />
                <AlertCircleIcon className="md:hidden w-5 h-5 text-[#485563]" />
                <span className="text-xs md:text-[13px] font-bold text-[#202D2D]">
                  Vehicle Problem
                </span>
              </button>
            </div>
          </div>

          {/* DESKTOP TWO-COLUMN ARRANGEMENT (Fills the entire screen) */}
          <div className="hidden md:grid md:grid-cols-12 gap-6 w-full items-start">
            {/* Left Column: Discrepancy & Item Specifications (col-span-6) */}
            <div className="md:col-span-6 lg:col-span-6 flex flex-col gap-5">
              {/* Card 1: Discrepancy Input Form */}
              <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-4 shadow-sm">
                <div className="pb-3 border-b border-[#F1F5F9]">
                  <h2 className="text-[17px] lg:text-[18px] font-bold text-[#202D2D] leading-[24px] m-0">
                    Discrepancy Details
                  </h2>
                  <p className="text-xs text-[#485563] m-0">
                    Record observed shortage or stock damage for order S1-001
                  </p>
                </div>

                {/* Quantities in 2-column grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Expected Quantity */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#485563] uppercase tracking-wide">
                      Expected Quantity
                    </label>
                    <div className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-3 text-sm font-semibold text-[#202D2D] leading-[21px] select-none">
                      80 chilled units
                    </div>
                  </div>

                  {/* Reported Affected Quantity */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#485563] uppercase tracking-wide">
                      Affected Quantity
                    </label>
                    <input
                      type="text"
                      value={affectedQty}
                      onChange={(e) => setAffectedQty(e.target.value)}
                      className="w-full bg-white border-2 border-[#CBD5E1] rounded-lg p-2.5 text-sm font-semibold text-[#202D2D] leading-[21px] focus:outline-none focus:border-[#F97316] transition-colors"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#485563] uppercase tracking-wide">
                    Defect Notes & Observations
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg p-3 text-sm text-[#202D2D] leading-[21px] focus:outline-none focus:border-[#F97316] transition-colors resize-none"
                  />
                </div>

                {/* Reporter & Event Time in a 2-col subgrid */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#485563] uppercase tracking-wide">
                      Reporter
                    </label>
                    <div className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-2.5 text-xs font-semibold text-[#202D2D] select-none truncate">
                      Kasun Perera (Loader)
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#485563] uppercase tracking-wide">
                      Event Time
                    </label>
                    <div className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-2.5 text-xs font-jetbrains font-semibold text-[#202D2D] select-none">
                      2026-01-08 05:45
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Affected Item & Cold Chain Specs */}
              <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-3 shadow-sm">
                <div className="pb-2.5 border-b border-[#F1F5F9] flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#202D2D] m-0">
                    Item Specifications & Cold Chain Data
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8]">
                    COLD CHAIN
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex flex-col">
                    <span className="text-[#64748B]">Item SKU:</span>
                    <span className="font-bold text-[#202D2D]">CH-8821 · Fresh Milk 1L</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#64748B]">Batch / Lot:</span>
                    <span className="font-jetbrains font-bold text-[#202D2D]">LOT-20260105-04</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#64748B]">Required Temp:</span>
                    <span className="font-bold text-[#059669]">+2°C to +4°C (Verified)</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#64748B]">Pallet Position:</span>
                    <span className="font-bold text-[#202D2D]">Pallet Bay #02 (Front)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Evidence, Resolution & Operational Impact (col-span-6) */}
            <div className="md:col-span-6 lg:col-span-6 flex flex-col gap-5">
              {/* Card 1: Photo Evidence */}
              <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-3 shadow-sm">
                <div className="flex justify-between items-center pb-2.5 border-b border-[#F1F5F9]">
                  <div>
                    <h3 className="text-sm font-bold text-[#202D2D] m-0">
                      Photo Evidence
                    </h3>
                    <p className="text-xs text-[#485563] m-0">
                      Attach photo of damage, packaging, or barcode
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-[#F97316] bg-[#FFF4ED] px-2 py-0.5 rounded">
                    REQUIRED
                  </span>
                </div>

                <div
                  className="w-full bg-[#FAFAFA] border-2 border-dashed border-[#CBD5E1] rounded-xl flex flex-col items-center justify-center p-6 gap-3 cursor-pointer hover:border-[#F97316] hover:bg-orange-50/20 transition-all min-h-[140px]"
                  onClick={() => alert("Photo capture dialog / file upload opened.")}
                >
                  <div className="w-12 h-12 rounded-full bg-[#F3F4F6] text-[#485563] flex items-center justify-center">
                    <CameraIcon className="w-6 h-6 text-[#485563]" />
                  </div>
                  <div className="text-center flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-[#202D2D]">
                      Click to upload photo or tap to capture
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      Supported formats: JPG, PNG, WEBP (Max 10MB)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#485563] pt-1">
                  <span>✓ Barcode visible</span>
                  <span>✓ Damaged seal shown</span>
                  <span>✓ Pallet label clear</span>
                </div>
              </div>

              {/* Card 2: Resolution Options */}
              <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-3 shadow-sm">
                <div className="pb-2.5 border-b border-[#F1F5F9]">
                  <h3 className="text-sm font-bold text-[#202D2D] m-0">
                    Resolution Options
                  </h3>
                  <p className="text-xs text-[#485563] m-0">
                    Select recommended handling for Central Dispatch
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setResolution("replace")}
                    className={`p-3.5 rounded-xl text-left flex flex-col gap-1 transition-all ${
                      resolution === "replace"
                        ? "bg-[#FFF4ED] border-2 border-[#F97316] text-[#202D2D] shadow-xs"
                        : "bg-white border border-[#CBD5E1] text-[#485563] hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#202D2D]">Replace affected stock</span>
                      {resolution === "replace" && (
                        <span className="w-4 h-4 rounded-full bg-[#F97316] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#485563] leading-4">
                      Requisition 8 replacement units from Bay 3 buffer immediately
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolution("defer")}
                    className={`p-3.5 rounded-xl text-left flex flex-col gap-1 transition-all ${
                      resolution === "defer"
                        ? "bg-[#FFF4ED] border-2 border-[#F97316] text-[#202D2D] shadow-xs"
                        : "bg-white border border-[#CBD5E1] text-[#485563] hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#202D2D]">Defer entire order</span>
                      {resolution === "defer" && (
                        <span className="w-4 h-4 rounded-full bg-[#F97316] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#485563] leading-4">
                      Move order S1-001 to next scheduled delivery wave (09:00 AM)
                    </span>
                  </button>
                </div>
              </div>

              {/* Card 3: Dispatcher Alert Notification Banner & Operational Delay */}
              <div className="flex items-start gap-3 p-4 bg-[#FFF4ED] border border-[#FDBA74] rounded-xl shadow-xs">
                <BadgeAlertIcon className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-[#92400E]">
                    Dispatcher Notification & Trip Hold
                  </span>
                  <span className="text-xs text-[#78350F] leading-relaxed">
                    Dispatch will be notified immediately upon submission. Trip PEL-R04 will be placed on <strong>HOLD</strong> until the issue is cleared. Estimated departure delay: ~15 mins.
                  </span>
                </div>
              </div>

              {/* Card 4: Action Controls */}
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="w-full py-3.5 bg-white hover:bg-gray-100 border border-[#CBD5E1] rounded-xl font-bold text-sm text-[#485563] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="w-full py-3.5 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    <span>Report Shortfall</span>
                    <span>→</span>
                  </button>
                </div>

                {/* Prototype Demonstration Note */}
                <div className="text-[11px] text-[#64748B] text-center leading-4 pt-1">
                  Note: This shortage is a simulated operational event for prototype demonstration.
                </div>
              </div>
            </div>
          </div>

          {/* MOBILE SEQUENTIAL LAYOUT */}
          <div className="flex md:hidden flex-col gap-4 w-full">
            {/* Expected Quantity */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-[#202D2D] leading-5">
                Expected Quantity
              </label>
              <div className="w-full bg-white border border-[#CBD5E1] rounded-lg p-3 text-sm text-[#202D2D] leading-[21px] select-none">
                80 chilled units
              </div>
            </div>

            {/* Reported Affected Quantity */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-[#202D2D] leading-5">
                Reported Affected Quantity
              </label>
              <input
                type="text"
                value={affectedQty}
                onChange={(e) => setAffectedQty(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg p-3 text-sm text-[#202D2D] leading-[21px] focus:outline-none focus:border-[#F97316] transition-colors"
              />
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-[#202D2D] leading-5">
                Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg p-3 text-sm text-[#202D2D] leading-[21px] focus:outline-none focus:border-[#F97316] transition-colors resize-none"
              />
            </div>

            {/* Photo Proof (Optional) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[#202D2D] leading-5">
                Photo Proof (Optional)
              </label>
              <div
                className="w-full bg-white border border-dashed border-[#CBD5E1] rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-[#F97316] transition-colors min-h-[90px]"
                onClick={() => alert("Photo capture dialog / file upload opened.")}
              >
                <CameraIcon className="w-6 h-6 text-[#485563]" />
                <span className="text-xs font-medium text-[#485563] text-center">
                  Tap to capture or upload
                </span>
              </div>
            </div>

            {/* Reporter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-[#202D2D] leading-5">
                Reporter
              </label>
              <div className="w-full bg-white border border-[#CBD5E1] rounded-lg p-3 text-sm text-[#202D2D] leading-[21px] select-none">
                Kasun Perera (Loader)
              </div>
            </div>

            {/* Event Time */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-[#202D2D] leading-5">
                Event Time
              </label>
              <div className="w-full bg-white border border-[#CBD5E1] rounded-lg p-3 text-sm text-[#202D2D] leading-[21px] select-none">
                2026-01-08 05:45
              </div>
            </div>

            {/* Resolution */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-[#202D2D] leading-5">
                Resolution
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setResolution("replace")}
                  className={`p-3 rounded-xl text-center font-bold text-xs leading-5 transition-all ${
                    resolution === "replace"
                      ? "bg-white border-2 border-[#CBD5E1] text-[#202D2D] shadow-sm"
                      : "bg-white border border-[#CBD5E1] text-[#485563]"
                  }`}
                >
                  Replace affected stock
                </button>

                <button
                  type="button"
                  onClick={() => setResolution("defer")}
                  className={`p-3 rounded-xl text-center font-bold text-xs leading-5 transition-all ${
                    resolution === "defer"
                      ? "bg-white border-2 border-[#CBD5E1] text-[#202D2D] shadow-sm"
                      : "bg-white border border-[#CBD5E1] text-[#485563]"
                  }`}
                >
                  Defer entire order
                </button>
              </div>
            </div>

            {/* Prototype Demonstration Note */}
            <div className="text-[11px] text-[#485563] text-center leading-4 pt-1">
              Simulated operational event for prototype demonstration
            </div>

            {/* Mobile Actions Stack */}
            <div className="flex flex-col items-center gap-3 mt-1 w-full">
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full h-11 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-sm rounded-lg shadow-[0px_4px_12px_rgba(15,23,42,0.03)] flex items-center justify-center transition-colors"
              >
                Report Shortfall
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="text-[#485563] font-semibold text-sm underline transition-colors py-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <BottomNavBar activeTab="load-sequence" onTabChange={handleTabChange} />
      </main>
    </div>
  );
}
