"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeftIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  CircleXIcon,
  CircleOutlineIcon,
  InfoIcon,
} from "./icons";
import { LoadSequenceRow, LoaderTrip, supabase } from "@/lib/supabase";

interface TripReadinessProps {
  onNavigate?: (tab: "assigned-trips" | "load-sequence" | "trip-readiness" | "report-issue" | "back") => void;
}

const DEFAULT_TRIP_ID = "S1-T001";
function selectedTripFromUrl() {
  if (typeof window === "undefined") return DEFAULT_TRIP_ID;
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("trip_id") ||
    params.get("trip_code") ||
    params.get("tripId") ||
    DEFAULT_TRIP_ID
  );
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function displayValue(value: unknown, fallback = "Not available") {
  if (value === null || value === undefined || String(value).trim() === "") return fallback;
  return String(value);
}

function formatReportTime(value: unknown) {
  if (!value) return "Not available";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? displayValue(value) : date.toLocaleString();
}

export default function TripReadiness({ onNavigate }: TripReadinessProps) {
  const router = useRouter();
  const [tripId, setTripId] = useState(DEFAULT_TRIP_ID);
  const [trip, setTrip] = useState<LoaderTrip | null>(null);
  const [issues, setIssues] = useState<Record<string, unknown>[]>([]);
  const [sequence, setSequence] = useState<LoadSequenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  const unresolvedIssues = useMemo(
    () => issues.filter((issue) => String(issue.status ?? "open").toLowerCase() === "open"),
    [issues],
  );
  const isLoaded = (item: LoadSequenceRow) =>
    item.is_loaded === true || String(item.status ?? "").toLowerCase() === "loaded";
  const itemWeight = (item: LoadSequenceRow) => {
    const value = safeNumber(item.weight_kg ?? item.weight ?? item.payload_kg);
    return value >= 0 ? value : 0;
  };
  const itemVolume = (item: LoadSequenceRow) => {
    const value = safeNumber(item.volume_m3 ?? item.volume);
    return value >= 0 ? value : 0;
  };
  const loadedCount = sequence.filter(isLoaded).length;
  const totalStops = sequence.length;
  const expectedCount = totalStops;
  const loadedWeight = sequence.reduce(
    (sum, item) => sum + (isLoaded(item) ? itemWeight(item) : 0),
    0,
  );
  const maxWeight = safeNumber(trip?.max_weight_kg, 3500) || 3500;
  const expectedVolume = sequence.reduce((sum, item) => sum + (isLoaded(item) ? itemVolume(item) : 0), 0);
  const maxVolume = safeNumber(trip?.max_volume_m3, 18.2) || 18.2;
  const isHeld = unresolvedIssues.length > 0;
  const activeIssue = unresolvedIssues[0] ?? {};
  const latestIssue = issues[0] ?? {};
  const hasIssues = issues.length > 0;
  const ordersVerified = expectedCount > 0;
  const loadingVerified = expectedCount > 0 && loadedCount === expectedCount;
  const weightVerified = loadingVerified && loadedWeight <= maxWeight;
  const volumeVerified = loadingVerified && expectedVolume <= maxVolume;
  const driverName = displayValue(trip?.driver_name ?? trip?.driver);
  const departureTime = displayValue(trip?.departure_time);
  const checklistChecks = [
    ordersVerified,
    loadingVerified,
    !isHeld,
    !isHeld,
    Boolean(trip?.plan_version ?? true),
    weightVerified,
    volumeVerified,
    !isHeld && loadingVerified,
  ];
  const totalChecklists = checklistChecks.length;
  const checklistPassed = checklistChecks.filter(Boolean).length;
  const canRelease = checklistPassed === totalChecklists;

  const fetchReadiness = useCallback(async (selectedTripId: string) => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let tripResult = await supabase
      .from("trips")
      .select("*")
      .eq("trip_code", selectedTripId)
      .maybeSingle();
    if (!tripResult.data && !tripResult.error) {
      tripResult = await supabase
        .from("trips")
        .select("*")
        .eq("id", selectedTripId)
        .maybeSingle();
    }
    let issueResult = await supabase
      .from("shortfalls")
      .select("*")
      .eq("trip_id", selectedTripId)
      .order("created_at", { ascending: false });
    let sequenceResult = await supabase
      .from("load_sequences")
      .select("*")
      .eq("trip_id", selectedTripId)
      .order("lifo_sequence", { ascending: false });
    if (issueResult.error) {
      issueResult = await supabase
        .from("shortfalls")
        .select("*")
        .eq("trip_id", selectedTripId);
    }
    if (sequenceResult.error) {
      sequenceResult = await supabase
        .from("load_sequences")
        .select("*")
        .eq("trip_id", selectedTripId);
    }

    if (!tripResult.error) setTrip(tripResult.data as LoaderTrip | null);
    if (!issueResult.error) {
      setIssues(
        (issueResult.data ?? []).map((issue) => ({
          ...(issue as Record<string, unknown>),
          status: issue.status ?? "open",
        })) as Record<string, unknown>[],
      );
    }
    if (!sequenceResult.error) {
      setSequence(
        ([...(sequenceResult.data ?? [])] as LoadSequenceRow[]).sort(
          (a, b) =>
            safeNumber(b.lifo_sequence ?? b.sequence ?? b.sequence_no ?? b.order_index ?? b.stop_number) -
            safeNumber(a.lifo_sequence ?? a.sequence ?? a.sequence_no ?? a.order_index ?? a.stop_number),
        ),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const selectedTripId = selectedTripFromUrl();
    setTripId(selectedTripId);
    void fetchReadiness(selectedTripId);

    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel(`trip-readiness-${selectedTripId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => void fetchReadiness(selectedTripId))
      .on("postgres_changes", { event: "*", schema: "public", table: "shortfalls", filter: `trip_id=eq.${selectedTripId}` }, () => void fetchReadiness(selectedTripId))
      .on("postgres_changes", { event: "*", schema: "public", table: "load_sequences" }, () => void fetchReadiness(selectedTripId))
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [fetchReadiness]);

  const handleReadyForDeparture = async () => {
    if (!supabase || !canRelease || !tripId) return;
    const query = trip?.trip_code
      ? supabase.from("trips").update({ status: "ready_for_departure" }).eq("trip_code", String(trip.trip_code))
      : supabase.from("trips").update({ status: "ready_for_departure" }).eq("id", tripId);
    const { error } = await query;
    if (error) {
      setNotification("Unable to release trip for departure.");
      return;
    }
    setTrip((current) => current ? { ...current, status: "ready_for_departure" } : current);
    setNotification("Trip is ready for departure.");
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (!supabase || loading || !tripId) return;
    if (String(trip?.status ?? "").toLowerCase() === "ready_for_departure") return;
    const nextStatus = isHeld || (expectedCount > 0 && loadedCount < expectedCount) ? "HOLD" : "READY";
    if (String(trip?.status ?? "").toUpperCase() !== nextStatus) {
      const statusQuery = trip?.trip_code
        ? supabase.from("trips").update({ status: nextStatus }).eq("trip_code", String(trip.trip_code))
        : supabase.from("trips").update({ status: nextStatus }).eq("id", tripId);
      void statusQuery.then(() => undefined);
    }
  }, [expectedCount, isHeld, loadedCount, loading, trip?.status, trip?.trip_code, tripId]);

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

  const handleReportIssue = () => {
    const reportUrl = `/loader/report-issue?trip_id=${encodeURIComponent(tripId)}`;
    if (onNavigate) {
      onNavigate("report-issue");
    } else {
      router.push(reportUrl);
    }
  };

  return (
    <main className="w-full max-w-full overflow-x-hidden bg-[#F9FAFB] flex flex-col box-border">
      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-[#202D2D] text-white px-4 py-2 rounded-md text-xs font-semibold z-50 shadow-lg">
          {notification}
        </div>
      )}
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
            Trip Readiness
          </h1>
        </div>
        <span className="bg-[#ECFDF5] text-[#22C55E] font-inter text-[11px] font-bold px-2 py-1 rounded-md">
          Plan v2
        </span>
      </div>

      {/* Content Container */}
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 box-border">
        {/* Desktop Header */}
        <div className="hidden lg:flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-slate-900 leading-tight m-0">
              Trip Readiness - {String(trip?.vehicle_id ?? "Vehicle")} / {tripId}
            </h1>
            <p className="text-sm text-slate-500 mt-1 m-0 font-normal">
              Final departure verification checklist
            </p>
          </div>
          <div className="bg-[#ECFDF5] px-3 py-1.5 rounded-md flex items-center justify-center shrink-0">
            <span className="text-xs lg:text-[13px] font-bold text-[#F97316] leading-none">
              Plan v2 Active
            </span>
          </div>
        </div>

        {/* DESKTOP TWO-COLUMN RESPONSIVE LAYOUT */}
        <div className="hidden lg:flex flex-col lg:flex-row gap-6 w-full items-start">
          {/* Left Column */}
          <div className="flex-1 min-w-0 w-full flex flex-col gap-6">
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-4 shadow-sm">
              <div className="flex justify-between items-center pb-3 border-b border-[#F1F5F9]">
                <div>
                  <h2 className="text-[17px] lg:text-[18px] font-bold text-[#202D2D] leading-[24px] m-0">
                    Readiness Checklist
                  </h2>
                  <p className="text-xs text-[#485563] m-0">
                    Mandatory pre-departure gate pass validation
                  </p>
                </div>
                <span className="bg-[#FFF4ED] text-[#F97316] text-xs font-bold px-2.5 py-1 rounded-full">
                  {checklistPassed} of {totalChecklists} Passed
                </span>
              </div>

              <div className="flex flex-col gap-3 w-full">
                {/* Checklist conditions */}
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]/50 transition-all hover:shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#065F46]">
                      Expected orders: {expectedCount}
                    </span>
                    <span className="text-[11px] text-[#047857]">
                      {ordersVerified ? `All ${expectedCount} delivery orders assigned and staged in loading sequence` : "No delivery orders assigned"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-[#D1FAE5] text-[#047857] text-[11px] font-bold px-2 py-0.5 rounded">
                      {ordersVerified ? "VERIFIED" : "PENDING"}
                    </span>
                    <span className="w-6 h-6 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-xs">
                      ✓
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA]/60 transition-all hover:shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#991B1B]">
                      Loaded: {loadedCount} of {expectedCount}
                    </span>
                    <span className="text-[11px] text-[#B91C1C]">
                      {isHeld ? "Trip has unresolved reported discrepancies" : "All sequence items are loaded"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`${loadingVerified ? "bg-[#D1FAE5] text-[#047857]" : "bg-[#FEE2E2] text-[#B91C1C]"} text-[11px] font-bold px-2 py-0.5 rounded`}>
                      {loadingVerified ? "VERIFIED" : expectedCount === 0 ? "PENDING" : "INCOMPLETE"}
                    </span>
                    <span className="w-6 h-6 rounded-full bg-[#EF4444] text-white flex items-center justify-center font-bold text-xs">
                      ✗
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#FFF4ED] border border-[#FED7AA]/60 transition-all hover:shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#9A3412]">
                      Short/Changed: {unresolvedIssues.length} issue{unresolvedIssues.length === 1 ? "" : "s"}
                    </span>
                    <span className="text-[11px] text-[#C2410C]">
                      {unresolvedIssues.length ? "Reported shortfall requires dispatcher review" : "No unresolved shortfall reported"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-[#FFEDD5] text-[#C2410C] text-[11px] font-bold px-2 py-0.5 rounded">
                      {unresolvedIssues.length ? "SHORTFALL" : "VERIFIED"}
                    </span>
                    <span className="w-6 h-6 rounded-full bg-[#F59E0B] text-white flex items-center justify-center font-bold text-xs">
                      ⚠
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA]/60 transition-all hover:shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#991B1B]">
                      Open issues: {unresolvedIssues.length}
                    </span>
                    <span className="text-[11px] text-[#B91C1C]">
                      {unresolvedIssues.length ? "Awaiting Central Dispatch resolution" : "No open issue reports"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-[#FEE2E2] text-[#B91C1C] text-[11px] font-bold px-2 py-0.5 rounded">
                      {unresolvedIssues.length ? "SHORTFALL" : "VERIFIED"}
                    </span>
                    <span className="w-6 h-6 rounded-full bg-[#EF4444] text-white flex items-center justify-center font-bold text-xs">
                      ✗
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]/50 transition-all hover:shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#065F46]">
                      Plan version: {displayValue(trip?.plan_version, "Not available")} acknowledged
                    </span>
                    <span className="text-[11px] text-[#047857]">
                      Updated route plan v2 accepted and synced to vehicle
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-[#D1FAE5] text-[#047857] text-[11px] font-bold px-2 py-0.5 rounded">
                      {trip?.plan_version ? "VERIFIED" : "PENDING"}
                    </span>
                    <span className="w-6 h-6 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-xs">
                      ✓
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] transition-all hover:shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#485563]">
                      Weight validation: {weightVerified ? "Verified" : "Incomplete"}
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      Loaded: {loadedWeight.toLocaleString()} kg / Max limit: {maxWeight.toLocaleString()} kg
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-[#E2E8F0] text-[#475569] text-[11px] font-bold px-2 py-0.5 rounded">
                      {weightVerified ? "VERIFIED" : loadedCount > 0 ? "INCOMPLETE" : "PENDING"}
                    </span>
                    <span className="w-6 h-6 rounded-full bg-[#CBD5E1] text-[#485563] flex items-center justify-center font-bold text-xs">
                      ○
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] transition-all hover:shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#485563]">
                      Volume validation: {volumeVerified ? "Verified" : "Incomplete"}
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      Current: {expectedVolume.toFixed(1)} m³ / Max limit: {maxVolume.toFixed(1)} m³
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-[#E2E8F0] text-[#475569] text-[11px] font-bold px-2 py-0.5 rounded">
                      {volumeVerified ? "VERIFIED" : "INCOMPLETE"}
                    </span>
                    <span className="w-6 h-6 rounded-full bg-[#CBD5E1] text-[#485563] flex items-center justify-center font-bold text-xs">
                      ○
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] transition-all hover:shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#485563]">
                      Update acknowledgement: Pending
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      Final departure sign-off by dock supervisor upon resolution
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-[#E2E8F0] text-[#475569] text-[11px] font-bold px-2 py-0.5 rounded">
                      PENDING
                    </span>
                    <span className="w-6 h-6 rounded-full bg-[#CBD5E1] text-[#485563] flex items-center justify-center font-bold text-xs">
                      ○
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Order Manifest Status */}
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-4 shadow-sm">
              <div className="flex justify-between items-center pb-3 border-b border-[#F1F5F9]">
                <div>
                  <h3 className="text-[16px] font-bold text-[#202D2D] leading-[22px] m-0">
                    Trip Order Manifest Status ({expectedCount} Stops)
                  </h3>
                  <p className="text-xs text-[#485563] m-0">
                    Sequential delivery verification for route {String(trip?.route_summary ?? trip?.route ?? "active trip")}
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#485563]">
                  {loadedCount} of {expectedCount} Complete
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                {sequence.map((item, index) => {
                  const loaded = item.is_loaded === true || String(item.status ?? "").toLowerCase() === "loaded";
                  const itemIssue = unresolvedIssues.find((issue) =>
                    String(issue.order_ref ?? issue.sequence_id ?? "") === String(item.order_ref ?? item.id ?? ""),
                  );
                  const quantity = safeNumber(item.parcel_count ?? item.quantity ?? item.units);
                  const itemStatus = itemIssue ? "SHORTFALL" : loaded ? "LOADED" : "PENDING";
                  return (
                    <div key={String(item.id ?? index)} className={`p-3 rounded-lg ${itemIssue ? "bg-[#FFF4ED] border-[#FED7AA]" : "bg-[#F8FAFC] border-[#E2E8F0]"} border flex flex-col gap-1`}>
                      <div className="flex justify-between items-center">
                        <span className="font-jetbrains font-bold text-xs text-[#202D2D]">
                                Stop {index + 1} · {displayValue(item.order_ref ?? item.id, `Stop ${index + 1}`)}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${itemIssue ? "bg-[#FFEDD5] text-[#C2410C]" : loaded ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#E2E8F0] text-[#475569]"}`}>
                          {itemStatus}
                        </span>
                      </div>
                      <span className="text-xs text-[#485563] truncate">{String(item.outlet_name ?? item.outlet ?? "Assigned outlet")}</span>
                      <span className={`text-[11px] font-medium ${itemIssue ? "text-[#C2410C]" : loaded ? "text-[#166534]" : "text-[#64748B]"}`}>
                        {itemIssue
                          ? `${String(itemIssue.affected_qty ?? "Reported")} affected`
                          : quantity > 0
                            ? `${loaded ? quantity : 0}/${quantity} units ${loaded ? "verified" : "pending"}`
                            : loaded ? "Loaded and verified" : "Awaiting load confirmation"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col gap-6">
            <div className="bg-[#FFF4ED] border-2 border-[#F59E0B] rounded-xl p-5 lg:p-6 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                    <AlertTriangleIcon className="w-5 h-5" />
                  </div>
                  <span className="text-base font-bold text-[#B45309] leading-tight">
                    {isHeld ? "Loading Shortfall - Trip Held" : "All Clear - Ready to Depart"}
                  </span>
                </div>
                <span className="bg-[#F59E0B] text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                  {isHeld ? displayValue(activeIssue.severity, "HIGH").toUpperCase() : "CLEAR"}
                </span>
              </div>
              <p className="text-[13px] text-[#485563] leading-relaxed m-0 font-normal">
                {hasIssues
                  ? isHeld
                    ? `${displayValue(latestIssue.affected_qty, "Reported")} affected on ${displayValue(latestIssue.order_ref ?? latestIssue.sku, tripId)}. Dispatcher review required before departure gate release can proceed.`
                    : `Latest issue report is ${displayValue(latestIssue.status, "recorded")}. No unresolved issues remain for trip ${tripId}.`
                  : "No Issues Reported"}
              </p>
              <div className="flex flex-col gap-1 pt-1 border-t border-[#FED7AA]/60 text-xs text-[#78350F]">
                <div className="flex justify-between">
                  <span>Reported by:</span>
                  <span className="font-semibold">{hasIssues ? displayValue(latestIssue.reporter) : "No Issues Reported"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Report Time:</span>
                  <span className="font-jetbrains font-semibold">{hasIssues ? formatReportTime(latestIssue.created_at) : "No Issues Reported"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span className="font-semibold">{hasIssues ? displayValue(latestIssue.location ?? latestIssue.bay ?? trip?.bay) : "No Issues Reported"}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReportIssue}
                className="mt-1 w-full py-2.5 bg-white hover:bg-orange-50 text-[#C2410C] border border-[#FDBA74] rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Review / Edit Shortfall Report</span>
                <span>→</span>
              </button>
            </div>

            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-4 shadow-sm">
              <div>
                <h3 className="text-[16px] font-bold text-[#202D2D] leading-[22px] m-0">
                  What happens next
                </h3>
                <p className="text-xs text-[#485563] m-0">
                  Resolution workflow required for trip release
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#FEF3C7]/40 border border-[#FDE68A]">
                  <span className="w-6 h-6 bg-[#F59E0B] text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </span>
                  <div className="flex flex-col flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] font-bold text-[#92400E]">
                        Dispatcher reviews shortfall report
                      </span>
                      <span className="text-[10px] font-bold bg-[#F59E0B] text-white px-2 py-0.5 rounded">
                        IN PROGRESS
                      </span>
                    </div>
                    <span className="text-xs text-[#78350F] mt-0.5">
                      Alert sent to Operations Dispatch. Shortage ticket #SR-1049 queued.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#F8FAFC]">
                  <span className="w-6 h-6 bg-[#E2E8F0] text-[#475569] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </span>
                  <div className="flex flex-col flex-1">
                    <span className="text-[13px] font-semibold text-[#202D2D]">
                      Dispatcher approves replacement stock or defers order
                    </span>
                    <span className="text-xs text-[#64748B] mt-0.5">
                      Will decide to dispatch buffer units or defer stop 1 to wave 2.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#F8FAFC]">
                  <span className="w-6 h-6 bg-[#E2E8F0] text-[#475569] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    3
                  </span>
                  <div className="flex flex-col flex-1">
                    <span className="text-[13px] font-semibold text-[#202D2D]">
                      Loader verifies updated order is complete
                    </span>
                    <span className="text-xs text-[#64748B] mt-0.5">
                      Final physical scan and security seal application on pallet.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#F8FAFC]">
                  <span className="w-6 h-6 bg-[#E2E8F0] text-[#475569] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    4
                  </span>
                  <div className="flex flex-col flex-1">
                    <span className="text-[13px] font-semibold text-[#202D2D]">
                      Revalidate weight and volume
                    </span>
                    <span className="text-xs text-[#64748B] mt-0.5">
                      Automated check against vehicle gross limits (3,500 kg max).
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#F8FAFC]">
                  <span className="w-6 h-6 bg-[#E2E8F0] text-[#475569] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    5
                  </span>
                  <div className="flex flex-col flex-1">
                    <span className="text-[13px] font-semibold text-[#202D2D]">
                      Acknowledge latest plan version and release trip
                    </span>
                    <span className="text-xs text-[#64748B] mt-0.5">
                      Driver gate pass generated and trip marked Ready for Departure.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 lg:p-6 flex flex-col gap-3 shadow-sm">
              <div className="flex justify-between items-center pb-2.5 border-b border-[#F1F5F9]">
                <span className="text-xs font-bold text-[#485563] uppercase tracking-wide">
                  Gate Departure Release
                </span>
                <span className="text-[11px] font-bold text-[#EF4444] bg-[#FEF2F2] px-2 py-0.5 rounded">
                  {!canRelease ? "GATE LOCKED" : "GATE OPEN"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col">
                  <span className="text-[#64748B]">Assigned Bay:</span>
                  <span className="font-bold text-[#202D2D]">{displayValue(trip?.bay)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#64748B]">Driver:</span>
                  <span className="font-bold text-[#202D2D]">{driverName}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#64748B]">Target Departure:</span>
                  <span className="font-bold text-[#202D2D]">{departureTime}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#64748B]">Security Seal:</span>
                  <span className="font-bold text-[#D97706]">{isHeld ? "Pending Signoff" : "Verified"}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="button"
                  disabled={!canRelease}
                  onClick={handleReadyForDeparture}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm select-none text-center flex items-center justify-center gap-2 ${
                    canRelease
                      ? "bg-[#22C55E] hover:bg-[#16A34A] text-white"
                      : "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed"
                  }`}
                >
                  <span>{canRelease ? "Ready for Departure" : "🔒 Ready for Departure"}</span>
                </button>
                <p className="text-[11px] text-[#EF4444] font-medium leading-4 text-center m-0">
                  {!canRelease ? "Cannot depart until readiness checks are complete." : "All readiness checks passed. Trip may depart."}
                </p>
              </div>

              <div className="pt-2 border-t border-[#F1F5F9] text-center">
                <span className="text-[11px] text-[#485563]">
                  Need urgent clearance? Contact Central Dispatch: <strong className="text-[#202D2D]">+94 11 234 5678</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE LAYOUT */}
        <div className="flex lg:hidden flex-col gap-6 w-full">
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-[#202D2D] leading-[21px] m-0">
              Readiness Checklist
            </h2>
            <div className="bg-white rounded-xl p-4 shadow-[0px_4px_12px_rgba(15,23,42,0.03)] flex flex-col">
              <div className="flex justify-between items-center py-2 border-b border-[#CBD5E1]">
                <span className="text-sm font-medium text-[#485563]">
                  Expected Stops
                </span>
                <div className="flex items-center gap-1.5 text-[#F59E0B]">
                  <span className="text-sm font-semibold">{checklistPassed} Verified</span>
                  <AlertTriangleIcon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-[#CBD5E1]">
                <span className="text-sm font-medium text-[#485563]">
                  Loaded Count
                </span>
                <div className="flex items-center gap-1.5 text-[#EF4444]">
                  <span className="text-sm font-semibold">{loadedCount} / {expectedCount} loaded</span>
                  <CircleXIcon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-[#CBD5E1]">
                <span className="text-sm font-medium text-[#485563]">
                  Shortfall Reported
                </span>
                <div className="flex items-center gap-1.5 text-[#F59E0B]">
                  <span className="text-sm font-semibold">{unresolvedIssues.length} issue{unresolvedIssues.length === 1 ? "" : "s"} flagged</span>
                  <AlertTriangleIcon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-[#CBD5E1]">
                <span className="text-sm font-medium text-[#485563]">
                  Open Issues
                </span>
                <div className="flex items-center gap-1.5 text-[#EF4444]">
                  <span className="text-sm font-semibold">{unresolvedIssues.length} outstanding</span>
                  <CircleXIcon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-[#CBD5E1]">
                <span className="text-sm font-medium text-[#485563]">
                  Plan Acknowledgement
                </span>
                <div className="flex items-center gap-1.5 text-[#202D2D]">
                  <span className="text-sm font-semibold">{displayValue(trip?.plan_version, "Plan unavailable")} Acknowledged</span>
                  <CheckCircleIcon className="w-4 h-4 text-[#22C55E]" />
                </div>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-[#485563]">
                  Vehicle & Weight Checks
                </span>
                <div className="flex items-center gap-1.5 text-[#485563]">
                  <span className="text-sm font-semibold">{weightVerified && volumeVerified ? "Verified" : "Incomplete"}</span>
                  <CircleOutlineIcon className="w-4 h-4 text-[#485563]" />
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReportIssue}
            className="w-full h-11 bg-[#FFF4ED] hover:bg-orange-50 text-[#C2410C] border border-[#FDBA74] rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>Report Issue</span>
            <span>→</span>
          </button>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-[#202D2D] leading-[21px] m-0">
              Resolution Summary
            </h2>
            <div className="bg-[#FFF4ED] border border-[#F59E0B] rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="bg-[#FFF4ED] text-[#F59E0B] font-inter text-[11px] font-bold px-2 py-1 rounded border border-[#F59E0B]/30 shrink-0">
                  SHORT
                </span>
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-[#202D2D] leading-5">
                    {isHeld
                      ? `${displayValue(activeIssue.affected_qty, "Reported")} affected on ${displayValue(activeIssue.order_ref ?? activeIssue.sku, tripId)}`
                      : "No unresolved shortfalls reported"}
                  </span>
                  <span className="text-xs text-[#485563] leading-[15px]">
                    {displayValue(activeIssue.order_ref ?? activeIssue.sku, tripId)}
                  </span>
                </div>
              </div>

              <div className="w-full border-t border-dashed border-[#F59E0B]" />

              <div className="flex items-center gap-2 text-[#F59E0B]">
                <InfoIcon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-medium text-[#F59E0B] leading-[18px]">
                  Dispatcher review required.
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              disabled={!canRelease}
              onClick={handleReadyForDeparture}
              className={`w-full h-12 rounded-full font-bold text-[15px] flex items-center justify-center shadow-sm select-none ${
                canRelease ? "bg-[#22C55E] hover:bg-[#16A34A] text-white" : "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed"
              }`}
            >
              Ready for Departure
            </button>
            <p className="text-[13px] font-medium text-[#485563] text-center leading-5 m-0">
              {!canRelease ? "Cannot depart until readiness checks are complete." : "All readiness checks passed."}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}