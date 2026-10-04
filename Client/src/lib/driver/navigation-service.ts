/**
 * RightGo Driver Navigation & Mapbox Routing Service
 * Connects browser Geolocation, Mapbox GL JS, and Mapbox Directions API (with driving-traffic profile) for real-time driver navigation.
 */

export interface LatLng {
  lat: number;
  lng: number;
  accuracy?: number; // GPS accuracy in meters
}

export const DEFAULT_ARRIVAL_RADIUS_METERS = 150;

/**
 * Check if the driver is within the fixed 150m arrival proximity radius of the destination.
 * Detects low GPS accuracy without automatically expanding the radius.
 */
export function isWithinArrivalRadius(
  driverPos: LatLng | null,
  destinationPos: LatLng,
  radiusMeters: number = DEFAULT_ARRIVAL_RADIUS_METERS
): {
  isNear: boolean;
  distanceMeters: number;
  formattedDistance: string;
  isLowAccuracy: boolean;
} {
  if (!driverPos) {
    return {
      isNear: false,
      distanceMeters: 999999,
      formattedDistance: "Unknown",
      isLowAccuracy: false,
    };
  }

  const distanceKm = calculateHaversineDistanceKm(driverPos, destinationPos);
  const distanceMeters = Math.round(distanceKm * 1000);

  // Keep fixed radius at 150m without automatic expansion
  const isNear = distanceMeters <= radiusMeters;
  const isLowAccuracy = (driverPos.accuracy || 0) > 50;

  return {
    isNear,
    distanceMeters,
    formattedDistance: formatDistance(distanceMeters),
    isLowAccuracy,
  };
}

export type TrafficCondition = "Low" | "Moderate" | "Heavy" | "Severe";

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  formattedDistance: string;
  durationSeconds: number;
  name?: string;
  icon: string;
  maneuver?: {
    type?: string;
    modifier?: string;
    instruction?: string;
  };
}

export interface RouteResult {
  coordinates: [number, number][]; // [lng, lat] GeoJSON format for Mapbox GL JS
  latLngCoordinates: [number, number][]; // [lat, lng] format
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  formattedDistance: string;
  formattedDuration: string;
  estimatedArrivalTime: string; // e.g. "7:42 AM"

  // Traffic-aware fields (Only present when Mapbox driving-traffic provides valid data)
  hasTrafficData: boolean;
  trafficCondition: TrafficCondition | null;
  trafficDelayMinutes: number | null;
  formattedTrafficDelay: string | null; // e.g. "+6 min delay" or "Normal traffic"
  typicalDurationMinutes: number | null;
  formattedTypicalDuration: string | null; // e.g. "22 min typical"

  steps: RouteStep[];
  nextInstruction: string;
  nextStep: RouteStep | null;
  summary?: string;
}

export type GeolocationErrorCode =
  | "PERMISSION_DENIED"
  | "POSITION_UNAVAILABLE"
  | "TIMEOUT"
  | "NOT_SUPPORTED"
  | "UNKNOWN";

export interface GeolocationError {
  code: GeolocationErrorCode;
  message: string;
}

/**
 * Check if the provided token is a valid format Mapbox public access token (not a dummy/example placeholder)
 */
export function isRealMapboxToken(token?: string | null): boolean {
  if (!token) return false;
  return (
    token.startsWith("pk.") &&
    !token.includes("example") &&
    !token.includes("your_mapbox") &&
    !token.includes("rightgo-demo") &&
    token.length > 35
  );
}

/**
 * Get Mapbox public token from environment variables
 */
export function getMapboxToken(): string {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
}

/**
 * Helper to determine clean maneuver icon symbol
 */
