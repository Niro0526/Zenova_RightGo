"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConnectivity } from "@/context/DriverConnectivityContext";

export interface DriverReportMobileViewProps {
  // Trip & Stop Context
  outletCode?: string;
  outletName?: string;
  tripId?: string;
  stopSequence?: string;
  vehicleId?: string;

  // Form State
  selectedIssueType: string;
  onSelectIssueType: (type: string) => void;
  selectedOrder: string;
  onSelectOrder: (order: string) => void;
  description: string;
  onChangeDescription: (desc: string) => void;
  photo: { name: string; url: string } | null;
  onTriggerPhotoCapture: () => void;
  onTriggerFileUpload: () => void;
  onRemovePhoto: () => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;

  // Submitted Success State
  isSubmitted: boolean;
  submittedReportId: string;
  submittedIssueTypeLabel?: string;
  onViewHistory?: () => void;
  onReturnToStop?: () => void;
}

export const FIGMA_ISSUE_OPTIONS = [
  { id: "Store Closed", label: "Store Closed", requiresOrder: false },
  { id: "Access Blocked", label: "Access Blocked", requiresOrder: false },
  { id: "Delivery Quantity Issue", label: "Delivery Quantity Issue", requiresOrder: true },
  { id: "Damaged Goods", label: "Damaged Goods", requiresOrder: true },
  { id: "Vehicle Issue", label: "Vehicle Issue", requiresOrder: false },
  { id: "Other", label: "Other", requiresOrder: false },
];

export const FIGMA_ORDER_OPTIONS = [
  { id: "S1-001", label: "S1-001 (80 chilled units • 448.6 kg)" },
  { id: "S1-000", label: "S1-000 (12 ambient units • 97.8 kg)" },
  { id: "Entire Stop 1", label: "Entire Stop 1 (OUT001 / Colpetty Retailer)" },
  { id: "Vehicle Level", label: "Vehicle (Trip Level)" },
];

