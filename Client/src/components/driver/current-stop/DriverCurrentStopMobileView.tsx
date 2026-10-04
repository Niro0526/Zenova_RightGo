"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Stop } from "@/components/driver/today-run/types";
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
  const router = useRouter();
  const { isOnline, connectionState } = useConnectivity();

  const stopCode = stop.code || "OUT001";
  const stopName = stop.name || "Colpetty Retailer";
  const timeWindow = stop.timeWindow || "06:00 – 08:00";
  const dockType = stop.dockType || "Rear Dock";
  const phone = storeContact?.phone || "+94 11 257 3489";

  // Coordinates
  const destinationLat = storeContact?.latitude ?? 6.9034;
  const destinationLng = storeContact?.longitude ?? 79.8512;

  const ordersList =
    stop.orders && stop.orders.length > 0 ? stop.orders : ["S1-000", "S1-001"];
  const firstOrder = ordersList[0] || "S1-000";
  const secondOrder = ordersList[1] || ordersList[0] || "S1-001";
  const perOrderUnits = Math.max(1, Math.round((stop.units || expectedQty || 80) / Math.max(1, ordersList.length)));

  const [isDiscrepancyDropdownOpen, setIsDiscrepancyDropdownOpen] = useState(false);

  // ═════════════════════════════════════════════════════════════════════════
  // 1. STATE 4: STOP RECORDED / SUCCESS CONFIRMATION SCREEN (FIGMA 1:1)
  // ═════════════════════════════════════════════════════════════════════════
  if (stopRecorded) {
    const isFull = deliveryOutcome === "full";
    const isDiscrepancy = deliveryOutcome === "discrepancy";
    const isNotDelivered = deliveryOutcome === "none";

    const reasonLabel = notDeliveredReason || "Store Closed";

    const discrepancyLabel =
      discrepancyType === "Quantity Short"
        ? "Quantity Shortage"
        : discrepancyType === "Damaged"
        ? "Damaged Goods"
        : discrepancyType === "Wrong Item"
        ? "Incorrect SKU"
        : discrepancyType || "Quantity Shortage";

    const calcDeliveredQty = deliveredQty ? Number(deliveredQty) : 72;
    const calcDiff = Math.max(0, expectedQty - calcDeliveredQty);

    return (
      <div
        id="driver-current-stop-mobile"
        className="font-inter w-full max-w-[390px] mx-auto min-h-[844px] bg-[#F6F8FB] pb-28 relative flex flex-col shadow-xl sm:rounded-[24px] overflow-hidden border border-slate-200"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Header (bg #FFFFFF) */}
        <header className="w-full h-[70px] bg-white flex items-center justify-between px-5 border-b border-[#E2E8F0] shrink-0 sticky top-0 z-30">
          <span
            className="font-bold text-[21px] leading-[25px] text-[#ED5214] cursor-pointer"
            onClick={() => router.push("/driver/today-run")}
          >
            RightGo
          </span>
          <span className="font-bold text-[12px] leading-[15px] text-[#1F9457]">
            Online
          </span>
        </header>

        <main className="flex-1 flex flex-col px-5 pt-4 pb-6">
          <DriverOfflineSyncNotice />

          {/* Title */}
          <h1 className="text-[#1F293B] font-bold text-[22px] leading-[27px] m-0 mb-3">
            Stop Recorded
          </h1>

          {/* ── BANNER CARD (bg #FFFFFF, r: 12px) ── */}
          <div className="w-full bg-white rounded-[12px] p-4 flex flex-col items-center justify-center text-center mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="text-[#1F9457] font-bold text-[30px] leading-[36px] mb-1.5">
              ✓
            </span>

            {isFull && (
              <>
                <span className="text-[#1F9457] font-bold text-[16px] leading-[19px] mb-1">
                  Delivery Recorded
                </span>
                <span className="text-[#1F9457] font-bold text-[12px] leading-[15px] mb-1.5">
                  Delivered in Full
                </span>
                <span className="text-[#6B788C] text-[11px] leading-[13px] font-normal">
                  The stop outcome has been saved to the trip log.
                </span>
              </>
            )}

            {isDiscrepancy && (
              <>
                <span className="text-[#1F9457] font-bold text-[16px] leading-[19px] mb-1">
                  Delivery Recorded
                </span>
                <span className="text-[#ED5214] font-bold text-[12px] leading-[15px] mb-1.5">
                  Delivered with Discrepancy
                </span>
                <span className="text-[#6B788C] text-[11px] leading-[13px] font-normal">
                  Saved to the trip log.
                </span>
              </>
            )}

            {isNotDelivered && (
              <>
                <span className="text-[#1F9457] font-bold text-[16px] leading-[19px] mb-1">
                  Not Delivered Recorded
                </span>
                <span className="text-[#ED5214] font-bold text-[12px] leading-[15px] mb-1.5">
                  No delivery quantity was recorded.
                </span>
                <span className="text-[#6B788C] text-[11px] leading-[13px] font-normal">
                  Saved to the trip log.
                </span>
              </>
            )}
          </div>

          {/* ── CARD 1: DELIVERY RECORD (bg #FFFFFF, r: 12px) ── */}
          <div className="w-full bg-white rounded-[12px] p-4 flex flex-col mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-2">
              DELIVERY RECORD
            </span>
            <span className="block text-[#1F293B] font-bold text-[15px] leading-[18px] mb-2">
              {stopCode} / {stopName}
            </span>

            {isFull && (
              <div className="flex flex-col gap-1.5 text-[10px] leading-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#6B788C] font-normal">Outcome</span>
                  <span className="text-[#1F9457] font-bold text-[11px] leading-[13px]">
                    Delivered in Full
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6B788C] font-normal">Stop</span>
                  <span className="text-[#1F293B] font-normal text-[10px] leading-[12px]">
                    1 of 4 • Trip A
                  </span>
                </div>
              </div>
            )}

            {isDiscrepancy && (
              <div className="flex flex-col gap-1.5 text-[10px] leading-[12px]">
                <span className="text-[#6B788C] font-normal mb-0.5">
                  Trip A • Stop {currentStopIndex} of {totalStopsCount} • PEL-R04
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-[#6B788C] font-normal">Outcome</span>
                  <span className="text-[#ED5214] font-bold text-[11px] leading-[13px]">
                    Delivered — Discrepancy
                  </span>
                </div>
              </div>
            )}

            {isNotDelivered && (
              <div className="flex flex-col gap-1.5 text-[10px] leading-[12px]">
                <span className="text-[#6B788C] font-normal mb-0.5">
                  Trip A • Stop {currentStopIndex} of {totalStopsCount} • PEL-R04
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-[#6B788C] font-normal">Outcome</span>
                  <span className="text-[#ED5214] font-bold text-[11px] leading-[13px]">
                    Not Delivered
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6B788C] font-normal">Reason</span>
                  <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                    {reasonLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6B788C] font-normal">Evidence</span>
                  <span className="text-[#1F9457] font-bold text-[11px] leading-[13px]">
                    Photo attached ✓
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── CARD 2 (FULL): DELIVERED ORDERS ── */}
          {isFull && (
            <div className="w-full bg-white rounded-[12px] p-4 flex flex-col mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
              <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-3">
                DELIVERED ORDERS
              </span>

              {ordersList.map((ordRef, idx) => (
                <div key={ordRef} className={`flex items-center justify-between ${idx < ordersList.length - 1 ? "mb-2" : "mb-3"}`}>
                  <span className="text-[#1F293B] font-bold text-[13px] leading-[16px]">
                    {ordRef}
                  </span>
                  <span className="text-[#6B788C] text-[10px] leading-[12px] font-normal">
                    Expected {perOrderUnits}
                  </span>
                  <span className="text-[#1F9457] font-bold text-[10px] leading-[12px]">
                    Delivered {perOrderUnits} ✓
                  </span>
                </div>
              ))}

              {/* Summary Frame */}
              <div className="w-full min-h-[58px] bg-[#EBFAF0] rounded-[8px] p-3 flex items-center justify-between border border-[#1F9457]/20">
                <div className="flex flex-col">
                  <span className="text-[#6B788C] text-[10px] leading-[12px] font-normal mb-0.5">
                    Total delivered
                  </span>
                  <span className="text-[#1F9457] font-bold text-[14px] leading-[17px]">
                    {stop.units || perOrderUnits * ordersList.length} units
                  </span>
                </div>
                <span className="text-[#1F9457] font-bold text-[10px] leading-[12px]">
                  All quantities matched
                </span>
              </div>
            </div>
          )}

          {/* ── CARD 2 (DISCREPANCY): DISCREPANCY DETAILS ── */}
          {isDiscrepancy && (
            <div className="w-full bg-white rounded-[12px] p-4 flex flex-col mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
              <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-3">
                DISCREPANCY DETAILS
              </span>

              <div className="flex flex-col gap-2 text-[10px] leading-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#6B788C] font-normal">Affected Order</span>
                  <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                    {secondOrder}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6B788C] font-normal">Expected Quantity</span>
                  <span className="text-[#6B788C] font-normal text-[10px] leading-[12px]">
                    {expectedQty || perOrderUnits} units
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6B788C] font-normal">Actual Delivered</span>
                  <span className="text-[#1F293B] font-bold text-[10px] leading-[12px]">
                    {calcDeliveredQty} units
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6B788C] font-normal">Difference</span>
                  <span className="text-[#ED5214] font-bold text-[10px] leading-[12px]">
                    {calcDiff > 0 ? `${calcDiff} units short` : "8 units short"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6B788C] font-normal">Reason</span>
                  <span className="text-[#1F293B] font-bold text-[10px] leading-[12px]">
                    {discrepancyLabel}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── CARD (DISCREPANCY & NOT DELIVERED): DRIVER NOTE ── */}
          {(isDiscrepancy || isNotDelivered) && (
            <div className="w-full bg-white rounded-[12px] p-4 flex flex-col mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
              <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-2">
                DRIVER NOTE
              </span>
              <p className="text-[#1F293B] text-[11px] leading-[15px] font-normal m-0">
                {isDiscrepancy
                  ? discrepancyNotes || "8 units unavailable at delivery."
                  : notDeliveredNotes ||
                    "Store was closed at the scheduled delivery time. Evidence captured before leaving the stop."}
              </p>
            </div>
          )}

          {/* ── CARD 3 (FULL & DISCREPANCY): PROOF OF DELIVERY ── */}
          {!isNotDelivered && (
            <div className="w-full bg-white rounded-[12px] p-4 flex flex-col mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
              <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-3">
                PROOF OF DELIVERY
              </span>

              <div className="flex flex-col gap-2.5 text-[10px] leading-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#6B788C] font-normal">Photo Evidence</span>
                  <span className="text-[#1F9457] font-bold text-[11px] leading-[13px]">
                    Captured ✓
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6B788C] font-normal">Store Manager Signature</span>
                  <span className="text-[#1F9457] font-bold text-[11px] leading-[13px]">
                    Captured ✓
                  </span>
                </div>
                <span className="text-[#1F9457] font-bold text-[10px] leading-[12px] pt-1 border-t border-[#EDF2FA]">
                  POD complete
                </span>
              </div>
            </div>
          )}

          {/* ── CARD: TRIP PROGRESS ── */}
          <div className="w-full bg-white rounded-[12px] p-4 flex items-center justify-between mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <div>
              <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-1.5">
                TRIP PROGRESS
              </span>
              <span className="block text-[#1F293B] font-bold text-[11px] leading-[13px]">
                {isNotDelivered
                  ? "1 stop recorded • 3 stops remaining"
                  : isDiscrepancy
                  ? "1 of 4 stops recorded"
                  : "1 of 4 stops completed"}
              </span>
            </div>
            <span className="text-[#ED5214] font-bold text-[14px] leading-[17px]">
              25%
            </span>
          </div>

          {/* ── ACTION BUTTONS ── */}
          <div className="w-full flex flex-col gap-2.5 mb-3">
            <button
              type="button"
              id="open-next-stop-button"
              onClick={onProceedToNextStop}
              className="w-full h-[50px] bg-[#ED5214] hover:bg-[#d9460d] text-white font-bold text-[13px] leading-[16px] rounded-[10px] flex items-center justify-center cursor-pointer transition-all border-none shadow-md active:scale-[0.99]"
            >
              Open Next Stop
            </button>

            <button
              type="button"
              id="view-delivery-history-button"
              onClick={() => router.push("/driver/history")}
              className="w-full h-[44px] bg-[#EDF2FA] hover:bg-[#e2e8f0] text-[#ED5214] font-bold text-[13px] leading-[16px] rounded-[10px] flex items-center justify-center cursor-pointer transition-all border-none"
            >
              View Delivery History
            </button>
          </div>

          {/* Bottom Note */}
          <span className="text-[#6B788C] text-[10px] leading-[13px] font-normal text-center max-w-[320px] mx-auto">
            This outcome is synced to the trip log and remains available in History.
          </span>
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

          {/* ── CARD 3A: DELIVERED IN FULL — ORDER QUANTITIES BREAKDOWN (radius: 12px) ── */}
          {deliveryOutcome === "full" && (
            <div className="bg-white rounded-[12px] p-4 flex flex-col gap-3.5 border border-[#E2E8F0] shadow-xs">
              <span className="font-bold text-[10px] leading-[12px] text-[#6B788C] uppercase tracking-wider">
                ORDER QUANTITIES
              </span>

              {ordersList.map((ordRef) => (
                <div key={ordRef} className="flex items-center justify-between py-1 border-b border-[#F1F5F9]">
                  <span className="font-bold text-[14px] leading-[17px] text-[#1F293B]">
                    {ordRef}
                  </span>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center">
                      <span className="font-normal text-[10px] text-[#6B788C]">
                        Expected
                      </span>
                      <span className="font-bold text-[15px] text-[#1F293B]">{perOrderUnits}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="font-normal text-[10px] text-[#6B788C]">
                        Actual
                      </span>
                      <span className="font-bold text-[15px] text-[#1F9457]">{perOrderUnits}</span>
                    </div>
                  </div>
                </div>
              ))}

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
              {/* 1. ACTUAL QUANTITIES (radius: 12px, bg: #FFFFFF) */}
              <div className="bg-white rounded-[12px] p-4 flex flex-col gap-3 border border-[#E2E8F0] shadow-xs">
                <span className="font-bold text-[10px] leading-[12px] text-[#6B788C] uppercase tracking-wider">
                  ACTUAL QUANTITIES
                </span>

                {ordersList.length > 1 ? (
                  <>
                    {/* First order (undisputed) */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-[14px] leading-[17px] text-[#1F293B]">
                          {firstOrder}
                        </span>
                        <span className="font-normal text-[11px] leading-[13px] text-[#6B788C]">
                          Expected {perOrderUnits}
                        </span>
                      </div>
                      <div className="w-[96px] h-[40px] bg-[#EDF2FA] rounded-[8px] flex items-center justify-center">
                        <span className="font-bold text-[14px] leading-[17px] text-[#1F293B]">
                          {perOrderUnits}
                        </span>
                      </div>
                    </div>

                    {/* Second order (with discrepancy adjustment) */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-[14px] leading-[17px] text-[#1F293B]">
                          {secondOrder}
                        </span>
                        <span className="font-normal text-[11px] leading-[13px] text-[#6B788C]">
                          Expected {expectedQty || perOrderUnits}
                        </span>
                      </div>
                      <div className="w-[96px] h-[40px] bg-[#FFF2E8] rounded-[8px] flex items-center justify-center">
                        <span className="font-bold text-[14px] leading-[17px] text-[#ED5214]">
                          {deliveredQty || String(expectedQty || perOrderUnits)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-[14px] leading-[17px] text-[#1F293B]">
                        {firstOrder}
                      </span>
                      <span className="font-normal text-[11px] leading-[13px] text-[#6B788C]">
                        Expected {expectedQty || perOrderUnits}
                      </span>
                    </div>
                    <div className="w-[96px] h-[40px] bg-[#FFF2E8] rounded-[8px] flex items-center justify-center">
                      <span className="font-bold text-[14px] leading-[17px] text-[#ED5214]">
                        {deliveredQty || String(expectedQty || perOrderUnits)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Quantity Discrepancy Alert Banner */}
                <div className="w-full bg-[#FFF7E3] rounded-[9px] p-3 flex flex-col gap-1 border border-amber-200/60">
                  <span className="font-bold text-[11px] leading-[13px] text-[#ED5214]">
                    Quantity discrepancy
                  </span>
                  <span className="font-normal text-[11px] leading-[13px] text-[#1F293B]">
                    {Math.max(0, (expectedQty || perOrderUnits) - (Number(deliveredQty) || (expectedQty || perOrderUnits)))} units short from expected quantity.
                  </span>
                  <span className="font-normal text-[10px] leading-[12px] text-[#6B788C]">
                    A reason is required before continuing.
                  </span>
                </div>
              </div>

              {/* 2. DISCREPANCY DETAILS (radius: 12px) */}
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
                      {secondOrder}
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
                      {expectedQty || perOrderUnits} units
                    </span>
                  </div>
                </div>

                {/* Actual Delivered (Editable with Stepper & Quick Presets) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[10px] leading-[12px] text-[#6B788C]">
                      Actual Delivered Quantity
                    </span>
                    <span className="text-[10px] text-[#ED5214] font-bold">
                      Tap + / − or type
                    </span>
                  </div>

                  {/* Stepper Input Box */}
                  <div className="w-full h-[46px] px-2 bg-white border-[1.5px] border-[#ED5214] rounded-[10px] flex items-center justify-between shadow-2xs">
                    {/* Decrement Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const current = Number(deliveredQty) || 0;
                        const next = Math.max(0, current - 1);
                        onChangeDeliveredQty(String(next));
                      }}
                      className="w-9 h-9 rounded-[8px] bg-[#FFF2E8] hover:bg-[#ffe3d1] text-[#ED5214] font-black text-lg flex items-center justify-center cursor-pointer border-none transition-all active:scale-90"
                      title="Decrease quantity by 1"
                    >
                      −
                    </button>

                    {/* Numeric Input */}
                    <div className="flex items-center justify-center flex-1 px-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={deliveredQty}
                        onChange={(e) => onChangeDeliveredQty(e.target.value)}
                        placeholder={String(expectedQty)}
                        className="font-extrabold text-[15px] leading-[18px] text-[#1F293B] bg-transparent border-0 outline-none ring-0 text-center w-28 p-0"
                      />
                      <span className="text-[11px] font-bold text-[#6B788C] ml-1">
                        units
                      </span>
                    </div>

                    {/* Increment Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const current = Number(deliveredQty) || 0;
                        const next = Math.min(expectedQty, current + 1);
                        onChangeDeliveredQty(String(next));
                      }}
                      className="w-9 h-9 rounded-[8px] bg-[#FFF2E8] hover:bg-[#ffe3d1] text-[#ED5214] font-black text-lg flex items-center justify-center cursor-pointer border-none transition-all active:scale-90"
                      title="Increase quantity by 1"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick Preset Buttons for rapid 1-tap adjustments */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const current = Number(deliveredQty) || 0;
                        onChangeDeliveredQty(String(Math.max(0, current - 5)));
                      }}
                      className="px-2.5 py-1 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] text-[10px] font-bold rounded-[6px] border-none cursor-pointer transition-all active:scale-95"
                    >
                      −5
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const current = Number(deliveredQty) || 0;
                        onChangeDeliveredQty(String(Math.max(0, current - 10)));
                      }}
                      className="px-2.5 py-1 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] text-[10px] font-bold rounded-[6px] border-none cursor-pointer transition-all active:scale-95"
                    >
                      −10
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeDeliveredQty(String(expectedQty))}
                      className="ml-auto px-2.5 py-1 bg-[#EDF2FA] hover:bg-[#dbe4f4] text-[#1F293B] text-[10px] font-bold rounded-[6px] border-none cursor-pointer transition-all active:scale-95"
                    >
                      Reset to {expectedQty}
                    </button>
                  </div>
                </div>

                {/* Difference */}
                <div className="flex flex-col gap-1">
                  <span className="font-normal text-[9px] leading-[11px] text-[#6B788C]">
                    Difference Calculation
                  </span>
                  <div className="w-full h-[42px] px-3 bg-[#F7F9FB] border border-[#E0E3E8] rounded-[8px] flex items-center justify-between">
                    <span className="font-bold text-[11px] leading-[13px] text-[#1F293B]">
                      {Math.max(0, expectedQty - (Number(deliveredQty) || expectedQty)) > 0
                        ? `${Math.max(0, expectedQty - (Number(deliveredQty) || expectedQty))} units short`
                        : "0 units (Delivered in full)"}
                    </span>
                    {Math.max(0, expectedQty - (Number(deliveredQty) || expectedQty)) > 0 ? (
                      <span className="text-[10px] font-extrabold text-[#ED5214] bg-[#FFF2E8] px-2 py-0.5 rounded-[4px]">
                        Shortage
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold text-[#1F9457] bg-[#E8F8F0] px-2 py-0.5 rounded-[4px]">
                        ✓ Full
                      </span>
                    )}
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
                    className="w-full h-[42px] px-3 bg-white border-[1.5px] border-[#ED5214] rounded-[8px] flex items-center justify-between cursor-pointer text-left shadow-2xs"
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

              {/* 3. DISCREPANCY REASON & DESCRIPTION (radius: 12px, bg: #FFFFFF) */}
              <div className="bg-white rounded-[12px] p-4 flex flex-col gap-3 border border-[#E2E8F0] shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[10px] leading-[12px] text-[#6B788C] uppercase tracking-wider">
                    DISCREPANCY REASON & NOTES
                  </span>
                  <span className="text-[9px] text-[#6B788C]">
                    Required for discrepancy log
                  </span>
                </div>

                {/* Quick 1-Tap Preset Reason Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Damaged Carton",
                    "Missing from Warehouse",
                    "Rejected by Store",
                    "Broken Seal",
                    "Wrong Variant",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        const current = discrepancyNotes.trim();
                        if (current.includes(chip)) return;
                        const updated = current ? `${current}. ${chip}` : chip;
                        onChangeDiscrepancyNotes(updated);
                      }}
                      className="px-2 py-1 bg-[#F1F5F9] hover:bg-[#FFF2E8] hover:text-[#ED5214] text-[#475569] text-[10px] font-semibold rounded-[6px] border border-[#E2E8F0] cursor-pointer transition-all active:scale-95"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>

                {/* Description Textarea Box */}
                <div className="w-full bg-[#F6F8FB] border border-[#D6DBE3] focus-within:border-[#ED5214] focus-within:bg-white rounded-[10px] p-3 transition-colors">
                  <textarea
                    rows={3}
                    value={discrepancyNotes}
                    onChange={(e) => onChangeDiscrepancyNotes(e.target.value)}
                    placeholder="Enter reason for quantity difference, damaged items, or notes for the store manager…"
                    className="w-full bg-transparent border-0 outline-none ring-0 font-normal text-[11px] leading-[15px] text-[#1F293B] placeholder-[#6B788C] resize-none p-0"
                  />
                  <div className="flex items-center justify-between pt-1 border-t border-[#E2E8F0]/60 mt-1.5">
                    <span className="text-[9px] text-[#6B788C]">
                      {discrepancyNotes.length > 0
                        ? `${discrepancyNotes.length} characters`
                        : "Tap preset chips above or type custom note"}
                    </span>
                    {discrepancyNotes && (
                      <button
                        type="button"
                        onClick={() => onChangeDiscrepancyNotes("")}
                        className="text-[9px] text-[#ED5214] font-bold hover:underline bg-transparent border-none cursor-pointer p-0"
                      >
                        Clear
                      </button>
                    )}
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
                Photo or store manager signature required (either one is sufficient).
              </span>
            </div>
          )}

          {/* ── CARD 5: CONFIRMATION BUTTON ── */}
          <button
            type="button"
            id="mobile-pod-confirm-checkbox"
            onClick={onToggleOrderConfirmed}
            className={`w-full rounded-[12px] p-4 flex items-center gap-3 cursor-pointer transition-all border-2 border-[#ED5214] text-left shadow-xs ${
              orderConfirmed ? "bg-[#EBFAF0]" : "bg-white hover:bg-orange-50/40"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-[6px] border-2 border-[#ED5214] flex items-center justify-center transition-all shrink-0 bg-white`}
            >
              {orderConfirmed && (
                <span className="text-[#1F9457] font-extrabold text-[16px] leading-none select-none">
                  ✓
                </span>
              )}
            </div>
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[12px] text-[#1F293B]">
                  Confirm complete order
                </span>
                {orderConfirmed && (
                  <span className="text-[10px] font-bold text-[#1F9457]">
                    Confirmed ✓
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] ${
                  orderConfirmed ? "font-bold text-[#1F9457]" : "text-[#6B788C]"
                }`}
              >
                {orderConfirmed ? "Confirmed and verified ✓" : "Required before submission"}
              </span>
            </div>
          </button>

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

            {ordersList.map((ordRef, idx) => (
              <div key={ordRef} className="flex items-center justify-between py-1 border-b border-[#F1F5F9]">
                <span className="font-bold text-[14px] leading-[17px] text-[#1F293B]">
                  {ordRef}
                </span>
                <span className="font-normal text-[11px] leading-[13px] text-[#1F9457]">
                  {idx === 0 ? "Ready for delivery" : "Verified for stop"}
                </span>
              </div>
            ))}

            {/* Confirm Order Button with Theme Orange Border & Green Tick */}
            <button
              type="button"
              id="button-confirm-order-inprogress"
              onClick={onToggleOrderConfirmed}
              className={`w-full rounded-[10px] p-3 flex items-center gap-3 cursor-pointer transition-all border-2 border-[#ED5214] text-left mt-1 ${
                orderConfirmed ? "bg-[#EBFAF0]" : "bg-white hover:bg-orange-50/40"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-[6px] border-2 border-[#ED5214] flex items-center justify-center transition-all shrink-0 bg-white`}
              >
                {orderConfirmed && (
                  <span className="text-[#1F9457] font-extrabold text-[16px] leading-none select-none">
                    ✓
                  </span>
                )}
              </div>
              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[12px] leading-[15px] text-[#1F293B]">
                    Confirm complete order
                  </span>
                  {orderConfirmed && (
                    <span className="text-[10px] font-bold text-[#1F9457]">
                      Confirmed ✓
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] leading-[12px] mt-0.5 ${
                    orderConfirmed ? "font-bold text-[#1F9457]" : "text-[#6B788C]"
                  }`}
                >
                  {orderConfirmed
                    ? "Order quantities confirmed ✓"
                    : "Tap to confirm before Complete Order"}
                </span>
              </div>
            </button>
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

        {/* ── CARD 3 & 4: LOADING UPDATE RESOLVED & ACKNOWLEDGED PLAN CHANGES (shown on OUT001) ── */}
        {stopCode === "OUT001" && (
          <>
            <div className="bg-[#EBFAF0] rounded-[12px] p-4 flex flex-col gap-2 border border-emerald-200">
              <span className="font-bold text-[13px] leading-[16px] text-[#1F9457]">
                Loading Update — Resolved
              </span>
              <p className="font-normal text-[11px] leading-[14px] text-[#1F293B] m-0">
                Loading issue reported for order {secondOrder} at {stopCode} / {stopName}.
              </p>
              <p className="font-normal text-[11px] leading-[14px] text-[#6B788C] m-0">
                8 damaged units were replaced before departure. Final quantity verified by the Loader.
              </p>
              <span className="font-bold text-[11px] leading-[13px] text-[#1F9457]">
                No action required.
              </span>
            </div>

            <div className="bg-[#FFF7E3] rounded-[12px] p-4 flex flex-col gap-1.5 border border-amber-200">
              <span className="font-bold text-[11px] leading-[13px] text-[#1F293B]">
                ACKNOWLEDGED PLAN CHANGES
              </span>
              <p className="font-normal text-[11px] leading-[14px] text-[#6B788C] m-0">
                Plan v2: 8 units of {secondOrder} replaced due to loading shortfall. Original 80 units → replacement stock loaded. Quantity verified by loader.
              </p>
            </div>
          </>
        )}

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
