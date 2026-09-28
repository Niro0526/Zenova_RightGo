'use client';

import React, { useMemo, useState } from 'react';
import DispatcherSidebar from '@/components/dispatcher/DispatcherSidebar';
import { S1_ORDERS, DISPATCH_VEHICLES, S1Order, DispatchVehicle } from './data';

const SearchIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const AlertIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const SnowflakeIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="22"/><line x1="12" y1="2" x2="16" y2="6"/><line x1="12" y1="2" x2="8" y2="6"/><line x1="12" y1="22" x2="16" y2="18"/><line x1="12" y1="22" x2="8" y2="18"/><line x1="2.5" y1="9" x2="21.5" y2="15"/><line x1="21.5" y1="9" x2="2.5" y2="15"/></svg>;
const SunIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>;

const BRAND_PILL: Record<string, string> = {
  Fresh: 'bg-[#ECFDF5] text-[#10B981]',
  Tech: 'bg-[#F3E8FF] text-[#8B5CF6]',
  Style: 'bg-[#FFF4ED] border border-[#F97316] text-[#F97316]',
};

interface CheckResult {
  label: string;
  detail: string;
  pass: boolean;
}

function buildPassport(order: S1Order, vehicle: DispatchVehicle, tripIndex: number): CheckResult[] {
  const newWeight = order.weightKg + vehicle.currentLoadKg;
  const newVolume = order.volumeM3 + vehicle.currentLoadM3;
  const vanOnly = order.constraints.includes('van_only');

  return [
    { label: 'Home Depot', detail: `Pass - ${vehicle.depot}`, pass: true },
    { label: 'Temperature', detail: order.isChilled ? (vehicle.isReefer ? 'Pass - Reefer vehicle' : 'Fail - reefer required') : 'Pass - Ambient, no reefer required', pass: !order.isChilled || vehicle.isReefer },
    { label: 'Access / Van-Only', detail: vanOnly ? (vehicle.isVan ? 'Pass - Van vehicle' : 'Fail - van required') : 'Pass - No access restriction', pass: !vanOnly || vehicle.isVan },
    { label: 'Weight Limit', detail: `${newWeight <= vehicle.weightCapKg ? 'Pass' : 'Fail'} - ${newWeight.toFixed(1)} kg / ${vehicle.weightCapKg} kg`, pass: newWeight <= vehicle.weightCapKg },
    { label: 'Volume Limit', detail: `${newVolume <= vehicle.volumeCapM3 ? 'Pass' : 'Fail'} - ${newVolume.toFixed(2)} m³ / ${vehicle.volumeCapM3} m³`, pass: newVolume <= vehicle.volumeCapM3 },
    { label: 'Delivery Window', detail: `Check - ${order.deliveryWindow}`, pass: true },
    { label: 'Trip Limit', detail: `Pass - Trip ${tripIndex} of 2`, pass: tripIndex <= 2 },
  ];
}

