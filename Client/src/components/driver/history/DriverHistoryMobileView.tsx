"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LocalDeliveryRecord } from "@/lib/driver/driver-offline-db";
import type { IssueReportRecord } from "@/components/driver/today-run/ReportDetailsModal";
import EmptyState from "@/components/common/EmptyState";

export interface DriverHistoryMobileViewProps {
  deliveryRecords: LocalDeliveryRecord[];
  reportRecords: IssueReportRecord[];
  activeTab?: "deliveries" | "reports";
  onTabChange?: (tab: "deliveries" | "reports") => void;
  selectedDeliveryRecord: LocalDeliveryRecord | null;
  onSelectDeliveryRecord: (record: LocalDeliveryRecord | null) => void;
  selectedReportRecord: IssueReportRecord | null;
  onSelectReportRecord: (record: IssueReportRecord | null) => void;
}

export function DriverHistoryMobileView({
  deliveryRecords,
  reportRecords,
  activeTab: controlledTab,
  onTabChange,
  selectedDeliveryRecord,
  onSelectDeliveryRecord,
  selectedReportRecord,
  onSelectReportRecord,
}: DriverHistoryMobileViewProps) {
  const router = useRouter();
  const [internalTab, setInternalTab] = useState<"deliveries" | "reports">("deliveries");
  const currentTab = controlledTab ?? internalTab;

  const handleTabClick = (tab: "deliveries" | "reports") => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // VIEW 3: Delivery History — View Details Screen
  // ─────────────────────────────────────────────────────────────
  if (selectedDeliveryRecord) {
    const rec = selectedDeliveryRecord;
    const formattedDate = new Date(rec.createdAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const formattedTime = new Date(rec.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const isFull = rec.outcome === "full" || !rec.outcome;
    const isDiscrepancy = rec.outcome === "discrepancy";
    const isNotDelivered = rec.outcome === "none";

    return (
      <div
        id="driver-delivery-details-figma-canvas"
        className="relative flex flex-col bg-[#F6F8FB] w-[390px] min-h-[1220px] rounded-[24px] overflow-hidden shadow-2xl pb-28 mx-auto"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Header (390 x 70, bg #FFFFFF) */}
        <header className="relative w-[390px] h-[70px] bg-white flex items-center justify-between px-5 border-b border-[#E2E8F0] shrink-0 z-10">
          <button
            type="button"
            onClick={() => onSelectDeliveryRecord(null)}
            className="text-[#1F293B] font-bold text-[28px] leading-[34px] bg-transparent border-none p-0 cursor-pointer select-none"
            aria-label="Back to History"
          >
            ‹
          </button>
          <span className="text-[#1F293B] font-bold text-[18px] leading-[22px] tracking-tight">
            Delivery Details
          </span>
          <span
            className="text-[#ED5214] font-bold text-[11px] leading-[13px] cursor-pointer"
            onClick={() => onSelectDeliveryRecord(null)}
          >
            History
          </span>
        </header>

        <div className="flex flex-col px-5 pt-4 pb-6">
          {/* ── CARD 1: DELIVERY RECORD (350 x 126, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] min-h-[126px] bg-white rounded-[12px] p-4 flex flex-col justify-between mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <div>
              <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-2">
                DELIVERY RECORD
              </span>
              <span className="block text-[#1F293B] font-bold text-[16px] leading-[19px] mb-2">
                {rec.stopName || "OUT001 / Colpetty Retailer"}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span
                className={`font-bold text-[12px] leading-[15px] ${
                  isFull
                    ? "text-[#1F9457]"
                    : isDiscrepancy
                    ? "text-[#ED5214]"
                    : "text-[#DC2626]"
                }`}
              >
                {isFull
                  ? "Delivered in Full"
                  : isDiscrepancy
                  ? "Delivered — Discrepancy"
                  : "Not Delivered"}
              </span>
              <span className="text-[#6B788C] text-[10px] leading-[12px] font-normal">
                {formattedDate} • {formattedTime}
              </span>
            </div>
          </div>

          {/* ── CARD 2: TRIP & STOP (350 x 150, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] min-h-[150px] bg-white rounded-[12px] p-4 flex flex-col mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-3">
              TRIP &amp; STOP
            </span>

            <div className="flex flex-col gap-2.5 text-[10px] leading-[12px]">
              <div className="flex items-center">
                <span className="w-[104px] text-[#6B788C] font-normal">Trip</span>
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  Trip A
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-[104px] text-[#6B788C] font-normal">Stop</span>
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  {rec.stopId === "DEP001" ? "Depot Check" : "1 of 4"}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-[104px] text-[#6B788C] font-normal">Vehicle</span>
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  {rec.vehicleId || "-"}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-[104px] text-[#6B788C] font-normal">Access</span>
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  Rear Dock
                </span>
              </div>
            </div>
          </div>

          {/* ── CARD 3: ORDERS & QUANTITIES (350 x 208, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] min-h-[208px] bg-white rounded-[12px] p-4 flex flex-col mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-3">
              ORDERS &amp; QUANTITIES
            </span>

            {/* Order S1-000 */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#1F293B] font-bold text-[13px] leading-[16px]">
                S1-000
              </span>
              <span className="text-[#6B788C] text-[10px] leading-[12px] font-normal">
                Expected 80
              </span>
              <span className="text-[#1F9457] font-bold text-[10px] leading-[12px]">
                Delivered 80 ✓
              </span>
            </div>

            {/* Order S1-001 */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#1F293B] font-bold text-[13px] leading-[16px]">
                S1-001
              </span>
              <span className="text-[#6B788C] text-[10px] leading-[12px] font-normal">
                Expected 80
              </span>
              <span
                className={`font-bold text-[10px] leading-[12px] ${
                  isDiscrepancy ? "text-[#ED5214]" : "text-[#1F9457]"
                }`}
              >
                {isDiscrepancy ? "Delivered 72" : "Delivered 80 ✓"}
              </span>
            </div>

            {/* Frame Box (318 x 62, bg #EBFAF0, r: 8px) */}
            <div
              className={`w-[318px] min-h-[62px] rounded-[8px] p-3 flex items-center justify-between ${
                isDiscrepancy
                  ? "bg-[#FFF4ED] border border-[#ED5214]/20"
                  : "bg-[#EBFAF0] border border-[#1F9457]/20"
              }`}
            >
              <div className="flex flex-col">
                <span className="text-[#6B788C] text-[10px] leading-[12px] font-normal mb-1">
                  Total delivered
                </span>
                <span
                  className={`font-bold text-[14px] leading-[17px] ${
                    isDiscrepancy ? "text-[#ED5214]" : "text-[#1F9457]"
                  }`}
                >
                  {isDiscrepancy ? "152 units" : "160 units"}
                </span>
              </div>
              <span
                className={`font-bold text-[10px] leading-[12px] ${
                  isDiscrepancy ? "text-[#ED5214]" : "text-[#1F9457]"
                }`}
              >
                {isDiscrepancy ? "Shortage recorded" : "All quantities matched"}
              </span>
            </div>
          </div>

          {/* ── CARD 4: PROOF OF DELIVERY (350 x 156, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] min-h-[156px] bg-white rounded-[12px] p-4 flex flex-col mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-3">
              PROOF OF DELIVERY
            </span>

            <div className="flex flex-col gap-2.5 text-[10px] leading-[12px]">
              <div className="flex items-center justify-between">
                <span className="text-[#6B788C] font-normal">Photo Evidence</span>
                <span className="text-[#1F9457] font-bold text-[11px] leading-[13px]">
                  {rec.podDetails?.hasPhoto || rec.podDetails?.photoUrl || rec.podDetails?.photoName
                    ? "Captured ✓"
                    : "Verified ✓"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B788C] font-normal">Store Manager Signature</span>
                <span className="text-[#1F9457] font-bold text-[11px] leading-[13px]">
                  Captured ✓
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B788C] font-normal">Sync Status</span>
                <span className="text-[#1F9457] font-bold text-[11px] leading-[13px]">
                  Synced to trip log ✓
                </span>
              </div>
              <span className="text-[#1F9457] font-bold text-[10px] leading-[12px] pt-1 border-t border-[#EDF2FA]">
                POD complete
              </span>
            </div>
          </div>

          {/* ── CARD 5: RECORDED NOTES (350 x 116, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] min-h-[116px] bg-white rounded-[12px] p-4 flex flex-col mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-2">
              RECORDED NOTES
            </span>
            <p className="text-[#1F293B] text-[11px] leading-[15px] font-normal m-0">
              {rec.discrepancyDetails?.notes ||
                rec.notDeliveredDetails?.notes ||
                "Delivery completed successfully. Replacement stock for S1-001 was verified before departure."}
            </p>
          </div>

          {/* ── CARD 6: BUTTON CARD (350 x 92, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] h-[92px] bg-white rounded-[12px] p-4 flex items-center justify-center mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <button
              type="button"
              id="back-to-history-button"
              onClick={() => onSelectDeliveryRecord(null)}
              className="w-[318px] h-[48px] bg-[#EDF2FA] hover:bg-[#e2e8f0] text-[#ED5214] font-bold text-[13px] leading-[16px] rounded-[10px] flex items-center justify-center cursor-pointer transition-all border-none"
            >
              Back to History
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW 4: Report History — View Details Screen
  // ─────────────────────────────────────────────────────────────
  if (selectedReportRecord) {
    const rep = selectedReportRecord;
    const formattedDate = new Date(rep.createdAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const formattedTime = new Date(rep.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div
        id="driver-report-details-figma-canvas"
        className="relative flex flex-col bg-[#F6F8FB] w-[390px] min-h-[1260px] rounded-[24px] overflow-hidden shadow-2xl pb-28 mx-auto"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Header (390 x 70, bg #FFFFFF) */}
        <header className="relative w-[390px] h-[70px] bg-white flex items-center justify-between px-5 border-b border-[#E2E8F0] shrink-0 z-10">
          <button
            type="button"
            onClick={() => onSelectReportRecord(null)}
            className="text-[#1F293B] font-bold text-[28px] leading-[34px] bg-transparent border-none p-0 cursor-pointer select-none"
            aria-label="Back to Report History"
          >
            ‹
          </button>
          <span className="text-[#1F293B] font-bold text-[18px] leading-[22px] tracking-tight">
            Report Details
          </span>
          <span
            className="text-[#ED5214] font-bold text-[11px] leading-[13px] cursor-pointer"
            onClick={() => onSelectReportRecord(null)}
          >
            History
          </span>
        </header>

        <div className="flex flex-col px-5 pt-4 pb-6">
          {/* ── CARD 1: ISSUE REPORT (350 x 140, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] min-h-[140px] bg-white rounded-[12px] p-4 flex flex-col justify-between mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <div>
              <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-2">
                ISSUE REPORT
              </span>
              <span className="block text-[#ED5214] font-bold text-[17px] leading-[21px] mb-1.5">
                {rep.id}
              </span>
              <span className="block text-[#1F293B] font-bold text-[13px] leading-[16px] mb-2">
                {rep.categoryLabel || "Delivery Quantity Issue"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#ED5214] font-bold text-[11px] leading-[13px]">
                {rep.status === "Synced" ? "Submitted" : rep.status}
              </span>
              <span className="text-[#6B788C] text-[10px] leading-[12px] font-normal">
                {formattedDate} • {formattedTime}
              </span>
            </div>
          </div>

          {/* ── CARD 2: REPORT CONTEXT (350 x 178, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] min-h-[178px] bg-white rounded-[12px] p-4 flex flex-col mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-3">
              REPORT CONTEXT
            </span>

            <div className="flex flex-col gap-2.5 text-[10px] leading-[12px]">
              <div className="flex items-center">
                <span className="w-[89px] text-[#6B788C] font-normal">Trip</span>
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  Trip A
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-[89px] text-[#6B788C] font-normal">Stop</span>
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  {rep.stopCode ? `Stop 1 of 4` : "1 of 4"}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-[89px] text-[#6B788C] font-normal">Outlet</span>
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  {rep.outletName || "OUT001 / Colpetty Retailer"}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-[89px] text-[#6B788C] font-normal">Order</span>
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  {rep.orderId || "S1-001"}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-[89px] text-[#6B788C] font-normal">Vehicle</span>
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  {rep.vehicleId || "-"}
                </span>
              </div>
            </div>
          </div>

          {/* ── CARD 3: DESCRIPTION / DETAILS (350 x 142, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] min-h-[142px] bg-white rounded-[12px] p-4 flex flex-col justify-between mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <div>
              <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-2">
                DESCRIPTION / DETAILS
              </span>
              <p className="text-[#1F293B] text-[11px] leading-[15px] font-normal m-0 mb-3">
                {rep.description ||
                  "8 units were unavailable at delivery. Actual delivered quantity was 72 units against the expected 80 units."}
              </p>
            </div>
            <span className="text-[#ED5214] font-bold text-[10px] leading-[12px]">
              Discrepancy Type: {rep.categoryLabel || "Quantity Shortage"}
            </span>
          </div>

          {/* ── CARD 4: EVIDENCE (350 x 126, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] min-h-[126px] bg-white rounded-[12px] p-4 flex flex-col mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-3">
              EVIDENCE
            </span>

            <div className="flex flex-col gap-2.5 text-[10px] leading-[12px]">
              <div className="flex items-center justify-between">
                <span className="text-[#6B788C] font-normal">Photo / File</span>
                <span className="text-[#1F9457] font-bold text-[11px] leading-[13px]">
                  {rep.photo ? "Attached ✓" : "Attached ✓"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B788C] font-normal">Linked to delivery record</span>
                <span className="text-[#1F293B] font-normal text-[11px] leading-[13px]">
                  Available in trip log
                </span>
              </div>
              <span className="text-[#1F9457] font-bold text-[10px] leading-[12px] pt-1 border-t border-[#EDF2FA]">
                Evidence saved successfully
              </span>
            </div>
          </div>

          {/* ── CARD 5: REPORT UPDATE (350 x 180, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] min-h-[180px] bg-white rounded-[12px] p-4 flex flex-col mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-3">
              REPORT UPDATE
            </span>

            <div className="flex flex-col gap-2.5 text-[10px] leading-[12px]">
              <div className="flex items-center justify-between">
                <span className="text-[#6B788C] font-normal">Current Status</span>
                <span className="text-[#ED5214] font-bold text-[11px] leading-[13px]">
                  Submitted
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B788C] font-normal">Assigned Context</span>
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  Current trip / stop
                </span>
              </div>
              <div className="flex flex-col gap-1 pt-1">
                <span className="text-[#6B788C] font-normal">Driver Action</span>
                <span className="text-[#1F293B] font-normal text-[11px] leading-[13px]">
                  No additional action required now
                </span>
              </div>
              <span className="text-[#6B788C] text-[10px] leading-[12px] font-normal pt-1 border-t border-[#EDF2FA]">
                Updates will appear in Report History.
              </span>
            </div>
          </div>

          {/* ── CARD 6: BUTTON CARD (350 x 92, bg #FFFFFF, r: 12px) ── */}
          <div className="w-[350px] h-[92px] bg-white rounded-[12px] p-4 flex items-center justify-center mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <button
              type="button"
              id="back-to-report-history-button"
              onClick={() => onSelectReportRecord(null)}
              className="w-[318px] h-[48px] bg-[#EDF2FA] hover:bg-[#e2e8f0] text-[#ED5214] font-bold text-[13px] leading-[16px] rounded-[10px] flex items-center justify-center cursor-pointer transition-all border-none"
            >
              Back to Report History
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MAIN VIEWS: Delivery History List OR Report History List
  // ─────────────────────────────────────────────────────────────
  return (
    <div
      id="driver-history-main-canvas"
      className="relative flex flex-col bg-[#F6F8FB] w-[390px] min-h-[1080px] rounded-[24px] overflow-hidden shadow-2xl pb-28 mx-auto"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Top Header Frame (390 x 70, bg #FFFFFF) ── */}
      <header className="relative w-[390px] h-[70px] bg-white flex items-center justify-between px-5 border-b border-[#E2E8F0] shrink-0 z-10">
        <span
          className="text-[#ED5214] font-bold text-[21px] leading-[25px] tracking-tight cursor-pointer"
          onClick={() => router.push("/driver/today-run")}
        >
          RightGo
        </span>
        <span className="text-[#6B788C] font-bold text-[12px] leading-[15px]">
          Driver
        </span>
      </header>

      <div className="flex flex-col px-5 pt-5 pb-6">
        {/* Title */}
        <h1 className="text-[#1F293B] font-bold text-[23px] leading-[28px] m-0 mb-4">
          History
        </h1>

        {/* ── Tabs Switcher Frame (350 x 62, bg #FFFFFF, r: 12px) ── */}
        <div className="w-[350px] h-[62px] bg-white rounded-[12px] p-2 flex items-center justify-between mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
          {/* Tab 1: Delivery History */}
          <button
            type="button"
            id="tab-delivery-history"
            onClick={() => handleTabClick("deliveries")}
            className={`w-[163px] h-[46px] rounded-[9px] flex items-center justify-center text-[12px] leading-[15px] font-bold transition-all cursor-pointer border-none ${
              currentTab === "deliveries"
                ? "bg-[#FFF2E8] text-[#ED5214]"
                : "bg-[#EDF2FA] text-[#455263] hover:bg-[#e2e8f0]"
            }`}
          >
            Delivery History
          </button>

          {/* Tab 2: Report History */}
          <button
            type="button"
            id="tab-report-history"
            onClick={() => handleTabClick("reports")}
            className={`w-[163px] h-[46px] rounded-[9px] flex items-center justify-center text-[12px] leading-[15px] font-bold transition-all cursor-pointer border-none ${
              currentTab === "reports"
                ? "bg-[#FFF2E8] text-[#ED5214]"
                : "bg-[#EDF2FA] text-[#455263] hover:bg-[#e2e8f0]"
            }`}
          >
            Report History
          </button>
        </div>

        {/* ───────────────────────────────────────────────────────
            TAB 1 CONTENT: DELIVERY HISTORY
            ─────────────────────────────────────────────────────── */}
        {currentTab === "deliveries" && (
          <div className="flex flex-col">
            {/* Context Card (350 x 92, bg #FFFFFF, r: 12px) */}
            <div className="w-[350px] min-h-[92px] bg-white rounded-[12px] p-4 flex flex-col justify-between mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
              <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider">
                DELIVERY HISTORY
              </span>
              <span className="block text-[#1F293B] font-normal text-[11px] leading-[13px]">
                Completed stops and recorded delivery outcomes.
              </span>
              <span className="block text-[#6B788C] font-normal text-[10px] leading-[12px]">
                Trip A
              </span>
            </div>

            {/* Delivery History Cards List */}
            {/* 1. Dynamic records */}
            {deliveryRecords.map((item, idx) => {
              const formattedDate = new Date(item.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const formattedTime = new Date(item.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const isDiscrepancy = item.outcome === "discrepancy";
              const isNotDelivered = item.outcome === "none";

              return (
                <div
                  key={item.id}
                  className="w-[350px] min-h-[180px] bg-white rounded-[12px] p-4 flex flex-col justify-between mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]"
                >
                  <div>
                    <span className="block text-[#6B788C] font-normal text-[10px] leading-[12px] mb-2">
                      {formattedDate} • {formattedTime}
                    </span>
                    <span className="block text-[#1F293B] font-bold text-[15px] leading-[18px] mb-2 truncate">
                      {item.stopName}
                    </span>
                    <span
                      className={`block font-bold text-[11px] leading-[13px] mb-2 ${
                        isDiscrepancy
                          ? "text-[#ED5214]"
                          : isNotDelivered
                          ? "text-[#DC2626]"
                          : "text-[#1F9457]"
                      }`}
                    >
                      {isDiscrepancy
                        ? "Delivered — Discrepancy"
                        : isNotDelivered
                        ? "Not Delivered"
                        : "Delivered in Full"}
                    </span>
                    <span className="block text-[#6B788C] font-normal text-[10px] leading-[12px] mb-3">
                      Stop {idx + 1} • Orders S1-000, S1-001 • POD captured
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectDeliveryRecord(item)}
                    className="w-[318px] h-[40px] bg-[#EDF2FA] hover:bg-[#e2e8f0] text-[#ED5214] font-bold text-[12px] leading-[15px] rounded-[9px] flex items-center justify-center cursor-pointer transition-all border-none"
                  >
                    View Details
                  </button>
                </div>
              );
            })}

            {deliveryRecords.length === 0 && (
              <EmptyState
                title="No delivery history yet"
                description="Completed stops will appear here once you record a delivery outcome."
              />
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────
            TAB 2 CONTENT: REPORT HISTORY
            ─────────────────────────────────────────────────────── */}
        {currentTab === "reports" && (
          <div className="flex flex-col">
            {/* Context Card (350 x 84, bg #FFFFFF, r: 12px) */}
            <div className="w-[350px] min-h-[84px] bg-white rounded-[12px] p-4 flex flex-col justify-between mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
              <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider">
                REPORT HISTORY
              </span>
              <span className="block text-[#1F293B] font-normal text-[11px] leading-[13px]">
                Issues submitted during your assigned trips.
              </span>
              <span className="block text-[#6B788C] font-normal text-[10px] leading-[12px]">
                Reports remain linked to stop, order and vehicle.
              </span>
            </div>

            {/* Report History Cards List */}
            {reportRecords.map((rep) => {
              const formattedDate = new Date(rep.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              });
              const formattedTime = new Date(rep.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const isResolved = rep.status === "Synced";

              return (
                <div
                  key={rep.id}
                  className="w-[350px] min-h-[190px] bg-white rounded-[12px] p-4 flex flex-col justify-between mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[#ED5214] font-bold text-[12px] leading-[15px]">
                        {rep.id}
                      </span>
                      <span className="text-[#6B788C] font-normal text-[9px] leading-[11px]">
                        {formattedDate} • {formattedTime}
                      </span>
                    </div>

                    <span className="block text-[#1F293B] font-bold text-[14px] leading-[17px] mb-2 truncate">
                      {rep.categoryLabel}
                    </span>

                    <span
                      className={`block font-bold text-[11px] leading-[13px] mb-2 ${
                        isResolved ? "text-[#1F9457]" : "text-[#ED5214]"
                      }`}
                    >
                      {isResolved ? "Resolved" : "Submitted"}
                    </span>

                    <span className="block text-[#6B788C] font-normal text-[10px] leading-[12px] mb-3 truncate">
                      {rep.outletName} • {rep.orderId || "Stop Level"} • {rep.tripId} • {rep.vehicleId || "-"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectReportRecord(rep)}
                    className="w-[318px] h-[42px] bg-[#EDF2FA] hover:bg-[#e2e8f0] text-[#ED5214] font-bold text-[12px] leading-[15px] rounded-[9px] flex items-center justify-center cursor-pointer transition-all border-none"
                  >
                    View Details
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
