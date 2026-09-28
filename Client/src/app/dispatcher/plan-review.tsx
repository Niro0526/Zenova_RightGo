'use client';

import React from 'react';
import DispatcherSidebar from '@/components/dispatcher/DispatcherSidebar';
import { ORDER_COUNTS, DEFERRED_ORDERS } from './data';

const CheckIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const WarnIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;

const VALIDATION_RULES: { label: string; ok: boolean }[] = [
  { label: `Every order has an explicit decision (${ORDER_COUNTS.assigned + ORDER_COUNTS.deferred} of ${ORDER_COUNTS.total} - ${ORDER_COUNTS.unresolved} UNRESOLVED)`, ok: true },
  { label: 'Every served order has eligible vehicle and trip', ok: true },
  { label: `Deferred orders have documented reasons (${DEFERRED_ORDERS.length}/${DEFERRED_ORDERS.length})`, ok: true },
  { label: 'Original Task 2B orders remain whole - no split orders', ok: true },
  { label: 'Vehicle depot match (all Peliyagoda)', ok: true },
  { label: 'Refrigeration requirements satisfied', ok: true },
  { label: 'Van access requirements satisfied', ok: true },
  { label: 'Weight limits within capacity', ok: true },
  { label: 'Volume limits within capacity', ok: true },
  { label: 'One brand per Task 2B trip', ok: true },
  { label: 'One district per Task 2B trip', ok: true },
  { label: 'Maximum 2 trips per vehicle', ok: true },
  { label: 'Fresh trips ≤ 270 planning minutes', ok: true },
  { label: 'Style + Tech trips ≤ 480 planning minutes', ok: true },
  { label: 'Delivery-window validation: handled separately at dispatch', ok: false },
  { label: 'Fuel checks: handled separately - usage data required', ok: false },
];

export default function PlanReview() {
  const mostDeferred = DEFERRED_ORDERS.reduce((a, b) => (b.skipCount > a.skipCount ? b : a), DEFERRED_ORDERS[0]);
  const canRelease = ORDER_COUNTS.unresolved === 0;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAFAFA]">
      <DispatcherSidebar />
      <div className="flex flex-col flex-1 p-6 md:p-10 gap-6 w-full max-w-[1300px] mx-auto bg-[#F9FAFB] h-full overflow-y-auto font-sans">

        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="font-bold text-[28px] text-[#202D2D] leading-[36px] m-0">Plan Review &amp; Release</h1>
            <span className="font-medium text-sm text-[#485563]">S1 Peak Day · 8 January 2026 · Plan v1</span>
          </div>
          <span className="text-xs text-[#485563]">Run: 8 January 2026 &nbsp;&nbsp; Status: <span className="text-[#F97316] font-semibold">S1 Scenario Validation</span></span>
        </div>

        {/* Stat Cards */}
        <div className="flex flex-col sm:flex-row gap-5 w-full">
          <div className="flex flex-col p-5 gap-2 bg-white border border-gray-200 shadow-sm rounded-xl flex-1">
            <span className="font-semibold text-[13px] text-[#485563]">Total Orders</span>
            <span className="font-bold text-[32px] text-[#202D2D] leading-[40px]">{ORDER_COUNTS.total}</span>
          </div>
          <div className="flex flex-col p-5 gap-2 bg-white border border-gray-200 shadow-sm rounded-xl flex-1">
            <span className="font-semibold text-[13px] text-[#485563]">Assigned</span>
            <span className="font-bold text-[32px] text-[#F97316] leading-[40px]">{ORDER_COUNTS.assigned}</span>
          </div>
          <div className="flex flex-col p-5 gap-2 bg-white border border-gray-200 shadow-sm rounded-xl flex-1">
            <span className="font-semibold text-[13px] text-[#485563]">Deferred</span>
            <span className="font-bold text-[32px] text-[#202D2D] leading-[40px]">{ORDER_COUNTS.deferred}</span>
          </div>
          <div className="flex flex-col p-5 gap-2 bg-white border border-gray-200 shadow-sm rounded-xl flex-1">
            <span className="font-semibold text-[13px] text-[#485563]">Unresolved</span>
            <span className="font-bold text-[32px] text-red-500 leading-[40px]">{ORDER_COUNTS.unresolved}</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 w-full">
          {/* Left: Validation Checklist */}
          <div className="flex-1 flex flex-col gap-4 bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="font-bold text-[16px] text-[#202D2D] m-0">S1 Scenario Validation</h2>
            <div className="flex flex-col gap-2.5">
              {VALIDATION_RULES.map((r, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  {r.ok ? <CheckIcon /> : <WarnIcon />}
                  <span className={`text-sm ${r.ok ? 'text-[#202D2D]' : 'text-amber-700'}`}>{r.label}</span>
                </div>
              ))}
            </div>

            <button
              disabled={!canRelease}
              className={`mt-4 py-3 px-6 rounded-lg font-semibold text-sm text-white transition-colors ${canRelease ? 'bg-orange-500 hover:bg-orange-600 cursor-pointer' : 'bg-[#94A3B8] cursor-not-allowed'}`}
            >
              Release Plan (Locked)
            </button>
            {!canRelease && (
              <div className="py-2.5 px-4 bg-[#FEF2F2] border border-red-200 rounded-lg text-xs font-semibold text-red-600">
                {ORDER_COUNTS.unresolved} unresolved orders must be assigned or deferred before release
              </div>
            )}
          </div>

          {/* Right: Deferred Orders */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex items-start gap-3 p-4 bg-[#FFFBEB] border border-amber-400 rounded-lg">
              <WarnIcon />
              <span className="text-sm font-semibold text-amber-700">
                {mostDeferred.ref} has been deferred {mostDeferred.skipCount} times - consider priority review
              </span>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-bold text-[16px] text-[#202D2D] m-0">Deferred Orders (This Run)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-4 font-bold text-[11px] text-[#485563] uppercase">Order</th>
                      <th className="py-2.5 px-4 font-bold text-[11px] text-[#485563] uppercase">Outlet</th>
                      <th className="py-2.5 px-4 font-bold text-[11px] text-[#485563] uppercase">Reason</th>
                      <th className="py-2.5 px-4 font-bold text-[11px] text-[#485563] uppercase">Skip Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DEFERRED_ORDERS.map(d => (
                      <tr key={d.ref} className="border-b border-gray-100 last:border-0">
                        <td className="py-2.5 px-4 font-semibold text-sm text-[#F97316]">{d.ref}</td>
                        <td className="py-2.5 px-4 text-sm text-gray-700">{d.outlet}</td>
                        <td className="py-2.5 px-4 text-sm text-gray-600">{d.reason}</td>
                        <td className="py-2.5 px-4">
                          <span className={`py-0.5 px-2 rounded font-bold text-xs ${d.skipCount >= 3 ? 'bg-red-100 text-red-600' : d.skipCount >= 1 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{d.skipCount}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
