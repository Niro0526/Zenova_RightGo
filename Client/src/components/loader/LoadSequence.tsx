"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
} from "./icons";
import { LoadSequenceRow, supabase } from "@/lib/supabase";

type TripHeader = {
  id?: string | number;
  trip_code?: string | null;
  vehicle_id?: string | null;
  route_plan?: string | null;
  route_summary?: string | null;
  plan_version?: string | number | null;
  departure_time?: string | null;
  bay?: string | null;
  payload_kg?: number | string | null;
};

interface LoadSequenceProps {
  onNavigate?: (
    tab: "assigned-trips" | "load-sequence" | "trip-readiness" | "report-issue" | "review-changes" | "back"
  ) => void;
}

export default function LoadSequence({ onNavigate }: LoadSequenceProps) {
  const router = useRouter();
  const [tripId, setTripId] = useState("S1-T001");
  const [sequenceItems, setSequenceItems] = useState<LoadSequenceRow[]>([]);
  const [stop2Loaded, setStop2Loaded] = useState<boolean>(false);
  const [stop1Loaded, setStop1Loaded] = useState<boolean>(false);
  const [payloadLimit, setPayloadLimit] = useState(3500);
  const [trip, setTrip] = useState<TripHeader | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const loadSequence = useCallback(async (selectedTripCode: string) => {
    if (!supabase) {
      setNotification("Supabase is not configured.");
      return;
    }

    let tripResult = await supabase
      .from("trips")
      .select("*")
      .eq("trip_code", selectedTripCode)
      .maybeSingle();
    if (tripResult.error) {
      tripResult = await supabase
        .from("trips")
        .select("*")
        .eq("trip_code", selectedTripCode)
        .maybeSingle();
    }
    const tripRow = (tripResult.data ?? null) as TripHeader | null;
    setTrip(tripRow);
    const tripReference = tripRow?.id ?? selectedTripCode;
    const tripPayload = Number(tripRow?.payload_kg ?? 3500);
    if (Number.isFinite(tripPayload) && tripPayload > 0) setPayloadLimit(tripPayload);

    let sequenceResult = await supabase
      .from("load_sequences")
      .select("*")
      .eq("trip_id", tripReference)
      .order("lifo_sequence", { ascending: false });

    if (sequenceResult.error || !sequenceResult.data?.length) {
      sequenceResult = await supabase
        .from("load_sequences")
        .select("*")
        .eq("trip_code", selectedTripCode)
        .order("lifo_sequence", { ascending: false });
    }
    if (sequenceResult.error) {
      sequenceResult = await supabase
        .from("load_sequences")
        .select("*")
        .eq("trip_id", tripReference);
    }

    if (sequenceResult.error) {
      setNotification("Loading sequence is temporarily unavailable.");
      setSequenceItems([]);
      return;
    }

    const items = ((sequenceResult.data ?? []) as LoadSequenceRow[]).sort(
      (a, b) =>
        Number(b.lifo_sequence ?? b.sequence ?? b.sequence_no ?? b.order_index ?? b.stop_number ?? 0) -
        Number(a.lifo_sequence ?? a.sequence ?? a.sequence_no ?? a.order_index ?? a.stop_number ?? 0),
    );
    setSequenceItems(items);
    setStop2Loaded(Boolean(items[1]?.is_loaded ?? items[1]?.status === "LOADED"));
    setStop1Loaded(Boolean(items[2]?.is_loaded ?? items[2]?.status === "LOADED"));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selectedTripId =
      params.get("trip_id") ||
      params.get("trip_code") ||
      "S1-T001";
    setTripId(selectedTripId);
    void loadSequence(selectedTripId);

    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel(`load-sequence-${selectedTripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "load_sequences", filter: `trip_id=eq.${selectedTripId}` },
        () => void loadSequence(selectedTripId),
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [loadSequence]);

  const sequenceItem = (index: number): LoadSequenceRow => sequenceItems[index] ?? {};
  const text = (row: LoadSequenceRow, ...keys: string[]) => {
    for (const key of keys) {
      const value = row[key];
      if (value !== null && value !== undefined && value !== "") return String(value);
    }
    return "Not available";
  };
  const tripText = (...keys: (keyof TripHeader)[]) => {
    for (const key of keys) {
      const value = trip?.[key];
      if (value !== null && value !== undefined && String(value).trim() !== "") return String(value);
    }
    if (keys.includes("route_plan") || keys.includes("route_summary")) return "Peliyagoda → Pettah";
    if (keys.includes("plan_version")) return "v2";
    return "Not available";
  };
  const planVersion = tripText("plan_version");
  const routePlan = tripText("route_plan", "route_summary");
  const formatDeparture = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  const loadedValue = (row: LoadSequenceRow, fallback: boolean) =>
    typeof row.is_loaded === "boolean" ? row.is_loaded : fallback;

  const updateLoaded = async (index: number, loaded: boolean, message: string) => {
    const row = sequenceItem(index);
    if (row.id === null || row.id === undefined || !supabase) {
      showToast("This sequence item cannot be updated.");
      return;
    }

    const previousItems = sequenceItems;
    setSequenceItems((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, is_loaded: loaded, status: loaded ? "LOADED" : "PENDING" } : item,
      ),
    );
    if (index === 1) setStop2Loaded(loaded);
    if (index === 2) setStop1Loaded(loaded);

    const { error } = await supabase
      .from("load_sequences")
      .update({ is_loaded: loaded })
      .eq("id", row.id);
    if (error) {
      setSequenceItems(previousItems);
      if (index === 1) setStop2Loaded(loadedValue(previousItems[1] ?? {}, false));
      if (index === 2) setStop1Loaded(loadedValue(previousItems[2] ?? {}, false));
      showToast(error.message);
      return;
    }
    showToast(message);
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate("back");
    } else {
      if (typeof window !== "undefined" && (window.history.state?.idx > 0 || window.history.length > 1)) {
        router.back();
      } else {
        router.push("/loader");
      }
    }
  };

  const handleOpenReportIssue = () => {
    if (onNavigate) {
      onNavigate("report-issue");
    } else {
      router.push(`/loader/report-issue?trip_id=${encodeURIComponent(tripId)}`);
    }
  };

  const handleOpenReviewChanges = () => {
    if (onNavigate) {
      onNavigate("review-changes");
    } else {
      router.push("/loader/review-changes");
    }
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  const stop2 = sequenceItem(1);
  const stop1 = sequenceItem(2);
  const stop3 = sequenceItem(0);
  const stop3Loaded = loadedValue(stop3, false);
  const weightOf = (row: LoadSequenceRow) => {
    const weight = Number(row.weight_kg ?? row.weight ?? row.payload_kg ?? 0);
    return Number.isFinite(weight) ? weight : 0;
  };
  const loadedWeight = sequenceItems.reduce(
    (sum, item) => sum + (loadedValue(item, false) ? weightOf(item) : 0),
    0,
  );
  const payloadPercent = payloadLimit > 0
    ? Math.min(100, Math.max(0, (loadedWeight / payloadLimit) * 100))
    : 0;
  const loadedStops = sequenceItems.filter((item, index) =>
    loadedValue(item, index === 0 ? stop3Loaded : index === 1 ? stop2Loaded : stop1Loaded),
  ).length;
  const allSequenceItemsLoaded = sequenceItems.length > 0 && loadedStops === sequenceItems.length;
  const stopWeight = (row: LoadSequenceRow) => `${weightOf(row).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;
  const stopDescription = (row: LoadSequenceRow) =>
    `${text(row, "parcel_count", "quantity")} parcels • ${stopWeight(row)} • ${text(row, "compartment", "compartment_location", "zone")}`;

  return (
    <main className="w-full max-w-full overflow-x-hidden bg-[#F9FAFB] flex flex-col box-border pb-28 sm:pb-12">
      {/* Mobile Top Navigation Bar */}
      <div className="flex lg:hidden items-center justify-between px-4 h-14 bg-white border-b border-[#CBD5E1] sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="p-1 text-[#202D2D] hover:bg-gray-100 rounded-md transition-colors"
            onClick={handleBack}
            title="Back"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-[#202D2D] leading-[27px] m-0">
            Load Sequence
          </h1>
        </div>
        <span className="bg-[#202D2D] text-white font-inter text-[11px] font-bold px-2 py-1 rounded-md">
          {tripId}
        </span>
      </div>

      {/* Mobile Plan v2 Banner */}
      <div className="flex lg:hidden justify-between items-center px-4 py-3 bg-[#FFF4ED] border-y border-[#F59E0B]">
        <div className="flex items-center gap-2">
          <AlertTriangleIcon className="w-[18px] h-[18px] text-[#F59E0B]" />
          <span className="text-[13px] font-semibold text-[#F59E0B] m-0">
            Plan v2 - 1 change
          </span>
        </div>
        <button
          type="button"
          className="bg-[#F97316] hover:bg-[#EA580C] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-md transition-colors"
          onClick={handleOpenReviewChanges}
        >
          Review
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-[#202D2D] text-white px-4 py-2 rounded-md text-xs font-semibold z-50 shadow-lg">
          {notification}
        </div>
      )}

      {/* Content Container */}
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 box-border">
        {/* Desktop Header */}
        <div className="hidden lg:flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-slate-900 leading-tight m-0">
              Load Sequence - Trip {tripId}
            </h1>
            <p className="text-sm text-slate-500 mt-1 m-0 font-normal">
              Vehicle {tripText("vehicle_id")} • {planVersion.startsWith("v") ? `Plan ${planVersion}` : `Plan v${planVersion}`} • {routePlan} • Departure {trip?.departure_time ? formatDeparture(trip.departure_time) : "Not available"} • Dock Bay {tripText("bay")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-[#ECFDF5] text-[#22C55E] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#A7F3D0]/60">
              LIFO Mode Active
            </span>
            <span className="bg-[#202D2D] text-white text-xs font-bold px-3 py-1.5 rounded-lg">
              {tripText("bay")}
            </span>
          </div>
        </div>

        {/* Desktop Plan v2 Callout Banner */}
        <div className="hidden lg:flex justify-between items-center p-3.5 bg-[#FEF3C7] border border-[#FDE68A] rounded-xl shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangleIcon className="w-5 h-5 text-[#F59E0B] shrink-0" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#92400E] m-0">
                Plan v2 update available — 1 order adjustment pending
              </span>
              <span className="text-xs text-[#B45309]">
                Route re-sequencing proposed by dispatch for Colombo corridor
              </span>
            </div>
          </div>
          <div>
            <button
              type="button"
              className="bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-xs"
              onClick={handleOpenReviewChanges}
            >
              Review Changes
            </button>
          </div>
        </div>

        {/* DESKTOP TWO-COLUMN RESPONSIVE LAYOUT */}
        <div className="hidden lg:flex flex-col lg:flex-row gap-6 w-full items-start">
          {/* Left Column: LIFO Sequence Queue */}
          <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
            <div className="flex justify-between items-center pb-1">
              <div>
                <h2 className="text-[17px] font-bold text-[#202D2D] leading-[24px] m-0">
                  Loading Sequence (LIFO Order)
                </h2>
                <p className="text-xs text-[#485563] m-0">
                  Load last-delivered stops first. Scan parcel barcode to verify sequence.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#485563] bg-[#F1F5F9] px-2.5 py-1 rounded-md">
                <span>{loadedStops} of {sequenceItems.length || 3} Stops Loaded</span>
              </div>
            </div>

            {/* Sequence Progress Bar */}
            <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden flex">
              <div className="bg-[#22C55E] h-full w-1/3 transition-all"></div>
              <div className={`h-full w-1/3 transition-all ${stop2Loaded ? "bg-[#22C55E]" : "bg-[#F97316] animate-pulse"}`}></div>
              <div className={`h-full w-1/3 transition-all ${stop1Loaded ? "bg-[#22C55E]" : stop2Loaded ? "bg-[#F97316] animate-pulse" : "bg-[#CBD5E1]"}`}></div>
            </div>

            {/* Sequence Cards List */}
            <div className="flex flex-col gap-3.5 w-full">
              {/* STOP 3 */}
              <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 flex flex-col gap-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-jetbrains font-bold text-sm text-[#202D2D] bg-[#F1F5F9] px-2 py-0.5 rounded">
                        {text(stop3, "item_code", "outlet", "outlet_name", "order_ref")}
                      </span>
                      <span className="font-semibold text-xs text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded">
                        Stop 3 (Load First • Cab Front)
                      </span>
                    </div>
                    <h3 className="text-[15px] font-bold text-[#202D2D] leading-[22px] m-0">
                      {text(stop3, "outlet_name", "outlet", "order_ref")}
                    </h3>
                    <p className="text-xs text-[#485563] leading-[18px] m-0 font-normal">
                      {stopDescription(stop3)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#ECFDF5] text-[#22C55E] border border-[#A7F3D0]/60 shrink-0">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>{stop3Loaded ? "Loaded" : "Pending"}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F1F5F9] flex justify-between items-center text-[11px] text-[#64748B]">
                  <span>Compartment: {text(stop3, "compartment", "compartment_location", "location")}</span>
                  <span className={stop3Loaded ? "text-[#059669] font-semibold" : "text-[#64748B]"}>
                    {stop3Loaded ? "Barcode Verified ✓" : "Awaiting load"}
                  </span>
                </div>
              </div>

              {/* STOP 2 */}
              <div
                className={`bg-white rounded-xl p-5 flex flex-col gap-3 shadow-sm transition-all ${
                  !stop2Loaded
                    ? "border-2 border-[#F97316] shadow-orange-100 shadow-md"
                    : "border border-[#CBD5E1]"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-jetbrains font-bold text-sm text-[#202D2D] bg-[#F1F5F9] px-2 py-0.5 rounded">
                        {text(stop2, "item_code", "outlet", "outlet_name", "order_ref")}
                      </span>
                      <span className={`font-semibold text-xs px-2 py-0.5 rounded ${!stop2Loaded ? "bg-[#FFF4ED] text-[#C2410C]" : "bg-[#ECFDF5] text-[#059669]"}`}>
                        Stop 2 ({!stop2Loaded ? "Currently Loading • Mid Bay" : "Loaded"})
                      </span>
                    </div>
                    <h3 className="text-[15px] font-bold text-[#202D2D] leading-[22px] m-0">
                    {text(stop2, "outlet_name", "outlet", "item_code", "order_ref")}
                    </h3>
                    <p className="text-xs text-[#485563] leading-[18px] m-0 font-normal">
                      {stopDescription(stop2)}
                    </p>
                  </div>

                  {stop2Loaded ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#ECFDF5] text-[#22C55E] border border-[#A7F3D0]/60 shrink-0">
                      <CheckCircleIcon className="w-4 h-4" />
                      <span>Loaded</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        className="bg-[#F9FAFB] hover:bg-red-50 border border-[#CBD5E1] hover:border-[#EF4444] text-[#485563] hover:text-[#EF4444] text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                        onClick={handleOpenReportIssue}
                      >
                        Report Issue
                      </button>
                      <button
                        type="button"
                        className="bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-xs"
                        onClick={() => {
                          void updateLoaded(1, true, "Stop 2 marked as Loaded! Stop 1 is now loading.");
                        }}
                      >
                        Mark Loaded
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#F1F5F9] flex justify-between items-center text-[11px] text-[#64748B]">
                  <span>Compartment: {text(stop2, "compartment", "compartment_location", "location")}</span>
                  <span className={!stop2Loaded ? "text-[#D97706] font-semibold animate-pulse" : "text-[#059669] font-semibold"}>
                    {!stop2Loaded ? "⚡ Staging in progress" : "Verified ✓"}
                  </span>
                </div>
              </div>

              {/* STOP 1 */}
              <div
                className={`bg-white rounded-xl p-5 flex flex-col gap-3 shadow-sm transition-all ${
                  stop1Loaded
                    ? "border border-[#CBD5E1]"
                    : stop2Loaded
                    ? "border-2 border-[#F97316] shadow-orange-100 shadow-md"
                    : "border border-[#CBD5E1]"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-jetbrains font-bold text-sm text-[#202D2D] bg-[#F1F5F9] px-2 py-0.5 rounded">
                        {text(stop1, "item_code", "outlet", "outlet_name", "order_ref")}
                      </span>
                      <span
                        className={`font-semibold text-xs px-2 py-0.5 rounded ${
                          stop1Loaded
                            ? "bg-[#ECFDF5] text-[#059669]"
                            : stop2Loaded
                            ? "bg-[#FFF4ED] text-[#C2410C]"
                            : "bg-[#F1F5F9] text-[#485563]"
                        }`}
                      >
                        Stop 1 ({stop1Loaded ? "Loaded" : stop2Loaded ? "Currently Loading • Rear Doors" : "Pending Stage"})
                      </span>
                    </div>
                    <h3 className="text-[15px] font-bold text-[#202D2D] leading-[22px] m-0">
                      {text(stop1, "outlet_name", "outlet", "item_code", "order_ref")}
                    </h3>
                    <p className="text-xs text-[#485563] leading-[18px] m-0 font-normal">
                      {stopDescription(stop1)}
                    </p>
                  </div>

                  {stop1Loaded ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#ECFDF5] text-[#22C55E] border border-[#A7F3D0]/60 shrink-0">
                      <CheckCircleIcon className="w-4 h-4" />
                      <span>Loaded</span>
                    </div>
                  ) : stop2Loaded ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        className="bg-[#F9FAFB] hover:bg-red-50 border border-[#CBD5E1] hover:border-[#EF4444] text-[#485563] hover:text-[#EF4444] text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                        onClick={handleOpenReportIssue}
                      >
                        Report Issue
                      </button>
                      <button
                        type="button"
                        className="bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-xs"
                        onClick={() => {
                          void updateLoaded(2, true, "Stop 1 marked as Loaded! All stops complete.");
                        }}
                      >
                        Mark Loaded
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F1F5F9] text-[#475569] shrink-0">
                      <span>Pending Stage</span>
                    </div>
                  )}
                </div>

                {/* Grouped Orders List */}
                <div className="flex flex-col gap-2.5 w-full mt-1">
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] font-bold text-[#202D2D] leading-5 m-0 font-jetbrains">
                        Order S1-000
                      </span>
                      <span className="text-[11px] font-semibold text-[#485563] bg-white border border-[#E2E8F0] px-2 py-0.5 rounded-md">
                        Ambient
                      </span>
                    </div>
                    <p className="text-xs text-[#485563] leading-[18px] m-0">
                      12 units • 97.8 kg • 0.500 m³ • General Merchandise
                    </p>
                  </div>

                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] font-bold text-[#202D2D] leading-5 m-0 font-jetbrains">
                        Order S1-001
                      </span>
                      <span className="text-[11px] font-semibold text-[#1E40AF] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded-md">
                        Chilled (+2°C to +4°C)
                      </span>
                    </div>
                    <p className="text-xs text-[#485563] leading-[18px] m-0">
                      80 units • 448.6 kg • 2.445 m³ • Fresh Milk & Dairy
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F1F5F9] flex justify-between items-center text-[11px] text-[#64748B]">
                  <span>Compartment: {text(stop1, "compartment", "compartment_location", "location")}</span>
                  <span
                    className={
                      stop1Loaded
                        ? "text-[#059669] font-semibold"
                        : stop2Loaded
                        ? "text-[#D97706] font-semibold animate-pulse"
                        : "text-[#64748B]"
                    }
                  >
                    {stop1Loaded
                      ? "Verified ✓"
                      : stop2Loaded
                      ? "⚡ Staging in progress"
                      : "Awaiting Prior Stop"}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column */}
          <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col gap-5">
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 flex flex-col gap-4 shadow-sm">
              <div className="flex justify-between items-center pb-2.5 border-b border-[#F1F5F9]">
                <div>
                  <h3 className="text-sm font-bold text-[#202D2D] m-0">
                    Payload & Weight Distribution
                  </h3>
                  <p className="text-xs text-[#485563] m-0">
                    Refrigerated Truck {tripText("vehicle_id")} (Gross Vehicle Limits)
                  </p>
                </div>
                <span className="text-[11px] font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded">
                  WITHIN LIMITS
                </span>
              </div>

              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[#485563]">Current Loaded Weight:</span>
                    <span className="font-bold text-[#202D2D] font-jetbrains">
                      {loadedWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg / {payloadLimit.toLocaleString()} kg Max
                    </span>
                  </div>
                  <div className="w-full bg-[#E2E8F0] h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-[#22C55E] h-full transition-all duration-500 rounded-full"
                      style={{ width: `${payloadPercent}%` }}
                    ></div>
                  </div>
                  <span className="text-[11px] text-[#64748B]">
                    {(payloadLimit - loadedWeight).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg remaining payload margin
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[#485563]">Cubic Volume Utilisation:</span>
                    <span className="font-bold text-[#202D2D] font-jetbrains">
                      {stop1Loaded ? "6.1 m³" : stop2Loaded ? "3.2 m³" : "2.4 m³"} / 18.0 m³ Max
                    </span>
                  </div>
                  <div className="w-full bg-[#E2E8F0] h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-[#3B82F6] h-full transition-all duration-500 rounded-full"
                      style={{ width: stop1Loaded ? "33.9%" : stop2Loaded ? "17.7%" : "13.3%" }}
                    ></div>
                  </div>
                  <span className="text-[11px] text-[#64748B]">
                    {stop1Loaded
                      ? "11.9 m³ available cargo space"
                      : stop2Loaded
                      ? "14.8 m³ available cargo space"
                      : "15.6 m³ available cargo space"}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#F1F5F9] flex flex-col gap-2">
                <span className="text-xs font-bold text-[#202D2D]">
                  Weight Allocation per Stop
                </span>
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0]/60">
                    <span className="text-[#065F46] font-medium">Stop 3 · {text(stop3, "outlet_name", "outlet", "order_ref")}</span>
                    <span className="font-jetbrains font-bold text-[#065F46]">{weightOf(stop3).toLocaleString()} kg {stop3Loaded ? "✓" : "(Pending)"}</span>
                  </div>
                  <div className={`flex justify-between items-center p-2 rounded-lg border transition-all ${
                    stop2Loaded
                      ? "bg-[#ECFDF5] border-[#A7F3D0]/60 text-[#065F46]"
                      : "bg-[#FFF4ED] border-[#FED7AA] text-[#9A3412]"
                  }`}>
                    <span className="font-medium">Stop 2 · {text(stop2, "outlet_name", "outlet", "order_ref")}</span>
                    <span className="font-jetbrains font-bold">{weightOf(stop2).toLocaleString()} kg {stop2Loaded ? "✓" : "⚡"}</span>
                  </div>
                  <div className={`flex justify-between items-center p-2 rounded-lg border transition-all ${
                    stop1Loaded
                      ? "bg-[#ECFDF5] border-[#A7F3D0]/60 text-[#065F46]"
                      : stop2Loaded
                      ? "bg-[#FFF4ED] border-[#FED7AA] text-[#9A3412]"
                      : "bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]"
                  }`}>
                    <span className="font-medium">Stop 1 · {text(stop1, "outlet_name", "outlet", "order_ref")}</span>
                    <span className="font-jetbrains font-bold">
                      {weightOf(stop1).toLocaleString()} kg {stop1Loaded ? "✓" : stop2Loaded ? "⚡" : "(Pending)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 flex flex-col gap-3 shadow-sm">
              <div className="flex justify-between items-center pb-2 border-b border-[#F1F5F9]">
                <span className="text-xs font-bold text-[#485563] uppercase tracking-wide">
                  Next Workflow Step
                </span>
                <span className="text-xs text-[#F97316] font-bold">
                  {tripText("bay")} · Docked
                </span>
              </div>

              <p className="text-xs text-[#485563] leading-relaxed m-0">
                {stop1Loaded ? (
                  <span className="text-[#059669] font-semibold">
                    ✓ All 3 stops loaded and verified in LIFO sequence! Proceed to <strong>Trip Readiness</strong> to run departure gate checks and manifest validation.
                  </span>
                ) : (
                  <>
                    Once all 3 stops are confirmed loaded in LIFO order, proceed to <strong>Trip Readiness</strong> to run departure gate checks and manifest validation.
                  </>
                )}
              </p>

              <button
                type="button"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate("trip-readiness");
                  } else {
                    router.push("/loader/trip-readiness");
                  }
                }}
                className={`w-full py-3 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${
                  stop1Loaded
                    ? "bg-[#22C55E] hover:bg-[#16A34A] shadow-[#22C55E]/20"
                    : "bg-[#202D2D] hover:bg-[#334155]"
                }`}
              >
                <span>Go to Trip Readiness Verification</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE SEQUENTIAL LAYOUT */}
        <div className="flex lg:hidden flex-col gap-3 w-full">
          <div className="flex flex-col p-3 gap-1 bg-white border border-[#CBD5E1] rounded-xl">
            <h2 className="text-sm font-bold text-[#202D2D] leading-[21px] m-0">
              Loading Sequence (LIFO Order)
            </h2>
            <p className="text-xs text-[#485563] leading-[18px] m-0 font-normal">
              Load last-delivered stops first. Scan parcel barcode to verify sequence.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full mt-3 pb-4">
            {/* STOP 3 */}
            <div className="bg-white border border-[#CBD5E1] rounded-[10px] p-4 flex flex-col gap-3 shadow-xs">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-[#202D2D] text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      3
                    </span>
                    <span className="font-jetbrains font-bold text-sm text-[#202D2D] leading-[18px]">
                      {text(stop3, "item_code", "outlet", "outlet_name", "order_ref")}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#202D2D] leading-[21px] m-0">
                    {text(stop3, "outlet_name", "outlet", "item_code", "order_ref")}
                  </h3>
                  <p className="text-xs text-[#485563] leading-[18px] m-0 font-normal">
                    {stopDescription(stop3)}
                  </p>
                </div>

                <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold bg-[#ECFDF5] text-[#22C55E]">
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  <span>{stop3Loaded ? "Loaded" : "Pending"}</span>
                </div>
              </div>
            </div>

            {/* STOP 2 */}
            <div
              className={`bg-white rounded-[10px] p-4 flex flex-col gap-3 shadow-xs ${
                !stop2Loaded ? "border-2 border-[#F97316]" : "border border-[#CBD5E1]"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-[#202D2D] text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      2
                    </span>
                    <span className="font-jetbrains font-bold text-sm text-[#202D2D] leading-[18px]">
                      {text(stop2, "item_code", "outlet", "outlet_name", "order_ref")}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#202D2D] leading-[21px] m-0">
                    {text(stop2, "outlet_name", "outlet", "item_code", "order_ref")}
                  </h3>
                  <p className="text-xs text-[#485563] leading-[18px] m-0 font-normal">
                    {stopDescription(stop2)}
                  </p>
                </div>

                {stop2Loaded ? (
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold bg-[#ECFDF5] text-[#22C55E]">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    <span>Loaded</span>
                  </div>
                ) : (
                  <div className="flex items-center px-2 py-1 rounded-md text-[11px] font-semibold bg-[#FFF7ED] text-[#F97316]">
                    <span>Loading</span>
                  </div>
                )}
              </div>

              {!stop2Loaded && (
                <div className="flex items-center gap-2 w-full mt-1">
                  <button
                    type="button"
                    className="flex-1 h-9 bg-[#F97316] hover:bg-[#EA580C] text-white text-[13px] font-bold rounded-lg flex items-center justify-center transition-colors"
                    onClick={() => {
                      void updateLoaded(1, true, "Stop 2 marked as Loaded! Stop 1 is now loading.");
                    }}
                  >
                    Mark Loaded
                  </button>
                  <button
                    type="button"
                    className="flex-1 h-9 bg-white border border-[#CBD5E1] text-[#EF4444] text-[13px] font-semibold rounded-lg flex items-center justify-center transition-colors"
                    onClick={handleOpenReportIssue}
                  >
                    Report Issue
                  </button>
                </div>
              )}
            </div>

            {/* STOP 1 */}
            <div
              className={`bg-white rounded-[10px] p-4 flex flex-col gap-3 shadow-xs ${
                stop1Loaded
                  ? "border border-[#CBD5E1]"
                  : stop2Loaded
                  ? "border-2 border-[#F97316]"
                  : "border border-[#CBD5E1]"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-[#202D2D] text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      1
                    </span>
                    <span className="font-jetbrains font-bold text-sm text-[#202D2D] leading-[18px]">
                      {text(stop1, "item_code", "outlet", "outlet_name", "order_ref")}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#202D2D] leading-[21px] m-0">
                    {text(stop1, "outlet_name", "outlet", "item_code", "order_ref")}
                  </h3>
                  <p className="text-xs text-[#485563] leading-[18px] m-0 font-normal">
                    {stopDescription(stop1)}
                  </p>
                </div>

                {stop1Loaded ? (
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold bg-[#ECFDF5] text-[#22C55E]">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    <span>Loaded</span>
                  </div>
                ) : stop2Loaded ? (
                  <div className="flex items-center px-2 py-1 rounded-md text-[11px] font-semibold bg-[#FFF7ED] text-[#F97316]">
                    <span>Loading</span>
                  </div>
                ) : (
                  <div className="flex items-center px-2.5 py-1.5 rounded-md text-xs font-bold bg-[#F9FAFB] text-[#485563]">
                    <span>Pending</span>
                  </div>
                )}
              </div>

              {stop2Loaded && !stop1Loaded && (
                <div className="flex items-center gap-2 w-full mt-1">
                  <button
                    type="button"
                    className="flex-1 h-9 bg-[#F97316] hover:bg-[#EA580C] text-white text-[13px] font-bold rounded-lg flex items-center justify-center transition-colors"
                    onClick={() => {
                      void updateLoaded(2, true, "Stop 1 marked as Loaded! All stops complete.");
                    }}
                  >
                    Mark Loaded
                  </button>
                  <button
                    type="button"
                    className="flex-1 h-9 bg-white border border-[#CBD5E1] text-[#EF4444] text-[13px] font-semibold rounded-lg flex items-center justify-center transition-colors"
                    onClick={handleOpenReportIssue}
                  >
                    Report Issue
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push(`/loader/trip-readiness?trip_id=${encodeURIComponent(tripId)}`)}
            className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all bg-[#22C55E] hover:bg-[#16A34A] text-white shadow-sm"
          >
            <span>Proceed to Trip Readiness →</span>
          </button>

          <div className="flex flex-col gap-3">
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 flex flex-col gap-3 shadow-sm">
              <div className="flex justify-between items-center pb-2 border-b border-[#F1F5F9]">
                <span className="text-xs font-bold text-[#485563] uppercase tracking-wide">
                  Payload &amp; Weight
                </span>
                <span className="text-[11px] font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded">
                  {loadedWeight <= payloadLimit ? "WITHIN LIMITS" : "OVER LIMIT"}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#485563]">Current Loaded Weight:</span>
                <span className="font-bold text-[#202D2D] font-jetbrains">
                  {loadedWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg / {payloadLimit.toLocaleString()} kg
                </span>
              </div>
              <div className="w-full bg-[#E2E8F0] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#22C55E] h-full transition-all duration-500 rounded-full"
                  style={{ width: `${payloadPercent}%` }}
                />
              </div>
            </div>

            <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 flex flex-col gap-3 shadow-sm">
              <div className="flex justify-between items-center pb-2 border-b border-[#F1F5F9]">
                <span className="text-xs font-bold text-[#485563] uppercase tracking-wide">
                  Next Workflow Step
                </span>
                <span className="text-[11px] text-[#F97316] font-bold">
                  {tripText("bay")} · Docked
                </span>
              </div>
              <p className="text-xs text-[#485563] leading-relaxed m-0">
                {allSequenceItemsLoaded
                  ? "All sequence items are loaded and verified. Continue to Trip Readiness for departure checks."
                  : "Load all sequence items to continue to Trip Readiness."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}