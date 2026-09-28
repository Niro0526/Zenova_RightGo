'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Search, X, CheckCircle, Clock, Truck, Activity, ArrowRight, ShieldAlert, Check, RefreshCw } from 'lucide-react';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';
import type { DecisionLedgerAction, DeferReasonCode } from '@/types/dispatcher';
import Drawer from '@/components/common/Drawer';

// Demo seeded execution trips — clearly labeled as simulated telemetry
const DEMO_SIMULATED_TRIPS: {
  vehicle: string; tripNo: number; district: string; brand: string;
  status: 'Loading' | 'In Transit' | 'Awaiting' | 'Completed';
  completedStops: number; totalStops: number;
  lastUpdate: string; freshness: string; issue?: string;
}[] = [
  { vehicle: 'VEH036', tripNo: 1, district: 'Colombo', brand: 'Fresh', status: 'Loading', completedStops: 0, totalStops: 5, lastUpdate: '06:15', freshness: '5m ago' },
  { vehicle: 'VEH008', tripNo: 1, district: 'Kurunegala', brand: 'Fresh', status: 'In Transit', completedStops: 2, totalStops: 6, lastUpdate: '05:30', freshness: '50m ago' },
  { vehicle: 'VEH003', tripNo: 1, district: 'Galle', brand: 'Fresh', status: 'In Transit', completedStops: 3, totalStops: 5, lastUpdate: '06:05', freshness: '15m ago' },
  { vehicle: 'VEH013', tripNo: 1, district: 'Kalutara', brand: 'Fresh', status: 'Loading', completedStops: 0, totalStops: 4, lastUpdate: '06:20', freshness: 'just now' },
  { vehicle: 'VEH009', tripNo: 1, district: 'Gampaha', brand: 'Fresh', status: 'In Transit', completedStops: 1, totalStops: 4, lastUpdate: '06:45', freshness: 'just now', issue: 'Loading shortfall reported on S1-023' },
  { vehicle: 'VEH036', tripNo: 2, district: 'Colombo', brand: 'Tech', status: 'Awaiting', completedStops: 0, totalStops: 3, lastUpdate: '06:00', freshness: '20m ago' },
  { vehicle: 'VEH003', tripNo: 2, district: 'Gampaha', brand: 'Fresh', status: 'Completed', completedStops: 4, totalStops: 4, lastUpdate: '04:45', freshness: '1h ago' },
];

