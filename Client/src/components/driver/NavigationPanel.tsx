"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import {
  NavigationIcon,
  RouteIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  ExternalLinkIcon,
  CheckCircleIcon,
  PhoneIcon,
  ArrowLeftIcon,
} from "@/components/driver/today-run/icons";
import {
  getCurrentDriverPosition,
  watchDriverPosition,
  calculateRoute,
  isWithinArrivalRadius,
  formatDistance,
  getGoogleMapsUrl,
  getOpenStreetMapUrl,
  getWazeUrl,
  getAppleMapsUrl,
  type LatLng,
  type RouteResult,
  type TrafficCondition,
} from "@/lib/driver/navigation-service";
import { useConnectivity } from "@/context/DriverConnectivityContext";

// Dynamically import Mapbox GL Route Map with SSR disabled for Next.js App Router compatibility
const DynamicMapboxRouteMap = dynamic(
  () => import("@/components/driver/MapboxRouteMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-48 sm:h-80 bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-white gap-3 p-6 text-center border border-slate-700">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <span className="text-xs sm:text-sm font-bold text-slate-200">
          Loading Mapbox navigation...
        </span>
        <span className="text-[11px] text-slate-400">
          Initializing Mapbox GL vector map & Directions API
        </span>
      </div>
    ),
  }
);

export type NavigationState =
  | "idle"
  | "getting_location"
  | "calculating_route"
  | "refreshing_route"
  | "route_active"
  | "location_denied"
  | "location_error"
  | "destination_error"
  | "route_error"
  | "offline";

export interface NavigationPanelProps {
  outletId: string;
  outletName: string;
  outletAddress: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
  onArrived?: () => void;
  onConfirmArrival?: (timestamp: string) => void;
  onStartDelivery?: () => void;
  isNavigating: boolean;
  onToggleNavigation: (active: boolean) => void;
  managerPhone?: string;
  initialArrivalConfirmed?: boolean;
  initialArrivalTimestamp?: string | null;
}

