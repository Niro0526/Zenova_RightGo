import { formatColomboDate, formatShortDate } from "@/lib/dateUtils";

export interface ApiOrderRow {
  order_ref: string;
  delivery_id?: string;
  outlet_id: string;
  brand: string;
  temp_requirement?: string;
  order_units?: number;
  status?: string;
  created_at?: string;
  order_weight_kg?: number;
  order_volume_m3?: number;
  notes?: string;
}

function mapStatus(status?: string): string {
  switch ((status || "").toLowerCase()) {
    case "awaiting_planning":
      return "Awaiting Planning";
    case "planned":
      return "Planned";
    case "out_for_delivery":
    case "in_transit":
      return "Out for Delivery";
    case "delivered":
      return "Delivered";
    case "deferred":
      return "Deferred";
    case "cancelled":
      return "Cancelled";
    default:
      return status || "Awaiting Planning";
  }
}

function sectionForStatus(status: string): string {
  if (status === "Delivered") return "completed";
  if (status === "Deferred") return "deferred";
  if (status === "Out for Delivery" || status === "Planned") return "active";
  return "future";
}

export function mapApiOrderToUi(o: ApiOrderRow): Record<string, unknown> {
  const status = mapStatus(o.status);
  const created = o.created_at ? new Date(o.created_at) : new Date();
  const orderDateLabel = formatColomboDate(0, true);
  return {
    delivery_id: o.delivery_id || o.order_ref,
    order_ref: o.order_ref,
    outlet_id: o.outlet_id,
    brand: o.brand,
    brand_code: o.brand.slice(0, 2).toUpperCase(),
    order_type: `Brand ${o.brand}`,
    order_date: orderDateLabel,
    status,
    section: sectionForStatus(status),
    expected_arrival: `Today, ${formatShortDate(0)}`,
    planned_dispatch: formatShortDate(1),
    weight_kg: o.order_weight_kg,
    volume_m3: o.order_volume_m3,
    units: o.order_units,
    notes: o.notes,
    items: [
      {
        name: `${o.brand} replenishment (${o.order_units ?? 0} units)`,
        qty: o.order_units ?? 0,
        unit: "units",
        expected: o.order_units ?? 0,
        loaded: o.order_units ?? 0,
        temp: o.temp_requirement === "chilled" ? "Chilled (+4°C)" : "Ambient",
      },
    ],
    created_at: created.toISOString(),
  };
}
