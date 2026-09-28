import type { S1Order } from '@/types/dispatcher';
import type { FleetVehicle } from './validation';

/** Real S1-peak-day derivations — every number here comes from live orders/fleet data, never a placeholder. */

export function computeReeferDemandM3(orders: S1Order[]): number {
  return orders.filter((o) => o.tempRequirement === 'chilled').reduce((sum, o) => sum + o.orderVolumeM3, 0);
}

export function computeReeferCapacityM3(vehicles: FleetVehicle[]): number {
  return vehicles.filter((v) => v.temp === 'reefer' && v.status === 'available').reduce((sum, v) => sum + v.volumeCapM3, 0);
}

export interface ReeferShortage {
  demandM3: number;
  capacityM3: number;
  shortfall: boolean;
  deficitM3: number;
  reeferOrderCount: number;
  reeferVehicleCount: number;
}

export function computeReeferShortage(orders: S1Order[], vehicles: FleetVehicle[]): ReeferShortage {
  const demandM3 = computeReeferDemandM3(orders);
  const capacityM3 = computeReeferCapacityM3(vehicles);
  const deficitM3 = Math.max(0, demandM3 - capacityM3);
  return {
    demandM3,
    capacityM3,
    shortfall: deficitM3 > 0,
    deficitM3,
    reeferOrderCount: orders.filter((o) => o.tempRequirement === 'chilled').length,
    reeferVehicleCount: vehicles.filter((v) => v.temp === 'reefer' && v.status === 'available').length,
  };
}

export function computeS1DemandM3(orders: S1Order[]): number {
  return orders.reduce((sum, o) => sum + o.orderVolumeM3, 0);
}

export function computeS1ChilledDemandM3(orders: S1Order[]): number {
  return computeReeferDemandM3(orders);
}

export function computeS1ReeferCapacityM3(vehicles: FleetVehicle[]): number {
  return computeReeferCapacityM3(vehicles);
}

export function computeS1TotalCapacityM3(vehicles: FleetVehicle[]): number {
  return vehicles.filter((v) => v.status === 'available').reduce((sum, v) => sum + v.volumeCapM3, 0);
}
