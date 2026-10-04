'use client';

import React from 'react';
import Link from 'next/link';
import PageHeader from '@/components/common/PageHeader';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';

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
  const { counts, draftRevision, manifests, orders, fleetVehicles, isLoading, error } = useDispatcherPlan();
  const lastManifest = manifests[manifests.length - 1];

  const chilledOrders = orders.filter(o => o.tempRequirement === 'chilled').length;
  const reeferVehicles = fleetVehicles.filter(v => v.temp === 'reefer');

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-10 text-sm text-gray-400">Loading dashboard…</div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-6 md:p-10 gap-8 w-full max-w-[1160px] mx-auto bg-[#F9FAFB]">

      <PageHeader
        title="Operations Dashboard"
        subtitle="S1 Peak Day Scenario (no calendar date supplied by the dataset)"
        actions={
          <div className="flex flex-row items-center py-1.5 px-3 gap-2 bg-white border border-[#F97316] rounded-md w-fit flex-shrink-0">
            <span className="font-semibold text-xs text-[#F97316]">Draft revision {draftRevision}{lastManifest ? ` (released as of v${lastManifest.revision})` : ' (never released)'}</span>
          </div>
        }
      />

      {error && (
        <div className="py-2.5 px-4 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600">{error}</div>
      )}

      {/* Plan Readiness Row (4 Metrics) — queried live from the backend's current draft */}
      <div className="flex flex-col sm:flex-row gap-5 w-full">
        <div className="flex flex-col p-5 gap-2 bg-white border border-gray-200 shadow-sm rounded-xl flex-1">
          <span className="font-semibold text-[13px] text-[#485563] uppercase">Confirmed</span>
          <span className="font-bold text-[32px] text-[#202D2D] leading-[40px]">{counts.total}</span>
          <span className="font-normal text-xs text-[#485563]">Total S1 orders</span>
        </div>
        <div className="flex flex-col p-5 gap-2 bg-white border border-gray-200 shadow-sm rounded-xl flex-1">
          <span className="font-semibold text-[13px] text-[#485563] uppercase">Assigned</span>
          <span className="font-bold text-[32px] text-[#F97316] leading-[40px]">{counts.served}</span>
          <span className="font-normal text-xs text-[#485563]">Served this session</span>
        </div>
        <div className="flex flex-col p-5 gap-2 bg-white border border-gray-200 shadow-sm rounded-xl flex-1">
          <span className="font-semibold text-[13px] text-[#485563] uppercase">Deferred</span>
          <span className="font-bold text-[32px] text-[#202D2D] leading-[40px]">{counts.deferred}</span>
          <span className="font-normal text-xs text-[#485563]">With documented reason</span>
        </div>
        <div className="flex flex-col p-5 gap-2 bg-white border border-gray-200 shadow-sm rounded-xl flex-1">
          <span className="font-semibold text-[13px] text-[#485563] uppercase">Needs Decision</span>
          <span className={`font-bold text-[32px] leading-[40px] ${counts.unresolved > 0 ? 'text-red-500' : 'text-[#202D2D]'}`}>{counts.unresolved}</span>
          <span className="font-normal text-xs text-[#485563]">Unallocated backlog</span>
        </div>
      </div>
      <p className="text-xs text-[#94A3B8] italic -mt-4">Draft revision {draftRevision} — counts reflect the current server-side draft for scenario S1, queried live.</p>

      {/* Needs Attention Now Section */}
      <div className="flex flex-col gap-4 w-full">
        <h2 className="font-bold text-[18px] text-[#202D2D] m-0">Needs Attention Now</h2>
        <div className="flex flex-col gap-3 w-full">
          {counts.unresolved > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center p-5 gap-4 bg-[#FFFBEB] border border-amber-400 shadow-sm rounded-lg">
              <AlertTriangle className="text-amber-500 flex-shrink-0" />
              <div className="flex flex-col gap-1 flex-1">
                <span className="font-semibold text-[15px] text-[#202D2D]">{counts.unresolved} unresolved orders awaiting assignment decisions</span>
                <span className="font-normal text-[13px] text-[#485563]">Review the unallocated queue in Planning before releasing this plan.</span>
              </div>
              <Link href="/dispatcher/planning" className="flex flex-row items-center gap-2 cursor-pointer no-underline group hover:opacity-80 transition-opacity flex-shrink-0">
                <span className="font-semibold text-sm text-amber-600">Go to Planning</span>
                <ArrowRight className="text-amber-600 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          )}

          {chilledOrders > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center p-5 gap-4 bg-[#FFFBEB] border border-amber-400 shadow-sm rounded-lg">
              <Snowflake className="text-amber-500 flex-shrink-0" />
              <div className="flex flex-col gap-1 flex-1">
                <span className="font-semibold text-[15px] text-[#202D2D]">Refrigerated capacity check — {chilledOrders} of {orders.length} S1 orders require a reefer vehicle</span>
                <span className="font-normal text-[13px] text-[#485563]">{reeferVehicles.length} of {fleetVehicles.length} S1 fleet vehicles are reefer-capable. Check Future Capacity before assigning.</span>
              </div>
              <Link href="/dispatcher/future-capacity" className="flex flex-row items-center gap-2 cursor-pointer no-underline group hover:opacity-80 transition-opacity flex-shrink-0">
                <span className="font-semibold text-sm text-amber-600">View Future Capacity</span>
                <ArrowRight className="text-amber-600 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Live Execution Status — no live telemetry/GPS backend exists in this system,
          so this section honestly reports that instead of inventing trip-status numbers. */}
      <div className="flex flex-col gap-4 w-full pb-10">
        <h2 className="font-bold text-[18px] text-[#202D2D] m-0">Live Execution Status</h2>
        <div className="flex flex-row items-center p-5 gap-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="w-2.5 h-2.5 bg-gray-400 rounded-full flex-shrink-0"></div>
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-sm text-[#202D2D]">Live vehicle/trip telemetry is not available</span>
            <span className="text-xs text-[#485563]">
              Real loading/departure/delivery status by trip is tracked once a plan is released — see{' '}
              <Link href="/dispatcher/live-operations" className="text-orange-600 font-semibold hover:underline">Live Operations</Link>
              {' '}for persisted manifest and loading-issue status. GPS/vehicle-position tracking does not exist anywhere in this system.
            </span>
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
  );
}
