"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConnectivity } from "@/context/DriverConnectivityContext";

export type SyncViewMode = "offline_pending" | "online_syncing" | "sync_complete" | "sync_failed";

export interface DriverSyncMobileViewProps {
  forcedMode?: SyncViewMode;
  onContinueNextStop?: () => void;
  onRetrySync?: () => void;
}

export function DriverSyncMobileView({
  forcedMode,
  onContinueNextStop,
  onRetrySync,
}: DriverSyncMobileViewProps) {
  const router = useRouter();
  const { connectionState, pendingCount, syncNow, lastSyncedTime } = useConnectivity();

  // Determine active view mode based on real connectivity or forced override
  const [internalMode, setInternalMode] = useState<SyncViewMode>("offline_pending");

  useEffect(() => {
    if (forcedMode) {
      setInternalMode(forcedMode);
      return;
    }

    if (connectionState === "offline") {
      setInternalMode("offline_pending");
    } else if (connectionState === "syncing") {
      setInternalMode("online_syncing");
    } else if (connectionState === "synced") {
      setInternalMode("sync_complete");
    } else if (connectionState === "online" && pendingCount > 0) {
      setInternalMode("online_syncing");
    } else {
      setInternalMode("sync_complete");
    }
  }, [forcedMode, connectionState, pendingCount]);

  const activeMode = forcedMode || internalMode;

  const handleRetry = async () => {
    if (onRetrySync) {
      onRetrySync();
    } else {
      setInternalMode("online_syncing");
      try {
        await syncNow();
        setInternalMode("sync_complete");
      } catch {
        setInternalMode("sync_failed");
      }
    }
  };

  const handleNextStop = () => {
    if (onContinueNextStop) {
      onContinueNextStop();
    } else {
      router.push("/driver/current-stop");
    }
  };

  return (
    <div
      id="driver-sync-figma-canvas"
      className="relative flex flex-col bg-[#F6F8FB] w-full max-w-[390px] min-h-[1120px] rounded-[24px] overflow-hidden shadow-2xl pb-28 mx-auto"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Top Header Frame (bg #FFFFFF) ── */}
      <header className="relative w-full h-[70px] bg-white flex items-center justify-between px-5 border-b border-[#E2E8F0] shrink-0 z-10">
        <span
          className="text-[#ED5214] font-bold text-[21px] leading-[25px] tracking-tight cursor-pointer"
          onClick={() => router.push("/driver/today-run")}
        >
          RightGo
        </span>

        {/* Dynamic Status Pill */}
        {activeMode === "offline_pending" ? (
          <span className="text-[#A66B0A] font-bold text-[12px] leading-[15px]">
            Offline
          </span>
        ) : (
          <span className="text-[#1F9457] font-bold text-[12px] leading-[15px]">
            Online
          </span>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────
          STATE 1: Mobile — RightGo — Offline — Pending Sync
          ───────────────────────────────────────────────────────── */}
      {activeMode === "offline_pending" && (
        <div className="flex flex-col px-5 pt-4 pb-6">
          {/* Banner Card (bg #FFF5D1, r: 12px) */}
          <div className="w-full min-h-[100px] bg-[#FFF5D1] rounded-[12px] p-4 flex flex-col justify-between mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <span className="text-[#A66B0A] font-bold text-[12px] leading-[15px]">
              Offline Mode
            </span>
            <p className="text-[#1F293B] text-[11px] leading-[13px] font-normal m-0">
              Working offline. Changes saved locally and will sync when connection returns.
            </p>
          </div>

          {/* Title Area */}
          <div className="flex flex-col mb-3">
            <h1 className="text-[#1F293B] font-bold text-[22px] leading-[27px] m-0">
              Current Stop
            </h1>
            <span className="text-[#6B788C] text-[11px] leading-[13px] font-normal mt-1">
              Stop 1 of 4
            </span>
          </div>

          {/* Card 1: CURRENT STOP (bg #FFFFFF, r: 12px) */}
          <div className="w-full min-h-[110px] bg-white rounded-[12px] p-4 flex flex-col justify-between mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <div>
              <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-2">
                CURRENT STOP
              </span>
              <span className="block text-[#1F293B] font-bold text-[15px] leading-[18px] mb-1.5">
                OUT001 / Colpetty Retailer
              </span>
              <span className="block text-[#6B788C] text-[10px] leading-[12px] font-normal">
                Trip A • PEL-R04
              </span>
            </div>
            <span className="text-[#A66B0A] font-bold text-[10px] leading-[12px] pt-1">
              Local data available offline ✓
            </span>
          </div>

          {/* Card 2: PENDING SYNC (bg #FFFFFF, r: 12px) */}
          <div className="w-full min-h-[248px] bg-white rounded-[12px] p-4 flex flex-col mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-1.5">
              PENDING SYNC
            </span>
            <span className="block text-[#1F293B] font-bold text-[14px] leading-[17px] mb-3">
              {pendingCount > 0 ? `${pendingCount} changes saved locally` : "3 changes saved locally"}
            </span>

            {/* Item 1: Delivery outcome */}
            <div className="w-full h-[48px] bg-[#EDF2FA] rounded-[8px] px-3 py-2 flex flex-col justify-between mb-2">
              <div className="flex items-center justify-between">
                <span className="text-[#6B788C] text-[10px] leading-[12px] font-normal">
                  Delivery outcome
                </span>
                <span className="text-[#A66B0A] font-bold text-[10px] leading-[12px]">
                  Saved locally • Pending
                </span>
              </div>
              <span className="text-[#1F293B] font-bold text-[10px] leading-[12px]">
                Delivered in Full
              </span>
            </div>

            {/* Item 2: Proof of Delivery */}
            <div className="w-full h-[48px] bg-[#EDF2FA] rounded-[8px] px-3 py-2 flex flex-col justify-between mb-2">
              <div className="flex items-center justify-between">
                <span className="text-[#6B788C] text-[10px] leading-[12px] font-normal">
                  Proof of Delivery
                </span>
                <span className="text-[#A66B0A] font-bold text-[10px] leading-[12px]">
                  Saved locally • Pending
                </span>
              </div>
              <span className="text-[#1F293B] font-bold text-[10px] leading-[12px]">
                Photo + Signature
              </span>
            </div>

            {/* Item 3: Issue report */}
            <div className="w-full h-[48px] bg-[#EDF2FA] rounded-[8px] px-3 py-2 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[#6B788C] text-[10px] leading-[12px] font-normal">
                  Issue report
                </span>
                <span className="text-[#A66B0A] font-bold text-[10px] leading-[12px]">
                  Saved locally • Pending
                </span>
              </div>
              <span className="text-[#1F293B] font-bold text-[10px] leading-[12px]">
                REP-S1-T001-004
              </span>
            </div>
          </div>

          {/* Card 3: SYNC STATUS (bg #FFFFFF, r: 12px) */}
          <div className="w-full min-h-[150px] bg-white rounded-[12px] p-4 flex flex-col justify-between mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <div>
              <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-2">
                SYNC STATUS
              </span>
              <span className="block text-[#A66B0A] font-bold text-[14px] leading-[17px] mb-2">
                Waiting for connection
              </span>
              <p className="text-[#1F293B] text-[11px] leading-[13px] font-normal m-0 mb-3">
                RightGo will automatically sync these changes when internet connectivity returns.
              </p>
            </div>

            {/* Frame Box (bg #EDF2FA, r: 8px) */}
            <div className="w-full h-[28px] bg-[#EDF2FA] rounded-[8px] px-3 flex items-center justify-between">
              <span className="text-[#455263] font-bold text-[10px] leading-[12px]">
                Auto Sync Enabled
              </span>
              <span className="text-[#6B788C] text-[10px] leading-[12px] font-normal">
                No action needed
              </span>
            </div>
          </div>

          {/* Card 4: SAFE TO CONTINUE (bg #FFFFFF, r: 12px) */}
          <div className="w-full min-h-[108px] bg-white rounded-[12px] p-4 flex flex-col justify-between mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <div>
              <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-2">
                SAFE TO CONTINUE
              </span>
              <p className="text-[#1F293B] text-[11px] leading-[13px] font-normal m-0 mb-2">
                You can continue to the next stop while offline. New updates will also be stored on this device.
              </p>
            </div>
            <span className="text-[#ED5214] font-bold text-[10px] leading-[12px]">
              Do not clear app data before sync completes.
            </span>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          STATE 2: Mobile — RightGo — Back Online — Syncing
          ───────────────────────────────────────────────────────── */}
      {activeMode === "online_syncing" && (
        <div className="flex flex-col px-5 pt-4 pb-6">
          {/* Banner Card (bg #E8F5FF, r: 12px) */}
          <div className="w-full min-h-[84px] bg-[#E8F5FF] rounded-[12px] p-4 flex flex-col justify-between mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <span className="text-[#1F9457] font-bold text-[12px] leading-[15px]">
              Connection Restored
            </span>
            <p className="text-[#1F293B] text-[11px] leading-[13px] font-normal m-0">
              You&apos;re back online. Saved changes are syncing automatically.
            </p>
          </div>

          {/* Title Area */}
          <h1 className="text-[#1F293B] font-bold text-[22px] leading-[27px] m-0 mb-3">
            Syncing Changes
          </h1>

          {/* Card 1: SYNC PROGRESS (bg #FFFFFF, r: 12px) */}
          <div className="w-full min-h-[126px] bg-white rounded-[12px] p-4 flex flex-col justify-between mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <div>
              <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-2">
                SYNC PROGRESS
              </span>
              <span className="block text-[#ED5214] font-bold text-[15px] leading-[18px] mb-2.5">
                Syncing 1 of 3…
              </span>

              {/* Progress Bar */}
              <div className="w-full h-[12px] bg-[#EDF2FA] rounded-[6px] overflow-hidden relative mb-2">
                <div className="w-1/3 h-[12px] bg-[#ED5214] rounded-[6px] transition-all duration-300 animate-pulse" />
              </div>
            </div>

            <span className="text-[#6B788C] text-[10px] leading-[12px] font-normal">
              Please keep RightGo open while sync completes.
            </span>
          </div>

          {/* Card 2: SAVED CHANGES (bg #FFFFFF, r: 12px) */}
          <div className="w-full min-h-[214px] bg-white rounded-[12px] p-4 flex flex-col mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-3">
              SAVED CHANGES
            </span>

            {/* Item 1: Delivery outcome (Syncing) */}
            <div className="w-full h-[44px] bg-[#EDF2FA] rounded-[8px] px-3 py-1.5 flex flex-col justify-between mb-2">
              <div className="flex items-center justify-between">
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  Delivery outcome
                </span>
                <span className="text-[#ED5214] font-bold text-[10px] leading-[12px]">
                  Syncing…
                </span>
              </div>
              <span className="text-[#6B788C] text-[9px] leading-[11px] font-normal">
                Uploading saved record
              </span>
            </div>

            {/* Item 2: Proof of Delivery (Waiting) */}
            <div className="w-full h-[44px] bg-[#EDF2FA] rounded-[8px] px-3 py-1.5 flex flex-col justify-between mb-2">
              <div className="flex items-center justify-between">
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  Proof of Delivery
                </span>
                <span className="text-[#6B788C] font-bold text-[10px] leading-[12px]">
                  Waiting
                </span>
              </div>
              <span className="text-[#6B788C] text-[9px] leading-[11px] font-normal">
                Queued for sync
              </span>
            </div>

            {/* Item 3: Issue report (Waiting) */}
            <div className="w-full h-[44px] bg-[#EDF2FA] rounded-[8px] px-3 py-1.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  Issue report
                </span>
                <span className="text-[#6B788C] font-bold text-[10px] leading-[12px]">
                  Waiting
                </span>
              </div>
              <span className="text-[#6B788C] text-[9px] leading-[11px] font-normal">
                Queued for sync
              </span>
            </div>
          </div>

          {/* Card 3: CURRENT STOP (bg #FFFFFF, r: 12px) */}
          <div className="w-full min-h-[108px] bg-white rounded-[12px] p-4 flex flex-col justify-between mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <div>
              <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-2">
                CURRENT STOP
              </span>
              <span className="block text-[#1F293B] font-bold text-[14px] leading-[17px] mb-1.5">
                OUT001 / Colpetty Retailer
              </span>
              <span className="block text-[#6B788C] text-[10px] leading-[12px] font-normal">
                Trip A • Stop 1 • PEL-R04
              </span>
            </div>
            <span className="text-[#1F9457] font-bold text-[10px] leading-[12px] pt-1">
              Local records remain safe during sync.
            </span>
          </div>

          {/* Card 4: AUTOMATIC SYNC (bg #FFFFFF, r: 12px) */}
          <div className="w-full min-h-[92px] bg-white rounded-[12px] p-4 flex flex-col justify-start mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-2">
              AUTOMATIC SYNC
            </span>
            <p className="text-[#1F293B] text-[10px] leading-[12px] font-normal m-0">
              No manual action is required. RightGo will update each item as it is confirmed by the server.
            </p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          STATE 3: Mobile — RightGo — Sync Complete
          ───────────────────────────────────────────────────────── */}
      {activeMode === "sync_complete" && (
        <div className="flex flex-col px-5 pt-4 pb-6">
          {/* Banner Card (bg #EBFAF0, r: 12px) */}
          <div className="w-full min-h-[148px] bg-[#EBFAF0] rounded-[12px] p-4 flex flex-col items-center justify-center text-center mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <span className="text-[#1F9457] font-bold text-[30px] leading-[36px] mb-1.5">
              ✓
            </span>
            <span className="text-[#1F9457] font-bold text-[17px] leading-[21px] mb-1.5">
              All Changes Synced
            </span>
            <span className="text-[#1F293B] text-[11px] leading-[13px] font-normal mb-1.5">
              3 of 3 changes synced successfully.
            </span>
            <span className="text-[#6B788C] text-[10px] leading-[12px] font-normal">
              Synced {lastSyncedTime ? `at ${lastSyncedTime}` : "just now"}
            </span>
          </div>

          {/* Card 1: SYNCED ITEMS (bg #FFFFFF, r: 12px) */}
          <div className="w-full min-h-[214px] bg-white rounded-[12px] p-4 flex flex-col mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-3">
              SYNCED ITEMS
            </span>

            {/* Item 1: Delivery outcome */}
            <div className="w-full h-[44px] bg-[#EDF2FA] rounded-[8px] px-3 py-1.5 flex flex-col justify-between mb-2">
              <div className="flex items-center justify-between">
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  Delivery outcome
                </span>
                <span className="text-[#1F9457] font-bold text-[10px] leading-[12px]">
                  Synced ✓
                </span>
              </div>
              <span className="text-[#6B788C] text-[9px] leading-[11px] font-normal">
                Server confirmed
              </span>
            </div>

            {/* Item 2: Proof of Delivery */}
            <div className="w-full h-[44px] bg-[#EDF2FA] rounded-[8px] px-3 py-1.5 flex flex-col justify-between mb-2">
              <div className="flex items-center justify-between">
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  Proof of Delivery
                </span>
                <span className="text-[#1F9457] font-bold text-[10px] leading-[12px]">
                  Synced ✓
                </span>
              </div>
              <span className="text-[#6B788C] text-[9px] leading-[11px] font-normal">
                Server confirmed
              </span>
            </div>

            {/* Item 3: Issue report */}
            <div className="w-full h-[44px] bg-[#EDF2FA] rounded-[8px] px-3 py-1.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  Issue report
                </span>
                <span className="text-[#1F9457] font-bold text-[10px] leading-[12px]">
                  Synced ✓
                </span>
              </div>
              <span className="text-[#6B788C] text-[9px] leading-[11px] font-normal">
                REP-S1-T001-004
              </span>
            </div>
          </div>

          {/* Card 2: CURRENT STOP (bg #FFFFFF, r: 12px) */}
          <div className="w-full min-h-[112px] bg-white rounded-[12px] p-4 flex flex-col justify-between mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <div>
              <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-2">
                CURRENT STOP
              </span>
              <span className="block text-[#1F293B] font-bold text-[14px] leading-[17px] mb-1.5">
                OUT001 / Colpetty Retailer
              </span>
              <span className="block text-[#6B788C] text-[10px] leading-[12px] font-normal">
                Trip A • Stop 1 • PEL-R04
              </span>
            </div>
            <span className="text-[#1F9457] font-bold text-[10px] leading-[12px] pt-1">
              All offline updates are now available in History.
            </span>
          </div>

          {/* Card 3: SYNC COMPLETE (bg #FFFFFF, r: 12px) */}
          <div className="w-full min-h-[112px] bg-white rounded-[12px] p-4 flex flex-col justify-center mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="block text-[#1F9457] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-2">
              SYNC COMPLETE
            </span>
            <p className="text-[#1F293B] text-[11px] leading-[15px] font-normal m-0">
              You can safely continue. Your delivery, POD and issue report are stored on the server.
            </p>
          </div>

          {/* Card 4: ACTION (bg #FFFFFF, r: 12px) */}
          <div className="w-full min-h-[100px] bg-white rounded-[12px] p-3.5 flex flex-col items-center justify-between mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <button
              type="button"
              id="continue-trip-next-stop-button"
              onClick={handleNextStop}
              className="w-full h-[52px] bg-[#ED5214] hover:bg-[#d9460d] text-white font-bold text-[12px] leading-[15px] rounded-[10px] flex items-center justify-center cursor-pointer transition-all border-none shadow-sm"
            >
              Continue Trip A — Next Stop
            </button>
            <span className="text-[#6B788C] text-[10px] leading-[12px] font-normal text-center">
              Continue the same active trip to Stop 2 of 4.
            </span>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          STATE 4: Mobile — RightGo — Sync Failed — Retry
          ───────────────────────────────────────────────────────── */}
      {activeMode === "sync_failed" && (
        <div className="flex flex-col px-5 pt-4 pb-6">
          {/* Banner Card (bg #FFF5D1, r: 12px) */}
          <div className="w-full min-h-[112px] bg-[#FFF5D1] rounded-[12px] p-4 flex flex-col justify-between mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <span className="text-[#B82E24] font-bold text-[12px] leading-[15px]">
              Sync Incomplete
            </span>
            <p className="text-[#1F293B] text-[11px] leading-[13px] font-normal m-0">
              1 change could not be synced. Your data is still saved locally.
            </p>
            <span className="text-[#B82E24] font-bold text-[10px] leading-[12px]">
              Nothing has been lost.
            </span>
          </div>

          {/* Card 1: SYNC STATUS (bg #FFFFFF, r: 12px) */}
          <div className="w-full min-h-[214px] bg-white rounded-[12px] p-4 flex flex-col mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-3">
              SYNC STATUS
            </span>

            {/* Item 1: Delivery outcome */}
            <div className="w-full h-[44px] bg-[#EDF2FA] rounded-[8px] px-3 py-1.5 flex flex-col justify-between mb-2">
              <div className="flex items-center justify-between">
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  Delivery outcome
                </span>
                <span className="text-[#1F9457] font-bold text-[10px] leading-[12px]">
                  Synced ✓
                </span>
              </div>
              <span className="text-[#6B788C] text-[9px] leading-[11px] font-normal">
                Server confirmed
              </span>
            </div>

            {/* Item 2: Proof of Delivery */}
            <div className="w-full h-[44px] bg-[#EDF2FA] rounded-[8px] px-3 py-1.5 flex flex-col justify-between mb-2">
              <div className="flex items-center justify-between">
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  Proof of Delivery
                </span>
                <span className="text-[#1F9457] font-bold text-[10px] leading-[12px]">
                  Synced ✓
                </span>
              </div>
              <span className="text-[#6B788C] text-[9px] leading-[11px] font-normal">
                Server confirmed
              </span>
            </div>

            {/* Item 3: Issue report (Sync failed) */}
            <div className="w-full h-[44px] bg-[#EDF2FA] rounded-[8px] px-3 py-1.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[#1F293B] font-bold text-[11px] leading-[13px]">
                  Issue report
                </span>
                <span className="text-[#B82E24] font-bold text-[10px] leading-[12px]">
                  Sync failed
                </span>
              </div>
              <span className="text-[#6B788C] text-[9px] leading-[11px] font-normal">
                REP-S1-T001-004 • Saved locally
              </span>
            </div>
          </div>

          {/* Card 2: ISSUE REPORT (bg #FFFFFF, r: 12px) */}
          <div className="w-full min-h-[126px] bg-white rounded-[12px] p-4 flex flex-col justify-between mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <div>
              <span className="block text-[#6B788C] font-bold text-[10px] leading-[12px] uppercase tracking-wider mb-2">
                ISSUE REPORT
              </span>
              <span className="block text-[#1F293B] font-bold text-[13px] leading-[16px] mb-1.5">
                REP-S1-T001-004
              </span>
              <p className="text-[#1F293B] text-[10px] leading-[12px] font-normal m-0 mb-1.5">
                Unable to reach the server while syncing this item.
              </p>
            </div>
            <span className="text-[#B82E24] font-bold text-[10px] leading-[12px]">
              It will remain on this device until sync succeeds.
            </span>
          </div>

          {/* Card 3: ACTION (bg #FFFFFF, r: 12px) */}
          <div className="w-full min-h-[150px] bg-white rounded-[12px] p-4 flex flex-col justify-between mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#EDF2FA]">
            <button
              type="button"
              id="retry-sync-button"
              onClick={handleRetry}
              className="w-full h-[52px] bg-[#ED5214] hover:bg-[#d9460d] text-white font-bold text-[13px] leading-[16px] rounded-[10px] flex items-center justify-center cursor-pointer transition-all border-none shadow-sm"
            >
              Retry Sync
            </button>
            <div className="flex flex-col pt-1">
              <span className="text-[#1F9457] font-bold text-[10px] leading-[12px] mb-1">
                DATA SAFE
              </span>
              <p className="text-[#1F293B] text-[10px] leading-[12px] font-normal m-0">
                RightGo keeps failed changes locally and retries automatically when a stable connection is available.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
