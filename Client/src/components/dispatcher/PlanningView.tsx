'use client';
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';
import PlanReview from './PlanReviewView';
import ReassignDialog from './ReassignDialog';
import DeferDialog from './DeferDialog';
import type { DeferReasonCode } from '@/types/dispatcher';

const SearchIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const AlertIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const SnowflakeIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="22" /><line x1="12" y1="2" x2="16" y2="6" /><line x1="12" y1="2" x2="8" y2="6" /><line x1="12" y1="22" x2="16" y2="18" /><line x1="12" y1="22" x2="8" y2="18" /><line x1="2.5" y1="9" x2="21.5" y2="15" /></svg>;
const SunIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /></svg>;

type Stage = 'prepare' | 'review' | 'release' | 'manual';

export default function Planning() {
  return (
    <Suspense fallback={<div className="flex flex-col flex-1 items-center justify-center p-10 text-sm text-gray-400">Loading planning workspace…</div>}>
      <PlanningInner />
    </Suspense>
  );
}

function PlanningInner() {
  const searchParams = useSearchParams();
  const { orders, isLoading } = useDispatcherPlan();
  const [planningStage, setPlanningStage] = useState<Stage>('prepare');
  const [manualSelectedRef, setManualSelectedRef] = useState<string | null>(null);

  // "Open in Planning" from Orders deep-links here with ?orderRef=... - jump
  // straight to the manual workspace with that exact order selected.
  useEffect(() => {
    const ref = searchParams.get('orderRef');
    if (ref && orders.some(o => o.orderRef === ref)) {
      setManualSelectedRef(ref);
      setPlanningStage('manual');
    }
  }, [searchParams, orders]);

  if (isLoading) {
    return <div className="flex flex-col flex-1 items-center justify-center p-10 text-sm text-gray-400">Loading planning workspace…</div>;
  }

  if (planningStage === 'manual') {
    return <ManualAssignmentWorkspace onBack={() => setPlanningStage('prepare')} initialSelectedRef={manualSelectedRef} />;
  }

  return (
    <div className="flex flex-col flex-1 p-4 md:p-10 w-full max-w-[1160px] mx-auto bg-[#F9FAFB] h-full overflow-y-auto font-sans">

      {/* Stepper Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 px-6 bg-white border border-[#CBD5E1] rounded-[10px] mb-6 shadow-sm gap-4 md:gap-0">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-xl text-[#202D2D] m-0">Planning</h1>
          <span className="py-1 px-2 bg-gray-100 border border-gray-300 rounded font-semibold text-[11px] text-gray-600 uppercase tracking-wider">
            Dispatcher Workflow
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm font-semibold">
          <div className={`flex items-center gap-2 ${planningStage === 'prepare' ? 'text-orange-600' : 'text-gray-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${planningStage === 'prepare' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>1</div>
            Prepare
          </div>
          <div className="w-8 h-px bg-gray-300"></div>
          <div className={`flex items-center gap-2 ${planningStage === 'review' ? 'text-orange-600' : 'text-gray-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${planningStage === 'review' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>2</div>
            Review Draft
          </div>
          <div className="w-8 h-px bg-gray-300"></div>
          <div className={`flex items-center gap-2 ${planningStage === 'release' ? 'text-orange-600' : 'text-gray-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${planningStage === 'release' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>3</div>
            Review & Release
          </div>
        </div>
      </div>

      {planningStage === 'prepare' && (
        <PrepareStage onGenerated={() => setPlanningStage('review')} onManual={() => { setManualSelectedRef(null); setPlanningStage('manual'); }} />
      )}

      {planningStage === 'review' && (
        <ReviewStage onNext={() => setPlanningStage('release')} onManual={(ref?: string) => { setManualSelectedRef(ref ?? null); setPlanningStage('manual'); }} />
      )}

      {planningStage === 'release' && (
        <PlanReview />
      )}

    </div>
  );
}

function PrepareStage({ onGenerated, onManual }: { onGenerated: () => void; onManual: () => void }) {
  const {
    orders,
    confirmedQueue,
    cutoffStatus,
    fleetVehicles,
    counts,
    draftRevision,
    ordersClosed,
    closeOrders,
    suggestPlan,
    refreshQueue,
    isSaving,
    error,
  } = useDispatcherPlan();

  const [brandFilter, setBrandFilter] = useState<'ALL' | 'Fresh' | 'Style' | 'Tech'>('ALL');
  const [queueSearch, setQueueSearch] = useState('');
  const [isRefreshingQueue, setIsRefreshingQueue] = useState(false);

  const availableFleet = fleetVehicles.filter(v => v.status === 'available').length;
  const draftExists = draftRevision > 0;

  async function handleCloseAndPlan() {
    const ok = await closeOrders();
    if (ok) onGenerated();
  }

  async function handleGenerate() {
    const ok = await suggestPlan();
    if (ok) onGenerated();
  }

  async function handleManualRefreshQueue() {
    setIsRefreshingQueue(true);
    try {
      await refreshQueue();
    } finally {
      setIsRefreshingQueue(false);
    }
  }

  const queueToDisplay = (confirmedQueue.length > 0 ? confirmedQueue : orders.filter(o => o.status === 'awaiting_planning'))
    .filter(o => {
      if (brandFilter !== 'ALL' && o.brand !== brandFilter) return false;
      if (queueSearch) {
        const q = queueSearch.toLowerCase();
        return o.orderRef.toLowerCase().includes(q) ||
          o.outletId.toLowerCase().includes(q) ||
          o.district.toLowerCase().includes(q);
      }
      return true;
    });

  const freshCount = cutoffStatus?.brandCounts?.Fresh ?? confirmedQueue.filter(o => o.brand === 'Fresh').length;
  const styleCount = cutoffStatus?.brandCounts?.Style ?? confirmedQueue.filter(o => o.brand === 'Style').length;
  const techCount = cutoffStatus?.brandCounts?.Tech ?? confirmedQueue.filter(o => o.brand === 'Tech').length;
  const totalConfirmed = cutoffStatus?.confirmedCount ?? confirmedQueue.length;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="bg-white border border-[#CBD5E1] rounded-[10px] p-4 md:p-8 flex flex-col gap-6 shadow-sm">

        {/* Top Header & Cutoff Status */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
          <div className="flex flex-col gap-1.5 max-w-2xl">
            <h2 className="font-bold text-xl sm:text-2xl text-gray-900 m-0">Prepare Planning Run</h2>
            <p className="text-sm text-gray-600 m-0 leading-relaxed">
              Store Manager replenishment orders are saved to the database as confirmed (<code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-800">awaiting_planning</code>). The 4:00 PM Asia/Colombo cutoff locks the intake window for next-day planning. Click <strong>Close Orders &amp; Auto-Plan</strong> to run the constraint-based engine.
            </p>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-2 bg-gray-50 p-3.5 rounded-lg border border-gray-200 w-full lg:w-auto">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-900">Peliyagoda Central Depot</span>
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-mono font-medium">Scenario S1</span>
            </div>
            
            {/* Cutoff Status Badge */}
            {cutoffStatus && (
              <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold ${
                cutoffStatus.cutoffPassed
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                  : 'bg-amber-50 border border-amber-300 text-amber-800'
              }`}>
                <span className={`w-2 h-2 rounded-full ${cutoffStatus.cutoffPassed ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {cutoffStatus.cutoffPassed ? (
                  <span>4:00 PM Cutoff Passed · Ready for Next-Day Auto-Plan ({cutoffStatus.runDate})</span>
                ) : (
                  <span>Before 4:00 PM Cutoff ({cutoffStatus.localTime} Colombo) · Orders Live</span>
                )}
              </div>
            )}

            {ordersClosed && (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                Planning window closed for Draft Rev {draftRevision}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="py-2.5 px-4 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600">
            {error}
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col shadow-xs">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Confirmed Queue</span>
            <span className="text-3xl font-black text-gray-900">{totalConfirmed}</span>
            <span className="text-xs text-gray-500 mt-1">Awaiting vehicle assignment</span>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col shadow-xs">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Available Fleet</span>
            <span className="text-3xl font-black text-gray-900">{availableFleet}</span>
            <span className="text-xs text-gray-500 mt-1">of {fleetVehicles.length} total vehicles</span>
          </div>

          <div className={`rounded-lg p-5 flex flex-col border shadow-xs ${counts.unresolved > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
            <span className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${counts.unresolved > 0 ? 'text-amber-700' : 'text-gray-500'}`}>Needs Decision</span>
            <span className={`text-3xl font-black ${counts.unresolved > 0 ? 'text-amber-800' : 'text-gray-900'}`}>{counts.unresolved}</span>
            <span className="text-xs mt-1 font-medium text-gray-500">Unallocated orders</span>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col shadow-xs">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Draft Revision</span>
            <span className="text-2xl font-black text-gray-900 mt-0.5">{draftExists ? `Rev ${draftRevision}` : 'Not Started'}</span>
            <span className="text-xs text-gray-500 mt-1">{counts.served} assigned · {counts.deferred} deferred</span>
          </div>
        </div>

        {/* Confirmed Order Queue Live Panel */}
        <div className="border border-[#CBD5E1] rounded-lg bg-white overflow-hidden shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 border-b border-gray-200 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 text-orange-700 rounded-lg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-gray-900 m-0">Confirmed Store Orders Queue</h3>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-full">
                    {queueToDisplay.length} orders
                  </span>
                </div>
                <p className="text-xs text-gray-500 m-0 mt-0.5">
                  Live database feed of confirmed store orders waiting for automated routing.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              {cutoffStatus?.newestOrderAt && (
                <span className="text-[11px] text-gray-500 hidden md:inline">
                  Last order: {new Date(cutoffStatus.newestOrderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                onClick={handleManualRefreshQueue}
                disabled={isRefreshingQueue}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
                title="Refresh order queue from DB"
              >
                <svg className={`w-3.5 h-3.5 ${isRefreshingQueue ? 'animate-spin text-orange-600' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                {isRefreshingQueue ? 'Refreshing…' : 'Refresh Feed'}
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-3 border-b border-gray-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setBrandFilter('ALL')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${brandFilter === 'ALL' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                All ({totalConfirmed})
              </button>
              <button
                onClick={() => setBrandFilter('Fresh')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${brandFilter === 'Fresh' ? 'bg-[#ECFDF5] text-emerald-800 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Fresh ({freshCount})
              </button>
              <button
                onClick={() => setBrandFilter('Style')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${brandFilter === 'Style' ? 'bg-[#FFF4ED] text-orange-800 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Style ({styleCount})
              </button>
              <button
                onClick={() => setBrandFilter('Tech')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${brandFilter === 'Tech' ? 'bg-[#F3E8FF] text-purple-800 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Tech ({techCount})
              </button>
            </div>

            <div className="flex items-center px-2.5 py-1.5 border border-gray-300 rounded-md text-xs w-full sm:w-64 bg-gray-50 focus-within:bg-white focus-within:border-orange-500">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search ref, outlet, district…"
                value={queueSearch}
                onChange={e => setQueueSearch(e.target.value)}
                className="ml-2 bg-transparent border-none outline-none w-full text-xs text-gray-800"
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-600 font-semibold uppercase tracking-wider sticky top-0 border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-4">Order Ref</th>
                  <th className="py-2.5 px-3">Outlet</th>
                  <th className="py-2.5 px-3">Brand</th>
                  <th className="py-2.5 px-3">Units &amp; Weight</th>
                  <th className="py-2.5 px-3">Temp Zone</th>
                  <th className="py-2.5 px-3">Delivery Window</th>
                  <th className="py-2.5 px-3">District</th>
                  <th className="py-2.5 px-3">Placed By</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {queueToDisplay.map((ord) => (
                  <tr key={ord.orderRef} className="hover:bg-orange-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-gray-900">
                      {ord.orderRef}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-gray-800">
                      {ord.outletId}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        ord.brand === 'Fresh'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ord.brand === 'Style'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {ord.brand}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-700">
                      <span className="font-semibold">{ord.orderUnits} units</span>
                      <span className="text-gray-400 text-[11px] block">{ord.orderWeightKg.toFixed(1)} kg · {ord.orderVolumeM3.toFixed(3)} m³</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 font-medium ${ord.tempRequirement === 'chilled' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {ord.tempRequirement === 'chilled' ? <SnowflakeIcon /> : <SunIcon />}
                        <span className="capitalize">{ord.tempRequirement}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 font-mono text-[11px]">
                      {ord.windowOpenTime} - {ord.windowCloseTime}
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">
                      {ord.district}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 text-[11px]">
                      {ord.placedBy ?? 'Store Manager'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="inline-block px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-semibold text-[10px] uppercase">
                        Awaiting Plan
                      </span>
                    </td>
                  </tr>
                ))}
                {queueToDisplay.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-400 text-xs">
                      No matching confirmed orders found in queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Planning Priorities & Rules Dropdown */}
        <details className="group border border-gray-200 rounded-lg bg-gray-50">
          <summary className="flex cursor-pointer items-center justify-between p-4 font-semibold text-gray-900 text-sm marker:content-none">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
              Automated Planning Rules &amp; DB Constraints
            </div>
            <svg className="w-5 h-5 text-gray-500 transition group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </summary>
          <div className="p-5 pt-2 text-sm text-gray-600 border-t border-gray-200 bg-white rounded-b-lg">
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Temperature Zone Fit:</strong> Reefer trucks are allocated for Chilled Fresh orders; Ambient vehicles for Dry/Style/Tech.</li>
              <li><strong>Physical Outlet Constraints:</strong> Enforces Van-only access restrictions and dock-type matching.</li>
              <li><strong>Trip Time Budget:</strong> Maximum cumulative 270 minutes for Fresh and 480 minutes for Style/Tech per vehicle.</li>
              <li><strong>Priority Heuristic:</strong> Outlets deferred from yesterday and tightest delivery windows are scheduled first.</li>
              <li><strong>Manual Overrides:</strong> Manual assignments, reassignments, departure times, and locked fuel values are strictly preserved on regeneration.</li>
            </ul>
          </div>
        </details>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={onManual}
            className="py-2.5 px-6 border border-gray-300 rounded-lg font-semibold text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Manual Assignment
          </button>
          {!ordersClosed && (
            <button
              onClick={handleGenerate}
              disabled={isSaving}
              className="py-2.5 px-6 border border-gray-300 rounded-lg font-semibold text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Regenerate Draft Only
            </button>
          )}
          <button
            onClick={handleCloseAndPlan}
            disabled={isSaving}
            className="flex items-center justify-center min-w-[240px] gap-2 py-2.5 px-6 bg-[#F97316] hover:bg-orange-600 disabled:bg-orange-400 rounded-lg font-semibold text-sm text-white transition-colors shadow-sm"
          >
            {isSaving ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
            )}
            {isSaving ? 'Closing & Planning…' : ordersClosed ? 'Re-run Auto Plan' : 'Close Orders & Auto-Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewStage({ onNext, onManual }: { onNext: () => void; onManual: (ref?: string) => void }) {
  const { orders, assignments, fleetVehicles, counts, planChecklist, getTripStops, getTripSchedule, suggestPlan, isSaving, error } = useDispatcherPlan();
  const [activeTab, setActiveTab] = useState<'trips' | 'exceptions'>('trips');
  const [selectedTrip, setSelectedTrip] = useState<{ vehicleId: string; tripNo: 1 | 2 } | null>(null);

  const tripGroups = useMemo(() => {
    const groups = new Map<string, { vehicleId: string; tripNo: 1 | 2; orderRefs: string[]; weight: number; volume: number }>();
    for (const o of orders) {
      const a = assignments[o.orderRef];
      if (a?.decision !== 'served' || !a.vehicleId || !a.tripNo) continue;
      const key = `${a.vehicleId}-${a.tripNo}`;
      const g = groups.get(key) ?? { vehicleId: a.vehicleId, tripNo: a.tripNo, orderRefs: [], weight: 0, volume: 0 };
      g.orderRefs.push(o.orderRef);
      g.weight += o.orderWeightKg;
      g.volume += o.orderVolumeM3;
      groups.set(key, g);
    }
    return Array.from(groups.values()).sort((a, b) => a.vehicleId.localeCompare(b.vehicleId) || a.tripNo - b.tripNo);
  }, [orders, assignments]);

  const deferredOrders = orders.filter(o => assignments[o.orderRef]?.decision === 'deferred');
  const anyCheckerFail = planChecklist.some(r => r.kind === 'checker_fail');

  async function handleRegenerate() {
    await suggestPlan();
  }

  const selectedGroup = selectedTrip ? tripGroups.find(g => g.vehicleId === selectedTrip.vehicleId && g.tripNo === selectedTrip.tripNo) : null;
  const selectedStops = selectedTrip ? getTripStops(selectedTrip.vehicleId, selectedTrip.tripNo) : [];
  const selectedSchedule = selectedTrip ? getTripSchedule(selectedTrip.vehicleId, selectedTrip.tripNo) : null;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 relative h-full">
      {/* Summary Bar */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between bg-white border border-gray-200 rounded-[10px] p-5 shadow-sm gap-4 xl:gap-0">
        <div className="flex flex-wrap gap-4 md:gap-8">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Orders Allocated</span>
            <span className="text-xl font-black text-gray-900 mt-1">{counts.served} <span className="text-sm font-semibold text-gray-400">/ {counts.total}</span></span>
          </div>
          <div className="w-px h-10 bg-gray-200 mt-1"></div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Suggested Trips</span>
            <span className="text-xl font-black text-gray-900 mt-1">{tripGroups.length}</span>
          </div>
          <div className="w-px h-10 bg-gray-200 mt-1"></div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Needs Decision</span>
            <span className="text-xl font-black text-amber-600 mt-1">{counts.unresolved}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full xl:w-auto">
          <button onClick={() => onManual()} className="flex-1 xl:flex-none py-2.5 px-5 border border-gray-300 rounded-lg font-semibold text-sm text-gray-700 hover:bg-gray-50">
            Manual Assignment
          </button>
          <button disabled={isSaving} onClick={handleRegenerate} className="flex-1 xl:flex-none py-2.5 px-5 border border-gray-300 rounded-lg font-semibold text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {isSaving ? 'Regenerating…' : 'Regenerate'}
          </button>
          <button onClick={onNext} className="w-full xl:w-auto py-2.5 px-6 bg-orange-500 hover:bg-orange-600 rounded-lg font-semibold text-sm text-white shadow-sm">
            Continue to Release
          </button>
        </div>
      </div>
      {error && <div className="py-2.5 px-4 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600">{error}</div>}
      {anyCheckerFail && <div className="py-2.5 px-4 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600">One or more checker rules currently fail - see Review &amp; Release for the full checklist.</div>}

      <div className="flex flex-col lg:flex-row gap-6 min-h-[500px]">
        {/* Main Workspace */}
        <div className="flex flex-col flex-1 bg-white border border-gray-200 rounded-[10px] overflow-hidden shadow-sm">
          <div className="flex flex-col sm:flex-row border-b border-gray-200 bg-gray-50">
            <button onClick={() => setActiveTab('trips')} className={`flex-1 py-4 px-2 text-sm font-bold sm:border-b-2 sm:border-r-0 border-b border-r sm:border-r-transparent transition-colors ${activeTab === 'trips' ? 'border-b-orange-500 text-orange-600 bg-white' : 'border-b-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>Suggested Trips ({tripGroups.length})</button>
            <button onClick={() => setActiveTab('exceptions')} className={`flex-1 py-4 px-2 text-sm font-bold sm:border-b-2 border-b-transparent transition-colors ${activeTab === 'exceptions' ? 'sm:border-b-amber-500 text-amber-600 bg-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>Exceptions &amp; Attention ({deferredOrders.length + counts.unresolved})</button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-[#F9FAFB]">
            {activeTab === 'trips' ? (
              tripGroups.length === 0 ? (
                <div className="p-10 text-center text-sm text-gray-400">No trips yet - generate a draft or assign orders manually.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {tripGroups.map(g => {
                    const vehicle = fleetVehicles.find(v => v.vehicleId === g.vehicleId);
                    const isSelected = selectedTrip?.vehicleId === g.vehicleId && selectedTrip?.tripNo === g.tripNo;
                    const weightPct = vehicle ? (g.weight / vehicle.weightCapKg) * 100 : 0;
                    return (
                      <div key={`${g.vehicleId}-${g.tripNo}`} onClick={() => setSelectedTrip({ vehicleId: g.vehicleId, tripNo: g.tripNo })} className={`bg-white border rounded-xl p-5 cursor-pointer transition-all ${isSelected ? 'border-orange-500 shadow-md ring-1 ring-orange-500' : 'border-gray-200 hover:border-orange-300 hover:shadow-sm'}`}>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-black text-lg text-gray-900 m-0">{g.vehicleId} <span className="text-gray-400 font-medium text-sm ml-1">Trip {g.tripNo}</span></h3>
                            <p className="text-[11px] font-bold text-gray-500 uppercase mt-1">{vehicle ? `${vehicle.type} · ${vehicle.temp}` : ''}</p>
                          </div>
                          <span className="py-1 px-2 rounded font-bold text-[10px] uppercase bg-green-100 text-green-700">{g.orderRefs.length} orders</span>
                        </div>
                        {vehicle && (
                          <div className="space-y-2 mb-3">
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span className="text-gray-500 uppercase">Weight</span>
                              <span className="text-gray-900">{g.weight.toFixed(0)} / {vehicle.weightCapKg.toFixed(0)} kg</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full ${weightPct > 90 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, weightPct)}%` }}></div>
                            </div>
                          </div>
                        )}
                        <div className="p-2.5 bg-blue-50 border border-blue-100 rounded text-xs font-medium text-blue-800 leading-relaxed">
                          Orders: {g.orderRefs.join(', ')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="flex flex-col gap-4 max-w-3xl mx-auto">
                {deferredOrders.length === 0 && counts.unresolved === 0 && (
                  <div className="p-10 text-center text-sm text-gray-400">No exceptions - every order is assigned.</div>
                )}
                {orders.filter(o => assignments[o.orderRef]?.decision === 'unresolved').map(o => (
                  <div key={o.orderRef} className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-900 text-base">{o.orderRef} ({o.outletId})</h4>
                        <p className="text-sm text-gray-600 mt-1">{o.brand} · {o.district} · not yet assigned or deferred.</p>
                      </div>
                      <span className="py-1 px-2 bg-amber-100 text-amber-800 rounded text-[10px] font-bold uppercase mt-2 sm:mt-0 whitespace-nowrap">Needs Decision</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => onManual(o.orderRef)} className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">Assign or Defer</button>
                    </div>
                  </div>
                ))}
                {deferredOrders.map(o => {
                  const a = assignments[o.orderRef];
                  return (
                    <div key={o.orderRef} className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-gray-900 text-base">{o.orderRef} ({o.outletId})</h4>
                          <p className="text-sm text-gray-600 mt-1"><strong>Reason:</strong> {a?.reasonCode}{a?.reasonNote ? ` — ${a.reasonNote}` : ''}</p>
                        </div>
                        <span className="py-1 px-2 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase mt-2 sm:mt-0 whitespace-nowrap">Deferred</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => onManual(o.orderRef)} className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">Review / Reassign</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Details Drawer - real stop sequence + schedule for the selected trip */}
        {selectedTrip && selectedGroup && (
          <div className="w-full lg:w-[420px] bg-white border border-gray-200 rounded-[10px] flex flex-col shadow-xl overflow-hidden shrink-0 animate-in slide-in-from-right-8 duration-300">
            <div className="p-5 border-b border-gray-200 flex justify-between items-start bg-gray-50">
              <div>
                <h3 className="font-black text-xl text-gray-900">Trip {selectedTrip.tripNo}</h3>
                <p className="text-sm font-semibold text-gray-500 mt-0.5">{selectedTrip.vehicleId}</p>
              </div>
              <button onClick={() => setSelectedTrip(null)} className="p-2 -m-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-200 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div>
                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-4">Delivery Sequence</h4>
                {selectedSchedule === null ? (
                  <p className="text-xs text-amber-600 font-semibold">Planned departure time not set yet - no schedule to show. Set it in Review &amp; Release.</p>
                ) : (
                  <div className="relative pl-5 border-l-2 border-gray-200 space-y-5 ml-2">
                    {selectedStops.map((stop, i) => {
                      const sch = selectedSchedule.find(s => s.outletId === stop.outletId);
                      return (
                        <div key={stop.outletId} className="relative">
                          <div className={`absolute -left-[25px] rounded-full w-3 h-3 ring-4 ring-white ${sch?.late ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                          <span className="text-sm font-bold text-gray-900 block">Stop {i + 1}: {stop.outletId}</span>
                          <span className="text-[11px] font-medium text-gray-500 block mt-0.5">Orders: {stop.orderRefs.join(', ')}</span>
                          {sch && (
                            <span className={`text-[11px] block mt-0.5 ${sch.late ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                              arrive {String(Math.floor(sch.arrival / 60)).padStart(2, '0')}:{String(sch.arrival % 60).padStart(2, '0')}{sch.late ? ' — LATE' : ''}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Order Weight / Volume</span>
                <p className="text-sm text-gray-900 mt-1">{selectedGroup.weight.toFixed(1)} kg · {selectedGroup.volume.toFixed(3)} m³</p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Dispatcher Adjustments</h4>
                <button onClick={() => onManual(selectedGroup.orderRefs[0])} className="w-full py-2 px-3 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                  Open in Manual Assignment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ManualAssignmentWorkspace({ onBack, initialSelectedRef }: { onBack: () => void; initialSelectedRef: string | null }) {
  const { orders, assignments, error, deferOrder } = useDispatcherPlan();
  const [selectedRef, setSelectedRef] = useState<string | null>(initialSelectedRef);
  const [queueTab, setQueueTab] = useState<'unresolved' | 'assigned' | 'deferred'>('unresolved');
  const [search, setSearch] = useState('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showDeferDialog, setShowDeferDialog] = useState(false);

  useEffect(() => {
    if (initialSelectedRef) {
      const decision = assignments[initialSelectedRef]?.decision;
      setQueueTab(decision === 'served' ? 'assigned' : decision === 'deferred' ? 'deferred' : 'unresolved');
    }
  }, [initialSelectedRef, assignments]);

  const queueOrders = orders.filter(o => {
    const decision = assignments[o.orderRef]?.decision ?? 'unresolved';
    const tabMatch = queueTab === 'assigned' ? decision === 'served' : queueTab === 'deferred' ? decision === 'deferred' : decision === 'unresolved';
    const searchMatch = !search || o.orderRef.toLowerCase().includes(search.toLowerCase()) || o.outletId.toLowerCase().includes(search.toLowerCase());
    return tabMatch && searchMatch;
  });

  const selectedOrder = selectedRef ? orders.find(o => o.orderRef === selectedRef) : null;
  const selectedAssignment = selectedRef ? assignments[selectedRef] : null;
  const counts = {
    unresolved: orders.filter(o => (assignments[o.orderRef]?.decision ?? 'unresolved') === 'unresolved').length,
    assigned: orders.filter(o => assignments[o.orderRef]?.decision === 'served').length,
    deferred: orders.filter(o => assignments[o.orderRef]?.decision === 'deferred').length,
  };

  return (
    <div className="flex flex-col flex-1 p-4 md:p-10 w-full max-w-[1160px] mx-auto bg-[#F9FAFB] h-full overflow-y-auto">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 px-6 bg-white border border-[#CBD5E1] rounded-t-[10px] gap-4 md:gap-0">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button onClick={onBack} className="mr-2 p-1 text-gray-500 hover:bg-gray-100 rounded">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="font-bold text-lg text-[#202D2D] m-0">Manual Assignment</h1>
          <span className="py-1 px-2 bg-[#FFF4ED] border border-[#F97316] rounded font-semibold text-[11px] text-[#202D2D] uppercase">DISPATCHER WORKFLOW</span>
        </div>
        <Link href="/dispatcher/orders" className="font-medium text-sm text-orange-600 hover:underline">View all orders →</Link>
      </div>

      {error && <div className="py-2.5 px-4 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600 mt-2">{error}</div>}

      {/* 2-Column Split */}
      <div className="flex flex-col md:flex-row flex-1 bg-[#CBD5E1] gap-[1px] border-x border-b border-[#CBD5E1] rounded-b-[10px] overflow-hidden min-h-0 md:min-h-[600px]">

        {/* Left Column - Queue */}
        <div className="w-full md:w-[340px] bg-white flex flex-col p-4 gap-4 flex-shrink-0 h-[300px] md:h-[calc(100vh-170px)] overflow-y-auto">
          <div className="flex flex-row p-1 bg-gray-100 rounded-lg">
            <button onClick={() => setQueueTab('unresolved')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${queueTab === 'unresolved' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              Unresolved ({counts.unresolved})
            </button>
            <button onClick={() => setQueueTab('assigned')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${queueTab === 'assigned' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              Assigned ({counts.assigned})
            </button>
            <button onClick={() => setQueueTab('deferred')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${queueTab === 'deferred' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              Deferred ({counts.deferred})
            </button>
          </div>
          <div className="flex flex-row items-center py-2 px-2.5 gap-2 border border-[#CBD5E1] rounded-md w-full box-border">
            <SearchIcon />
            <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Search orders..." className="border-none outline-none font-sans text-xs text-[#485563] w-full" />
          </div>

          <div className="flex flex-col gap-2">
            {queueOrders.map((q) => {
              const isSelected = selectedRef === q.orderRef;
              return (
                <div key={q.orderRef} onClick={() => setSelectedRef(q.orderRef)} className={`flex flex-col p-3 gap-2 bg-white border rounded-md cursor-pointer transition-all ${isSelected ? 'bg-[#FFF4ED] border-[#F97316] shadow-sm' : 'border-[#CBD5E1] hover:border-gray-400'}`}>
                  <div className="flex flex-row justify-between items-center">
                    <span className="font-bold text-[13px] text-[#202D2D]">{q.orderRef}</span>
                    <span className={`py-0.5 px-1.5 rounded font-semibold text-[10px] uppercase ${q.brand === 'Fresh' ? 'bg-[#ECFDF5] text-[#10B981]' : q.brand === 'Style' ? 'bg-[#FFF4ED] border border-[#F97316] text-[#F97316]' : 'bg-[#F3E8FF] text-[#8B5CF6]'}`}>{q.brand}</span>
                  </div>
                  <h3 className="font-semibold text-xs text-[#485563] m-0 line-clamp-1">{q.outletId} · {q.district}</h3>
                  <div className="flex flex-row items-center gap-2 font-medium text-[11px] text-[#485563]">
                    {q.tempRequirement === 'chilled' ? <SnowflakeIcon /> : <SunIcon />}
                    {q.orderWeightKg.toFixed(1)} kg / {q.orderVolumeM3.toFixed(3)} m³
                  </div>
                </div>
              );
            })}
            {queueOrders.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm font-medium">No orders in this queue.</div>
            )}
          </div>
        </div>

        {/* Right Column - Order Details */}
        <div className="flex-1 bg-white flex flex-col p-4 md:p-8 overflow-y-auto h-auto md:h-[calc(100vh-170px)] relative">
          {selectedOrder ? (
            <div className="flex flex-col max-w-[800px] w-full mx-auto pb-10 md:pb-20">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-5 mb-5 gap-4 sm:gap-0">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <h2 className="font-bold text-xl md:text-2xl text-[#202D2D] m-0">Order {selectedOrder.orderRef}</h2>
                    <span className="py-1 px-2 bg-blue-50 text-blue-600 border border-blue-200 rounded font-semibold text-[11px] uppercase">
                      {selectedAssignment?.decision === 'served' ? `Assigned - ${selectedAssignment.vehicleId} Trip ${selectedAssignment.tripNo}` : selectedAssignment?.decision === 'deferred' ? 'Deferred' : 'Unresolved'}
                    </span>
                  </div>
                  <p className="font-medium text-sm text-[#485563] m-0">{selectedOrder.outletId} · {selectedOrder.district}</p>
                </div>
                <span className={`py-1 px-3 rounded font-bold text-xs uppercase ${selectedOrder.brand === 'Fresh' ? 'bg-[#ECFDF5] text-[#10B981]' : selectedOrder.brand === 'Style' ? 'bg-[#FFF4ED] border border-[#F97316] text-[#F97316]' : 'bg-[#F3E8FF] text-[#8B5CF6]'}`}>
                  {selectedOrder.brand.toUpperCase()} BRAND
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="flex flex-col p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="font-semibold text-[11px] text-gray-500 uppercase mb-1">OUTLET</span>
                  <span className="font-bold text-sm text-gray-900">{selectedOrder.outletId}</span>
                </div>
                <div className="flex flex-col p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="font-semibold text-[11px] text-gray-500 uppercase mb-1">RUN DATE</span>
                  <span className="font-bold text-sm text-gray-900">{selectedOrder.runDate || (selectedOrder.createdAt ? selectedOrder.createdAt.slice(0, 10) : '—')}</span>
                </div>
                <div className="flex flex-col p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="font-semibold text-[11px] text-gray-500 uppercase mb-1">TOTAL WEIGHT</span>
                  <span className="font-bold text-sm text-gray-900">{selectedOrder.orderWeightKg.toFixed(1)} kg</span>
                </div>
                <div className="flex flex-col p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="font-semibold text-[11px] text-gray-500 uppercase mb-1">TEMP ZONE</span>
                  <span className={`font-bold text-sm ${selectedOrder.tempRequirement === 'chilled' ? 'text-green-600' : 'text-amber-500'}`}>
                    {selectedOrder.tempRequirement === 'chilled' ? 'Chilled' : 'Ambient'}
                  </span>
                </div>
              </div>

              {selectedOrder.parkingConstraint === 'van_only' && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-8">
                  <AlertIcon />
                  <span className="font-medium text-sm text-amber-800"><strong>Constraint:</strong> van-only outlet access.</span>
                </div>
              )}

              {selectedAssignment?.decision === 'deferred' && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-8 text-sm text-gray-700">
                  <strong>Deferral reason:</strong> {selectedAssignment.reasonCode}{selectedAssignment.reasonNote ? ` — ${selectedAssignment.reasonNote}` : ''}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 mt-auto pt-4 border-t border-gray-200">
                <button onClick={() => setShowAssignDialog(true)} className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 rounded-lg font-semibold text-sm text-white transition-colors flex justify-center items-center gap-2">
                  {selectedAssignment?.decision === 'served' ? 'Change Vehicle / Trip' : 'Assign to Vehicle'}
                </button>
                <button onClick={() => setShowDeferDialog(true)} className="flex-1 py-3 px-4 bg-white border-2 border-gray-300 hover:border-gray-400 rounded-lg font-semibold text-sm text-gray-700 transition-colors flex justify-center items-center">
                  Defer Order
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">No Order Selected</h3>
              <p className="text-sm text-gray-500">Select an order from the queue on the left to view details and assign or defer it.</p>
            </div>
          )}
        </div>
      </div>

      {showAssignDialog && selectedRef && (
        <ReassignDialog
          orderRef={selectedRef}
          onCancel={() => setShowAssignDialog(false)}
          onDone={() => setShowAssignDialog(false)}
          onOpenDefer={() => setShowDeferDialog(true)}
        />
      )}
      {showDeferDialog && selectedRef && (
        <DeferDialog
          orderRef={selectedRef}
          onCancel={() => setShowDeferDialog(false)}
          onConfirm={async (reasonCode: DeferReasonCode, note: string) => {
            const ok = await deferOrder(selectedRef, reasonCode, note);
            if (ok) setShowDeferDialog(false);
          }}
        />
      )}
    </div>
  );
}
