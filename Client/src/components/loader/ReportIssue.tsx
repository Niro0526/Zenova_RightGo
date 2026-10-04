"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  fetchLatestManifest,
  fetchLoadingSequence,
  postLoadingIssue,
  postLoadingIssueAction,
  uploadLoadingIssueEvidence,
  type ManifestResponse,
  type ManifestTripSnapshot,
} from "@/lib/loader/loader-api";
import { ApiError } from "@/lib/api/client";
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

type OrderOption = { orderRef: string; outletId: string; outletName: string; plannedUnits: number };

export default function ReportIssue({ onNavigate }: ReportIssueProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [issueType, setIssueType] = useState<"missing" | "damaged" | "short" | "vehicle">("damaged");
  const [resolution, setResolution] = useState<"replace" | "defer">("replace");
  const [affectedQty, setAffectedQty] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [notification, setNotification] = useState<string | null>(null);
  const [manifest, setManifest] = useState<ManifestResponse | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<ManifestTripSnapshot | null>(null);
  const [orderOptions, setOrderOptions] = useState<OrderOption[]>([]);
  const [selectedOrderRef, setSelectedOrderRef] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vehicle problem free-text category/severity - folded into notes since
  // the backend has no dedicated columns for them.
  const [vehicleCategory, setVehicleCategory] = useState<string>("refrigeration");
  const [vehicleSeverity, setVehicleSeverity] = useState<string>("critical");

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadOrdersForTrip = useCallback(async (trip: ManifestTripSnapshot) => {
    try {
      const seq = await fetchLoadingSequence(trip.id);
      const options: OrderOption[] = seq.loadingSequence.flatMap((step) =>
        step.orders.map((o) => ({ orderRef: o.orderRef, outletId: step.outletId, outletName: step.outletName, plannedUnits: o.plannedUnits }))
      );
      setOrderOptions(options);
      setSelectedOrderRef(options[0]?.orderRef ?? "");
    } catch {
      setOrderOptions([]);
      setSelectedOrderRef("");
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedId = Number(params.get("tripId") || params.get("trip_id") || NaN);

    (async () => {
      try {
        const m = await fetchLatestManifest();
        setManifest(m);
        if (!m || m.trips.length === 0) {
          setNotification("No released trips available to report an issue against.");
          return;
        }
        const initial = m.trips.find((t) => t.id === requestedId) ?? m.trips[0];
        setSelectedTrip(initial);
        await loadOrdersForTrip(initial);
      } catch (err) {
        setNotification(err instanceof ApiError ? err.message : "Cannot reach the RightGo server.");
      }
    })();
  }, [loadOrdersForTrip]);

  const handleBack = () => {
    if (onNavigate) onNavigate("back");
    else if (typeof window !== "undefined" && (window.history.state?.idx > 0 || window.history.length > 1)) router.back();
    else router.push("/loader/load-sequence");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(URL.createObjectURL(file));
      setSelectedFile(file);
    }
  };

  const handleTripChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = manifest?.trips.find((t) => String(t.id) === e.target.value) ?? null;
    setSelectedTrip(next);
    if (next) void loadOrdersForTrip(next);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedTrip) {
      setNotification("Select a trip before reporting an issue.");
      return;
    }
    const order = orderOptions.find((o) => o.orderRef === selectedOrderRef);
    if (!order && issueType !== "vehicle") {
      setNotification("Select an order before reporting an issue.");
      return;
    }
    // A vehicle-level problem still needs a real order/outlet to anchor the
    // issue record to this trip (the backend requires one) - the first
    // order on the trip serves that anchor; the vehicle detail lives in notes.
    const anchor = order ?? orderOptions[0];
    if (!anchor) {
      setNotification("This trip has no orders to report an issue against.");
      return;
    }

    setIsSubmitting(true);
    try {
      let combinedNotes = notes;
      if (issueType === "vehicle") {
        combinedNotes = `Vehicle problem - category: ${vehicleCategory}, severity: ${vehicleSeverity}. ${notes}`.trim();
      }

      if (selectedFile) {
        try {
          const base64 = await fileToBase64(selectedFile);
          const upload = await uploadLoadingIssueEvidence(base64, `${selectedTrip.vehicleId}-${anchor.orderRef}`, selectedFile.name);
          combinedNotes = `${combinedNotes} [Evidence: ${upload.storagePath}]`.trim();
        } catch (uploadErr) {
          console.warn("Evidence upload failed, continuing without it:", uploadErr);
        }
      }

      const issueTypeMapped = issueType === "vehicle" ? "vehicle_problem" : issueType;
      const issue = await postLoadingIssue({
        manifest_version: manifest?.version ?? 1,
        vehicle_id: selectedTrip.vehicleId,
        trip_no: selectedTrip.tripNo,
        order_ref: anchor.orderRef,
        outlet_id: anchor.outletId,
        issue_type: issueTypeMapped,
        units_affected: issueType === "vehicle" ? 0 : Number(affectedQty) || 0,
        notes: combinedNotes,
      });

      const action = resolution === "replace" ? "replace_from_stock" : "send_to_dispatcher";
      await postLoadingIssueAction(issue.id, action, combinedNotes);

      setNotification("Issue reported successfully to dispatch! Trip placed on hold.");
    } catch (err) {
      setNotification(err instanceof ApiError ? err.message : "Unable to report issue.");
      setIsSubmitting(false);
      return;
    }

    setTimeout(() => handleBack(), 1500);
  };

  return (
    <main className="w-full max-w-full overflow-x-hidden bg-[#F9FAFB] flex flex-col box-border">
      <input type="file" ref={fileInputRef} accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />

      <div className="flex lg:hidden items-center px-4 h-14 bg-white border-b border-[#CBD5E1] sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button type="button" className="p-1 text-[#202D2D] hover:bg-gray-100 rounded-md transition-colors" onClick={handleBack} title="Back to Load Sequence">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-[#202D2D] leading-[27px] m-0">Report Issue</h1>
        </div>
      </div>

      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-[#202D2D] text-white px-4 py-2.5 rounded-lg text-xs font-semibold z-50 shadow-xl border border-gray-700 text-center max-w-[90%]">
          {notification}
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 box-border p-4 lg:p-6">
        <div className="hidden lg:flex flex-col">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight m-0">Report Issue</h1>
          <p className="text-sm text-slate-500 mt-1 m-0 font-normal">
            Loading shortfall before departure - fast issue logging to alert dispatch and operations
          </p>
        </div>

        {/* Desktop Context Bar */}
        <div className="hidden lg:grid lg:grid-cols-3 bg-white rounded-xl p-4 gap-4 border border-[#CBD5E1] shadow-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold text-[#485563] uppercase tracking-wide">Active Trip</span>
            <select
              value={selectedTrip ? String(selectedTrip.id) : ""}
              onChange={handleTripChange}
              disabled={!manifest?.trips.length}
              className="bg-transparent text-sm font-bold text-[#202D2D] focus:outline-none"
            >
              {!manifest?.trips.length && <option value="">No trips available</option>}
              {manifest?.trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.vehicleId} / {t.tripId}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold text-[#485563] uppercase tracking-wide">Vehicle</span>
            <span className="text-sm font-bold text-[#202D2D]">{selectedTrip?.vehicleId ?? "-"}</span>
          </div>

          {issueType !== "vehicle" && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold text-[#485563] uppercase tracking-wide">Order / Outlet</span>
              <select
                value={selectedOrderRef}
                onChange={(e) => setSelectedOrderRef(e.target.value)}
                disabled={!orderOptions.length}
                className="bg-transparent text-sm font-bold text-[#202D2D] focus:outline-none"
              >
                {!orderOptions.length && <option value="">No orders</option>}
                {orderOptions.map((o) => (
                  <option key={o.orderRef} value={o.orderRef}>
                    {o.orderRef} - {o.outletName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Mobile Context Box */}
        <div className="flex lg:hidden flex-col bg-white rounded-lg p-3 gap-2 border border-[#CBD5E1]">
          <select
            value={selectedTrip ? String(selectedTrip.id) : ""}
            onChange={handleTripChange}
            disabled={!manifest?.trips.length}
            className="w-full bg-transparent text-[13px] font-semibold text-[#202D2D] focus:outline-none"
          >
            {!manifest?.trips.length && <option value="">No trips available</option>}
            {manifest?.trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.vehicleId} / {t.tripId}
              </option>
            ))}
          </select>
          {issueType !== "vehicle" && (
            <select
              value={selectedOrderRef}
              onChange={(e) => setSelectedOrderRef(e.target.value)}
              disabled={!orderOptions.length}
              className="w-full bg-transparent text-[13px] font-semibold text-[#202D2D] focus:outline-none"
            >
              {!orderOptions.length && <option value="">No orders</option>}
              {orderOptions.map((o) => (
                <option key={o.orderRef} value={o.orderRef}>
                  {o.orderRef} - {o.outletName}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Issue Type Section */}
        <div className="flex flex-col gap-2 lg:gap-3 w-full">
          <label className="text-[13px] font-bold text-[#485563]">Select Issue Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
            {([
              { id: "missing", label: "Missing", icon: HelpCircleIcon, color: "text-[#485563]" },
              { id: "damaged", label: "Damaged", icon: AlertTriangleIcon, color: "text-[#F59E0B]" },
              { id: "short", label: "Short Quantity", icon: MinusIcon, color: "text-[#485563]" },
              { id: "vehicle", label: "Vehicle Problem", icon: SettingsIcon, color: "text-[#485563]" },
            ] as const).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setIssueType(opt.id)}
                className={`flex flex-col items-center justify-center p-3 lg:p-4 gap-2 rounded-xl transition-all min-w-0 ${
                  issueType === opt.id ? "bg-white border-2 border-[#F97316] shadow-sm" : "bg-white border border-[#CBD5E1] hover:border-gray-400"
                }`}
              >
                <opt.icon className={`w-5 h-5 lg:w-6 lg:h-6 ${opt.color}`} />
                <span className="text-xs lg:text-sm font-bold text-[#202D2D] truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* DESKTOP TWO-COLUMN LAYOUT */}
        <div className="hidden lg:flex flex-col lg:flex-row gap-6 w-full items-start">
          <div className="flex-1 min-w-0 w-full flex flex-col gap-5">
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-4 shadow-sm">
              <div className="pb-3 border-b border-[#F1F5F9]">
                <h2 className="text-[17px] lg:text-[18px] font-bold text-[#202D2D] leading-[24px] m-0">
                  {issueType === "vehicle" ? "Vehicle Problem Details" : "Discrepancy Details"}
                </h2>
                <p className="text-xs text-[#485563] m-0">
                  {issueType === "vehicle"
                    ? `Record vehicle or equipment issue for vehicle ${selectedTrip?.vehicleId ?? "-"}`
                    : `Record observed shortage or stock damage for trip ${selectedTrip?.tripId ?? "-"}`}
                </p>
              </div>

              {issueType === "vehicle" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#485563] uppercase tracking-wide">Problem Category</label>
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
                    <label className="text-xs font-bold text-[#485563] uppercase tracking-wide">Severity Level</label>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#485563] uppercase tracking-wide">Planned Units</label>
                    <input
                      type="text"
                      readOnly
                      value={orderOptions.find((o) => o.orderRef === selectedOrderRef)?.plannedUnits ?? ""}
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-2.5 text-sm font-semibold text-[#202D2D]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#485563] uppercase tracking-wide">Affected Quantity</label>
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
                <label className="text-xs font-bold text-[#485563] uppercase tracking-wide">Defect Notes & Observations</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={issueType === "vehicle" ? "Enter vehicle malfunction details..." : "Enter defect notes, observed damages, or shortfall details..."}
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg p-3 text-sm text-[#202D2D] focus:outline-none focus:border-[#F97316] transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="w-full lg:w-[360px] xl:w-[400px] shrink-0 flex flex-col gap-5">
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-3 shadow-sm">
              <div className="flex justify-between items-center pb-2.5 border-b border-[#F1F5F9]">
                <div>
                  <h3 className="text-sm font-bold text-[#202D2D] m-0">Photo Evidence</h3>
                  <p className="text-xs text-[#485563] m-0">Attach photo of damage or barcode (optional)</p>
                </div>
              </div>

              <div
                className="w-full bg-[#FAFAFA] border-2 border-dashed border-[#CBD5E1] rounded-xl flex flex-col items-center justify-center p-4 gap-2 cursor-pointer hover:border-[#F97316] hover:bg-orange-50/20 transition-all min-h-[140px] overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedImage ? (
                  <div className="relative w-full h-32 flex items-center justify-center">
                    <img src={selectedImage} alt="Uploaded Evidence" className="max-h-full max-w-full object-contain rounded-lg" />
                    <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded">Tap to Change</span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-[#F3F4F6] text-[#485563] flex items-center justify-center">
                      <CameraIcon className="w-6 h-6 text-[#485563]" />
                    </div>
                    <div className="text-center flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-[#202D2D]">Click to upload photo or tap to capture</span>
                      <span className="text-[11px] text-[#64748B]">JPG, PNG, WEBP (Max 10MB)</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-3 shadow-sm">
              <div className="pb-2.5 border-b border-[#F1F5F9]">
                <h3 className="text-sm font-bold text-[#202D2D] m-0">Resolution Options</h3>
                <p className="text-xs text-[#485563] m-0">Select recommended handling for Dispatch</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setResolution("replace")}
                  className={`p-3.5 rounded-xl text-left flex flex-col gap-1 transition-all ${
                    resolution === "replace" ? "bg-[#FFF4ED] border-2 border-[#F97316] text-[#202D2D] shadow-xs" : "bg-white border border-[#CBD5E1] text-[#485563] hover:border-gray-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#202D2D]">{issueType === "vehicle" ? "Reassign to Backup Vehicle" : "Replace affected stock"}</span>
                    {resolution === "replace" && <span className="w-4 h-4 rounded-full bg-[#F97316] text-white flex items-center justify-center text-[10px] font-bold">OK</span>}
                  </div>
                  <span className="text-[11px] text-[#485563] leading-4">
                    {issueType === "vehicle" ? "Transfer staged cargo to an available vehicle" : "Requisition replacement units from buffer immediately"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setResolution("defer")}
                  className={`p-3.5 rounded-xl text-left flex flex-col gap-1 transition-all ${
                    resolution === "defer" ? "bg-[#FFF4ED] border-2 border-[#F97316] text-[#202D2D] shadow-xs" : "bg-white border border-[#CBD5E1] text-[#485563] hover:border-gray-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#202D2D]">{issueType === "vehicle" ? "Send Vehicle to Workshop" : "Defer entire order"}</span>
                    {resolution === "defer" && <span className="w-4 h-4 rounded-full bg-[#F97316] text-white flex items-center justify-center text-[10px] font-bold">OK</span>}
                  </div>
                  <span className="text-[11px] text-[#485563] leading-4">Sends to Central Dispatch for review and decision.</span>
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-[#FFF4ED] border border-[#FDBA74] rounded-xl shadow-xs">
              <BadgeAlertIcon className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-[#92400E]">Dispatcher Notification & Trip Hold</span>
                <span className="text-xs text-[#78350F] leading-relaxed">
                  Dispatch will be notified immediately. Trip {selectedTrip?.tripId ?? "-"} will be placed on <strong>HOLD</strong> until cleared.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button type="button" onClick={handleBack} className="w-full py-3 bg-white hover:bg-gray-100 border border-[#CBD5E1] rounded-xl font-bold text-sm text-[#485563] transition-colors">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-3 bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? "Submitting..." : "Report Issue"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE SEQUENTIAL LAYOUT */}
        <div className="flex lg:hidden flex-col gap-4 w-full">
          {issueType === "vehicle" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-[#202D2D]">Problem Category</label>
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
                <label className="text-[13px] font-bold text-[#202D2D]">Severity Level</label>
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
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-[#202D2D]">Affected Quantity</label>
              <input
                type="text"
                value={affectedQty}
                onChange={(e) => setAffectedQty(e.target.value)}
                placeholder="e.g. 8 units"
                className="w-full bg-white border border-[#CBD5E1] rounded-lg p-3 text-sm text-[#202D2D] focus:outline-none focus:border-[#F97316]"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-[#202D2D]">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={issueType === "vehicle" ? "Describe vehicle malfunction..." : "Enter defect notes or observations..."}
              className="w-full bg-white border border-[#CBD5E1] rounded-lg p-3 text-sm text-[#202D2D] focus:outline-none focus:border-[#F97316] resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[#202D2D]">Photo Proof (Optional)</label>
            <div
              className="w-full bg-white border border-dashed border-[#CBD5E1] rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-[#F97316] min-h-[90px] overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedImage ? (
                <img src={selectedImage} alt="Uploaded Evidence" className="max-h-24 object-contain rounded-lg" />
              ) : (
                <>
                  <CameraIcon className="w-6 h-6 text-[#485563]" />
                  <span className="text-xs font-medium text-[#485563] text-center">Tap to capture or upload</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 mt-1 w-full">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-11 bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 text-white font-bold text-sm rounded-lg flex items-center justify-center transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Report Issue"}
            </button>
            <button type="button" onClick={handleBack} className="text-[#485563] font-semibold text-sm underline py-1">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
