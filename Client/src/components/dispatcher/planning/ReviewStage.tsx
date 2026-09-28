'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FileText, Truck, Users, CheckCircle2, AlertTriangle, ArrowRight,
  X, Check, AlertCircle, Eye, ExternalLink, Calendar, ShieldCheck
} from 'lucide-react';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';
import ReassignDialog from '../ReassignDialog';
import DeferDialog from '../DeferDialog';
import PassportChecklist from './PassportChecklist';
import TripCard from './TripCard';
import type { DeferReasonCode } from '@/types/dispatcher';

const WarnIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

function formatMin(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = Math.round(minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export default function ReviewStage({
  onBackToAdjust,
}: {
  onBackToAdjust?: () => void;
}) {
  const {
    orders, assignments, counts, planChecklist, draftRevision, releasedManifests, publishPlan, acknowledgeManifest,
    fleetVehicles, getTripDeparture, setTripDeparture, getVehicleFuelInput, setVehicleFuelInput,
    getTripStops, getTripSchedule, getVehicleDistanceKm, reorderTrip, deferOrder, ledger,
  } = useDispatcherPlan();

  const [reassignRef, setReassignRef] = useState<string | null>(null);
  const [deferRef, setDeferRef] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<'loader' | 'driver' | 'decisions' | null>(null);
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const anyCheckerFail = planChecklist.some((r) => r.kind === 'checker_fail');
  const anyUnverified = planChecklist.some((r) => r.kind === 'unverified');
  const canRelease = counts.unresolved === 0 && !anyCheckerFail && !anyUnverified;
  const lastManifest = releasedManifests[releasedManifests.length - 1];
  const unchangedSinceRelease = lastManifest?.revision === draftRevision;

  const deferredOrders = orders.filter((o) => assignments[o.orderRef]?.decision === 'deferred');
  const priorityReview = deferredOrders.filter((o) => o.deferredYesterday || o.daysSinceLastServed >= 4);

  const tripGroups = useMemo(() => {
    const groups = new Map<string, { vehicleId: string; tripNo: 1 | 2; orderRefs: string[] }>();
    for (const o of orders) {
      const a = assignments[o.orderRef];
      if (a?.decision !== 'served' || !a.vehicleId || !a.tripNo) continue;
      const key = `${a.vehicleId}-${a.tripNo}`;
      const g = groups.get(key) ?? { vehicleId: a.vehicleId, tripNo: a.tripNo, orderRefs: [] };
      g.orderRefs.push(o.orderRef);
      groups.set(key, g);
    }
    return Array.from(groups.values()).sort((a, b) => a.vehicleId.localeCompare(b.vehicleId) || a.tripNo - b.tripNo);
  }, [orders, assignments]);

  const vehicleIdsInPlan = Array.from(new Set(tripGroups.map((g) => g.vehicleId)));
  const ordersByRef = useMemo(() => new Map(orders.map(o => [o.orderRef, o])), [orders]);

  function handleConfirmRelease() {
    if (!canRelease || isSubmitting) return;
    setIsSubmitting(true);
    publishPlan();
    setShowReleaseConfirm(false);
    setIsSubmitting(false);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-8 bg-[#F8FAFC]">
      {/* 1. Release Status Banner if released */}
      {lastManifest && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50/80 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white flex-shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-emerald-950">Plan Revision v{lastManifest.revision} Released</span>
                <span className="rounded bg-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                  {lastManifest.acknowledgement === 'acknowledged-simulated' ? 'Acknowledged' : 'Simulated Handoff'}
                </span>
              </div>
              <p className="text-xs text-emerald-800 m-0 mt-0.5">
                Released at {lastManifest.publishedAt}. Connected store operations and driver schedules have received this plan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/dispatcher/operations"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-xs"
            >
              View Operations
              <ExternalLink size={12} />
            </Link>
            <button
              type="button"
              onClick={() => setPreviewModal('loader')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 transition-colors shadow-xs"
            >
              View Manifest
            </button>
          </div>
        </div>
      )}

      {/* 2. Stat Cards Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="flex flex-col gap-1 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Total Orders</span>
          <span className="text-[26px] md:text-[30px] font-bold text-[#202D2D] leading-tight tabular-nums">{counts.total}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Assigned Orders</span>
          <span className="text-[26px] md:text-[30px] font-bold text-[#F97316] leading-tight tabular-nums">{counts.served}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Confirmed Deferrals</span>
          <span className="text-[26px] md:text-[30px] font-bold text-[#202D2D] leading-tight tabular-nums">{counts.deferred}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Unresolved Orders</span>
          <span className={`text-[26px] md:text-[30px] font-bold leading-tight tabular-nums ${counts.unresolved > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
            {counts.unresolved}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs col-span-2 lg:col-span-1">
          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Active Trips / Fleet</span>
          <span className="text-[26px] md:text-[30px] font-bold text-[#202D2D] leading-tight tabular-nums">
            {tripGroups.length} <span className="text-sm font-normal text-[#64748B]">/ {vehicleIdsInPlan.length} veh</span>
          </span>
        </div>
      </div>

      {/* 3. Operational Previews Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-[#202D2D] m-0">Pre-Release Operational Previews</h2>
          <p className="text-xs text-[#64748B] m-0 mt-0.5">
            Inspect generated warehouse loading lists, driver delivery sheets, and recorded decisions prior to plan release.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewModal('loader')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#202D2D] hover:bg-slate-50 transition-colors shadow-xs"
          >
            <FileText size={13} className="text-[#F97316]" />
            Loader Manifest Preview
          </button>
          <button
            type="button"
            onClick={() => setPreviewModal('driver')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#202D2D] hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Truck size={13} className="text-[#F97316]" />
            Driver Trip Summary Preview
          </button>
          <button
            type="button"
            onClick={() => setPreviewModal('decisions')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#202D2D] hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Users size={13} className="text-[#F97316]" />
            Review Decisions ({ledger.length})
          </button>
        </div>
      </div>

      {/* 4. Validation Checklist & Release Action Card */}
      <div className="flex w-full flex-col gap-6 lg:flex-row">
        {/* Validation Checklist — computed live from validatePlan(), blockers-first */}
        <div className="flex flex-1 flex-col gap-4 rounded-xl border border-[#E2E8F0] bg-white p-5 md:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
            <div>
              <h2 className="m-0 text-base font-bold text-[#202D2D]">S1 Scenario Validation &amp; Release Gates</h2>
              <span className="text-xs text-[#64748B]">Rigorous feasibility check (rules C01–C17)</span>
            </div>
            <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${canRelease ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              {canRelease ? 'Gates Clear' : 'Gates Incomplete'}
            </span>
          </div>

          <PassportChecklist rows={planChecklist} emptyLabel="No plan checks yet." />

          {/* Primary Release Action Button */}
          <div className="pt-2">
            <button
              disabled={!canRelease || unchangedSinceRelease || isSubmitting}
              onClick={() => setShowReleaseConfirm(true)}
              className={`w-full rounded-lg py-2.5 px-5 text-sm font-semibold text-white transition-colors shadow-xs flex items-center justify-center gap-2 ${
                canRelease && !unchangedSinceRelease
                  ? 'cursor-pointer bg-[#F97316] hover:bg-[#EA580C]'
                  : 'cursor-not-allowed bg-[#CBD5E1] text-[#64748B]'
              }`}
            >
              <ShieldCheck size={16} />
              {lastManifest ? `Release Plan (revision v${draftRevision})` : 'Release Plan (Local Session)'}
            </button>
          </div>

          {/* Gate Feedback */}
          {!canRelease && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800 flex flex-col gap-1.5">
              <strong className="font-bold flex items-center gap-1.5">
                <AlertCircle size={14} /> Plan cannot be released until all gates pass:
              </strong>
              {counts.unresolved > 0 && (
                <div>• {counts.unresolved} unallocated order(s) remain unresolved. Please allocate or confirm deferral in Review Draft.</div>
              )}
              {anyCheckerFail && <div>• One or more checker feasibility rules currently fail.</div>}
              {anyUnverified && <div>• Operational departure times or weekly fuel checks must be confirmed below.</div>}
              {onBackToAdjust && (
                <button
                  type="button"
                  onClick={onBackToAdjust}
                  className="mt-1 self-start font-bold text-red-900 underline hover:text-red-950"
                >
                  Return to Review Draft to adjust assignments →
                </button>
              )}
            </div>
          )}

          {canRelease && unchangedSinceRelease && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-[#64748B]">
              Plan is already released up to revision v{lastManifest!.revision}. No pending adjustments.
            </div>
          )}
        </div>

        {/* Deferred orders table */}
        <div className="flex flex-1 flex-col gap-4">
          {priorityReview.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-400 bg-[#FFFBEB] p-4">
              <WarnIcon />
              <span className="text-xs font-semibold text-amber-800 leading-relaxed">
                {priorityReview.length} deferred order(s) were also deferred yesterday or have gone 4+ days without service — recommend priority verification.
              </span>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
            <div className="border-b border-gray-200 p-4 bg-slate-50/60 flex items-center justify-between">
              <h2 className="m-0 text-sm font-bold text-[#202D2D]">Confirmed Deferrals ({deferredOrders.length})</h2>
              <span className="text-xs text-[#64748B]">Stored in session decision ledger</span>
            </div>
            {deferredOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                No orders deferred yet this session.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] border-collapse text-left text-xs">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="py-2.5 px-4 text-[11px] font-bold uppercase text-[#485563]">Order</th>
                      <th className="py-2.5 px-4 text-[11px] font-bold uppercase text-[#485563]">Outlet</th>
                      <th className="py-2.5 px-4 text-[11px] font-bold uppercase text-[#485563]">Reason</th>
                      <th className="py-2.5 px-4 text-[11px] font-bold uppercase text-[#485563]">Days Unserved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deferredOrders.map((o) => {
                      const a = assignments[o.orderRef];
                      return (
                        <tr key={o.orderRef} className="border-b border-gray-100 last:border-0 hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-semibold text-[#F97316]">{o.orderRef}</td>
                          <td className="py-2.5 px-4 text-gray-700">{o.outletId}</td>
                          <td className="py-2.5 px-4 text-gray-600">
                            <span className="font-medium text-[#202D2D]">{a?.reasonCode}</span>
                            {a?.reasonNote ? ` — ${a.reasonNote}` : ''}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`rounded px-2 py-0.5 text-xs font-bold ${o.daysSinceLastServed >= 4 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                              {o.daysSinceLastServed}d{o.deferredYesterday ? ' (deferred yesterday)' : ''}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Assigned Trips & Manifests */}
      <div className="flex flex-col gap-4">
        <h2 className="m-0 text-base font-bold text-[#202D2D]">Assigned Trips &amp; Manifest Verification</h2>
        {vehicleIdsInPlan.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
            No orders assigned yet — generate or adjust orders in the Review Draft stage to build trip manifests here.
          </div>
        )}
        {vehicleIdsInPlan.map((vehicleId) => {
          const vehicle = fleetVehicles.find((v) => v.vehicleId === vehicleId)!;
          const fuelInput = getVehicleFuelInput(vehicleId);
          const distanceKm = getVehicleDistanceKm(vehicleId);
          return (
            <div key={vehicleId} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 p-4">
                <div>
                  <span className="text-sm font-bold text-[#202D2D]">{vehicleId}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    {vehicle.type} · {vehicle.temp} · Route: {distanceKm.toFixed(1)} km
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Prior weekly fuel (L):</label>
                  <input
                    type="number"
                    min={0}
                    value={fuelInput ?? ''}
                    placeholder="unconfirmed"
                    onChange={(e) => setVehicleFuelInput(vehicleId, e.target.value === '' ? null : Number(e.target.value))}
                    className="w-24 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-[#F97316]"
                  />
                  {fuelInput === null && <span className="text-[10px] font-semibold text-amber-600">unconfirmed</span>}
                </div>
              </div>
              {tripGroups.filter((g) => g.vehicleId === vehicleId).map((g) => (
                <TripCard
                  key={`${g.vehicleId}-${g.tripNo}`}
                  vehicleId={g.vehicleId}
                  tripNo={g.tripNo}
                  orders={orders}
                  getTripStops={getTripStops}
                  getTripSchedule={getTripSchedule}
                  getTripDeparture={getTripDeparture}
                  setTripDeparture={setTripDeparture}
                  reorderTrip={reorderTrip}
                  onReassign={setReassignRef}
                  onDefer={setDeferRef}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* 6. MODALS */}

      {/* A. Loader Manifest Preview Modal */}
      {previewModal === 'loader' && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewModal(null)}
        >
          <div
            className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-[#CBD5E1] overflow-hidden flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-[#202D2D] m-0">Loader Manifest Preview (Warehouse Staging)</h3>
                <p className="text-xs text-[#64748B] m-0 mt-0.5">
                  LIFO loading sequence per vehicle bay. Last delivery is positioned first at the interior bulkhead.
                </p>
              </div>
              <button onClick={() => setPreviewModal(null)} className="text-[#64748B] hover:text-[#202D2D]">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {tripGroups.map(tg => {
                const stops = getTripStops(tg.vehicleId, tg.tripNo);
                const loadingSequence = [...stops].reverse();
                const vehicle = fleetVehicles.find(v => v.vehicleId === tg.vehicleId);

                return (
                  <div key={`${tg.vehicleId}-${tg.tripNo}`} className="rounded-lg border border-[#E2E8F0] p-3.5 bg-white">
                    <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#202D2D]">{tg.vehicleId}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-[#485563]">Trip {tg.tripNo}</span>
                        <span className="text-[#64748B]">({vehicle?.type} · {vehicle?.temp})</span>
                      </div>
                      <span className="font-bold text-[#F97316]">
                        {tg.orderRefs.length} order rows · {stops.length} physical stops
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                        Bay Loading Order (First loaded into vehicle → last loaded):
                      </div>
                      {loadingSequence.map((stop, sIdx) => {
                        const stopOrders = stop.orderRefs.map(r => ordersByRef.get(r)!).filter(Boolean);
                        return (
                          <div key={stop.outletId} className="flex items-start gap-2 rounded bg-slate-50 p-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#202D2D] text-white font-bold text-[10px] flex-shrink-0">
                              {sIdx + 1}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#202D2D]">{stop.outletId}</span>
                                <span className="text-[11px] text-[#64748B]">(Final delivery stop #{stops.length - sIdx})</span>
                              </div>
                              <div className="mt-1 space-y-1">
                                {stopOrders.map(o => (
                                  <div key={o.orderRef} className="flex items-center justify-between text-[#485563] text-[11px]">
                                    <span>{o.orderRef} · {o.brand} ({o.tempRequirement}) · {o.orderUnits} units</span>
                                    <span className="font-semibold text-[#202D2D]">{o.orderWeightKg} kg / {o.orderVolumeM3} m³</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* B. Driver Trip Summary Preview Modal */}
      {previewModal === 'driver' && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewModal(null)}
        >
          <div
            className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-[#CBD5E1] overflow-hidden flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-[#202D2D] m-0">Driver Trip Summary Preview</h3>
                <p className="text-xs text-[#64748B] m-0 mt-0.5">
                  Chronological delivery schedule from Colombo Central Depot to each outlet stop.
                </p>
              </div>
              <button onClick={() => setPreviewModal(null)} className="text-[#64748B] hover:text-[#202D2D]">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {tripGroups.map(tg => {
                const stops = getTripStops(tg.vehicleId, tg.tripNo);
                const schedule = getTripSchedule(tg.vehicleId, tg.tripNo);
                const departure = getTripDeparture(tg.vehicleId, tg.tripNo);

                return (
                  <div key={`${tg.vehicleId}-${tg.tripNo}`} className="rounded-lg border border-[#E2E8F0] p-3.5 bg-white">
                    <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#202D2D]">{tg.vehicleId}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-[#485563]">Trip {tg.tripNo}</span>
                      </div>
                      <span className="font-semibold text-emerald-700">
                        {departure ? `Planned Departure: ${departure}` : 'Departure Unconfirmed'}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {stops.map((stop, sIdx) => {
                        const sched = schedule?.find(s => s.outletId === stop.outletId);
                        const stopOrders = stop.orderRefs.map(r => ordersByRef.get(r)!).filter(Boolean);

                        return (
                          <div key={stop.outletId} className="flex items-start gap-2.5 rounded bg-slate-50 p-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F97316] text-white font-bold text-[10px] flex-shrink-0">
                              {sIdx + 1}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#202D2D]">{stop.outletId}</span>
                                {sched && (
                                  <span className="text-[11px] font-semibold text-[#202D2D]">
                                    Est. Arrival: {formatMin(sched.arrival)} · Service: {formatMin(sched.serviceStart)} - {formatMin(sched.serviceEnd)}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#64748B] mt-0.5">
                                Orders: {stopOrders.map(o => o.orderRef).join(', ')} · Total: {stopOrders.reduce((s, o) => s + o.orderWeightKg, 0)} kg
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* C. Decisions Ledger Preview Modal */}
      {previewModal === 'decisions' && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewModal(null)}
        >
          <div
            className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-[#CBD5E1] overflow-hidden flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-[#202D2D] m-0">Review Dispatcher Decision Ledger</h3>
                <p className="text-xs text-[#64748B] m-0 mt-0.5">
                  Audit trail of draft generations, order movements, vehicle reassignments, and confirmed deferrals.
                </p>
              </div>
              <button onClick={() => setPreviewModal(null)} className="text-[#64748B] hover:text-[#202D2D]">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
              {ledger.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No actions recorded in ledger yet.</div>
              ) : (
                ledger.map((entry) => (
                  <div key={entry.id} className="p-3 rounded-lg border border-[#E2E8F0] bg-white">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#202D2D]">{entry.action.toUpperCase()}</span>
                      <span className="text-[#64748B] tabular-nums">{entry.time} · v{entry.planVersion}</span>
                    </div>
                    <div className="text-[#485563] mt-1">
                      {entry.orderRef !== '(trip)' && entry.orderRef !== '(plan)' && (
                        <span className="font-semibold text-[#F97316] mr-2">{entry.orderRef}</span>
                      )}
                      <span>{entry.outletId}</span>
                    </div>
                    {entry.reasonNote && (
                      <div className="text-[#64748B] text-[11px] mt-1 italic">
                        &quot;{entry.reasonNote}&quot;
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* D. Release Confirmation Dialog */}
      {showReleaseConfirm && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowReleaseConfirm(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-[#CBD5E1] p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-[#F97316] flex-shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#202D2D] m-0">Confirm Plan Release</h3>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed m-0">
                  Are you sure you want to release revision <strong>v{draftRevision}</strong>? This will finalize <strong>{counts.served}</strong> assigned orders across <strong>{tripGroups.length}</strong> trips and <strong>{counts.deferred}</strong> confirmed deferrals.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReleaseConfirm(false)}
                className="rounded-lg border border-[#CBD5E1] px-3.5 py-1.5 text-xs font-semibold text-[#485563] hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmRelease}
                className="rounded-lg bg-[#F97316] hover:bg-[#EA580C] px-4 py-1.5 text-xs font-semibold text-white shadow-xs flex items-center gap-1.5"
              >
                {isSubmitting ? 'Releasing...' : 'Confirm & Release Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs for order editing */}
      {reassignRef && <ReassignDialog orderRef={reassignRef} onCancel={() => setReassignRef(null)} onDone={() => setReassignRef(null)} />}
      {deferRef && (
        <DeferDialog
          orderRef={deferRef}
          onCancel={() => setDeferRef(null)}
          onConfirm={(reasonCode: DeferReasonCode, note: string) => { deferOrder(deferRef, reasonCode, note); setDeferRef(null); }}
        />
      )}
    </div>
  );
}