// Traffic condition badge styling helper
function getTrafficBadgeStyle(condition: TrafficCondition | null) {
  switch (condition) {
    case "Severe":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "Heavy":
      return "bg-amber-50 text-amber-800 border-amber-300";
    case "Moderate":
      return "bg-amber-50/80 text-amber-700 border-amber-200";
    case "Low":
    default:
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
}

export function NavigationPanel({
  outletId,
  outletName,
  outletAddress,
  destinationLat,
  destinationLng,
  onArrived,
  onConfirmArrival,
  onStartDelivery,
  isNavigating,
  onToggleNavigation,
  managerPhone,
  initialArrivalConfirmed = false,
  initialArrivalTimestamp = null,
}: NavigationPanelProps) {
  const { isOnline } = useConnectivity();

  const [isExpanded, setIsExpanded] = useState<boolean>(isNavigating);
  const [navState, setNavState] = useState<NavigationState>("idle");
  const [driverPos, setDriverPos] = useState<LatLng | null>(null);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showMapMenu, setShowMapMenu] = useState(false);

  // Arrival Flow State:
  // 1. hasArrived: Driver pressed [ Confirm Arrival ] (persisted once confirmed)
  // 2. manualNearOverride: fallback if GPS accuracy is low or indoors
  const [hasArrived, setHasArrived] = useState<boolean>(initialArrivalConfirmed);
  const [arrivalTimestamp, setArrivalTimestamp] = useState<string | null>(initialArrivalTimestamp);
  const [manualNearOverride, setManualNearOverride] = useState<boolean>(false);

  const unwatchRef = useRef<(() => void) | null>(null);

  // Validate destination coordinates from backend
  const hasValidDestination =
    destinationLat !== undefined &&
    destinationLat !== null &&
    !isNaN(Number(destinationLat)) &&
    destinationLng !== undefined &&
    destinationLng !== null &&
    !isNaN(Number(destinationLng));

  const destinationPos: LatLng = {
    lat: Number(destinationLat) || 6.9034,
    lng: Number(destinationLng) || 79.8512,
  };

  // GPS Proximity Detection (fixed 150m radius)
  const proximity = isWithinArrivalRadius(driverPos, destinationPos, 150);
  const isNearDestination = proximity.isNear || manualNearOverride;
  const distanceAwayMeters = proximity.distanceMeters;
  const isLowGpsAccuracy = proximity.isLowAccuracy;

  // Handler to fetch GPS & calculate Mapbox driving route
  const fetchRoute = useCallback(
    async (isRefresh = false) => {
      setErrorMessage(null);

      if (!hasValidDestination) {
        setNavState("destination_error");
        setErrorMessage("Destination outlet coordinates are unavailable for this stop.");
        return;
      }

      if (!isOnline) {
        setNavState("offline");
        setErrorMessage(
          "Navigation is unavailable while offline. Stop information and offline delivery remain accessible."
        );
        return;
      }

      setNavState(isRefresh ? "refreshing_route" : "getting_location");

      try {
        // 1. Obtain Driver GPS position
        const pos = await getCurrentDriverPosition();
        setDriverPos(pos);

        // 2. Query Mapbox Directions API with driving-traffic profile
        setNavState("calculating_route");
        const route = await calculateRoute(pos, destinationPos);
        setRouteResult(route);
        setNavState("route_active");
      } catch (err: any) {
        console.warn("Mapbox navigation initiation notice:", err);
        if (err?.code === "PERMISSION_DENIED") {
          setNavState("location_denied");
          setErrorMessage(
            "Location access was denied. Please enable GPS permissions or choose an external map app below."
          );
        } else if (err?.code === "NOT_SUPPORTED") {
          setNavState("location_error");
          setErrorMessage("Device Geolocation is not supported by your browser.");
        } else {
          setNavState("location_error");
          setErrorMessage(
            err?.message || "Unable to determine current location or calculate driving route."
          );
        }
      }
    },
    [hasValidDestination, isOnline, destinationPos]
  );

  // Sync with external isNavigating prop
  useEffect(() => {
    if (isNavigating) {
      setIsExpanded(true);
      if (navState === "idle") {
        fetchRoute(false);
      }
    }
  }, [isNavigating, navState, fetchRoute]);

  // Initial load route calculation for preview
  useEffect(() => {
    if (navState === "idle" && isOnline) {
      fetchRoute(false);
    }
  }, [navState, isOnline, fetchRoute]);

  // Live Location Watcher: active only while large navigation view is open
  useEffect(() => {
    if (isExpanded && isOnline && typeof window !== "undefined") {
      const stopWatch = watchDriverPosition(
        (newPos) => {
          setDriverPos(newPos);
        },
        (err) => {
          console.warn("Live driver location watcher notice:", err.message);
        }
      );
      unwatchRef.current = stopWatch;

      return () => {
        if (unwatchRef.current) {
          unwatchRef.current();
          unwatchRef.current = null;
        }
      };
    }
  }, [isExpanded, isOnline]);

  const handleOpenLargeNavigation = () => {
    setIsExpanded(true);
    onToggleNavigation(true);
    if (navState !== "route_active") {
      fetchRoute(false);
    }
  };

  const handleBackToPreview = () => {
    setIsExpanded(false);
    onToggleNavigation(false);
  };

  // Driver presses [ Confirm Arrival ]
  const handleConfirmArrival = () => {
    if (hasArrived) return; // Prevent duplicate confirmation
    const timestamp = new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    setHasArrived(true);
    setArrivalTimestamp(timestamp);
    if (onConfirmArrival) {
      onConfirmArrival(timestamp);
    }
  };

  // Driver presses [ Start Delivery ]
  const handleProceedToDelivery = () => {
    setIsExpanded(false);
    if (onStartDelivery) {
      onStartDelivery();
    } else if (onArrived) {
      onArrived();
    }
  };

  const googleMapsUrl = getGoogleMapsUrl(destinationPos, outletName);
  const osmUrl = getOpenStreetMapUrl(destinationPos, driverPos);
  const wazeUrl = getWazeUrl(destinationPos);
  const appleMapsUrl = getAppleMapsUrl(destinationPos, outletName);

  const formattedDist = routeResult?.formattedDistance || "7.2 km";
  const formattedTime = routeResult?.formattedDuration || "13 min";
  const arrivalTime = routeResult?.estimatedArrivalTime || "10:45 AM";

  const nextStep = routeResult?.nextStep;
  const nextInstruction =
    nextStep?.instruction || routeResult?.nextInstruction || `Head towards ${outletName}`;
  const nextDistance = nextStep?.formattedDistance || formattedDist;
  const maneuverIcon = nextStep?.icon || "↑";

  const formattedAwayStr =
    distanceAwayMeters < 1000
      ? `${distanceAwayMeters} m`
      : formatDistance(distanceAwayMeters);

  // ═════════════════════════════════════════════════════════════════════════
  // 1. DEDICATED LARGE NAVIGATION VIEW (Expanded / Navigating)
  // ═════════════════════════════════════════════════════════════════════════
  if (isExpanded) {
    return (
      <div
        id="driver-large-navigation-view"
        className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
      >
        <div className="w-full max-w-6xl h-full max-h-[96vh] mx-auto flex flex-col gap-2.5 sm:gap-3.5 bg-white rounded-3xl p-3 sm:p-5 shadow-2xl border border-slate-200 overflow-hidden">
          {/* Top Floating Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 sm:pb-3 gap-2">
            <button
              type="button"
              id="btn-nav-back-to-stop"
              onClick={handleBackToPreview}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm cursor-pointer transition-all active:scale-95 border-none shadow-sm"
            >
              <ArrowLeftIcon className="w-4 h-4 text-slate-700" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase tracking-wider">
                LIVE NAVIGATION
              </span>
            </div>

            <div className="relative flex items-center gap-2">
              <button
                type="button"
                id="btn-nav-open-maps-menu"
                onClick={() => setShowMapMenu(!showMapMenu)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl border border-emerald-200 cursor-pointer transition-colors shadow-sm"
              >
                <span>Open Maps</span>
                <ExternalLinkIcon className="w-3.5 h-3.5 text-emerald-700" />
              </button>

              {/* Map app launcher menu */}
              {showMapMenu && (
                <div className="absolute right-0 top-11 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 w-52 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                  <span className="text-[10px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
                    Navigation Apps
                  </span>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowMapMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors no-underline"
                  >
                    <span>📍</span> Google Maps
                  </a>
                  <a
                    href={wazeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowMapMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 transition-colors no-underline"
                  >
                    <span>🚗</span> Waze
                  </a>
                  <a
                    href={appleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowMapMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors no-underline"
                  >
                    <span>🍏</span> Apple Maps
                  </a>
                  <a
                    href={osmUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowMapMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors no-underline"
                  >
                    <span>🗺️</span> OpenStreetMap
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Traffic, Distance, ETA & Arrival Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-black text-slate-900 shadow-2xs">
                {formattedDist}
              </span>
              <span className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-black shadow-2xs">
                {formattedTime} ETA
              </span>

              {/* Dynamic Traffic Chip */}
              {routeResult?.hasTrafficData && routeResult.trafficCondition && (
                <span
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 shadow-2xs ${getTrafficBadgeStyle(
                    routeResult.trafficCondition
                  )}`}
                >
                  <span className="w-2 h-2 rounded-full bg-current" />
                  <span>
                    {routeResult.trafficCondition} Traffic
                    {routeResult.formattedTrafficDelay &&
                    routeResult.trafficDelayMinutes &&
                    routeResult.trafficDelayMinutes > 0
                      ? ` • ${routeResult.formattedTrafficDelay}`
                      : ""}
                  </span>
                </span>
              )}

              {/* Low GPS Accuracy Notice */}
              {isLowGpsAccuracy && (
                <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold flex items-center gap-1">
                  <span>⚠️</span> Location accuracy is low
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
              <span className="text-slate-400">Estimated Arrival:</span>
              <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                {arrivalTime}
              </span>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════
              NEAR DESTINATION / ARRIVAL CONFIRMATION PROMPT CARD
              ═════════════════════════════════════════════════════════════════ */}
          {hasArrived ? (
            /* State 3: Arrival Confirmed -> Displays "✓ Arrival Confirmed • [time]" */
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-emerald-950 shadow-sm animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-sm">
                  ✓
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-emerald-900">
                      ✓ Arrival Confirmed • {arrivalTimestamp || "Just now"}
                    </span>
                  </div>
                  <span className="text-xs text-emerald-700 mt-0.5">
                    Stop status is ARRIVED. Press Start Delivery to begin unloading & verification.
                  </span>
                </div>
              </div>

              <button
                type="button"
                id="btn-nav-start-delivery-banner"
                onClick={handleProceedToDelivery}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm rounded-xl shadow-md cursor-pointer border-none transition-all"
              >
                <CheckCircleIcon className="w-4 h-4 text-white" />
                <span>Start Delivery</span>
              </button>
            </div>
          ) : isNearDestination ? (
            /* State 2: Destination Area Reached (<= 150m) -> "You're near the destination" */
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-emerald-50/90 border-2 border-emerald-500 rounded-2xl text-emerald-950 shadow-md animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-md animate-bounce">
                  📍
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-emerald-950">
                      You're near the destination
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Within 150m
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 mt-0.5">
                    {outletName} is approximately {formattedAwayStr} away
                  </span>
                </div>
              </div>

              <button
                type="button"
                id="btn-nav-confirm-arrival-prompt"
                onClick={handleConfirmArrival}
                className="flex items-center justify-center gap-2 px-6 sm:px-7 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 cursor-pointer border-none transition-all"
              >
                <CheckCircleIcon className="w-4 h-4 text-white" />
                <span>Confirm Arrival</span>
              </button>
            </div>
          ) : (
            /* State 1: En Route -> Shows Next Direction */
            <div className="flex items-center gap-3 px-3.5 sm:px-4 py-2.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-emerald-950 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-sm">
                {maneuverIcon}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Next Direction
                  </span>
                  <span className="text-xs font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-md">
                    in {nextDistance}
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate mt-0.5">
                  {nextInstruction}
                </span>
              </div>
            </div>
          )}

          {/* Status notices */}
          {(navState === "getting_location" ||
            navState === "calculating_route" ||
            navState === "refreshing_route") && (
            <div className="flex items-center gap-2.5 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs font-semibold">
              <RefreshCwIcon className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
              <span>
                {navState === "refreshing_route"
                  ? "Refreshing traffic & GPS route..."
                  : navState === "getting_location"
                  ? "Acquiring GPS location..."
                  : "Calculating traffic-aware driving route..."}
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setManualNearOverride(true)}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer border-none shadow-xs"
                >
                  I&apos;m at Store
                </button>
                <button
                  type="button"
                  onClick={() => fetchRoute(false)}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 font-bold rounded-lg border border-amber-300 cursor-pointer"
                >
                  Retry GPS
                </button>
              </div>
            </div>
          )}

          {/* LARGE MAPBOX INTERACTIVE MAP */}
          <div className="flex-1 min-h-[220px] relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
            <DynamicMapboxRouteMap
              driverPosition={driverPos}
              destinationPosition={destinationPos}
              destinationName={outletName}
              destinationAddress={outletAddress}
              routeResult={routeResult}
              height="100%"
              className="w-full h-full"
            />
          </div>

          {/* Bottom Destination Info & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Destination
                </span>
                <span className="text-xs font-bold text-slate-800 truncate">
                  {outletName}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 truncate">
                {outletAddress}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="btn-nav-refresh-route"
                onClick={() => fetchRoute(true)}
                disabled={navState === "refreshing_route"}
                className="px-3 py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all border-none active:scale-95 shadow-sm"
                title="Refresh live route"
              >
                <RefreshCwIcon
                  className={`w-3.5 h-3.5 text-slate-700 ${
                    navState === "refreshing_route" ? "animate-spin" : ""
                  }`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {managerPhone && (
                <a
                  href={`tel:${managerPhone.replace(/[^+\d]/g, "")}`}
                  className="px-3 py-2.5 sm:py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all no-underline border border-emerald-200 active:scale-95 shadow-sm"
                  title="Call Store Manager"
                >
                  <PhoneIcon className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="hidden sm:inline">Call Store</span>
                </a>
              )}

              {/* Action Button: Depending on Arrival State */}
              {hasArrived ? (
                /* Arrival Confirmed -> Start Delivery Action */
                <button
                  type="button"
                  id="btn-driver-start-delivery-action"
                  onClick={handleProceedToDelivery}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 sm:px-7 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/30 cursor-pointer border-none transition-all"
                >
                  <CheckCircleIcon className="w-4 h-4 text-white" />
                  <span>Start Delivery</span>
                </button>
              ) : isNearDestination ? (
                /* Nearby Destination -> Confirm Arrival Action */
                <button
                  type="button"
                  id="btn-driver-confirm-arrival-bottom"
                  onClick={handleConfirmArrival}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 sm:px-7 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/30 cursor-pointer border-none transition-all"
                >
                  <CheckCircleIcon className="w-4 h-4 text-white" />
                  <span>Confirm Arrival</span>
                </button>
              ) : (
                /* En Route -> En Route indicator & Prominent At Store Manual Check-in */
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 hidden sm:inline">
                    En Route
                  </span>
                  <button
                    type="button"
                    onClick={() => setManualNearOverride(true)}
                    className="px-3.5 py-2 sm:py-2.5 bg-[#F97316] hover:bg-[#ea6c0a] text-white font-bold text-xs rounded-xl cursor-pointer border-none shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                    title="If physically at store but GPS is drifting, click to show arrival prompt"
                  >
                    <span>📍</span>
                    <span>At Store?</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. COMPACT ROUTE PREVIEW CARD (Current Stop Default View)
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div
      id="driver-map-preview-card"
      className="flex flex-col gap-3 bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#CBD5E1]"
    >
      {/* Header: LIVE ROUTE & NAVIGATION */}
      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <RouteIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-[#202D2D] uppercase tracking-wider">
            LIVE ROUTE & NAVIGATION
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasArrived ? (
            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ✓ Arrived
            </span>
          ) : isNearDestination ? (
            <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full animate-pulse">
              Near Destination
            </span>
          ) : null}
          <span className="text-[11px] font-semibold text-slate-500">
            Mapbox GL JS
          </span>
        </div>
      </div>

      {/* Prominent Distance & Traffic-aware ETA Strip */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
          <span>Driver</span>
        </div>
        <div className="flex-1 mx-3 border-t-2 border-dashed border-emerald-400 relative flex justify-center">
          <div className="bg-white px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs flex items-center gap-1.5">
            <span className="font-extrabold text-slate-900">{formattedDist}</span>
            <span className="text-slate-300">•</span>
            <span className="font-black text-emerald-700">{formattedTime} ETA</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 font-bold text-slate-700">
          <span>Outlet</span>
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
        </div>
      </div>

      {/* Traffic details & Arrival estimate */}
      <div className="flex items-center justify-between text-[11px] px-1 text-slate-600">
        <div className="flex items-center gap-1.5">
          {routeResult?.hasTrafficData && routeResult.trafficCondition ? (
            <span
              className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${getTrafficBadgeStyle(
                routeResult.trafficCondition
              )}`}
            >
              {routeResult.trafficCondition} Traffic
            </span>
          ) : (
            <span className="text-slate-400 font-medium">Standard driving route</span>
          )}
          {isLowGpsAccuracy && (
            <span className="text-amber-700 font-medium text-[10px]">
              • Low accuracy
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 font-semibold text-slate-700">
          <span className="text-slate-400">Est. Arrival:</span>
          <span className="font-bold text-slate-900">{arrivalTime}</span>
        </div>
      </div>

      {/* Compact Mapbox Map Preview */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200">
        <DynamicMapboxRouteMap
          driverPosition={driverPos}
          destinationPosition={destinationPos}
          destinationName={outletName}
          destinationAddress={outletAddress}
          routeResult={routeResult}
          height={190}
          className="w-full"
          interactive={false}
        />
      </div>

      {/* Destination Reached / Arrival Confirmed Prompt Card in Preview */}
      {hasArrived ? (
        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px]">
              ✓
            </span>
            <div className="flex flex-col">
              <span className="font-black text-emerald-950">✓ Arrival Confirmed • {arrivalTimestamp || "Just now"}</span>
              <span className="text-[10px] text-emerald-700">Stop status is ARRIVED</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleProceedToDelivery}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs cursor-pointer border-none transition-all active:scale-95"
          >
            Start Delivery
          </button>
        </div>
      ) : isNearDestination ? (
        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-400 rounded-xl text-xs animate-in fade-in duration-200">
          <div className="flex flex-col">
            <span className="font-black text-emerald-950">You're near the destination</span>
            <span className="text-[10px] text-emerald-800 font-semibold">
              {outletName} is approximately {formattedAwayStr} away
            </span>
          </div>
          <button
            type="button"
            id="btn-driver-confirm-arrival-preview"
            onClick={handleConfirmArrival}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-xs cursor-pointer border-none transition-all shadow-xs active:scale-95"
          >
            Confirm Arrival
          </button>
        </div>
      ) : null}

      {/* Action Buttons: [ Expand Map ] [ Navigate ] */}
      <div className="grid grid-cols-2 gap-2.5 pt-0.5">
        <button
          type="button"
          id="btn-driver-expand-map"
          onClick={handleOpenLargeNavigation}
          className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-xs font-bold transition-all cursor-pointer border-none shadow-sm"
        >
          <RouteIcon className="w-4 h-4 text-slate-700" />
          <span>Expand Map</span>
        </button>

        <button
          type="button"
          id="btn-driver-navigate-preview"
          onClick={handleOpenLargeNavigation}
          className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-[#F97316] hover:bg-[#ea6c0a] active:scale-95 text-white text-xs font-bold transition-all cursor-pointer border-none shadow-md"
        >
          <NavigationIcon className="w-4 h-4 text-white" />
          <span>Navigate</span>
        </button>
      </div>
    </div>
  );
}

export default NavigationPanel;