export function getManeuverIcon(type?: string, modifier?: string): string {
  if (type === "arrive") return "📍";
  if (type === "depart") return "🚗";
  if (type === "roundabout" || type === "rotary") return "🔄";

  if (modifier) {
    if (modifier.includes("sharp right")) return "↳";
    if (modifier.includes("sharp left")) return "↲";
    if (modifier.includes("slight right")) return "↗";
    if (modifier.includes("slight left")) return "↖";
    if (modifier.includes("right")) return "↱";
    if (modifier.includes("left")) return "↰";
    if (modifier.includes("uturn")) return "⮌";
    if (modifier.includes("straight")) return "↑";
  }

  if (type?.includes("turn") && type?.includes("right")) return "↱";
  if (type?.includes("turn") && type?.includes("left")) return "↰";

  return "↑";
}

/**
 * Format clock time for estimated arrival (e.g. "7:42 AM")
 */
export function formatArrivalTime(durationSeconds: number): string {
  const arrivalDate = new Date(Date.now() + durationSeconds * 1000);
  return arrivalDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Get current driver GPS position using browser Geolocation API
 */
export function getCurrentDriverPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      const err: GeolocationError = {
        code: "NOT_SUPPORTED",
        message: "Geolocation is not supported by your device browser.",
      };
      reject(err);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (geoError) => {
        let code: GeolocationErrorCode = "UNKNOWN";
        let message = "Unable to acquire current location.";

        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            code = "PERMISSION_DENIED";
            message =
              "Location permission denied. Please enable device GPS permissions in your browser.";
            break;
          case geoError.POSITION_UNAVAILABLE:
            code = "POSITION_UNAVAILABLE";
            message = "GPS location is currently unavailable on this device.";
            break;
          case geoError.TIMEOUT:
            code = "TIMEOUT";
            message = "Location request timed out. Please retry.";
            break;
        }

        const err: GeolocationError = { code, message };
        reject(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000,
      }
    );
  });
}

/**
 * Watch driver GPS position live while navigation view is active.
 * Returns an unwatch cleanup function.
 */
