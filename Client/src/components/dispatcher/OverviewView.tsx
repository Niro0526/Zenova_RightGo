'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Snowflake, Truck, ChevronRight, CheckCircle, Info, Clock, Calendar, CheckSquare } from 'lucide-react';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';
import { computeReeferShortage } from '@/lib/dispatcher/capacity';

export default function Overview() {
  const router = useRouter();
  const { orders, fleetVehicles, counts, draftRevision, releasedManifests, ledger, assignments } = useDispatcherPlan();
  const [showDemoInfo, setShowDemoInfo] = useState(false);

  const lastManifest = releasedManifests[releasedManifests.length - 1];
  const isReleased = !!lastManifest;
  const availableVehicles = fleetVehicles.filter((v) => v.status === 'available');
  const reefer = computeReeferShortage(orders, fleetVehicles);

  // Derive recent activity from ledger
  const recentActivity = ledger.slice(0, 5);

  // Attention items: focused and non-redundant
  const attentionItems: { id: string; icon: React.ReactNode; level: 'warning' | 'info' | 'error'; title: string; reason: string; href: string; action: string }[] = [];

  // If there are unresolved orders during normal draft prep, show an amber attention item (not an aggressive red blocker)
  if (counts.unresolved > 0) {
    attentionItems.push({
      id: 'unresolved',
      icon: <Clock size={16} className="text-amber-500" />,
      level: 'warning',
      title: `${counts.unresolved} unallocated orders pending decision`,
      reason: 'Assign orders to available vehicle trips or defer with an operational reason.',
      href: '/dispatcher/planning',
      action: 'Review in Planning',
    });
  }

  // Capacity estimate: label as estimate taking multi-trip model into consideration
  if (reefer.shortfall) {
    attentionItems.push({
      id: 'reefer',
      icon: <Snowflake size={16} className="text-amber-500" />,
      level: 'warning',
      title: 'Refrigerated capacity estimate — review required',
      reason: `Nominal single-load reefer capacity (${reefer.capacityM3.toFixed(1)} m³) vs chilled demand (${reefer.demandM3.toFixed(1)} m³). Multi-trip sequencing in Planning may resolve this demand.`,
      href: '/dispatcher/planning',
      action: 'Check vehicle fit',
    });
  }

  // Check for priority-deferred orders (deferred yesterday or 4+ days)
  const priorityDeferred = orders.filter(o => {
    const a = assignments[o.orderRef];
    return a?.decision === 'deferred' && (o.deferredYesterday || o.daysSinceLastServed >= 4);
  });
  if (priorityDeferred.length > 0) {
    attentionItems.push({
      id: 'priority-deferred',
      icon: <AlertCircle size={16} className="text-amber-500" />,
      level: 'warning',
      title: `${priorityDeferred.length} deferred order${priorityDeferred.length === 1 ? '' : 's'} need priority review`,
      reason: `${priorityDeferred.map(o => o.orderRef).slice(0, 3).join(', ')}${priorityDeferred.length > 3 ? ` +${priorityDeferred.length - 3} more` : ''} — deferred yesterday or 4+ days without service.`,
      href: '/dispatcher/planning?stage=review',
      action: 'Review deferrals',
    });
  }

  const LEVEL_STYLES = {
    error: {
      wrapper: 'bg-red-50/60 border-red-200',
      icon: 'text-red-500',
      title: 'text-red-900',
      reason: 'text-red-700',
      action: 'text-red-700 hover:text-red-900',
    },
    warning: {
      wrapper: 'bg-[#FFFBEB] border-amber-200',
      icon: 'text-amber-500',
      title: 'text-amber-900',
      reason: 'text-amber-800',
      action: 'text-amber-800 hover:text-amber-950',
    },
    info: {
      wrapper: 'bg-[#EFF6FF] border-blue-200',
      icon: 'text-blue-500',
      title: 'text-blue-900',
      reason: 'text-blue-700',
      action: 'text-blue-700 hover:text-blue-900',
    },
  };

  const ACTION_LABEL: Record<string, string> = {
    assigned: 'Assigned',
    deferred: 'Deferred',
    reassigned: 'Reassigned',
    published: 'Plan released',
    resequenced: 'Resequenced',
  };

  const ACTION_HREF: Record<string, string> = {
    assigned: '/dispatcher/orders',
    deferred: '/dispatcher/orders',
    reassigned: '/dispatcher/orders',
    published: '/dispatcher/live-operations',
    resequenced: '/dispatcher/planning',
  };

  return (
    <div className="flex flex-col flex-1 p-6 md:p-8 gap-6 w-full max-w-[1160px] mx-auto">

      {/* Page heading + primary action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] md:text-[24px] font-bold text-[#202D2D] m-0 tracking-tight">Overview</h1>
          <p className="text-sm text-[#64748B] m-0 mt-0.5">
            Operational status and dispatch progress for Peliyagoda depot
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dispatcher/planning"
            className="flex items-center gap-2 rounded-lg bg-[#F97316] px-4 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#EA580C] shadow-sm"
          >
            <Truck size={16} />
            {counts.unresolved > 0 ? 'Continue planning' : isReleased ? 'Review plan' : 'Continue planning'}
          </Link>
          <button
            onClick={() => setShowDemoInfo(s => !s)}
            className="flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-semibold text-[#485563] hover:bg-[#F8FAFC] transition-colors"
            aria-label="Demo information disclosure"
          >
            <Info size={14} />
            Demo info
          </button>
        </div>
      </div>

      {/* Demo info disclosure */}
      {showDemoInfo && (
        <div className="rounded-xl border border-blue-200 bg-[#EFF6FF] p-4 text-sm text-blue-900 transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-xs text-blue-900 uppercase tracking-wider">Demo Session Context</span>
            <button onClick={() => setShowDemoInfo(false)} className="text-blue-600 hover:text-blue-900 text-xs font-semibold">Dismiss</button>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed m-0">
            S1 scenario data comprises 85 verified outlet orders. Planning and allocation operate via session-local state. Telemetry and live status tracking are simulated for demonstration.
          </p>
        </div>
      )}

      {/* 4 Summary cards — refined height and balanced spacing */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => router.push('/dispatcher/orders')}
          className="flex flex-col p-4 md:p-5 bg-white border border-[#E2E8F0] shadow-sm rounded-xl text-left hover:border-[#CBD5E1] hover:shadow transition-all"
        >
          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Confirmed</span>
          <span className="font-bold text-[28px] md:text-[32px] text-[#202D2D] leading-tight my-1 tabular-nums">{counts.total}</span>
          <span className="text-xs text-[#64748B]">Total S1 intake</span>
        </button>

        <button
          onClick={() => router.push('/dispatcher/orders?filter=assigned')}
          className="flex flex-col p-4 md:p-5 bg-white border border-[#E2E8F0] shadow-sm rounded-xl text-left hover:border-[#F97316] hover:shadow transition-all"
        >
          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Assigned</span>
          <span className="font-bold text-[28px] md:text-[32px] text-[#F97316] leading-tight my-1 tabular-nums">{counts.served}</span>
          <span className="text-xs text-[#64748B]">Allocated to trips</span>
        </button>

        <button
          onClick={() => router.push('/dispatcher/orders?filter=deferred')}
          className="flex flex-col p-4 md:p-5 bg-white border border-[#E2E8F0] shadow-sm rounded-xl text-left hover:border-[#CBD5E1] hover:shadow transition-all"
        >
          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Deferred</span>
          <span className="font-bold text-[28px] md:text-[32px] text-[#202D2D] leading-tight my-1 tabular-nums">{counts.deferred}</span>
          <span className="text-xs text-[#64748B]">With justification</span>
        </button>

        <button
          onClick={() => router.push('/dispatcher/planning')}
          className={`flex flex-col p-4 md:p-5 bg-white border shadow-sm rounded-xl text-left hover:shadow transition-all ${
            counts.unresolved > 0 ? 'border-amber-200 hover:border-amber-300' : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
          }`}
        >
          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Unresolved</span>
          <span className={`font-bold text-[28px] md:text-[32px] leading-tight my-1 tabular-nums ${counts.unresolved > 0 ? 'text-amber-600' : 'text-[#202D2D]'}`}>
            {counts.unresolved}
          </span>
          <span className="text-xs text-[#64748B]">Awaiting decision</span>
        </button>
      </div>

      {/* Attention list */}
      <div className="flex flex-col gap-3">
        <h2 className="font-bold text-base text-[#202D2D] m-0">Attention required</h2>
        {attentionItems.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
            <CheckCircle size={18} className="text-[#10B981] flex-shrink-0" />
            <div>
              <div className="font-semibold text-sm text-[#202D2D]">No urgent blockers</div>
              <div className="text-xs text-[#64748B] mt-0.5">
                {counts.total > 0 && counts.unresolved === 0
                  ? 'All orders have been allocated or deferred. Draft is ready for final review.'
                  : 'Assign or defer orders in Planning to clear attention items.'}
              </div>
            </div>
          </div>
        ) : (
          attentionItems.map(item => {
            const styles = LEVEL_STYLES[item.level];
            return (
              <div key={item.id} className={`flex items-start sm:items-center justify-between gap-4 rounded-xl border p-3.5 ${styles.wrapper}`}>
                <div className="flex items-start gap-3 min-w-0">
                  <span className={`flex-shrink-0 mt-0.5 ${styles.icon}`}>{item.icon}</span>
                  <div className="min-w-0">
                    <div className={`font-semibold text-sm ${styles.title}`}>{item.title}</div>
                    <div className={`text-xs mt-0.5 ${styles.reason}`}>{item.reason}</div>
                  </div>
                </div>
                <Link
                  href={item.href}
                  className={`flex items-center gap-1 text-xs font-semibold flex-shrink-0 no-underline px-2.5 py-1.5 rounded-lg border border-amber-300/80 bg-white shadow-xs transition-colors ${styles.action}`}
                >
                  {item.action}
                  <ChevronRight size={13} />
                </Link>
              </div>
            );
          })
        )}
      </div>

      {/* Planning & Fleet summary vs Execution summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Planning Summary */}
        <div className="flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-[#202D2D] m-0">Planning status</h2>
            <span className="text-xs font-semibold text-[#64748B]">v{draftRevision}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex flex-col p-3 rounded-lg bg-[#F8FAFC] border border-[#F1F5F9]">
              <span className="text-xs text-[#64748B]">Available fleet</span>
              <span className="text-xl font-bold text-[#202D2D] mt-1 tabular-nums">
                {availableVehicles.length} <span className="text-xs font-normal text-[#94A3B8]">/ {fleetVehicles.length}</span>
              </span>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-[#F8FAFC] border border-[#F1F5F9]">
              <span className="text-xs text-[#64748B]">Draft trips configured</span>
              <span className="text-xl font-bold text-[#202D2D] mt-1 tabular-nums">
                {counts.served > 0 ? Math.ceil(counts.served / 4) : 0}
              </span>
            </div>
          </div>
        </div>

        {/* Execution Summary — clearly labeled simulated */}
        <div className="flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-[#202D2D] m-0">Execution summary</h2>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-500">Simulated tracking</span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex flex-col p-3 rounded-lg bg-[#F8FAFC] border border-[#F1F5F9]">
              <span className="text-xs text-[#64748B]">Released manifests</span>
              <span className="text-xl font-bold text-[#202D2D] mt-1 tabular-nums">
                {releasedManifests.length}
              </span>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-[#F8FAFC] border border-[#F1F5F9]">
              <span className="text-xs text-[#64748B]">Active trips</span>
              <span className="text-xl font-bold text-[#10B981] mt-1 tabular-nums">
                {isReleased ? 4 : 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="flex flex-col gap-3 pb-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-[#202D2D] m-0">Recent activity</h2>
          <Link href="/dispatcher/orders" className="text-xs font-semibold text-[#F97316] no-underline hover:underline">
            View orders →
          </Link>
        </div>
        {recentActivity.length === 0 ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 text-center text-sm text-[#64748B]">
            No decisions recorded yet this session. Assign or defer orders in Planning to see logged entries.
          </div>
        ) : (
          <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
            {recentActivity.map((entry, i) => (
              <Link
                key={entry.id}
                href={ACTION_HREF[entry.action] ?? '/dispatcher'}
                className={`flex items-center gap-4 px-5 py-3 no-underline hover:bg-[#F8FAFC] transition-colors ${i < recentActivity.length - 1 ? 'border-b border-[#F1F5F9]' : ''}`}
              >
                <div className="h-2 w-2 rounded-full bg-[#F97316] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-[#202D2D]">{ACTION_LABEL[entry.action] ?? entry.action}</span>
                  <span className="text-sm text-[#485563]"> — {entry.orderRef}</span>
                  {entry.outletId && entry.outletId !== '-' && <span className="text-xs text-[#94A3B8]"> · {entry.outletId}</span>}
                </div>
                <span className="text-xs text-[#64748B] flex-shrink-0 tabular-nums">{entry.time}</span>
                <ChevronRight size={14} className="text-[#CBD5E1] flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
