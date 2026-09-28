'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';
import PrepareStage from './planning/PrepareStage';
import DraftTripWorkspace from './planning/DraftTripWorkspace';
import ReviewStage from './planning/ReviewStage';
import PlanningStageNav, { type PlanningStage } from './planning/PlanningStageNav';
import QueueStage from './planning/QueueStage';
import VehicleTripPanel from './planning/VehicleTripPanel';
import OrderDetailPanel from './planning/OrderDetailPanel';
import OrderDetailContent from './planning/OrderDetailContent';
import DeferDialog from './DeferDialog';
import type { DeferReasonCode } from '@/types/dispatcher';
import { Sparkles, Layers, ArrowLeft } from 'lucide-react';

export default function Planning({ initialStage = 'prepare' }: { initialStage?: PlanningStage }) {
  const {
    orders,
    fleetVehicles,
    assignments,
    ordersOnTrip,
    compatibleCandidates,
    getPassport,
    assignOrder,
    deferOrder,
    draftRevision,
    releasedManifests,
    counts,
    isDraftGenerated,
  } = useDispatcherPlan();

  // Current stage: 'prepare' | 'draft' | 'review'
  const [stage, setStage] = useState<'prepare' | 'draft' | 'review'>(() => {
    if (initialStage === 'review') return 'review';
    if (initialStage === 'adjust' || initialStage === 'draft') return 'draft';
    return isDraftGenerated ? 'draft' : 'prepare';
  });

  // Manual fallback mode toggle
  const [isManualFallback, setIsManualFallback] = useState(false);

  // Manual queue state
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedTripNo, setSelectedTripNo] = useState<1 | 2>(1);
  const [search, setSearch] = useState('');
  const [showDefer, setShowDefer] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  // Handle URL query parameters (?order=S1-000, ?stage=review)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const orderParam = params.get('order');
    const stageParam = params.get('stage');

    if (stageParam === 'review') {
      setStage('review');
    } else if (stageParam === 'draft' || stageParam === 'adjust') {
      setStage('draft');
    }

    if (orderParam) {
      // If user linked directly to an order, open manual queue inspection for that order
      setIsManualFallback(true);
      selectOrder(orderParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const queue = useMemo(() => {
    const list = orders.filter((o) => assignments[o.orderRef]?.decision === 'unresolved');
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((o) => o.orderRef.toLowerCase().includes(q) || o.outletId.toLowerCase().includes(q) || o.district.toLowerCase().includes(q));
  }, [orders, assignments, search]);

  const selectedOrder = orders.find((o) => o.orderRef === selectedRef) || null;
  const availableVehicles = useMemo(() => fleetVehicles.filter((v) => v.status === 'available'), [fleetVehicles]);
  const candidates = selectedRef ? compatibleCandidates(selectedRef) : [];
  const recommended = candidates.find((c) => c.recommended);

  function pickTripNoFor(vehicleId: string): 1 | 2 {
    const candidate = candidates.find((c) => c.vehicle.vehicleId === vehicleId);
    if (candidate) return candidate.tripNo;
    const t1 = selectedOrder ? ordersOnTrip(vehicleId, 1) : [];
    if (t1.length === 0 || (selectedOrder && t1[0].brand === selectedOrder.brand && t1[0].district === selectedOrder.district)) return 1;
    return 2;
  }

  function selectOrder(ref: string) {
    setSelectedRef(ref);
    setDetailOpen(true);
    const cands = compatibleCandidates(ref);
    if (cands.length > 0) {
      setSelectedVehicleId(cands[0].vehicle.vehicleId);
      setSelectedTripNo(cands[0].tripNo);
    } else {
      setSelectedVehicleId(null);
    }
  }

  function selectVehicle(vehicleId: string) {
    setSelectedVehicleId(vehicleId);
    setSelectedTripNo(pickTripNoFor(vehicleId));
  }

  const passport = selectedOrder && selectedVehicleId ? getPassport(selectedOrder.orderRef, selectedVehicleId, selectedTripNo) : null;

  function resetSelection() {
    setSelectedRef(null);
    setSelectedVehicleId(null);
    setDetailOpen(false);
  }

  function handleAssign() {
    if (!selectedOrder || !selectedVehicleId || !passport?.checkerFeasible) return;
    assignOrder(selectedOrder.orderRef, selectedVehicleId, selectedTripNo);
    resetSelection();
  }

  function handleDeferConfirm(reasonCode: DeferReasonCode, note: string) {
    if (!selectedOrder) return;
    deferOrder(selectedOrder.orderRef, reasonCode, note);
    setShowDefer(false);
    resetSelection();
  }

  const STAGES: ('prepare' | 'draft' | 'review')[] = ['prepare', 'draft', 'review'];
  function goStage(delta: 1 | -1) {
    const i = STAGES.indexOf(stage);
    const next = STAGES[i + delta];
    if (next) setStage(next);
  }

  const lastManifest = releasedManifests[releasedManifests.length - 1];

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Top Application Toolbar */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E2E8F0] bg-white px-5 py-3">
        {/* Left: title + status badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="m-0 text-base font-bold text-[#202D2D]">
            {isManualFallback ? 'Manual Assignment Fallback' : 'Delivery Planning'}
          </h1>

          {isDraftGenerated ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-[#F97316]/30 bg-[#FFF4ED] px-2 py-0.5 text-[11px] font-semibold text-[#F97316]">
              <Sparkles size={11} />
              Suggested Draft · v{draftRevision}{lastManifest ? ` · Released v${lastManifest.revision}` : ''}
            </span>
          ) : (
            <span className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-semibold text-[#64748B]">
              Intake Ready · {availableVehicles.length} vehicles
            </span>
          )}

          {counts.unresolved > 0 && (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 tabular-nums">
              {counts.unresolved} unallocated
            </span>
          )}
        </div>

        {/* Right: Fallback Mode toggle or Return to Primary flow */}
        <div className="flex items-center gap-2">
          {isManualFallback ? (
            <button
              type="button"
              onClick={() => setIsManualFallback(false)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#202D2D] hover:bg-black text-white px-3 py-1.5 text-xs font-semibold transition-colors shadow-xs"
            >
              <ArrowLeft size={13} />
              Return to Proposed Draft Workflow
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsManualFallback(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#202D2D] hover:bg-slate-50 transition-colors shadow-xs"
              title="Switch to manual order-by-order queue planning"
            >
              <Layers size={13} />
              Manual Fallback
            </button>
          )}
        </div>
      </div>

      {/* 3-Stage Stepper Navigation Bar (Prepare → Review draft → Review & Release) */}
      {!isManualFallback && (
        <PlanningStageNav
          stage={stage}
          canContinue={stage === 'prepare' ? isDraftGenerated : true}
          onBack={() => goStage(-1)}
          onContinue={() => goStage(1)}
          onSelectStage={(s) => setStage(s)}
        />
      )}

      {/* Main View Area */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {isManualFallback ? (
          /* MANUAL ORDER-BY-ORDER FALLBACK EXPERIENCE */
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Queue column */}
            <div className="flex flex-shrink-0 border-r border-[#E2E8F0] w-80 bg-white">
              <QueueStage
                queue={queue}
                selectedRef={selectedRef}
                search={search}
                onSearchChange={setSearch}
                onSelect={selectOrder}
              />
            </div>

            {/* Vehicle/trip workspace */}
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#F9FAFB]">
              <VehicleTripPanel
                selectedOrder={selectedOrder}
                availableVehicles={availableVehicles}
                candidates={candidates}
                recommended={recommended}
                selectedVehicleId={selectedVehicleId}
                ordersOnTrip={ordersOnTrip}
                onSelectVehicle={selectVehicle}
                onSelectFirstOrder={() => {
                  if (queue.length > 0) selectOrder(queue[0].orderRef);
                }}
                onOpenDetails={() => setDetailOpen(true)}
              />

              {/* Mobile inline detail */}
              {selectedOrder && (
                <div className="border-t border-gray-200 bg-white p-4 md:hidden">
                  <OrderDetailContent
                    order={selectedOrder}
                    selectedVehicleId={selectedVehicleId}
                    selectedTripNo={selectedTripNo}
                    passport={passport}
                    onAssign={handleAssign}
                    onDefer={() => setShowDefer(true)}
                  />
                </div>
              )}
            </div>

            {/* Order detail panel (desktop slide-over) */}
            <OrderDetailPanel
              open={detailOpen}
              onClose={() => setDetailOpen(false)}
              order={selectedOrder}
              selectedVehicleId={selectedVehicleId}
              selectedTripNo={selectedTripNo}
              passport={passport}
              onAssign={handleAssign}
              onDefer={() => setShowDefer(true)}
            />

            {showDefer && selectedOrder && (
              <DeferDialog
                orderRef={selectedOrder.orderRef}
                onCancel={() => setShowDefer(false)}
                onConfirm={handleDeferConfirm}
              />
            )}
          </div>
        ) : (
          /* PRIMARY 3-STAGE PROPOSED DRAFT WORKFLOW */
          <>
            {stage === 'prepare' && (
              <div className="flex-1 overflow-y-auto">
                <PrepareStage
                  onGenerateDraft={() => setStage('draft')}
                  onSwitchToManual={() => setIsManualFallback(true)}
                />
              </div>
            )}

            {stage === 'draft' && (
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <DraftTripWorkspace
                  onSwitchToManual={() => setIsManualFallback(true)}
                  onProceedToRelease={() => setStage('review')}
                />
              </div>
            )}

            {stage === 'review' && (
              <div className="flex-1 overflow-y-auto">
                <ReviewStage onBackToAdjust={() => setStage('draft')} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
