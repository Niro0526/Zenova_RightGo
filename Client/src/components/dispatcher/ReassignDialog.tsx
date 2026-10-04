'use client';

import React, { useEffect, useState } from 'react';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';
import type { RankedCandidate } from '@/lib/api/dispatcher';

export default function ReassignDialog({
  orderRef,
  onCancel,
  onDone,
}: {
  orderRef: string;
  onCancel: () => void;
  onDone: () => void;
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
      .catch(() => { if (!cancelled) setLoadError('Could not load candidate vehicles.'); });
    return () => { cancelled = true; };
  }, [orderRef, compatibleCandidates]);

  async function handleConfirm() {
    if (!selected) return;
    const ok = await reassignOrder(orderRef, selected.vehicle.vehicleId, selected.tripNo, note.trim() || 'Reassigned from Plan Review');
    if (ok) onDone();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-xl w-full max-w-[520px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h2 className="font-bold text-xl text-gray-900">Change vehicle / trip</h2>
          <p className="text-sm text-gray-500 mt-1">{orderRef}{order ? ` · ${order.outletId} (${order.brand}, ${order.district})` : ''}</p>
        </div>
        <div className="p-5 flex flex-col gap-3 overflow-y-auto">
          {candidates === null && !loadError && (
            <p className="text-sm text-gray-400">Loading compatible vehicles…</p>
          )}
          {loadError && <p className="text-sm text-red-600">{loadError}</p>}
          {candidates !== null && candidates.length === 0 && (
            <p className="text-sm text-red-600">No compatible available vehicle/trip found for this order — defer it instead.</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {(candidates ?? []).map((c, i) => (
            <button
              key={`${c.vehicle.vehicleId}-${c.tripNo}`}
              onClick={() => setSelectedIndex(i)}
              className={`text-left p-3 rounded-lg border transition-colors ${i === selectedIndex ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-gray-900">{c.vehicle.vehicleId} · Trip {c.tripNo}</span>
                {c.recommended && <span className="py-0.5 px-2 bg-green-100 text-green-700 rounded font-bold text-[10px] uppercase">Recommended</span>}
              </div>
              <span className="text-xs text-gray-500">{c.vehicle.type} · {c.vehicle.temp} · {c.vehicle.weightCapKg} kg / {c.vehicle.volumeCapM3} m³</span>
              {c.reasons.length > 0 && <p className="text-[11px] text-gray-500 mt-1">{c.reasons.join('; ')}</p>}
            </button>
          ))}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Reason for change (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500" placeholder="E.g., original vehicle needed for a higher-priority order..." />
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button onClick={onCancel} className="py-2 px-4 border border-gray-300 bg-white rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            disabled={!selected || isSaving}
            onClick={handleConfirm}
            className="py-2 px-6 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white transition-colors"
          >
            {isSaving ? 'Confirming…' : 'Confirm reassignment'}
          </button>
        </div>
      </div>
    </div>
  );
}
