import { createClient } from "@supabase/supabase-js";

export const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      )
    : null;

export type LoaderTrip = Record<string, unknown> & {
  id: string;
  status?: string | null;
  vehicle?: string | null;
  vehicle_id?: string | null;
  vehicle_type?: string | null;
  bay?: string | null;
  route?: string | null;
  route_name?: string | null;
  departure?: string | null;
  departure_time?: string | null;
  area?: string | null;
};

export type LoadSequenceRow = Record<string, unknown> & {
  id?: string | number;
  trip_id?: string | number;
  sequence?: number | string | null;
  sequence_no?: number | string | null;
  order_index?: number | string | null;
  stop_number?: number | string | null;
  outlet?: string | null;
  outlet_name?: string | null;
  order_ref?: string | null;
  sku?: string | null;
  quantity?: number | string | null;
  weight_kg?: number | string | null;
  status?: string | null;
  is_loaded?: boolean | null;
  lifo_sequence?: number | string | null;
  parcel_count?: number | string | null;
  compartment?: string | null;
  compartment_location?: string | null;
  item_code?: string | null;
  weight?: number | string | null;
};

export function activeTripId(): string {
  if (typeof window === "undefined") return "S1-T001";
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("trip_id") ||
    params.get("trip_code") ||
    params.get("tripId") ||
    window.localStorage.getItem("activeTripId") ||
    "S1-T001"
  );
}

export function rememberTrip(tripId: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("activeTripId", tripId);
  }
}

export function rowText(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && value !== "") return String(value);
  }
  return "—";
}
