"use client";

import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  type LatLng,
  type RouteResult,
  getMapboxToken,
  isRealMapboxToken,
} from "@/lib/driver/navigation-service";

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

// Universal OpenStreetMap / HOT Raster Style for Mapbox GL (Clean, high-resolution, no watermark)
const UNIVERSAL_RASTER_STYLE: any = {
  version: 8,
  sources: {
    "osm-hot-tiles": {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: "osm-hot-layer",
      type: "raster",
      source: "osm-hot-tiles",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

// Create custom DOM element for Driver location marker (pulsing radar)
function createDriverMarkerElement(): HTMLElement {
  const el = document.createElement("div");
  el.className = "custom-mapbox-driver-marker";
  el.style.width = "32px";
  el.style.height = "32px";
  el.style.position = "relative";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";

  el.innerHTML = `
    <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(59, 130, 246, 0.45); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
    <div style="position: relative; width: 18px; height: 18px; border-radius: 50%; background: #2563EB; border: 3px solid #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
      <div style="width: 5px; height: 5px; border-radius: 50%; background: #FFFFFF;"></div>
    </div>
  `;
  return el;
}

// Create custom DOM element for Destination Outlet marker (RightGo orange pin)
function createOutletMarkerElement(outletName: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "custom-mapbox-outlet-marker";
  el.style.width = "36px";
  el.style.height = "44px";
  el.style.position = "relative";
  el.style.display = "flex";
  el.style.flexDirection = "column";
  el.style.alignItems = "center";
  el.style.cursor = "pointer";

  el.innerHTML = `
    <div style="width: 32px; height: 32px; border-radius: 12px; background: #F97316; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.55); display: flex; align-items: center; justify-content: center; color: white; font-size: 15px;">
      🏪
    </div>
    <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #F97316; margin-top: -1px;"></div>
  `;
  el.title = outletName;
  return el;
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
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const outletMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const token = getMapboxToken();
  const validToken = isRealMapboxToken(token);

  // 1. Initialize Mapbox GL instance
  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapboxgl.supported()) {
      setMapError("WebGL is not supported in this browser environment.");
      return;
    }

    // Only set accessToken if a genuine Mapbox public token is supplied; otherwise leave empty to prevent 401 telemetry/session pings
    if (validToken) {
      mapboxgl.accessToken = token;
    } else {
      mapboxgl.accessToken = "";
    }

    const centerLng = driverPosition?.lng ?? destinationPosition.lng;
    const centerLat = driverPosition?.lat ?? destinationPosition.lat;

    // If real public Mapbox token is configured, use official vector streets; otherwise, use universal raster tiles
    const initialStyle = validToken
      ? "mapbox://styles/mapbox/streets-v12"
      : UNIVERSAL_RASTER_STYLE;

    try {
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: initialStyle,
        center: [centerLng, centerLat],
        zoom: 13.5,
        interactive: interactive,
        attributionControl: false,
      });

      if (interactive) {
        map.addControl(
          new mapboxgl.NavigationControl({ showCompass: false }),
          "top-right"
        );
      }

      // If vector style fails with 401 Unauthorized, automatically fallback to universal raster style
      map.on("error", (e: any) => {
        if (
          e?.error?.status === 401 ||
          (typeof e?.error?.message === "string" &&
            e.error.message.includes("401"))
        ) {
          try {
            map.setStyle(UNIVERSAL_RASTER_STYLE);
          } catch (styleErr) {
            console.warn("Style fallback error:", styleErr);
          }
        }
      });

      const handleReady = () => {
        mapRef.current = map;
        setMapLoaded(true);

        setTimeout(() => {
          if (mapRef.current) {
            try {
              mapRef.current.resize();
            } catch (e) {
              // ignore unmounted resize
            }
          }
        }, 100);
      };

      map.on("load", handleReady);
      map.on("style.load", handleReady);

      mapRef.current = map;
    } catch (err: any) {
      console.warn("Mapbox map initialization error:", err);
      setMapError("Mapbox map initialization notice: " + (err?.message || ""));
    }

    // ResizeObserver to adapt dynamically when parent container resizes
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          try {
            mapRef.current.resize();
          } catch (e) {
            // ignore unmounted resize
          }
        }
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (driverMarkerRef.current) {
        driverMarkerRef.current.remove();
        driverMarkerRef.current = null;
      }
      if (outletMarkerRef.current) {
        outletMarkerRef.current.remove();
        outletMarkerRef.current = null;
      }
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          // ignore unmounted removal
        }
        mapRef.current = null;
      }
      setMapLoaded(false);
    };
  }, [token, interactive, isRealMapboxToken]);

  // 2. Update markers, route polyline, and auto-fit bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const renderLayersAndMarkers = () => {
      try {
        // ── 1. Destination Outlet Marker ──
        if (outletMarkerRef.current) {
          outletMarkerRef.current.setLngLat([
            destinationPosition.lng,
            destinationPosition.lat,
          ]);
        } else {
          const outletEl = createOutletMarkerElement(destinationName);
          const outletPopup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="font-family: sans-serif; padding: 4px;">
              <strong style="color: #ea580c; font-size: 13px; display: block;">${destinationName}</strong>
              <span style="color: #475569; font-size: 11px;">${destinationAddress}</span>
            </div>
          `);
          const marker = new mapboxgl.Marker({ element: outletEl, anchor: "bottom" })
            .setLngLat([destinationPosition.lng, destinationPosition.lat])
            .setPopup(outletPopup)
            .addTo(map);
          outletMarkerRef.current = marker;
        }

        // ── 2. Driver Current Location Marker ──
        if (driverPosition) {
          if (driverMarkerRef.current) {
            driverMarkerRef.current.setLngLat([
              driverPosition.lng,
              driverPosition.lat,
            ]);
          } else {
            const driverEl = createDriverMarkerElement();
            const driverPopup = new mapboxgl.Popup({ offset: 15 }).setHTML(`
              <div style="font-family: sans-serif; padding: 4px;">
                <strong style="color: #2563eb; font-size: 13px; display: block;">Driver Location (You)</strong>
                <span style="color: #475569; font-size: 11px;">PEL-R04 En Route</span>
              </div>
            `);
            const marker = new mapboxgl.Marker({ element: driverEl, anchor: "center" })
              .setLngLat([driverPosition.lng, driverPosition.lat])
              .setPopup(driverPopup)
              .addTo(map);
            driverMarkerRef.current = marker;
          }
        } else if (driverMarkerRef.current) {
          driverMarkerRef.current.remove();
          driverMarkerRef.current = null;
        }

        // ── 3. Driving Route Polyline ──
        const routeCoordinates: [number, number][] =
          routeResult?.coordinates && routeResult.coordinates.length > 0
            ? routeResult.coordinates
            : driverPosition
            ? [
                [driverPosition.lng, driverPosition.lat],
                [destinationPosition.lng, destinationPosition.lat],
              ]
            : [];

        const geojsonData: GeoJSON.Feature<GeoJSON.LineString> = {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: routeCoordinates,
          },
        };

        if (map.isStyleLoaded()) {
          const source = map.getSource("route-source") as mapboxgl.GeoJSONSource;
          if (source) {
            source.setData(geojsonData);
          } else if (routeCoordinates.length > 0) {
            map.addSource("route-source", {
              type: "geojson",
              data: geojsonData,
            });

            // Glowing outer polyline
            if (!map.getLayer("route-glow-layer")) {
              map.addLayer({
                id: "route-glow-layer",
                type: "line",
                source: "route-source",
                layout: {
                  "line-join": "round",
                  "line-cap": "round",
                },
                paint: {
                  "line-color": "#16A34A",
                  "line-width": 8,
                  "line-opacity": 0.35,
                },
              });
            }

            // Core driving route polyline
            if (!map.getLayer("route-line-layer")) {
              map.addLayer({
                id: "route-line-layer",
                type: "line",
                source: "route-source",
                layout: {
                  "line-join": "round",
                  "line-cap": "round",
                },
                paint: {
                  "line-color": "#22C55E",
                  "line-width": 4.5,
                  "line-opacity": 0.95,
                },
              });
            }
          }
        }

        // ── 4. Auto-fit Bounds so complete route and markers are visible ──
        const bounds = new mapboxgl.LngLatBounds();
        if (routeCoordinates.length > 0) {
          routeCoordinates.forEach((coord) => bounds.extend(coord));
          map.fitBounds(bounds, {
            padding: { top: 45, bottom: 45, left: 45, right: 45 },
            maxZoom: 16,
            duration: 600,
          });
        } else {
          bounds.extend([destinationPosition.lng, destinationPosition.lat]);
          if (driverPosition) {
            bounds.extend([driverPosition.lng, driverPosition.lat]);
          }
          map.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            maxZoom: 15,
            duration: 600,
          });
        }
      } catch (e) {
        console.warn("Mapbox render error:", e);
      }
    };

    if (map.isStyleLoaded()) {
      renderLayersAndMarkers();
    } else {
      map.once("style.load", renderLayersAndMarkers);
    }
  }, [
    mapLoaded,
    driverPosition,
    destinationPosition,
    destinationName,
    destinationAddress,
    routeResult,
  ]);

  if (mapError) {
    return (
      <div
        className={`w-full bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-white gap-2 p-6 text-center border border-slate-700 ${className}`}
        style={{ height }}
      >
        <span className="text-sm font-bold text-amber-400">
          Mapbox Display Notice
        </span>
        <span className="text-xs text-slate-300 max-w-sm">
          {mapError}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200 z-0 ${className}`}
      style={{ height }}
    />
  );
}

export default MapboxRouteMap;
