'use client';

import React, { useState } from 'react';
import { useDispatcherPlan } from './store/PlanningContext';
import type { DeferReasonCode } from './types';

const AlertIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const DotIcon = () => <svg width="9" height="9" viewBox="0 0 9 9"><circle cx="4.5" cy="4.5" r="4.5" fill="currentColor" /></svg>;

// Illustrative vehicle status rows for the S1 fleet — no live telemetry backend
// exists, so these are clearly-labeled simulated events over real VEH### ids,
// not a fabricated live GPS feed.
const SIMULATED_TRIPS: { vehicle: string; district: string; status: 'Loading' | 'In Transit' | 'Departed' | 'Awaiting'; lastUpdate: string; issue?: string }[] = [
  { vehicle: 'VEH036', district: 'Colombo', status: 'Loading', lastUpdate: '06:15' },
  { vehicle: 'VEH008', district: 'Kurunegala', status: 'Departed', lastUpdate: '05:30' },
  { vehicle: 'VEH003', district: 'Galle', status: 'Departed', lastUpdate: '05:15' },
  { vehicle: 'VEH013', district: 'Kalutara', status: 'Loading', lastUpdate: '06:20' },
  { vehicle: 'VEH009', district: 'Gampaha', status: 'In Transit', lastUpdate: '06:45', issue: 'Loading shortfall reported (simulated)' },
];

const STATUS_STYLE: Record<string, string> = {
  Loading: 'bg-gray-100 text-gray-700',
  'In Transit': 'bg-amber-100 text-amber-700',
  Departed: 'bg-blue-100 text-blue-700',
  Awaiting: 'bg-red-100 text-red-700',
};

// Real order/outlet pairing from the S1 dataset (S1-023 -> OUT022, Tech, Colombo,
// mall_bay) used purely as an illustrative example for this simulated panel.
const SHORTFALL_ORDER_REF = 'S1-023';
const SHORTFALL_OUTLET_ID = 'OUT022';

type Resolution = 'replace' | 'defer' | null;

