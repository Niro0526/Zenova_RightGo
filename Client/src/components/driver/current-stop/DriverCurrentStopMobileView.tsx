"use client";

import React, { useState } from "react";
import Link from "next/link";
import { describeLoadingNote, describePlanChange, type Stop } from "@/components/driver/today-run/types";
import { useConnectivity } from "@/context/DriverConnectivityContext";
import { DriverOfflineSyncNotice } from "@/components/driver/today-run-workflow";
import { NavigationPanel } from "@/components/driver/NavigationPanel";
import type { DiscrepancyType, NotDeliveredReason } from "@/components/driver/stop-workflow";

import type { OutletContact } from "@/lib/driver/outlet-service";

export interface DriverCurrentStopMobileViewProps {
  stop: Stop;
  totalStopsCount?: number;
  currentStopIndex?: number;
  deliveryStarted: boolean;
  completingDelivery: boolean;
  stopRecorded: boolean;
  orderConfirmed: boolean;
  onToggleOrderConfirmed: () => void;
  onStartDelivery: () => void;
  onProceedToComplete: () => void;
  onBackToOverview: () => void;
  onSubmitStopRecord: () => void;
  onProceedToNextStop: () => void;

  // Delivery Outcome state
  deliveryOutcome: "full" | "discrepancy" | "none";
  onChangeDeliveryOutcome: (outcome: "full" | "discrepancy" | "none") => void;

  // Discrepancy fields
  discrepancyType: DiscrepancyType;
  onChangeDiscrepancyType: (t: DiscrepancyType) => void;
  expectedQty: number;
  deliveredQty: string;
  onChangeDeliveredQty: (qty: string) => void;
  discrepancyNotes: string;
  onChangeDiscrepancyNotes: (notes: string) => void;
  discrepancyPhoto: { name: string; url: string } | null;
  onTriggerDiscrepancyPhoto: () => void;

  // Not Delivered fields
  notDeliveredReason: NotDeliveredReason;
  onChangeNotDeliveredReason: (r: NotDeliveredReason) => void;
  notDeliveredNotes: string;
  onChangeNotDeliveredNotes: (notes: string) => void;
  notDeliveredPhoto: { name: string; url: string } | null;
  onTriggerNotDeliveredPhoto: () => void;

  // POD details
  photoFile: { name: string; url: string } | null;
  signatureFile: { name: string; url: string } | null;
  signerName: string;
  onChangeSignerName: (name: string) => void;
  onTriggerPhotoCapture: () => void;
  onTriggerSignatureCapture: () => void;

  // Navigation Panel state
  isNavigating: boolean;
  onToggleNavigation: (active: boolean) => void;
  stopStatus: "EN_ROUTE" | "ARRIVED" | "DELIVERED";
  arrivalTimestamp: string | null;
  onConfirmArrival: (timestamp: string) => void;
  storeContact?: OutletContact | null;
}

