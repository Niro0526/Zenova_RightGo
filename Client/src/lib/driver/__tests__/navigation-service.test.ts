import { describe, it, expect } from "vitest";
import {
  formatDistance,
  formatDuration,
  formatArrivalTime,
  getManeuverIcon,
  calculateHaversineDistanceKm,
  estimateStraightLineRoute,
  calculateRoute,
  isWithinArrivalRadius,
  getMapboxToken,
  isRealMapboxToken,
  getExternalNavigationUrl,
  type LatLng,
} from "../navigation-service";

describe("Driver Navigation & Mapbox Routing Service", () => {
  it("formats distance accurately in km and meters", () => {
    expect(formatDistance(4200)).toBe("4.2 km");
    expect(formatDistance(10500)).toBe("10.5 km");
    expect(formatDistance(350)).toBe("350 m");
    expect(formatDistance(0)).toBe("0 m");
  });

  it("formats duration accurately in minutes and hours", () => {
    expect(formatDuration(720)).toBe("12 min");
    expect(formatDuration(60)).toBe("1 min");
    expect(formatDuration(30)).toBe("< 1 min");
    expect(formatDuration(3900)).toBe("1 hr 5 min");
    expect(formatDuration(7200)).toBe("2 hr");
  });

  it("formats arrival time accurately in clock format", () => {
    const arrival = formatArrivalTime(1800); // 30 minutes from now
    expect(arrival).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
  });

  it("returns correct maneuver icons for turn directions", () => {
    expect(getManeuverIcon("turn", "right")).toBe("↱");
    expect(getManeuverIcon("turn", "left")).toBe("↰");
    expect(getManeuverIcon("turn", "slight right")).toBe("↗");
    expect(getManeuverIcon("turn", "slight left")).toBe("↖");
    expect(getManeuverIcon("arrive")).toBe("📍");
    expect(getManeuverIcon("continue")).toBe("↑");
  });

  it("calculates haversine distance between Colombo landmarks correctly", () => {
    // Colpetty (6.9034, 79.8512) to Bambalapitiya (6.8905, 79.8587) is approx 1.6 - 1.8 km
    const colpetty: LatLng = { lat: 6.9034, lng: 79.8512 };
    const bambalapitiya: LatLng = { lat: 6.8905, lng: 79.8587 };

    const distanceKm = calculateHaversineDistanceKm(colpetty, bambalapitiya);
    expect(distanceKm).toBeGreaterThan(1.2);
    expect(distanceKm).toBeLessThan(2.2);
  });

  it("generates Mapbox GeoJSON fallback route when offline or unannotated", () => {
    const origin: LatLng = { lat: 6.9271, lng: 79.8612 };
    const destination: LatLng = { lat: 6.9034, lng: 79.8512 };

    const fallback = estimateStraightLineRoute(origin, destination);
    expect(fallback.distanceMeters).toBeGreaterThan(1000);
    expect(fallback.durationSeconds).toBeGreaterThan(60);
    expect(fallback.estimatedArrivalTime).toBeDefined();
    expect(fallback.hasTrafficData).toBe(false); // Does not fake traffic data
    expect(fallback.trafficCondition).toBeNull();
    expect(fallback.coordinates).toHaveLength(2);
    expect(fallback.coordinates[0]).toEqual([origin.lng, origin.lat]);
    expect(fallback.coordinates[1]).toEqual([destination.lng, destination.lat]);
    expect(fallback.steps.length).toBeGreaterThan(0);
    expect(fallback.nextInstruction).toBeDefined();
  });

  it("reads Mapbox public token from environment or provides secure fallback", () => {
    const token = getMapboxToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(isRealMapboxToken("pk.eyJ1IjoicmlnaHRnby1kZW1vIiwiYSI6ImNsdHpyMG14ZDA0ZzYya3BndWoxZXFmdzQifQ.example_token_rightgo")).toBe(false);
    expect(isRealMapboxToken("your_mapbox_public_token_here")).toBe(false);
    expect(isRealMapboxToken("pk.eyJ1IjoidXNlcm5hbWUiLCJhIjoiY2x0enIwbXhkMDRnejJ5YWtwZ2d1b3gxeXFmd3EifQ.abcdefghijklmnopqrstuvwxyz123456")).toBe(true);
  });

  it("calculates route with fallback gracefully if remote API is unmocked", async () => {
    const origin: LatLng = { lat: 6.9271, lng: 79.8612 };
    const destination: LatLng = { lat: 6.9034, lng: 79.8512 };

    const result = await calculateRoute(origin, destination);
    expect(result).toBeDefined();
    expect(result.distanceMeters).toBeGreaterThan(0);
    expect(result.formattedDistance).toContain("km");
    expect(result.formattedDuration).toContain("min");
    expect(result.estimatedArrivalTime).toBeDefined();
    expect(result.nextInstruction).toBeDefined();
  });

  it("detects GPS arrival proximity within 150m radius", () => {
    const destination: LatLng = { lat: 6.9034, lng: 79.8512 }; // Colpetty
    
    // Exact same location (0m away)
    const exactPos: LatLng = { lat: 6.9034, lng: 79.8512 };
    expect(isWithinArrivalRadius(exactPos, destination, 150).isNear).toBe(true);

    // 50m away
    const nearPos: LatLng = { lat: 6.9038, lng: 79.8512 };
    const nearResult = isWithinArrivalRadius(nearPos, destination, 150);
    expect(nearResult.isNear).toBe(true);
    expect(nearResult.distanceMeters).toBeLessThan(100);

    // 2.5km away
    const farPos: LatLng = { lat: 6.9271, lng: 79.8612 };
    const farResult = isWithinArrivalRadius(farPos, destination, 150);
    expect(farResult.isNear).toBe(false);
    expect(farResult.distanceMeters).toBeGreaterThan(1000);
  });

  it("generates valid external navigation URLs without paid API keys", () => {
    const destination: LatLng = { lat: 6.9034, lng: 79.8512 };
    const url = getExternalNavigationUrl(destination, "Colpetty Retailer");

    expect(url).toContain("https://www.google.com/maps/dir/?api=1");
    expect(url).toContain("destination=6.9034,79.8512");
  });
});