export function DriverReportMobileView({
  outletCode = "OUT001",
  outletName = "Colpetty Retailer",
  tripId = "Trip A",
  stopSequence = "Stop 1 of 4",
  vehicleId = "",

  selectedIssueType,
  onSelectIssueType,
  selectedOrder,
  onSelectOrder,
  description,
  onChangeDescription,
  photo,
  onTriggerPhotoCapture,
  onTriggerFileUpload,
  onRemovePhoto,
  isSubmitting,
  onSubmit,

  isSubmitted,
  submittedReportId,
  submittedIssueTypeLabel,
  onViewHistory,
  onReturnToStop,
}: DriverReportMobileViewProps) {
  const router = useRouter();
  const { connectionState } = useConnectivity();

  // Dropdown open states for mobile custom dropdowns matching Figma
  const [isIssueTypeDropdownOpen, setIsIssueTypeDropdownOpen] = useState(false);
  const [isOrderDropdownOpen, setIsOrderDropdownOpen] = useState(false);

  const displayIssueLabel = selectedIssueType || "Delivery Quantity Issue";
  const displayOrderLabel = selectedOrder || "S1-001";

  return (
    <div
      id="driver-report-figma-canvas"
      className="relative flex flex-col bg-[#F6F8FB] w-[390px] min-h-[1180px] rounded-[24px] overflow-hidden shadow-2xl pb-28 mx-auto"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Top Header Frame (390 x 70, bg #FFFFFF) ── */}
      <header
        className="relative w-[390px] h-[70px] bg-white flex items-center justify-between px-5 border-b border-[#E2E8F0] shrink-0"
        style={{ zIndex: 10 }}
      >
        <span
          className="text-[#ED5214] font-bold text-[21px] leading-[25px] tracking-tight cursor-pointer"
          onClick={() => router.push("/driver/current-stop")}
        >
          RightGo
        </span>

        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: connectionState === "offline" ? "#ED5214" : "#1F9457",
            }}
          />
          <span
            className="font-bold text-[12px] leading-[15px]"
            style={{
              color: connectionState === "offline" ? "#ED5214" : "#1F9457",
            }}
          >
            {connectionState === "offline" ? "Offline" : "Online"}
          </span>
        </div>
      </header>

      {/* ── SCREEN 1: NEW REPORT VIEW ── */}
      {!isSubmitted && (
        <div className="flex flex-col px-5 pt-5 pb-6">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-[#1F293B] font-bold text-[22px] leading-[27px] m-0">
              Report Delivery Issue
            </h1>
            <span className="text-[#ED5214] font-bold text-[11px] leading-[13px]">
              Current Stop
            </span>
          </div>

          {/* ── CARD 1: REPORT CONTEXT (350 x 126, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] min-h-[126px] bg-white rounded-[12px] p-4 flex flex-col justify-between mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <div>
              <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-2">
                REPORT CONTEXT
              </span>
              <span className="block text-[#1F293B] font-bold text-[14px] leading-[17px] mb-2">
                {outletCode} / {outletName}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-[#6B788C] text-[11px] leading-[13px] font-normal">
              <span>
                {tripId} • {stopSequence}
              </span>
              <span>Vehicle {vehicleId}</span>
            </div>
          </div>

          {/* ── CARD 2: ISSUE DETAILS (350 x 334, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] bg-white rounded-[12px] p-4 flex flex-col mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA] relative">
            <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-3">
              ISSUE DETAILS
            </span>

            {/* Field: Issue Type */}
            <div className="flex flex-col mb-3">
              <label className="text-[#6B788C] text-[9px] leading-[11px] font-normal mb-1.5">
                Issue Type
              </label>

              {/* Trigger Box (318 x 44, border #D6DBE3, r: 8px) */}
              <button
                type="button"
                id="issue-type-select-trigger"
                onClick={() => {
                  setIsIssueTypeDropdownOpen((prev) => !prev);
                  setIsOrderDropdownOpen(false);
                }}
                className="w-[318px] h-[44px] bg-white border border-[#D6DBE3] rounded-[8px] px-3 flex items-center justify-between text-left cursor-pointer transition-all hover:border-[#ED5214] focus:outline-none"
              >
                <span className="text-[#1F293B] text-[11px] leading-[13px] font-normal truncate">
                  {displayIssueLabel}
                </span>
                <span className="text-[#ED5214] font-bold text-[16px] leading-[19px] ml-2 select-none">
                  {isIssueTypeDropdownOpen ? "⌃" : "⌄"}
                </span>
              </button>

              {/* Dropdown Options Menu */}
              {isIssueTypeDropdownOpen && (
                <div
                  id="issue-type-dropdown-options"
                  className="w-[318px] bg-white border border-[#D6DBE3] rounded-[8px] p-1.5 mt-1 shadow-lg flex flex-col gap-1 z-30 transition-all animate-in fade-in zoom-in-95 duration-100"
                >
                  {FIGMA_ISSUE_OPTIONS.map((opt) => {
                    const isSelected = selectedIssueType === opt.label || selectedIssueType === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onSelectIssueType(opt.label);
                          setIsIssueTypeDropdownOpen(false);
                        }}
                        className={`w-full h-[34px] rounded-[6px] px-3 flex items-center text-left text-[11px] leading-[13px] font-normal transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#FFF4ED] text-[#ED5214] font-bold"
                            : "text-[#1F293B] hover:bg-[#F6F8FB]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Field: Affected Order */}
            <div className="flex flex-col mb-3">
              <label className="text-[#6B788C] text-[9px] leading-[11px] font-normal mb-1.5">
                Affected Order
              </label>

              {/* Trigger Box (318 x 44, border #D6DBE3, r: 8px) */}
              <button
                type="button"
                id="affected-order-select-trigger"
                onClick={() => {
                  setIsOrderDropdownOpen((prev) => !prev);
                  setIsIssueTypeDropdownOpen(false);
                }}
                className="w-[318px] h-[44px] bg-white border border-[#D6DBE3] rounded-[8px] px-3 flex items-center justify-between text-left cursor-pointer transition-all hover:border-[#ED5214] focus:outline-none"
              >
                <span className="text-[#1F293B] text-[11px] leading-[13px] font-normal truncate">
                  {displayOrderLabel}
                </span>
                <span className="text-[#ED5214] font-bold text-[16px] leading-[19px] ml-2 select-none">
                  {isOrderDropdownOpen ? "⌃" : "⌄"}
                </span>
              </button>

              {/* Order Dropdown Options */}
              {isOrderDropdownOpen && (
                <div
                  id="affected-order-dropdown-options"
                  className="w-[318px] bg-white border border-[#D6DBE3] rounded-[8px] p-1.5 mt-1 shadow-lg flex flex-col gap-1 z-30 transition-all animate-in fade-in zoom-in-95 duration-100"
                >
                  {FIGMA_ORDER_OPTIONS.map((ord) => {
                    const isSelected = selectedOrder === ord.id;
                    return (
                      <button
                        key={ord.id}
                        type="button"
                        onClick={() => {
                          onSelectOrder(ord.id);
                          setIsOrderDropdownOpen(false);
                        }}
                        className={`w-full min-h-[34px] py-1.5 rounded-[6px] px-3 flex items-center text-left text-[11px] leading-[13px] font-normal transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#FFF4ED] text-[#ED5214] font-bold"
                            : "text-[#1F293B] hover:bg-[#F6F8FB]"
                        }`}
                      >
                        {ord.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Field: Description / Details */}
            <div className="flex flex-col">
              <label className="text-[#6B788C] text-[9px] leading-[11px] font-normal mb-1.5">
                Description / Details
              </label>

              <textarea
                id="driver-issue-description-input"
                rows={4}
                value={description}
                onChange={(e) => onChangeDescription(e.target.value)}
                placeholder="Describe what happened and any action already taken…"
                className="w-[318px] min-h-[112px] bg-white border border-[#D6DBE3] rounded-[8px] p-3 text-[#1F293B] placeholder-[#6B788C] text-[11px] leading-[14px] font-normal focus:outline-none focus:border-[#ED5214] resize-none"
              />
            </div>
          </div>

          {/* ── CARD 3: EVIDENCE (350 x 194, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] bg-white rounded-[12px] p-4 flex flex-col mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-3">
              EVIDENCE
            </span>

            {/* Option 1: Capture Photo */}
            <button
              type="button"
              id="capture-photo-button"
              onClick={onTriggerPhotoCapture}
              className="w-[318px] h-[58px] bg-[#EDF2FA] rounded-[9px] px-3 flex items-center gap-3 cursor-pointer hover:bg-[#E2E8F0] transition-colors mb-2 text-left border-none"
            >
              <span className="text-[#ED5214] font-bold text-[20px] leading-[24px] shrink-0">
                ▣
              </span>
              <div className="flex flex-col">
                <span className="text-[#1F293B] font-bold text-[13px] leading-[16px]">
                  Capture Photo
                </span>
                <span className="text-[#6B788C] text-[10px] leading-[12px] font-normal">
                  Take a new issue photo
                </span>
              </div>
            </button>

            {/* Option 2: Upload File */}
            <button
              type="button"
              id="upload-file-button"
              onClick={onTriggerFileUpload}
              className="w-[318px] h-[58px] bg-[#EDF2FA] rounded-[9px] px-3 flex items-center gap-3 cursor-pointer hover:bg-[#E2E8F0] transition-colors text-left border-none"
            >
              <span className="text-[#ED5214] font-bold text-[22px] leading-[27px] shrink-0">
                ↑
              </span>
              <div className="flex flex-col">
                <span className="text-[#1F293B] font-bold text-[13px] leading-[16px]">
                  Upload File
                </span>
                <span className="text-[#6B788C] text-[10px] leading-[12px] font-normal">
                  Attach an existing photo/file
                </span>
              </div>
            </button>

            {/* Attached Photo Preview Badge */}
            {photo && (
              <div className="w-[318px] mt-2.5 p-2 bg-[#F2FCF5] border border-[#1F9457]/30 rounded-[8px] flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={photo.url}
                    alt="Evidence Preview"
                    className="w-8 h-8 rounded object-cover border border-[#1F9457]/40 shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-[#1F293B] truncate">
                      {photo.name}
                    </span>
                    <span className="text-[9px] text-[#1F9457] font-semibold">
                      Photo attached ✓
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onRemovePhoto}
                  className="text-[10px] font-bold text-red-600 bg-white border border-red-200 px-2 py-0.5 rounded cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* ── CARD 4: SUBMIT REPORT (350 x 116, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] min-h-[116px] bg-white rounded-[12px] p-4 flex flex-col justify-between mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-2">
              SUBMIT REPORT
            </span>

            {/* Submit Button (318 x 50, bg #ED5214, r: 10px, text: 14px bold #FFFFFF) */}
            <button
              type="button"
              id="submit-issue-report-button"
              disabled={isSubmitting}
              onClick={onSubmit}
              className="w-[318px] h-[50px] bg-[#ED5214] hover:bg-[#d9460d] text-white font-bold text-[14px] leading-[17px] rounded-[10px] flex items-center justify-center cursor-pointer transition-all active:scale-[0.99] border-none shadow-md disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Issue Report"}
            </button>
          </div>

          {/* ── CARD 5: REPORTING NOTE (350 x 92, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] min-h-[92px] bg-white rounded-[12px] p-4 flex flex-col justify-start mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-2.5">
              REPORTING NOTE
            </span>
            <p className="text-[#1F293B] text-[11px] leading-[13px] font-normal m-0">
              This report is linked to the current trip, stop, order and vehicle.
            </p>
          </div>
        </div>
      )}

      {/* ── SCREEN 2: SUBMITTED SUCCESS VIEW ── */}
      {isSubmitted && (
        <div className="flex flex-col px-5 pt-5 pb-6">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-[#1F293B] font-bold text-[22px] leading-[27px] m-0">
              Report Submitted
            </h1>
          </div>

          {/* ── CARD 1: SUCCESS BANNER (350 x 170, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] h-[170px] bg-white rounded-[12px] p-4 flex flex-col items-center justify-center text-center mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="text-[#1F9457] font-bold text-[30px] leading-[36px] mb-2">
              ✓
            </span>
            <span className="text-[#1F9457] font-bold text-[16px] leading-[19px] mb-2">
              Report Submitted Successfully
            </span>
            <span className="text-[#6B788C] text-[11px] leading-[13px] font-normal max-w-[282px]">
              Your issue report has been submitted and added to the trip log.
            </span>
          </div>

          {/* ── CARD 2: ISSUE REPORT LOGGED (350 x 126, bg #F2FCF5, r: 12px) ── */}
          <div className="w-[350px] min-h-[126px] bg-[#F2FCF5] rounded-[12px] p-4 flex flex-col justify-between mb-3 border border-[#1F9457]/20 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div>
              <span className="block text-[#1F9457] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-2">
                ISSUE REPORT LOGGED
              </span>
              <span className="block text-[#1F293B] font-bold text-[17px] leading-[21px] mb-2">
                {submittedReportId || "REP-S1-T001-004"}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[#1F9457] font-bold text-[11px] leading-[13px]">
                Status: Submitted
              </span>
              <span className="text-[#6B788C] text-[10px] leading-[12px] font-normal">
                {tripId} • Stop 1 • {outletCode}
              </span>
            </div>
          </div>

          {/* ── CARD 3: REPORT SUMMARY (350 x 186, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] min-h-[186px] bg-white rounded-[12px] p-4 flex flex-col mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-3">
              REPORT SUMMARY
            </span>

            <div className="flex flex-col gap-3 text-[10px] leading-[12px]">
              {/* Row: Issue Type */}
              <div className="flex items-center">
                <span className="w-[109px] text-[#6B788C] font-normal">Issue Type</span>
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  {submittedIssueTypeLabel || displayIssueLabel}
                </span>
              </div>

              {/* Row: Affected Order */}
              <div className="flex items-center">
                <span className="w-[109px] text-[#6B788C] font-normal">Affected Order</span>
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  {displayOrderLabel}
                </span>
              </div>

              {/* Row: Outlet */}
              <div className="flex items-center">
                <span className="w-[109px] text-[#6B788C] font-normal">Outlet</span>
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  {outletCode} / {outletName}
                </span>
              </div>

              {/* Row: Evidence */}
              <div className="flex items-center">
                <span className="w-[109px] text-[#6B788C] font-normal">Evidence</span>
                <span className="text-[#1F9457] font-bold text-[11px] leading-[13px]">
                  {photo ? "Photo / file attached ✓" : "None attached"}
                </span>
              </div>

              {/* Row: Vehicle */}
              <div className="flex items-center">
                <span className="w-[109px] text-[#6B788C] font-normal">Vehicle</span>
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  {vehicleId}
                </span>
              </div>
            </div>
          </div>

          {/* ── CARD 4: NEXT ACTION (350 x 154, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] min-h-[154px] bg-white rounded-[12px] p-4 flex flex-col justify-between mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-2">
              NEXT ACTION
            </span>

            <div className="flex flex-col gap-2">
              {/* Button 1: View Report History */}
              <button
                type="button"
                id="view-report-history-button"
                onClick={() => {
                  if (onViewHistory) onViewHistory();
                  else router.push("/driver/history");
                }}
                className="w-[318px] h-[46px] bg-[#ED5214] hover:bg-[#d9460d] text-white font-bold text-[13px] leading-[16px] rounded-[10px] flex items-center justify-center cursor-pointer transition-all border-none shadow-sm"
              >
                View Report History
              </button>

              {/* Button 2: Return to Current Stop */}
              <button
                type="button"
                id="return-to-current-stop-button"
                onClick={() => {
                  if (onReturnToStop) onReturnToStop();
                  else router.push("/driver/current-stop");
                }}
                className="w-[318px] h-[42px] bg-[#EDF2FA] hover:bg-[#e2e8f0] text-[#455263] font-bold text-[12px] leading-[15px] rounded-[10px] flex items-center justify-center cursor-pointer transition-all border-none"
              >
                Return to Current Stop
              </button>
            </div>
          </div>

          {/* ── CARD 5: PERSISTENCE NOTE (350 x 78, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] min-h-[78px] bg-white rounded-[12px] p-4 flex flex-col justify-center mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="text-[#1F293B] text-[11px] leading-[13px] font-normal mb-1">
              The report is saved in History and linked to this delivery.
            </span>
            <span className="text-[#6B788C] text-[10px] leading-[12px] font-normal">
              Continue your current stop when ready.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
