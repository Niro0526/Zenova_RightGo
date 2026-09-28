'use client';

import React from 'react';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';

const CheckIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const WarnIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const GapIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;

export default function PlanReview() {
  const { orders, assignments, counts, planChecklist, planVersion, published, publishPlan } = useDispatcherPlan();
  const canRelease = counts.unresolved === 0;

  const anyCheckerFail = planChecklist.some(r => r.kind === 'checker_fail');
  const deferredOrders = orders.filter(o => assignments[o.orderRef]?.decision === 'deferred');
  const priorityReview = deferredOrders.filter(o => o.deferredYesterday || o.daysSinceLastServed >= 4);

  return (
    <div className="flex flex-col flex-1 p-6 md:p-10 gap-6 w-full max-w-[1300px] mx-auto bg-[#F9FAFB] font-sans">

      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="font-bold text-[28px] text-[#202D2D] leading-[36px] m-0">Plan Review &amp; Release</h1>
          <span className="font-medium text-sm text-[#485563]">S1 Peak Day · Plan v{planVersion}{published ? ' (published, local demo)' : ' (draft)'}</span>
        </div>
        <span className="text-xs text-[#485563]">Status: <span className="text-[#F97316] font-semibold">Live S1 Scenario Validation</span> — computed from the current session's Planning state, not a static checklist.</span>
      </div>

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
        {/* Validation Checklist — computed live from validatePlan(), never a static array */}
        <div className="flex-1 flex flex-col gap-4 bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-bold text-[16px] text-[#202D2D] m-0">S1 Scenario Validation</h2>
          <div className="flex flex-col gap-2.5">
            {planChecklist.map((r, i) => (
              <div key={i} className="flex items-start gap-2.5">
                {r.kind === 'checker_pass' && <CheckIcon />}
                {r.kind === 'checker_fail' && <WarnIcon />}
                {r.kind === 'policy_gap' && <GapIcon />}
                <div className="flex flex-col">
                  <span className={`text-sm ${r.kind === 'checker_fail' ? 'text-red-700 font-semibold' : r.kind === 'policy_gap' ? 'text-gray-500' : 'text-[#202D2D]'}`}>{r.label}</span>
                  {r.kind !== 'checker_pass' && <span className="text-xs text-gray-500">{r.detail}</span>}
                </div>
              </div>
            ))}
          </div>

          <button
            disabled={!canRelease}
            onClick={publishPlan}
            className={`mt-4 py-3 px-6 rounded-lg font-semibold text-sm text-white transition-colors ${canRelease ? 'bg-orange-500 hover:bg-orange-600 cursor-pointer' : 'bg-[#94A3B8] cursor-not-allowed'}`}
          >
            {published ? `Republish (Plan v${planVersion} → v${planVersion + 1}, local demo)` : 'Release Plan (Local Demo)'}
          </button>
          {!canRelease && (
            <div className="py-2.5 px-4 bg-[#FEF2F2] border border-red-200 rounded-lg text-xs font-semibold text-red-600">
              {counts.unresolved} unresolved orders must be assigned or deferred before release
            </div>
          )}
          <p className="text-[11px] text-gray-400 italic">No server-side release exists — this only updates session-local plan state and appends a Decision Ledger entry.</p>
        </div>

        {/* Deferred orders reflect real deferrals made in Planning this session */}
        <div className="flex-1 flex flex-col gap-4">
          {anyCheckerFail && (
            <div className="flex items-start gap-3 p-4 bg-[#FEF2F2] border border-red-300 rounded-lg">
              <WarnIcon />
              <span className="text-sm font-semibold text-red-700">
                One or more checker rules currently fail against the live plan state — review the checklist before releasing.
              </span>
            </div>
          )}
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
    </div>
  );
}
