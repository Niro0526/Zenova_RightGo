"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { activeTripId, LoaderTrip, rememberTrip, supabase } from "@/lib/supabase";
import { CameraModal } from "@/components/driver/today-run/CameraModal";
import {
  ChevronLeftIcon,
  HelpCircleIcon,
  AlertTriangleIcon,
  MinusIcon,
  SettingsIcon,
  CameraIcon,
  BadgeAlertIcon,
} from "./icons";

interface ReportIssueProps {
  onNavigate?: (tab: "assigned-trips" | "load-sequence" | "trip-readiness" | "report-issue" | "back") => void;
}

export default function ReportIssue({ onNavigate }: ReportIssueProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [issueType, setIssueType] = useState<"missing" | "damaged" | "short" | "vehicle">("damaged");
  const [resolution, setResolution] = useState<"replace" | "defer">("replace");
  const [expectedQty, setExpectedQty] = useState<string>("");
  const [affectedQty, setAffectedQty] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [reporter, setReporter] = useState<string>("");
  const [eventTime, setEventTime] = useState<string>("");
  const [notification, setNotification] = useState<string | null>(null);
  const [trips, setTrips] = useState<LoaderTrip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<LoaderTrip | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vehicle problem states
  const [vehicleCategory, setVehicleCategory] = useState<string>("refrigeration");
  const [vehicleSeverity, setVehicleSeverity] = useState<string>("critical");

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadTrips = async () => {
      if (!supabase) {
        setNotification("Supabase is not configured.");
        return;
      }

      let { data, error } = await supabase
        .from("trips")
        .select("*")
        .order("departure_time", { ascending: true });

      if (cancelled) return;
      if (error) {
        const fallback = await supabase.from("trips").select("*");
        data = fallback.data;
        error = fallback.error;
      }
      if (error) {
        setNotification("Unable to load trips right now.");
        setTrips([]);
        return;
      }

      const availableTrips = (data ?? []) as LoaderTrip[];
      const requestedTrip = activeTripId();
      const initialTrip =
        availableTrips.find(
          (trip) =>
            String(trip.id) === requestedTrip ||
            String(trip.trip_code ?? "") === requestedTrip,
        ) ?? availableTrips[0] ?? null;

      setTrips(availableTrips);
      setSelectedTrip(initialTrip);
      setSelectedTripId(initialTrip ? String(initialTrip.id) : "");
      if (initialTrip) rememberTrip(String(initialTrip.id));
    };

    void loadTrips();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    setEventTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`);
  }, []);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
      setSelectedFile(file);
    }
  };

  const handleCameraCapture = async (captured: { name: string; url: string }) => {
    setSelectedImage(captured.url);
    try {
      const response = await fetch(captured.url);
      if (!response.ok) throw new Error("Captured photo could not be read.");
      const blob = await response.blob();
      setSelectedFile(new File([blob], captured.name, { type: blob.type || "image/jpeg" }));
    } catch (error) {
      setSelectedFile(null);
      console.warn("Camera evidence attachment skipped:", error);
      setNotification("Photo preview attached, but upload will be skipped if unavailable.");
    }
  };

  const handleTripChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextTrip = trips.find((trip) => String(trip.id) === e.target.value) ?? null;
    setSelectedTrip(nextTrip);
    setSelectedTripId(nextTrip ? String(nextTrip.id) : "");
    if (nextTrip) rememberTrip(String(nextTrip.id));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!supabase) {
      setNotification("Supabase is not configured.");
      return;
    }
    if (!selectedTripId) {
      setNotification("Select a trip before reporting an issue.");
      return;
    }

    setIsSubmitting(true);
    let evidenceUrl: string | null = null;
    let evidenceUploadSkipped = false;
    try {
      if (selectedFile) {
        const extension = selectedFile.name.split(".").pop() || "jpg";
        const evidencePath = `${selectedTripId}/${Date.now()}.${extension}`;
        try {
          const upload = await supabase.storage
            .from("issue-evidence")
            .upload(evidencePath, selectedFile, { upsert: false });
          if (!upload.error) {
            evidenceUrl = supabase.storage
              .from("issue-evidence")
              .getPublicUrl(evidencePath).data.publicUrl || null;
          } else {
            evidenceUploadSkipped = true;
            console.warn("Issue evidence upload skipped:", upload.error.message);
          }
        } catch (uploadError) {
          evidenceUploadSkipped = true;
          console.warn(
            "Issue evidence upload skipped:",
            uploadError instanceof Error ? uploadError.message : uploadError,
          );
        }
      }

      const severity =
        issueType === "vehicle"
          ? vehicleSeverity
          : issueType === "damaged"
            ? "high"
            : "medium";
      const affectedQuantity = Number(affectedQty);
      const shortfall = await supabase.from("shortfalls").insert({
        trip_id: selectedTripId,
        issue_type: issueType,
        category: issueType === "vehicle" ? vehicleCategory : issueType,
        severity,
        quantity_affected: issueType === "vehicle" || !Number.isFinite(affectedQuantity) ? null : affectedQuantity,
        notes,
        evidence_url: evidenceUrl || null,
        status: "open",
        location: selectedTrip?.bay ?? null,
        reported_by: reporter || null,
      });
      if (shortfall.error) throw shortfall.error;

      const tripUpdate = selectedTrip?.id
        ? await supabase.from("trips").update({ status: "hold" }).eq("id", selectedTrip.id)
        : await supabase.from("trips").update({ status: "hold" }).eq("trip_code", selectedTripId);
      if (tripUpdate.error) throw tripUpdate.error;

      setNotification(
        evidenceUploadSkipped
          ? "Issue reported successfully. Evidence upload was unavailable, but the report was saved."
          : "Issue reported successfully to dispatch! Trip status updated.",
      );
    } catch (error) {
      setNotification(
        `Unable to report issue: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    const tripReference = String(selectedTrip?.trip_code || selectedTripId);
    setTimeout(() => {
      router.push(`/loader/trip-readiness?trip_id=${encodeURIComponent(tripReference)}`);
    }, 1500);
  };

  return (
    <main className="w-full max-w-full overflow-x-hidden bg-[#F9FAFB] flex flex-col box-border">
      {/* Hidden File Input for Camera and Gallery */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleImageChange}
        className="hidden"
      />

      {/* Mobile Top Navigation Bar */}
      <div className="flex lg:hidden items-center px-4 h-14 bg-white border-b border-[#CBD5E1] sticky top-0 z-30">
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
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-[#202D2D] text-white px-4 py-2.5 rounded-lg text-xs font-semibold z-50 shadow-xl border border-gray-700 text-center max-w-[90%]">
          {notification}
        </div>
      )}

      {/* Content Container */}
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 box-border p-4 lg:p-6">
        {/* Desktop Header */}
        <div className="hidden lg:flex flex-col">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight m-0">
            Report Issue
          </h1>
          <p className="text-sm text-slate-500 mt-1 m-0 font-normal">
            Loading shortfall before departure - fast issue logging to alert dispatch and operations
          </p>
        </div>

        {/* Desktop Context Bar */}
        <div className="hidden lg:grid lg:grid-cols-4 bg-white rounded-xl p-4 gap-4 border border-[#CBD5E1] shadow-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold text-[#485563] uppercase tracking-wide">
              Active Trip
            </span>
            <select
              value={selectedTripId}
              onChange={handleTripChange}
              disabled={!trips.length}
              className="bg-transparent text-sm font-bold text-[#202D2D] focus:outline-none"
            >
              {!trips.length && <option value="">No trips available</option>}
              {trips.map((trip) => (
                <option key={String(trip.id)} value={String(trip.id)}>
                  {String(trip.vehicle_id ?? "Vehicle")} / {String(trip.trip_code ?? trip.id)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold text-[#485563] uppercase tracking-wide">
              Vehicle
            </span>
            <span className="text-sm font-bold text-[#202D2D]">
              {String(selectedTrip?.vehicle_id ?? "—")}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold text-[#485563] uppercase tracking-wide">
              Outlet
            </span>
            <span className="text-sm font-semibold text-[#485563] truncate">
              {issueType === "vehicle" ? "N/A (Fleet Issue)" : "Assigned outlet"}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold text-[#485563] uppercase tracking-wide">
              Order Ref
            </span>
            <span className="font-jetbrains text-sm font-bold text-[#202D2D]">
              {issueType === "vehicle" ? "N/A" : "Assigned order"}
            </span>
          </div>
        </div>

        {/* Mobile Context Box */}
        <div className="flex lg:hidden flex-col bg-white rounded-lg p-3 gap-1 border border-[#CBD5E1]">
          <select
            value={selectedTripId}
            onChange={handleTripChange}
            disabled={!trips.length}
            className="w-full bg-transparent text-[13px] font-semibold text-[#202D2D] focus:outline-none"
          >
            {!trips.length && <option value="">No trips available</option>}
            {trips.map((trip) => (
              <option key={String(trip.id)} value={String(trip.id)}>
                {String(trip.vehicle_id ?? "Vehicle")} / {String(trip.trip_code ?? trip.id)}
              </option>
            ))}
          </select>
          <span className="text-[13px] font-semibold text-[#202D2D] leading-5">
            Trip: {String(selectedTrip?.vehicle_id ?? "—")} / {String(selectedTrip?.trip_code ?? selectedTrip?.id ?? "—")} {issueType !== "vehicle" && "· Order: Assigned order"}
          </span>
          {issueType !== "vehicle" && (
            <span className="text-[13px] font-semibold text-[#202D2D] leading-5">
              Outlet: Assigned outlet
            </span>
          )}
        </div>

        {/* Issue Type Section */}
        <div className="flex flex-col gap-2 lg:gap-3 w-full">
          <label className="text-[13px] font-bold text-[#485563]">
            Select Issue Type
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
            <button
              type="button"
              onClick={() => setIssueType("missing")}
              className={`flex flex-col items-center justify-center p-3 lg:p-4 gap-2 rounded-xl transition-all min-w-0 ${
                issueType === "missing"
                  ? "bg-white border-2 border-[#F97316] shadow-sm"
                  : "bg-white border border-[#CBD5E1] hover:border-gray-400"
              }`}
            >
              <HelpCircleIcon className="w-5 h-5 lg:w-6 lg:h-6 text-[#485563]" />
              <span className="text-xs lg:text-sm font-bold text-[#202D2D] truncate">
                Missing
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIssueType("damaged")}
              className={`flex flex-col items-center justify-center p-3 lg:p-4 gap-2 rounded-xl transition-all min-w-0 ${
                issueType === "damaged"
                  ? "bg-white border-2 border-[#F97316] shadow-sm"
                  : "bg-white border border-[#CBD5E1] hover:border-gray-400"
              }`}
            >
              <AlertTriangleIcon className="w-5 h-5 lg:w-6 lg:h-6 text-[#F59E0B]" />
              <span className="text-xs lg:text-sm font-bold text-[#202D2D] truncate">
                Damaged
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIssueType("short")}
              className={`flex flex-col items-center justify-center p-3 lg:p-4 gap-2 rounded-xl transition-all min-w-0 ${
                issueType === "short"
                  ? "bg-white border-2 border-[#F97316] shadow-sm"
                  : "bg-white border border-[#CBD5E1] hover:border-gray-400"
              }`}
            >
              <MinusIcon className="w-5 h-5 lg:w-6 lg:h-6 text-[#485563]" />
              <span className="text-xs lg:text-sm font-bold text-[#202D2D] truncate">
                Short Quantity
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIssueType("vehicle")}
              className={`flex flex-col items-center justify-center p-3 lg:p-4 gap-2 rounded-xl transition-all min-w-0 ${
                issueType === "vehicle"
                  ? "bg-white border-2 border-[#F97316] shadow-sm"
                  : "bg-white border border-[#CBD5E1] hover:border-gray-400"
              }`}
            >
              <SettingsIcon className="w-5 h-5 lg:w-6 lg:h-6 text-[#485563]" />
              <span className="text-xs lg:text-sm font-bold text-[#202D2D] truncate">
                Vehicle Problem
              </span>
            </button>
          </div>
        </div>

        {/* DESKTOP TWO-COLUMN LAYOUT */}
        <div className="hidden lg:flex flex-col lg:flex-row gap-6 w-full items-start">
          {/* Left Column */}
          <div className="flex-1 min-w-0 w-full flex flex-col gap-5">
            {/* DISCREPANCY / PROBLEM DETAILS */}
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-4 shadow-sm">
              <div className="pb-3 border-b border-[#F1F5F9]">
                <h2 className="text-[17px] lg:text-[18px] font-bold text-[#202D2D] leading-[24px] m-0">
                  {issueType === "vehicle" ? "Vehicle Problem Details" : "Discrepancy Details"}
                </h2>
                <p className="text-xs text-[#485563] m-0">
                  {issueType === "vehicle"
                    ? `Record vehicle or equipment issue for vehicle ${String(selectedTrip?.vehicle_id ?? "—")}`
                    : `Record observed shortage or stock damage for trip ${String(selectedTrip?.trip_code ?? selectedTrip?.id ?? "—")}`}
                </p>
              </div>

              {issueType === "vehicle" ? (
                /* VEHICLE PROBLEM FIELDS */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#485563] uppercase tracking-wide">
                      Problem Category
                    </label>
                    <select
                      value={vehicleCategory}
                      onChange={(e) => setVehicleCategory(e.target.value)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-sm font-semibold text-[#202D2D] focus:outline-none focus:border-[#F97316]"
                    >
                      <option value="refrigeration">Refrigeration / Chiller Failure</option>
                      <option value="engine">Engine / Mechanical Issue</option>
                      <option value="tailgate">Tailgate / Ramp Issue</option>
                      <option value="tire">Tire / Brake Issue</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#485563] uppercase tracking-wide">
                      Severity Level
                    </label>
                    <select
                      value={vehicleSeverity}
                      onChange={(e) => setVehicleSeverity(e.target.value)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-sm font-semibold text-[#202D2D] focus:outline-none focus:border-[#F97316]"
                    >
                      <option value="critical">Critical (Vehicle Unusable)</option>
                      <option value="minor">Minor (Delay Departure)</option>
                    </select>
                  </div>
                </div>
              ) : (
                /* CARGO DISCREPANCY FIELDS */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#485563] uppercase tracking-wide">
                      Expected Quantity
                    </label>
                    <input
                      type="text"
                      value={expectedQty}
                      onChange={(e) => setExpectedQty(e.target.value)}
                      placeholder="e.g. 80 units"
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-sm font-semibold text-[#202D2D] focus:outline-none focus:border-[#F97316] transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#485563] uppercase tracking-wide">
                      Affected Quantity
                    </label>
                    <input
                      type="text"
                      value={affectedQty}
                      onChange={(e) => setAffectedQty(e.target.value)}
                      placeholder="e.g. 8 units"
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2.5 text-sm font-semibold text-[#202D2D] focus:outline-none focus:border-[#F97316] transition-colors"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#485563] uppercase tracking-wide">
                  Defect Notes & Observations
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={issueType === "vehicle" ? "Enter vehicle malfunction details..." : "Enter defect notes, observed damages, or shortfall details..."}
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg p-3 text-sm text-[#202D2D] focus:outline-none focus:border-[#F97316] transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#485563] uppercase tracking-wide">
                    Reporter
                  </label>
                  <input
                    type="text"
                    value={reporter}
                    onChange={(e) => setReporter(e.target.value)}
                    placeholder="e.g. Loader Name / Shift ID"
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2 text-xs font-semibold text-[#202D2D] focus:outline-none focus:border-[#F97316] transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#485563] uppercase tracking-wide">
                    Event Time
                  </label>
                  <input
                    type="text"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    placeholder="YYYY-MM-DD HH:mm"
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg p-2 text-xs font-jetbrains font-semibold text-[#202D2D] focus:outline-none focus:border-[#F97316] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* ITEM SPECIFICATIONS (ONLY SHOW FOR CARGO ISSUES) */}
            {issueType !== "vehicle" && (
              <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-3 shadow-sm">
                <div className="pb-2.5 border-b border-[#F1F5F9] flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#202D2D] m-0">
                    Item Specifications & Cold Chain Data
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8]">
                    COLD CHAIN
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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
            )}
          </div>

          {/* Right Column */}
          <div className="w-full lg:w-[360px] xl:w-[400px] shrink-0 flex flex-col gap-5">
            {/* PHOTO EVIDENCE WITH REAL UPLOAD / CAMERA */}
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-3 shadow-sm">
              <div className="flex justify-between items-center pb-2.5 border-b border-[#F1F5F9]">
                <div>
                  <h3 className="text-sm font-bold text-[#202D2D] m-0">
                    Photo Evidence
                  </h3>
                  <p className="text-xs text-[#485563] m-0">
                    Attach photo of damage or barcode
                  </p>
                </div>
                <span className="text-[11px] font-bold text-[#F97316] bg-[#FFF4ED] px-2 py-0.5 rounded">
                  REQUIRED
                </span>
              </div>

              <div
                className="w-full bg-[#FAFAFA] border-2 border-dashed border-[#CBD5E1] rounded-xl flex flex-col items-center justify-center p-4 gap-2 cursor-pointer hover:border-[#F97316] hover:bg-orange-50/20 transition-all min-h-[140px] overflow-hidden"
                onClick={() => setShowCameraModal(true)}
              >
                {selectedImage ? (
                  <div className="relative w-full h-32 flex items-center justify-center">
                    <img
                      src={selectedImage}
                      alt="Uploaded Evidence"
                      className="max-h-full max-w-full object-contain rounded-lg"
                    />
                    <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded">
                      Tap to Change
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-[#F3F4F6] text-[#485563] flex items-center justify-center">
                      <CameraIcon className="w-6 h-6 text-[#485563]" />
                    </div>
                    <div className="text-center flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-[#202D2D]">
                        Click to upload photo or tap to capture
                      </span>
                      <span className="text-[11px] text-[#64748B]">
                        JPG, PNG, WEBP (Max 10MB)
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#485563] pt-1">
                <span>✓ Barcode visible</span>
                <span>✓ Damaged seal</span>
                <span>✓ Pallet label</span>
              </div>
            </div>

            {/* RESOLUTION OPTIONS */}
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-3 shadow-sm">
              <div className="pb-2.5 border-b border-[#F1F5F9]">
                <h3 className="text-sm font-bold text-[#202D2D] m-0">
                  Resolution Options
                </h3>
                <p className="text-xs text-[#485563] m-0">
                  Select recommended handling for Dispatch
                </p>
              </div>

              {issueType === "vehicle" ? (
                /* VEHICLE RESOLUTIONS */
                <div className="grid grid-cols-1 gap-3">
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
                      <span className="text-xs font-bold text-[#202D2D]">Reassign to Backup Vehicle</span>
                      {resolution === "replace" && (
                        <span className="w-4 h-4 rounded-full bg-[#F97316] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#485563] leading-4">
                      Transfer staged cargo to available vehicle in Peliyagoda
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
                      <span className="text-xs font-bold text-[#202D2D]">Send Vehicle to Workshop</span>
                      {resolution === "defer" && (
                        <span className="w-4 h-4 rounded-full bg-[#F97316] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#485563] leading-4">
                      Hold departure and flag vehicle status as in_workshop
                    </span>
                  </button>
                </div>
              ) : (
                /* CARGO RESOLUTIONS */
                <div className="grid grid-cols-1 gap-3">
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
                      Requisition replacement units from buffer immediately
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
                      Move the selected order to the next scheduled delivery wave
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 p-4 bg-[#FFF4ED] border border-[#FDBA74] rounded-xl shadow-xs">
              <BadgeAlertIcon className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-[#92400E]">
                  Dispatcher Notification & Trip Hold
                </span>
                <span className="text-xs text-[#78350F] leading-relaxed">
                  Dispatch will be notified immediately. Trip {String(selectedTrip?.trip_code ?? selectedTrip?.id ?? "—")} will be placed on <strong>HOLD</strong> until cleared.
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full py-3 bg-white hover:bg-gray-100 border border-[#CBD5E1] rounded-xl font-bold text-sm text-[#485563] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <span>Report Shortfall</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE SEQUENTIAL LAYOUT */}
        <div className="flex lg:hidden flex-col gap-4 w-full">
          {issueType === "vehicle" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-[#202D2D]">
                  Problem Category
                </label>
                <select
                  value={vehicleCategory}
                  onChange={(e) => setVehicleCategory(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg p-3 text-sm text-[#202D2D] focus:outline-none focus:border-[#F97316]"
                >
                  <option value="refrigeration">Refrigeration / Chiller Failure</option>
                  <option value="engine">Engine / Mechanical Issue</option>
                  <option value="tailgate">Tailgate / Ramp Issue</option>
                  <option value="tire">Tire / Brake Issue</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-[#202D2D]">
                  Severity Level
                </label>
                <select
                  value={vehicleSeverity}
                  onChange={(e) => setVehicleSeverity(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg p-3 text-sm text-[#202D2D] focus:outline-none focus:border-[#F97316]"
                >
                  <option value="critical">Critical (Vehicle Unusable)</option>
                  <option value="minor">Minor (Delay Departure)</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-[#202D2D]">
                  Expected Quantity
                </label>
                <input
                  type="text"
                  value={expectedQty}
                  onChange={(e) => setExpectedQty(e.target.value)}
                  placeholder="e.g. 80 units"
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg p-3 text-sm text-[#202D2D] focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-[#202D2D]">
                  Reported Affected Quantity
                </label>
                <input
                  type="text"
                  value={affectedQty}
                  onChange={(e) => setAffectedQty(e.target.value)}
                  placeholder="e.g. 8 units"
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg p-3 text-sm text-[#202D2D] focus:outline-none focus:border-[#F97316]"
                />
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-[#202D2D]">
              Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={issueType === "vehicle" ? "Describe vehicle malfunction..." : "Enter defect notes or observations..."}
              className="w-full bg-white border border-[#CBD5E1] rounded-lg p-3 text-sm text-[#202D2D] focus:outline-none focus:border-[#F97316] resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[#202D2D]">
              Photo Proof (Optional)
            </label>
            <div
              className="w-full bg-white border border-dashed border-[#CBD5E1] rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-[#F97316] min-h-[90px] overflow-hidden"
              onClick={() => setShowCameraModal(true)}
            >
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt="Uploaded Evidence"
                  className="max-h-24 object-contain rounded-lg"
                />
              ) : (
                <>
                  <CameraIcon className="w-6 h-6 text-[#485563]" />
                  <span className="text-xs font-medium text-[#485563] text-center">
                    Tap to capture or upload
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 mt-1 w-full">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-11 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-sm rounded-lg flex items-center justify-center transition-colors"
            >
              Report Shortfall
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="text-[#485563] font-semibold text-sm underline py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
      <CameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={(captured) => {
          void handleCameraCapture(captured);
        }}
        title="Capture Issue Evidence"
        subtitle="Take a photo of the shortfall, damage, or vehicle issue"
      />
    </main>
  );
}