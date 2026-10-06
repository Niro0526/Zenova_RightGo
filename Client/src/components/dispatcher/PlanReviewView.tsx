'use client';

import React, { useMemo, useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';
import ReassignDialog from './ReassignDialog';
import DeferDialog from './DeferDialog';
import type { DeferReasonCode } from '@/types/dispatcher';

const CheckIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const WarnIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const GapIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;

function ResultIcon({ kind }: { kind: 'checker_pass' | 'checker_fail' | 'unverified' }) {
  if (kind === 'checker_pass') return <CheckIcon />;
  if (kind === 'checker_fail') return <WarnIcon />;
  return <GapIcon />;
}

export default function PlanReview() {
  const {
    orders, assignments, counts, planChecklist, draftRevision, manifests, publishPlan,
    fleetVehicles, getTripDeparture, setTripDeparture, getTripDriver, setTripDriver, getVehicleFuelInput, setVehicleFuelInput,
    getTripStops, getTripSchedule, getVehicleDistanceKm, reorderTrip, deferOrder, isSaving, error,
  } = useDispatcherPlan();

  const [reassignRef, setReassignRef] = useState<string | null>(null);
  const [deferRef, setDeferRef] = useState<string | null>(null);

  const anyCheckerFail = planChecklist.some(r => r.kind === 'checker_fail');
  const anyUnverified = planChecklist.some(r => r.kind === 'unverified');
  const canRelease = counts.unresolved === 0 && !anyCheckerFail && !anyUnverified;
  const lastManifest = manifests[manifests.length - 1];
  const unchangedSinceRelease = lastManifest?.revision === draftRevision;

  const deferredOrders = orders.filter(o => assignments[o.orderRef]?.decision === 'deferred');
  const priorityReview = deferredOrders.filter(o => o.deferredYesterday || o.daysSinceLastServed >= 4);

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

  const vehicleIdsInPlan = Array.from(new Set(tripGroups.map(g => g.vehicleId)));

  function handleRelease() {
    if (!canRelease) return;
    publishPlan();
  }

  return (
    <div className="flex flex-col flex-1 p-6 md:p-10 gap-6 w-full max-w-[1300px] mx-auto bg-[#F9FAFB] font-sans">

      <PageHeader
        title="Plan Review & Release"
        subtitle={`S1 Peak Day · Draft revision ${draftRevision}${lastManifest ? ` · released as of revision ${lastManifest.revision}` : ' · never released'}`}
      />
      <span className="text-xs text-[#485563] -mt-3">Status: <span className="text-[#F97316] font-semibold">Live S1 Scenario Validation</span> — computed from the current session's Planning state, not a static checklist.</span>

      {/* Stat Cards */}
      <div className="flex flex-col sm:flex-row gap-5 w-full">
        <div className="flex flex-col p-5 gap-2 bg-white border border-gray-200 shadow-sm rounded-xl flex-1">
          <span className="font-semibold text-[13px] text-[#485563]">Total Orders</span>
          <span className="font-bold text-[32px] text-[#202D2D] leading-[40px]">{counts.total}</span>
        </div>
        <div className="flex flex-col p-5 gap-2 bg-white border border-gray-200 shadow-sm rounded-xl flex-1">
          <span className="font-semibold text-[13px] text-[#485563]">Assigned</span>
          <span className="font-bold text-[32px] text-[#F97316] leading-[40px]">{counts.served}</span>
        </div>
        <div className="flex flex-col p-5 gap-2 bg-white border border-gray-200 shadow-sm rounded-xl flex-1">
          <span className="font-semibold text-[13px] text-[#485563]">Deferred</span>
          <span className="font-bold text-[32px] text-[#202D2D] leading-[40px]">{counts.deferred}</span>
        </div>
        <div className="flex flex-col p-5 gap-2 bg-white border border-gray-200 shadow-sm rounded-xl flex-1">
          <span className="font-semibold text-[13px] text-[#485563]">Unresolved</span>
          <span className={`font-bold text-[32px] leading-[40px] ${counts.unresolved > 0 ? 'text-red-500' : 'text-[#202D2D]'}`}>{counts.unresolved}</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 w-full">
        {/* Validation Checklist — computed live from validatePlan(), grouped checker vs operational */}
        <div className="flex-1 flex flex-col gap-4 bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-bold text-[16px] text-[#202D2D] m-0">S1 Scenario Validation</h2>
          {(['checker', 'operational'] as const).map(group => (
            <div key={group} className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{group === 'checker' ? 'Checker Rules (C01–C17)' : 'Operational Checks (beyond the checker)'}</span>
              {planChecklist.filter(r => r.group === group).map((r, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <ResultIcon kind={r.kind} />
                  <div className="flex flex-col">
                    <span className={`text-sm ${r.kind === 'checker_fail' ? 'text-red-700 font-semibold' : r.kind === 'unverified' ? 'text-gray-500' : 'text-[#202D2D]'}`}>{r.label}</span>
                    {r.kind !== 'checker_pass' && <span className="text-xs text-gray-500">{r.detail}</span>}
                  </div>
                </div>
              ))}
            </div>
          ))}

          <button
            disabled={!canRelease || unchangedSinceRelease || isSaving}
            onClick={handleRelease}
            className={`mt-4 py-3 px-6 rounded-lg font-semibold text-sm text-white transition-colors ${canRelease && !unchangedSinceRelease && !isSaving ? 'bg-orange-500 hover:bg-orange-600 cursor-pointer' : 'bg-[#94A3B8] cursor-not-allowed'}`}
          >
            {isSaving ? 'Releasing…' : lastManifest ? `Release (revision ${draftRevision})` : 'Release Plan'}
          </button>
          {error && (
            <div className="py-2.5 px-4 bg-[#FEF2F2] border border-red-200 rounded-lg text-xs font-semibold text-red-600">{error}</div>
          )}
          {!canRelease && (
            <div className="py-2.5 px-4 bg-[#FEF2F2] border border-red-200 rounded-lg text-xs font-semibold text-red-600">
              {counts.unresolved > 0 && <div>{counts.unresolved} unresolved orders must be assigned or deferred.</div>}
              {anyCheckerFail && <div>One or more checker rules currently fail.</div>}
              {anyUnverified && <div>One or more operational checks are unverified — set a trip's departure time or confirm a vehicle's prior fuel usage below to resolve.</div>}
            </div>
          )}
          {canRelease && unchangedSinceRelease && (
            <div className="py-2.5 px-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">No changes since revision {lastManifest!.revision} was released.</div>
          )}
          <p className="text-[11px] text-gray-400 italic">Releasing creates an immutable manifest version on the server; the backend re-validates the entire plan and rejects a stale or duplicate release.</p>
        </div>

        {/* Deferred orders reflect real deferrals made in Planning this session */}
        <div className="flex-1 flex flex-col gap-4">
          {priorityReview.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-[#FFFBEB] border border-amber-400 rounded-lg">
              <WarnIcon />
              <span className="text-sm font-semibold text-amber-700">
                {priorityReview.length} deferred order(s) were also deferred yesterday or have gone 4+ days without service (real `deferred_yesterday`/`days_since_last_served` fields) — consider priority review.
              </span>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-bold text-[16px] text-[#202D2D] m-0">Deferred Orders (This Session)</h2>
            </div>
            {deferredOrders.length === 0 ? (
              <div className="p-6 text-sm text-gray-400 text-center">No orders deferred yet this session. Go to Planning to assign or defer orders — this page updates live.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-4 font-bold text-[11px] text-[#485563] uppercase">Order</th>
                      <th className="py-2.5 px-4 font-bold text-[11px] text-[#485563] uppercase">Outlet</th>
                      <th className="py-2.5 px-4 font-bold text-[11px] text-[#485563] uppercase">Reason</th>
                      <th className="py-2.5 px-4 font-bold text-[11px] text-[#485563] uppercase">Days Since Served</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deferredOrders.map(o => {
                      const a = assignments[o.orderRef];
                      return (
                        <tr key={o.orderRef} className="border-b border-gray-100 last:border-0">
                          <td className="py-2.5 px-4 font-semibold text-sm text-[#F97316]">{o.orderRef}</td>
                          <td className="py-2.5 px-4 text-sm text-gray-700">{o.outletId}</td>
                          <td className="py-2.5 px-4 text-sm text-gray-600">{a?.reasonCode}{a?.reasonNote ? ` — ${a.reasonNote}` : ''}</td>
                          <td className="py-2.5 px-4">
                            <span className={`py-0.5 px-2 rounded font-bold text-xs ${o.daysSinceLastServed >= 4 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>{o.daysSinceLastServed}{o.deferredYesterday ? ' (+ deferred yesterday)' : ''}</span>
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

      {/* Assigned Trips & Manifests */}
      <div className="flex flex-col gap-4">
        <h2 className="font-bold text-[18px] text-[#202D2D] m-0">Assigned Trips &amp; Manifests</h2>
        {vehicleIdsInPlan.length === 0 && (
          <div className="p-6 bg-white border border-gray-200 rounded-xl text-sm text-gray-400 text-center">No orders assigned yet — assign orders in Planning to build trip manifests here.</div>
        )}
        {vehicleIdsInPlan.map(vehicleId => {
          const vehicle = fleetVehicles.find(v => v.vehicleId === vehicleId)!;
          const fuelInput = getVehicleFuelInput(vehicleId);
          const distanceKm = getVehicleDistanceKm(vehicleId);
          return (
            <div key={vehicleId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-sm text-[#202D2D]">{vehicleId}</span>
                  <span className="text-xs text-gray-500 ml-2">{vehicle.type} · {vehicle.temp} · today's estimated route: {distanceKm.toFixed(1)} km</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Confirmed prior weekly fuel usage (L)</label>
                  <input
                    type="number"
                    min={0}
                    value={fuelInput ?? ''}
                    placeholder="unconfirmed"
                    onChange={e => setVehicleFuelInput(vehicleId, e.target.value === '' ? null : Number(e.target.value))}
                    className="w-24 border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {fuelInput === null && <span className="text-[10px] text-amber-600 font-semibold">unconfirmed</span>}
                </div>
              </div>
              {tripGroups.filter(g => g.vehicleId === vehicleId).map(g => (
                <TripCard
                  key={`${g.vehicleId}-${g.tripNo}`}
                  vehicleId={g.vehicleId}
                  tripNo={g.tripNo}
                  orders={orders}
                  getTripStops={getTripStops}
                  getTripSchedule={getTripSchedule}
                  getTripDeparture={getTripDeparture}
                  setTripDeparture={setTripDeparture}
                  getTripDriver={getTripDriver}
                  setTripDriver={setTripDriver}
                  reorderTrip={reorderTrip}
                  onReassign={setReassignRef}
                  onDefer={setDeferRef}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Released manifest history */}
      {manifests.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-bold text-[18px] text-[#202D2D] m-0">Manifest Release History</h2>
          {[...manifests].reverse().map(m => (
            <div key={m.revision} className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${m.revision === lastManifest?.revision ? 'bg-white border-orange-300' : 'bg-gray-50 border-gray-200'}`}>
              <div>
                <span className="font-bold text-sm text-[#202D2D]">Revision {m.revision}</span>
                <span className="text-xs text-gray-500 ml-2">published {m.publishedAt} · {m.trips.length} trip(s) · {m.revision === lastManifest?.revision ? 'current' : 'superseded'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`py-1 px-2 rounded text-[10px] font-bold uppercase ${m.acknowledgement === 'acknowledged' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {m.acknowledgement === 'acknowledged' ? 'Acknowledged by Loader' : 'Awaiting Loader acknowledgement'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {reassignRef && (
        <ReassignDialog
          orderRef={reassignRef}
          onCancel={() => setReassignRef(null)}
          onDone={() => setReassignRef(null)}
          onOpenDefer={() => {
            const ref = reassignRef;
            setReassignRef(null);
            setDeferRef(ref);
          }}
        />
      )}
      {deferRef && (
        <DeferDialog
          orderRef={deferRef}
          onCancel={() => setDeferRef(null)}
          onConfirm={async (reasonCode: DeferReasonCode, note: string) => {
            const ok = await deferOrder(deferRef, reasonCode, note);
            if (ok) setDeferRef(null); // keep the dialog open on failure so `error` above is visible and the reason/note aren't lost
          }}
        />
      )}
    </div>
  );
}

function TripCard({
  vehicleId, tripNo, orders, getTripStops, getTripSchedule, getTripDeparture, setTripDeparture, getTripDriver, setTripDriver, reorderTrip, onReassign, onDefer,
}: {
  vehicleId: string;
  tripNo: 1 | 2;
  orders: ReturnType<typeof useDispatcherPlan>['orders'];
  getTripStops: ReturnType<typeof useDispatcherPlan>['getTripStops'];
  getTripSchedule: ReturnType<typeof useDispatcherPlan>['getTripSchedule'];
  getTripDeparture: ReturnType<typeof useDispatcherPlan>['getTripDeparture'];
  setTripDeparture: ReturnType<typeof useDispatcherPlan>['setTripDeparture'];
  getTripDriver: ReturnType<typeof useDispatcherPlan>['getTripDriver'];
  setTripDriver: ReturnType<typeof useDispatcherPlan>['setTripDriver'];
  reorderTrip: ReturnType<typeof useDispatcherPlan>['reorderTrip'];
  onReassign: (orderRef: string) => void;
  onDefer: (orderRef: string) => void;
}) {
  const stops = getTripStops(vehicleId, tripNo);
  const schedule = getTripSchedule(vehicleId, tripNo);
  const departure = getTripDeparture(vehicleId, tripNo);
  const driver = getTripDriver(vehicleId, tripNo);
  const ordersByRef = new Map(orders.map(o => [o.orderRef, o]));
  const allOrderRefs = stops.flatMap(s => s.orderRefs);
  const allOrders = allOrderRefs.map(r => ordersByRef.get(r)!);
  const brand = allOrders[0]?.brand;
  const suggestedDefault = brand === 'Fresh' && departure === null ? '03:30' : '';

  function move(index: number, dir: -1 | 1) {
    const newOrder = [...stops.map(s => s.outletId)];
    const target = index + dir;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    reorderTrip(vehicleId, tripNo, newOrder);
  }

  const totalWeight = allOrders.reduce((s, o) => s + o.orderWeightKg, 0);
  const totalVolume = allOrders.reduce((s, o) => s + o.orderVolumeM3, 0);
  const loadingSequence = [...stops].reverse();

  return (
    <div className="p-4 border-b border-gray-100 last:border-0 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm text-[#202D2D]">Trip {tripNo} · {allOrderRefs.length} order row(s) / {stops.length} physical stop(s)</span>
          <span className="text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            Driver: {driver?.name || (driver?.username ? `@${driver.username}` : 'Sunil Driver')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Planned departure</label>
          <input
            type="time"
            value={departure ?? ''}
            placeholder={suggestedDefault}
            onChange={e => setTripDeparture(vehicleId, tripNo, e.target.value || null)}
            className="border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-orange-500"
          />
          {departure === null && suggestedDefault && (
            <button onClick={() => setTripDeparture(vehicleId, tripNo, suggestedDefault)} className="text-[10px] text-orange-600 hover:underline">use suggested {suggestedDefault}</button>
          )}
          {departure === null && <span className="text-[10px] text-amber-600 font-semibold">not set</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span>Weight: {totalWeight.toFixed(1)} kg</span>
        <span>Volume: {totalVolume.toFixed(3)} m³</span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-gray-400 uppercase">Delivery sequence (reorderable stops)</span>
        {stops.map((stop, i) => {
          const sch = schedule?.find(s => s.outletId === stop.outletId);
          return (
            <div key={stop.outletId} className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="font-semibold text-xs text-gray-700 w-6">{i + 1}.</span>
              <span className="text-xs text-gray-900 flex-1">{stop.outletId} · {stop.orderRefs.join(', ')}</span>
              {sch && (
                <span className={`text-[10px] ${sch.late || sch.mallWindow?.violated ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                  arrive {formatMin(sch.arrival)}{sch.wait > 0 ? `, wait ${sch.wait}min` : ''}, service {formatMin(sch.serviceStart)}-{formatMin(sch.serviceEnd)}{sch.late ? ' — LATE' : ''}{sch.mallWindow?.violated ? ' — mall window violated' : ''}
                </span>
              )}
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30">↑</button>
              <button onClick={() => move(i, 1)} disabled={i === stops.length - 1} className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30">↓</button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase">Loading sequence (last delivery loaded first, first delivery loaded last — default; not a physically validated packing plan, no compartment/dimension data exists)</span>
        <span className="text-xs text-gray-600">{loadingSequence.map(s => s.outletId).join(' → ')}</span>
      </div>

      <div className="flex flex-col gap-1">
        {allOrderRefs.map(ref => (
          <div key={ref} className="flex items-center justify-between text-xs">
            <span className="text-gray-600">{ref} ({ordersByRef.get(ref)?.outletId})</span>
            <div className="flex gap-3">
              <button onClick={() => onReassign(ref)} className="text-orange-600 font-semibold hover:underline">Change vehicle/trip</button>
              <button onClick={() => onDefer(ref)} className="text-gray-500 font-semibold hover:underline">Defer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatMin(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = Math.round(minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}