const STATUS_STYLE: Record<string, { badge: string; dot: string }> = {
  Loading: { badge: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-500' },
  'In Transit': { badge: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500' },
  Awaiting: { badge: 'bg-gray-100 text-gray-600 border border-gray-200', dot: 'bg-gray-400' },
  Completed: { badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
};

const ACTION_STYLE: Record<DecisionLedgerAction, string> = {
  deferred: 'text-[#F97316] bg-[#FFF4ED]',
  reassigned: 'text-[#10B981] bg-[#ECFDF5]',
  assigned: 'text-[#485563] bg-[#F8FAFC]',
  published: 'text-blue-600 bg-blue-50',
  resequenced: 'text-purple-600 bg-purple-50',
};

const ACTION_LABEL: Record<DecisionLedgerAction, string> = {
  deferred: 'Deferred',
  reassigned: 'Reassigned',
  assigned: 'Assigned',
  published: 'Plan released',
  resequenced: 'Resequenced',
};

const SHORTFALL_ORDER_REF = 'S1-023';

type Tab = 'active' | 'issues' | 'completed' | 'activity';

export default function LiveOperations() {
  const router = useRouter();
  const {
    orders, assignments, planChecklist, draftRevision, releasedManifests,
    publishPlan, deferOrder, shortfallEvents, reportShortfall,
    setShortfallResolution, acknowledgeManifest, ledger, counts,
  } = useDispatcherPlan();

  const lastManifest = releasedManifests[releasedManifests.length - 1];
  const isReleased = !!lastManifest;
  const hasEligibleRevision = isReleased && draftRevision > lastManifest.revision;

  // Mode: Current Run (based on actual frontend released plan) vs Demo Execution
  const [viewMode, setViewMode] = useState<'current' | 'demo'>(isReleased ? 'current' : 'demo');
  const [tab, setTab] = useState<Tab>('active');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerActionFilter, setLedgerActionFilter] = useState<DecisionLedgerAction | 'all'>('all');
  const [selectedTrip, setSelectedTrip] = useState<typeof DEMO_SIMULATED_TRIPS[0] | null>(null);
  const [expandedIssue, setExpandedIssue] = useState(true);
  const [ledgerDrawerEntry, setLedgerDrawerEntry] = useState<typeof ledger[0] | null>(null);

  const shortfallOrder = orders.find(o => o.orderRef === SHORTFALL_ORDER_REF);
  const activeEvent = shortfallEvents.find(e => e.orderRef === SHORTFALL_ORDER_REF);

  const activeTrips = DEMO_SIMULATED_TRIPS.filter(t => t.status !== 'Completed');
  const issueTrips = DEMO_SIMULATED_TRIPS.filter(t => t.issue);
  const completedTrips = DEMO_SIMULATED_TRIPS.filter(t => t.status === 'Completed');

  const filteredActivity = useMemo(() => {
    let list = ledger;
    if (ledgerActionFilter !== 'all') list = list.filter(e => e.action === ledgerActionFilter);
    if (ledgerSearch.trim()) {
      const q = ledgerSearch.trim().toLowerCase();
      list = list.filter(e => e.orderRef.toLowerCase().includes(q) || e.outletId.toLowerCase().includes(q));
    }
    return list;
  }, [ledger, ledgerActionFilter, ledgerSearch]);

  function handleReplaceFromStock() {
    if (!activeEvent) return;
    setShortfallResolution(activeEvent.id, 'replace', 'Replaced from depot safety stock — delivery manifest updated.');
  }

  function handleDeferShortfall() {
    if (!shortfallOrder || !activeEvent) return;
    deferOrder(shortfallOrder.orderRef, 'capacity', 'Loading shortfall — deferred to next dispatch cycle');
    setShortfallResolution(activeEvent.id, 'defer', `${shortfallOrder.orderRef} deferred — logged to Decision Ledger.`);
  }

  const statusCounts = {
    active: activeTrips.length,
    issues: issueTrips.length,
    completed: completedTrips.length,
    activity: ledger.length,
  };

  const tabs: { id: Tab; label: string; count: number; icon: React.ReactNode }[] = [
    { id: 'active', label: 'Active Trips', count: statusCounts.active, icon: <Truck size={14} /> },
    { id: 'issues', label: 'Exceptions & Issues', count: statusCounts.issues, icon: <AlertTriangle size={14} /> },
    { id: 'completed', label: 'Completed', count: statusCounts.completed, icon: <CheckCircle size={14} /> },
    { id: 'activity', label: 'Activity Ledger', count: statusCounts.activity, icon: <Activity size={14} /> },
  ];

  return (
    <div className="flex flex-col flex-1 p-6 md:p-8 gap-5 w-full max-w-[1200px] mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] md:text-[24px] font-bold text-[#202D2D] m-0 tracking-tight">Operations</h1>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
              isReleased
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {isReleased ? `Released v${lastManifest.revision}` : 'Draft Phase'}
            </span>
          </div>
          <p className="text-sm text-[#64748B] m-0 mt-0.5">
            {isReleased
              ? `Manifest v${lastManifest.revision} in effect · Execution tracking`
              : 'No manifest released yet for this session'}
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Mode Switch: Current Run vs Demo Execution */}
          <div className="flex rounded-lg border border-[#CBD5E1] p-0.5 bg-[#F8FAFC]">
            <button
              onClick={() => setViewMode('current')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'current'
                  ? 'bg-white text-[#202D2D] shadow-xs'
                  : 'text-[#64748B] hover:text-[#202D2D]'
              }`}
            >
              Current Run
            </button>
            <button
              onClick={() => setViewMode('demo')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'demo'
                  ? 'bg-white text-[#202D2D] shadow-xs'
                  : 'text-[#64748B] hover:text-[#202D2D]'
              }`}
            >
              Demo Execution
            </button>
          </div>

          {/* Action buttons */}
          {hasEligibleRevision && (
            <button
              onClick={() => publishPlan()}
              className="flex items-center gap-1.5 rounded-lg bg-[#F97316] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#EA580C] transition-colors shadow-xs"
            >
              <RefreshCw size={13} />
              Release updated plan (v{draftRevision})
            </button>
          )}

          {!isReleased && viewMode === 'current' && (
            <Link
              href="/dispatcher/planning"
              className="flex items-center gap-1.5 rounded-lg bg-[#F97316] px-3.5 py-2 text-xs font-semibold text-white no-underline hover:bg-[#EA580C] transition-colors shadow-xs"
            >
              Go to Planning
              <ArrowRight size={13} />
            </Link>
          )}
        </div>
      </div>

      {/* When viewMode === 'current' and NO manifest is released */}
      {viewMode === 'current' && !isReleased ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-[#E2E8F0] shadow-sm text-center gap-3">
          <div className="h-12 w-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Clock size={24} />
          </div>
          <h2 className="text-base font-bold text-[#202D2D] m-0">No manifest released yet</h2>
          <p className="text-xs text-[#64748B] max-w-md m-0">
            Trip dispatch manifests must be confirmed and released from the Planning workspace before active driver execution commences.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Link
              href="/dispatcher/planning"
              className="px-4 py-2 rounded-lg bg-[#F97316] text-white text-xs font-semibold hover:bg-[#EA580C] transition-colors no-underline shadow-xs"
            >
              Open Planning workspace
            </Link>
            <button
              onClick={() => setViewMode('demo')}
              className="px-4 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold text-[#485563] hover:bg-[#F8FAFC] transition-colors"
            >
              View demo execution
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Demo Execution Disclosure Badge */}
          {viewMode === 'demo' && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-blue-200 bg-[#EFF6FF] text-xs text-blue-900">
              <span className="font-medium">
                Showing <strong>Demo Execution</strong> with seeded vehicle telemetry and loading exceptions.
              </span>
              <span className="text-[11px] font-semibold text-blue-700 bg-white/80 px-2 py-0.5 rounded border border-blue-200">
                Simulated Events
              </span>
            </div>
          )}

          {/* White Summary Cards with small colored indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Loading / Awaiting', value: DEMO_SIMULATED_TRIPS.filter(t => t.status === 'Loading' || t.status === 'Awaiting').length, dot: 'bg-blue-500' },
              { label: 'In Transit', value: DEMO_SIMULATED_TRIPS.filter(t => t.status === 'In Transit').length, dot: 'bg-amber-500' },
              { label: 'Completed', value: completedTrips.length, dot: 'bg-emerald-500' },
              { label: 'Open Issues', value: issueTrips.length, dot: issueTrips.length > 0 ? 'bg-red-500' : 'bg-gray-400' },
            ].map(s => (
              <div key={s.label} className="flex flex-col rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  <span className="text-xs font-medium text-[#64748B]">{s.label}</span>
                </div>
                <span className="text-[26px] font-bold text-[#202D2D] leading-tight mt-1 tabular-nums">{s.value}</span>
              </div>
            ))}
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1 border-b border-[#E2E8F0]">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-[#F97316] text-[#F97316]'
                    : 'border-transparent text-[#64748B] hover:text-[#202D2D]'
                }`}
              >
                {t.icon}
                {t.label}
                {t.count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums ${
                    tab === t.id ? 'bg-[#F97316] text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content: Active & Completed Trips */}
          {(tab === 'active' || tab === 'completed') && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider">Vehicle / Trip</th>
                      <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider">District / Brand</th>
                      <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider">Progress</th>
                      <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider">Status</th>
                      <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider">Last Update</th>
                      <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider">Issue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {(tab === 'active' ? activeTrips : completedTrips).map((t, i) => {
                      const styles = STATUS_STYLE[t.status] ?? STATUS_STYLE.Awaiting;
                      const progressPct = Math.round((t.completedStops / t.totalStops) * 100);
                      return (
                        <tr
                          key={i}
                          onClick={() => setSelectedTrip(t)}
                          className={`cursor-pointer transition-colors ${
                            t.issue ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-[#F8FAFC]'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <span className="font-bold text-xs text-[#202D2D]">{t.vehicle}</span>
                            <span className="ml-1.5 text-xs text-[#64748B]">Trip {t.tripNo}</span>
                          </td>
                          <td className="py-3 px-4 text-xs text-[#485563]">
                            {t.district} · <span className="font-medium text-[#202D2D]">{t.brand}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#F97316] rounded-full" style={{ width: `${progressPct}%` }} />
                              </div>
                              <span className="text-[11px] text-[#64748B] tabular-nums">
                                {t.completedStops}/{t.totalStops} stops
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles.badge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-[#64748B] tabular-nums">
                            {t.lastUpdate} <span className="text-[10px] text-[#94A3B8]">({t.freshness})</span>
                          </td>
                          <td className="py-3 px-4">
                            {t.issue ? (
                              <span className="inline-flex items-center gap-1 text-amber-700 text-xs font-medium">
                                <AlertTriangle size={13} className="text-amber-500" />
                                {t.issue}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab Content: Issues & Exceptions */}
          {tab === 'issues' && (
            <div className="flex flex-col gap-4">
              <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-[#F1F5F9] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={18} className="text-amber-500" />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#202D2D] m-0">
                        Active Loading Exceptions
                      </h3>
                      <p className="text-[11px] text-[#64748B] m-0">
                        Order discrepancies reported from loading bay
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                    1 Action Required
                  </span>
                </div>

                {/* Shortfall Resolution Card */}
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-[#FFFBEB] border border-amber-200">
                    <div>
                      <div className="text-xs font-bold text-amber-900">
                        Loading Shortfall: Order {SHORTFALL_ORDER_REF}
                        {shortfallOrder && ` · ${shortfallOrder.outletId}`}
                      </div>
                      <div className="text-[11px] text-amber-800 mt-0.5">
                        Warehouse bay reported missing SKU box on VEH009 (Gampaha). Select resolution to balance manifest.
                      </div>
                    </div>
                    {activeEvent?.resolution ? (
                      <span className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 flex items-center gap-1">
                        <Check size={13} /> {activeEvent.resolution === 'replace' ? 'Stock replacement confirmed' : 'Order deferred'}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={handleReplaceFromStock}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                        >
                          Replace from stock
                        </button>
                        <button
                          onClick={handleDeferShortfall}
                          className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-amber-900 hover:bg-amber-50 transition-colors"
                        >
                          Defer order
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Activity Ledger */}
          {tab === 'activity' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2.5 bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-sm">
                <div className="flex items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 w-full sm:w-[260px]">
                  <Search size={13} className="text-[#94A3B8]" />
                  <input
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    placeholder="Search ledger entries"
                    className="border-none outline-none text-xs text-[#202D2D] w-full bg-transparent placeholder-[#94A3B8]"
                  />
                  {ledgerSearch && <button onClick={() => setLedgerSearch('')}><X size={13} /></button>}
                </div>

                <select
                  value={ledgerActionFilter}
                  onChange={(e) => setLedgerActionFilter(e.target.value as any)}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs text-[#485563] outline-none"
                >
                  <option value="all">All actions</option>
                  <option value="assigned">Assigned</option>
                  <option value="deferred">Deferred</option>
                  <option value="reassigned">Reassigned</option>
                  <option value="published">Plan released</option>
                </select>

                <span className="text-xs text-[#64748B] ml-auto tabular-nums">
                  {filteredActivity.length} logged events
                </span>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
                {filteredActivity.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#94A3B8]">No ledger activity matching this filter.</div>
                ) : (
                  <div className="divide-y divide-[#F1F5F9]">
                    {filteredActivity.map((entry) => (
                      <div
                        key={entry.id}
                        onClick={() => setLedgerDrawerEntry(entry)}
                        className="flex items-center justify-between p-3.5 hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ACTION_STYLE[entry.action]}`}>
                            {ACTION_LABEL[entry.action]}
                          </span>
                          <span className="text-xs font-semibold text-[#202D2D]">{entry.orderRef}</span>
                          <span className="text-xs text-[#64748B]">· {entry.outletId}</span>
                          <span className="text-xs text-[#485563] hidden sm:inline">{entry.reasonNote || entry.reasonCode}</span>
                        </div>
                        <span className="text-xs text-[#94A3B8] tabular-nums flex-shrink-0">{entry.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Selected Trip Details Drawer */}
      <Drawer
        open={!!selectedTrip}
        onClose={() => setSelectedTrip(null)}
        title={selectedTrip ? `${selectedTrip.vehicle} · Trip ${selectedTrip.tripNo}` : 'Trip Details'}
      >
        {selectedTrip && (
          <div className="flex flex-col gap-4 p-5 text-sm">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-[#64748B]">District / Brand</span>
              <span className="font-semibold text-[#202D2D]">{selectedTrip.district} · {selectedTrip.brand}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-[#64748B]">Status</span>
              <span className="font-semibold text-[#202D2D]">{selectedTrip.status}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-[#64748B]">Progress</span>
              <span className="font-semibold text-[#202D2D] tabular-nums">
                {selectedTrip.completedStops} of {selectedTrip.totalStops} stops completed
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-[#64748B]">Last Update</span>
              <span className="font-semibold text-[#202D2D] tabular-nums">{selectedTrip.lastUpdate} ({selectedTrip.freshness})</span>
            </div>
            {selectedTrip.issue && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <strong>Exception:</strong> {selectedTrip.issue}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Ledger Entry Detail Drawer */}
      <Drawer
        open={!!ledgerDrawerEntry}
        onClose={() => setLedgerDrawerEntry(null)}
        title={ledgerDrawerEntry ? `Audit: ${ledgerDrawerEntry.orderRef}` : 'Ledger Details'}
      >
        {ledgerDrawerEntry && (
          <div className="flex flex-col gap-4 p-5 text-sm">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-[#64748B]">Action</span>
              <span className="font-bold text-[#F97316]">{ACTION_LABEL[ledgerDrawerEntry.action]}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-[#64748B]">Order Reference</span>
              <span className="font-semibold text-[#202D2D]">{ledgerDrawerEntry.orderRef}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-[#64748B]">Outlet</span>
              <span className="font-semibold text-[#202D2D]">{ledgerDrawerEntry.outletId}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-[#64748B]">Timestamp</span>
              <span className="font-semibold text-[#202D2D] tabular-nums">{ledgerDrawerEntry.time}</span>
            </div>
            <div className="flex flex-col gap-1 pb-3">
              <span className="text-[#64748B]">Operational Justification</span>
              <span className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#202D2D] leading-relaxed">
                {ledgerDrawerEntry.reasonNote || ledgerDrawerEntry.reasonCode || 'No specific reason logged.'}
              </span>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
