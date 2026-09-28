'use client';

import React, { useState } from 'react';
import DispatcherSidebar from '@/components/dispatcher/DispatcherSidebar';
import { LIVE_TRIPS, LOADING_SHORTFALL, TripStatus } from './data';

const AlertIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const DotIcon = () => <svg width="9" height="9" viewBox="0 0 9 9"><circle cx="4.5" cy="4.5" r="4.5" fill="currentColor" /></svg>;

const STATUS_STYLE: Record<TripStatus, string> = {
  Loading: 'bg-gray-100 text-gray-700',
  'In Transit': 'bg-amber-100 text-amber-700',
  Departed: 'bg-blue-100 text-blue-700',
  Awaiting: 'bg-red-100 text-red-700',
};

type Resolution = 'replace' | 'defer' | null;

export default function LiveOperations() {
  const [resolution, setResolution] = useState<Resolution>('replace');
  const [resolved, setResolved] = useState(false);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAFAFA]">
      <DispatcherSidebar />
      <div className="flex flex-col flex-1 p-6 md:p-10 gap-6 w-full max-w-[1300px] mx-auto bg-[#F9FAFB] h-full overflow-y-auto font-sans">

        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="font-bold text-[28px] text-[#202D2D] leading-[36px] m-0">Live Operations</h1>
            <span className="py-1 px-2 bg-[#FFF4ED] border border-[#F97316] rounded font-semibold text-[11px] text-[#F97316] uppercase">S1 Peak Day · 8 January 2026 · Plan v1 Released</span>
          </div>
          <p className="text-sm text-[#485563] m-0">Live status and locations are simulated prototype events</p>
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
              {LIVE_TRIPS.map((t, i) => (
                <tr key={i} className={`border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC] ${t.issue ? 'bg-[#FFF9F2]' : ''}`}>
                  <td className="py-3.5 px-5 font-bold text-sm text-[#202D2D]">{t.vehicle}</td>
                  <td className="py-3.5 px-5 text-sm text-[#485563]">Trip 1 | {t.district}</td>
                  <td className="py-3.5 px-5">
                    <span className={`py-1 px-2.5 rounded font-semibold text-xs ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                  </td>
                  <td className="py-3.5 px-5 text-sm text-[#485563]">{t.lastUpdate}</td>
                  <td className="py-3.5 px-5 text-sm">
                    {t.issue ? (
                      <span className="flex items-center gap-1.5 text-amber-600 font-medium"><AlertIcon /> {t.issue}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Loading Shortfall Resolution Panel */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="font-bold text-[16px] text-[#202D2D] m-0">Loading-shortfall resolution</h2>
              <p className="text-sm text-[#485563] m-0 mt-1">Expanded for {LOADING_SHORTFALL.vehicle} · {LOADING_SHORTFALL.trip} · {LOADING_SHORTFALL.district}</p>
            </div>
            <span className={`py-1.5 px-3 rounded font-bold text-xs uppercase ${resolved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {resolved ? 'Resolved' : 'HOLD - awaiting Dispatcher decision'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-[11px] text-gray-500 uppercase">Affected Order</span>
              <span className="font-bold text-sm text-gray-900">{LOADING_SHORTFALL.affectedOrder}, {LOADING_SHORTFALL.affectedOutlet}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-[11px] text-gray-500 uppercase">Reported Issue</span>
              <span className="font-bold text-sm text-gray-900">{LOADING_SHORTFALL.reportedIssue}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-semibold text-[11px] text-gray-500 uppercase">Resolution Options</span>
            <button
              onClick={() => { setResolution('replace'); setResolved(false); }}
              className={`flex items-center gap-3 p-3.5 rounded-lg border text-left transition-colors ${resolution === 'replace' ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200 text-gray-800 hover:border-gray-300'}`}
            >
              <span className={resolution === 'replace' ? 'text-white' : 'text-gray-300'}><DotIcon /></span>
              <span className="font-semibold text-sm">Replace from available stock</span>
            </button>
            <button
              onClick={() => { setResolution('defer'); setResolved(false); }}
              className={`flex items-center gap-3 p-3.5 rounded-lg border text-left transition-colors ${resolution === 'defer' ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200 text-gray-800 hover:border-gray-300'}`}
            >
              <span className={resolution === 'defer' ? 'text-white' : 'text-gray-300'}><DotIcon /></span>
              <span className="font-semibold text-sm">Defer whole order to next run with reason</span>
            </button>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-gray-200">
            <span className="font-semibold text-[11px] text-gray-500 uppercase">After Resolution</span>
            <div className="flex flex-row gap-3 flex-wrap">
              <button
                disabled={!resolution}
                onClick={() => setResolved(true)}
                className="py-2 px-4 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-xs text-gray-700 transition-colors"
              >
                Revalidate constraints
              </button>
              <button
                disabled={!resolution}
                onClick={() => setResolved(true)}
                className="py-2 px-4 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-xs text-gray-700 transition-colors"
              >
                Publish Plan v2
              </button>
              <button
                disabled={!resolution}
                onClick={() => setResolved(true)}
                className="py-2 px-4 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-xs text-gray-700 transition-colors"
              >
                Notify Loader and Driver
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