export function DriverCurrentStopMobileView({
  stop,
  totalStopsCount = 4,
  currentStopIndex = 1,
  deliveryStarted,
  completingDelivery,
  stopRecorded,
  orderConfirmed,
  onToggleOrderConfirmed,
  onStartDelivery,
  onProceedToComplete,
  onBackToOverview,
  onSubmitStopRecord,
  onProceedToNextStop,

  deliveryOutcome,
  onChangeDeliveryOutcome,

  discrepancyType,
  onChangeDiscrepancyType,
  expectedQty,
  deliveredQty,
  onChangeDeliveredQty,
  discrepancyNotes,
  onChangeDiscrepancyNotes,
  discrepancyPhoto,
  onTriggerDiscrepancyPhoto,

  notDeliveredReason,
  onChangeNotDeliveredReason,
  notDeliveredNotes,
  onChangeNotDeliveredNotes,
  notDeliveredPhoto,
  onTriggerNotDeliveredPhoto,

  photoFile,
  signatureFile,
  signerName,
  onChangeSignerName,
  onTriggerPhotoCapture,
  onTriggerSignatureCapture,

  isNavigating,
  onToggleNavigation,
  stopStatus,
  arrivalTimestamp,
  onConfirmArrival,
  storeContact,
}: DriverCurrentStopMobileViewProps) {
  const { isOnline, connectionState } = useConnectivity();

  const stopCode = stop.code || "";
  const stopName = stop.name || stop.code || "";
  const timeWindow = stop.timeWindow || "";
  const dockType = stop.dockType || "";
  const phone = storeContact?.phone || stop.managerPhone || "";

  // Coordinates
  const destinationLat = storeContact?.latitude ?? 6.9034;
  const destinationLng = storeContact?.longitude ?? 79.8512;

  // Real orders and quantities for this stop (effective units = after any loading shortfall).
  const orderRows =
    stop.orderDetails && stop.orderDetails.length > 0
      ? stop.orderDetails
      : (stop.orders ?? []).map((orderRef) => ({ orderRef, units: 0, plannedUnits: 0 }));
  const ordersList = orderRows.map((o) => o.orderRef);
  const loadingNotes = stop.loadingNotes ?? [];
  const planChanges = loadingNotes.map(describePlanChange).filter((x): x is string => !!x);
  const deliveredNum = deliveredQty !== "" && Number.isFinite(Number(deliveredQty)) ? Math.max(0, Number(deliveredQty)) : expectedQty;
  // Split the delivered total across the stop's orders exactly as the server does (first order filled first).
  let remainingDelivered = deliveredNum;
  const actualByOrder = orderRows.map((o) => {
    const take = Math.min(o.units, remainingDelivered);
    remainingDelivered -= take;
    return take;
  });
  const shortUnits = Math.max(0, expectedQty - deliveredNum);
  const shortOrderRef = orderRows.find((o, i) => actualByOrder[i] < o.units)?.orderRef ?? orderRows[orderRows.length - 1]?.orderRef ?? "";

  const [isDiscrepancyDropdownOpen, setIsDiscrepancyDropdownOpen] = useState(false);

  // ═════════════════════════════════════════════════════════════════════════
  // 1. STATE 4: STOP RECORDED / SUCCESS CONFIRMATION SCREEN
  // ═════════════════════════════════════════════════════════════════════════
  if (stopRecorded) {
    return (
      <div
        id="driver-current-stop-mobile"
        className="font-inter w-full max-w-[390px] mx-auto min-h-[844px] bg-[#F6F8FB] pb-28 relative flex flex-col shadow-xl sm:rounded-[24px] overflow-hidden border border-slate-200"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Header */}
        <header className="w-full h-[70px] bg-white flex items-center justify-between px-5 border-b border-[#F1F5F9] shrink-0 sticky top-0 z-30 shadow-2xs">
          <span className="font-bold text-[21px] leading-[25px] text-[#ED5214]">
            RightGo
          </span>
          <span className="font-bold text-[12px] leading-[15px] text-[#1F9457]">
            Stop Completed ✓
          </span>
        </header>

        <main className="flex-1 flex flex-col gap-4 px-5 pt-5">
          <DriverOfflineSyncNotice />

          {/* Success Card */}
          <div className="bg-white rounded-[12px] p-5 flex flex-col items-center text-center gap-3 border border-emerald-200 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-2xl shadow-sm">
              ✓
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="font-bold text-[20px] text-[#1F293B] m-0">
                Delivery Recorded
              </h2>
              <span className="font-normal text-[12px] text-[#6B788C]">
                {stopCode} • {stopName}
              </span>
            </div>

            <div className="w-full bg-[#EBFAF0] rounded-[9px] p-3 text-left flex flex-col gap-1 text-[11px] text-[#1F9457]">
              <span className="font-bold">
                Outcome:{" "}
                {deliveryOutcome === "full"
                  ? "Delivered in Full"
                  : deliveryOutcome === "discrepancy"
                  ? `Discrepancy (${discrepancyType})`
                  : `Not Delivered (${notDeliveredReason})`}
              </span>
              <span className="text-[#6B788C]">
                {photoFile ? "✓ Goods photo captured" : ""}
                {photoFile && signatureFile ? " • " : ""}
                {signatureFile ? "✓ Store signature attached" : ""}
              </span>
            </div>

            <button
              type="button"
              id="btn-proceed-next-stop-mobile"
              onClick={onProceedToNextStop}
              className="w-full h-[46px] bg-[#ED5214] hover:bg-[#d8460d] active:scale-[0.98] rounded-[10px] text-white font-bold text-[13px] flex items-center justify-center transition-all no-underline shadow-md mt-2 cursor-pointer border-none"
            >
              Proceed to Next Stop →
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. STATE 3: COMPLETE DELIVERY — SELECT OUTCOME & PROOF OF DELIVERY
  // ═════════════════════════════════════════════════════════════════════════
  if (completingDelivery) {
    return (
      <div
        id="driver-current-stop-mobile"
        className="font-inter w-full max-w-[390px] mx-auto min-h-[844px] bg-[#F6F8FB] pb-28 relative flex flex-col shadow-xl sm:rounded-[24px] overflow-hidden border border-slate-200"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Header (height: 70px) */}
        <header className="w-full h-[70px] bg-white flex items-center justify-between px-5 border-b border-[#F1F5F9] shrink-0 sticky top-0 z-30 shadow-2xs">
          <span className="font-bold text-[21px] leading-[25px] text-[#ED5214]">
            RightGo
          </span>
          <span className="font-bold text-[12px] leading-[15px] text-[#1F9457]">
            Complete Delivery
          </span>
        </header>

        <main className="flex-1 flex flex-col gap-4 px-5 pt-4">
          <DriverOfflineSyncNotice />

          {/* Title row */}
          <div className="flex flex-col gap-0.5">
            <h1 className="font-bold text-[22px] leading-[27px] text-[#1F293B] m-0">
              Complete Delivery
            </h1>
            <span className="font-normal text-[11px] leading-[13px] text-[#6B788C]">
              Stop {currentStopIndex} of {totalStopsCount}
            </span>
          </div>

          {/* ── CARD 1: OUTLET INFO (width: 350px, radius: 12px) ── */}
          <div className="bg-white rounded-[12px] p-4 flex flex-col gap-1 border border-[#E2E8F0] shadow-xs">
            <span className="font-bold text-[10px] leading-[12px] text-[#ED5214] uppercase tracking-wider">
              {stopCode}
            </span>
            <span className="font-bold text-[18px] leading-[22px] text-[#1F293B]">
              {stopName}
            </span>
            <span className="font-normal text-[12px] leading-[15px] text-[#6B788C]">
              {timeWindow} • {dockType}
            </span>
          </div>

          {/* ── CARD 2: DELIVERY OUTCOME SELECTOR (width: 350px, radius: 12px) ── */}
          <div className="bg-white rounded-[12px] p-4 flex flex-col gap-2.5 border border-[#E2E8F0] shadow-xs">
            <span className="font-bold text-[10px] leading-[12px] text-[#6B788C] uppercase tracking-wider">
              DELIVERY OUTCOME
            </span>

            {/* Option A: Delivered in Full */}
            <button
              type="button"
              onClick={() => onChangeDeliveryOutcome("full")}
              className={`w-full h-[40px] px-3.5 rounded-[9px] flex items-center justify-between cursor-pointer transition-all ${
                deliveryOutcome === "full"
                  ? "bg-[#FFF2E8] border-2 border-[#ED5214]"
                  : "bg-[#EDF2FA] border border-[#E0E3E8] hover:bg-slate-100"
              }`}
            >
              <span
                className={`text-[12px] leading-[15px] ${
                  deliveryOutcome === "full"
                    ? "font-bold text-[#ED5214]"
                    : "font-normal text-[#1F293B]"
                }`}
              >
                Delivered in Full
              </span>
              {deliveryOutcome === "full" && (
                <span className="font-bold text-[14px] text-[#ED5214]">✓</span>
              )}
            </button>

            {/* Option B: Delivered — Discrepancy */}
            <button
              type="button"
              onClick={() => onChangeDeliveryOutcome("discrepancy")}
              className={`w-full h-[40px] px-3.5 rounded-[9px] flex items-center justify-between cursor-pointer transition-all ${
                deliveryOutcome === "discrepancy"
                  ? "bg-[#FFF2E8] border-2 border-[#ED5214]"
                  : "bg-[#EDF2FA] border border-[#E0E3E8] hover:bg-slate-100"
              }`}
            >
              <span
                className={`text-[12px] leading-[15px] ${
                  deliveryOutcome === "discrepancy"
                    ? "font-bold text-[#ED5214]"
                    : "font-normal text-[#1F293B]"
                }`}
              >
                Delivered — Discrepancy
              </span>
              {deliveryOutcome === "discrepancy" && (
                <span className="font-bold text-[14px] text-[#ED5214]">✓</span>
              )}
            </button>

            {/* Option C: Not Delivered */}
            <button
              type="button"
              onClick={() => onChangeDeliveryOutcome("none")}
              className={`w-full h-[40px] px-3.5 rounded-[9px] flex items-center justify-between cursor-pointer transition-all ${
                deliveryOutcome === "none"
                  ? "bg-[#FFF2E8] border-2 border-[#ED5214]"
                  : "bg-[#EDF2FA] border border-[#E0E3E8] hover:bg-slate-100"
              }`}
            >
              <span
                className={`text-[12px] leading-[15px] ${
                  deliveryOutcome === "none"
                    ? "font-bold text-[#ED5214]"
                    : "font-normal text-[#1F293B]"
                }`}
              >
                Not Delivered
              </span>
              {deliveryOutcome === "none" && (
                <span className="font-bold text-[14px] text-[#ED5214]">✓</span>
              )}
            </button>
          </div>

          {/* ── CARD 3A: DELIVERED IN FULL — ORDER QUANTITIES BREAKDOWN (350x238, radius: 12px) ── */}
          {deliveryOutcome === "full" && (
            <div className="bg-white rounded-[12px] p-4 flex flex-col gap-3.5 border border-[#E2E8F0] shadow-xs">
              <span className="font-bold text-[10px] leading-[12px] text-[#6B788C] uppercase tracking-wider">
                ORDER QUANTITIES
              </span>

              {orderRows.map((o) => (
                <div key={o.orderRef} className="flex items-center justify-between py-1 border-b border-[#F1F5F9]">
                  <span className="font-bold text-[14px] leading-[17px] text-[#1F293B]">
                    {o.orderRef}
                  </span>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center">
                      <span className="font-normal text-[10px] text-[#6B788C]">
                        Expected
                      </span>
                      <span className="font-bold text-[15px] text-[#1F293B]">{o.units}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="font-normal text-[10px] text-[#6B788C]">
                        Actual
                      </span>
                      <span className="font-bold text-[15px] text-[#1F9457]">{o.units}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Match Banner */}
              {/* Match Banner */}
              <div className="bg-[#EBFAF0] rounded-[9px] p-3 flex items-center justify-center">
                <span className="font-bold text-[11px] leading-[13px] text-[#1F9457]">
                  All quantities match expected shipment ✓
                </span>
              </div>
            </div>
          )}

          {/* ── CARD 3B: DISCREPANCY FLOW (ACTUAL QUANTITIES, DETAILS, DRIVER NOTE) ── */}
          {deliveryOutcome === "discrepancy" && (
            <>
              {/* 1. ACTUAL QUANTITIES (height: 260px, radius: 12px, bg: #FFFFFF) */}
              <div className="bg-white rounded-[12px] p-4 flex flex-col gap-3 border border-[#E2E8F0] shadow-xs">
                <span className="font-bold text-[10px] leading-[12px] text-[#6B788C] uppercase tracking-wider">
                  ACTUAL QUANTITIES
                </span>

                {orderRows.map((o, idx) => (
                  <div key={o.orderRef} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-[14px] leading-[17px] text-[#1F293B]">
                        {o.orderRef}
                      </span>
                      <span className="font-normal text-[11px] leading-[13px] text-[#6B788C]">
                        Expected {o.units}
                      </span>
                    </div>
                    <div className={`w-[96px] h-[40px] rounded-[8px] flex items-center justify-center ${actualByOrder[idx] < o.units ? "bg-[#FFF2E8]" : "bg-[#EDF2FA]"}`}>
                      <span className={`font-bold text-[14px] leading-[17px] ${actualByOrder[idx] < o.units ? "text-[#ED5214]" : "text-[#1F293B]"}`}>
                        {actualByOrder[idx]}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Quantity Discrepancy Alert Banner */}
                {/* Quantity Discrepancy Alert Banner */}
                <div className="w-full bg-[#FFF7E3] rounded-[9px] p-3 flex flex-col gap-1 border border-amber-200/60">
                  <span className="font-bold text-[11px] leading-[13px] text-[#ED5214]">
                    Quantity discrepancy
                  </span>
                  <span className="font-normal text-[11px] leading-[13px] text-[#1F293B]">
                    {shortOrderRef}: {shortUnits} units short from expected quantity.
                  </span>
                  <span className="font-normal text-[10px] leading-[12px] text-[#6B788C]">
                    A reason is required before continuing.
                  </span>
                </div>
              </div>

              {/* 2. DISCREPANCY DETAILS (height: 360px / 565px when dropdown open, radius: 12px) */}
              <div className="bg-white rounded-[12px] p-4 flex flex-col gap-3.5 border border-[#E2E8F0] shadow-xs relative">
                <span className="font-bold text-[10px] leading-[12px] text-[#6B788C] uppercase tracking-wider">
                  DISCREPANCY DETAILS
                </span>

                {/* Affected Order */}
                <div className="flex flex-col gap-1">
                  <span className="font-normal text-[9px] leading-[11px] text-[#6B788C]">
                    Affected Order
                  </span>
                  <div className="w-full h-[42px] px-3 bg-white border-[1.5px] border-[#ED5214] rounded-[8px] flex items-center">
                    <span className="font-bold text-[11px] leading-[13px] text-[#1F293B]">
                      {shortOrderRef}
                    </span>
                  </div>
                </div>

                {/* Expected Quantity */}
                <div className="flex flex-col gap-1">
                  <span className="font-normal text-[9px] leading-[11px] text-[#6B788C]">
                    Expected Quantity
                  </span>
                  <div className="w-full h-[42px] px-3 bg-[#F7F9FB] border border-[#E0E3E8] rounded-[8px] flex items-center">
                    <span className="font-bold text-[11px] leading-[13px] text-[#1F293B]">
                      {expectedQty} units
                    </span>
                  </div>
                </div>

                {/* Actual Delivered (Editable) */}
                <div className="flex flex-col gap-1">
                  <span className="font-normal text-[9px] leading-[11px] text-[#6B788C]">
                    Actual Delivered
                  </span>
                  <div className="w-full h-[42px] px-3 bg-white border-[1.5px] border-[#ED5214] rounded-[8px] flex items-center justify-between">
                    <input
                      type="number"
                      value={deliveredQty}
                      onChange={(e) => onChangeDeliveredQty(e.target.value)}
                      placeholder={String(expectedQty)}
                      className="font-bold text-[11px] leading-[13px] text-[#1F293B] bg-transparent border-none outline-hidden w-24"
                    />
                    <span className="font-bold text-[12px] leading-[15px] text-[#ED5214]">
                      ✎
                    </span>
                  </div>
                </div>

                {/* Difference */}
                <div className="flex flex-col gap-1">
                  <span className="font-normal text-[9px] leading-[11px] text-[#6B788C]">
                    Difference
                  </span>
                  <div className="w-full h-[42px] px-3 bg-[#F7F9FB] border border-[#E0E3E8] rounded-[8px] flex items-center">
                    <span className="font-bold text-[11px] leading-[13px] text-[#1F293B]">
                      {shortUnits} units short
                    </span>
                  </div>
                </div>

                {/* Discrepancy Type Selector with Dropdown */}
                <div className="flex flex-col gap-1 relative">
                  <span className="font-normal text-[9px] leading-[11px] text-[#6B788C]">
                    Discrepancy Type
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsDiscrepancyDropdownOpen(!isDiscrepancyDropdownOpen)}
                    className="w-full h-[42px] px-3 bg-white border-[1.5px] border-[#ED5214] rounded-[8px] flex items-center justify-between cursor-pointer text-left"
                  >
                    <span className="font-bold text-[11px] leading-[13px] text-[#1F293B]">
                      {discrepancyType === "Quantity Short"
                        ? "Quantity Shortage"
                        : discrepancyType === "Damaged"
                        ? "Damaged Items"
                        : discrepancyType === "Wrong Item"
                        ? "Wrong Item"
                        : discrepancyType}
                    </span>
                    <span className="font-bold text-[16px] leading-[19px] text-[#ED5214]">
                      {isDiscrepancyDropdownOpen ? "▲" : "⌄"}
                    </span>
                  </button>

                  {/* Dropdown Options Frame */}
                  {isDiscrepancyDropdownOpen && (
                    <div className="w-full bg-white border border-[#DBDEE6] rounded-[8px] p-1.5 flex flex-col gap-1 mt-1 shadow-md z-20">
                      {[
                        { label: "Quantity Shortage", value: "Quantity Short" },
                        { label: "Damaged Items", value: "Damaged" },
                        { label: "Customer Rejected Items", value: "Customer Rejected" },
                        { label: "Wrong Item", value: "Wrong Item" },
                        { label: "Other", value: "Other" },
                      ].map((item) => {
                        const isSelected =
                          discrepancyType === item.value ||
                          (discrepancyType === "Quantity Short" && item.value === "Quantity Short");
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              onChangeDiscrepancyType(item.value as DiscrepancyType);
                              setIsDiscrepancyDropdownOpen(false);
                            }}
                            className={`w-full h-[34px] px-2.5 rounded-[6px] flex items-center gap-2 cursor-pointer border-none text-left transition-colors ${
                              isSelected ? "bg-[#FFF2E8]" : "bg-white hover:bg-slate-50"
                            }`}
                          >
                            {isSelected && (
                              <span className="font-bold text-[11px] text-[#ED5214]">✓</span>
                            )}
                            <span
                              className={`text-[11px] leading-[13px] ${
                                isSelected
                                  ? "font-bold text-[#ED5214]"
                                  : "font-normal text-[#1F293B]"
                              }`}
                            >
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. DISCREPANCY REASON & DRIVER NOTE (radius: 12px, bg: #FFFFFF) */}
              <div className="bg-white rounded-[12px] p-4 flex flex-col gap-3.5 border border-[#E2E8F0] shadow-xs">
                <span className="font-bold text-[10px] leading-[12px] text-[#6B788C] uppercase tracking-wider">
                  DISCREPANCY REASON
                </span>

                <div className="w-full bg-[#EDF2FA] rounded-[8px] p-3">
                  <textarea
                    rows={2}
                    value={discrepancyNotes}
                    onChange={(e) => onChangeDiscrepancyNotes(e.target.value)}
                    placeholder="Enter reason for the quantity difference…"
                    className="w-full bg-transparent border-none outline-hidden font-normal text-[11px] leading-[14px] text-[#1F293B] placeholder-[#6B788C] resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-normal text-[9px] leading-[11px] text-[#6B788C]">
                    DRIVER NOTE
                  </span>
                  <div className="w-full min-h-[39px] px-3 py-2 bg-white border-[1.5px] border-[#ED5214] rounded-[8px] flex items-center justify-between">
                    <span className="font-normal text-[11px] leading-[13px] text-[#1F293B]">
                      {discrepancyNotes || "Describe the discrepancy"}
                    </span>
                    <span className="font-bold text-[12px] leading-[15px] text-[#ED5214]">
                      ✎
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── CARD 3C: NOT DELIVERED FLOW (REASON RADIOS, DRIVER NOTE, EVIDENCE) ── */}
          {deliveryOutcome === "none" && (
            <>
              {/* 1. REASON RADIOS (height: 205px, radius: 12px, bg: #FFFFFF) */}
              <div className="bg-white rounded-[12px] p-4 flex flex-col gap-3 border border-[#E2E8F0] shadow-xs">
                <span className="font-bold text-[10px] leading-[12px] text-[#6B788C] uppercase tracking-wider">
                  REASON
                </span>

                {/* Option 1: Store Closed */}
                <button
                  type="button"
                  onClick={() => onChangeNotDeliveredReason("Store Closed")}
                  className="w-full h-[38px] px-3 bg-[#EDF2FA] rounded-[8px] flex items-center gap-3 cursor-pointer border-none text-left"
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      notDeliveredReason === "Store Closed"
                        ? "border-[#ED5214]"
                        : "border-[#6B788C]"
                    }`}
                  >
                    {notDeliveredReason === "Store Closed" && (
                      <div className="w-2 h-2 rounded-full bg-[#ED5214]" />
                    )}
                  </div>
                  <span
                    className={`text-[12px] leading-[15px] ${
                      notDeliveredReason === "Store Closed"
                        ? "font-bold text-[#1F293B]"
                        : "font-normal text-[#1F293B]"
                    }`}
                  >
                    Store Closed
                  </span>
                </button>

                {/* Option 2: Access Blocked */}
                <button
                  type="button"
                  onClick={() => onChangeNotDeliveredReason("Access Blocked")}
                  className="w-full h-[38px] px-3 bg-[#EDF2FA] rounded-[8px] flex items-center gap-3 cursor-pointer border-none text-left"
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      notDeliveredReason === "Access Blocked"
                        ? "border-[#ED5214]"
                        : "border-[#6B788C]"
                    }`}
                  >
                    {notDeliveredReason === "Access Blocked" && (
                      <div className="w-2 h-2 rounded-full bg-[#ED5214]" />
                    )}
                  </div>
                  <span
                    className={`text-[12px] leading-[15px] ${
                      notDeliveredReason === "Access Blocked"
                        ? "font-bold text-[#1F293B]"
                        : "font-normal text-[#1F293B]"
                    }`}
                  >
                    Access Blocked
                  </span>
                </button>

                {/* Option 3: Other */}
                <button
                  type="button"
                  onClick={() => onChangeNotDeliveredReason("Other")}
                  className="w-full h-[38px] px-3 bg-[#EDF2FA] rounded-[8px] flex items-center gap-3 cursor-pointer border-none text-left"
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      notDeliveredReason === "Other"
                        ? "border-[#ED5214]"
                        : "border-[#6B788C]"
                    }`}
                  >
                    {notDeliveredReason === "Other" && (
                      <div className="w-2 h-2 rounded-full bg-[#ED5214]" />
                    )}
                  </div>
                  <span
                    className={`text-[12px] leading-[15px] ${
                      notDeliveredReason === "Other"
                        ? "font-bold text-[#1F293B]"
                        : "font-normal text-[#1F293B]"
                    }`}
                  >
                    Other
                  </span>
                </button>
              </div>

              {/* 2. DRIVER NOTE (height: 126px, radius: 12px, bg: #FFFFFF) */}
              <div className="bg-white rounded-[12px] p-4 flex flex-col gap-2.5 border border-[#E2E8F0] shadow-xs">
                <span className="font-bold text-[10px] leading-[12px] text-[#6B788C] uppercase tracking-wider">
                  DRIVER NOTE
                </span>
                <div className="w-full bg-[#EDF2FA] rounded-[8px] p-3">
                  <textarea
                    rows={2}
                    value={notDeliveredNotes}
                    onChange={(e) => onChangeNotDeliveredNotes(e.target.value)}
                    placeholder="Store was closed on arrival. No authorized receiver available."
                    className="w-full bg-transparent border-none outline-hidden font-normal text-[11px] leading-[14px] text-[#1F293B] placeholder-[#1F293B]/70 resize-none"
                  />
                </div>
              </div>

              {/* 3. EVIDENCE (height: 212px, radius: 12px, bg: #FFFFFF) */}
              <div className="bg-white rounded-[12px] p-4 flex flex-col gap-3 border border-[#E2E8F0] shadow-xs">
                <span className="font-bold text-[10px] leading-[12px] text-[#6B788C] uppercase tracking-wider">
                  EVIDENCE
                </span>

                {/* Capture Photo */}
                <button
                  type="button"
                  onClick={onTriggerNotDeliveredPhoto}
                  className="w-full h-[58px] bg-[#EDF2FA] hover:bg-[#e4ebf7] rounded-[9px] p-3 flex items-center gap-3 cursor-pointer border-none text-left transition-colors"
                >
                  <span className="font-bold text-[20px] text-[#ED5214]">▣</span>
                  <div className="flex flex-col">
                    <span className="font-bold text-[13px] leading-[16px] text-[#1F293B]">
                      {notDeliveredPhoto ? "Evidence Photo Attached ✓" : "Capture Photo"}
                    </span>
                    <span className="font-normal text-[10px] leading-[12px] text-[#6B788C]">
                      {notDeliveredPhoto ? notDeliveredPhoto.name : "Add evidence for failed delivery"}
                    </span>
                  </div>
                </button>

                {/* Upload File */}
                <button
                  type="button"
                  onClick={onTriggerNotDeliveredPhoto}
                  className="w-full h-[58px] bg-[#EDF2FA] hover:bg-[#e4ebf7] rounded-[9px] p-3 flex items-center gap-3 cursor-pointer border-none text-left transition-colors"
                >
                  <span className="font-bold text-[22px] leading-[27px] text-[#ED5214]">↑</span>
                  <div className="flex flex-col">
                    <span className="font-bold text-[13px] leading-[16px] text-[#1F293B]">
                      Upload File
                    </span>
                    <span className="font-normal text-[10px] leading-[12px] text-[#6B788C]">
                      Attach an existing delivery photo/file
                    </span>
                  </div>
                </button>

                <span className="font-normal text-[10px] leading-[12px] text-[#6B788C]">
                  Recommended for Store Closed / Access Blocked.
                </span>
              </div>
            </>
          )}

          {/* ── CARD 4: PROOF OF DELIVERY (Discrepancy and Delivered in Full) ── */}
          {deliveryOutcome !== "none" && (
            <div className="bg-white rounded-[12px] p-4 flex flex-col gap-3 border border-[#E2E8F0] shadow-xs">
              <span className="font-bold text-[10px] leading-[12px] text-[#6B788C] uppercase tracking-wider">
                PROOF OF DELIVERY
              </span>

              {/* Button A: Capture Photo */}
              <button
                type="button"
                onClick={onTriggerPhotoCapture}
                className="w-full h-[58px] bg-[#EDF2FA] hover:bg-[#e4ebf7] rounded-[9px] p-3 flex items-center gap-3 cursor-pointer border-none text-left transition-colors"
              >
                <span className="font-bold text-[20px] text-[#ED5214]">▣</span>
                <div className="flex flex-col">
                  <span className="font-bold text-[13px] leading-[16px] text-[#1F293B]">
                    {photoFile ? "Photo Captured ✓" : "Capture Photo"}
                  </span>
                  <span className="font-normal text-[10px] leading-[12px] text-[#6B788C]">
                    {photoFile ? photoFile.name : "Take delivery evidence photo"}
                  </span>
                </div>
              </button>

              {/* Button B: Digital Signature */}
              <button
                type="button"
                onClick={onTriggerSignatureCapture}
                className="w-full h-[58px] bg-[#EDF2FA] hover:bg-[#e4ebf7] rounded-[9px] p-3 flex items-center gap-3 cursor-pointer border-none text-left transition-colors"
              >
                <span className="font-bold text-[20px] text-[#ED5214]">✎</span>
                <div className="flex flex-col">
                  <span className="font-bold text-[13px] leading-[16px] text-[#1F293B]">
                    {signatureFile ? "Signature Signed ✓" : "Digital Signature"}
                  </span>
                  <span className="font-normal text-[10px] leading-[12px] text-[#6B788C]">
                    {signatureFile ? signerName : "Store Manager sign-off"}
                  </span>
                </div>
              </button>

              {/* Subtext */}
              <span className="font-normal text-[9px] leading-[11px] text-[#6B788C]">
                Photo and store manager signature required before submission.
              </span>
            </div>
          )}

          {/* ── CARD 5: CONFIRMATION CHECKBOX ── */}
          <div className="bg-white rounded-[12px] p-4 flex flex-col gap-3 border border-[#E2E8F0] shadow-xs">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={orderConfirmed}
                onChange={onToggleOrderConfirmed}
                className="w-5 h-5 rounded border-2 border-[#ED5214] text-[#ED5214] focus:ring-[#ED5214]"
              />
              <div className="flex flex-col">
                <span className="font-bold text-[12px] text-[#1F293B]">
                  Confirm complete order
                </span>
                <span className="text-[10px] text-[#6B788C]">
                  {orderConfirmed ? "Confirmed ✓" : "Required before submission"}
                </span>
              </div>
            </label>
          </div>

          {/* ── ACTION BUTTONS: Report Issue & Continue / Record Not Delivered ── */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Link
              href="/driver/report"
              className="h-[48px] bg-[#EDF2FA] hover:bg-[#e2e8f4] active:scale-[0.98] rounded-[10px] text-[#ED5214] font-bold text-[13px] leading-[16px] flex items-center justify-center no-underline transition-all"
            >
              Report Issue
            </Link>

            <button
              type="button"
              id="btn-submit-stop-record-mobile"
              onClick={onSubmitStopRecord}
              className="h-[48px] bg-[#ED5214] hover:bg-[#d8460d] active:scale-[0.98] rounded-[10px] text-white font-bold text-[13px] leading-[16px] flex items-center justify-center transition-all cursor-pointer border-none shadow-md"
            >
              {deliveryOutcome === "none" ? "Record Not Delivered" : "Continue"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 3. STATE 2: CURRENT STOP — IN PROGRESS (Live Route & Confirm Required)
  // ═════════════════════════════════════════════════════════════════════════
  if (deliveryStarted) {
    return (
      <div
        id="driver-current-stop-mobile"
        className="font-inter w-full max-w-[390px] mx-auto min-h-[844px] bg-[#F6F8FB] pb-28 relative flex flex-col shadow-xl sm:rounded-[24px] overflow-hidden border border-slate-200"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Header (height: 70px) */}
        <header className="w-full h-[70px] bg-white flex items-center justify-between px-5 border-b border-[#F1F5F9] shrink-0 sticky top-0 z-30 shadow-2xs">
          <span className="font-bold text-[21px] leading-[25px] text-[#ED5214]">
            RightGo
          </span>
          <span className="font-bold text-[12px] leading-[15px] text-[#1F9457]">
            In Progress
          </span>
        </header>

        <main className="flex-1 flex flex-col gap-4 px-5 pt-4">
          <DriverOfflineSyncNotice />

          {/* Title Row */}
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-[23px] leading-[28px] text-[#1F293B] m-0">
              Current Stop
            </h1>
            <span className="font-bold text-[12px] leading-[15px] text-[#ED5214]">
              Stop {currentStopIndex} of {totalStopsCount}
            </span>
          </div>

          {/* ── CARD 1: OUTLET INFO (width: 350px, height: 96px, radius: 12px) ── */}
          <div className="bg-white rounded-[12px] p-4 flex flex-col gap-1 border border-[#E2E8F0] shadow-xs">
            <span className="font-bold text-[10px] leading-[12px] text-[#ED5214] uppercase tracking-wider">
              {stopCode}
            </span>
            <span className="font-bold text-[18px] leading-[22px] text-[#1F293B]">
              {stopName}
            </span>
            <span className="font-normal text-[12px] leading-[15px] text-[#6B788C]">
              {timeWindow} • {dockType}
            </span>
          </div>

          {/* ── CARD 2: LIVE NAVIGATION PANEL / MAPBOX ROUTE ── */}
          <NavigationPanel
            outletId={stopCode}
            outletName={stopName}
            outletAddress={storeContact?.address || "Galle Road, Colombo 03"}
            destinationLat={destinationLat}
            destinationLng={destinationLng}
            isNavigating={isNavigating}
            onToggleNavigation={onToggleNavigation}
            managerPhone={phone}
            initialArrivalConfirmed={stopStatus === "ARRIVED"}
            initialArrivalTimestamp={arrivalTimestamp}
            onConfirmArrival={onConfirmArrival}
            onStartDelivery={onProceedToComplete}
          />

          {/* ── CARD 3: EXPECTED ORDERS WITH CONFIRM CHECKBOX (width: 350px, radius: 12px) ── */}
          <div className="bg-white rounded-[12px] p-4 flex flex-col gap-3.5 border border-[#E2E8F0] shadow-xs">
            <span className="font-bold text-[10px] leading-[12px] text-[#6B788C] uppercase tracking-wider">
              EXPECTED ORDERS
            </span>

            {orderRows.map((o) => {
              const reduced = o.units < o.plannedUnits;
              return (
                <div key={o.orderRef} className="flex items-center justify-between py-1 border-b border-[#F1F5F9]">
                  <span className="font-bold text-[14px] leading-[17px] text-[#1F293B]">
                    {o.orderRef}
                  </span>
                  <span className={`font-normal text-[11px] leading-[13px] ${reduced ? "text-[#ED5214]" : "text-[#1F9457]"}`}>
                    {reduced ? `${o.units} of ${o.plannedUnits} units (loading shortfall)` : `${o.units} units - ready for delivery`}
                  </span>
                </div>
              );
            })}

            {/* Confirm Order Checkbox Frame */}
            {/* Confirm Order Checkbox Frame */}
            <div
              onClick={onToggleOrderConfirmed}
              className="flex items-center gap-3 pt-1 cursor-pointer p-1 rounded-lg hover:bg-slate-50 transition-colors select-none"
            >
              <input
                type="checkbox"
                id="checkbox-confirm-order-inprogress"
                checked={orderConfirmed}
                onChange={onToggleOrderConfirmed}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 rounded border-2 border-[#ED5214] text-[#ED5214] focus:ring-[#ED5214] cursor-pointer shrink-0"
              />
              <div className="flex flex-col">
                <span className="font-bold text-[12px] leading-[15px] text-[#1F293B]">
                  Confirm complete order
                </span>
                <span
                  className={`text-[10px] leading-[12px] ${
                    orderConfirmed ? "font-bold text-[#1F9457]" : "text-[#6B788C]"
                  }`}
                >
                  {orderConfirmed ? "Confirmed ✓" : "Tap to confirm before Complete Order"}
                </span>
              </div>
            </div>

            {/* Notice Frame */}
            <div
              onClick={!orderConfirmed ? onToggleOrderConfirmed : undefined}
              className={`rounded-[8px] p-3 flex items-center justify-center transition-all ${
                orderConfirmed
                  ? "bg-[#EBFAF0]"
                  : "bg-[#FFF7E3] cursor-pointer hover:bg-amber-100"
              }`}
            >
              <span
                className={`font-bold text-[11px] leading-[13px] ${
                  orderConfirmed ? "text-[#1F9457]" : "text-[#ED5214]"
                }`}
              >
                {orderConfirmed
                  ? "Order quantities confirmed ✓"
                  : "Confirmation required (Tap to confirm)"}
              </span>
            </div>
          </div>

          {/* ── CARD 4: DELIVERY ACTIONS ── */}
          <div className="bg-white rounded-[12px] p-4 flex flex-col gap-3 border border-[#E2E8F0] shadow-xs">
            <span className="font-bold text-[10px] leading-[12px] text-[#6B788C] uppercase tracking-wider">
              DELIVERY ACTIONS
            </span>

            <div className="grid grid-cols-2 gap-3">
              {/* Report Issue */}
              <Link
                href="/driver/report"
                className="h-[46px] bg-[#EDF2FA] hover:bg-[#e2e8f4] active:scale-[0.98] rounded-[10px] text-[#ED5214] font-bold text-[13px] leading-[16px] flex items-center justify-center no-underline transition-all"
              >
                Report Issue
              </Link>

              {/* Complete Order */}
              <button
                type="button"
                id="btn-complete-order-mobile"
                onClick={() => {
                  if (!orderConfirmed) {
                    onToggleOrderConfirmed();
                  }
                  onProceedToComplete();
                }}
                className="h-[46px] bg-[#ED5214] hover:bg-[#d8460d] active:scale-[0.98] rounded-[10px] font-bold text-[13px] leading-[16px] text-white flex items-center justify-center transition-all cursor-pointer border-none shadow-md"
              >
                Complete Order
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 4. STATE 1: CURRENT STOP OVERVIEW (En Route / Pre-Delivery Default)
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div
      id="driver-current-stop-mobile"
      className="font-inter w-full max-w-[390px] mx-auto min-h-[844px] bg-[#FFFFFF] pb-28 relative flex flex-col shadow-xl sm:rounded-[24px] overflow-hidden border border-slate-200"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Header (Height: 72px / 92px, BG: #FFFFFF) ── */}
      <header className="w-full h-[72px] bg-white flex items-center justify-between px-5 border-b border-[#F1F5F9] shrink-0 sticky top-0 z-30 shadow-2xs">
        <span className="font-bold text-[22px] leading-[27px] text-[#ED5214]">
          RightGo
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              !isOnline || connectionState === "offline"
                ? "bg-[#F97316]"
                : connectionState === "syncing"
                ? "bg-[#3B82F6] animate-pulse"
                : "bg-[#1A8C4D]"
            }`}
          />
          <span className="font-bold text-[12px] leading-[15px] text-[#1A8C4D]">
            Online
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-4 px-5 pt-4">
        <DriverOfflineSyncNotice />

        {/* Title row */}
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-[23px] leading-[28px] text-[#1F293B] m-0">
            Current Stop
          </h1>
          <span className="font-bold text-[12px] leading-[15px] text-[#ED5214]">
            Stop {currentStopIndex} of {totalStopsCount}
          </span>
        </div>

        {/* ── CARD 1: OUTLET HEADER (350x112, radius: 12px, bg: #FFFFFF) ── */}
        <div className="bg-white rounded-[12px] p-4 flex flex-col gap-1 border border-[#E2E8F0] shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[10px] leading-[12px] text-[#ED5214] uppercase tracking-wider">
              {stopCode}
            </span>
            <a
              href={`tel:${phone.replace(/[^+\d]/g, "")}`}
              className="font-bold text-[12px] leading-[15px] text-[#ED5214] no-underline hover:underline"
            >
              Call Store
            </a>
          </div>

          <span className="font-bold text-[18px] leading-[22px] text-[#1F293B]">
            {stopName}
          </span>
          <span className="font-normal text-[12px] leading-[15px] text-[#6B788C]">
            {timeWindow} • {dockType}
          </span>
        </div>

        {/* ── CARD 2: EXPECTED ORDERS (350x120, radius: 12px, bg: #FFFFFF) ── */}
        <div className="bg-white rounded-[12px] p-4 flex flex-col gap-2.5 border border-[#E2E8F0] shadow-xs">
          <span className="font-bold text-[10px] leading-[12px] text-[#6B788C] uppercase tracking-wider">
            EXPECTED ORDERS
          </span>

          {ordersList.map((orderId) => (
            <div
              key={orderId}
              className="flex items-center justify-between py-1 border-b border-[#F1F5F9] last:border-none"
            >
              <span className="font-bold text-[14px] leading-[17px] text-[#1F293B]">
                {orderId}
              </span>
              <span className="font-normal text-[12px] leading-[15px] text-[#6B788C]">
                Expected shipment
              </span>
            </div>
          ))}
        </div>

        {loadingNotes.length > 0 && (
          <div className="bg-[#EBFAF0] rounded-[12px] p-4 flex flex-col gap-2 border border-emerald-200">
            <span className="font-bold text-[13px] leading-[16px] text-[#1F9457]">
              Loading Update
            </span>
            {loadingNotes.map((n, i) => (
              <p key={i} className="font-normal text-[11px] leading-[14px] text-[#1F293B] m-0">
                {describeLoadingNote(n)}
              </p>
            ))}
          </div>
        )}

        {planChanges.length > 0 && (
          <div className="bg-[#FFF7E3] rounded-[12px] p-4 flex flex-col gap-1.5 border border-amber-200">
            <span className="font-bold text-[11px] leading-[13px] text-[#1F293B]">
              PLAN CHANGES
            </span>
            {planChanges.map((text, i) => (
              <p key={i} className="font-normal text-[11px] leading-[14px] text-[#6B788C] m-0">
                {text}
              </p>
            ))}
          </div>
        )}

        {/* ── CARD 5: MAPBOX MAP PREVIEW & NAVIGATION (350x231, radius: 12px) ── */}
        {/* ── CARD 5: MAPBOX MAP PREVIEW & NAVIGATION (350x231, radius: 12px) ── */}
        <div className="flex flex-col gap-2">
          <NavigationPanel
            outletId={stopCode}
            outletName={stopName}
            outletAddress={storeContact?.address || "Galle Road, Colombo 03"}
            destinationLat={destinationLat}
            destinationLng={destinationLng}
            isNavigating={isNavigating}
            onToggleNavigation={onToggleNavigation}
            managerPhone={phone}
            initialArrivalConfirmed={stopStatus === "ARRIVED"}
            initialArrivalTimestamp={arrivalTimestamp}
            onConfirmArrival={onConfirmArrival}
            onStartDelivery={onStartDelivery}
          />
        </div>

        {/* ── CARD 6: ACTION BUTTONS (Report Issue & Start Delivery) ── */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Report Issue */}
          <Link
            id="btn-report-issue-overview-mobile"
            href="/driver/report"
            className="h-[46px] bg-white hover:bg-orange-50 active:scale-[0.98] rounded-[12px] text-[#ED5214] font-bold text-[13px] leading-[16px] flex items-center justify-center no-underline border border-[#ED5214] transition-all shadow-xs"
          >
            Report Issue
          </Link>

          {/* Start Delivery */}
          <button
            type="button"
            id="btn-start-delivery-overview-mobile"
            onClick={onStartDelivery}
            className="h-[46px] bg-[#ED5214] hover:bg-[#d8460d] active:scale-[0.98] rounded-[12px] text-white font-bold text-[13px] leading-[16px] flex items-center justify-center transition-all cursor-pointer border-none shadow-md"
          >
            Start Delivery
          </button>
        </div>
      </main>
    </div>
  );
}
