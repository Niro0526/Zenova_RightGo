'use client';

import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';

export default function ReassignDialog({
  orderRef,
  onCancel,
  onDone,
}: {
  orderRef: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  const { orders, compatibleCandidates, reassignOrder } = useDispatcherPlan();
  const order = orders.find(o => o.orderRef === orderRef);
  const candidates = compatibleCandidates(orderRef);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [note, setNote] = useState('');
  const selected = candidates[selectedIndex];

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  function handleConfirm() {
    if (!selected) return;
    reassignOrder(orderRef, selected.vehicle.vehicleId, selected.tripNo, note.trim() || 'Reassigned from Plan Review');
    onDone();
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl w-full max-w-[500px] max-h-[85vh] flex flex-col shadow-xl border border-[#CBD5E1] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reassign-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h2 id="reassign-title" className="font-bold text-base text-[#202D2D] m-0">Change Vehicle / Trip</h2>
            <p className="text-xs text-[#64748B] mt-0.5 m-0">
              {orderRef}{order ? ` · ${order.outletId} (${order.brand}, ${order.district})` : ''}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-[#64748B] hover:text-[#202D2D] p-1 rounded"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3 overflow-y-auto">
          {candidates.length === 0 ? (
            <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 m-0">
              No compatible available vehicle found for this order. Consider deferral.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Compatible Targets ({candidates.length})
              </span>
              {candidates.map((c, i) => (
                <button
                  key={`${c.vehicle.vehicleId}-${c.tripNo}`}
                  onClick={() => setSelectedIndex(i)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    i === selectedIndex
                      ? 'border-[#F97316] bg-[#FFF4ED] shadow-xs'
                      : 'border-[#E2E8F0] hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#202D2D]">
                      {c.vehicle.vehicleId} · Trip {c.tripNo}
                    </span>
                    {c.recommended && (
                      <span className="py-0.5 px-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold uppercase">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#64748B] mt-0.5 tabular-nums">
                    {c.vehicle.type} · {c.vehicle.temp} · {c.vehicle.weightCapKg} kg / {c.vehicle.volumeCapM3} m³
                  </div>
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#485563] mb-1">Reason for Reassignment</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="w-full border border-[#CBD5E1] rounded-lg p-2.5 text-xs text-[#202D2D] outline-none focus:border-[#F97316] resize-none"
              placeholder="E.g., route optimization, vehicle load balance..."
            />
          </div>
        </div>

        <div className="p-3.5 border-t border-[#E2E8F0] bg-[#FAFAFA] flex justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="py-1.5 px-3.5 border border-[#CBD5E1] bg-white rounded-lg text-xs font-semibold text-[#485563] hover:bg-[#F8FAFC]"
          >
            Cancel
          </button>
          <button
            disabled={!selected}
            onClick={handleConfirm}
            className="py-1.5 px-4 bg-[#F97316] hover:bg-[#EA580C] disabled:bg-[#CBD5E1] disabled:cursor-not-allowed rounded-lg text-xs font-semibold text-white transition-colors shadow-xs"
          >
            Confirm Reassignment
          </button>
        </div>
      </div>
    </div>
  );
}