export default function Planning() {
  const [orders, setOrders] = useState<S1Order[]>(() => S1_ORDERS.map(o => ({ ...o })));
  const [vehicles, setVehicles] = useState<DispatchVehicle[]>(() => DISPATCH_VEHICLES.map(v => ({ ...v })));
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>('VEH036');
  const [search, setSearch] = useState('');

  const queue = useMemo(() => {
    const list = orders.filter(o => o.planningStatus === 'unresolved');
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(o => o.ref.toLowerCase().includes(q) || o.outletId.toLowerCase().includes(q) || o.outletName.toLowerCase().includes(q));
  }, [orders, search]);

  const selectedOrder = orders.find(o => o.ref === selectedRef) || null;
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || null;

  const passport = selectedOrder && selectedVehicle ? buildPassport(selectedOrder, selectedVehicle, 1) : [];
  const allPass = passport.every(c => c.pass);

  function isCandidate(order: S1Order, vehicle: DispatchVehicle) {
    if (order.isChilled && !vehicle.isReefer) return false;
    if (order.constraints.includes('van_only') && !vehicle.isVan) return false;
    return order.weightKg + vehicle.currentLoadKg <= vehicle.weightCapKg && order.volumeM3 + vehicle.currentLoadM3 <= vehicle.volumeCapM3;
  }

  function handleAssign() {
    if (!selectedOrder || !selectedVehicle || !allPass) return;
    setVehicles(prev => prev.map(v => v.id === selectedVehicle.id
      ? { ...v, currentLoadKg: v.currentLoadKg + selectedOrder.weightKg, currentLoadM3: v.currentLoadM3 + selectedOrder.volumeM3, tripTimeMin: v.tripTimeMin + 20 }
      : v));
    setOrders(prev => prev.map(o => o.ref === selectedOrder.ref ? { ...o, planningStatus: 'assigned' } : o));
    setSelectedRef(null);
  }

  function handleDefer() {
    if (!selectedOrder) return;
    setOrders(prev => prev.map(o => o.ref === selectedOrder.ref ? { ...o, planningStatus: 'deferred' } : o));
    setSelectedRef(null);
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAFAFA] font-sans">
      <DispatcherSidebar />
      <div className="flex flex-col flex-1 p-4 md:p-10 w-full max-w-[1400px] mx-auto bg-[#F9FAFB] h-full overflow-y-auto">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 py-4 px-6 bg-white border border-[#CBD5E1] rounded-t-[10px]">
          <div className="flex flex-row items-center gap-3 flex-wrap">
            <h1 className="font-bold text-lg text-[#202D2D] m-0">Planning Workspace</h1>
            <span className="py-1 px-2 bg-[#FFF4ED] border border-[#F97316] rounded font-semibold text-[11px] text-[#202D2D] uppercase">Interactive Board</span>
          </div>
          <div className="font-medium text-sm text-[#485563]">
            Run: 8 Jan 2026 &nbsp;·&nbsp; Depot: <span className="text-[#F97316] font-semibold">Peliyagoda</span>
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
                const isSelected = selectedRef === q.ref;
                return (
                  <div
                    key={q.ref}
                    onClick={() => setSelectedRef(q.ref)}
                    className={`flex flex-col p-3 gap-2 bg-white border rounded-md cursor-pointer transition-all ${isSelected ? 'bg-[#FFF4ED] border-[#F97316] shadow-sm' : 'border-[#CBD5E1] hover:border-gray-400'}`}
                  >
                    <div className="flex flex-row justify-between items-center">
                      <span className="font-bold text-[13px] text-[#202D2D]">{q.ref}</span>
                      <span className={`py-0.5 px-1.5 rounded font-semibold text-[10px] uppercase ${BRAND_PILL[q.brand]}`}>{q.brand}</span>
                    </div>
                    <h3 className="font-semibold text-xs text-[#485563] m-0 line-clamp-1">{q.outletId} · {q.outletName}</h3>
                    <div className="flex flex-row items-center gap-2 font-medium text-[11px] text-[#485563]">
                      {q.isChilled ? <SnowflakeIcon /> : <SunIcon />}
                      {q.weightKg} kg / {q.volumeM3} m³
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
            <h2 className="font-bold text-[15px] text-[#202D2D] m-0">Vehicles &amp; Trips</h2>
            {vehicles.map(v => {
              const candidate = selectedOrder ? isCandidate(selectedOrder, v) : false;
              const isSelected = selectedVehicleId === v.id;
              const weightPct = Math.min(100, (v.currentLoadKg / v.weightCapKg) * 100);
              const volPct = Math.min(100, (v.currentLoadM3 / v.volumeCapM3) * 100);

              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`flex flex-col p-3 gap-2 border rounded-lg cursor-pointer transition-all ${isSelected ? 'border-[#F97316] bg-[#FFF4ED] shadow-sm' : 'border-[#CBD5E1] hover:border-gray-400'}`}
                >
                  <div className="flex flex-row justify-between items-center">
                    <span className="font-bold text-[13px] text-[#202D2D]">{v.id}</span>
                    <span className="py-0.5 px-1.5 bg-gray-100 text-gray-600 rounded font-semibold text-[10px] uppercase">{v.type}</span>
                  </div>
                  <span className="text-[11px] text-[#485563] font-medium">{v.depot} Depot</span>

                  {isSelected && selectedOrder ? (
                    <>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#485563] mt-1">
                        <span>Trip 1 allocation ({selectedOrder.ref})</span>
                        {candidate ? <span className="text-green-600">✓ Candidate Pair</span> : <span className="text-red-500">Not eligible</span>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[10px] text-[#485563]"><span>Weight</span><span>{(v.currentLoadKg + selectedOrder.weightKg).toFixed(1)}/{v.weightCapKg} kg</span></div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full ${candidate ? 'bg-blue-500' : 'bg-red-400'}`} style={{ width: `${Math.min(100, ((v.currentLoadKg + selectedOrder.weightKg) / v.weightCapKg) * 100)}%` }}></div></div>
                        <div className="flex justify-between text-[10px] text-[#485563] mt-1"><span>Volume</span><span>{(v.currentLoadM3 + selectedOrder.volumeM3).toFixed(2)}/{v.volumeCapM3} m³</span></div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full ${candidate ? 'bg-blue-500' : 'bg-red-400'}`} style={{ width: `${Math.min(100, ((v.currentLoadM3 + selectedOrder.volumeM3) / v.volumeCapM3) * 100)}%` }}></div></div>
                      </div>
                      <span className="text-[10px] text-[#485563]">Trip Time: {v.tripTimeMin + 20} min estimated · Budget: {v.tripBudgetMin} min</span>
                    </>
                  ) : (
                    <span className="py-1 px-2 bg-[#F0FDF4] text-green-600 rounded text-[10px] font-semibold uppercase w-fit">
                      {v.currentLoadKg === 0 ? 'Available Slot' : `${((v.currentLoadKg / v.weightCapKg) * 100).toFixed(0)}% Loaded`}
                    </span>
                  )}
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
                  <h2 className="font-bold text-xl text-[#202D2D] m-0">{selectedOrder.ref} details</h2>
                  <p className="font-medium text-sm text-[#485563] m-0">{selectedOrder.outletId} · {selectedOrder.outletName} · {selectedOrder.district} District</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                  <div className="flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="font-semibold text-[10px] text-gray-500 uppercase mb-1">Weight</span>
                    <span className="font-bold text-sm text-gray-900">{selectedOrder.weightKg} kg</span>
                  </div>
                  <div className="flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="font-semibold text-[10px] text-gray-500 uppercase mb-1">Volume</span>
                    <span className="font-bold text-sm text-gray-900">{selectedOrder.volumeM3} m³</span>
                  </div>
                  <div className="flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="font-semibold text-[10px] text-gray-500 uppercase mb-1">Temp Zone</span>
                    <span className={`font-bold text-sm ${selectedOrder.isChilled ? 'text-blue-600' : 'text-amber-500'}`}>{selectedOrder.isChilled ? 'Chilled' : 'Ambient'}</span>
                  </div>
                </div>

                {selectedVehicle ? (
                  <>
                    <h3 className="font-bold text-[15px] text-[#202D2D] mb-1">Constraint Passport <span className="text-[13px] font-medium text-[#485563]">(vs {selectedVehicle.id})</span></h3>
                    <div className="flex flex-col gap-2 mb-6">
                      {passport.map((c, i) => (
                        <div key={i} className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg gap-3">
                          {c.pass ? (
                            <div className="w-6 h-6 rounded bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0"><CheckIcon /></div>
                          ) : (
                            <div className="w-6 h-6 rounded bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0"><AlertIcon /></div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-gray-500 uppercase">{c.label}</span>
                            <span className="text-xs font-medium text-gray-900">{c.detail}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-row gap-3 mt-auto pt-4 border-t border-gray-200">
                      <button
                        disabled={!allPass}
                        onClick={handleAssign}
                        className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed rounded-lg font-semibold text-sm text-white transition-colors"
                      >
                        Assign Order to {selectedVehicle.id}
                      </button>
                      <button
                        onClick={handleDefer}
                        className="flex-1 py-3 px-4 bg-white border-2 border-gray-300 hover:border-gray-400 rounded-lg font-semibold text-sm text-gray-700 transition-colors"
                      >
                        Defer Order
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">Select a vehicle from the middle column to run constraint validation.</p>
                )}
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
      </div>
    </div>
  );
}
