// Data-access seam: pages/state depend on this interface, not on dataset.ts
// directly, so a real API implementation can replace `demoAdapter` later
// without touching any page or the validation layer.

import { DISTRICT_TRAVEL, S1_ORDERS, S1_VEHICLES, SERVICE_ALLOWANCES } from '@/data/dispatcher-dataset';
import type { DistrictTravel, S1Order, ServiceAllowance, Vehicle } from '@/types/dispatcher';

export interface DispatcherDataAdapter {
  listOrders(): S1Order[];
  /** Only the S1 fleet roster (VEH001-038), each joined with today's available/in_workshop status. */
  listFleetVehicles(): (Vehicle & { status: 'available' | 'in_workshop' })[];
  listServiceAllowances(): ServiceAllowance[];
  listDistrictTravel(): DistrictTravel[];
}

/**
 * Deterministic demo adapter — backed entirely by the transcribed real
 * dataset in dataset.ts. No network call, no backend; this is the whole
 * data source for the dispatcher demo, and it says so.
 */
export const demoAdapter: DispatcherDataAdapter = {
  listOrders: () => S1_ORDERS,
  listFleetVehicles: () => S1_VEHICLES,
  listServiceAllowances: () => SERVICE_ALLOWANCES,
  listDistrictTravel: () => DISTRICT_TRAVEL,
};