export function watchDriverPosition(
  onPosition: (pos: LatLng) => void,
  onError?: (err: GeolocationError) => void
): () => void {
  if (typeof window === "undefined" || !navigator.geolocation) {
    if (onError) {
      onError({
        code: "NOT_SUPPORTED",
        message: "Geolocation is not supported by your device browser.",
      });
    }
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      onPosition({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
    },
    (geoError) => {
      let code: GeolocationErrorCode = "UNKNOWN";
      let message = "Unable to track live GPS position.";
      if (geoError.code === geoError.PERMISSION_DENIED) {
        code = "PERMISSION_DENIED";
        message = "Location permission denied.";
      } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
        code = "POSITION_UNAVAILABLE";
        message = "GPS position unavailable.";
      } else if (geoError.code === geoError.TIMEOUT) {
        code = "TIMEOUT";
        message = "GPS update timed out.";
      }
      if (onError) {
        onError({ code, message });
      }
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000,
    }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}

/**
 * Calculate driving route using Mapbox Directions API with mapbox/driving-traffic profile
 */
export async function calculateRoute(
  origin: LatLng,
  destination: LatLng
): Promise<RouteResult> {
  const token = getMapboxToken();

  // If token is missing or a placeholder, fallback cleanly to straight-line estimation without remote 401 calls
  if (!isRealMapboxToken(token)) {
    return estimateStraightLineRoute(origin, destination);
  }

  // Mapbox Directions v5 using driving-traffic profile with congestion annotations
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&steps=true&overview=full&annotations=congestion,duration,distance&access_token=${token}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Mapbox Directions API failed with status ${res.status}`);
    }

    const data = await res.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error(data.message || "No valid driving route returned from Mapbox.");
    }

    const primaryRoute = data.routes[0];
    const geojsonCoords: [number, number][] = primaryRoute.geometry.coordinates; // [lng, lat]
    const latLngCoords: [number, number][] = geojsonCoords.map(([lng, lat]) => [lat, lng]);

    const distanceMeters = primaryRoute.distance;
    const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
    const durationSeconds = primaryRoute.duration;
    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

    // Parse turn-by-turn steps
    const steps: RouteStep[] = [];
    if (primaryRoute.legs && primaryRoute.legs.length > 0) {
      for (const step of primaryRoute.legs[0].steps || []) {
        const icon = getManeuverIcon(step.maneuver?.type, step.maneuver?.modifier);
        steps.push({
          instruction: step.maneuver?.instruction || step.name || "Continue driving",
          distanceMeters: step.distance,
          formattedDistance: formatDistance(step.distance),
          durationSeconds: step.duration,
          name: step.name,
          icon,
          maneuver: step.maneuver,
        });
      }
    }

    const nextStep = steps.length > 0 ? steps[0] : null;
    const nextInstruction =
      nextStep ? nextStep.instruction : "Proceed to destination outlet";

    // Traffic analysis ONLY if Mapbox returns congestion annotation or duration_typical
    let hasTrafficData = false;
    let trafficCondition: TrafficCondition | null = null;
    let trafficDelayMinutes: number | null = null;
    let formattedTrafficDelay: string | null = null;
    let typicalDurationMinutes: number | null = null;
    let formattedTypicalDuration: string | null = null;

    const leg = primaryRoute.legs?.[0];
    const congestionList: string[] = leg?.annotation?.congestion || [];
    const durationTypical = primaryRoute.duration_typical || leg?.duration_typical;

    if (durationTypical && durationTypical > 0) {
      hasTrafficData = true;
      typicalDurationMinutes = Math.max(1, Math.round(durationTypical / 60));
      formattedTypicalDuration = `${typicalDurationMinutes} min typical`;

      const delaySeconds = Math.max(0, durationSeconds - durationTypical);
      const delayMins = Math.round(delaySeconds / 60);

      if (delayMins >= 1) {
        trafficDelayMinutes = delayMins;
        formattedTrafficDelay = `+${delayMins} min delay`;
      } else {
        trafficDelayMinutes = 0;
        formattedTrafficDelay = "On time";
      }
    }

    if (congestionList.length > 0) {
      hasTrafficData = true;
      if (congestionList.includes("severe") || (trafficDelayMinutes !== null && trafficDelayMinutes >= 12)) {
        trafficCondition = "Severe";
      } else if (congestionList.includes("heavy") || (trafficDelayMinutes !== null && trafficDelayMinutes >= 6)) {
        trafficCondition = "Heavy";
      } else if (congestionList.includes("moderate") || (trafficDelayMinutes !== null && trafficDelayMinutes >= 2)) {
        trafficCondition = "Moderate";
      } else {
        trafficCondition = "Low";
      }
    } else if (trafficDelayMinutes !== null) {
      if (trafficDelayMinutes >= 12) trafficCondition = "Severe";
      else if (trafficDelayMinutes >= 6) trafficCondition = "Heavy";
      else if (trafficDelayMinutes >= 2) trafficCondition = "Moderate";
      else trafficCondition = "Low";
    }

    return {
      coordinates: geojsonCoords,
      latLngCoordinates: latLngCoords,
      distanceMeters,
      distanceKm,
      durationSeconds,
      durationMinutes,
      formattedDistance: `${distanceKm.toFixed(1)} km`,
      formattedDuration: `${durationMinutes} min`,
      estimatedArrivalTime: formatArrivalTime(durationSeconds),
      hasTrafficData,
      trafficCondition,
      trafficDelayMinutes,
      formattedTrafficDelay,
      typicalDurationMinutes,
      formattedTypicalDuration,
      steps,
      nextInstruction,
      nextStep,
      summary: leg?.summary || "",
    };
  } catch (err: unknown) {
    console.warn("Mapbox Directions API unavailable, using fallback estimation:", err);
    return estimateStraightLineRoute(origin, destination);
  }
}

/**
 * Format distance in meters to clean km or m label
 */
export function formatDistance(distanceMeters: number): string {
  if (distanceMeters >= 1000) {
    const km = distanceMeters / 1000;
    return `${km % 1 === 0 ? km.toFixed(0) : km.toFixed(1)} km`;
  }
  return `${Math.round(distanceMeters)} m`;
}

/**
 * Format duration in seconds to clean min or hr label
 */
export function formatDuration(durationSeconds: number): string {
  if (durationSeconds < 60) {
    return "< 1 min";
  }
  const totalMinutes = Math.round(durationSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const remainderMinutes = totalMinutes % 60;
  if (remainderMinutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainderMinutes} min`;
}

/**
 * Calculate direct Haversine great-circle distance in kilometers
 */
export function calculateHaversineDistanceKm(origin: LatLng, destination: LatLng): number {
  const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
  const dLng = ((destination.lng - origin.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((origin.lat * Math.PI) / 180) *
      Math.cos((destination.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

/**
 * Fallback straight-line route estimation if Mapbox API is offline or unavailable
 * (Never generates fake traffic data; hasTrafficData is explicitly false)
 */
export function estimateStraightLineRoute(origin: LatLng, destination: LatLng): RouteResult {
  const straightLineKm = calculateHaversineDistanceKm(origin, destination);

  // Road factor 1.35x and urban speed 35 km/h
  const roadKm = Math.round(straightLineKm * 1.35 * 10) / 10;
  const durationMin = Math.max(2, Math.round((roadKm / 35) * 60));
  const distanceMeters = roadKm * 1000;
  const durationSeconds = durationMin * 60;

  const geojsonCoords: [number, number][] = [
    [origin.lng, origin.lat],
    [destination.lng, destination.lat],
  ];

  const latLngCoords: [number, number][] = [
    [origin.lat, origin.lng],
    [destination.lat, destination.lng],
  ];

  const fallbackStep: RouteStep = {
    instruction: "Head towards destination outlet along main road",
    distanceMeters,
    formattedDistance: formatDistance(distanceMeters),
    durationSeconds,
    icon: "↑",
  };

  return {
    coordinates: geojsonCoords,
    latLngCoordinates: latLngCoords,
    distanceMeters,
    distanceKm: roadKm,
    durationSeconds,
    durationMinutes: durationMin,
    formattedDistance: formatDistance(distanceMeters),
    formattedDuration: formatDuration(durationSeconds),
    estimatedArrivalTime: formatArrivalTime(durationSeconds),
    hasTrafficData: false, // Explicitly false: No faked traffic
    trafficCondition: null,
    trafficDelayMinutes: null,
    formattedTrafficDelay: null,
    typicalDurationMinutes: null,
    formattedTypicalDuration: null,
    steps: [fallbackStep],
    nextInstruction: "Head towards destination outlet along main road",
    nextStep: fallbackStep,
    summary: "Direct estimated route",
  };
}

/**
 * Generate Google Maps navigation URL
 */
export function getGoogleMapsUrl(destination: LatLng, outletName?: string): string {
  const label = encodeURIComponent(outletName || "Delivery Destination");
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&destination_place_id=${label}`;
}

/**
 * Generate OpenStreetMap directions URL
 */
export function getOpenStreetMapUrl(destination: LatLng, origin?: LatLng | null): string {
  if (origin) {
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origin.lat}%2C${origin.lng}%3B${destination.lat}%2C${destination.lng}`;
  }
  return `https://www.openstreetmap.org/?mlat=${destination.lat}&mlon=${destination.lng}#map=16/${destination.lat}/${destination.lng}`;
}

/**
 * Generate Waze navigation URL
 */
export function getWazeUrl(destination: LatLng): string {
  return `https://waze.com/ul?ll=${destination.lat},${destination.lng}&navigate=yes`;
}

/**
 * Generate Apple Maps navigation URL
 */
export function getAppleMapsUrl(destination: LatLng, outletName?: string): string {
  const label = encodeURIComponent(outletName || "Delivery Destination");
  return `https://maps.apple.com/?daddr=${destination.lat},${destination.lng}&q=${label}`;
}

/**
 * Generate default external Maps navigation URL (Google Maps format) without requiring paid API keys
 */
export function getExternalNavigationUrl(
  destination: LatLng,
  outletName?: string
): string {
  return getGoogleMapsUrl(destination, outletName);
}
