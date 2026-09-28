'use client';

import React from 'react';
import Link from 'next/link';
import DispatcherSidebar from '@/components/dispatcher/DispatcherSidebar';
import { ORDER_COUNTS } from './data';

const AlertTriangle = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const Snowflake = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="22"></line><line x1="12" y1="2" x2="16" y2="6"></line><line x1="12" y1="2" x2="8" y2="6"></line><line x1="12" y1="22" x2="16" y2="18"></line><line x1="12" y1="22" x2="8" y2="18"></line><line x1="2.5" y1="9" x2="21.5" y2="15"></line><line x1="21.5" y1="9" x2="2.5" y2="15"></line>
  </svg>
);

const Truck = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle>
  </svg>
);

const ArrowRight = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

export default function Dashboard() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAFAFA] font-sans">
      <DispatcherSidebar />
      <div className="flex flex-col flex-1 p-6 md:p-10 gap-8 w-full max-w-[1160px] mx-auto bg-[#F9FAFB] h-full overflow-y-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 w-full">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-bold text-[26px] md:text-[28px] text-[#202D2D] leading-[36px] md:leading-[42px] m-0">Waypoint Pulse · Core Logistics Engine</h1>
            <h2 className="font-medium text-[14px] text-[#485563] m-0">Run Date: 8 January 2026</h2>
          </div>
          <div className="flex flex-row items-center py-1.5 px-3 gap-2 bg-white border border-[#F97316] rounded-md w-fit flex-shrink-0">
            <span className="font-semibold text-xs text-[#F97316]">Scenario S1 · 8 Jan 2026 (demo date assumption)</span>
          </div>
        </div>

        {/* Plan Readiness Row (4 Metrics) */}
        <div className="flex flex-col sm:flex-row gap-5 w-full">
          <div className="flex flex-col p-5 gap-2 bg-white border border-gray-200 shadow-sm rounded-xl flex-1">
            <span className="font-semibold text-[13px] text-[#485563] uppercase">Confirmed</span>
            <span className="font-bold text-[32px] text-[#202D2D] leading-[40px]">{ORDER_COUNTS.total}</span>
            <span className="font-normal text-xs text-[#485563]">Total orders for run</span>
          </div>
          <div className="flex flex-col p-5 gap-2 bg-white border border-gray-200 shadow-sm rounded-xl flex-1">
            <span className="font-semibold text-[13px] text-[#485563] uppercase">Allocated</span>
            <span className="font-bold text-[20px] text-[#F97316] leading-[28px]">Pending — run Task 2B allocation</span>
            <span className="font-normal text-xs text-[#485563]">Assigned to routes</span>
          </div>
          <div className="flex flex-col p-5 gap-2 bg-white border border-gray-200 shadow-sm rounded-xl flex-1">
            <span className="font-semibold text-[13px] text-[#485563] uppercase">Deferred</span>
            <span className="font-bold text-[20px] text-[#202D2D] leading-[28px]">Pending</span>
            <span className="font-normal text-xs text-[#485563]">Moved to next cycle</span>
          </div>
          <div className="flex flex-col p-5 gap-2 bg-white border border-gray-200 shadow-sm rounded-xl flex-1">
            <span className="font-semibold text-[13px] text-[#485563] uppercase">Needs Decision</span>
            <span className="font-bold text-[20px] text-[#202D2D] leading-[28px]">Pending</span>
            <span className="font-normal text-xs text-[#485563]">Unallocated backlog</span>
          </div>
        </div>
        <p className="text-xs text-[#94A3B8] italic -mt-4">* Counts derive from the completed Task 2B allocation. Pending until allocation is finalized.</p>

        {/* Needs Attention Now Section */}
        <div className="flex flex-col gap-4 w-full">
          <h2 className="font-bold text-[18px] text-[#202D2D] m-0">Needs Attention Now</h2>
          <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center p-5 gap-4 bg-[#FFFBEB] border border-amber-400 shadow-sm rounded-lg">
              <Snowflake className="text-amber-500 flex-shrink-0" />
              <div className="flex flex-col gap-1 flex-1">
                <span className="font-semibold text-[15px] text-[#202D2D]">Refrigerated capacity check — verify chilled volume against available reefer fleet</span>
                <span className="font-normal text-[13px] text-[#485563]">Analyze and configure vehicle cold chain limits to prevent dispatch shortfall.</span>
              </div>
              <Link href="/dispatcher/future-capacity" className="flex flex-row items-center gap-2 cursor-pointer no-underline group hover:opacity-80 transition-opacity flex-shrink-0">
                <span className="font-semibold text-sm text-amber-600">Configure Vehicles</span>
                <ArrowRight className="text-amber-600 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center p-5 gap-4 bg-[#FFFBEB] border border-amber-400 shadow-sm rounded-lg">
              <AlertTriangle className="text-amber-500 flex-shrink-0" />
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[15px] text-[#202D2D]">Loading shortfall reported on Trip 1 · VEH036</span>
                  <span className="py-0.5 px-2 bg-gray-100 text-gray-500 border border-gray-300 rounded text-[10px] font-semibold uppercase">Simulated Event</span>
                </div>
                <span className="font-normal text-[13px] text-[#485563]">Warehouse reports possible skipped scanner sequence for ambient parcels.</span>
              </div>
              <Link href="/dispatcher/live-operations" className="flex flex-row items-center gap-2 cursor-pointer no-underline group hover:opacity-80 transition-opacity flex-shrink-0">
                <span className="font-semibold text-sm text-amber-600">Go to Live Ops</span>
                <ArrowRight className="text-amber-600 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>

        {/* Live Execution Status */}
        <div className="flex flex-col gap-4 w-full pb-10">
          <h2 className="font-bold text-[18px] text-[#202D2D] m-0">Live Execution Status</h2>
          <div className="flex flex-col sm:flex-row gap-5 w-full">
            <div className="flex flex-row items-center p-4 gap-4 bg-white border border-gray-200 shadow-sm rounded-lg flex-1">
              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full flex-shrink-0"></div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[20px] text-[#202D2D] leading-[30px]">2</span>
                  <span className="py-0.5 px-1.5 bg-gray-100 text-gray-500 rounded text-[9px] font-semibold uppercase">Simulated</span>
                </div>
                <span className="font-medium text-[13px] text-[#485563]">Trips Loading</span>
              </div>
            </div>
            <div className="flex flex-row items-center p-4 gap-4 bg-white border border-gray-200 shadow-sm rounded-lg flex-1">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0"></div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[20px] text-[#202D2D] leading-[30px]">4</span>
                  <span className="py-0.5 px-1.5 bg-gray-100 text-gray-500 rounded text-[9px] font-semibold uppercase">Simulated</span>
                </div>
                <span className="font-medium text-[13px] text-[#485563]">Out for Delivery</span>
              </div>
            </div>
            <div className="flex flex-row items-center p-4 gap-4 bg-white border border-gray-200 shadow-sm rounded-lg flex-1">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full flex-shrink-0"></div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[20px] text-[#202D2D] leading-[30px]">1</span>
                  <span className="py-0.5 px-1.5 bg-gray-100 text-gray-500 rounded text-[9px] font-semibold uppercase">Simulated</span>
                </div>
                <span className="font-medium text-[13px] text-[#485563]">Completed Today</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Row */}
        <div className="flex flex-col sm:flex-row gap-3 w-full pb-4">
          <Link href="/dispatcher/planning" className="flex items-center justify-center py-3 px-6 bg-[#F97316] hover:bg-orange-600 rounded-lg font-semibold text-sm text-white no-underline transition-colors flex-shrink-0">
            <Truck className="mr-2" /> Continue Planning
          </Link>
          <Link href="/dispatcher/orders" className="flex items-center justify-center py-3 px-6 bg-white border border-[#CBD5E1] hover:bg-gray-50 rounded-lg font-semibold text-sm text-[#485563] no-underline transition-colors flex-shrink-0">
            View Confirmed Orders
          </Link>
          <Link href="/dispatcher/live-operations" className="flex items-center justify-center py-3 px-6 bg-white border border-[#CBD5E1] hover:bg-gray-50 rounded-lg font-semibold text-sm text-[#485563] no-underline transition-colors flex-shrink-0">
            View Live Operations
          </Link>
          <Link href="/dispatcher/future-capacity" className="flex items-center justify-center py-3 px-6 bg-white border border-[#CBD5E1] hover:bg-gray-50 rounded-lg font-semibold text-sm text-[#485563] no-underline transition-colors flex-shrink-0">
            View Future Capacity
          </Link>
        </div>

      </div>
    </div>
  );
}