export default function LiveOperations() {
  const { orders, assignments, planChecklist, planVersion, publishPlan, deferOrder } = useDispatcherPlan();
  const [resolution, setResolution] = useState<Resolution>(null);
  const [revalidateResult, setRevalidateResult] = useState<string | null>(null);
  const [notifyResult, setNotifyResult] = useState(false);
  const [resolvedNote, setResolvedNote] = useState<string | null>(null);

  const shortfallOrder = orders.find(o => o.orderRef === SHORTFALL_ORDER_REF);
  const shortfallDecision = assignments[SHORTFALL_ORDER_REF]?.decision ?? 'unresolved';

  function handleRevalidate() {
    const fails = planChecklist.filter(r => r.kind === 'checker_fail');
    setRevalidateResult(fails.length === 0
      ? 'Revalidated against current plan state: all checker rules pass.'
      : `Revalidated against current plan state: ${fails.length} checker rule(s) failing - ${fails.map(f => f.label).join(', ')}.`);
    setNotifyResult(false);
  }

  function handlePublish() {
    publishPlan();
    setResolvedNote(`Published locally as Plan v${planVersion + 1} (session-local demo, no server release).`);
    setNotifyResult(false);
  }

  function handleNotify() {
    setNotifyResult(true);
  }

  function handleReplaceFromStock() {
    setResolution('replace');
    setResolvedNote('Marked as "replace from available stock" — this is a UI acknowledgement only; no stock/inventory system exists to actually reserve or issue replacement stock.');
  }

  function handleDeferShortfall(reasonCode: DeferReasonCode) {
    if (!shortfallOrder) return;
    deferOrder(shortfallOrder.orderRef, reasonCode, 'Loading shortfall - deferred to next run (Live Operations panel)');
    setResolution('defer');
    setResolvedNote(`${shortfallOrder.orderRef} deferred with a real ledger entry - check Decision Ledger.`);
  }

  return (
    <div className="flex flex-col flex-1 p-6 md:p-10 gap-6 w-full max-w-[1300px] mx-auto bg-[#F9FAFB] font-sans">

      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="font-bold text-[28px] text-[#202D2D] leading-[36px] m-0">Live Operations</h1>
          <span className="py-1 px-2 bg-[#FFF4ED] border border-[#F97316] rounded font-semibold text-[11px] text-[#F97316] uppercase">S1 Peak Day · Plan v{planVersion}</span>
        </div>
        <p className="text-sm text-[#485563] m-0">Vehicle/trip status below is a simulated prototype event feed — no live telemetry backend exists.</p>
      </div>

      {/* Trips Table */}
      <div className="bg-white border border-[#CBD5E1] rounded-[10px] overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead className="bg-[#F9FAFB] border-b border-[#CBD5E1]">
            <tr>
              <th className="py-3.5 px-5 font-bold text-[11px] text-[#485563] uppercase">Vehicle</th>
              <th className="py-3.5 px-5 font-bold text-[11px] text-[#485563] uppercase">Trip · District</th>
              <th className="py-3.5 px-5 font-bold text-[11px] text-[#485563] uppercase">Status</th>
              <th className="py-3.5 px-5 font-bold text-[11px] text-[#485563] uppercase">Last Update</th>
              <th className="py-3.5 px-5 font-bold text-[11px] text-[#485563] uppercase">Issues</th>
            </tr>
          </thead>
          <tbody>
            {SIMULATED_TRIPS.map((t, i) => (
              <tr key={i} className={`border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC] ${t.issue ? 'bg-[#FFF9F2]' : ''}`}>
                <td className="py-3.5 px-5 font-bold text-sm text-[#202D2D]">{t.vehicle}</td>
                <td className="py-3.5 px-5 text-sm text-[#485563]">Trip 1 | {t.district}</td>
                <td className="py-3.5 px-5"><span className={`py-1 px-2.5 rounded font-semibold text-xs ${STATUS_STYLE[t.status]}`}>{t.status}</span></td>
                <td className="py-3.5 px-5 text-sm text-[#485563]">{t.lastUpdate}</td>
                <td className="py-3.5 px-5 text-sm">
                  {t.issue ? <span className="flex items-center gap-1.5 text-amber-600 font-medium"><AlertIcon /> {t.issue}</span> : <span className="text-gray-400">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Loading Shortfall Resolution Panel — real order lookup, real defer action */}
      <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="font-bold text-[16px] text-[#202D2D] m-0">Loading-shortfall resolution (simulated event)</h2>
            <p className="text-sm text-[#485563] m-0 mt-1">Illustrative example over real order {SHORTFALL_ORDER_REF} · outlet {SHORTFALL_OUTLET_ID}</p>
          </div>
          <span className={`py-1.5 px-3 rounded font-bold text-xs uppercase ${shortfallDecision !== 'unresolved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {shortfallDecision !== 'unresolved' ? `Resolved (${shortfallDecision})` : 'HOLD - awaiting Dispatcher decision'}
          </span>
        </div>

        {shortfallOrder ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-[11px] text-gray-500 uppercase">Affected Order</span>
              <span className="font-bold text-sm text-gray-900">{shortfallOrder.orderRef}, {shortfallOrder.outletId} ({shortfallOrder.brand}, {shortfallOrder.district})</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-[11px] text-gray-500 uppercase">Reported Issue (simulated)</span>
              <span className="font-bold text-sm text-gray-900">Loading shortfall — no stock/lot system exists to report a real quantity mismatch, so this is illustrative only.</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-red-600">Order {SHORTFALL_ORDER_REF} not found in the current dataset.</p>
        )}

        <div className="flex flex-col gap-2">
          <span className="font-semibold text-[11px] text-gray-500 uppercase">Resolution Options</span>
          <button
            onClick={handleReplaceFromStock}
            className={`flex items-center gap-3 p-3.5 rounded-lg border text-left transition-colors ${resolution === 'replace' ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200 text-gray-800 hover:border-gray-300'}`}
          >
            <span className={resolution === 'replace' ? 'text-white' : 'text-gray-300'}><DotIcon /></span>
            <span className="font-semibold text-sm">Replace from available stock (UI acknowledgement only — no inventory system)</span>
          </button>
          <button
            onClick={() => handleDeferShortfall('capacity')}
            className={`flex items-center gap-3 p-3.5 rounded-lg border text-left transition-colors ${resolution === 'defer' ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200 text-gray-800 hover:border-gray-300'}`}
          >
            <span className={resolution === 'defer' ? 'text-white' : 'text-gray-300'}><DotIcon /></span>
            <span className="font-semibold text-sm">Defer whole order to next run (real action — writes to Decision Ledger)</span>
          </button>
          {resolvedNote && <p className="text-xs text-gray-500 italic mt-1">{resolvedNote}</p>}
        </div>

        <div className="flex flex-col gap-2 pt-4 border-t border-gray-200">
          <span className="font-semibold text-[11px] text-gray-500 uppercase">After Resolution — each action behaves distinctly</span>
          <div className="flex flex-row gap-3 flex-wrap">
            <button onClick={handleRevalidate} className="py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-xs text-gray-700 transition-colors">
              Revalidate constraints
            </button>
            <button onClick={handlePublish} className="py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-xs text-gray-700 transition-colors">
              Publish Plan v{planVersion + 1} (local demo)
            </button>
            <button onClick={handleNotify} className="py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-xs text-gray-700 transition-colors">
              Notify Loader and Driver
            </button>
          </div>
          {revalidateResult && <p className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2.5">{revalidateResult}</p>}
          {notifyResult && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">Simulated — no backend exists to actually notify a loader or driver. No message was sent.</p>}
        </div>
      </div>
    </div>
  );
}
