'use client';

import React, { useMemo, useState } from 'react';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';
import DeferDialog from './DeferDialog';
import type { DeferReasonCode } from '@/types/dispatcher';

const SearchIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const AlertIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const GapIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
const SnowflakeIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="22"/><line x1="12" y1="2" x2="16" y2="6"/><line x1="12" y1="2" x2="8" y2="6"/><line x1="12" y1="22" x2="16" y2="18"/><line x1="12" y1="22" x2="8" y2="18"/><line x1="2.5" y1="9" x2="21.5" y2="15"/><line x1="21.5" y1="9" x2="2.5" y2="15"/></svg>;
const SunIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>;

const BRAND_PILL: Record<string, string> = {
  Fresh: 'bg-[#ECFDF5] text-[#10B981]',
  Tech: 'bg-[#F3E8FF] text-[#8B5CF6]',
  Style: 'bg-[#FFF4ED] border border-[#F97316] text-[#F97316]',
};

export default function Planning() {
  const { orders, fleetVehicles, assignments, ordersOnTrip, compatibleCandidates, getPassport, assignOrder, deferOrder } = useDispatcherPlan();
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedTripNo, setSelectedTripNo] = useState<1 | 2>(1);
  const [search, setSearch] = useState('');
  const [showDefer, setShowDefer] = useState(false);

  const queue = useMemo(() => {
    const list = orders.filter(o => assignments[o.orderRef]?.decision === 'unresolved');
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(o => o.orderRef.toLowerCase().includes(q) || o.outletId.toLowerCase().includes(q) || o.district.toLowerCase().includes(q));
  }, [orders, assignments, search]);

  const selectedOrder = orders.find(o => o.orderRef === selectedRef) || null;
  const availableVehicles = useMemo(() => fleetVehicles.filter(v => v.status === 'available'), [fleetVehicles]);
  const candidates = selectedRef ? compatibleCandidates(selectedRef) : [];
  const candidateVehicleIds = new Set(candidates.map(c => c.vehicle.vehicleId));

  function pickTripNoFor(vehicleId: string): 1 | 2 {
    const candidate = candidates.find(c => c.vehicle.vehicleId === vehicleId);
    if (candidate) return candidate.tripNo;
    const t1 = selectedOrder ? ordersOnTrip(vehicleId, 1) : [];
    if (t1.length === 0 || (selectedOrder && t1[0].brand === selectedOrder.brand && t1[0].district === selectedOrder.district)) return 1;
    return 2;
  }

  function selectOrder(ref: string) {
    setSelectedRef(ref);
    const cands = compatibleCandidates(ref);
    if (cands.length > 0) {
      setSelectedVehicleId(cands[0].vehicle.vehicleId);
      setSelectedTripNo(cands[0].tripNo);
    } else {
      setSelectedVehicleId(null);
    }
  }

  function selectVehicle(vehicleId: string) {
    setSelectedVehicleId(vehicleId);
    setSelectedTripNo(pickTripNoFor(vehicleId));
  }

  const passport = selectedOrder && selectedVehicleId ? getPassport(selectedOrder.orderRef, selectedVehicleId, selectedTripNo) : null;

  function handleAssign() {
    if (!selectedOrder || !selectedVehicleId || !passport?.checkerFeasible) return;
    assignOrder(selectedOrder.orderRef, selectedVehicleId, selectedTripNo);
    setSelectedRef(null);
    setSelectedVehicleId(null);
  }

  function handleDeferConfirm(reasonCode: DeferReasonCode, note: string) {
    if (!selectedOrder) return;
    deferOrder(selectedOrder.orderRef, reasonCode, note);
    setShowDefer(false);
    setSelectedRef(null);
    setSelectedVehicleId(null);
  }

  return (
    <div className="flex flex-col flex-1 p-4 md:p-10 w-full max-w-[1400px] mx-auto bg-[#F9FAFB]">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 py-4 px-6 bg-white border border-[#CBD5E1] rounded-t-[10px]">
        <div className="flex flex-row items-center gap-3 flex-wrap">
          <h1 className="font-bold text-lg text-[#202D2D] m-0">Planning Workspace</h1>
          <span className="py-1 px-2 bg-[#FFF4ED] border border-[#F97316] rounded font-semibold text-[11px] text-[#202D2D] uppercase">Interactive Board</span>
        </div>
        <div className="font-medium text-sm text-[#485563]">
          S1 Scenario &nbsp;·&nbsp; Depot: <span className="text-[#F97316] font-semibold">Peliyagoda</span> &nbsp;·&nbsp; {availableVehicles.length} available vehicles
        </div>
      </div>

      {/* 3-Column Split */}
      <div className="flex flex-col lg:flex-row flex-1 bg-[#CBD5E1] gap-[1px] border-x border-b border-[#CBD5E1] rounded-b-[10px] overflow-hidden min-h-[600px]">

        {/* Left Column - Queue */}
        <div className="w-full lg:w-[300px] bg-white flex flex-col p-4 gap-4 flex-shrink-0 lg:h-[calc(100vh-170px)] overflow-y-auto">
          <h2 className="font-bold text-[15px] text-[#202D2D] m-0">Unallocated Queue ({queue.length})</h2>
          <div className="flex flex-row items-center py-2 px-2.5 gap-2 border border-[#CBD5E1] rounded-md w-full box-border">
            <SearchIcon />
            <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Search queue..." className="border-none outline-none font-sans text-xs text-[#485563] w-full" />
          </div>

          <div className="flex flex-col gap-2">
            {queue.map((q) => {
              const isSelected = selectedRef === q.orderRef;
              return (
                <div
                  key={q.orderRef}
                  onClick={() => selectOrder(q.orderRef)}
                  className={`flex flex-col p-3 gap-2 bg-white border rounded-md cursor-pointer transition-all ${isSelected ? 'bg-[#FFF4ED] border-[#F97316] shadow-sm' : 'border-[#CBD5E1] hover:border-gray-400'}`}
                >
                  <div className="flex flex-row justify-between items-center">
                    <span className="font-bold text-[13px] text-[#202D2D]">{q.orderRef}</span>
                    <span className={`py-0.5 px-1.5 rounded font-semibold text-[10px] uppercase ${BRAND_PILL[q.brand]}`}>{q.brand}</span>
                  </div>
                  <h3 className="font-semibold text-xs text-[#485563] m-0 line-clamp-1">{q.outletId} · {q.district}</h3>
                  <div className="flex flex-row items-center gap-2 font-medium text-[11px] text-[#485563]">
                    {q.tempRequirement === 'chilled' ? <SnowflakeIcon /> : <SunIcon />}
                    {q.orderWeightKg} kg / {q.orderVolumeM3} m³
                  </div>
                </div>
              );
            })}
            {queue.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm font-medium">All orders assigned or deferred.</div>
            )}
          </div>
        </div>

        {/* Middle Column - Vehicles & Trips */}
        <div className="w-full lg:w-[340px] bg-white flex flex-col p-4 gap-3 flex-shrink-0 lg:h-[calc(100vh-170px)] overflow-y-auto">
          <h2 className="font-bold text-[15px] text-[#202D2D] m-0">Vehicles &amp; Trips ({availableVehicles.length} available)</h2>
          {!selectedOrder && <p className="text-xs text-gray-400">Select an order from the queue to see compatible vehicles.</p>}
          {selectedOrder && candidates.length === 0 && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertIcon />
              <span className="text-xs font-semibold text-red-700">No compatible available vehicle — defer required. This order fails checker rules against all {availableVehicles.length} available S1 vehicles.</span>
            </div>
          )}
          {selectedOrder && availableVehicles.map(v => {
            const isSelected = selectedVehicleId === v.vehicleId;
            const isCandidate = candidateVehicleIds.has(v.vehicleId);
            const t1 = ordersOnTrip(v.vehicleId, 1);
            const t2 = ordersOnTrip(v.vehicleId, 2);

            return (
              <div
                key={v.vehicleId}
                onClick={() => selectVehicle(v.vehicleId)}
                className={`flex flex-col p-3 gap-2 border rounded-lg cursor-pointer transition-all ${isSelected ? 'border-[#F97316] bg-[#FFF4ED] shadow-sm' : isCandidate ? 'border-green-300 hover:border-green-400' : 'border-[#CBD5E1] hover:border-gray-400'}`}
              >
                <div className="flex flex-row justify-between items-center">
                  <span className="font-bold text-[13px] text-[#202D2D]">{v.vehicleId}</span>
                  <span className="py-0.5 px-1.5 bg-gray-100 text-gray-600 rounded font-semibold text-[10px] uppercase">{v.type} · {v.temp}</span>
                </div>
                <span className="text-[11px] text-[#485563] font-medium">{v.weightCapKg} kg / {v.volumeCapM3} m³ cap</span>
                <div className="flex items-center gap-2 text-[10px] text-[#485563]">
                  <span>Trip 1: {t1.length ? `${t1.length} order(s)` : 'empty'}</span>
                  <span>·</span>
                  <span>Trip 2: {t2.length ? `${t2.length} order(s)` : 'empty'}</span>
                  {isCandidate ? <span className="ml-auto text-green-600 font-semibold">✓ candidate</span> : <span className="ml-auto text-gray-400">not eligible</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column - Order Details View */}
        <div className="flex-1 bg-white flex flex-col p-6 overflow-y-auto lg:h-[calc(100vh-170px)] relative">
          {selectedOrder ? (
            <div className="flex flex-col w-full pb-10">
              <div className="flex flex-col gap-1 pb-4 mb-4 border-b border-gray-200">
                <span className="font-semibold text-[11px] text-[#F97316] uppercase">{selectedOrder.brand}</span>
                <h2 className="font-bold text-xl text-[#202D2D] m-0">{selectedOrder.orderRef} details</h2>
                <p className="font-medium text-sm text-[#485563] m-0">{selectedOrder.outletId} · {selectedOrder.district} District · {selectedOrder.dockType.replace('_', ' ')}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                <div className="flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="font-semibold text-[10px] text-gray-500 uppercase mb-1">Weight</span>
                  <span className="font-bold text-sm text-gray-900">{selectedOrder.orderWeightKg} kg</span>
                </div>
                <div className="flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="font-semibold text-[10px] text-gray-500 uppercase mb-1">Volume</span>
                  <span className="font-bold text-sm text-gray-900">{selectedOrder.orderVolumeM3} m³</span>
                </div>
                <div className="flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="font-semibold text-[10px] text-gray-500 uppercase mb-1">Temp Zone</span>
                  <span className={`font-bold text-sm ${selectedOrder.tempRequirement === 'chilled' ? 'text-blue-600' : 'text-amber-500'}`}>{selectedOrder.tempRequirement === 'chilled' ? 'Chilled' : 'Ambient'}</span>
                </div>
              </div>

              {passport && selectedVehicleId ? (
                <>
                  <h3 className="font-bold text-[15px] text-[#202D2D] mb-1">Constraint Passport <span className="text-[13px] font-medium text-[#485563]">(vs {selectedVehicleId} · Trip {selectedTripNo})</span></h3>
                  <div className="flex flex-col gap-2 mb-6">
                    {passport.results.map((c, i) => (
                      <div key={i} className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg gap-3">
                        {c.kind === 'checker_pass' && <div className="w-6 h-6 rounded bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0"><CheckIcon /></div>}
                        {c.kind === 'checker_fail' && <div className="w-6 h-6 rounded bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0"><AlertIcon /></div>}
                        {c.kind === 'policy_gap' && <div className="w-6 h-6 rounded bg-gray-200 text-gray-500 flex items-center justify-center flex-shrink-0"><GapIcon /></div>}
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-gray-500 uppercase">{c.label}{c.kind === 'policy_gap' && ' — not checker-covered'}</span>
                          <span className="text-xs font-medium text-gray-900">{c.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {passport.operationalFeasible === null && (
                    <p className="text-xs text-gray-500 italic mb-4">Operational feasibility: unresolved policy gaps above mean this cannot be labeled operationally compliant, only checker-feasible.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 mb-6">Select a vehicle from the middle column to run constraint validation.</p>
              )}

              <div className="flex flex-row gap-3 mt-auto pt-4 border-t border-gray-200">
                <button
                  disabled={!passport?.checkerFeasible}
                  onClick={handleAssign}
                  className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed rounded-lg font-semibold text-sm text-white transition-colors"
                >
                  {selectedVehicleId ? `Assign Order to ${selectedVehicleId} · Trip ${selectedTripNo}` : 'Select a vehicle to assign'}
                </button>
                <button
                  onClick={() => setShowDefer(true)}
                  className="flex-1 py-3 px-4 bg-white border-2 border-gray-300 hover:border-gray-400 rounded-lg font-semibold text-sm text-gray-700 transition-colors"
                >
                  Defer Order
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">No Order Selected</h3>
              <p className="text-sm text-gray-500">Select an unallocated order from the queue on the left to check constraint passport alignment and matching fleet.</p>
            </div>
          )}
        </div>
      </div>

      {showDefer && selectedOrder && (
        <DeferDialog orderRef={selectedOrder.orderRef} onCancel={() => setShowDefer(false)} onConfirm={handleDeferConfirm} />
      )}
    </div>
  );
}
