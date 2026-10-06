'use client';

import React, { useEffect, useState } from 'react';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';
import type { RankedCandidate } from '@/lib/api/dispatcher';

export default function ReassignDialog({
  orderRef,
  onCancel,
  onDone,
  onOpenDefer,
}: {
  orderRef: string;
  onCancel: () => void;
  onDone: () => void;
  onOpenDefer?: () => void;
}) {
  const { orders, compatibleCandidates, reassignOrder, isSaving, error } = useDispatcherPlan();
  const order = orders.find(o => o.orderRef === orderRef);
  const [candidates, setCandidates] = useState<RankedCandidate[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [note, setNote] = useState('');
  const selected = candidates?.[selectedIndex];

  useEffect(() => {
    let cancelled = false;
    setCandidates(null);
    setLoadError(null);
    compatibleCandidates(orderRef)
      .then((rows) => { if (!cancelled) setCandidates(rows); })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load candidate vehicles:', err);
          setLoadError('Could not evaluate candidate vehicles for this order.');
        }
      });
    return () => { cancelled = true; };
  }, [orderRef, compatibleCandidates]);

  async function handleConfirm() {
    if (!selected) return;
    const ok = await reassignOrder(orderRef, selected.vehicle.vehicleId, selected.tripNo as (1 | 2), note.trim() || 'Manual dispatcher override');
    if (ok) onDone();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-[560px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-gray-100 bg-linear-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl text-gray-900">Change Vehicle / Trip</h2>
            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-orange-100 text-orange-700 rounded-md">
              {orderRef}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {order ? `${order.outletId} · ${order.brand} · ${order.district} · ${order.orderWeightKg.toFixed(1)} kg · ${order.orderVolumeM3.toFixed(3)} m³ · ${order.tempRequirement}` : ''}
          </p>
        </div>

        <div className="p-5 flex flex-col gap-3 overflow-y-auto max-h-[50vh]">
          {candidates === null && !loadError && (
            <div className="py-8 flex flex-col items-center justify-center gap-3 text-gray-400">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-medium">Evaluating DB constraints (capacity, temperature, parking, depot, window)...</p>
            </div>
          )}

          {loadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
              {loadError}
            </div>
          )}

          {candidates !== null && candidates.length === 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center flex flex-col items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <p className="text-sm font-bold text-amber-900">No Feasible Vehicle Available</p>
              <p className="text-xs text-amber-700 max-w-sm">
                All vehicles have exceeded capacity, violated temperature capability, parking constraints (e.g. van-only), or max trips/day limits.
              </p>
              {onOpenDefer && (
                <button
                  onClick={() => { onCancel(); onOpenDefer(); }}
                  className="mt-2 py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Defer Order with Reason Code
                </button>
              )}
            </div>
          )}

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

          {(candidates ?? []).map((c, i) => (
            <button
              key={`${c.vehicle.vehicleId}-${c.tripNo}`}
              onClick={() => setSelectedIndex(i)}
              className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                i === selectedIndex
                  ? 'border-orange-500 bg-orange-50/70 ring-2 ring-orange-400/20 shadow-xs'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-900">{c.vehicle.vehicleId} · Trip {c.tripNo}</span>
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                    c.vehicle.temp === 'reefer' ? 'bg-cyan-100 text-cyan-800' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {c.vehicle.temp}
                  </span>
                </div>
                {c.recommended && (
                  <span className="py-0.5 px-2 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded font-bold text-[10px] uppercase">
                    ★ Recommended
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500 mb-1">
                <span>{c.vehicle.type}</span>
                <span>•</span>
                <span>Max: {c.vehicle.weightCapKg} kg / {c.vehicle.volumeCapM3} m³</span>
                <span>•</span>
                <span>{c.vehicle.depot}</span>
              </div>

              {c.reasons && c.reasons.length > 0 && (
                <div className="text-[11px] text-gray-600 bg-white/80 p-2 rounded-md border border-gray-100 mt-1">
                  {c.reasons.join(' · ')}
                </div>
              )}
            </button>
          ))}

          {candidates && candidates.length > 0 && (
            <div className="mt-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for manual change (optional)</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all placeholder:text-gray-400"
                placeholder="E.g., reassigning for route proximity or priority scheduling..."
              />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center gap-3">
          {onOpenDefer ? (
            <button
              onClick={() => { onCancel(); onOpenDefer(); }}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
            >
              Defer Order instead
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onCancel} className="py-2 px-4 border border-gray-300 bg-white rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer">
              Cancel
            </button>
            <button
              disabled={!selected || isSaving}
              onClick={handleConfirm}
              className="py-2 px-5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
            >
              {isSaving ? 'Reassigning…' : 'Confirm Reassignment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
