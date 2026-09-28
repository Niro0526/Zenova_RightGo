'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Snowflake, Truck, Star, ArrowRight, Filter } from 'lucide-react';
import type { FleetVehicle, RankedCandidate } from '@/lib/dispatcher/validation';
import type { S1Order } from '@/types/dispatcher';

export default function VehicleTripPanel({
  selectedOrder,
  availableVehicles,
  candidates,
  recommended,
  selectedVehicleId,
  ordersOnTrip,
  onSelectVehicle,
  onSelectFirstOrder,
  onOpenDetails,
}: {
  selectedOrder: S1Order | null;
  availableVehicles: FleetVehicle[];
  candidates: RankedCandidate[];
  recommended: RankedCandidate | undefined;
  selectedVehicleId: string | null;
  ordersOnTrip: (vehicleId: string, tripNo: 1 | 2) => S1Order[];
  onSelectVehicle: (vehicleId: string) => void;
  onSelectFirstOrder?: () => void;
  onOpenDetails?: () => void;
}) {
  const [vehicleFilter, setVehicleFilter] = useState<'all' | 'reefer' | 'ambient'>('all');
  const [showBlocked, setShowBlocked] = useState(false);

  const candidateVehicleIds = new Set(candidates.map((c) => c.vehicle.vehicleId));

  // Filtered available vehicles
  const filteredVehicles = availableVehicles.filter(v => {
    if (vehicleFilter === 'reefer') return v.temp === 'reefer';
    if (vehicleFilter === 'ambient') return v.temp === 'ambient';
    return true;
  });

  const compatibleList = filteredVehicles.filter(v => candidateVehicleIds.has(v.vehicleId));
  const blockedList = filteredVehicles.filter(v => !candidateVehicleIds.has(v.vehicleId));

  // Helper to calculate utilization
  function getUtil(vehicle: FleetVehicle, tripNo: 1 | 2 = 1) {
    const existing = ordersOnTrip(vehicle.vehicleId, tripNo);
    const existingWeight = existing.reduce((s, o) => s + o.orderWeightKg, 0);
    const existingVolume = existing.reduce((s, o) => s + o.orderVolumeM3, 0);

    const addWeight = selectedOrder ? selectedOrder.orderWeightKg : 0;
    const addVolume = selectedOrder ? selectedOrder.orderVolumeM3 : 0;

    const totalWeight = existingWeight + addWeight;
    const totalVolume = existingVolume + addVolume;

    const weightPct = Math.min(100, Math.round((totalWeight / vehicle.weightCapKg) * 100));
    const volumePct = Math.min(100, Math.round((totalVolume / vehicle.volumeCapM3) * 100));

    return {
      existingOrders: existing.length,
      totalWeight,
      totalVolume,
      weightPct,
      volumePct,
    };
  }

  // Pre-selection state: Workspace overview
  if (!selectedOrder) {
    const reeferCount = availableVehicles.filter(v => v.temp === 'reefer').length;
    const ambientCount = availableVehicles.length - reeferCount;

    return (
      <div className="flex-1 h-full overflow-y-auto bg-[#F9FAFB] p-5 md:p-6 flex flex-col gap-5">
        {/* Compact Fleet Summary */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
            <div>
              <h2 className="text-base font-bold text-[#202D2D] m-0">Depot Fleet Status</h2>
              <p className="text-xs text-[#64748B] m-0 mt-0.5">S1 active fleet capacity available for trip assignments</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs font-semibold text-[#485563]">
                {availableVehicles.length} Vehicles Available
              </span>
              <span className="rounded-md border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800">
                {reeferCount} Reefer
              </span>
              <span className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
                {ambientCount} Ambient
              </span>
            </div>
          </div>

          {/* Action prompt */}
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-[#FFFBEB] border border-amber-200/80">
            <div className="flex items-center gap-3">
              <Truck size={20} className="text-amber-600 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-amber-900">Select an order to view compatible vehicles</div>
                <div className="text-[11px] text-amber-800">Vehicle compatibility, weight/volume fit and route checks will be calculated immediately.</div>
              </div>
            </div>
            {onSelectFirstOrder && (
              <button
                type="button"
                onClick={onSelectFirstOrder}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F97316] text-white text-xs font-semibold hover:bg-[#EA580C] transition-colors shadow-xs flex-shrink-0"
              >
                Select first unresolved order
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Available vehicles overview grid */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] m-0">All Available Vehicles</h3>
            <div className="flex items-center gap-1">
              {(['all', 'reefer', 'ambient'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setVehicleFilter(f)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                    vehicleFilter === f
                      ? 'bg-white border border-[#CBD5E1] text-[#202D2D] font-bold shadow-xs'
                      : 'text-[#64748B] hover:text-[#202D2D]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredVehicles.map(v => {
              const t1 = ordersOnTrip(v.vehicleId, 1);
              const t2 = ordersOnTrip(v.vehicleId, 2);
              return (
                <div key={v.vehicleId} className="flex flex-col gap-2 rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#202D2D]">{v.vehicleId}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      v.temp === 'reefer' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {v.type} · {v.temp}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B] tabular-nums">
                    Capacity: {v.weightCapKg} kg / {v.volumeCapM3} m³
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-gray-100 text-[#64748B]">
                    <span>Trip 1: {t1.length ? `${t1.length} stops` : 'idle'}</span>
                    <span>Trip 2: {t2.length ? `${t2.length} stops` : 'idle'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Active selection state
  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#F9FAFB] p-4 md:p-5 flex flex-col gap-4">
      {/* Selected Order Summary Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#F97316]/40 bg-[#FFF4ED] p-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#F97316] text-white flex items-center justify-center font-bold text-xs">
            S1
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#202D2D]">{selectedOrder.orderRef}</span>
              <span className="text-xs font-semibold text-[#485563]">{selectedOrder.outletId}</span>
              <span className="text-xs text-[#64748B]">({selectedOrder.district})</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-[#64748B]">
              <span className="font-semibold text-[#F97316]">{selectedOrder.brand}</span>
              <span>·</span>
              <span className="tabular-nums">{selectedOrder.orderWeightKg} kg / {selectedOrder.orderVolumeM3} m³</span>
              <span>·</span>
              <span>{selectedOrder.tempRequirement === 'chilled' ? 'Chilled' : 'Ambient'}</span>
              <span>·</span>
              <span>Window: {selectedOrder.windowOpenTime}–{selectedOrder.windowCloseTime}</span>
            </div>
          </div>
        </div>

        {onOpenDetails && (
          <button
            onClick={onOpenDetails}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold text-[#485563] hover:bg-[#F8FAFC] transition-colors self-end sm:self-center"
          >
            Review checks &amp; assign
          </button>
        )}
      </div>

      {/* Compatibility Status */}
      {candidates.length === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-red-900">No compatible vehicles available</div>
            <div className="text-xs text-red-700 mt-0.5">
              This order fails compatibility rules against all {availableVehicles.length} available vehicles (temperature requirement, weight/volume limit, or delivery window). Please defer this order with an operational reason.
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748B] m-0">
              Compatible Vehicles ({candidates.length})
            </h2>
            <span className="text-[11px] text-[#64748B]">Click a vehicle to configure trip assignment</span>
          </div>
        </div>
      )}

      {/* Compatible Vehicles Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {compatibleList.map((v) => {
          const isSelected = selectedVehicleId === v.vehicleId;
          const candidate = candidates.find((c) => c.vehicle.vehicleId === v.vehicleId);
          const isRecommended = recommended?.vehicle.vehicleId === v.vehicleId;
          const tripNo = candidate?.tripNo ?? 1;
          const util = getUtil(v, tripNo);

          return (
            <div
              key={v.vehicleId}
              onClick={() => onSelectVehicle(v.vehicleId)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectVehicle(v.vehicleId); }}
              role="button"
              tabIndex={0}
              aria-selected={isSelected}
              className={`flex cursor-pointer flex-col gap-2.5 rounded-xl border p-3.5 transition-all text-left ${
                isSelected
                  ? 'border-[#F97316] bg-[#FFF4ED] shadow-sm ring-1 ring-[#F97316]'
                  : isRecommended
                  ? 'border-[#10B981] bg-white shadow-xs hover:border-[#10B981]/80'
                  : 'border-[#CBD5E1] bg-white hover:border-[#94A3B8] shadow-xs'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#202D2D]">{v.vehicleId}</span>
                  {isRecommended && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 uppercase">
                      <Star size={10} className="fill-emerald-600 text-emerald-600" /> Best Fit
                    </span>
                  )}
                </div>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                  v.temp === 'reefer' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-gray-100 text-gray-700'
                }`}>
                  {v.type} · {v.temp}
                </span>
              </div>

              {/* Trip Target */}
              <div className="text-[11px] font-semibold text-[#485563]">
                Assigned Target: <span className="text-[#F97316]">Trip {tripNo}</span>
                {util.existingOrders > 0 && <span className="font-normal text-[#64748B]"> ({util.existingOrders} existing orders)</span>}
              </div>

              {/* Weight & Volume Progress Bars */}
              <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-100">
                {/* Weight */}
                <div>
                  <div className="flex justify-between text-[10px] text-[#64748B] mb-0.5 tabular-nums">
                    <span>Weight Utilisation</span>
                    <span className="font-semibold text-[#202D2D]">{util.totalWeight.toFixed(0)} / {v.weightCapKg} kg ({util.weightPct}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${util.weightPct > 90 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${util.weightPct}%` }}
                    />
                  </div>
                </div>

                {/* Volume */}
                <div>
                  <div className="flex justify-between text-[10px] text-[#64748B] mb-0.5 tabular-nums">
                    <span>Volume Utilisation</span>
                    <span className="font-semibold text-[#202D2D]">{util.totalVolume.toFixed(2)} / {v.volumeCapM3} m³ ({util.volumePct}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${util.volumePct > 90 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${util.volumePct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Validation Badges */}
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 pt-1">
                <CheckCircle size={12} className="text-emerald-600 flex-shrink-0" />
                <span>Compatible route &amp; temperature specs</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Blocked / Ineligible Vehicles (Expandable Accordion) */}
      {blockedList.length > 0 && (
        <div className="mt-2 rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setShowBlocked(s => !s)}
            className="w-full flex items-center justify-between p-3.5 text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
          >
            <span>Ineligible Vehicles ({blockedList.length})</span>
            <span className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
              {showBlocked ? 'Hide' : 'Show reasons'}
              {showBlocked ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </button>

          {showBlocked && (
            <div className="p-3.5 border-t border-[#F1F5F9] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-[#FAFAFA]">
              {blockedList.map(v => {
                let reason = 'Incompatible specifications';
                if (selectedOrder.tempRequirement === 'chilled' && v.temp !== 'reefer') {
                  reason = 'Ambient vehicle cannot transport chilled goods';
                } else if (selectedOrder.parkingConstraint === 'van_only' && v.type !== 'van') {
                  reason = 'Outlet requires van access (lorry blocked)';
                } else {
                  reason = 'Capacity or delivery window conflict';
                }

                return (
                  <div key={v.vehicleId} className="flex flex-col gap-1 p-2.5 rounded-lg border border-gray-200 bg-white text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#202D2D]">{v.vehicleId}</span>
                      <span className="text-[10px] text-gray-500 uppercase">{v.type} · {v.temp}</span>
                    </div>
                    <span className="text-[11px] text-red-600 font-medium">{reason}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
