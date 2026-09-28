"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  PlayIcon,
  AlertTriangleIcon,
  RouteIcon,
  NavigationIcon,
  ExternalLinkIcon,
  CheckIcon,
  XIcon,
  CameraIcon,
  SignatureIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  SmartphoneIcon,
  RefreshCwIcon,
  InactiveDotIcon,
} from "@/components/driver/today-run/icons";

export function DriverStopWorkflow({ initialStopRecorded = false }: { initialStopRecorded?: boolean }) {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);

  // Delivery workflow states:
  // 1. deliveryStarted === false -> Details & Start Delivery CTA
  // 2. deliveryStarted === true && completingDelivery === false -> Live Navigation Route & Complete Delivery CTA
  // 3. completingDelivery === true && stopRecorded === false -> Proof of Delivery / Outcome & Complete Stop CTA
  // 4. stopRecorded === true -> Stop Recorded / Delivery Recorded success screen & Proceed to Next Stop CTA
  const [deliveryStarted, setDeliveryStarted] = useState(false);
  const [completingDelivery, setCompletingDelivery] = useState(false);
  const [stopRecorded, setStopRecorded] = useState(initialStopRecorded);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  // Sync state for offline delivery status
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [confirmedTimeStr, setConfirmedTimeStr] = useState("10:42 AM");

  useEffect(() => {
    setConfirmedTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, []);

  const handleRetrySync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setIsSynced(true);
      setConfirmedTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1500);
  };

  // Outcome selection: 'full' | 'discrepancy' | 'none'
  const [deliveryOutcome, setDeliveryOutcome] = useState<"full" | "discrepancy" | "none">("discrepancy");
  const [photoFile, setPhotoFile] = useState<{ name: string; url: string } | null>(null);
  const [signatureFile, setSignatureFile] = useState<{ name: string; url: string } | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoFile({ name: file.name, url });
    }
    e.target.value = "";
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSignatureFile({ name: file.name, url });
    }
    e.target.value = "";
  };

  const handlePrimaryAction = () => {
    if (!deliveryStarted) {
      setDeliveryStarted(true);
    } else if (!completingDelivery) {
      setCompletingDelivery(true);
    } else if (!stopRecorded) {
      setStopRecorded(true);
    } else {
      // Proceed to Next Stop -> navigate back to Today Run
      router.push("/driver/today-run");
    }
  };

  return (
    <>
      {/* Hidden File Inputs for Photo & Signature - Root Level */}
      <input
        type="file"
        ref={photoInputRef}
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />
      <input
        type="file"
        ref={signatureInputRef}
        accept="image/*"
        onChange={handleSignatureUpload}
        className="hidden"
      />

      {/* ══════════════════════════════════════════
          DESKTOP layout  (md+) — fluid, full-width
          ══════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col gap-6 p-6 lg:p-8 min-h-full">
        {/* Navigation / Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-[#E2E8F0]">
          <div className="flex items-center gap-4">
            <Link
              href="/driver/today-run"
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#202D2D] hover:bg-[#E2E8F0] transition-colors"
              aria-label="Back to Today's Run"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-[#22C55E] font-bold text-xs uppercase tracking-wider bg-green-50 px-2.5 py-1 rounded-md border border-green-200">
                  {stopRecorded
                    ? "Stop Recorded"
                    : completingDelivery
                    ? "Complete Delivery"
                    : deliveryStarted
                    ? "In Progress"
                    : "Current Stop"}
                </span>
                <span className="text-[#485563] font-bold text-sm">Stop 1 of 4</span>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#CBD5E1] rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                  <span className="text-[#22C55E] font-semibold text-xs">Online</span>
                </div>
              </div>
              <h1 className="text-[#202D2D] font-extrabold text-2xl lg:text-3xl mt-1">
                {stopRecorded
                  ? "Stop Recorded - Delivery Successful"
                  : completingDelivery
                  ? "Complete Delivery - OUT001 / Colpetty Retailer"
                  : deliveryStarted
                  ? "Stop 1: OUT001 / Colpetty Retailer"
                  : "OUT001 / Colpetty Retailer"}
              </h1>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {!stopRecorded && (
              <Link
                href="/driver/report"
                className="flex items-center justify-center px-5 py-3 rounded-xl border-2 border-[#202D2D] text-[#202D2D] font-bold text-sm hover:bg-[#202D2D] hover:text-white transition-all duration-200 no-underline"
              >
                Report Issue
              </Link>
            )}
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm bg-[#F97316] hover:bg-[#ea6c0a] active:scale-[0.98] transition-all duration-200 shadow-md cursor-pointer border-none"
            >
              {stopRecorded ? (
                <>
                  <span>Proceed to Next Stop</span>
                  <ArrowRightIcon className="w-4 h-4 text-white" />
                </>
              ) : completingDelivery ? (
                <>
                  <CheckCircleIcon className="w-5 h-5 text-white" />
                  <span>Complete Stop</span>
                </>
              ) : deliveryStarted ? (
                <>
                  <PlayIcon className="w-4 h-4 fill-current" />
                  <span>Complete Delivery</span>
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4 fill-current" />
                  <span>Start Delivery</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── DESKTOP VIEW FOR STOP RECORDED SUCCESS (stopRecorded === true) ── */}
        {stopRecorded ? (
          <div className="flex flex-col items-center justify-start bg-white rounded-2xl p-8 border border-[#CBD5E1] shadow-sm text-center gap-6 max-w-3xl mx-auto w-full overflow-y-auto">
            {/* success-circle */}
            <div className="w-[72px] h-[72px] rounded-full bg-[#ECFDF5] border-2 border-[#22C55E] flex items-center justify-center shrink-0">
              <CheckIcon className="w-8 h-8 text-[#22C55E]" />
            </div>

            {/* Headline */}
            <div className="flex flex-col items-center gap-1">
              <h2 className="text-[#202D2D] font-extrabold text-2xl lg:text-3xl m-0">
                Delivery Recorded
              </h2>
              <span className="text-[#485563] font-medium text-base">
                OUT001 / Colpetty Retailer
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left">
              {/* Device Storage Card */}
              <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 flex flex-col items-center gap-3">
                <div className="flex items-center bg-[#F9FAFB] rounded-full px-3 py-1.5 gap-2 border border-[#CBD5E1]/50">
                  <SmartphoneIcon className="w-4 h-4 text-[#485563]" />
                  <span className="text-[#485563] font-bold text-xs">
                    Saved on this device
                  </span>
                </div>
                <p className="text-[#485563] font-medium text-xs sm:text-sm text-center m-0 leading-relaxed">
                  Data is secured offline. Will sync when connection returns.
                </p>
              </div>

              {/* Action & Proceed Box */}
              <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-5 flex flex-col justify-between items-center gap-4 text-center">
                <div>
                  <span className="text-[#202D2D] font-bold text-sm block">Stop Completed Offline</span>
                  <span className="text-[#485563] font-medium text-xs mt-1 block">Record DEL-S1-T001-001 is stored securely in local cache.</span>
                </div>
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-[#F97316] hover:bg-[#ea6c0a] active:scale-[0.98] text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer border-none"
                >
                  <ArrowRightIcon className="w-4 h-4 text-white" />
                  <span>Proceed to Next Stop</span>
                </button>
              </div>
            </div>

            {/* CLOUD NETWORK SYNC STATUS Card */}
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 flex flex-col items-start gap-4 w-full text-left">
              <span className="text-[#485563] font-bold text-xs uppercase tracking-wider">
                CLOUD NETWORK SYNC STATUS
              </span>

              <div className="flex flex-col gap-4 w-full">
                {/* Item 1: Saved on device */}
                <div className="flex items-start gap-3 border-b border-[#F1F5F9] pb-3">
                  <CheckCircleIcon className="w-6 h-6 text-[#22C55E] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5 flex-1">
                    <span className="text-[#202D2D] font-bold text-sm">Saved on device</span>
                    <span className="text-[#485563] font-medium text-xs">Record DEL-S1-T001-001 secured locally.</span>
                    <span className="text-[#485563] font-medium text-xs">Data is saved. Will sync when connection returns.</span>
                  </div>
                </div>

                {/* Item 2: Syncing... */}
                <div className="flex items-start gap-3 border-b border-[#F1F5F9] pb-3">
                  <RefreshCwIcon className={`w-6 h-6 text-[#22C55E] shrink-0 mt-0.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <div className="flex flex-col gap-0.5 flex-1">
                    <span className="text-[#22C55E] font-bold text-sm">
                      {isSyncing ? "Syncing now..." : "Syncing..."}
                    </span>
                    <span className="text-[#485563] font-medium text-xs">Transmitting delivery record to cloud...</span>
                  </div>
                </div>

                {/* Item 3: Synced successfully */}
                <div className="flex items-start gap-3 border-b border-[#F1F5F9] pb-3">
                  <div className="w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
                    {isSynced ? (
                      <CheckCircleIcon className="w-6 h-6 text-[#22C55E]" />
                    ) : (
                      <InactiveDotIcon className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1">
                    <span className={`font-bold text-sm ${isSynced ? 'text-[#22C55E]' : 'text-[#485563]'}`}>
                      Synced successfully
                    </span>
                    <span className="text-[#485563] font-medium text-xs">
                      {isSynced ? `Confirmed timestamp: ${confirmedTimeStr}` : "Confirmed timestamp will appear here."}
                    </span>
                  </div>
                </div>

                {/* Item 4: Sync failed - retry available */}
                <div className="flex items-start justify-between gap-3 border-b border-[#F1F5F9] pb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
                      <InactiveDotIcon className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[#485563] font-bold text-sm">Sync failed - retry available</span>
                      <span className="text-[#485563] font-medium text-xs">Delivery record preserved. Tap Retry to attempt sync again.</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetrySync}
                    className="px-4 py-2 bg-[#F97316] hover:bg-[#ea6c0a] text-white rounded-xl font-bold text-xs border-none cursor-pointer active:scale-95 transition-all shrink-0"
                  >
                    {isSyncing ? "Retrying..." : "Retry"}
                  </button>
                </div>

                {/* Item 5: Plan conflict - review required */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
                      <InactiveDotIcon className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[#485563] font-bold text-sm">Plan conflict - review required</span>
                      <span className="text-[#485563] font-medium text-xs">A plan change occurred while you were delivering. Review changes before proceeding.</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(true)}
                    className="px-4 py-2 bg-[#F97316] hover:bg-[#ea6c0a] text-white rounded-xl font-bold text-xs border-none cursor-pointer active:scale-95 transition-all shrink-0"
                  >
                    Review Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : completingDelivery ? (
          /* ── DESKTOP PROOF OF DELIVERY VIEW ── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            <div className="lg:col-span-6 flex flex-col gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1] flex flex-col gap-4">
                <span className="text-[#485563] font-bold text-xs uppercase tracking-wider">
                  DELIVERY OUTCOME
                </span>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryOutcome("full")}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer text-left bg-white ${
                      deliveryOutcome === "full" ? "border-[#22C55E]" : "border-[#CBD5E1]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#22C55E] flex items-center justify-center shrink-0">
                        <CheckIcon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-[#202D2D] font-bold text-base">
                        Delivered in Full
                      </span>
                    </div>
                    <div
                      className={`w-4.5 h-4.5 rounded-full border-2 ${
                        deliveryOutcome === "full"
                          ? "border-[#22C55E] bg-[#22C55E]"
                          : "border-[#CBD5E1] bg-white"
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryOutcome("discrepancy")}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer text-left ${
                      deliveryOutcome === "discrepancy"
                        ? "bg-[#FFF4ED] border-[#F97316]"
                        : "bg-white border-[#CBD5E1]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#FFF4ED] border border-[#F59E0B] flex items-center justify-center shrink-0">
                        <AlertTriangleIcon className="w-3.5 h-3.5 text-[#F59E0B]" />
                      </div>
                      <span className="text-[#202D2D] font-semibold text-base">
                        Delivered with Discrepancy
                      </span>
                    </div>
                    <div
                      className={`w-4.5 h-4.5 rounded-full border-2 ${
                        deliveryOutcome === "discrepancy"
                          ? "border-[#F97316] bg-[#F97316]"
                          : "border-[#CBD5E1] bg-white"
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryOutcome("none")}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer text-left ${
                      deliveryOutcome === "none"
                        ? "bg-[#FEF2F2] border-[#EF4444]"
                        : "bg-white border-[#CBD5E1]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#FEF2F2] border border-[#EF4444] flex items-center justify-center shrink-0">
                        <XIcon className="w-3.5 h-3.5 text-[#EF4444]" />
                      </div>
                      <span className="text-[#202D2D] font-semibold text-base">
                        Not Delivered
                      </span>
                    </div>
                    <div
                      className={`w-4.5 h-4.5 rounded-full border-2 ${
                        deliveryOutcome === "none"
                          ? "border-[#EF4444] bg-[#EF4444]"
                          : "border-[#CBD5E1] bg-white"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1] flex flex-col gap-2">
                <span className="text-[#485563] font-bold text-xs uppercase tracking-wider">
                  DELIVERY RECORD
                </span>
                <div className="flex flex-col gap-1 bg-[#F9FAFB] p-4 rounded-xl border border-[#F1F5F9]">
                  <span className="text-[#485563] font-semibold text-xs">
                    Delivery record ID
                  </span>
                  <span className="text-[#202D2D] font-bold text-lg">
                    DEL-S1-T001-001
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-col gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1] flex flex-col gap-4">
                <div>
                  <span className="text-[#485563] font-bold text-xs uppercase tracking-wider">
                    PROOF OF DELIVERY
                  </span>
                  <p className="text-[#485563] font-medium text-xs mt-1">
                    Photo of delivered goods or recipient signature required
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Take Photo Button / Preview */}
                  {photoFile ? (
                    <div className="flex flex-col items-center justify-center p-4 bg-green-50 border border-green-400 rounded-xl text-center gap-2">
                      <img
                        src={photoFile.url}
                        alt="Goods photo preview"
                        className="w-16 h-12 rounded object-cover border border-green-300 shadow-sm"
                      />
                      <span className="text-xs font-bold text-green-800 truncate max-w-full">
                        {photoFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPhotoFile(null)}
                        className="text-[11px] font-bold text-red-600 hover:text-red-800 px-2 py-0.5 bg-white border border-red-200 rounded cursor-pointer"
                      >
                        Remove Photo
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="flex flex-col items-center justify-center p-6 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#485563] gap-2 cursor-pointer transition-colors"
                    >
                      <CameraIcon className="w-6 h-6 text-[#485563]" />
                      <span className="font-semibold text-sm">Take Photo (Upload File)</span>
                    </button>
                  )}

                  {/* Capture Signature Button / Preview */}
                  {signatureFile ? (
                    <div className="flex flex-col items-center justify-center p-4 bg-green-50 border border-green-400 rounded-xl text-center gap-2">
                      <img
                        src={signatureFile.url}
                        alt="Signature preview"
                        className="w-16 h-12 rounded object-cover border border-green-300 shadow-sm"
                      />
                      <span className="text-xs font-bold text-green-800 truncate max-w-full">
                        {signatureFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSignatureFile(null)}
                        className="text-[11px] font-bold text-red-600 hover:text-red-800 px-2 py-0.5 bg-white border border-red-200 rounded cursor-pointer"
                      >
                        Remove Signature
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => signatureInputRef.current?.click()}
                      className="flex flex-col items-center justify-center p-6 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#485563] gap-2 cursor-pointer transition-colors"
                    >
                      <SignatureIcon className="w-6 h-6 text-[#485563]" />
                      <span className="font-semibold text-sm">Capture Signature (Upload File)</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1] flex flex-col gap-4">
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-[#F97316] hover:bg-[#ea6c0a] active:scale-[0.98] text-white font-bold text-base rounded-xl transition-all shadow-md cursor-pointer border-none"
                >
                  <CheckCircleIcon className="w-5 h-5 text-white" />
                  <span>Complete Stop</span>
                </button>
              </div>
            </div>
          </div>
        ) : deliveryStarted ? (
          /* ── DESKTOP ACTIVE ROUTE VIEW ── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            {/* Left: Route Map */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-[#CBD5E1] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-6 pt-5 pb-3">
                  <span className="text-[#22C55E] font-bold text-xs uppercase tracking-wider">
                    MAP — ROUTE
                  </span>
                  <span className="text-[#485563] font-semibold text-xs">
                    Live tracking
                  </span>
                </div>
                {/* Route Map Visual */}
                <div className="relative w-full bg-slate-900 overflow-hidden" style={{ height: 380 }}>
                  {/* Grid pattern background */}
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage:
                        "radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#38bdf8 1px, #0f172a 1px)",
                      backgroundSize: "20px 20px",
                      backgroundPosition: "0 0, 10px 10px",
                    }}
                  />
                  {/* Animated route path */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 380" fill="none">
                    <path
                      d="M 80 320 Q 120 280 160 260 Q 200 240 260 200 Q 320 160 380 140 Q 440 120 500 80"
                      stroke="#22C55E"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray="12 6"
                      opacity="0.8"
                    >
                      <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1s" repeatCount="indefinite" />
                    </path>
                    {/* Start marker */}
                    <circle cx="80" cy="320" r="10" fill="#1D4ED8" stroke="white" strokeWidth="3" />
                    <text x="80" y="350" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">Depot</text>
                    {/* Waypoint markers */}
                    <circle cx="260" cy="200" r="6" fill="#F59E0B" stroke="white" strokeWidth="2" />
                    <circle cx="380" cy="140" r="6" fill="#F59E0B" stroke="white" strokeWidth="2" />
                    {/* End marker - destination */}
                    <circle cx="500" cy="80" r="14" fill="#F97316" stroke="white" strokeWidth="3" />
                    <text x="500" y="60" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">Colpetty</text>
                    {/* Driver position (animated) */}
                    <circle cx="260" cy="200" r="8" fill="#22C55E" opacity="0.3">
                      <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="260" cy="200" r="6" fill="#22C55E" stroke="white" strokeWidth="2" />
                  </svg>
                  {/* Driver info overlay */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#22C55E] flex items-center justify-center">
                        <NavigationIcon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-sm">En Route</span>
                        <span className="text-slate-300 text-xs">PEL-R04 • Van</span>
                      </div>
                    </div>
                    <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2.5 text-right">
                      <span className="text-[#22C55E] font-bold text-lg block leading-tight">13 min</span>
                      <span className="text-slate-300 text-xs">7.2 km remaining</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Turn-by-turn directions */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1] flex flex-col gap-4">
                <span className="text-[#22C55E] font-bold text-xs uppercase tracking-wider">
                  TURN-BY-TURN DIRECTIONS
                </span>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 bg-[#ECFDF5] p-3 rounded-xl border border-green-200">
                    <div className="w-8 h-8 rounded-full bg-[#22C55E] text-white flex items-center justify-center shrink-0">
                      <NavigationIcon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[#202D2D] font-bold text-sm">Head southwest on Baseline Rd</span>
                      <span className="text-[#485563] text-xs">2.1 km • 4 min</span>
                    </div>
                    <span className="text-[#22C55E] font-bold text-xs bg-green-50 px-2 py-1 rounded-md border border-green-200">NOW</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F9FAFB] border border-[#F1F5F9]">
                    <div className="w-8 h-8 rounded-full bg-[#F1F5F9] text-[#485563] flex items-center justify-center shrink-0">
                      <ArrowLeftIcon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[#202D2D] font-semibold text-sm">Turn left onto Galle Rd</span>
                      <span className="text-[#485563] text-xs">3.8 km • 6 min</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F9FAFB] border border-[#F1F5F9]">
                    <div className="w-8 h-8 rounded-full bg-[#F97316] text-white flex items-center justify-center shrink-0">
                      <CheckIcon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[#202D2D] font-semibold text-sm">Arrive at Colpetty Retailer Dock</span>
                      <span className="text-[#485563] text-xs">Galle Road, Colombo 03</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Route info & Confirm */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <span className="text-[#22C55E] font-bold text-xs uppercase tracking-wider">
                  LIVE NAVIGATION ROUTE
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-[#000000] font-bold text-lg">Drive</span>
                  <span className="text-[#22C55E] font-bold text-lg">13 min (7.2 km)</span>
                </div>
                <p className="text-[#000000] font-semibold text-sm">
                  Fastest route, the usual traffic
                </p>
                <div className="flex flex-col gap-2 mt-2 bg-[#F9FAFB] p-4 rounded-xl border border-[#F1F5F9]">
                  <div className="flex justify-between">
                    <span className="text-[#485563] font-semibold text-xs">FROM</span>
                    <span className="text-[#202D2D] font-bold text-sm">Depot — PEL-R04</span>
                  </div>
                  <div className="w-full h-px bg-[#E2E8F0]" />
                  <div className="flex justify-between">
                    <span className="text-[#485563] font-semibold text-xs">TO</span>
                    <span className="text-[#202D2D] font-bold text-sm">Colpetty Retailer Dock</span>
                  </div>
                  <div className="w-full h-px bg-[#E2E8F0]" />
                  <div className="flex justify-between">
                    <span className="text-[#485563] font-semibold text-xs">ETA</span>
                    <span className="text-[#22C55E] font-bold text-sm">05:13 AM</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOrderConfirmed(!orderConfirmed)}
                className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-sm flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors text-left"
              >
                <div
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                    orderConfirmed
                      ? "bg-[#22C55E] border-[#22C55E] text-white"
                      : "border-[#CBD5E1]"
                  }`}
                >
                  {orderConfirmed && <span className="font-bold text-xs">✓</span>}
                </div>
                <span className="text-[#000000]/70 font-bold text-base">
                  Confirm complete order
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* ── DESKTOP DEFAULT STOP DETAILS ── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1] flex flex-col gap-4">
                <div className="border-b border-[#CBD5E1] pb-3">
                  <span className="text-[#22C55E] font-bold text-xs uppercase tracking-wider">
                    OUTLET DETAILS
                  </span>
                  <h2 className="text-[#202D2D] font-extrabold text-xl mt-0.5">
                    OUT001 / Colpetty Retailer
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1 bg-[#F9FAFB] p-3.5 rounded-xl border border-[#F1F5F9]">
                    <span className="text-[#485563] font-semibold text-[11px] uppercase tracking-wider">
                      DELIVERY WINDOW
                    </span>
                    <span className="text-[#202D2D] font-bold text-sm">05:00 - 07:30</span>
                  </div>
                  <div className="flex flex-col gap-1 bg-[#F9FAFB] p-3.5 rounded-xl border border-[#F1F5F9]">
                    <span className="text-[#485563] font-semibold text-[11px] uppercase tracking-wider">
                      ACCESS
                    </span>
                    <span className="text-[#202D2D] font-bold text-sm">Street Dock</span>
                  </div>
                  <div className="flex flex-col gap-1 bg-[#F9FAFB] p-3.5 rounded-xl border border-[#F1F5F9]">
                    <span className="text-[#485563] font-semibold text-[11px] uppercase tracking-wider">
                      VEHICLE RESTRICTION
                    </span>
                    <span className="text-[#202D2D] font-bold text-sm">Van-only access</span>
                  </div>
                  <div className="flex flex-col gap-1 bg-[#F9FAFB] p-3.5 rounded-xl border border-[#F1F5F9]">
                    <span className="text-[#485563] font-semibold text-[11px] uppercase tracking-wider">
                      UNLOADING
                    </span>
                    <span className="text-[#202D2D] font-bold text-sm">Manual unload at street level</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#FFF4ED] border border-[#F59E0B] rounded-xl p-5 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#F59E0B]/10 flex items-center justify-center shrink-0">
                  <AlertTriangleIcon className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div className="flex flex-col gap-1 text-xs sm:text-sm">
                  <h3 className="text-[#F59E0B] font-bold text-sm">
                    ⚠ Known Shortfall Notification
                  </h3>
                  <p className="text-[#D97706] font-medium">
                    Loading shortfall reported on order S1-001 at OUT001 / Colpetty Retailer.
                  </p>
                  <p className="text-[#D97706] font-medium">
                    8 damaged units were replaced before departure. Replacement verified.
                  </p>
                  <p className="text-[#D97706] font-bold mt-1">Store Manager has been notified.</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1] flex flex-col gap-2">
                <span className="text-[#22C55E] font-bold text-xs uppercase tracking-wider">
                  ACKNOWLEDGED PLAN CHANGES
                </span>
                <p className="text-[#485563] font-medium text-sm leading-relaxed">
                  Plan v2: 8 units of S1-001 replaced due to loading shortfall. Original 80 units → replacement stock loaded. Quantity verified by loader.
                </p>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1] flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[#22C55E] font-bold text-xs uppercase tracking-wider">
                    EXPECTED ORDERS (2)
                  </span>
                  <span className="text-[#485563] font-semibold text-xs">
                    2 orders for 1 outlet visit
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between bg-[#F9FAFB] p-4 rounded-xl border border-[#F1F5F9]">
                    <div className="flex flex-col gap-1">
                      <span className="text-[#202D2D] font-bold text-base">S1-000</span>
                      <span className="text-[#485563] font-medium text-xs">12 ambient units</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[#202D2D] font-bold text-base">97.8 kg</span>
                      <span className="text-[#485563] font-semibold text-xs">0.500 m³</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-[#F9FAFB] p-4 rounded-xl border border-[#F1F5F9]">
                    <div className="flex items-center gap-3">
                      <AlertTriangleIcon className="w-5 h-5 text-[#F59E0B] shrink-0" />
                      <div className="flex flex-col gap-1">
                        <span className="text-[#202D2D] font-bold text-base">S1-001</span>
                        <span className="text-[#485563] font-medium text-xs">80 chilled units</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[#202D2D] font-bold text-base">448.6 kg</span>
                      <span className="text-[#485563] font-semibold text-xs">2.445 m³</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1] flex flex-col gap-3">
                <span className="text-[#22C55E] font-bold text-xs uppercase tracking-wider">
                  MAP - DESTINATION
                </span>
                <div className="relative w-full h-48 bg-slate-800 rounded-xl overflow-hidden flex flex-col items-center justify-center p-4 text-center">
                  <div
                    className="absolute inset-0 opacity-30 bg-cover bg-center"
                    style={{
                      backgroundImage:
                        "radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#38bdf8 1px, #0f172a 1px)",
                      backgroundSize: "20px 20px",
                      backgroundPosition: "0 0, 10px 10px",
                    }}
                  />
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[#F97316] text-white flex items-center justify-center shadow-lg animate-bounce">
                      <NavigationIcon className="w-5 h-5" />
                    </div>
                    <span className="text-white font-bold text-sm">Colpetty Retailer Dock</span>
                    <span className="text-slate-300 text-xs">Galle Road, Colombo 03</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          MOBILE layout  (< md) — Figma exact canvas
          ══════════════════════════════════════════ */}
      <div className="md:hidden flex items-start justify-center min-h-full bg-[#E2E8F0] py-4">
        <MobileCurrentStopCanvas
          deliveryStarted={deliveryStarted}
          completingDelivery={completingDelivery}
          stopRecorded={stopRecorded}
          deliveryOutcome={deliveryOutcome}
          onSelectOutcome={(o) => setDeliveryOutcome(o)}
          photoFile={photoFile}
          onSelectPhoto={() => photoInputRef.current?.click()}
          onRemovePhoto={() => setPhotoFile(null)}
          signatureFile={signatureFile}
          onSelectSignature={() => signatureInputRef.current?.click()}
          onRemoveSignature={() => setSignatureFile(null)}
          orderConfirmed={orderConfirmed}
          onToggleOrderConfirmed={() => setOrderConfirmed(!orderConfirmed)}
          isSyncing={isSyncing}
          isSynced={isSynced}
          confirmedTimeStr={confirmedTimeStr}
          onRetrySync={handleRetrySync}
          onReviewChanges={() => setShowReviewModal(true)}
          onPrimaryAction={handlePrimaryAction}
        />
      </div>

      {/* Plan Conflict Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-[#CBD5E1] animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon className="w-5 h-5 text-[#F59E0B]" />
                <h3 className="text-[#202D2D] font-bold text-lg m-0">Plan Conflict Review</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] text-[#485563] flex items-center justify-center border-none cursor-pointer hover:bg-[#E2E8F0]"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[#485563] font-medium text-sm m-0 leading-relaxed">
              A plan change occurred while you were delivering. Original 80 units of <span className="font-bold text-[#202D2D]">S1-001</span> were adjusted with 8 replacement units before departure.
            </p>
            <div className="bg-[#FFF4ED] border border-[#F59E0B] rounded-xl p-3 text-xs text-[#485563] font-medium">
              <span className="font-bold text-[#F59E0B] block mb-1">✓ Plan Version v2 Confirmed</span>
              Loader verified replacement stock. Customer notification dispatched.
            </div>
            <button
              type="button"
              onClick={() => setShowReviewModal(false)}
              className="w-full py-3 bg-[#F97316] hover:bg-[#ea6c0a] text-white font-bold text-sm rounded-xl cursor-pointer border-none shadow-md"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Mobile Canvas Component ─── */
function MobileCurrentStopCanvas({
  deliveryStarted,
  completingDelivery,
  stopRecorded,
  deliveryOutcome,
  onSelectOutcome,
  photoFile,
  onSelectPhoto,
  onRemovePhoto,
  signatureFile,
  onSelectSignature,
  onRemoveSignature,
  orderConfirmed,
  onToggleOrderConfirmed,
  isSyncing,
  isSynced,
  confirmedTimeStr = "10:42 AM",
  onRetrySync,
  onReviewChanges,
  onPrimaryAction,
}: {
  deliveryStarted: boolean;
  completingDelivery: boolean;
  stopRecorded: boolean;
  deliveryOutcome: "full" | "discrepancy" | "none";
  onSelectOutcome: (o: "full" | "discrepancy" | "none") => void;
  photoFile: { name: string; url: string } | null;
  onSelectPhoto: () => void;
  onRemovePhoto: () => void;
  signatureFile: { name: string; url: string } | null;
  onSelectSignature: () => void;
  onRemoveSignature: () => void;
  orderConfirmed: boolean;
  onToggleOrderConfirmed: () => void;
  isSyncing: boolean;
  isSynced: boolean;
  confirmedTimeStr?: string;
  onRetrySync: () => void;
  onReviewChanges: () => void;
  onPrimaryAction: () => void;
}) {
  const canvasHeight = stopRecorded ? 1110 : completingDelivery ? 1010 : deliveryStarted ? 917 : 1395;

  return (
    <div
      id="current-stop-mobile-canvas"
      className="relative bg-white overflow-hidden shadow-2xl transition-all duration-300"
      style={{
        width: 390,
        height: canvasHeight,
        fontFamily: "'Poppins', sans-serif",
        flexShrink: 0,
      }}
    >
      {/* ── 1. screen-header (top: 0, height: 60/55) ── */}
      <header
        id="screen-header"
        className="absolute left-0 top-0 flex flex-row justify-between items-center bg-[#202D2D]"
        style={{
          width: 390,
          height: stopRecorded ? 55 : 60,
          padding: "14px 16px",
          boxSizing: "border-box",
        }}
      >
        <div className="flex flex-row items-center" style={{ gap: 8 }}>
          {!stopRecorded && (
            <Link
              href="/driver/today-run"
              className="flex items-center justify-center rounded-md hover:bg-white/10"
              style={{ width: 32, height: 32, padding: 6, boxSizing: "border-box" }}
              aria-label="Back to Today Run"
            >
              <ArrowLeftIcon className="w-[20px] h-[20px] text-white" />
            </Link>
          )}
          <span className="text-white font-bold" style={{ fontSize: 18, lineHeight: "27px" }}>
            {stopRecorded
              ? "Stop Recorded"
              : completingDelivery
              ? "Complete Delivery"
              : deliveryStarted
              ? "Start Delivery"
              : "Stop 1 of 4"}
          </span>
        </div>

        {!stopRecorded && (
          <div
            id="connectivity-pill"
            className="flex flex-row items-center bg-white border border-[#CBD5E1] rounded-full"
            style={{ width: 67, height: 25, padding: "4px 8px", gap: 6, boxSizing: "border-box" }}
          >
            <span className="rounded-full bg-[#22C55E]" style={{ width: 8, height: 8 }} />
            <span className="text-[#22C55E] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
              Online
            </span>
          </div>
        )}
      </header>

      {/* ── MODE 4: STOP RECORDED / DELIVERY RECORDED SUCCESS SCREEN (stopRecorded === true) ── */}
      {stopRecorded ? (
        <div className="flex flex-col items-start w-[390px] mx-auto bg-[#F8FAFC]" style={{ marginTop: 55 }}>
          {/* Main content frame (padding 20px, gap 20px, width 390px) */}
          <div
            className="flex flex-col items-center bg-[#F8FAFC] box-sizing-border"
            style={{ width: 390, padding: 20, gap: 20 }}
          >
            {/* success-circle */}
            <div
              id="success-circle"
              className="flex flex-col justify-center items-center bg-[#ECFDF5] border-2 border-[#22C55E] rounded-[36px] shrink-0"
              style={{ width: 72, height: 72, boxSizing: "border-box" }}
            >
              <CheckIcon className="w-[32px] h-[32px] text-[#22C55E]" />
            </div>

            {/* Frame: Headline (gap: 4px, width: 209px) */}
            <div className="flex flex-col items-center gap-[4px] shrink-0 text-center" style={{ width: 209, height: 58 }}>
              <span className="text-[#202D2D] font-extrabold" style={{ fontSize: 22, lineHeight: "33px", width: 209, height: 33 }}>
                Delivery Recorded
              </span>
              <span className="text-[#485563] font-medium" style={{ fontSize: 14, lineHeight: "21px", width: 184, height: 21 }}>
                OUT001 / Colpetty Retailer
              </span>
            </div>

            {/* Frame: Device Storage Notice Card (width 350px, height 108px, padding 14px, gap 10px, border 1px solid #CBD5E1, bg #FFFFFF, rounded 12px) */}
            <div
              className="flex flex-col items-center bg-white border border-[#CBD5E1] rounded-[12px] shrink-0"
              style={{ width: 350, height: 108, padding: 14, gap: 10, boxSizing: "border-box" }}
            >
              <div
                className="flex flex-row items-center bg-[#F9FAFB] rounded-[100px] shrink-0"
                style={{ width: 169, height: 30, padding: "6px 10px", gap: 8, boxSizing: "border-box" }}
              >
                <SmartphoneIcon className="w-[14px] h-[14px] text-[#485563]" />
                <span className="text-[#485563] font-bold" style={{ fontSize: 12, lineHeight: "18px", width: 127, height: 18 }}>
                  Saved on this device
                </span>
              </div>
              <p
                className="text-[#485563] font-medium text-center m-0"
                style={{ fontSize: 13, lineHeight: "20px", width: 322, height: 40 }}
              >
                Data is secured offline. Will sync when connection returns.
              </p>
            </div>

            {/* Frame: CLOUD NETWORK SYNC STATUS Card (width 350px, padding 14px, gap 12px, border 1px solid #CBD5E1, bg #FFFFFF, rounded 12px) */}
            <div
              className="flex flex-col items-start bg-white border border-[#CBD5E1] rounded-[12px] shrink-0"
              style={{ width: 350, padding: 14, gap: 12, boxSizing: "border-box" }}
            >
              <span className="text-[#485563] font-bold uppercase" style={{ fontSize: 12, lineHeight: "18px", width: 190, height: 18 }}>
                CLOUD NETWORK SYNC STATUS
              </span>

              <div className="flex flex-col items-start gap-[12px]" style={{ width: 322 }}>
                {/* Item 1: Saved on device */}
                <div className="flex flex-row items-start gap-[12px]" style={{ width: 322 }}>
                  <CheckCircleIcon className="w-[24px] h-[24px] text-[#22C55E] shrink-0" />
                  <div className="flex flex-col items-start gap-[4px]" style={{ width: 286 }}>
                    <span className="text-[#202D2D] font-bold" style={{ fontSize: 14, lineHeight: "21px", width: 118 }}>
                      Saved on device
                    </span>
                    <span className="text-[#485563] font-medium" style={{ fontSize: 13, lineHeight: "20px", width: 286 }}>
                      Record DEL-S1-T001-001 secured locally.
                    </span>
                    <span className="text-[#485563] font-medium" style={{ fontSize: 13, lineHeight: "20px", width: 286 }}>
                      Data is saved. Will sync when connection returns.
                    </span>
                  </div>
                </div>

                {/* Item 2: Syncing... */}
                <div className="flex flex-row items-start gap-[12px]" style={{ width: 322 }}>
                  <RefreshCwIcon className={`w-[24px] h-[24px] text-[#22C55E] shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                  <div className="flex flex-col items-start gap-[4px]" style={{ width: 286 }}>
                    <span className="text-[#22C55E] font-bold" style={{ fontSize: 14, lineHeight: "21px", width: 71 }}>
                      {isSyncing ? "Syncing..." : "Syncing..."}
                    </span>
                    <span className="text-[#485563] font-medium" style={{ fontSize: 13, lineHeight: "20px", width: 286 }}>
                      Transmitting delivery record to cloud...
                    </span>
                  </div>
                </div>

                {/* Item 3: Synced successfully */}
                <div className="flex flex-row items-start gap-[12px]" style={{ width: 322 }}>
                  <div className="flex flex-col justify-center items-center shrink-0" style={{ width: 24, height: 24 }}>
                    {isSynced ? (
                      <CheckCircleIcon className="w-[24px] h-[24px] text-[#22C55E]" />
                    ) : (
                      <InactiveDotIcon className="w-[24px] h-[24px]" />
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-[4px]" style={{ width: 286 }}>
                    <span className={`font-bold ${isSynced ? 'text-[#22C55E]' : 'text-[#485563]'}`} style={{ fontSize: 14, lineHeight: "21px", width: 147 }}>
                      Synced successfully
                    </span>
                    <span className="text-[#485563] font-medium" style={{ fontSize: 13, lineHeight: "20px", width: 286 }}>
                      {isSynced ? `Confirmed at ${confirmedTimeStr}` : "Confirmed timestamp will appear here."}
                    </span>
                  </div>
                </div>

                {/* Item 4: Sync failed - retry available */}
                <div className="flex flex-row items-start gap-[12px]" style={{ width: 322 }}>
                  <div className="flex flex-col justify-center items-center shrink-0" style={{ width: 24, height: 24 }}>
                    <InactiveDotIcon className="w-[24px] h-[24px]" />
                  </div>
                  <div className="flex flex-col items-start gap-[4px]" style={{ width: 286 }}>
                    <span className="text-[#485563] font-bold" style={{ fontSize: 14, lineHeight: "21px", width: 200 }}>
                      Sync failed - retry available
                    </span>
                    <span className="text-[#485563] font-medium" style={{ fontSize: 13, lineHeight: "20px", width: 286 }}>
                      Delivery record preserved. Tap Retry to attempt sync again.
                    </span>
                    <button
                      id="button-Retry"
                      type="button"
                      onClick={onRetrySync}
                      className="flex flex-row justify-center items-center bg-[#F97316] hover:bg-[#ea6c0a] active:scale-[0.98] rounded-[12px] border-none cursor-pointer transition-all duration-200"
                      style={{ width: 286, height: 44, padding: "0 16px", gap: 8, boxSizing: "border-box" }}
                    >
                      <span className="text-white font-bold" style={{ fontSize: 14, lineHeight: "21px" }}>
                        {isSyncing ? "Retrying..." : "Retry"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Item 5: Plan conflict - review required */}
                <div className="flex flex-row items-start gap-[12px]" style={{ width: 322 }}>
                  <div className="flex flex-col justify-center items-center shrink-0" style={{ width: 24, height: 24 }}>
                    <InactiveDotIcon className="w-[24px] h-[24px]" />
                  </div>
                  <div className="flex flex-col items-start gap-[4px]" style={{ width: 286 }}>
                    <span className="text-[#485563] font-bold" style={{ fontSize: 14, lineHeight: "21px", width: 217 }}>
                      Plan conflict - review required
                    </span>
                    <span className="text-[#485563] font-medium" style={{ fontSize: 13, lineHeight: "20px", width: 286 }}>
                      A plan change occurred while you were delivering. Review changes before proceeding.
                    </span>
                    <button
                      id="button-Review-Changes"
                      type="button"
                      onClick={onReviewChanges}
                      className="flex flex-row justify-center items-center bg-[#F97316] hover:bg-[#ea6c0a] active:scale-[0.98] rounded-[12px] border-none cursor-pointer transition-all duration-200"
                      style={{ width: 286, height: 44, padding: "0 16px", gap: 8, boxSizing: "border-box" }}
                    >
                      <span className="text-white font-bold" style={{ fontSize: 14, lineHeight: "21px" }}>
                        Review Changes
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Frame: Proceed to Next Stop Button Frame (width 350px, height 64px, padding 16px 0 0) */}
            <div
              className="flex flex-col items-start shrink-0"
              style={{ width: 350, height: 64, padding: "16px 0px 0px", boxSizing: "border-box" }}
            >
              <button
                id="btn-proceed-next-stop"
                type="button"
                onClick={onPrimaryAction}
                className="flex flex-row justify-center items-center bg-[#F97316] hover:bg-[#ea6c0a] active:scale-[0.98] rounded-[12px] border-none cursor-pointer transition-all duration-200 shadow-md"
                style={{ width: 350, height: 48, padding: "0 16px", gap: 8, boxSizing: "border-box" }}
              >
                <ArrowRightIcon className="w-[18px] h-[18px] text-white" />
                <span className="text-white font-bold" style={{ fontSize: 15, lineHeight: "22px" }}>
                  Proceed to Next Stop
                </span>
              </button>
            </div>
          </div>

          {/* bottom-nav (width 390px, height 77px, border-top 1px solid #CBD5E1, bg #FFFFFF) */}
          <nav
            id="bottom-nav-canvas"
            aria-label="Driver navigation"
            className="flex flex-col items-start bg-white border-t border-[#CBD5E1] shrink-0"
            style={{ width: 390, height: 77, boxSizing: "border-box" }}
          >
            <div
              className="flex flex-row justify-between items-center"
              style={{ width: 390, height: 64, padding: "0 12px", boxSizing: "border-box" }}
            >
              <Link
                id="tab-my-run"
                href="/driver/today-run"
                className="flex flex-col justify-center items-center border-none bg-transparent cursor-pointer no-underline"
                style={{ width: 100, height: 52, gap: 4 }}
              >
                <RouteIcon className="w-[22px] h-[22px] text-[#485563]" />
                <span className="text-[#485563] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
                  My Run
                </span>
              </Link>

              <div
                id="tab-current-stop"
                className="flex flex-col justify-center items-center"
                style={{ width: 100, height: 50, gap: 4 }}
              >
                <NavigationIcon className="w-[22px] h-[22px] text-[#202D2D]" />
                <span className="text-[#202D2D] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
                  Current Stop
                </span>
                <span
                  className="block bg-[#1D4ED8]"
                  style={{ width: 64, height: 3, borderRadius: 1.5 }}
                />
              </div>

              <Link
                id="tab-report"
                href="/driver/report"
                className="flex flex-col justify-center items-center border-none bg-transparent cursor-pointer no-underline"
                style={{ width: 100, height: 52, gap: 4 }}
              >
                <AlertTriangleIcon className="w-[22px] h-[22px] text-[#485563]" />
                <span className="text-[#485563] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
                  Report
                </span>
              </Link>
            </div>

            <div
              id="home-indicator"
              className="flex flex-row justify-center items-flex-start"
              style={{ width: 390, height: 13, padding: "0 0 8px", boxSizing: "border-box" }}
            >
              <div
                className="bg-[#202D2D] rounded-[100px]"
                style={{ width: 134, height: 5 }}
              />
            </div>
          </nav>
        </div>
      ) : completingDelivery ? (
        /* ── MODE 3: PROOF OF DELIVERY / COMPLETE DELIVERY SCREEN ── */
        <>
          <div
            className="absolute flex flex-col items-start"
            style={{ top: 81, left: 16, width: 380, height: 52, gap: 4 }}
          >
            <span className="text-[#485563] font-bold" style={{ fontSize: 12, lineHeight: "18px" }}>
              CURRENT STOP
            </span>
            <span className="text-[#202D2D] font-extrabold" style={{ fontSize: 20, lineHeight: "30px", width: 380 }}>
              OUT001 / Colpetty Retailer
            </span>
          </div>

          <div
            className="absolute flex flex-col items-start"
            style={{ top: 154, left: 19, width: 377, height: 224, gap: 8 }}
          >
            <span className="text-[#485563] font-bold" style={{ fontSize: 13, lineHeight: "20px" }}>
              DELIVERY OUTCOME
            </span>

            <div className="flex flex-col items-start" style={{ width: 377, height: 196, gap: 8 }}>
              <button
                type="button"
                onClick={() => onSelectOutcome("full")}
                className="flex flex-row justify-between items-center rounded-[12px] cursor-pointer transition-all border-none text-left"
                style={{
                  width: 377,
                  height: 60,
                  padding: 14,
                  boxSizing: "border-box",
                  background: deliveryOutcome === "full" ? "rgba(34, 197, 94, 0.06)" : "#FFFFFF",
                  border: deliveryOutcome === "full" ? "2px solid #CBD5E1" : "2px solid #CBD5E1",
                }}
              >
                <div className="flex flex-row items-center" style={{ width: 156, height: 23, gap: 12 }}>
                  <div
                    className="flex flex-row justify-center items-center bg-[#22C55E] rounded-full"
                    style={{ width: 22, height: 22 }}
                  >
                    <CheckIcon className="w-[14px] h-[14px] text-white" />
                  </div>
                  <span className="text-[#202D2D] font-bold" style={{ fontSize: 15, lineHeight: "22px" }}>
                    Delivered in Full
                  </span>
                </div>
                <div
                  className="box-border rounded-full"
                  style={{
                    width: 18,
                    height: 18,
                    background: deliveryOutcome === "full" ? "#22C55E" : "#FFFFFF",
                    border: deliveryOutcome === "full" ? "2px solid #22C55E" : "2px solid #CBD5E1",
                  }}
                />
              </button>

              <button
                type="button"
                onClick={() => onSelectOutcome("discrepancy")}
                className="flex flex-row justify-between items-center rounded-[12px] cursor-pointer transition-all border-none text-left"
                style={{
                  width: 377,
                  height: 60,
                  padding: 14,
                  boxSizing: "border-box",
                  background: deliveryOutcome === "discrepancy" ? "rgba(249, 115, 22, 0.06)" : "#FFFFFF",
                  border: deliveryOutcome === "discrepancy" ? "1px solid #F97316" : "1px solid #CBD5E1",
                }}
              >
                <div className="flex flex-row items-center" style={{ width: 244, height: 24, gap: 12 }}>
                  <div
                    className="flex flex-row justify-center items-center bg-[#FFF4ED] rounded-full"
                    style={{ width: 24, height: 24 }}
                  >
                    <AlertTriangleIcon className="w-[14px] h-[14px] text-[#F59E0B]" />
                  </div>
                  <span className="text-[#202D2D] font-semibold" style={{ fontSize: 15, lineHeight: "22px" }}>
                    Delivered with Discrepancy
                  </span>
                </div>
                <div
                  className="box-border rounded-full"
                  style={{
                    width: 18,
                    height: 18,
                    background: deliveryOutcome === "discrepancy" ? "#F97316" : "#FFFFFF",
                    border: deliveryOutcome === "discrepancy" ? "2px solid #F97316" : "2px solid #CBD5E1",
                  }}
                />
              </button>

              <button
                type="button"
                onClick={() => onSelectOutcome("none")}
                className="flex flex-row justify-between items-center rounded-[12px] cursor-pointer transition-all border-none text-left"
                style={{
                  width: 377,
                  height: 60,
                  padding: 14,
                  boxSizing: "border-box",
                  background: deliveryOutcome === "none" ? "rgba(239, 68, 68, 0.06)" : "#FFFFFF",
                  border: deliveryOutcome === "none" ? "1px solid #EF4444" : "1px solid #CBD5E1",
                }}
              >
                <div className="flex flex-row items-center" style={{ width: 139, height: 24, gap: 12 }}>
                  <div
                    className="flex flex-row justify-center items-center bg-[#FEF2F2] rounded-full"
                    style={{ width: 24, height: 24 }}
                  >
                    <XIcon className="w-[14px] h-[14px] text-[#EF4444]" />
                  </div>
                  <span className="text-[#202D2D] font-semibold" style={{ fontSize: 15, lineHeight: "22px" }}>
                    Not Delivered
                  </span>
                </div>
                <div
                  className="box-border rounded-full"
                  style={{
                    width: 18,
                    height: 18,
                    background: deliveryOutcome === "none" ? "#EF4444" : "#FFFFFF",
                    border: deliveryOutcome === "none" ? "2px solid #EF4444" : "2px solid #CBD5E1",
                  }}
                />
              </button>
            </div>
          </div>

          <div
            className="absolute flex flex-col items-start"
            style={{ top: 401, left: 23, width: 373, height: 106, gap: 8 }}
          >
            <span className="text-[#485563] font-bold" style={{ fontSize: 13, lineHeight: "20px" }}>
              DELIVERY RECORD
            </span>

            <div
              className="flex flex-col items-start bg-white border border-[#CBD5E1] rounded-[12px]"
              style={{ width: 373, height: 78, padding: 14, gap: 6, boxSizing: "border-box" }}
            >
              <span className="text-[#485563] font-semibold" style={{ fontSize: 13, lineHeight: "20px" }}>
                Delivery record ID
              </span>
              <span className="text-[#202D2D] font-bold" style={{ fontSize: 16, lineHeight: "24px" }}>
                DEL-S1-T001-001
              </span>
            </div>
          </div>

          <div
            className="absolute flex flex-col items-start"
            style={{ top: 528, left: 29, width: 367, height: 216, gap: 8 }}
          >
            <span className="text-[#485563] font-bold" style={{ fontSize: 13, lineHeight: "20px" }}>
              PROOF OF DELIVERY
            </span>

            <span className="text-[#485563] font-medium" style={{ fontSize: 12, lineHeight: "18px", width: 367 }}>
              Photo of delivered goods or recipient signature required
            </span>

            <span className="text-[#485563] font-medium" style={{ fontSize: 12, lineHeight: "18px", width: 367 }}>
              Prototype assumption: Photo or signature capture is simulated for demonstration. No confirmation code is supplied dataset data.
            </span>

            <div className="flex flex-row items-start" style={{ width: 367, height: 100, gap: 12 }}>
              {/* Photo Upload / Preview */}
              {photoFile ? (
                <div
                  className="flex flex-col justify-center items-center rounded-[12px] border border-green-400 bg-green-50 text-center"
                  style={{ width: 177.5, height: 100, padding: 8, gap: 4, boxSizing: "border-box" }}
                >
                  <img src={photoFile.url} alt="Photo" className="w-10 h-10 rounded object-cover border border-green-300" />
                  <span className="text-[11px] font-bold text-green-800 truncate" style={{ maxWidth: 160 }}>
                    {photoFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={onRemovePhoto}
                    className="text-[10px] font-bold text-red-600 bg-white border border-red-200 rounded px-1.5 py-0.5 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onSelectPhoto}
                  className="flex flex-col justify-center items-center rounded-[12px] border border-[#CBD5E1] bg-white text-[#485563] cursor-pointer transition-colors"
                  style={{ width: 177.5, height: 100, padding: 14, gap: 6, boxSizing: "border-box" }}
                >
                  <CameraIcon className="w-[24px] h-[24px]" />
                  <span className="font-semibold text-center" style={{ fontSize: 12, lineHeight: "16px" }}>
                    Take Photo (Upload File)
                  </span>
                </button>
              )}

              {/* Signature Upload / Preview */}
              {signatureFile ? (
                <div
                  className="flex flex-col justify-center items-center rounded-[12px] border border-green-400 bg-green-50 text-center"
                  style={{ width: 177.5, height: 100, padding: 8, gap: 4, boxSizing: "border-box" }}
                >
                  <img src={signatureFile.url} alt="Signature" className="w-10 h-10 rounded object-cover border border-green-300" />
                  <span className="text-[11px] font-bold text-green-800 truncate" style={{ maxWidth: 160 }}>
                    {signatureFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={onRemoveSignature}
                    className="text-[10px] font-bold text-red-600 bg-white border border-red-200 rounded px-1.5 py-0.5 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onSelectSignature}
                  className="flex flex-col justify-center items-center rounded-[12px] border border-[#CBD5E1] bg-white text-[#485563] cursor-pointer transition-colors"
                  style={{ width: 177.5, height: 100, padding: 14, gap: 6, boxSizing: "border-box" }}
                >
                  <SignatureIcon className="w-[24px] h-[24px]" />
                  <span className="font-semibold text-center" style={{ fontSize: 12, lineHeight: "16px" }}>
                    Capture Signature (Upload File)
                  </span>
                </button>
              )}
            </div>
          </div>

          <div
            className="absolute flex flex-col items-start"
            style={{ top: 744, left: 12, width: 400, height: 170, padding: 16, gap: 16, boxSizing: "border-box" }}
          >
            <button
              id="btn-complete-stop"
              type="button"
              onClick={onPrimaryAction}
              className="flex flex-row justify-center items-center bg-[#F97316] hover:bg-[#ea6c0a] active:scale-[0.98] rounded-[12px] border-none cursor-pointer transition-all duration-200"
              style={{ width: 368, height: 52, padding: "0 16px", gap: 8, boxSizing: "border-box" }}
            >
              <CheckCircleIcon className="w-[18px] h-[18px] text-[#FFFFFF]" />
              <span className="text-[#FFFFFF] font-bold" style={{ fontSize: 15, lineHeight: "22px" }}>
                Complete Stop
              </span>
            </button>

            <span className="text-[#485563] font-medium" style={{ fontSize: 12, lineHeight: "18px", width: 368 }}>
              This will save the delivery record. You can save offline if needed.
            </span>

            <span className="text-[#485563] font-medium" style={{ fontSize: 12, lineHeight: "18px", width: 368 }}>
              Saves locally if offline. Syncs when connection is restored.
            </span>
          </div>

          <nav
            id="bottom-nav-canvas"
            aria-label="Driver navigation"
            className="absolute flex flex-row items-center"
            style={{ top: 927, left: 0, width: 412, height: 64, boxSizing: "border-box" }}
          >
            <Link
              id="tab-my-run"
              href="/driver/today-run"
              className="absolute flex flex-col justify-center items-center border-none bg-transparent cursor-pointer no-underline"
              style={{ top: 4, left: 0, width: 112, height: 43, gap: 4 }}
            >
              <RouteIcon className="w-[22px] h-[22px] text-[#202D2D]" />
              <span className="text-[#202D2D] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
                My Run
              </span>
            </Link>

            <div
              id="tab-current-stop"
              className="absolute flex flex-col justify-center items-center"
              style={{ top: 0, left: 149, width: 114, height: 52, gap: 4 }}
            >
              <NavigationIcon className="w-[22px] h-[22px] text-[#485563]" />
              <span className="text-[#485563] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
                Current Stop
              </span>
              <span
                className="block bg-[#1D4ED8]"
                style={{ width: 70, height: 3, borderRadius: 1.5 }}
              />
            </div>

            <Link
              id="tab-report"
              href="/driver/report"
              className="absolute flex flex-col justify-center items-center border-none bg-transparent cursor-pointer no-underline"
              style={{ top: 0, left: 300, width: 112, height: 52, gap: 4 }}
            >
              <AlertTriangleIcon className="w-[22px] h-[22px] text-[#485563]" />
              <span className="text-[#485563] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
                Report
              </span>
            </Link>
          </nav>

          <div
            aria-hidden="true"
            className="absolute bg-[#202D2D] rounded-full"
            style={{ width: 150, height: 5, left: 131, top: 1003 }}
          />
        </>
      ) : deliveryStarted ? (
        /* ── MODE 2: ACTIVE ROUTE DELIVERY VIEW ── */
        <>
          <h2
            className="absolute text-[#202D2D] font-bold truncate"
            style={{ top: 87, left: 19, width: 352, height: 30, fontSize: 20, lineHeight: "30px" }}
          >
            Stop 1: OUT001 / Colpetty Retailer
          </h2>

          <span
            className="absolute text-[#22C55E] font-bold"
            style={{ top: 125, left: 19, fontSize: 13, lineHeight: "20px" }}
          >
            Map - route
          </span>

          <div
            className="absolute rounded-xl overflow-hidden bg-[#0f172a] border border-slate-700 flex flex-col"
            style={{ top: 155, left: 16, width: 380, height: 415 }}
          >
            {/* Grid pattern background */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#38bdf8 1px, #0f172a 1px)",
                backgroundSize: "20px 20px",
                backgroundPosition: "0 0, 10px 10px",
              }}
            />

            {/* Simulated Road Network & Route Map SVG */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 380 415" fill="none">
              {/* Background Road Network */}
              <line x1="0" y1="120" x2="380" y2="120" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
              <line x1="0" y1="260" x2="380" y2="260" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
              <line x1="110" y1="0" x2="110" y2="415" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
              <line x1="270" y1="0" x2="270" y2="415" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
              <path d="M 0 350 L 380 350" stroke="#1e293b" strokeWidth="6" strokeDasharray="6 6" />

              {/* Road labels */}
              <text x="18" y="114" fill="#475569" fontSize="9" fontWeight="600">Dharmapala Mawatha</text>
              <text x="18" y="254" fill="#475569" fontSize="9" fontWeight="600">Galle Road</text>
              <text x="116" y="25" fill="#475569" fontSize="9" fontWeight="600">Duplication Rd</text>

              {/* Route Path Glow */}
              <path
                d="M 60 350 C 60 300, 110 260, 160 230 C 210 200, 240 160, 270 120 C 290 95, 305 85, 320 75"
                stroke="#22C55E"
                strokeWidth="10"
                strokeLinecap="round"
                opacity="0.2"
              />

              {/* Animated Route Path */}
              <path
                d="M 60 350 C 60 300, 110 260, 160 230 C 210 200, 240 160, 270 120 C 290 95, 305 85, 320 75"
                stroke="#22C55E"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="10 6"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.2s" repeatCount="indefinite" />
              </path>

              {/* Depot Marker */}
              <circle cx="60" cy="350" r="10" fill="#1D4ED8" stroke="#ffffff" strokeWidth="2.5" />
              <text x="60" y="375" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="700">Depot</text>

              {/* Waypoint */}
              <circle cx="160" cy="230" r="5" fill="#F59E0B" stroke="#ffffff" strokeWidth="2" />

              {/* Driver Live Marker with Pulsing Radar */}
              <circle cx="215" cy="195" r="14" fill="#22C55E" opacity="0.25">
                <animate attributeName="r" values="8;22;8" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0.05;0.4" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="215" cy="195" r="8" fill="#22C55E" stroke="#ffffff" strokeWidth="2.5" />
              {/* Van icon / pointer */}
              <polygon points="215,190 219,198 215,196 211,198" fill="#ffffff" />

              {/* Destination Marker - Colpetty Retailer */}
              <circle cx="320" cy="75" r="12" fill="#F97316" stroke="#ffffff" strokeWidth="3" />
              <text x="320" y="55" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700">Colpetty</text>
            </svg>

            {/* Top HUD Badge */}
            <div className="relative z-10 flex items-center justify-between p-3">
              <span className="bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-ping" />
                LIVE GPS ROUTE
              </span>
              <span className="text-slate-400 text-xs font-semibold bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                Stop 1 of 4
              </span>
            </div>

            {/* Bottom HUD Banner */}
            <div className="mt-auto relative z-10 p-3">
              <div className="bg-black/75 backdrop-blur-md rounded-xl p-3 border border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#22C55E] flex items-center justify-center shrink-0">
                    <NavigationIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white font-bold text-xs">PEL-R04 • En Route</span>
                    <span className="text-slate-400 text-[11px]">OUT001 / Colpetty Retailer</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[#22C55E] font-bold text-sm block">13 min</span>
                  <span className="text-slate-400 text-[10px]">7.2 km left</span>
                </div>
              </div>
            </div>
          </div>

          <div
            id="rectangle-2-route-details"
            className="absolute bg-white border border-[#CBD5E1] rounded-[12px]"
            style={{ top: 588, left: 16, width: 380, height: 83, boxSizing: "border-box" }}
          >
            <span
              className="absolute text-[#000000] font-bold"
              style={{ top: 6, left: 15, fontSize: 13, lineHeight: "20px" }}
            >
              Drive
            </span>
            <span
              className="absolute text-[#22C55E] font-bold"
              style={{ top: 31, left: 15, fontSize: 13, lineHeight: "20px" }}
            >
              13 min (7.2 km)
            </span>
            <span
              className="absolute text-[#000000] font-bold truncate"
              style={{ top: 51, left: 15, width: 330, fontSize: 13, lineHeight: "20px" }}
            >
              Fastest route, the usual traffic
            </span>
          </div>

          <button
            id="rectangle-1-confirm-complete"
            type="button"
            onClick={onToggleOrderConfirmed}
            className="absolute bg-white border border-[#CBD5E1] rounded-[12px] flex flex-row items-center cursor-pointer hover:bg-slate-50 transition-colors border-none p-0 text-left"
            style={{ top: 692, left: 16, width: 380, height: 39, boxSizing: "border-box" }}
          >
            <div
              className={`absolute rounded flex items-center justify-center border-[3px] transition-colors ${
                orderConfirmed ? "bg-[#22C55E] border-[#22C55E] text-white" : "border-[#CBD5E1]"
              }`}
              style={{ top: 9, left: 22, width: 20, height: 20, boxSizing: "border-box" }}
            >
              {orderConfirmed && <span className="text-[10px] font-bold">✓</span>}
            </div>
            <span
              className="absolute font-bold"
              style={{
                top: 9,
                left: 66,
                fontSize: 13,
                lineHeight: "20px",
                color: orderConfirmed ? "#202D2D" : "rgba(0, 0, 0, 0.59)",
              }}
            >
              Confirm complete order
            </span>
          </button>

          <div
            id="action-buttons-frame"
            className="absolute flex flex-col items-center"
            style={{ top: 750, left: 11, width: 390, height: 52 }}
          >
            <button
              id="btn-complete-delivery"
              type="button"
              onClick={onPrimaryAction}
              className="flex flex-row justify-center items-center bg-[#F97316] hover:bg-[#ea6c0a] active:scale-[0.98] rounded-[12px] border-none cursor-pointer transition-all duration-200"
              style={{ width: 390, height: 52, padding: "0 16px", gap: 8, boxSizing: "border-box" }}
            >
              <PlayIcon className="w-[18px] h-[18px] text-[#F9FAFB]" />
              <span className="text-[#F9FAFB] font-bold" style={{ fontSize: 15, lineHeight: "22px" }}>
                Complete Delivery
              </span>
            </button>
          </div>

          <nav
            id="bottom-nav-canvas"
            aria-label="Driver navigation"
            className="absolute flex flex-row items-center"
            style={{ top: 833, left: 0, width: 390, height: 64, boxSizing: "border-box" }}
          >
            <Link
              id="tab-my-run"
              href="/driver/today-run"
              className="absolute flex flex-col justify-center items-center border-none bg-transparent cursor-pointer no-underline"
              style={{ top: 4, left: 0, width: 112, height: 43, gap: 4 }}
            >
              <RouteIcon className="w-[22px] h-[22px] text-[#202D2D]" />
              <span className="text-[#202D2D] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
                My Run
              </span>
            </Link>

            <div
              id="tab-current-stop"
              className="absolute flex flex-col justify-center items-center"
              style={{ top: 0, left: 149, width: 114, height: 52, gap: 4 }}
            >
              <NavigationIcon className="w-[22px] h-[22px] text-[#485563]" />
              <span className="text-[#485563] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
                Current Stop
              </span>
              <span
                className="block bg-[#1D4ED8]"
                style={{ width: 70, height: 3, borderRadius: 1.5 }}
              />
            </div>

            <Link
              id="tab-report"
              href="/driver/report"
              className="absolute flex flex-col justify-center items-center border-none bg-transparent cursor-pointer no-underline"
              style={{ top: 0, left: 300, width: 112, height: 52, gap: 4 }}
            >
              <AlertTriangleIcon className="w-[22px] h-[22px] text-[#485563]" />
              <span className="text-[#485563] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
                Report
              </span>
            </Link>
          </nav>

          <div
            aria-hidden="true"
            className="absolute bg-[#202D2D] rounded-full"
            style={{ width: 150, height: 5, left: 131, top: 1003 }}
          />
        </>
      ) : (
        /* ── MODE 1: STOP DETAILS VIEW (default start) ── */
        <>
          <div
            id="outlet-header-frame"
            className="absolute flex flex-col items-start"
            style={{ top: 81, left: 16, width: 380, height: 52, gap: 4 }}
          >
            <span
              className="text-[#22C55E] font-bold"
              style={{ fontSize: 12, lineHeight: "18px", width: 104, height: 18 }}
            >
              OUTLET DETAILS
            </span>
            <span
              className="text-[#202D2D] font-extrabold"
              style={{ fontSize: 20, lineHeight: "30px", width: 380, height: 30 }}
            >
              OUT001 / Colpetty Retailer
            </span>
          </div>

          <div
            id="grid-2x2-outlet-metadata"
            className="absolute flex flex-col items-start"
            style={{ top: 154, left: 16, width: 380, height: 168, gap: 12 }}
          >
            <div className="flex flex-row items-center" style={{ width: 380, height: 78, gap: 12 }}>
              <div
                className="flex flex-col items-start bg-white border border-[#CBD5E1] rounded-[12px]"
                style={{ width: 184, height: 78, padding: 14, gap: 6, boxSizing: "border-box" }}
              >
                <span
                  className="text-[#485563] font-semibold uppercase tracking-wider"
                  style={{ fontSize: 11, lineHeight: "16px" }}
                >
                  DELIVERY WINDOW
                </span>
                <span
                  className="text-[#202D2D] font-bold"
                  style={{ fontSize: 14, lineHeight: "21px" }}
                >
                  05:00 - 07:30
                </span>
              </div>

              <div
                className="flex flex-col items-start bg-white border border-[#CBD5E1] rounded-[12px]"
                style={{ width: 184, height: 78, padding: 14, gap: 6, boxSizing: "border-box" }}
              >
                <span
                  className="text-[#485563] font-semibold uppercase tracking-wider"
                  style={{ fontSize: 11, lineHeight: "16px" }}
                >
                  ACCESS
                </span>
                <span
                  className="text-[#202D2D] font-bold"
                  style={{ fontSize: 14, lineHeight: "21px" }}
                >
                  Street Dock
                </span>
              </div>
            </div>

            <div className="flex flex-row items-center" style={{ width: 380, height: 78, gap: 12 }}>
              <div
                className="flex flex-col items-start bg-white border border-[#CBD5E1] rounded-[12px]"
                style={{ width: 184, height: 78, padding: 14, gap: 6, boxSizing: "border-box" }}
              >
                <span
                  className="text-[#485563] font-semibold uppercase tracking-wider"
                  style={{ fontSize: 11, lineHeight: "16px" }}
                >
                  VEHICLE RESTRICTION
                </span>
                <span
                  className="text-[#202D2D] font-bold"
                  style={{ fontSize: 14, lineHeight: "21px" }}
                >
                  Van-only access
                </span>
              </div>

              <div
                className="flex flex-col items-start bg-white border border-[#CBD5E1] rounded-[12px]"
                style={{ width: 184, height: 78, padding: 14, gap: 6, boxSizing: "border-box" }}
              >
                <span
                  className="text-[#485563] font-semibold uppercase tracking-wider"
                  style={{ fontSize: 11, lineHeight: "16px" }}
                >
                  UNLOADING
                </span>
                <span
                  className="text-[#202D2D] font-bold truncate"
                  style={{ fontSize: 14, lineHeight: "21px", width: 156 }}
                >
                  Manual unload at...
                </span>
              </div>
            </div>
          </div>

          <div
            id="alert-card-shortfall"
            className="absolute flex flex-row items-start bg-[#FFF4ED] border border-[#F59E0B] rounded-[12px]"
            style={{ top: 343, left: 16, width: 380, height: 162, padding: 14, gap: 12, boxSizing: "border-box" }}
          >
            <AlertTriangleIcon className="w-[20px] h-[20px] text-[#F59E0B] shrink-0 mt-0.5" />
            <div className="flex flex-col items-start" style={{ width: 308, height: 134, gap: 4 }}>
              <span
                className="text-[#F59E0B] font-bold"
                style={{ fontSize: 13, lineHeight: "20px", width: 200, height: 20 }}
              >
                ⚠ Known Shortfall Notification
              </span>
              <span
                className="text-[#485563] font-medium"
                style={{ fontSize: 12, lineHeight: "18px", width: 308, height: 36 }}
              >
                Loading shortfall reported on order S1-001 at OUT001 / Colpetty Retailer.
              </span>
              <span
                className="text-[#485563] font-medium"
                style={{ fontSize: 12, lineHeight: "18px", width: 308, height: 36 }}
              >
                8 damaged units were replaced before departure. Replacement verified.
              </span>
              <span
                className="text-[#485563] font-medium"
                style={{ fontSize: 12, lineHeight: "18px", width: 308, height: 18 }}
              >
                Store Manager has been notified.
              </span>
            </div>
          </div>

          <div
            id="plan-changes-card"
            className="absolute flex flex-col items-start bg-white border border-[#CBD5E1] rounded-[12px]"
            style={{ top: 526, left: 16, width: 380, height: 114, padding: 14, gap: 6, boxSizing: "border-box" }}
          >
            <span
              className="text-[#22C55E] font-bold"
              style={{ fontSize: 12, lineHeight: "18px", width: 191, height: 18 }}
            >
              ACKNOWLEDGED PLAN CHANGES
            </span>
            <span
              className="text-[#485563] font-medium"
              style={{ fontSize: 13, lineHeight: "20px", width: 352, height: 60 }}
            >
              Plan v2: 8 units of S1-001 replaced due to loading shortfall. Original 80 units → replacement stock loaded. Quantity verified by loader.
            </span>
          </div>

          <div
            id="expected-orders-frame"
            className="absolute flex flex-col items-start bg-white border border-[#CBD5E1] rounded-[12px]"
            style={{ top: 661, left: 16, width: 380, height: 218, padding: 14, gap: 10, boxSizing: "border-box" }}
          >
            <div className="flex flex-row justify-between items-center" style={{ width: 352, height: 18 }}>
              <span className="text-[#22C55E] font-bold" style={{ fontSize: 12, lineHeight: "18px" }}>
                EXPECTED ORDERS (2)
              </span>
              <span className="text-[#485563] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
                2 orders for 1 outlet visit
              </span>
            </div>

            <div
              className="flex flex-row justify-between items-center bg-[#F9FAFB] rounded-[10px]"
              style={{ width: 352, height: 72, padding: "12px 14px", boxSizing: "border-box" }}
            >
              <div className="flex flex-col items-start" style={{ gap: 2 }}>
                <span className="text-[#202D2D] font-bold" style={{ fontSize: 15, lineHeight: "22px" }}>
                  S1-000
                </span>
                <span className="text-[#485563] font-medium" style={{ fontSize: 12, lineHeight: "18px" }}>
                  12 ambient units
                </span>
              </div>
              <div className="flex flex-col items-end" style={{ gap: 2 }}>
                <span className="text-[#202D2D] font-bold" style={{ fontSize: 14, lineHeight: "21px" }}>
                  97.8 kg
                </span>
                <span className="text-[#485563] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
                  0.500 m³
                </span>
              </div>
            </div>

            <div
              className="flex flex-row justify-between items-center bg-[#F9FAFB] rounded-[10px]"
              style={{ width: 352, height: 72, padding: "12px 14px", boxSizing: "border-box" }}
            >
              <div className="flex flex-row items-center" style={{ gap: 10 }}>
                <AlertTriangleIcon className="w-[18px] h-[18px] text-[#F59E0B] shrink-0" />
                <div className="flex flex-col items-start" style={{ gap: 2 }}>
                  <span className="text-[#202D2D] font-bold" style={{ fontSize: 15, lineHeight: "22px" }}>
                    S1-001
                  </span>
                  <span className="text-[#485563] font-medium" style={{ fontSize: 12, lineHeight: "18px" }}>
                    80 chilled units
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end" style={{ gap: 2 }}>
                <span className="text-[#202D2D] font-bold" style={{ fontSize: 14, lineHeight: "21px" }}>
                  448.6 kg
                </span>
                <span className="text-[#485563] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
                  2.445 m³
                </span>
              </div>
            </div>
          </div>

          <div
            id="destination-map-card"
            className="absolute flex flex-col items-start bg-white border border-[#CBD5E1] rounded-[12px]"
            style={{ top: 900, left: 16, width: 380, height: 218, padding: 14, gap: 10, boxSizing: "border-box" }}
          >
            <span className="text-[#22C55E] font-bold" style={{ fontSize: 12, lineHeight: "18px" }}>
              MAP - DESTINATION
            </span>
            <div
              className="relative rounded-[10px] overflow-hidden bg-slate-900 flex flex-col items-center justify-center text-center"
              style={{ width: 352, height: 160 }}
            >
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#38bdf8 1px, #0f172a 1px)",
                  backgroundSize: "20px 20px",
                  backgroundPosition: "0 0, 10px 10px",
                }}
              />
              <div className="relative z-10 flex flex-col items-center gap-1.5 p-2">
                <div className="w-9 h-9 rounded-full bg-[#F97316] text-white flex items-center justify-center shadow animate-bounce">
                  <NavigationIcon className="w-4 h-4" />
                </div>
                <span className="text-white font-bold text-xs">Colpetty Retailer Dock</span>
                <span className="text-slate-300 text-[11px]">Galle Road, Colombo 03</span>
              </div>
            </div>
          </div>

          <div
            id="action-buttons-frame"
            className="absolute flex flex-col items-center"
            style={{ top: 1139, left: 11, width: 390, height: 116, gap: 12 }}
          >
            <button
              id="btn-start-delivery"
              type="button"
              onClick={onPrimaryAction}
              className="flex flex-row justify-center items-center bg-[#F97316] hover:bg-[#ea6c0a] active:scale-[0.98] rounded-[12px] border-none cursor-pointer transition-all duration-200"
              style={{ width: 390, height: 52, padding: "0 16px", gap: 8, boxSizing: "border-box" }}
            >
              <PlayIcon className="w-[18px] h-[18px] text-[#F9FAFB]" />
              <span className="text-[#F9FAFB] font-bold" style={{ fontSize: 15, lineHeight: "22px" }}>
                Start Delivery
              </span>
            </button>

            <Link
              id="btn-report-issue"
              href="/driver/report"
              className="flex flex-row justify-center items-center bg-white border-2 border-[#202D2D] rounded-[12px] cursor-pointer hover:bg-[#202D2D] hover:text-white transition-all duration-200 no-underline"
              style={{ width: 390, height: 52, padding: "0 16px", gap: 8, boxSizing: "border-box" }}
            >
              <span className="text-[#202D2D] font-bold" style={{ fontSize: 15, lineHeight: "22px" }}>
                Report Issue
              </span>
            </Link>
          </div>

          <nav
            id="bottom-nav-canvas"
            aria-label="Driver navigation"
            className="absolute flex flex-row items-center bg-white border-t border-[#CBD5E1]"
            style={{ top: 1271, left: 0, width: 390, height: 64, boxSizing: "border-box" }}
          >
            <Link
              id="tab-my-run"
              href="/driver/today-run"
              className="flex flex-col justify-center items-center border-none bg-transparent cursor-pointer no-underline flex-1"
              style={{ height: 43, gap: 4 }}
            >
              <RouteIcon className="w-[22px] h-[22px] text-[#485563]" />
              <span className="text-[#485563] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
                My Run
              </span>
            </Link>

            <div
              id="tab-current-stop"
              className="flex flex-col justify-center items-center flex-1"
              style={{ height: 52, gap: 4 }}
            >
              <NavigationIcon className="w-[22px] h-[22px] text-[#202D2D]" />
              <span className="text-[#202D2D] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
                Current Stop
              </span>
              <span
                className="block bg-[#1D4ED8]"
                style={{ width: 64, height: 3, borderRadius: 1.5 }}
              />
            </div>

            <Link
              id="tab-report"
              href="/driver/report"
              className="flex flex-col justify-center items-center border-none bg-transparent cursor-pointer no-underline flex-1"
              style={{ height: 52, gap: 4 }}
            >
              <AlertTriangleIcon className="w-[22px] h-[22px] text-[#485563]" />
              <span className="text-[#485563] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
                Report
              </span>
            </Link>
          </nav>

          <div
            id="home-indicator"
            aria-hidden="true"
            className="absolute flex flex-row justify-center items-center"
            style={{ top: 1335, left: 0, width: 390, height: 13, padding: "0 0 8px", boxSizing: "border-box" }}
          >
            <div
              className="bg-[#202D2D] rounded-[100px]"
              style={{ width: 134, height: 5 }}
            />
          </div>
        </>
      )}
    </div>
  );
}
