'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Truck,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Snowflake,
  Shield,
  Layers,
  ArrowRight,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';

export default function PrepareStage({
  onGenerateDraft,
  onSwitchToManual,
}: {
  onGenerateDraft: () => void;
  onSwitchToManual: () => void;
}) {
  const {
    orders,
    fleetVehicles,
    counts,
    draftRevision,
    isDraftGenerated,
    resetPlan,
  } = useDispatcherPlan();

  const [isGenerating, setIsGenerating] = useState(false);
  const [showPriorities, setShowPriorities] = useState(false);

  const availableVehicles = fleetVehicles.filter((v) => v.status === 'available');
  const reeferVehicles = availableVehicles.filter((v) => v.temp === 'reefer');
  const ambientVehicles = availableVehicles.filter((v) => v.temp === 'ambient');

  const chilledOrders = orders.filter((o) => o.tempRequirement === 'chilled');
  const vanOnlyOrders = orders.filter((o) => o.parkingConstraint === 'van_only');
  const priorityDeferred = orders.filter((o) => o.deferredYesterday || o.daysSinceLastServed >= 4);

  const handleGenerate = () => {
    setIsGenerating(true);
    // Honest micro-turn to let React render the loading state
    setTimeout(() => {
      onGenerateDraft();
      setIsGenerating(false);
    }, 200);
  };

  return (
    <div className="flex flex-col flex-1 p-6 md:p-8 gap-6 w-full max-w-[1100px] mx-auto">
      {/* Top Run & Depot Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] md:text-[24px] font-bold text-[#202D2D] m-0 tracking-tight">
              Prepare Dispatch Run
            </h1>
            <span className="rounded-md border border-[#F97316]/30 bg-[#FFF4ED] px-2.5 py-0.5 text-xs font-semibold text-[#F97316]">
              {isDraftGenerated ? `Draft v${draftRevision} Active` : 'Awaiting Generation'}
            </span>
          </div>
          <p className="text-sm text-[#64748B] m-0 mt-0.5">
            Delivery Run: <strong className="text-[#202D2D]">S1 Morning Run</strong> · Depot: <strong className="text-[#202D2D]">Peliyagoda</strong> · Assumed operating scenario
          </p>
        </div>

        {isDraftGenerated && (
          <button
            onClick={resetPlan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold text-[#485563] hover:bg-[#F8FAFC] transition-colors"
          >
            <RotateCcw size={13} />
            Reset to clean intake
          </button>
        )}
      </div>

      {/* Primary Generation Call to Action Banner */}
      <div className="rounded-xl border border-[#F97316]/30 bg-gradient-to-r from-[#FFF4ED] via-white to-[#FFF4ED] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#F97316] text-white flex items-center justify-center flex-shrink-0 shadow-md">
            <Sparkles size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#202D2D] m-0">
              {isDraftGenerated ? 'Regenerate Suggested Plan' : 'Generate Suggested Draft Plan'}
            </h2>
            <p className="text-xs text-[#64748B] mt-1 max-w-xl leading-relaxed m-0">
              The planning engine considers all {orders.length} orders across brand, district, cold-chain specifications, delivery windows, and vehicle capacity to propose complete multi-stop trips for your review.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-shrink-0">
          <button
            disabled={isGenerating}
            onClick={handleGenerate}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#F97316] px-5 py-3 text-sm font-semibold text-white hover:bg-[#EA580C] disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
          >
            <Sparkles size={16} />
            {isGenerating ? 'Generating Suggested Draft...' : isDraftGenerated ? 'Regenerate Draft' : 'Generate Draft Plan'}
          </button>
          <button
            type="button"
            onClick={onSwitchToManual}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-4 py-3 text-xs font-semibold text-[#485563] hover:bg-[#F8FAFC] transition-colors"
          >
            Manual order-by-order
          </button>
        </div>
      </div>

      {/* Readiness Indicators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Order Intake Readiness */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Orders Ready</span>
            <span className="text-xs font-bold text-[#202D2D] tabular-nums">{orders.length} Total</span>
          </div>
          <div className="flex flex-col gap-2 text-xs text-[#485563]">
            <div className="flex justify-between">
              <span>Chilled goods (Reefer required):</span>
              <strong className="text-[#202D2D] tabular-nums">{chilledOrders.length} orders</strong>
            </div>
            <div className="flex justify-between">
              <span>Van access restricted:</span>
              <strong className="text-[#202D2D] tabular-nums">{vanOnlyOrders.length} orders</strong>
            </div>
            <div className="flex justify-between">
              <span>High priority (deferred / 4+ days):</span>
              <strong className="text-amber-700 tabular-nums">{priorityDeferred.length} orders</strong>
            </div>
          </div>
        </div>

        {/* Fleet Availability */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Available Fleet</span>
            <span className="text-xs font-bold text-emerald-700 tabular-nums">{availableVehicles.length} of {fleetVehicles.length} Active</span>
          </div>
          <div className="flex flex-col gap-2 text-xs text-[#485563]">
            <div className="flex justify-between">
              <span>Refrigerated (Reefer):</span>
              <strong className="text-[#202D2D] tabular-nums">{reeferVehicles.length} vehicles</strong>
            </div>
            <div className="flex justify-between">
              <span>Ambient (Lorry &amp; Van):</span>
              <strong className="text-[#202D2D] tabular-nums">{ambientVehicles.length} vehicles</strong>
            </div>
            <div className="flex justify-between">
              <span>Max allowed trips/day:</span>
              <strong className="text-[#202D2D] tabular-nums">2 trips per vehicle</strong>
            </div>
          </div>
        </div>

        {/* Operational Inputs Status */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Operational Checks</span>
            <span className="text-xs font-bold text-blue-700">Automated</span>
          </div>
          <div className="flex flex-col gap-2 text-xs text-[#485563]">
            <div className="flex justify-between">
              <span>Feasibility rule checks:</span>
              <span className="text-emerald-700 font-semibold">Active (C01–C17)</span>
            </div>
            <div className="flex justify-between">
              <span>Departure timing:</span>
              <span className="text-[#64748B]">Auto-suggested per trip</span>
            </div>
            <div className="flex justify-between">
              <span>Release gate:</span>
              <span className="text-[#64748B]">Dispatcher approval</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Planning Priorities Panel */}
      <div className="rounded-xl border border-[#CBD5E1] bg-white overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowPriorities((s) => !s)}
          className="w-full flex items-center justify-between p-4 text-xs font-bold uppercase tracking-wider text-[#485563] hover:bg-[#F8FAFC] transition-colors"
        >
          <div className="flex items-center gap-2 text-[#202D2D]">
            <Shield size={16} className="text-[#F97316]" />
            <span>Planning Principles &amp; Heuristic Priorities</span>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-[#64748B] font-normal normal-case">
            {showPriorities ? 'Hide details' : 'How does the generator allocate?'}
            {showPriorities ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </button>

        {showPriorities && (
          <div className="p-5 border-t border-[#F1F5F9] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#485563] bg-[#FAFAFA] leading-relaxed">
            <div className="flex flex-col gap-1 p-3 rounded-lg bg-white border border-[#E2E8F0]">
              <strong className="text-[#202D2D]">1. Strict Constraint Compliance</strong>
              <span>
                Orders requiring chilled handling are never placed on ambient vehicles; van-only destinations are assigned exclusively to vans; payload and volume caps are never exceeded.
              </span>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-lg bg-white border border-[#E2E8F0]">
              <strong className="text-[#202D2D]">2. Preserve Scarce Capabilities</strong>
              <span>
                Scarce reefer vans are prioritized for orders that genuinely require both chilled handling and van access, rather than consuming them for standard ambient deliveries.
              </span>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-lg bg-white border border-[#E2E8F0]">
              <strong className="text-[#202D2D]">3. Single Brand &amp; Single District Grouping</strong>
              <span>
                Orders are consolidated by brand and district per trip in accordance with S1 operational specifications.
              </span>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-lg bg-white border border-[#E2E8F0]">
              <strong className="text-[#202D2D]">4. Service History &amp; Delivery Window Priority</strong>
              <span>
                Orders that were deferred on the previous day or have gone 4+ days without service are scheduled first to meet customer SLAs.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Secondary Navigation Link to Orders */}
      <div className="flex items-center justify-between text-xs text-[#64748B] pt-2">
        <span>Need to inspect individual orders or delivery windows before generating?</span>
        <Link href="/dispatcher/orders" className="font-semibold text-[#F97316] hover:underline flex items-center gap-1">
          View all 85 orders in Orders table <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
