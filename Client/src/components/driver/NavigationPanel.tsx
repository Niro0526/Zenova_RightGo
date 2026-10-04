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
  estimateStraightLineRoute,
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
          Loading Live GPS Navigation...
        </span>
        <span className="text-[11px] text-slate-400">
          Acquiring active route and location coordinates
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

// Traffic condition badge — dark themed (expanded view)
function getTrafficBadgeStyle(condition: TrafficCondition | null) {
  switch (condition) {
    case "Severe":
      return "bg-rose-500/20 text-rose-300 border-rose-500/40";
    case "Heavy":
      return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    case "Moderate":
      return "bg-amber-400/20 text-amber-200 border-amber-400/40";
    case "Low":
    default:
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  }
}

// Traffic condition badge — light themed (compact card)
function getTrafficBadgeStyleLight(condition: TrafficCondition | null) {
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

      let pos: LatLng;
      try {
        // 1. Obtain Driver GPS position
        pos = await getCurrentDriverPosition();
      } catch (gpsErr: any) {
        console.warn("GPS position acquisition notice, using default position:", gpsErr);
        pos = {
          lat: destinationPos.lat - 0.018,
          lng: destinationPos.lng - 0.012,
          accuracy: 50,
        };
      }
      setDriverPos(pos);

      try {
        // 2. Query Mapbox Directions API with driving-traffic profile
        setNavState("calculating_route");
        const route = await calculateRoute(pos, destinationPos);
        setRouteResult(route);
        setNavState("route_active");
      } catch (err: any) {
        console.warn("Mapbox navigation calculation fallback:", err);
        const fallbackRoute = estimateStraightLineRoute(pos, destinationPos);
        setRouteResult(fallbackRoute);
        setNavState("route_active");
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
    onToggleNavigation(false);
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

  const formattedDist = routeResult?.formattedDistance || "—";
  const formattedTime = routeResult?.formattedDuration || "—";
  const arrivalTime = routeResult?.estimatedArrivalTime || "—";

  const nextStep = routeResult?.nextStep;
  const nextInstruction =
    nextStep?.instruction || routeResult?.nextInstruction || `Head towards ${outletName}`;
  const nextDistance = nextStep?.formattedDistance || formattedDist;
  const maneuverIcon = nextStep?.icon || "↑";

  const formattedAwayStr =
    distanceAwayMeters < 1000
      ? `${distanceAwayMeters} m`
      : formatDistance(distanceAwayMeters);

  const isCalculating =
    navState === "getting_location" ||
    navState === "calculating_route" ||
    navState === "refreshing_route";

  // ═══════════════════════════════════════════════════════════════════════
  // 1. EXPANDED / LARGE NAVIGATION VIEW (dark theme)
  // ═══════════════════════════════════════════════════════════════════════
  if (isExpanded) {
    return (
      <div
        id="driver-large-navigation-view"
        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
      >
        <div className="w-full max-w-xl h-[94vh] max-h-[760px] flex flex-col bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-700/60 overflow-hidden">

          {/* Top Header (dark) */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700/60 shrink-0">
            <button
              type="button"
              id="btn-nav-back-to-stop"
              onClick={handleBackToPreview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer transition-all active:scale-95 border border-slate-600"
            >
              <ArrowLeftIcon className="w-4 h-4 text-slate-400" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="font-extrabold text-xs sm:text-sm text-white uppercase tracking-widest">
                LIVE NAVIGATION
              </span>
            </div>

            <div className="relative flex items-center gap-1.5">
              <button
                type="button"
                id="btn-nav-open-maps-menu"
                onClick={() => setShowMapMenu(!showMapMenu)}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 hover:text-emerald-100 bg-emerald-500/15 hover:bg-emerald-500/25 px-3 py-1.5 rounded-xl border border-emerald-500/30 cursor-pointer transition-colors"
              >
                <span>Maps</span>
                <ExternalLinkIcon className="w-3.5 h-3.5" />
              </button>

              {showMapMenu && (
                <div className="absolute right-0 top-10 z-50 bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl p-2 w-48 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                  <span className="text-[10px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
                    External GPS Apps
                  </span>
                  <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" onClick={() => setShowMapMenu(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-blue-500/20 hover:text-blue-300 transition-colors no-underline"><span>📍</span>Google Maps</a>
                  <a href={wazeUrl} target="_blank" rel="noopener noreferrer" onClick={() => setShowMapMenu(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors no-underline"><span>🚗</span>Waze</a>
                  <a href={appleMapsUrl} target="_blank" rel="noopener noreferrer" onClick={() => setShowMapMenu(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors no-underline"><span>🍏</span>Apple Maps</a>
                  <a href={osmUrl} target="_blank" rel="noopener noreferrer" onClick={() => setShowMapMenu(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors no-underline"><span>🗺️</span>OpenStreetMap</a>
                </div>
              )}
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 flex flex-col gap-2.5 p-3 sm:p-4 overflow-y-auto min-h-0 overscroll-contain bg-slate-900">

            {/* 3-Column Stat Grid: Distance / Drive Time / ETA */}
            <div className="grid grid-cols-3 gap-2 shrink-0">
              <div className="flex flex-col items-center justify-center py-3 px-2 bg-slate-800 rounded-xl border border-slate-700/60">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Distance</span>
                <span className="text-base font-black text-white leading-none">
                  {isCalculating
                    ? <span className="w-4 h-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin inline-block" />
                    : formattedDist}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center py-3 px-2 bg-emerald-500/15 rounded-xl border border-emerald-500/30">
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Drive Time</span>
                <span className="text-base font-black text-emerald-300 leading-none">
                  {isCalculating ? "—" : formattedTime}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center py-3 px-2 bg-orange-500/15 rounded-xl border border-orange-500/30">
                <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wider mb-1">Est. Arrival</span>
                <span className="text-base font-black text-orange-300 leading-none tabular-nums">
                  {isCalculating ? "—" : arrivalTime}
                </span>
              </div>
            </div>

            {/* Traffic chip */}
            {routeResult?.hasTrafficData && routeResult.trafficCondition && (
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${getTrafficBadgeStyle(routeResult.trafficCondition)}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {routeResult.trafficCondition} Traffic
                </span>
              </div>
            )}

            {/* Turn-by-turn instruction */}
            {nextInstruction && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl shrink-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-black text-sm shrink-0">
                  {maneuverIcon}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Next Direction</span>
                    <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">in {nextDistance}</span>
                  </div>
                  <span className="text-xs font-bold text-white truncate">{nextInstruction}</span>
                </div>
              </div>
            )}

            {/* Loading notice */}
            {isCalculating && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/15 border border-blue-500/30 rounded-xl text-blue-300 text-xs font-semibold shrink-0">
                <RefreshCwIcon className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
                <span>
                  {navState === "refreshing_route" ? "Refreshing live route..."
                    : navState === "getting_location" ? "Acquiring GPS location..."
                    : "Calculating route..."}
                </span>
              </div>
            )}

            {/* Error notice */}
            {errorMessage && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-300 text-xs shrink-0">
                <div className="flex items-center gap-1.5">
                  <AlertTriangleIcon className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setManualNearOverride(true)} className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg cursor-pointer border-none text-xs">I&apos;m at Store</button>
                  <button type="button" onClick={() => fetchRoute(false)} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-lg border border-slate-600 cursor-pointer text-xs">Retry</button>
                </div>
              </div>
            )}

            {/* Map */}
            <div className="w-full h-48 sm:h-64 min-h-[170px] relative rounded-xl overflow-hidden border border-slate-700 shrink-0">
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

            {/* Arrival status banner */}
            {hasArrived ? (
              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl shrink-0">
                <div className="w-6 h-6 rounded-md bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0">✓</div>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-emerald-300">Arrival Confirmed • {arrivalTimestamp || "Just now"}</span>
                  <span className="text-[10px] text-emerald-500">Stop status is ARRIVED.</span>
                </div>
              </div>
            ) : isNearDestination ? (
              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-emerald-500 text-white rounded-xl shrink-0">
                <span className="text-base">📍</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Near {outletName} ({formattedAwayStr})</span>
                  <span className="text-[10px] text-emerald-100">Ready to confirm arrival.</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Sticky Footer */}
          <div className="shrink-0 p-3 bg-slate-900 border-t border-slate-700/60 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-black text-white truncate">{outletName}</span>
                <span className="text-[11px] text-slate-400 truncate">{outletAddress}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  id="btn-nav-refresh-route"
                  onClick={() => fetchRoute(true)}
                  disabled={navState === "refreshing_route"}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all border border-slate-600 active:scale-95"
                  title="Refresh live route"
                >
                  <RefreshCwIcon className={`w-3.5 h-3.5 ${navState === "refreshing_route" ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
                {managerPhone && (
                  <a href={`tel:${managerPhone.replace(/[^+\d]/g, "")}`} className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all no-underline border border-emerald-500/30 active:scale-95" title="Call Store Manager">
                    <PhoneIcon className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                )}
              </div>
            </div>

            {hasArrived ? (
              <button type="button" id="btn-driver-start-delivery-action" onClick={handleProceedToDelivery} className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-extrabold text-sm rounded-xl shadow-md cursor-pointer border-none transition-all">
                <CheckCircleIcon className="w-4 h-4 text-white" />
                <span>Start Delivery →</span>
              </button>
            ) : isNearDestination ? (
              <button type="button" id="btn-driver-confirm-arrival-bottom" onClick={handleConfirmArrival} className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-extrabold text-sm rounded-xl shadow-md cursor-pointer border-none transition-all">
                <CheckCircleIcon className="w-4 h-4 text-white" />
                <span>Confirm Arrival ✓</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setManualNearOverride(true)} className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs rounded-xl cursor-pointer border-none shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5" title="If physically at store, click to confirm arrival">
                  <span>📍</span><span>At Store?</span>
                </button>
                <button type="button" onClick={handleConfirmArrival} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs rounded-xl cursor-pointer border-none shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-white" />
                  <span>Arrived</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. COMPACT ROUTE PREVIEW CARD
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div
      id="driver-map-preview-card"
      className="flex flex-col gap-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
    >
      {/* Dark gradient header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #134e3a 100%)" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <RouteIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-extrabold text-white uppercase tracking-widest leading-none">
              Live Route &amp; Navigation
            </span>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5 leading-none">
              GPS-powered driving directions
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {hasArrived ? (
            <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">✓ Arrived</span>
          ) : isNearDestination ? (
            <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">Near Dest.</span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              Live
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4 pt-3">
        {/* Distance / ETA strip */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span>Driver</span>
          </div>
          <div className="flex-1 mx-2 sm:mx-3 relative flex items-center justify-center min-w-0">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-emerald-400" />
            <div className="relative z-10 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-sm flex items-center gap-1.5 whitespace-nowrap">
              {isCalculating ? (
                <span className="w-3 h-3 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              ) : (
                <>
                  <span className="font-extrabold text-slate-900 text-[11px] sm:text-xs">{formattedDist}</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-black text-emerald-700 text-[11px] sm:text-xs">{formattedTime}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-slate-700 shrink-0">
            <span>Outlet</span>
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          </div>
        </div>

        {/* Traffic + Est. Arrival row */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-[11px]">
            {routeResult?.hasTrafficData && routeResult.trafficCondition ? (
              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${getTrafficBadgeStyleLight(routeResult.trafficCondition)}`}>
                {routeResult.trafficCondition} Traffic
              </span>
            ) : (
              <span className="text-slate-400 font-medium text-[11px]">Driving route</span>
            )}
          </div>
          {/* Est. Arrival — always visible, prominent */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400">Est. Arrival</span>
            <span className="text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 tabular-nums">
              {isCalculating
                ? <span className="text-[11px] text-slate-500 font-semibold">Loading…</span>
                : arrivalTime}
            </span>
          </div>
        </div>

        {/* Compact map */}
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

        {/* Arrival prompts */}
        {hasArrived ? (
          <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px]">✓</span>
              <div className="flex flex-col">
                <span className="font-black text-emerald-950">✓ Arrival Confirmed • {arrivalTimestamp || "Just now"}</span>
                <span className="text-[10px] text-emerald-700">Stop status is ARRIVED</span>
              </div>
            </div>
            <button type="button" onClick={handleProceedToDelivery} className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs cursor-pointer border-none transition-all active:scale-95">Start Delivery</button>
          </div>
        ) : isNearDestination ? (
          <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-400 rounded-xl text-xs animate-in fade-in duration-200">
            <div className="flex flex-col">
              <span className="font-black text-emerald-950">You&apos;re near the destination</span>
              <span className="text-[10px] text-emerald-800 font-semibold">{outletName} is approximately {formattedAwayStr} away</span>
            </div>
            <button type="button" id="btn-driver-confirm-arrival-preview" onClick={handleConfirmArrival} className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-xs cursor-pointer border-none transition-all shadow-xs active:scale-95">Confirm Arrival</button>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" id="btn-driver-expand-map" onClick={handleOpenLargeNavigation} className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-xs font-bold transition-all cursor-pointer border-none shadow-sm">
            <RouteIcon className="w-4 h-4 text-slate-700" />
            <span>Expand Map</span>
          </button>
          <button type="button" id="btn-driver-navigate-preview" onClick={handleOpenLargeNavigation} className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-orange-500 hover:bg-orange-400 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer border-none shadow-md">
            <NavigationIcon className="w-4 h-4 text-white" />
            <span>Navigate</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default NavigationPanel;
