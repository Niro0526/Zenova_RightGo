import type {
  DistrictTravel,
  S1Order,
  ServiceAllowance,
  Vehicle,
} from "@/types/dispatcher";
import { apiGet } from "@/lib/api-client";

export interface DispatcherDataAdapter {
  listOrders(): S1Order[];
  listFleetVehicles(): (Vehicle & { status: "available" | "in_workshop" })[];
  listServiceAllowances(): ServiceAllowance[];
  listDistrictTravel(): DistrictTravel[];
}

type ApiOrder = {
  scenario: string;
  order_ref: string;
  delivery_id?: string;
  outlet_id: string;
  brand: string;
  district: string;
  depot: string;
  dock_type: string;
  parking_constraint: string;
  mall_window: string | null;
  window_open_time: string;
  window_close_time: string;
  temp_requirement: string;
  order_units: number;
  order_weight_kg: number;
  order_volume_m3: number;
  deferred_yesterday: boolean;
  days_since_last_served: number;
};

type ApiVehicle = {
  vehicle_id: string;
  type: string;
  temp: string;
  weight_cap_kg: number;
  volume_cap_m3: number;
  fuel_type: string;
  km_per_l: number;
  weekly_fuel_quota_l: number;
  depot: string;
  status?: string;
};

let cached: DispatcherDataAdapter | null = null;

function mapOrder(o: ApiOrder): S1Order {
  return {
    scenario: "S1",
    orderRef: o.order_ref,
    outletId: o.outlet_id,
    brand: o.brand as S1Order["brand"],
    district: o.district,
    depot: o.depot,
    dockType: o.dock_type as S1Order["dockType"],
    parkingConstraint: o.parking_constraint as S1Order["parkingConstraint"],
    mallWindow: o.mall_window,
    windowOpenTime: o.window_open_time,
    windowCloseTime: o.window_close_time,
    tempRequirement: o.temp_requirement as S1Order["tempRequirement"],
    orderUnits: o.order_units,
    orderWeightKg: o.order_weight_kg,
    orderVolumeM3: o.order_volume_m3,
    deferredYesterday: o.deferred_yesterday,
    daysSinceLastServed: o.days_since_last_served,
  };
}

export async function hydrateDispatcherAdapter(): Promise<void> {
  const [orders, vehicles, allowances, travel] = await Promise.all([
    apiGet<ApiOrder[]>("/orders?scenario=S1"),
    apiGet<ApiVehicle[]>("/reference/vehicles?scenario=S1"),
    apiGet<
      Array<{
        brand: string;
        dock_type: string;
        service_allowance_min: number;
      }>
    >("/reference/allowances"),
    apiGet<
      Array<{
        district: string;
        depot: string;
        road_class: string;
        free_flow_kmh: number;
        depot_to_district_km: number;
        depot_to_district_freeflow_min: number;
        inter_stop_km: number;
        inter_stop_freeflow_min: number;
      }>
    >("/reference/travel"),
  ]);

  const mappedOrders = orders.map(mapOrder);
  const mappedVehicles = vehicles.map((v) => ({
    vehicleId: v.vehicle_id,
    type: v.type as Vehicle["type"],
    temp: v.temp as Vehicle["temp"],
    weightCapKg: v.weight_cap_kg,
    volumeCapM3: v.volume_cap_m3,
    fuelType: v.fuel_type,
    kmPerL: v.km_per_l,
    weeklyFuelQuotaL: v.weekly_fuel_quota_l,
    depot: v.depot,
    status: (v.status === "in_workshop" ? "in_workshop" : "available") as
      | "available"
      | "in_workshop",
  }));

  const mappedAllowances: ServiceAllowance[] = allowances.map((a) => ({
    brand: a.brand as ServiceAllowance["brand"],
    dockType: a.dock_type as ServiceAllowance["dockType"],
    serviceAllowanceMin: a.service_allowance_min,
  }));

  const mappedTravel: DistrictTravel[] = travel.map((t) => ({
    district: t.district,
    depot: t.depot,
    roadClass: t.road_class,
    freeFlowKmh: t.free_flow_kmh,
    depotToDistrictKm: t.depot_to_district_km,
    depotToDistrictFreeflowMin: t.depot_to_district_freeflow_min,
    interStopKm: t.inter_stop_km,
    interStopFreeflowMin: t.inter_stop_freeflow_min,
  }));

  cached = {
    listOrders: () => mappedOrders,
    listFleetVehicles: () => mappedVehicles,
    listServiceAllowances: () => mappedAllowances,
    listDistrictTravel: () => mappedTravel,
  };
}

export const demoAdapter: DispatcherDataAdapter = {
  listOrders: () => cached?.listOrders() ?? [],
  listFleetVehicles: () => cached?.listFleetVehicles() ?? [],
  listServiceAllowances: () => cached?.listServiceAllowances() ?? [],
  listDistrictTravel: () => cached?.listDistrictTravel() ?? [],
};
