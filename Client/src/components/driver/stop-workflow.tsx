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
  PhoneIcon,
} from "@/components/driver/today-run/icons";
import { CameraModal } from "@/components/driver/today-run/CameraModal";
import { SignatureModal } from "@/components/driver/today-run/SignatureModal";
import { Toast, type ToastMessage } from "@/components/driver/today-run/Toast";
import { useConnectivity } from "@/context/DriverConnectivityContext";
import { saveLocalDeliveryRecord, type LocalDeliveryRecord } from "@/lib/driver/driver-offline-db";
import { getOutletContact } from "@/lib/driver/outlet-service";

export type DiscrepancyType = "Quantity Short" | "Damaged" | "Wrong Item" | "Other";
export type NotDeliveredReason =
  | "Store Closed"
  | "Access Blocked"
  | "Road Closed"
  | "Vehicle/Refrigeration Problem"
  | "Other";

const DISCREPANCY_TYPES: DiscrepancyType[] = [
  "Quantity Short",
  "Damaged",
  "Wrong Item",
  "Other",
];

const NOT_DELIVERED_REASONS: NotDeliveredReason[] = [
  "Store Closed",
  "Access Blocked",
  "Road Closed",
  "Vehicle/Refrigeration Problem",
  "Other",
];

export function DriverStopWorkflow({ initialStopRecorded = false }: { initialStopRecorded?: boolean }) {
  const router = useRouter();
  const {
    isOnline,
    connectionState,
    pendingCount,
    lastSyncedTime,
    syncNow,
    refreshPendingCount,
  } = useConnectivity();

  const storeContact = getOutletContact("OUT001");

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const discrepancyFileInputRef = useRef<HTMLInputElement | null>(null);
  const notDeliveredFileInputRef = useRef<HTMLInputElement | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);

  // Modals and Toast notification state
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [signerName, setSignerName] = useState("Store Manager");

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

  const handleRetrySync = async () => {
    setIsSyncing(true);
    try {
      await syncNow();
      setIsSynced(true);
      setConfirmedTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error("Retry sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const isEffectiveSyncing = isSyncing || connectionState === "syncing";
  const isEffectiveSynced = isSynced || connectionState === "synced" || (isOnline && stopRecorded && pendingCount === 0);
  const effectiveTimeStr = lastSyncedTime || confirmedTimeStr;

  // Outcome selection: 'full' | 'discrepancy' | 'none'
  const [deliveryOutcome, setDeliveryOutcome] = useState<"full" | "discrepancy" | "none">("discrepancy");
  const [photoFile, setPhotoFile] = useState<{ name: string; url: string } | null>(null);
  const [signatureFile, setSignatureFile] = useState<{ name: string; url: string } | null>(null);

  // Discrepancy workflow fields
  const [discrepancyType, setDiscrepancyType] = useState<DiscrepancyType>("Quantity Short");
  const [expectedQty, setExpectedQty] = useState(80);
  const [deliveredQty, setDeliveredQty] = useState("72");
  const [discrepancyNotes, setDiscrepancyNotes] = useState("");
  const [discrepancyPhoto, setDiscrepancyPhoto] = useState<{ name: string; url: string } | null>(null);

  // Not Delivered workflow fields
  const [notDeliveredReason, setNotDeliveredReason] = useState<NotDeliveredReason>("Store Closed");
  const [notDeliveredNotes, setNotDeliveredNotes] = useState("");
  const [notDeliveredPhoto, setNotDeliveredPhoto] = useState<{ name: string; url: string } | null>(null);

  // Camera purpose: 'pod' | 'discrepancy' | 'notDelivered'
  const [cameraPurpose, setCameraPurpose] = useState<"pod" | "discrepancy" | "notDelivered">("pod");

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoFile({ name: file.name, url });
      setToast({
        id: Date.now().toString(),
        type: "success",
        title: "Photo Attached",
        message: "Delivery photo uploaded successfully.",
        duration: 3000,
      });
    }
    e.target.value = "";
  };

  const handleDiscrepancyPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setDiscrepancyPhoto({ name: file.name, url });
      setToast({
        id: Date.now().toString(),
        type: "success",
        title: "Evidence Attached",
        message: "Discrepancy photo file uploaded successfully.",
        duration: 3000,
      });
    }
    e.target.value = "";
  };

  const handleNotDeliveredPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setNotDeliveredPhoto({ name: file.name, url });
      setToast({
        id: Date.now().toString(),
        type: "success",
        title: "Evidence Attached",
        message: "Non-delivery photo file uploaded successfully.",
        duration: 3000,
      });
    }
    e.target.value = "";
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSignatureFile({ name: file.name, url });
      setToast({
        id: Date.now().toString(),
        type: "success",
        title: "Signature Attached",
        message: "Recipient signature file uploaded.",
        duration: 3000,
      });
    }
    e.target.value = "";
  };

  const handleCameraCapture = (file: { name: string; url: string }) => {
    if (cameraPurpose === "discrepancy") {
      setDiscrepancyPhoto(file);
      setToast({
        id: Date.now().toString(),
        type: "success",
        title: "Evidence Captured",
        message: "Discrepancy photo evidence captured with camera.",
        duration: 3000,
      });
    } else if (cameraPurpose === "notDelivered") {
      setNotDeliveredPhoto(file);
      setToast({
        id: Date.now().toString(),
        type: "success",
        title: "Evidence Captured",
        message: "Non-delivery photo evidence captured with camera.",
        duration: 3000,
      });
    } else {
      setPhotoFile(file);
      setToast({
        id: Date.now().toString(),
        type: "success",
        title: "Photo Captured",
        message: "Proof of delivery photo captured with camera.",
        duration: 3000,
      });
    }
  };

  const handleSignatureSave = (signature: { name: string; url: string; signerName: string }) => {
    setSignatureFile({ name: signature.name, url: signature.url });
    setSignerName(signature.signerName);
    setToast({
      id: Date.now().toString(),
      type: "success",
      title: "Signature Recorded",
      message: `Digital signature captured for ${signature.signerName}.`,
      duration: 3000,
    });
  };

  const handlePrimaryAction = () => {
    if (!deliveryStarted) {
      setDeliveryStarted(true);
    } else if (!completingDelivery) {
      // Live navigation route screen -> Complete Order clicked
      if (!orderConfirmed) {
        setToast({
          id: Date.now().toString(),
          type: "warning",
          title: "Order Confirmation Required",
          message: "Please press the tick to confirm the order before completion.",
          duration: 4000,
        });
        return;
      }
      setCompletingDelivery(true);
      setOrderConfirmed(false);
    } else if (!stopRecorded) {
      // Final delivery outcome submission
      if (deliveryOutcome === "discrepancy") {
        if (!deliveredQty.trim() || isNaN(Number(deliveredQty)) || Number(deliveredQty) < 0) {
          setToast({
            id: Date.now().toString(),
            type: "warning",
            title: "Delivered Quantity Required",
            message: "Please enter a valid delivered quantity.",
            duration: 4000,
          });
          return;
        }
        if (!discrepancyNotes.trim()) {
          setToast({
            id: Date.now().toString(),
            type: "warning",
            title: "Discrepancy Notes Required",
            message: "Please provide notes describing the discrepancy or damaged items.",
            duration: 4000,
          });
          return;
        }
        if (!discrepancyPhoto) {
          setToast({
            id: Date.now().toString(),
            type: "warning",
            title: "Discrepancy Photo Required",
            message: "Please take or attach photo evidence of the discrepancy.",
            duration: 4000,
          });
          return;
        }
        if (!photoFile && !signatureFile) {
          setToast({
            id: Date.now().toString(),
            type: "warning",
            title: "Proof of Delivery Required",
            message: "Please provide proof of delivery (take goods photo or capture store signature).",
            duration: 4000,
          });
          return;
        }
        if (!orderConfirmed) {
          setToast({
            id: Date.now().toString(),
            type: "warning",
            title: "Confirmation Required",
            message: "Please press the tick to confirm the discrepancy delivery before completion.",
            duration: 4000,
          });
          return;
        }
      } else if (deliveryOutcome === "none") {
        if (!notDeliveredNotes.trim()) {
          setToast({
            id: Date.now().toString(),
            type: "warning",
            title: "Issue Details Required",
            message: "Please provide details explaining why delivery could not be completed.",
            duration: 4000,
          });
          return;
        }
        if (!notDeliveredPhoto) {
          setToast({
            id: Date.now().toString(),
            type: "warning",
            title: "Photo Evidence Required",
            message: "Please take or attach photo evidence of the non-delivery reason.",
            duration: 4000,
          });
          return;
        }
        if (!orderConfirmed) {
          setToast({
            id: Date.now().toString(),
            type: "warning",
            title: "Confirmation Required",
            message: "Please press the tick to confirm non-delivery before recording.",
            duration: 4000,
          });
          return;
        }
      } else {
        // Delivered in full
        if (!photoFile && !signatureFile) {
          setToast({
            id: Date.now().toString(),
            type: "warning",
            title: "Proof of Delivery Required",
            message: "Please provide proof of delivery (take goods photo or capture store signature).",
            duration: 4000,
          });
          return;
        }
        if (!orderConfirmed) {
          setToast({
            id: Date.now().toString(),
            type: "warning",
            title: "Order Confirmation Required",
            message: "Please press the tick to confirm the order before completion.",
            duration: 4000,
          });
          return;
        }
      }

      // Prepare local delivery record for offline/sync flow
      const recordId = "DEL-S1-T001-001";
      const recordStatus = isOnline ? "Synced" : "Pending Sync";
      const localRecord: LocalDeliveryRecord = {
        id: recordId,
        stopId: "OUT001",
        stopName: "OUT001 / Colpetty Retailer",
        vehicleId: "PEL-R04",
        outcome: deliveryOutcome,
        discrepancyDetails: deliveryOutcome === "discrepancy" ? {
          type: discrepancyType,
          expectedQty,
          deliveredQty: Number(deliveredQty) || 0,
          notes: discrepancyNotes,
          photoName: discrepancyPhoto?.name,
        } : undefined,
        notDeliveredDetails: deliveryOutcome === "none" ? {
          reason: notDeliveredReason,
          notes: notDeliveredNotes,
          photoName: notDeliveredPhoto?.name,
        } : undefined,
        podDetails: {
          photoName: photoFile?.name,
          signerName: signatureFile ? signerName : undefined,
          hasSignature: !!signatureFile,
          hasPhoto: !!photoFile,
        },
        status: recordStatus,
        offlineCreated: !isOnline,
        createdAt: new Date().toISOString(),
        syncedAt: isOnline ? new Date().toISOString() : null,
      };

      // Store in local IndexedDB
      saveLocalDeliveryRecord(localRecord)
        .then(() => refreshPendingCount())
        .catch((err: unknown) => console.error("Failed to save delivery record to IndexedDB:", err));

      if (isOnline) {
        setIsSynced(true);
        setIsSyncing(false);
      } else {
        setIsSynced(false);
        setIsSyncing(false);
      }

      setStopRecorded(true);
      setToast({
        id: Date.now().toString(),
        type: "success",
        title: !isOnline
          ? "Stop Saved Offline"
          : deliveryOutcome === "none"
          ? "Non-Delivery Recorded"
          : "Delivery Recorded",
        message: !isOnline
          ? "Delivery record stored locally in IndexedDB (Pending Sync). Will auto-sync when connection returns."
          : deliveryOutcome === "none"
          ? "Stop recorded as Not Delivered and synced with cloud."
          : deliveryOutcome === "discrepancy"
          ? "Stop completed with discrepancy notes & POD."
          : "Delivery completed successfully in full.",
        duration: 4000,
      });
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
        ref={discrepancyFileInputRef}
        accept="image/*"
        onChange={handleDiscrepancyPhotoUpload}
        className="hidden"
      />
      <input
        type="file"
        ref={notDeliveredFileInputRef}
        accept="image/*"
        onChange={handleNotDeliveredPhotoUpload}
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
                <div
                  id="desktop-stop-connectivity-pill"
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
                    connectionState === "offline"
                      ? "bg-orange-50 border-orange-200"
                      : connectionState === "syncing"
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-[#CBD5E1]"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      connectionState === "offline"
                        ? "bg-[#F97316]"
                        : connectionState === "syncing"
                        ? "bg-[#3B82F6] animate-pulse"
                        : "bg-[#22C55E] animate-pulse"
                    }`}
                  />
                  <span
                    className={`font-semibold text-xs ${
                      connectionState === "offline"
                        ? "text-[#F97316]"
                        : connectionState === "syncing"
                        ? "text-[#3B82F6]"
                        : "text-[#22C55E]"
                    }`}
                  >
                    {connectionState === "offline"
                      ? "Offline"
                      : connectionState === "syncing"
                      ? "Syncing..."
                      : connectionState === "synced"
                      ? "Synced"
                      : "Online"}
                  </span>
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

          {/* Action CTAs at Top */}
          <div className="flex items-center gap-3">
            {!stopRecorded && (
              <Link
                href="/driver/report"
                className="flex items-center justify-center px-5 py-3 rounded-xl border-2 border-[#202D2D] text-[#202D2D] font-bold text-sm hover:bg-[#202D2D] hover:text-white transition-all duration-200 no-underline shadow-sm"
              >
                Report Issue
              </Link>
            )}
            <button
              type="button"
              onClick={handlePrimaryAction}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm active:scale-[0.98] transition-all duration-200 shadow-md cursor-pointer border-none ${
                completingDelivery && deliveryOutcome === "none"
                  ? "bg-[#EF4444] hover:bg-[#dc2626]"
                  : "bg-[#F97316] hover:bg-[#ea6c0a]"
              }`}
            >
              {stopRecorded ? (
                <>
                  <span>Proceed to Next Stop</span>
                  <ArrowRightIcon className="w-4 h-4 text-white" />
                </>
              ) : completingDelivery ? (
                <>
                  {deliveryOutcome === "none" ? (
                    <XIcon className="w-5 h-5 text-white" />
                  ) : (
                    <CheckCircleIcon className="w-5 h-5 text-white" />
                  )}
                  <span>
                    {deliveryOutcome === "discrepancy"
                      ? "Complete with Discrepancy"
                      : deliveryOutcome === "none"
                      ? "Record Not Delivered"
                      : "Complete Order"}
                  </span>
                </>
              ) : deliveryStarted ? (
                <>
                  <CheckCircleIcon className="w-5 h-5 text-white" />
                  <span>Complete Order</span>
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
          <div className="flex flex-col items-center justify-start bg-white rounded-2xl p-6 lg:p-8 border border-[#E2E8F0] shadow-sm gap-6 max-w-4xl mx-auto w-full">
            {/* Top Status Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full border-b border-[#F1F5F9] pb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center shrink-0 shadow-sm">
                  <CheckIcon className="w-7 h-7 text-[#22C55E]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#22C55E] font-bold text-xs uppercase tracking-wider bg-green-50 px-2.5 py-0.5 rounded-md border border-green-200">
                      Stop 1 Completed
                    </span>
                    <span className="text-[#485563] text-xs font-semibold">
                      Recorded at {effectiveTimeStr}
                    </span>
                  </div>
                  <h2 className="text-[#202D2D] font-extrabold text-2xl lg:text-3xl mt-1 m-0">
                    Delivery Recorded Successfully
                  </h2>
                  <p className="text-[#485563] font-medium text-sm mt-0.5 m-0">
                    OUT001 / Colpetty Retailer • Galle Road, Colombo 03
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold ${
                    isEffectiveSynced
                      ? "bg-green-50 border-green-200 text-green-700"
                      : isEffectiveSyncing
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-orange-50 border-orange-200 text-orange-700"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isEffectiveSynced
                        ? "bg-[#22C55E]"
                        : isEffectiveSyncing
                        ? "bg-[#3B82F6] animate-pulse"
                        : "bg-[#F97316]"
                    }`}
                  />
                  <span>
                    {isEffectiveSynced
                      ? "Cloud Synced"
                      : isEffectiveSyncing
                      ? "Syncing Now..."
                      : "Saved Offline (Pending Sync)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Two Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left">
              {/* Left Column: Delivery Receipt & Verification Card */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                  <span className="text-[#202D2D] font-bold text-sm tracking-wide flex items-center gap-2">
                    <span>📋</span> DELIVERY RECEIPT
                  </span>
                  <span className="bg-white border border-[#CBD5E1] text-[#202D2D] font-mono font-bold text-xs px-2.5 py-0.5 rounded-md">
                    DEL-S1-T001-001
                  </span>
                </div>

                {/* Outcome Badge Card */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
                    deliveryOutcome === "full"
                      ? "bg-[#ECFDF5] border-[#A7F3D0]"
                      : deliveryOutcome === "discrepancy"
                      ? "bg-[#FFFBEB] border-[#FDE68A]"
                      : "bg-[#FEF2F2] border-[#FECACA]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-bold text-xs uppercase tracking-wider ${
                        deliveryOutcome === "full"
                          ? "text-[#15803D]"
                          : deliveryOutcome === "discrepancy"
                          ? "text-[#B45309]"
                          : "text-[#B91C1C]"
                      }`}
                    >
                      {deliveryOutcome === "full"
                        ? "Delivered in Full"
                        : deliveryOutcome === "discrepancy"
                        ? `Delivered with Discrepancy`
                        : `Not Delivered`}
                    </span>
                    <span className="font-extrabold text-sm text-[#202D2D]">
                      {deliveryOutcome === "discrepancy"
                        ? `${deliveredQty} / ${expectedQty} Units`
                        : deliveryOutcome === "none"
                        ? `0 / ${expectedQty} Units`
                        : `${expectedQty} / ${expectedQty} Units`}
                    </span>
                  </div>

                  {deliveryOutcome === "discrepancy" && (
                    <p className="text-xs text-[#78350F] m-0 font-medium">
                      <span className="font-bold">{discrepancyType}: </span>
                      {discrepancyNotes || "Discrepancy observed and recorded."}
                    </p>
                  )}
                  {deliveryOutcome === "none" && (
                    <p className="text-xs text-[#991B1B] m-0 font-medium">
                      <span className="font-bold">{notDeliveredReason}: </span>
                      {notDeliveredNotes || "Delivery could not be completed."}
                    </p>
                  )}
                </div>

                {/* Receipt Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-[#E2E8F0]">
                    <span className="text-[#64748B] block font-medium">Vehicle / Driver</span>
                    <span className="font-bold text-[#202D2D] mt-0.5 block">PEL-R04 (Van)</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#E2E8F0]">
                    <span className="text-[#64748B] block font-medium">Trip Plan</span>
                    <span className="font-bold text-[#202D2D] mt-0.5 block">S1-T001 • Plan v2</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#E2E8F0]">
                    <span className="text-[#64748B] block font-medium">Store Signer</span>
                    <span className="font-bold text-[#22C55E] mt-0.5 block flex items-center gap-1">
                      <span>✓</span> {signatureFile ? signerName : "Store Manager"}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#E2E8F0]">
                    <span className="text-[#64748B] block font-medium">Photo Evidence</span>
                    <span className="font-bold text-[#22C55E] mt-0.5 block flex items-center gap-1 truncate">
                      <span>✓</span> {photoFile ? photoFile.name : discrepancyPhoto ? discrepancyPhoto.name : notDeliveredPhoto ? notDeliveredPhoto.name : "Captured"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Cloud Sync & Next Actions */}
              <div className="flex flex-col gap-4">
                {/* Cloud Sync Status Container */}
                <div
                  className={`p-5 rounded-2xl border transition-all ${
                    isEffectiveSynced
                      ? "bg-[#F0FDF4] border-[#BBF7D0]"
                      : isEffectiveSyncing
                      ? "bg-[#EFF6FF] border-[#BFDBFE]"
                      : "bg-[#FFFBEB] border-[#FDE68A]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isEffectiveSynced
                          ? "bg-green-100 text-green-700"
                          : isEffectiveSyncing
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {isEffectiveSynced ? (
                        <CheckCircleIcon className="w-5 h-5 text-[#22C55E]" />
                      ) : isEffectiveSyncing ? (
                        <RefreshCwIcon className="w-5 h-5 text-[#3B82F6] animate-spin" />
                      ) : (
                        <SmartphoneIcon className="w-5 h-5 text-[#F97316]" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#202D2D] m-0">
                        {isEffectiveSynced
                          ? "Cloud Synchronized"
                          : isEffectiveSyncing
                          ? "Syncing with Server..."
                          : "Saved Locally on Device"}
                      </h3>
                      <p className="text-xs text-[#64748B] m-0 mt-0.5 font-medium">
                        {isEffectiveSynced
                          ? `Confirmed at ${effectiveTimeStr} • Synchronized with Central Dispatch.`
                          : isEffectiveSyncing
                          ? "Transmitting delivery records and proof assets..."
                          : "Internet connection offline. Delivery is preserved in IndexedDB cache."}
                      </p>
                    </div>
                  </div>

                  {/* 3-Step Lifecycle Visual Indicator */}
                  <div className="mt-4 pt-3 border-t border-black/5 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-[#202D2D]">
                        <span className="w-4 h-4 rounded-full bg-[#22C55E] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                        Saved to Device Cache
                      </span>
                      <span className="text-[#22C55E] font-bold text-[11px]">Secured</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className={`flex items-center gap-1.5 font-medium ${isEffectiveSynced ? 'text-[#202D2D]' : isEffectiveSyncing ? 'text-[#3B82F6]' : 'text-[#64748B]'}`}>
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isEffectiveSynced
                            ? "bg-[#22C55E] text-white"
                            : isEffectiveSyncing
                            ? "bg-[#3B82F6] text-white animate-spin"
                            : "bg-[#CBD5E1] text-white"
                        }`}>
                          {isEffectiveSynced ? "✓" : isEffectiveSyncing ? "↻" : "2"}
                        </span>
                        Cloud Transmission
                      </span>
                      <span className={`font-mono text-[11px] ${isEffectiveSynced ? 'text-[#22C55E] font-bold' : isEffectiveSyncing ? 'text-[#3B82F6] font-bold' : 'text-[#64748B]'}`}>
                        {isEffectiveSynced ? "Done" : isEffectiveSyncing ? "Sending..." : "Pending"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className={`flex items-center gap-1.5 font-medium ${isEffectiveSynced ? 'text-[#202D2D]' : 'text-[#64748B]'}`}>
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isEffectiveSynced ? "bg-[#22C55E] text-white" : "bg-[#CBD5E1] text-white"
                        }`}>
                          {isEffectiveSynced ? "✓" : "3"}
                        </span>
                        Central Dispatch Verification
                      </span>
                      <span className={`font-mono text-[11px] ${isEffectiveSynced ? 'text-[#22C55E] font-bold' : 'text-[#64748B]'}`}>
                        {isEffectiveSynced ? effectiveTimeStr : "Awaiting"}
                      </span>
                    </div>
                  </div>

                  {!isEffectiveSynced && (
                    <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between">
                      <span className="text-xs text-[#64748B] font-medium">
                        Will auto-sync when connection returns.
                      </span>
                      <button
                        type="button"
                        onClick={handleRetrySync}
                        className="px-3 py-1 bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#202D2D] rounded-lg font-bold text-xs cursor-pointer transition-all active:scale-95 shadow-sm"
                      >
                        {isEffectiveSyncing ? "Syncing..." : "Sync Now"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Primary Action Button */}
                <div className="flex flex-col gap-2 mt-auto">
                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-[#F97316] hover:bg-[#ea6c0a] active:scale-[0.98] text-white font-extrabold text-base rounded-2xl transition-all shadow-lg hover:shadow-xl cursor-pointer border-none"
                  >
                    <span>Proceed to Next Stop</span>
                    <ArrowRightIcon className="w-5 h-5 text-white" />
                  </button>

                  <Link
                    href="/driver/today-run"
                    className="flex items-center justify-center py-2 text-[#485563] hover:text-[#202D2D] font-bold text-xs transition-colors no-underline text-center"
                  >
                    ← Return to Today&apos;s Run Overview
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : completingDelivery ? (
          /* ── DESKTOP PROOF OF DELIVERY VIEW ── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            <div className="lg:col-span-6 flex flex-col gap-6">
              {/* Delivery Outcome Selection */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1] flex flex-col gap-4">
                <span className="text-[#485563] font-bold text-xs uppercase tracking-wider">
                  DELIVERY OUTCOME
                </span>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryOutcome("full");
                      setOrderConfirmed(false);
                    }}
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
                    onClick={() => {
                      setDeliveryOutcome("discrepancy");
                      setOrderConfirmed(false);
                    }}
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
                    onClick={() => {
                      setDeliveryOutcome("none");
                      setOrderConfirmed(false);
                    }}
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

              {/* Discrepancy Details & Evidence Section */}
              {deliveryOutcome === "discrepancy" && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F97316]/50 flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-orange-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#FFF4ED] border border-[#F59E0B] flex items-center justify-center">
                        <AlertTriangleIcon className="w-4 h-4 text-[#F59E0B]" />
                      </div>
                      <span className="text-[#202D2D] font-bold text-sm">
                        DISCREPANCY DETAILS & EVIDENCE
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#F97316] bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                      Required
                    </span>
                  </div>

                  {/* Issue Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#485563]">
                      Issue Type <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {DISCREPANCY_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setDiscrepancyType(type)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                            discrepancyType === type
                              ? "bg-[#FFF4ED] border-[#F97316] text-[#F97316] ring-1 ring-[#F97316]"
                              : "bg-[#F8FAFC] border-[#CBD5E1] text-[#485563] hover:bg-slate-100"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quantities: Expected vs Delivered */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-[#485563]">Expected Quantity</label>
                      <div className="px-3.5 py-2.5 bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl text-sm font-extrabold text-[#202D2D] flex items-center justify-between">
                        <span>{expectedQty} units</span>
                        <span className="text-[11px] font-semibold text-[#64748B]">Manifest</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-[#485563]">
                        Delivered Quantity <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={expectedQty}
                          value={deliveredQty}
                          onChange={(e) => setDeliveredQty(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border-2 border-[#CBD5E1] rounded-xl text-sm font-bold text-[#202D2D] focus:border-[#F97316] focus:outline-none transition-colors"
                          placeholder="e.g. 72"
                        />
                        {deliveredQty && !isNaN(Number(deliveredQty)) && Number(deliveredQty) < expectedQty && (
                          <span className="text-[10px] font-bold text-[#EA580C] mt-1 block">
                            Short by {expectedQty - Number(deliveredQty)} units
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#485563]">
                      Discrepancy Notes <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={discrepancyNotes}
                      onChange={(e) => setDiscrepancyNotes(e.target.value)}
                      placeholder="Describe damaged cartons, short counts, or items refused by receiver..."
                      className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#202D2D] font-medium placeholder:text-[#94A3B8] focus:border-[#F97316] focus:outline-none resize-none"
                    />
                  </div>

                  {/* Camera / Photo Evidence */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#485563]">
                        Photo Evidence <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-[#64748B]">Camera or upload</span>
                    </div>

                    {discrepancyPhoto ? (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-300 rounded-xl">
                        <div className="flex items-center gap-3">
                          <img
                            src={discrepancyPhoto.url}
                            alt="Discrepancy Evidence"
                            className="w-14 h-14 rounded-lg object-cover border border-green-300 shadow-sm"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-green-900 truncate max-w-[180px]">
                              {discrepancyPhoto.name}
                            </span>
                            <span className="text-[11px] font-semibold text-green-700">
                              Photo Evidence Attached ✓
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCameraPurpose("discrepancy");
                              setShowCameraModal(true);
                            }}
                            className="text-xs font-bold text-[#EA580C] hover:text-[#C2410C] px-2.5 py-1 bg-white border border-orange-200 rounded-lg cursor-pointer"
                          >
                            Retake
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiscrepancyPhoto(null)}
                            className="text-xs font-bold text-red-600 hover:text-red-800 px-2.5 py-1 bg-white border border-red-200 rounded-lg cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setCameraPurpose("discrepancy");
                            setShowCameraModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-[#F97316] bg-[#FFF4ED] hover:bg-[#ffedd5] text-[#EA580C] font-bold text-xs cursor-pointer transition-all shadow-sm"
                        >
                          <CameraIcon className="w-4 h-4 text-[#EA580C]" />
                          <span>Take Photo with Camera</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => discrepancyFileInputRef.current?.click()}
                          className="px-4 py-3 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#485563] font-bold text-xs cursor-pointer transition-all"
                        >
                          Upload File
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Not Delivered Reason & Evidence Section */}
              {deliveryOutcome === "none" && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#EF4444]/50 flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-red-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#FEF2F2] border border-[#EF4444] flex items-center justify-center">
                        <XIcon className="w-4 h-4 text-[#EF4444]" />
                      </div>
                      <span className="text-[#202D2D] font-bold text-sm">
                        NON-DELIVERY REASON & EVIDENCE
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#EF4444] bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                      Required
                    </span>
                  </div>

                  {/* Reason Selection */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#485563]">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {NOT_DELIVERED_REASONS.map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => setNotDeliveredReason(reason)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                            notDeliveredReason === reason
                              ? "bg-[#FEF2F2] border-[#EF4444] text-[#EF4444] ring-1 ring-[#EF4444]"
                              : "bg-[#F8FAFC] border-[#CBD5E1] text-[#485563] hover:bg-slate-100"
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Issue Details */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#485563]">
                      Issue Details / Explanation <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={notDeliveredNotes}
                      onChange={(e) => setNotDeliveredNotes(e.target.value)}
                      placeholder="Provide specific details why delivery could not be completed (e.g. store closed, access blocked, unreachable receiver)..."
                      className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#202D2D] font-medium placeholder:text-[#94A3B8] focus:border-[#EF4444] focus:outline-none resize-none"
                    />
                  </div>

                  {/* Camera / Photo Evidence */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#485563]">
                        Photo Evidence <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-[#64748B]">Camera or upload</span>
                    </div>

                    {notDeliveredPhoto ? (
                      <div className="flex items-center justify-between p-3 bg-red-50 border border-red-300 rounded-xl">
                        <div className="flex items-center gap-3">
                          <img
                            src={notDeliveredPhoto.url}
                            alt="Non-delivery Evidence"
                            className="w-14 h-14 rounded-lg object-cover border border-red-300 shadow-sm"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-red-900 truncate max-w-[180px]">
                              {notDeliveredPhoto.name}
                            </span>
                            <span className="text-[11px] font-semibold text-red-700">
                              Photo Evidence Attached ✓
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCameraPurpose("notDelivered");
                              setShowCameraModal(true);
                            }}
                            className="text-xs font-bold text-[#EA580C] hover:text-[#C2410C] px-2.5 py-1 bg-white border border-orange-200 rounded-lg cursor-pointer"
                          >
                            Retake
                          </button>
                          <button
                            type="button"
                            onClick={() => setNotDeliveredPhoto(null)}
                            className="text-xs font-bold text-red-600 hover:text-red-800 px-2.5 py-1 bg-white border border-red-200 rounded-lg cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setCameraPurpose("notDelivered");
                            setShowCameraModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-[#EF4444] bg-[#FEF2F2] hover:bg-[#fee2e2] text-[#EF4444] font-bold text-xs cursor-pointer transition-all shadow-sm"
                        >
                          <CameraIcon className="w-4 h-4 text-[#EF4444]" />
                          <span>Take Photo of Situation</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => notDeliveredFileInputRef.current?.click()}
                          className="px-4 py-3 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#485563] font-bold text-xs cursor-pointer transition-all"
                        >
                          Upload File
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Delivery Record */}
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

            {/* Right Column: POD / Resolution, Confirmation Tick, and Action Button */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              {deliveryOutcome !== "none" ? (
                /* PROOF OF DELIVERY (for full or discrepancy) */
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
                          className="w-20 h-16 rounded-lg object-cover border border-green-300 shadow-sm"
                        />
                        <span className="text-xs font-bold text-green-800 truncate max-w-full">
                          {photoFile.name}
                        </span>
                        <span className="text-[11px] font-semibold text-green-600 bg-white px-2 py-0.5 rounded-full border border-green-200">
                          Photo Captured ✓
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCameraPurpose("pod");
                              setShowCameraModal(true);
                            }}
                            className="text-[11px] font-bold text-[#EA580C] hover:text-[#C2410C] px-2 py-1 bg-white border border-orange-200 rounded cursor-pointer"
                          >
                            Retake
                          </button>
                          <button
                            type="button"
                            onClick={() => setPhotoFile(null)}
                            className="text-[11px] font-bold text-red-600 hover:text-red-800 px-2 py-1 bg-white border border-red-200 rounded cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCameraPurpose("pod");
                            setShowCameraModal(true);
                          }}
                          className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-[#F97316] bg-[#FFF4ED] hover:bg-[#ffedd5] text-[#EA580C] gap-2 cursor-pointer transition-all shadow-sm"
                        >
                          <div className="w-10 h-10 rounded-full bg-[#F97316] flex items-center justify-center text-white shadow-md">
                            <CameraIcon className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-bold text-sm text-[#202D2D]">Take Photo with Camera</span>
                          <span className="text-[11px] text-[#485563]">Access device camera directly</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          className="text-xs text-[#64748B] hover:text-[#202D2D] hover:underline bg-transparent border-none cursor-pointer py-1 text-center"
                        >
                          or upload image file
                        </button>
                      </div>
                    )}

                    {/* Capture Signature Button / Preview */}
                    {signatureFile ? (
                      <div className="flex flex-col items-center justify-center p-4 bg-blue-50 border border-blue-400 rounded-xl text-center gap-2">
                        <div className="w-full h-16 bg-white rounded-lg border border-blue-200 flex items-center justify-center p-1 overflow-hidden shadow-inner">
                          <img
                            src={signatureFile.url}
                            alt="Signature preview"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <span className="text-xs font-bold text-blue-900 truncate max-w-full">
                          {signerName || "Store Manager"}
                        </span>
                        <span className="text-[11px] font-semibold text-blue-600 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                          Digital Signature Verified ✓
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => setShowSignatureModal(true)}
                            className="text-[11px] font-bold text-[#1D4ED8] hover:text-blue-800 px-2 py-1 bg-white border border-blue-200 rounded cursor-pointer"
                          >
                            Re-sign
                          </button>
                          <button
                            type="button"
                            onClick={() => setSignatureFile(null)}
                            className="text-[11px] font-bold text-red-600 hover:text-red-800 px-2 py-1 bg-white border border-red-200 rounded cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setShowSignatureModal(true)}
                          className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-[#1D4ED8] bg-[#EFF6FF] hover:bg-[#dbeafe] text-[#1D4ED8] gap-2 cursor-pointer transition-all shadow-sm"
                        >
                          <div className="w-10 h-10 rounded-full bg-[#1D4ED8] flex items-center justify-center text-white shadow-md">
                            <SignatureIcon className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-bold text-sm text-[#202D2D]">Capture Store Signature</span>
                          <span className="text-[11px] text-[#485563]">Sign directly on driver device</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => signatureInputRef.current?.click()}
                          className="text-xs text-[#64748B] hover:text-[#202D2D] hover:underline bg-transparent border-none cursor-pointer py-1 text-center"
                        >
                          or upload signature file
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* NON-DELIVERY RESOLUTION NOTICE */
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-200 flex flex-col gap-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-red-100">
                    <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                      <XIcon className="w-4 h-4 text-[#EF4444]" />
                    </div>
                    <span className="text-[#202D2D] font-bold text-sm">
                      NON-DELIVERY RESOLUTION
                    </span>
                  </div>

                  <div className="bg-red-50/70 border border-red-200 rounded-xl p-4 flex flex-col gap-2">
                    <span className="text-xs font-bold text-red-900">
                      Onboard Stock Return Policy
                    </span>
                    <p className="text-xs text-red-700 m-0 leading-relaxed font-medium">
                      All allocated items ({expectedQty} units) will remain secured on vehicle <span className="font-bold">PEL-R04</span> and returned to Colombo Depot for reschedule.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5 bg-[#F8FAFC] p-3.5 rounded-xl border border-[#CBD5E1]">
                    <span className="text-xs font-bold text-[#202D2D]">Next Action</span>
                    <span className="text-xs text-[#485563]">
                      Stop OUT001 will be marked unfulfilled. Next stop on manifest: <span className="font-bold text-[#202D2D]">OUT002 / Bambalapitiya Grocers</span>.
                    </span>
                  </div>
                </div>
              )}

              {/* Confirmation Checkbox & Primary Action Button */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1] flex flex-col gap-4">
                {/* Confirmation Checkbox */}
                <button
                  type="button"
                  id="desktop-pod-confirm-checkbox"
                  onClick={() => setOrderConfirmed(!orderConfirmed)}
                  className={`border-2 rounded-xl p-4 flex items-center gap-3.5 cursor-pointer transition-all text-left ${
                    orderConfirmed
                      ? "bg-[#ECFDF5] border-[#22C55E] ring-2 ring-[#22C55E]/30"
                      : "bg-[#F9FAFB] border-[#CBD5E1] hover:bg-slate-100 hover:border-[#F97316]"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
                      orderConfirmed
                        ? "bg-[#22C55E] border-[#22C55E] text-white shadow-sm"
                        : "border-[#94A3B8] bg-white"
                    }`}
                  >
                    {orderConfirmed ? (
                      <CheckIcon className="w-4 h-4 text-white" />
                    ) : null}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#202D2D] font-bold text-sm flex items-center gap-2">
                      <span>
                        {deliveryOutcome === "none"
                          ? "Confirm non-delivery record"
                          : deliveryOutcome === "discrepancy"
                          ? "Confirm delivery with discrepancy"
                          : "Confirm complete order"}
                      </span>
                      {orderConfirmed && (
                        <span className="text-[11px] font-bold text-[#22C55E] bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                          Confirmed ✓
                        </span>
                      )}
                    </span>
                    <span className="text-[#64748B] text-xs">
                      {deliveryOutcome === "none"
                        ? "Press this tick to confirm recording this stop as not delivered"
                        : deliveryOutcome === "discrepancy"
                        ? "Press this tick to confirm discrepancy delivery before completion"
                        : "Press this tick to confirm delivery before clicking Complete Order"}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  id="btn-complete-order-desktop"
                  onClick={handlePrimaryAction}
                  className={`flex items-center justify-center gap-2 w-full py-4 text-white font-bold text-base rounded-xl transition-all shadow-md cursor-pointer border-none active:scale-[0.98] ${
                    deliveryOutcome === "none"
                      ? "bg-[#EF4444] hover:bg-[#dc2626]"
                      : "bg-[#F97316] hover:bg-[#ea6c0a]"
                  }`}
                >
                  {deliveryOutcome === "none" ? (
                    <>
                      <XIcon className="w-5 h-5 text-white" />
                      <span>Record Not Delivered</span>
                    </>
                  ) : deliveryOutcome === "discrepancy" ? (
                    <>
                      <CheckCircleIcon className="w-5 h-5 text-white" />
                      <span>Complete with Discrepancy</span>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5 text-white" />
                      <span>Complete Order</span>
                    </>
                  )}
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
                id="live-route-confirm-tick"
                onClick={() => setOrderConfirmed(!orderConfirmed)}
                className={`border-2 rounded-2xl p-5 shadow-sm flex items-center gap-3.5 cursor-pointer transition-all text-left ${
                  orderConfirmed
                    ? "bg-[#ECFDF5] border-[#22C55E] ring-2 ring-[#22C55E]/30"
                    : "bg-white border-[#CBD5E1] hover:bg-slate-50 hover:border-[#F97316]"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
                    orderConfirmed
                      ? "bg-[#22C55E] border-[#22C55E] text-white shadow-sm"
                      : "border-[#94A3B8] bg-white"
                  }`}
                >
                  {orderConfirmed ? (
                    <CheckIcon className="w-4 h-4 text-white" />
                  ) : null}
                </div>
                <div className="flex flex-col flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[#202D2D] font-bold text-base">
                      Confirm complete order
                    </span>
                    {orderConfirmed && (
                      <span className="text-[11px] font-bold text-[#22C55E] bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                        Confirmed ✓
                      </span>
                    )}
                  </div>
                  <span className="text-[#64748B] text-xs mt-0.5">
                    {orderConfirmed
                      ? "Order confirmed! Click Complete Order to proceed"
                      : "Press this tick to confirm delivery before clicking Complete Order"}
                  </span>
                </div>
              </button>

              <button
                type="button"
                id="btn-complete-order-live-page"
                onClick={handlePrimaryAction}
                className="flex items-center justify-center gap-2 w-full py-4 bg-[#F97316] hover:bg-[#ea6c0a] active:scale-[0.98] text-white font-bold text-base rounded-xl transition-all shadow-md cursor-pointer border-none"
              >
                <CheckCircleIcon className="w-5 h-5 text-white" />
                <span>Complete Order</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                {storeContact?.phone ? (
                  <a
                    href={`tel:${storeContact.phone.replace(/[^+\d]/g, "")}`}
                    id="btn-call-store-live-desktop"
                    className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-[#ECFDF5] hover:bg-[#DCFCE7] text-[#15803D] border border-[#A7F3D0] text-xs font-bold transition-all text-center no-underline shadow-sm active:scale-95"
                    title={`Call Store: ${storeContact.phone}`}
                  >
                    <PhoneIcon className="w-3.5 h-3.5 text-[#15803D]" />
                    <span>Call Store</span>
                  </a>
                ) : (
                  <div />
                )}
                <Link
                  href="/driver/report"
                  className="flex items-center justify-center py-3 px-3 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#485563] hover:text-[#202D2D] font-bold text-xs transition-all text-center no-underline shadow-sm"
                >
                  Report Issue
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* ── DESKTOP DEFAULT STOP DETAILS ── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1] flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-3">
                  <div>
                    <span className="text-[#22C55E] font-bold text-xs uppercase tracking-wider">
                      OUTLET DETAILS
                    </span>
                    <h2 className="text-[#202D2D] font-extrabold text-xl mt-0.5">
                      OUT001 / Colpetty Retailer
                    </h2>
                  </div>
                  {storeContact?.phone && (
                    <a
                      href={`tel:${storeContact.phone.replace(/[^+\d]/g, "")}`}
                      id="btn-call-store-desktop"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ECFDF5] hover:bg-[#DCFCE7] text-[#15803D] border border-[#A7F3D0] text-xs font-bold transition-all no-underline shadow-sm active:scale-95"
                      title={`Call Store: ${storeContact.phone}`}
                    >
                      <PhoneIcon className="w-3.5 h-3.5 text-[#15803D]" />
                      <span>Call Store ({storeContact.phone})</span>
                    </a>
                  )}
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

              <div className="bg-[#FFF4ED] border border-[#F59E0B] rounded-2xl p-5 flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center shrink-0">
                  <AlertTriangleIcon className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div className="flex flex-col gap-1 text-xs sm:text-sm">
                  <h3 className="text-[#F59E0B] font-bold text-sm m-0 flex items-center gap-1.5">
                    <span>✓</span> Loading Update — Resolved
                  </h3>
                  <p className="text-[#D97706] font-medium m-0 mt-0.5">
                    Loading issue reported for order S1-001 at OUT001 / Colpetty Retailer.
                  </p>
                  <p className="text-[#D97706] font-medium m-0">
                    8 damaged units were replaced before departure. Final quantity verified by the Loader.
                  </p>
                  <p className="text-[#D97706] font-bold m-0 mt-1">No action required.</p>
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
          onSelectOutcome={(o) => {
            setDeliveryOutcome(o);
            setOrderConfirmed(false);
          }}
          photoFile={photoFile}
          onSelectPhoto={() => {
            setCameraPurpose("pod");
            setShowCameraModal(true);
          }}
          onRemovePhoto={() => setPhotoFile(null)}
          signatureFile={signatureFile}
          onSelectSignature={() => setShowSignatureModal(true)}
          onRemoveSignature={() => setSignatureFile(null)}
          orderConfirmed={orderConfirmed}
          onToggleOrderConfirmed={() => setOrderConfirmed(!orderConfirmed)}
          discrepancyType={discrepancyType}
          onSelectDiscrepancyType={setDiscrepancyType}
          expectedQty={expectedQty}
          deliveredQty={deliveredQty}
          onChangeDeliveredQty={setDeliveredQty}
          discrepancyNotes={discrepancyNotes}
          onChangeDiscrepancyNotes={setDiscrepancyNotes}
          discrepancyPhoto={discrepancyPhoto}
          onCaptureDiscrepancyPhoto={() => {
            setCameraPurpose("discrepancy");
            setShowCameraModal(true);
          }}
          onRemoveDiscrepancyPhoto={() => setDiscrepancyPhoto(null)}
          onUploadDiscrepancyPhoto={() => discrepancyFileInputRef.current?.click()}
          notDeliveredReason={notDeliveredReason}
          onSelectNotDeliveredReason={setNotDeliveredReason}
          notDeliveredNotes={notDeliveredNotes}
          onChangeNotDeliveredNotes={setNotDeliveredNotes}
          notDeliveredPhoto={notDeliveredPhoto}
          onCaptureNotDeliveredPhoto={() => {
            setCameraPurpose("notDelivered");
            setShowCameraModal(true);
          }}
          onRemoveNotDeliveredPhoto={() => setNotDeliveredPhoto(null)}
          onUploadNotDeliveredPhoto={() => notDeliveredFileInputRef.current?.click()}
          isSyncing={isEffectiveSyncing}
          isSynced={isEffectiveSynced}
          confirmedTimeStr={effectiveTimeStr}
          signerName={signerName}
          onRetrySync={handleRetrySync}
          onReviewChanges={() => setShowReviewModal(true)}
          onPrimaryAction={handlePrimaryAction}
        />
      </div>

      {/* Toastify-style Notification */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Direct Device Camera Modal */}
      <CameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handleCameraCapture}
        title={
          cameraPurpose === "discrepancy"
            ? "Discrepancy Evidence — Take Photo"
            : cameraPurpose === "notDelivered"
            ? "Non-Delivery Evidence — Take Photo"
            : "Proof of Delivery — Capture Photo"
        }
      />

      {/* Store Manager Digital Signature Modal */}
      <SignatureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSave={handleSignatureSave}
        title="Store Manager Digital Signature"
      />

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
  // Discrepancy props
  discrepancyType,
  onSelectDiscrepancyType,
  expectedQty,
  deliveredQty,
  onChangeDeliveredQty,
  discrepancyNotes,
  onChangeDiscrepancyNotes,
  discrepancyPhoto,
  onCaptureDiscrepancyPhoto,
  onRemoveDiscrepancyPhoto,
  onUploadDiscrepancyPhoto,
  // Not delivered props
  notDeliveredReason,
  onSelectNotDeliveredReason,
  notDeliveredNotes,
  onChangeNotDeliveredNotes,
  notDeliveredPhoto,
  onCaptureNotDeliveredPhoto,
  onRemoveNotDeliveredPhoto,
  onUploadNotDeliveredPhoto,
  // Sync props
  isSyncing,
  isSynced,
  confirmedTimeStr = "10:42 AM",
  signerName = "Store Manager",
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
  // Discrepancy types
  discrepancyType: DiscrepancyType;
  onSelectDiscrepancyType: (t: DiscrepancyType) => void;
  expectedQty: number;
  deliveredQty: string;
  onChangeDeliveredQty: (val: string) => void;
  discrepancyNotes: string;
  onChangeDiscrepancyNotes: (val: string) => void;
  discrepancyPhoto: { name: string; url: string } | null;
  onCaptureDiscrepancyPhoto: () => void;
  onRemoveDiscrepancyPhoto: () => void;
  onUploadDiscrepancyPhoto: () => void;
  // Not delivered types
  notDeliveredReason: NotDeliveredReason;
  onSelectNotDeliveredReason: (r: NotDeliveredReason) => void;
  notDeliveredNotes: string;
  onChangeNotDeliveredNotes: (val: string) => void;
  notDeliveredPhoto: { name: string; url: string } | null;
  onCaptureNotDeliveredPhoto: () => void;
  onRemoveNotDeliveredPhoto: () => void;
  onUploadNotDeliveredPhoto: () => void;
  // Sync types
  isSyncing: boolean;
  isSynced: boolean;
  confirmedTimeStr?: string;
  signerName?: string;
  onRetrySync: () => void;
  onReviewChanges: () => void;
  onPrimaryAction: () => void;
}) {
  const { connectionState } = useConnectivity();
  const storeContact = getOutletContact("OUT001");
  const canvasHeight = stopRecorded || completingDelivery ? "auto" : deliveryStarted ? 917 : 1395;

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
            className={`flex flex-row items-center border rounded-full transition-all ${
              connectionState === "offline"
                ? "bg-orange-50 border-orange-200"
                : connectionState === "syncing"
                ? "bg-blue-50 border-blue-200"
                : "bg-white border-[#CBD5E1]"
            }`}
            style={{ minWidth: 67, height: 25, padding: "4px 8px", gap: 6, boxSizing: "border-box" }}
          >
            <span
              className={`rounded-full ${
                connectionState === "offline"
                  ? "bg-[#F97316]"
                  : connectionState === "syncing"
                  ? "bg-[#3B82F6] animate-pulse"
                  : "bg-[#22C55E]"
              }`}
              style={{ width: 8, height: 8 }}
            />
            <span
              className={`font-semibold ${
                connectionState === "offline"
                  ? "text-[#F97316]"
                  : connectionState === "syncing"
                  ? "text-[#3B82F6]"
                  : "text-[#22C55E]"
              }`}
              style={{ fontSize: 11, lineHeight: "16px" }}
            >
              {connectionState === "offline"
                ? "Offline"
                : connectionState === "syncing"
                ? "Syncing..."
                : connectionState === "synced"
                ? "Synced"
                : "Online"}
            </span>
          </div>
        )}
      </header>

      {/* ── MODE 4: STOP RECORDED / DELIVERY RECORDED SUCCESS SCREEN (stopRecorded === true) ── */}
      {stopRecorded ? (
        <div className="flex flex-col items-start w-[390px] mx-auto bg-[#F8FAFC]" style={{ marginTop: 55 }}>
          {/* Main content frame */}
          <div
            className="flex flex-col items-center bg-[#F8FAFC] box-sizing-border"
            style={{ width: 390, padding: "20px 16px", gap: 16 }}
          >
            {/* success-circle */}
            <div
              id="success-circle"
              className="flex flex-col justify-center items-center bg-[#ECFDF5] border-2 border-[#22C55E] rounded-full shrink-0 shadow-sm"
              style={{ width: 64, height: 64, boxSizing: "border-box" }}
            >
              <CheckIcon className="w-[30px] h-[30px] text-[#22C55E]" />
            </div>

            {/* Headline */}
            <div className="flex flex-col items-center gap-1 shrink-0 text-center" style={{ width: 350 }}>
              <span className="text-[#202D2D] font-extrabold text-xl leading-tight">
                Delivery Recorded Successfully
              </span>
              <span className="text-[#485563] font-medium text-xs">
                OUT001 / Colpetty Retailer • Recorded at {confirmedTimeStr}
              </span>
            </div>

            {/* Mobile Delivery Receipt Card (width: 350px) */}
            <div
              className="flex flex-col bg-white border border-[#E2E8F0] rounded-2xl shrink-0 p-4 gap-3 text-left shadow-sm"
              style={{ width: 350, boxSizing: "border-box" }}
            >
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
                <span className="text-[#202D2D] font-bold text-xs flex items-center gap-1.5 uppercase tracking-wide">
                  <span>📋</span> Delivery Receipt
                </span>
                <span className="bg-[#F8FAFC] border border-[#CBD5E1] text-[#202D2D] font-mono font-bold text-[11px] px-2 py-0.5 rounded">
                  DEL-S1-T001-001
                </span>
              </div>

              {/* Outcome Badge Card */}
              <div
                className={`p-3 rounded-xl border flex flex-col gap-1 ${
                  deliveryOutcome === "full"
                    ? "bg-[#ECFDF5] border-[#A7F3D0]"
                    : deliveryOutcome === "discrepancy"
                    ? "bg-[#FFFBEB] border-[#FDE68A]"
                    : "bg-[#FEF2F2] border-[#FECACA]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-bold text-xs uppercase tracking-wider ${
                      deliveryOutcome === "full"
                        ? "text-[#15803D]"
                        : deliveryOutcome === "discrepancy"
                        ? "text-[#B45309]"
                        : "text-[#B91C1C]"
                    }`}
                  >
                    {deliveryOutcome === "full"
                      ? "Delivered in Full"
                      : deliveryOutcome === "discrepancy"
                      ? "With Discrepancy"
                      : "Not Delivered"}
                  </span>
                  <span className="font-extrabold text-xs text-[#202D2D]">
                    {deliveryOutcome === "discrepancy"
                      ? `${deliveredQty} / ${expectedQty} Units`
                      : deliveryOutcome === "none"
                      ? `0 / ${expectedQty} Units`
                      : `${expectedQty} / ${expectedQty} Units`}
                  </span>
                </div>

                {deliveryOutcome === "discrepancy" && (
                  <p className="text-[11px] text-[#78350F] m-0 font-medium leading-tight">
                    <span className="font-bold">{discrepancyType}: </span>
                    {discrepancyNotes || "Discrepancy observed and recorded."}
                  </p>
                )}
                {deliveryOutcome === "none" && (
                  <p className="text-[11px] text-[#991B1B] m-0 font-medium leading-tight">
                    <span className="font-bold">{notDeliveredReason}: </span>
                    {notDeliveredNotes || "Delivery could not be completed."}
                  </p>
                )}
              </div>

              {/* 2-column Quick Details */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
                  <span className="text-[#64748B] block font-medium">Store Signer</span>
                  <span className="font-bold text-[#22C55E] mt-0.5 block truncate">
                    ✓ {signatureFile ? signerName : "Store Manager"}
                  </span>
                </div>
                <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
                  <span className="text-[#64748B] block font-medium">Photo Proof</span>
                  <span className="font-bold text-[#22C55E] mt-0.5 block truncate">
                    ✓ {photoFile ? "Attached" : discrepancyPhoto ? "Evidence" : notDeliveredPhoto ? "Evidence" : "Captured"}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Cloud Sync Card (width: 350px) */}
            <div
              className={`flex flex-col rounded-2xl border shrink-0 p-4 gap-3 text-left transition-all shadow-sm ${
                isSynced
                  ? "bg-[#F0FDF4] border-[#BBF7D0]"
                  : isSyncing
                  ? "bg-[#EFF6FF] border-[#BFDBFE]"
                  : "bg-[#FFFBEB] border-[#FDE68A]"
              }`}
              style={{ width: 350, boxSizing: "border-box" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isSynced
                      ? "bg-green-100 text-green-700"
                      : isSyncing
                      ? "bg-blue-100 text-blue-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {isSynced ? (
                    <CheckCircleIcon className="w-5 h-5 text-[#22C55E]" />
                  ) : isSyncing ? (
                    <RefreshCwIcon className="w-5 h-5 text-[#3B82F6] animate-spin" />
                  ) : (
                    <SmartphoneIcon className="w-5 h-5 text-[#F97316]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-bold text-[#202D2D] block leading-tight">
                    {isSynced
                      ? "Cloud Synchronized"
                      : isSyncing
                      ? "Syncing with Cloud..."
                      : "Saved on Device (Offline)"}
                  </span>
                  <span className="text-[11px] text-[#64748B] font-medium block mt-0.5 truncate">
                    {isSynced
                      ? `Verified by Central Dispatch at ${confirmedTimeStr}`
                      : isSyncing
                      ? "Transmitting delivery record and evidence..."
                      : "Preserved locally in IndexedDB cache."}
                  </span>
                </div>
              </div>

              {/* 3-Step Lifecycle Indicator */}
              <div className="pt-2.5 border-t border-black/5 flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 font-medium text-[#202D2D]">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#22C55E] text-white flex items-center justify-center text-[9px] font-bold">✓</span>
                    Saved to Device Cache
                  </span>
                  <span className="text-[#22C55E] font-bold text-[10px]">Secured</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`flex items-center gap-1.5 font-medium ${isSynced ? 'text-[#202D2D]' : isSyncing ? 'text-[#3B82F6]' : 'text-[#64748B]'}`}>
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      isSynced ? "bg-[#22C55E] text-white" : isSyncing ? "bg-[#3B82F6] text-white animate-spin" : "bg-[#CBD5E1] text-white"
                    }`}>
                      {isSynced ? "✓" : isSyncing ? "↻" : "2"}
                    </span>
                    Cloud Transmission
                  </span>
                  <span className={`font-bold text-[10px] ${isSynced ? 'text-[#22C55E]' : isSyncing ? 'text-[#3B82F6]' : 'text-[#64748B]'}`}>
                    {isSynced ? "Done" : isSyncing ? "Sending..." : "Pending"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`flex items-center gap-1.5 font-medium ${isSynced ? 'text-[#202D2D]' : 'text-[#64748B]'}`}>
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      isSynced ? "bg-[#22C55E] text-white" : "bg-[#CBD5E1] text-white"
                    }`}>
                      {isSynced ? "✓" : "3"}
                    </span>
                    Dispatch Verification
                  </span>
                  <span className={`font-bold text-[10px] ${isSynced ? 'text-[#22C55E]' : 'text-[#64748B]'}`}>
                    {isSynced ? confirmedTimeStr : "Awaiting"}
                  </span>
                </div>
              </div>
            </div>

            {/* Frame: Proceed to Next Stop Button Frame */}
            <div
              className="flex flex-col items-center shrink-0 gap-2 mt-2"
              style={{ width: 350, boxSizing: "border-box" }}
            >
              <button
                id="btn-proceed-next-stop"
                type="button"
                onClick={onPrimaryAction}
                className="flex flex-row justify-center items-center bg-[#F97316] hover:bg-[#ea6c0a] active:scale-[0.98] rounded-xl border-none cursor-pointer transition-all duration-200 shadow-md"
                style={{ width: 350, height: 48, padding: "0 16px", gap: 8, boxSizing: "border-box" }}
              >
                <span className="text-white font-bold" style={{ fontSize: 15, lineHeight: "22px" }}>
                  Proceed to Next Stop
                </span>
                <ArrowRightIcon className="w-[18px] h-[18px] text-white" />
              </button>

              <Link
                href="/driver/today-run"
                className="text-[#485563] hover:text-[#202D2D] font-bold text-xs py-1.5 no-underline"
              >
                ← Return to Today&apos;s Run
              </Link>
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
        <div className="flex flex-col items-start w-[390px] mx-auto bg-[#F8FAFC]" style={{ marginTop: 55 }}>
          <div className="flex flex-col items-center bg-[#F8FAFC] w-[390px] p-4 gap-4 box-border">
            {/* 1. Header: Current Stop */}
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-[#485563] font-bold text-xs uppercase tracking-wider">
                  CURRENT STOP
                </span>
                <span className="text-[#202D2D] font-extrabold text-lg">
                  OUT001 / Colpetty Retailer
                </span>
              </div>
              {storeContact?.phone && (
                <a
                  href={`tel:${storeContact.phone.replace(/[^+\d]/g, "")}`}
                  id="btn-call-store-mobile-pod"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ECFDF5] hover:bg-[#DCFCE7] text-[#15803D] border border-[#A7F3D0] text-xs font-bold shadow-sm no-underline active:scale-95 transition-all shrink-0"
                  title={`Call Store: ${storeContact.phone}`}
                >
                  <PhoneIcon className="w-3.5 h-3.5 text-[#15803D]" />
                  <span>Call Store</span>
                </a>
              )}
            </div>

            {/* 2. Delivery Outcome Selector Card */}
            <div className="flex flex-col items-start w-full bg-white p-4 rounded-xl border border-[#CBD5E1] gap-3 shadow-sm">
              <span className="text-[#485563] font-bold text-xs uppercase tracking-wider">
                DELIVERY OUTCOME
              </span>
              <div className="flex flex-col gap-2.5 w-full">
                {/* Delivered in Full */}
                <button
                  type="button"
                  onClick={() => onSelectOutcome("full")}
                  className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer text-left bg-white ${
                    deliveryOutcome === "full" ? "border-[#22C55E]" : "border-[#CBD5E1]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#22C55E] flex items-center justify-center shrink-0">
                      <CheckIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[#202D2D] font-bold text-sm">
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

                {/* Delivered with Discrepancy */}
                <button
                  type="button"
                  onClick={() => onSelectOutcome("discrepancy")}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                    deliveryOutcome === "discrepancy"
                      ? "bg-[#FFF4ED] border-[#F97316]"
                      : "bg-white border-[#CBD5E1]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#FFF4ED] border border-[#F59E0B] flex items-center justify-center shrink-0">
                      <AlertTriangleIcon className="w-3.5 h-3.5 text-[#F59E0B]" />
                    </div>
                    <span className="text-[#202D2D] font-semibold text-sm">
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

                {/* Not Delivered */}
                <button
                  type="button"
                  onClick={() => onSelectOutcome("none")}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                    deliveryOutcome === "none"
                      ? "bg-[#FEF2F2] border-[#EF4444]"
                      : "bg-white border-[#CBD5E1]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#FEF2F2] border border-[#EF4444] flex items-center justify-center shrink-0">
                      <XIcon className="w-3.5 h-3.5 text-[#EF4444]" />
                    </div>
                    <span className="text-[#202D2D] font-semibold text-sm">
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

            {/* 3. Discrepancy Section (if discrepancy) */}
            {deliveryOutcome === "discrepancy" && (
              <div className="flex flex-col items-start w-full bg-white p-4 rounded-xl border border-[#F97316]/50 gap-3 shadow-sm">
                <div className="flex items-center justify-between w-full pb-2 border-b border-orange-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#FFF4ED] border border-[#F59E0B] flex items-center justify-center">
                      <AlertTriangleIcon className="w-3.5 h-3.5 text-[#F59E0B]" />
                    </div>
                    <span className="text-[#202D2D] font-bold text-xs">
                      DISCREPANCY DETAILS & EVIDENCE
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#F97316] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                    Required
                  </span>
                </div>

                {/* Issue Type */}
                <div className="flex flex-col gap-1 w-full">
                  <label className="text-[11px] font-bold text-[#485563]">
                    Issue Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 w-full">
                    {DISCREPANCY_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => onSelectDiscrepancyType(type)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                          discrepancyType === type
                            ? "bg-[#FFF4ED] border-[#F97316] text-[#F97316] ring-1 ring-[#F97316]"
                            : "bg-[#F8FAFC] border-[#CBD5E1] text-[#485563]"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expected & Delivered Quantities */}
                <div className="grid grid-cols-2 gap-2 w-full">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-[#485563]">Expected Qty</label>
                    <div className="px-3 py-2 bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg text-xs font-extrabold text-[#202D2D]">
                      {expectedQty} units
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-[#485563]">
                      Delivered Qty <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={expectedQty}
                      value={deliveredQty}
                      onChange={(e) => onChangeDeliveredQty(e.target.value)}
                      className="px-3 py-1.5 bg-white border-2 border-[#CBD5E1] rounded-lg text-xs font-bold text-[#202D2D] focus:border-[#F97316] focus:outline-none"
                      placeholder="e.g. 72"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1 w-full">
                  <label className="text-[11px] font-bold text-[#485563]">
                    Discrepancy Notes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={discrepancyNotes}
                    onChange={(e) => onChangeDiscrepancyNotes(e.target.value)}
                    placeholder="Describe damaged cartons or items..."
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#202D2D] focus:border-[#F97316] focus:outline-none resize-none"
                  />
                </div>

                {/* Photo Evidence */}
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-[11px] font-bold text-[#485563]">
                    Photo Evidence <span className="text-red-500">*</span>
                  </label>
                  {discrepancyPhoto ? (
                    <div className="flex items-center justify-between p-2.5 bg-green-50 border border-green-300 rounded-lg w-full">
                      <div className="flex items-center gap-2">
                        <img
                          src={discrepancyPhoto.url}
                          alt="Discrepancy"
                          className="w-12 h-12 rounded object-cover border border-green-300"
                        />
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-green-900 truncate max-w-[140px]">
                            {discrepancyPhoto.name}
                          </span>
                          <span className="text-[10px] font-semibold text-green-700">
                            Photo Evidence ✓
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={onCaptureDiscrepancyPhoto}
                          className="text-[10px] font-bold text-orange-600 bg-white border border-orange-200 rounded px-2 py-1 cursor-pointer"
                        >
                          Retake
                        </button>
                        <button
                          type="button"
                          onClick={onRemoveDiscrepancyPhoto}
                          className="text-[10px] font-bold text-red-600 bg-white border border-red-200 rounded px-2 py-1 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 w-full">
                      <button
                        type="button"
                        onClick={onCaptureDiscrepancyPhoto}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border-2 border-[#F97316] bg-[#FFF4ED] text-[#EA580C] font-bold text-xs cursor-pointer shadow-sm"
                      >
                        <CameraIcon className="w-3.5 h-3.5 text-[#EA580C]" />
                        <span>Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={onUploadDiscrepancyPhoto}
                        className="py-2.5 px-3 rounded-lg border border-[#CBD5E1] bg-white text-[#485563] font-bold text-xs cursor-pointer"
                      >
                        Upload
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. Not Delivered Section (if none) */}
            {deliveryOutcome === "none" && (
              <div className="flex flex-col items-start w-full bg-white p-4 rounded-xl border border-[#EF4444]/50 gap-3 shadow-sm">
                <div className="flex items-center justify-between w-full pb-2 border-b border-red-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#FEF2F2] border border-[#EF4444] flex items-center justify-center">
                      <XIcon className="w-3.5 h-3.5 text-[#EF4444]" />
                    </div>
                    <span className="text-[#202D2D] font-bold text-xs">
                      NON-DELIVERY REASON & EVIDENCE
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#EF4444] bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                    Required
                  </span>
                </div>

                {/* Reason Selection */}
                <div className="flex flex-col gap-1 w-full">
                  <label className="text-[11px] font-bold text-[#485563]">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 w-full">
                    {NOT_DELIVERED_REASONS.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => onSelectNotDeliveredReason(reason)}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center ${
                          notDeliveredReason === reason
                            ? "bg-[#FEF2F2] border-[#EF4444] text-[#EF4444] ring-1 ring-[#EF4444]"
                            : "bg-[#F8FAFC] border-[#CBD5E1] text-[#485563]"
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Issue Details */}
                <div className="flex flex-col gap-1 w-full">
                  <label className="text-[11px] font-bold text-[#485563]">
                    Issue Details / Notes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={notDeliveredNotes}
                    onChange={(e) => onChangeNotDeliveredNotes(e.target.value)}
                    placeholder="Describe reason delivery was prevented..."
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#202D2D] focus:border-[#EF4444] focus:outline-none resize-none"
                  />
                </div>

                {/* Photo Evidence */}
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-[11px] font-bold text-[#485563]">
                    Photo Evidence <span className="text-red-500">*</span>
                  </label>
                  {notDeliveredPhoto ? (
                    <div className="flex items-center justify-between p-2.5 bg-red-50 border border-red-300 rounded-lg w-full">
                      <div className="flex items-center gap-2">
                        <img
                          src={notDeliveredPhoto.url}
                          alt="Non-delivery"
                          className="w-12 h-12 rounded object-cover border border-red-300"
                        />
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-red-900 truncate max-w-[140px]">
                            {notDeliveredPhoto.name}
                          </span>
                          <span className="text-[10px] font-semibold text-red-700">
                            Photo Evidence ✓
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={onCaptureNotDeliveredPhoto}
                          className="text-[10px] font-bold text-orange-600 bg-white border border-orange-200 rounded px-2 py-1 cursor-pointer"
                        >
                          Retake
                        </button>
                        <button
                          type="button"
                          onClick={onRemoveNotDeliveredPhoto}
                          className="text-[10px] font-bold text-red-600 bg-white border border-red-200 rounded px-2 py-1 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 w-full">
                      <button
                        type="button"
                        onClick={onCaptureNotDeliveredPhoto}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border-2 border-[#EF4444] bg-[#FEF2F2] text-[#EF4444] font-bold text-xs cursor-pointer shadow-sm"
                      >
                        <CameraIcon className="w-3.5 h-3.5 text-[#EF4444]" />
                        <span>Take Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={onUploadNotDeliveredPhoto}
                        className="py-2.5 px-3 rounded-lg border border-[#CBD5E1] bg-white text-[#485563] font-bold text-xs cursor-pointer"
                      >
                        Upload
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. Delivery Record Card */}
            <div className="flex flex-col items-start w-full bg-white p-3.5 rounded-xl border border-[#CBD5E1] gap-1 shadow-sm">
              <span className="text-[#485563] font-semibold text-xs">
                Delivery record ID
              </span>
              <span className="text-[#202D2D] font-bold text-base">
                DEL-S1-T001-001
              </span>
            </div>

            {/* 6. Proof of Delivery (if full or discrepancy) */}
            {deliveryOutcome !== "none" ? (
              <div className="flex flex-col items-start w-full bg-white p-4 rounded-xl border border-[#CBD5E1] gap-3 shadow-sm">
                <div>
                  <span className="text-[#485563] font-bold text-xs uppercase tracking-wider">
                    PROOF OF DELIVERY
                  </span>
                  <p className="text-[#485563] font-medium text-xs mt-0.5">
                    Photo of delivered goods or recipient signature required
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full">
                  {/* Photo Upload / Preview */}
                  {photoFile ? (
                    <div className="flex flex-col justify-center items-center rounded-xl border border-green-400 bg-green-50 p-2 text-center gap-1.5">
                      <img src={photoFile.url} alt="Photo" className="w-12 h-12 rounded object-cover border border-green-300" />
                      <span className="text-[10px] font-bold text-green-800 truncate max-w-[120px]">
                        {photoFile.name}
                      </span>
                      <div className="flex gap-1 items-center">
                        <button
                          type="button"
                          onClick={onSelectPhoto}
                          className="text-[10px] font-bold text-orange-600 bg-white border border-orange-200 rounded px-1.5 py-0.5 cursor-pointer"
                        >
                          Retake
                        </button>
                        <button
                          type="button"
                          onClick={onRemovePhoto}
                          className="text-[10px] font-bold text-red-600 bg-white border border-red-200 rounded px-1.5 py-0.5 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={onSelectPhoto}
                      className="flex flex-col justify-center items-center rounded-xl border-2 border-dashed border-[#F97316] bg-[#FFF4ED] hover:bg-orange-100 text-[#F97316] cursor-pointer p-3 gap-1.5 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-[#F97316]">
                        <CameraIcon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-[#F97316] text-xs">Take Photo</span>
                      <span className="text-[10px] text-slate-500">Goods photo</span>
                    </button>
                  )}

                  {/* Signature Upload / Preview */}
                  {signatureFile ? (
                    <div className="flex flex-col justify-center items-center rounded-xl border border-blue-400 bg-blue-50 p-2 text-center gap-1.5">
                      <img src={signatureFile.url} alt="Signature" className="w-12 h-12 rounded object-contain bg-white border border-blue-300" />
                      <span className="text-[10px] font-bold text-blue-800 truncate max-w-[120px]">
                        {signatureFile.name}
                      </span>
                      <div className="flex gap-1 items-center">
                        <button
                          type="button"
                          onClick={onSelectSignature}
                          className="text-[10px] font-bold text-blue-600 bg-white border border-blue-200 rounded px-1.5 py-0.5 cursor-pointer"
                        >
                          Re-sign
                        </button>
                        <button
                          type="button"
                          onClick={onRemoveSignature}
                          className="text-[10px] font-bold text-red-600 bg-white border border-red-200 rounded px-1.5 py-0.5 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={onSelectSignature}
                      className="flex flex-col justify-center items-center rounded-xl border-2 border-dashed border-[#1D4ED8] bg-blue-50/60 hover:bg-blue-100 text-[#1D4ED8] cursor-pointer p-3 gap-1.5 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#1D4ED8]">
                        <SignatureIcon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-[#1D4ED8] text-xs">Sign on Device</span>
                      <span className="text-[10px] text-slate-500">Digital signature</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Non-delivery notice for mobile */
              <div className="flex flex-col items-start w-full bg-red-50 border border-red-200 rounded-xl p-3.5 gap-2">
                <span className="text-xs font-bold text-red-900">
                  Stock Return to Depot
                </span>
                <p className="text-xs text-red-700 m-0 leading-relaxed">
                  All {expectedQty} units remain aboard PEL-R04 and return to depot for reschedule.
                </p>
              </div>
            )}

            {/* 7. Confirmation Checkbox */}
            <button
              type="button"
              id="mobile-pod-confirm-checkbox"
              onClick={onToggleOrderConfirmed}
              className={`flex items-center gap-3 p-3.5 rounded-xl border-2 w-full cursor-pointer transition-all text-left shadow-sm ${
                orderConfirmed
                  ? "bg-[#ECFDF5] border-[#22C55E] ring-2 ring-[#22C55E]/30"
                  : "bg-white border-[#CBD5E1] hover:border-[#F97316]"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
                  orderConfirmed
                    ? "bg-[#22C55E] border-[#22C55E] text-white"
                    : "border-[#94A3B8] bg-white"
                }`}
              >
                {orderConfirmed ? <span className="font-bold text-xs text-white">✓</span> : null}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#202D2D] leading-tight flex items-center gap-2">
                  <span>
                    {deliveryOutcome === "none"
                      ? "Confirm non-delivery record"
                      : deliveryOutcome === "discrepancy"
                      ? "Confirm delivery with discrepancy"
                      : "Confirm complete order"}
                  </span>
                  {orderConfirmed && (
                    <span className="text-[10px] font-bold text-[#22C55E]">✓ Confirmed</span>
                  )}
                </span>
                <span className="text-[10px] text-[#64748B] leading-tight">
                  {deliveryOutcome === "none"
                    ? "Press this tick before recording not delivered"
                    : deliveryOutcome === "discrepancy"
                    ? "Press this tick before completing with discrepancy"
                    : "Press this tick before clicking Complete Order"}
                </span>
              </div>
            </button>

            {/* 8. Action Button */}
            <button
              id="btn-complete-stop"
              type="button"
              onClick={onPrimaryAction}
              className={`flex flex-row justify-center items-center active:scale-[0.98] rounded-xl border-none cursor-pointer transition-all duration-200 shadow-md w-full py-3.5 px-4 gap-2 text-white font-bold text-sm ${
                deliveryOutcome === "none"
                  ? "bg-[#EF4444] hover:bg-[#dc2626]"
                  : "bg-[#F97316] hover:bg-[#ea6c0a]"
              }`}
            >
              {deliveryOutcome === "none" ? (
                <>
                  <XIcon className="w-4 h-4 text-white" />
                  <span>Record Not Delivered</span>
                </>
              ) : deliveryOutcome === "discrepancy" ? (
                <>
                  <CheckCircleIcon className="w-4 h-4 text-white" />
                  <span>Complete with Discrepancy</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4 text-white" />
                  <span>Complete Order</span>
                </>
              )}
            </button>

            <span className="text-[#485563] font-medium text-xs text-center w-full">
              Saves locally if offline. Syncs when connection is restored.
            </span>
          </div>

          {/* Bottom navigation */}
          <nav
            id="bottom-nav-canvas"
            aria-label="Driver navigation"
            className="flex flex-col items-start bg-white border-t border-[#CBD5E1] shrink-0 w-[390px]"
            style={{ height: 77, boxSizing: "border-box" }}
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
      ) : deliveryStarted ? (
        /* ── MODE 2: ACTIVE ROUTE DELIVERY VIEW ── */
        <>
          <div
            className="absolute flex items-center justify-between"
            style={{ top: 82, left: 19, width: 352 }}
          >
            <div className="flex flex-col">
              <h2
                className="text-[#202D2D] font-bold truncate m-0"
                style={{ fontSize: 18, lineHeight: "26px", maxWidth: 230 }}
              >
                Stop 1: OUT001 / Colpetty Retailer
              </h2>
              <span
                className="text-[#22C55E] font-bold"
                style={{ fontSize: 12, lineHeight: "18px" }}
              >
                Map - route
              </span>
            </div>
            {storeContact?.phone && (
              <a
                href={`tel:${storeContact.phone.replace(/[^+\d]/g, "")}`}
                id="btn-call-store-mobile-live"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ECFDF5] hover:bg-[#DCFCE7] text-[#15803D] border border-[#A7F3D0] text-xs font-bold shadow-sm no-underline active:scale-95 transition-all shrink-0"
                title={`Call Store: ${storeContact.phone}`}
              >
                <PhoneIcon className="w-3.5 h-3.5 text-[#15803D]" />
                <span>Call Store</span>
              </a>
            )}
          </div>

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
            className="absolute flex flex-row items-center justify-between"
            style={{ top: 78, left: 16, width: 358 }}
          >
            <div className="flex flex-col items-start">
              <span
                className="text-[#22C55E] font-bold"
                style={{ fontSize: 12, lineHeight: "18px" }}
              >
                OUTLET DETAILS
              </span>
              <span
                className="text-[#202D2D] font-extrabold truncate"
                style={{ fontSize: 18, lineHeight: "26px", maxWidth: 230 }}
              >
                OUT001 / Colpetty Retailer
              </span>
            </div>
            {storeContact?.phone && (
              <a
                href={`tel:${storeContact.phone.replace(/[^+\d]/g, "")}`}
                id="btn-call-store-mobile-overview"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#ECFDF5] hover:bg-[#DCFCE7] text-[#15803D] border border-[#A7F3D0] text-xs font-bold shadow-sm no-underline active:scale-95 transition-all shrink-0"
                title={`Call Store: ${storeContact.phone}`}
              >
                <PhoneIcon className="w-3.5 h-3.5 text-[#15803D]" />
                <span>Call Store</span>
              </a>
            )}
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
                style={{ fontSize: 13, lineHeight: "20px", width: 250, height: 20 }}
              >
                ✓ Loading Update — Resolved
              </span>
              <span
                className="text-[#485563] font-medium"
                style={{ fontSize: 12, lineHeight: "18px", width: 308, height: 36 }}
              >
                Loading issue reported for order S1-001 at OUT001 / Colpetty Retailer.
              </span>
              <span
                className="text-[#485563] font-medium"
                style={{ fontSize: 12, lineHeight: "18px", width: 308, height: 36 }}
              >
                8 damaged units were replaced before departure. Final quantity verified by the Loader.
              </span>
              <span
                className="text-[#D97706] font-bold"
                style={{ fontSize: 12, lineHeight: "18px", width: 308, height: 18 }}
              >
                No action required.
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
