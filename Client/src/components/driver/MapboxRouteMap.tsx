"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLng, RouteResult } from "@/lib/driver/navigation-service";

export interface MapboxRouteMapProps {
  driverPosition?: LatLng | null;
  destinationPosition: LatLng;
  destinationName?: string;
  destinationAddress?: string;
  routeResult?: RouteResult | null;
  height?: number | string;
  className?: string;
  interactive?: boolean;
}

// Custom Driver pulsing radar marker HTML
function createDriverMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: "driver-leaflet-marker",
    html: `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(59, 130, 246, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 16px; height: 16px; border-radius: 50%; background: #2563EB; border: 3px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
          <div style="width: 4px; height: 4px; border-radius: 50%; background: #FFFFFF;"></div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// Custom Destination Outlet marker (RightGo orange pin)
function createOutletMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: "outlet-leaflet-marker",
    html: `
      <div style="position: relative; width: 34px; height: 42px; display: flex; flex-direction: column; align-items: center;">
        <div style="width: 30px; height: 30px; border-radius: 10px; background: #F97316; border: 2px solid #FFFFFF; box-shadow: 0 4px 10px rgba(249, 115, 22, 0.5); display: flex; align-items: center; justify-content: center; color: white; font-size: 14px;">
          🏪
        </div>
        <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 7px solid #F97316; margin-top: -1px;"></div>
      </div>
    `,
    iconSize: [34, 42],
    iconAnchor: [17, 40],
  });
}

export function MapboxRouteMap({
  driverPosition,
  destinationPosition,
  destinationName = "Retail Outlet Destination",
  destinationAddress = "Delivery Stop",
  routeResult,
  height = 360,
  className = "",
  interactive = true,
}: MapboxRouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const outletMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const routeGlowRef = useRef<L.Polyline | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // 1. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!containerRef.current) return;

    const centerLat = driverPosition?.lat ?? destinationPosition.lat;
    const centerLng = driverPosition?.lng ?? destinationPosition.lng;

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
    });

    if (interactive) {
      L.control.zoom({ position: "topright" }).addTo(map);
    }

    // High-resolution, watermark-free, ultra-reliable Esri World Street Map tiles
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        tileSize: 256,
      }
    ).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    [50, 150, 300, 600].forEach((delay) => {
      setTimeout(() => {
        if (mapRef.current) {
          try {
            mapRef.current.invalidateSize();
          } catch {
            // ignore
          }
        }
      }, delay);
    });

    // ResizeObserver to adapt immediately when container dimensions change
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          try {
            mapRef.current.invalidateSize();
          } catch {
            // ignore
          }
        }
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          // ignore
        }
        mapRef.current = null;
      }
      driverMarkerRef.current = null;
      outletMarkerRef.current = null;
      routeLineRef.current = null;
      routeGlowRef.current = null;
      setMapReady(false);
    };
  }, [interactive]);

  // 2. Render Markers, Route Line & Auto-fit bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    try {
      // ── 1. Destination Outlet Pin ──
      const destLatLng: L.LatLngTuple = [destinationPosition.lat, destinationPosition.lng];
      if (outletMarkerRef.current) {
        outletMarkerRef.current.setLatLng(destLatLng);
      } else {
        const marker = L.marker(destLatLng, {
          icon: createOutletMarkerIcon(),
          title: destinationName,
        })
          .bindPopup(`
            <div style="font-family: sans-serif; padding: 4px;">
              <strong style="color: #ea580c; font-size: 13px; display: block;">${destinationName}</strong>
              <span style="color: #475569; font-size: 11px;">${destinationAddress}</span>
            </div>
          `)
          .addTo(map);
        outletMarkerRef.current = marker;
      }

      // ── 2. Driver Location Marker ──
      if (driverPosition) {
        const driverLatLng: L.LatLngTuple = [driverPosition.lat, driverPosition.lng];
        if (driverMarkerRef.current) {
          driverMarkerRef.current.setLatLng(driverLatLng);
        } else {
          const marker = L.marker(driverLatLng, {
            icon: createDriverMarkerIcon(),
            title: "Driver Location (You)",
          })
            .bindPopup(`
              <div style="font-family: sans-serif; padding: 4px;">
                <strong style="color: #2563eb; font-size: 13px; display: block;">Driver Location (You)</strong>
                <span style="color: #475569; font-size: 11px;">PEL-R04 En Route</span>
              </div>
            `)
            .addTo(map);
          driverMarkerRef.current = marker;
        }
      } else if (driverMarkerRef.current) {
        driverMarkerRef.current.remove();
        driverMarkerRef.current = null;
      }

      // ── 3. Driving Road Polyline ──
      let latLngPoints: L.LatLngTuple[] = [];
      if (routeResult?.coordinates && routeResult.coordinates.length > 0) {
        // routeResult.coordinates is [lng, lat]
        latLngPoints = routeResult.coordinates.map(([lng, lat]) => [lat, lng]);
      } else if (driverPosition) {
        latLngPoints = [
          [driverPosition.lat, driverPosition.lng],
          [destinationPosition.lat, destinationPosition.lng],
        ];
      }

      if (latLngPoints.length > 0) {
        if (routeGlowRef.current) {
          routeGlowRef.current.setLatLngs(latLngPoints);
        } else {
          routeGlowRef.current = L.polyline(latLngPoints, {
            color: "#16A34A",
            weight: 8,
            opacity: 0.35,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(map);
        }

        if (routeLineRef.current) {
          routeLineRef.current.setLatLngs(latLngPoints);
        } else {
          routeLineRef.current = L.polyline(latLngPoints, {
            color: "#22C55E",
            weight: 4.5,
            opacity: 0.95,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(map);
        }

        // Auto-fit Bounds safely
        const bounds = L.latLngBounds(latLngPoints);
        map.fitBounds(bounds, {
          padding: [22, 22],
          maxZoom: 16,
          animate: true,
        });
      } else {
        map.setView(destLatLng, 14);
      }
    } catch (e) {
      console.warn("Leaflet render update notice:", e);
    }
  }, [
    mapReady,
    driverPosition,
    destinationPosition,
    destinationName,
    destinationAddress,
    routeResult,
  ]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200 z-0 ${className}`}
      style={{ height }}
    />
  );
}

export default MapboxRouteMap;
