'use client';

import React, { useMemo, useState } from 'react';
import {
  Truck, AlertTriangle, CheckCircle2, Clock, ChevronRight, ArrowRight,
  X, MoveHorizontal, Box, RotateCcw, ChevronDown, ChevronUp,
  AlertCircle, Sparkles, ArrowLeftRight
} from 'lucide-react';
import { useDispatcherPlan, type FleetVehicle } from '@/store/dispatcher/PlanningContext';
import DeferDialog from '../DeferDialog';
import type { DeferReasonCode } from '@/types/dispatcher';

function formatMin(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = Math.round(minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export default function DraftTripWorkspace({
  onSwitchToManual,
  onProceedToRelease,
}: {
  onSwitchToManual: () => void;
  onProceedToRelease: () => void;
}) {
  const {
    orders,
    fleetVehicles,
    assignments,
    counts,
    draftRevision,
    ordersOnTrip,
    compatibleCandidates,
    getTripStops,
    getTripSchedule,
    getTripDeparture,
    setTripDeparture,
    reorderTrip,
    reassignOrder,
    deferOrder,
    changeTripVehicle,
    canChangeTripVehicle,
    generateSuggestedDraft,
    lastGeneratedResult,
  } = useDispatcherPlan();

  const [activeTab, setActiveTab] = useState<'trips' | 'attention' | 'orders'>('trips');
  const [selectedTripKey, setSelectedTripKey] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'orders' | 'delivery' | 'loading' | 'vehicle'>('orders');
  const [loadingViewMode, setLoadingViewMode] = useState<'loading' | 'delivery'>('loading');

  // Modals & sub-dialogs
  const [deferOrderRef, setDeferOrderRef] = useState<string | null>(null);
  const [deferDefaultReason, setDeferDefaultReason] = useState<DeferReasonCode>('capacity');
  const [moveOrderRef, setMoveOrderRef] = useState<string | null>(null);
  const [changeVehicleTripKey, setChangeVehicleTripKey] = useState<string | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showIncompatibleVehicles, setShowIncompatibleVehicles] = useState(false);
  const [passedChecksExpanded, setPassedChecksExpanded] = useState(false);

  // Filter for orders tab
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'allocated' | 'unresolved' | 'deferred'>('all');

  // Group active trips from assignments
  const activeTrips = useMemo(() => {
    const tripMap = new Map<string, { vehicleId: string; tripNo: 1 | 2; orderRefs: string[] }>();
    for (const [ref, a] of Object.entries(assignments)) {
      if (a.decision === 'served' && a.vehicleId && a.tripNo) {
        const key = `${a.vehicleId}-${a.tripNo}`;
        const existing = tripMap.get(key) ?? { vehicleId: a.vehicleId, tripNo: a.tripNo, orderRefs: [] };
        existing.orderRefs.push(ref);
        tripMap.set(key, existing);
      }
    }
    return Array.from(tripMap.values()).sort((a, b) => a.vehicleId.localeCompare(b.vehicleId) || a.tripNo - b.tripNo);
  }, [assignments]);

  const vehiclesById = useMemo(() => new Map(fleetVehicles.map(v => [v.vehicleId, v])), [fleetVehicles]);
  const ordersByRef = useMemo(() => new Map(orders.map(o => [o.orderRef, o])), [orders]);

  // Unresolved orders needing attention
  const unresolvedOrders = useMemo(() => {
    return orders.filter(o => assignments[o.orderRef]?.decision === 'unresolved');
  }, [orders, assignments]);

  // Compute recommendation reason and status for a trip
  function getTripMetadata(vehicleId: string, tripNo: 1 | 2) {
    const tripOrders = ordersOnTrip(vehicleId, tripNo);
    const vehicle = vehiclesById.get(vehicleId);
    const departure = getTripDeparture(vehicleId, tripNo);
    const stops = getTripStops(vehicleId, tripNo);
    const schedule = getTripSchedule(vehicleId, tripNo);

    const totalWeight = tripOrders.reduce((sum, o) => sum + o.orderWeightKg, 0);
    const totalVolume = tripOrders.reduce((sum, o) => sum + o.orderVolumeM3, 0);
    const weightUtilPct = vehicle ? Math.round((totalWeight / vehicle.weightCapKg) * 100) : 0;
    const volumeUtilPct = vehicle ? Math.round((totalVolume / vehicle.volumeCapM3) * 100) : 0;

    const hasChilled = tripOrders.some(o => o.tempRequirement === 'chilled');
    const hasVanOnly = tripOrders.some(o => o.parkingConstraint === 'van_only');

    // Recommendation reason
    let recommendationReason = 'Assigned for district delivery consolidation.';
    if (vehicle) {
      if (vehicle.temp === 'reefer' && hasChilled && hasVanOnly) {
        recommendationReason = 'Reefer van selected for chilled goods and van-only access.';
      } else if (vehicle.temp === 'reefer' && hasChilled) {
        recommendationReason = 'Reefer vehicle selected for temperature-controlled cold chain integrity.';
      } else if (hasVanOnly) {
        recommendationReason = 'Van selected for narrow outlet and physical access constraints.';
      } else if (weightUtilPct >= 80 || volumeUtilPct >= 80) {
        recommendationReason = `High-efficiency consolidation (${Math.max(weightUtilPct, volumeUtilPct)}% capacity used).`;
      } else {
        recommendationReason = `${vehicle.type} allocated for ${tripOrders[0]?.district ?? 'district'} deliveries.`;
      }
    }

    // Status: Blocked, Needs review, or Ready
    let status: 'Ready' | 'Needs review' | 'Blocked' = 'Ready';
    let statusReason = 'Ready for dispatch release';

    if (vehicle && (totalWeight > vehicle.weightCapKg || totalVolume > vehicle.volumeCapM3)) {
      status = 'Blocked';
      statusReason = 'Trip exceeds vehicle weight or volume capacity';
    } else if (hasChilled && vehicle?.temp !== 'reefer') {
      status = 'Blocked';
      statusReason = 'Chilled goods assigned to non-reefer vehicle';
    } else if (hasVanOnly && vehicle && vehicle.type !== 'van') {
      status = 'Blocked';
      statusReason = 'Van-only outlet assigned to truck';
    } else if (schedule && schedule.some(s => s.late || s.mallWindow?.violated)) {
      status = 'Needs review';
      statusReason = 'Estimated late arrival or delivery window warning';
    } else if (!departure) {
      status = 'Needs review';
      statusReason = 'Planned departure time not confirmed';
    }

    return {
      tripOrders,
      vehicle,
      departure,
      stops,
      schedule,
      totalWeight,
      totalVolume,
      weightUtilPct,
      volumeUtilPct,
      hasChilled,
      hasVanOnly,
      recommendationReason,
      status,
      statusReason,
    };
  }

  // Count trips requiring review or blocked
  const tripsRequiringReviewCount = useMemo(() => {
    return activeTrips.filter(t => {
      const meta = getTripMetadata(t.vehicleId, t.tripNo);
      return meta.status !== 'Ready';
    }).length;
  }, [activeTrips]);

  // Selected trip details
  const selectedTrip = useMemo(() => {
    if (!selectedTripKey) return null;
    const [vId, tNoStr] = selectedTripKey.split('-');
    const tNo = Number(tNoStr) as 1 | 2;
    const exists = activeTrips.some(t => t.vehicleId === vId && t.tripNo === tNo);
    if (!exists) return null;
    return {
      vehicleId: vId,
      tripNo: tNo,
      ...getTripMetadata(vId, tNo),
    };
  }, [selectedTripKey, activeTrips]);

  // Move order state
  const orderBeingMoved = moveOrderRef ? ordersByRef.get(moveOrderRef) : null;
  const moveCandidates = useMemo(() => {
    if (!moveOrderRef) return [];
    return compatibleCandidates(moveOrderRef);
  }, [moveOrderRef, compatibleCandidates]);

  // Handle move order confirmation
  function handleConfirmMoveOrder(targetVehicleId: string, targetTripNo: 1 | 2) {
    if (!moveOrderRef) return;
    reassignOrder(moveOrderRef, targetVehicleId, targetTripNo, 'Dispatcher manually adjusted trip assignment');
    setMoveOrderRef(null);
  }

  // Handle vehicle change
  const changeVehicleSource = changeVehicleTripKey ? {
    vehicleId: changeVehicleTripKey.split('-')[0],
    tripNo: Number(changeVehicleTripKey.split('-')[1]) as 1 | 2,
  } : null;

  const vehicleChangeOptions = useMemo(() => {
    if (!changeVehicleSource) return { compatible: [], incompatible: [] };
    const comp: { vehicle: FleetVehicle; utilWeight: number; utilVol: number; reason: string }[] = [];
    const incomp: { vehicle: FleetVehicle; reason: string }[] = [];

    const tripOrders = ordersOnTrip(changeVehicleSource.vehicleId, changeVehicleSource.tripNo);
    const totalWeight = tripOrders.reduce((s, o) => s + o.orderWeightKg, 0);
    const totalVolume = tripOrders.reduce((s, o) => s + o.orderVolumeM3, 0);

    for (const v of fleetVehicles) {
      if (v.vehicleId === changeVehicleSource.vehicleId) continue;
      const check = canChangeTripVehicle(changeVehicleSource.vehicleId, v.vehicleId, changeVehicleSource.tripNo);
      if (check.allowed) {
        const utilWeight = Math.round((totalWeight / v.weightCapKg) * 100);
        const utilVol = Math.round((totalVolume / v.volumeCapM3) * 100);
        comp.push({
          vehicle: v,
          utilWeight,
          utilVol,
          reason: `${v.type} (${v.temp}) · ${v.weightCapKg}kg / ${v.volumeCapM3}m³ capacity fits trip requirements.`,
        });
      } else {
        incomp.push({
          vehicle: v,
          reason: check.reason || 'Incompatible with trip constraints',
        });
      }
    }

    return { compatible: comp, incompatible: incomp };
  }, [changeVehicleSource, fleetVehicles, canChangeTripVehicle, ordersOnTrip]);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* 1. Header & Summary Bar */}
      <div className="flex-shrink-0 border-b border-[#E2E8F0] bg-white px-5 py-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Left: Stage Title & Metrics */}
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#FFF4ED] text-[#F97316] text-xs font-bold border border-[#F97316]/20">
                <Sparkles size={12} />
                Suggested Draft
              </span>
              <span className="text-xs text-[#64748B]">Revision v{draftRevision}</span>
            </div>
            <h1 className="text-lg font-bold text-[#202D2D] m-0 mt-0.5">
              Review Draft Allocation
            </h1>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs">
              <span className="text-[#64748B]">Allocated:</span>
              <span className="font-bold text-[#202D2D] tabular-nums">{counts.served} / {counts.total}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs">
              <span className="text-[#64748B]">Trips:</span>
              <span className="font-bold text-[#202D2D] tabular-nums">{activeTrips.length}</span>
            </div>
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${unresolvedOrders.length > 0 ? 'border-amber-300 bg-amber-50 text-amber-900 font-bold' : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]'}`}>
              <span>Needs Decision:</span>
              <span className="tabular-nums">{unresolvedOrders.length}</span>
            </div>
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${tripsRequiringReviewCount > 0 ? 'border-amber-300 bg-amber-50 text-amber-900 font-bold' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
              <span>Requires Review:</span>
              <span className="tabular-nums">{tripsRequiringReviewCount}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setShowRegenerateConfirm(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#485563] hover:bg-gray-50 transition-colors shadow-xs"
                title="Regenerate the suggested allocation draft"
              >
                <RotateCcw size={12} />
                Regenerate draft
              </button>
              <button
                type="button"
                onClick={onProceedToRelease}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#F97316] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#EA580C] transition-colors shadow-xs"
              >
                Review &amp; Release
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#F1F5F9]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('trips')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === 'trips' ? 'bg-[#202D2D] text-white' : 'text-[#64748B] hover:text-[#202D2D] hover:bg-gray-100'}`}
            >
              <Truck size={13} />
              Trips ({activeTrips.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('attention')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === 'attention' ? 'bg-[#202D2D] text-white' : 'text-[#64748B] hover:text-[#202D2D] hover:bg-gray-100'}`}
            >
              <AlertTriangle size={13} className={unresolvedOrders.length > 0 ? 'text-amber-500' : ''} />
              Needs Attention ({unresolvedOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === 'orders' ? 'bg-[#202D2D] text-white' : 'text-[#64748B] hover:text-[#202D2D] hover:bg-gray-100'}`}
            >
              <Box size={13} />
              All Orders ({orders.length})
            </button>
          </div>

          <button
            type="button"
            onClick={onSwitchToManual}
            className="text-xs text-[#64748B] hover:text-[#F97316] font-medium transition-colors"
          >
            Switch to manual order-by-order fallback →
          </button>
        </div>
      </div>

      {/* 2. Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* TAB 1: TRIPS WORKSPACE */}
        {activeTab === 'trips' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span>Showing {activeTrips.length} suggested trips. Click any trip card to inspect stops, delivery sequence, loading order, or adjust vehicle assignments.</span>
            </div>

            {activeTrips.length === 0 ? (
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-8 text-center text-sm text-[#64748B]">
                No trips allocated yet. Click &quot;Regenerate draft&quot; or switch to manual planning.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeTrips.map(trip => {
                  const meta = getTripMetadata(trip.vehicleId, trip.tripNo);
                  const isSelected = selectedTripKey === `${trip.vehicleId}-${trip.tripNo}`;

                  return (
                    <div
                      key={`${trip.vehicleId}-${trip.tripNo}`}
                      onClick={() => setSelectedTripKey(`${trip.vehicleId}-${trip.tripNo}`)}
                      className={`group relative flex flex-col rounded-xl border bg-white p-4 transition-all cursor-pointer hover:shadow-md ${isSelected ? 'border-[#F97316] ring-2 ring-[#F97316]/20' : 'border-[#E2E8F0] hover:border-[#CBD5E1]'}`}
                    >
                      {/* Top Row: Vehicle, Trip No, Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-[#202D2D]">{trip.vehicleId}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-[#485563]">
                              Trip {trip.tripNo}
                            </span>
                            {meta.hasChilled && (
                              <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200">
                                Chilled
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#64748B] mt-0.5 m-0">
                            {meta.vehicle?.type} ({meta.vehicle?.temp})
                          </p>
                        </div>

                        {/* Status Badge */}
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${meta.status === 'Ready' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : meta.status === 'Needs review' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {meta.status === 'Ready' && <CheckCircle2 size={11} />}
                          {meta.status === 'Needs review' && <Clock size={11} />}
                          {meta.status === 'Blocked' && <AlertCircle size={11} />}
                          {meta.status}
                        </span>
                      </div>

                      {/* Brand & District badge */}
                      <div className="mt-2.5 flex items-center gap-2">
                        <span className="rounded bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-0.5 text-xs font-semibold text-[#202D2D]">
                          {meta.tripOrders[0]?.brand ?? 'Brand'}
                        </span>
                        <span className="text-xs text-[#64748B]">·</span>
                        <span className="text-xs text-[#64748B] font-medium">
                          {meta.tripOrders[0]?.district ?? 'District'}
                        </span>
                      </div>

                      {/* Capacity Utilisation Bars */}
                      <div className="mt-3.5 space-y-2">
                        {/* Weight */}
                        <div>
                          <div className="flex justify-between text-[11px] text-[#64748B] mb-0.5">
                            <span>Weight payload</span>
                            <span className="font-semibold text-[#202D2D] tabular-nums">
                              {meta.totalWeight.toFixed(0)} / {meta.vehicle?.weightCapKg} kg ({meta.weightUtilPct}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${meta.weightUtilPct > 100 ? 'bg-rose-500' : meta.weightUtilPct > 85 ? 'bg-amber-500' : 'bg-[#F97316]'}`}
                              style={{ width: `${Math.min(meta.weightUtilPct, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Volume */}
                        <div>
                          <div className="flex justify-between text-[11px] text-[#64748B] mb-0.5">
                            <span>Cubic volume</span>
                            <span className="font-semibold text-[#202D2D] tabular-nums">
                              {meta.totalVolume.toFixed(2)} / {meta.vehicle?.volumeCapM3} m³ ({meta.volumeUtilPct}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${meta.volumeUtilPct > 100 ? 'bg-rose-500' : meta.volumeUtilPct > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(meta.volumeUtilPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Trip Counts & Timings */}
                      <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#64748B]">
                        <span className="font-medium text-[#202D2D]">
                          {meta.tripOrders.length} orders · {meta.stops.length} physical stops
                        </span>
                        <span>
                          {meta.departure ? (
                            <span className="text-emerald-700 font-medium">Departs {meta.departure}</span>
                          ) : (
                            <span className="text-amber-600 font-medium">Departure unconfirmed</span>
                          )}
                        </span>
                      </div>

                      {/* Recommendation Explanation */}
                      <div className="mt-2 rounded-md bg-[#F8FAFC] border border-[#F1F5F9] p-2 text-[11px] text-[#64748B] leading-relaxed">
                        <span className="font-semibold text-[#485563]">Recommendation: </span>
                        {meta.recommendationReason}
                      </div>

                      {/* Hover action indicator */}
                      <div className="mt-2 flex items-center justify-end text-[11px] font-semibold text-[#F97316] group-hover:translate-x-0.5 transition-transform">
                        Inspect Trip Details <ChevronRight size={12} className="ml-0.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: NEEDS ATTENTION / EXCEPTIONS WORKSPACE */}
        {activeTab === 'attention' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#202D2D] m-0">Orders Requiring Decision</h2>
                <p className="text-xs text-[#64748B] m-0 mt-0.5">
                  The heuristic could not place these orders under current fleet and operational constraints. Review alternatives or confirm deferral with a documented reason.
                </p>
              </div>
              <span className="rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-700">
                {unresolvedOrders.length} Unresolved
              </span>
            </div>

            {unresolvedOrders.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-8 text-center text-sm text-emerald-800">
                <CheckCircle2 size={24} className="mx-auto text-emerald-600 mb-2" />
                <p className="font-bold">All eligible orders have been allocated or confirmed for deferral!</p>
                <p className="text-xs text-emerald-700 mt-1">
                  You can now proceed to Review &amp; Release to inspect the loader manifest and driver summary.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {unresolvedOrders.map(order => {
                  const unplaced = lastGeneratedResult?.unplacedOrders.find(u => u.orderRef === order.orderRef);
                  const unplacedReason = unplaced?.reason
                    ?? 'Remaining vehicle capacity in district is insufficient under time or payload constraints.';

                  return (
                    <div
                      key={order.orderRef}
                      className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs hover:border-[#CBD5E1] transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        {/* Order Details */}
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-[#F97316]">{order.orderRef}</span>
                            <span className="font-semibold text-xs text-[#202D2D]">{order.outletId}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-[#485563]">
                              {order.brand}
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-[#485563]">
                              {order.district}
                            </span>
                            {order.tempRequirement === 'chilled' && (
                              <span className="rounded bg-sky-50 border border-sky-200 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">
                                Chilled
                              </span>
                            )}
                            {order.parkingConstraint === 'van_only' && (
                              <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                Van-Only Access
                              </span>
                            )}
                            {order.daysSinceLastServed >= 4 && (
                              <span className="rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                                {order.daysSinceLastServed}d Since Served
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-[#64748B]">
                            <span>Weight: <strong className="text-[#202D2D]">{order.orderWeightKg} kg</strong></span>
                            <span>Volume: <strong className="text-[#202D2D]">{order.orderVolumeM3} m³</strong></span>
                            <span>Window: <strong className="text-[#202D2D]">{order.windowOpenTime} - {order.windowCloseTime}</strong></span>
                            {order.deferredYesterday && <span className="text-amber-700 font-semibold">(Deferred yesterday)</span>}
                          </div>

                          {/* Specific Unplaced Explanation */}
                          <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50/80 border border-amber-200/80 p-2.5 text-xs text-amber-900">
                            <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-amber-600" />
                            <div>
                              <strong className="font-semibold">Why unplaced: </strong>
                              {unplacedReason}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-shrink-0 lg:ml-4">
                          <button
                            type="button"
                            onClick={() => setMoveOrderRef(order.orderRef)}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#202D2D] hover:bg-gray-50 transition-colors shadow-xs"
                          >
                            <MoveHorizontal size={13} />
                            Assign / Move to trip
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeferDefaultReason(
                                order.parkingConstraint === 'van_only' ? 'access_constraint' : 'capacity'
                              );
                              setDeferOrderRef(order.orderRef);
                            }}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors"
                          >
                            Confirm Deferral
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ALL ORDERS VIEW */}
        {activeTab === 'orders' && (
          <div className="flex flex-col gap-4">
            {/* Filter toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E2E8F0]">
              <div className="flex items-center gap-2 w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Search order ref, outlet, district..."
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#F97316]"
                />
              </div>

              <div className="flex items-center gap-1">
                {(['all', 'allocated', 'unresolved', 'deferred'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setOrderFilter(tab)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${orderFilter === tab ? 'bg-[#F97316] text-white' : 'text-[#64748B] hover:bg-gray-100'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Order ID</th>
                      <th className="py-2.5 px-4">Outlet</th>
                      <th className="py-2.5 px-4">District</th>
                      <th className="py-2.5 px-4">Brand</th>
                      <th className="py-2.5 px-4">Weight / Vol</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Assigned To</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {orders
                      .filter(o => {
                        const a = assignments[o.orderRef];
                        if (orderFilter === 'allocated' && a?.decision !== 'served') return false;
                        if (orderFilter === 'unresolved' && a?.decision !== 'unresolved') return false;
                        if (orderFilter === 'deferred' && a?.decision !== 'deferred') return false;
                        if (orderSearch.trim()) {
                          const q = orderSearch.toLowerCase();
                          return (
                            o.orderRef.toLowerCase().includes(q) ||
                            o.outletId.toLowerCase().includes(q) ||
                            o.district.toLowerCase().includes(q)
                          );
                        }
                        return true;
                      })
                      .map(order => {
                        const a = assignments[order.orderRef];
                        return (
                          <tr key={order.orderRef} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-[#F97316]">{order.orderRef}</td>
                            <td className="py-2.5 px-4 font-medium text-[#202D2D]">{order.outletId}</td>
                            <td className="py-2.5 px-4 text-[#64748B]">{order.district}</td>
                            <td className="py-2.5 px-4 text-[#64748B]">{order.brand}</td>
                            <td className="py-2.5 px-4 text-[#64748B] tabular-nums">
                              {order.orderWeightKg}kg / {order.orderVolumeM3}m³
                            </td>
                            <td className="py-2.5 px-4">
                              {a?.decision === 'served' && (
                                <span className="rounded bg-emerald-50 text-emerald-700 px-2 py-0.5 font-semibold text-[11px]">
                                  Allocated
                                </span>
                              )}
                              {a?.decision === 'unresolved' && (
                                <span className="rounded bg-amber-50 text-amber-700 px-2 py-0.5 font-semibold text-[11px]">
                                  Needs Decision
                                </span>
                              )}
                              {a?.decision === 'deferred' && (
                                <span className="rounded bg-slate-100 text-slate-700 px-2 py-0.5 font-semibold text-[11px]">
                                  Deferred ({a.reasonCode})
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-[#485563]">
                              {a?.decision === 'served' && a.vehicleId ? (
                                <span className="font-semibold text-[#202D2D]">
                                  {a.vehicleId} (Trip {a.tripNo})
                                </span>
                              ) : (
                                <span className="text-[#94A3B8]">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setMoveOrderRef(order.orderRef)}
                                  className="text-xs font-semibold text-[#F97316] hover:underline"
                                >
                                  {a?.decision === 'served' ? 'Move' : 'Assign'}
                                </button>
                                {a?.decision !== 'deferred' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeferDefaultReason('capacity');
                                      setDeferOrderRef(order.orderRef);
                                    }}
                                    className="text-xs text-[#64748B] hover:text-[#202D2D]"
                                  >
                                    Defer
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. TRIP DETAILS DRAWER (Slide-over for selected trip) */}
      {selectedTrip && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150"
          onClick={() => setSelectedTripKey(null)}
        >
          <div
            className="w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl border-l border-[#CBD5E1] animate-in slide-in-from-right duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex-shrink-0 border-b border-[#E2E8F0] p-4 bg-slate-50/70">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-[#202D2D]">{selectedTrip.vehicleId}</span>
                    <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-semibold text-[#485563]">
                      Trip {selectedTrip.tripNo}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold ${selectedTrip.status === 'Ready' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {selectedTrip.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1 m-0">
                    {selectedTrip.vehicle?.type} · {selectedTrip.tripOrders[0]?.brand} · {selectedTrip.tripOrders[0]?.district}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTripKey(null)}
                  className="rounded-lg p-1.5 text-[#64748B] hover:bg-slate-200 hover:text-[#202D2D] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Navigation Tabs */}
              <div className="flex items-center gap-1 mt-4 border-t border-[#E2E8F0] pt-2">
                <button
                  type="button"
                  onClick={() => setDrawerTab('orders')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${drawerTab === 'orders' ? 'bg-[#202D2D] text-white' : 'text-[#64748B] hover:bg-slate-200'}`}
                >
                  Assigned Orders ({selectedTrip.tripOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab('delivery')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${drawerTab === 'delivery' ? 'bg-[#202D2D] text-white' : 'text-[#64748B] hover:bg-slate-200'}`}
                >
                  Delivery Sequence ({selectedTrip.stops.length} stops)
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab('loading')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${drawerTab === 'loading' ? 'bg-[#202D2D] text-white' : 'text-[#64748B] hover:bg-slate-200'}`}
                >
                  Loading Order
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab('vehicle')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${drawerTab === 'vehicle' ? 'bg-[#202D2D] text-white' : 'text-[#64748B] hover:bg-slate-200'}`}
                >
                  Vehicle &amp; Checks
                </button>
              </div>
            </div>

            {/* Drawer Body Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {/* TAB 1: ASSIGNED ORDERS */}
              {drawerTab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <span>Orders on this trip. You can reassign an order to another trip or defer it.</span>
                  </div>

                  <div className="space-y-2.5">
                    {selectedTrip.tripOrders.map(order => (
                      <div
                        key={order.orderRef}
                        className="rounded-lg border border-[#E2E8F0] p-3 hover:border-[#CBD5E1] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#F97316]">{order.orderRef}</span>
                              <span className="font-semibold text-xs text-[#202D2D]">{order.outletId}</span>
                              {order.parkingConstraint === 'van_only' && (
                                <span className="rounded bg-amber-50 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 border border-amber-200">
                                  Van-Only
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B] mt-1">
                              <span>Weight: <strong>{order.orderWeightKg} kg</strong></span>
                              <span>Volume: <strong>{order.orderVolumeM3} m³</strong></span>
                              <span>Window: <strong>{order.windowOpenTime} - {order.windowCloseTime}</strong></span>
                              {order.daysSinceLastServed >= 4 && (
                                <span className="text-rose-600 font-bold">({order.daysSinceLastServed}d unserved)</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => setMoveOrderRef(order.orderRef)}
                              className="rounded border border-[#CBD5E1] px-2.5 py-1 text-xs font-semibold text-[#202D2D] hover:bg-slate-50 transition-colors"
                            >
                              Move
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeferDefaultReason('capacity');
                                setDeferOrderRef(order.orderRef);
                              }}
                              className="rounded border border-transparent px-2.5 py-1 text-xs text-[#64748B] hover:text-[#202D2D] transition-colors"
                            >
                              Defer
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: DELIVERY SEQUENCE */}
              {drawerTab === 'delivery' && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-[#485563]">
                    <strong>Sequence from Depot: </strong>
                    Physical outlet stops sequenced from Colombo Central Depot. Adjust order using the controls below to meet strict delivery windows. Timings are estimated from district averages.
                  </div>

                  <div className="space-y-2">
                    {selectedTrip.stops.map((stop, index) => {
                      const sched = selectedTrip.schedule?.find(s => s.outletId === stop.outletId);

                      return (
                        <div
                          key={stop.outletId}
                          className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] p-3 bg-white hover:border-[#CBD5E1]"
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#202D2D] text-white text-xs font-bold">
                            {index + 1}
                          </span>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-[#202D2D]">{stop.outletId}</span>
                              <span className="text-[11px] text-[#64748B]">
                                ({stop.orderRefs.join(', ')})
                              </span>
                            </div>

                            {sched && (
                              <div className="text-xs text-[#64748B] mt-0.5 flex flex-wrap items-center gap-2">
                                <span>Est. Arrival: <strong className="text-[#202D2D]">{formatMin(sched.arrival)}</strong></span>
                                <span>Service: <strong>{formatMin(sched.serviceStart)} - {formatMin(sched.serviceEnd)}</strong></span>
                                {sched.wait > 0 && (
                                  <span className="text-amber-700 font-semibold">(Wait {sched.wait}m)</span>
                                )}
                                {sched.late && (
                                  <span className="rounded bg-rose-50 text-rose-700 px-1.5 py-0.5 text-[10px] font-bold border border-rose-200">
                                    Arrives Late
                                  </span>
                                )}
                                {sched.mallWindow?.violated && (
                                  <span className="rounded bg-rose-50 text-rose-700 px-1.5 py-0.5 text-[10px] font-bold border border-rose-200">
                                    Mall Window Violated
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Reorder controls */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => {
                                const newOrder = [...selectedTrip.stops.map(s => s.outletId)];
                                [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                                reorderTrip(selectedTrip.vehicleId, selectedTrip.tripNo, newOrder);
                              }}
                              className="rounded p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move Stop Earlier"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={index === selectedTrip.stops.length - 1}
                              onClick={() => {
                                const newOrder = [...selectedTrip.stops.map(s => s.outletId)];
                                [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                                reorderTrip(selectedTrip.vehicleId, selectedTrip.tripNo, newOrder);
                              }}
                              className="rounded p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move Stop Later"
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: LOADING SEQUENCE */}
              {drawerTab === 'loading' && (
                <div className="space-y-4">
                  {/* View Mode Toggle */}
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                    <span className="text-xs font-semibold text-[#202D2D]">Sequence Direction:</span>
                    <div className="flex rounded-md border border-slate-300 bg-white p-0.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setLoadingViewMode('loading')}
                        className={`px-3 py-1 rounded transition-colors ${loadingViewMode === 'loading' ? 'bg-[#F97316] text-white shadow-xs' : 'text-[#64748B] hover:text-[#202D2D]'}`}
                      >
                        Loading order (LIFO)
                      </button>
                      <button
                        type="button"
                        onClick={() => setLoadingViewMode('delivery')}
                        className={`px-3 py-1 rounded transition-colors ${loadingViewMode === 'delivery' ? 'bg-[#F97316] text-white shadow-xs' : 'text-[#64748B] hover:text-[#202D2D]'}`}
                      >
                        Delivery order (FIFO)
                      </button>
                    </div>
                  </div>

                  {/* Informational Banner */}
                  <div className="rounded-lg bg-orange-50/70 border border-orange-200 p-3 text-xs text-orange-950">
                    <p className="font-bold text-orange-900 m-0">
                      {loadingViewMode === 'loading' ? 'Last delivery loaded first.' : 'First delivery unloaded first.'}
                    </p>
                    <p className="mt-1 m-0 text-orange-800 leading-relaxed">
                      Reversing delivery stop sequence ensures final deliveries are situated deep within the vehicle bay, allowing earlier stops to unload seamlessly at the bay without rehandling cargo.
                    </p>
                  </div>

                  {/* Grouped physical stops with grouped orders */}
                  <div className="space-y-3">
                    {(loadingViewMode === 'loading' ? [...selectedTrip.stops].reverse() : selectedTrip.stops).map((stop, idx) => {
                      const stopOrders = stop.orderRefs.map(r => ordersByRef.get(r)!).filter(Boolean);

                      return (
                        <div key={stop.outletId} className="rounded-lg border border-[#E2E8F0] p-3.5 bg-white shadow-xs">
                          <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F97316] text-white text-[11px] font-bold">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-xs text-[#202D2D]">
                                {stop.outletId}
                              </span>
                              <span className="text-[11px] text-[#64748B]">
                                ({loadingViewMode === 'loading' ? 'Loaded' : 'Delivered'} #{idx + 1})
                              </span>
                            </div>
                            <span className="text-xs text-[#64748B]">
                              {stopOrders.length} order lines
                            </span>
                          </div>

                          <div className="mt-2.5 space-y-1.5 pl-6">
                            {stopOrders.map(o => (
                              <div key={o.orderRef} className="flex items-center justify-between text-xs text-[#485563]">
                                <span>{o.orderRef} · {o.brand} ({o.tempRequirement})</span>
                                <span className="font-medium text-[#202D2D] tabular-nums">
                                  {o.orderWeightKg} kg / {o.orderVolumeM3} m³
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: VEHICLE & CHECKS */}
              {drawerTab === 'vehicle' && (
                <div className="space-y-4">
                  {/* Current Vehicle Summary */}
                  <div className="rounded-xl border border-[#E2E8F0] p-4 bg-white shadow-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-sm text-[#202D2D]">{selectedTrip.vehicleId}</span>
                        <p className="text-xs text-[#64748B] mt-0.5 m-0">
                          {selectedTrip.vehicle?.type} · {selectedTrip.vehicle?.temp} · Status: {selectedTrip.vehicle?.status}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setChangeVehicleTripKey(`${selectedTrip.vehicleId}-${selectedTrip.tripNo}`)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#F97316] px-3 py-1.5 text-xs font-semibold text-[#F97316] hover:bg-[#FFF4ED] transition-colors"
                      >
                        <ArrowLeftRight size={13} />
                        Change Vehicle
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[#F1F5F9] text-xs">
                      <div>
                        <span className="text-[#64748B]">Max Payload:</span>
                        <div className="font-bold text-[#202D2D] tabular-nums">{selectedTrip.vehicle?.weightCapKg} kg</div>
                      </div>
                      <div>
                        <span className="text-[#64748B]">Max Volume:</span>
                        <div className="font-bold text-[#202D2D] tabular-nums">{selectedTrip.vehicle?.volumeCapM3} m³</div>
                      </div>
                    </div>
                  </div>

                  {/* Planned Departure Time Editor */}
                  <div className="rounded-xl border border-[#E2E8F0] p-4 bg-white shadow-xs">
                    <label className="block text-xs font-bold text-[#202D2D] mb-1">
                      Planned Departure Time (Colombo Central Depot)
                    </label>
                    <p className="text-xs text-[#64748B] mb-2.5">
                      Departure time drives outlet delivery window schedules and arrival calculations.
                    </p>

                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={selectedTrip.departure ?? ''}
                        onChange={e => setTripDeparture(selectedTrip.vehicleId, selectedTrip.tripNo, e.target.value || null)}
                        className="rounded-lg border border-[#CBD5E1] px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#F97316]"
                      />
                      <button
                        type="button"
                        onClick={() => setTripDeparture(selectedTrip.vehicleId, selectedTrip.tripNo, '03:30')}
                        className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Set 03:30 (Fresh)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTripDeparture(selectedTrip.vehicleId, selectedTrip.tripNo, '05:30')}
                        className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Set 05:30 (Ambient)
                      </button>
                    </div>
                  </div>

                  {/* Trip Feasibility Checks */}
                  <div className="rounded-xl border border-[#E2E8F0] p-4 bg-white shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                      <h3 className="text-xs font-bold text-[#202D2D] m-0">Trip Validation Checks</h3>
                      <button
                        type="button"
                        onClick={() => setPassedChecksExpanded(!passedChecksExpanded)}
                        className="text-xs text-[#64748B] hover:text-[#202D2D] flex items-center gap-1"
                      >
                        {passedChecksExpanded ? 'Collapse passed' : 'Show all checks'}
                        {passedChecksExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>

                    <div className="mt-3 space-y-2 text-xs">
                      {/* Weight check */}
                      <div className="flex items-center justify-between py-1">
                        <span className="flex items-center gap-2 text-[#485563]">
                          {selectedTrip.totalWeight <= (selectedTrip.vehicle?.weightCapKg ?? 0) ? (
                            <CheckCircle2 size={14} className="text-emerald-500" />
                          ) : (
                            <AlertCircle size={14} className="text-rose-500" />
                          )}
                          Weight Limit Check
                        </span>
                        <span className="font-semibold tabular-nums text-[#202D2D]">
                          {selectedTrip.totalWeight.toFixed(1)} / {selectedTrip.vehicle?.weightCapKg} kg
                        </span>
                      </div>

                      {/* Volume check */}
                      <div className="flex items-center justify-between py-1">
                        <span className="flex items-center gap-2 text-[#485563]">
                          {selectedTrip.totalVolume <= (selectedTrip.vehicle?.volumeCapM3 ?? 0) ? (
                            <CheckCircle2 size={14} className="text-emerald-500" />
                          ) : (
                            <AlertCircle size={14} className="text-rose-500" />
                          )}
                          Volume Limit Check
                        </span>
                        <span className="font-semibold tabular-nums text-[#202D2D]">
                          {selectedTrip.totalVolume.toFixed(2)} / {selectedTrip.vehicle?.volumeCapM3} m³
                        </span>
                      </div>

                      {/* Temperature check */}
                      <div className="flex items-center justify-between py-1">
                        <span className="flex items-center gap-2 text-[#485563]">
                          {(!selectedTrip.hasChilled || selectedTrip.vehicle?.temp === 'reefer') ? (
                            <CheckCircle2 size={14} className="text-emerald-500" />
                          ) : (
                            <AlertCircle size={14} className="text-rose-500" />
                          )}
                          Cold Chain Integrity (Reefer vehicle)
                        </span>
                        <span className="font-semibold text-[#202D2D]">
                          {selectedTrip.hasChilled ? 'Required (Passed)' : 'Ambient (N/A)'}
                        </span>
                      </div>

                      {/* Access constraint check */}
                      <div className="flex items-center justify-between py-1">
                        <span className="flex items-center gap-2 text-[#485563]">
                          {(!selectedTrip.hasVanOnly || selectedTrip.vehicle?.type === 'van') ? (
                            <CheckCircle2 size={14} className="text-emerald-500" />
                          ) : (
                            <AlertCircle size={14} className="text-rose-500" />
                          )}
                          Outlet Physical Access (Van-Only)
                        </span>
                        <span className="font-semibold text-[#202D2D]">
                          {selectedTrip.hasVanOnly ? 'Van Enforced' : 'Unrestricted'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. CHANGE VEHICLE DIALOG */}
      {changeVehicleSource && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setChangeVehicleTripKey(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-[#CBD5E1] overflow-hidden flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-[#202D2D] m-0">
                  Change Vehicle for {changeVehicleSource.vehicleId} (Trip {changeVehicleSource.tripNo})
                </h3>
                <p className="text-xs text-[#64748B] m-0 mt-0.5">
                  Select a compatible vehicle with sufficient capacity and required access capabilities.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChangeVehicleTripKey(null)}
                className="text-[#64748B] hover:text-[#202D2D]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <span className="text-xs font-bold text-[#485563] uppercase tracking-wider block">
                Compatible Vehicles ({vehicleChangeOptions.compatible.length})
              </span>

              {vehicleChangeOptions.compatible.length === 0 ? (
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-center text-xs text-slate-500">
                  No other available vehicle satisfies the payload, volume, and temperature constraints of this trip.
                </div>
              ) : (
                <div className="space-y-2">
                  {vehicleChangeOptions.compatible.map(opt => (
                    <div
                      key={opt.vehicle.vehicleId}
                      className="flex items-center justify-between p-3 rounded-lg border border-[#E2E8F0] hover:border-[#F97316] transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#202D2D]">{opt.vehicle.vehicleId}</span>
                          <span className="text-xs text-[#64748B]">{opt.vehicle.type} ({opt.vehicle.temp})</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#64748B] mt-1">
                          <span>Payload Util: <strong className="text-[#202D2D]">{opt.utilWeight}%</strong></span>
                          <span>Volume Util: <strong className="text-[#202D2D]">{opt.utilVol}%</strong></span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          changeTripVehicle(changeVehicleSource.vehicleId, opt.vehicle.vehicleId, changeVehicleSource.tripNo);
                          setSelectedTripKey(`${opt.vehicle.vehicleId}-${changeVehicleSource.tripNo}`);
                          setChangeVehicleTripKey(null);
                        }}
                        className="rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white px-3 py-1.5 text-xs font-semibold shadow-xs"
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Collapsed Incompatible Vehicles */}
              {vehicleChangeOptions.incompatible.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowIncompatibleVehicles(!showIncompatibleVehicles)}
                    className="flex items-center justify-between w-full text-xs text-[#64748B] hover:text-[#202D2D] font-medium"
                  >
                    <span>Incompatible Fleet ({vehicleChangeOptions.incompatible.length})</span>
                    {showIncompatibleVehicles ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {showIncompatibleVehicles && (
                    <div className="mt-2 space-y-1.5">
                      {vehicleChangeOptions.incompatible.map((inc, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-50 text-xs text-slate-500">
                          <span className="font-medium text-slate-700">{inc.vehicle.vehicleId} ({inc.vehicle.type})</span>
                          <span className="text-[11px] text-rose-600">{inc.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. MOVE ORDER DIALOG */}
      {orderBeingMoved && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setMoveOrderRef(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-[#CBD5E1] overflow-hidden flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-[#202D2D] m-0">
                  Move Order {orderBeingMoved.orderRef}
                </h3>
                <p className="text-xs text-[#64748B] m-0 mt-0.5">
                  {orderBeingMoved.outletId} · {orderBeingMoved.brand} · {orderBeingMoved.orderWeightKg}kg · {orderBeingMoved.orderVolumeM3}m³
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMoveOrderRef(null)}
                className="text-[#64748B] hover:text-[#202D2D]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <span className="text-xs font-bold text-[#485563] uppercase tracking-wider block">
                Compatible Destination Trips ({moveCandidates.length})
              </span>

              {moveCandidates.length === 0 ? (
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-center text-xs text-slate-500">
                  No other trip currently has sufficient remaining capacity matching this order&apos;s district and handling constraints.
                </div>
              ) : (
                <div className="space-y-2">
                  {moveCandidates.map(cand => (
                    <div
                      key={`${cand.vehicle.vehicleId}-${cand.tripNo}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-[#E2E8F0] hover:border-[#F97316] transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#202D2D]">{cand.vehicle.vehicleId}</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-[#485563]">
                            Trip {cand.tripNo}
                          </span>
                          {cand.recommended && (
                            <span className="rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 border border-emerald-200">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#64748B] mt-0.5 m-0">
                          {cand.vehicle.type} · Capacity: {cand.vehicle.weightCapKg}kg / {cand.vehicle.volumeCapM3}m³
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleConfirmMoveOrder(cand.vehicle.vehicleId, cand.tripNo)}
                        className="rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white px-3 py-1.5 text-xs font-semibold shadow-xs"
                      >
                        Move Here
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. REGENERATE CONFIRMATION MODAL */}
      {showRegenerateConfirm && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowRegenerateConfirm(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-[#CBD5E1] p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600 flex-shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#202D2D] m-0">Regenerate Suggested Draft?</h3>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed m-0">
                  Regenerating will recompute draft allocations from scratch using the deterministic planning heuristic. Any manual order moves or trip adjustments made in this session will be replaced.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRegenerateConfirm(false)}
                className="rounded-lg border border-[#CBD5E1] px-3.5 py-1.5 text-xs font-semibold text-[#485563] hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  generateSuggestedDraft(false);
                  setShowRegenerateConfirm(false);
                }}
                className="rounded-lg bg-[#F97316] hover:bg-[#EA580C] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs"
              >
                Confirm &amp; Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. DEFER ORDER DIALOG */}
      {deferOrderRef && (
        <DeferDialog
          orderRef={deferOrderRef}
          initialReasonCode={deferDefaultReason}
          onCancel={() => setDeferOrderRef(null)}
          onConfirm={(reasonCode, note) => {
            deferOrder(deferOrderRef, reasonCode, note);
            setDeferOrderRef(null);
          }}
        />
      )}
    </div>
  );
}
