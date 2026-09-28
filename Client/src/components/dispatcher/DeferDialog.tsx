'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { DeferReasonCode } from '@/types/dispatcher';

const REASON_OPTIONS: { value: DeferReasonCode; label: string }[] = [
  { value: 'capacity', label: 'Capacity exhausted' },
  { value: 'vehicle_unavailable', label: 'Vehicle unavailable' },
  { value: 'access_constraint', label: 'Access / van-only constraint' },
  { value: 'outlet_closed', label: 'Outlet closed' },
  { value: 'time_budget', label: 'Trip time budget exceeded' },
  { value: 'other', label: 'Other operational constraint' },
];

export default function DeferDialog({
  orderRef,
  initialReasonCode = 'capacity',
  onCancel,
  onConfirm,
}: {
  orderRef: string;
  initialReasonCode?: DeferReasonCode;
  onCancel: () => void;
  onConfirm: (reasonCode: DeferReasonCode, note: string) => void;
}) {
  const [reasonCode, setReasonCode] = useState<DeferReasonCode>(initialReasonCode);
  const [note, setNote] = useState('');
  const requiresNote = reasonCode === 'other';
  const canSubmit = !requiresNote || note.trim().length > 0;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl w-full max-w-[440px] max-h-[90vh] flex flex-col shadow-xl border border-[#CBD5E1] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="defer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h2 id="defer-title" className="font-bold text-base text-[#202D2D] m-0">Defer Order</h2>
            <p className="text-xs text-[#64748B] mt-0.5 m-0">Order {orderRef} will be deferred to next cycle.</p>
          </div>
          <button
            onClick={onCancel}
            className="text-[#64748B] hover:text-[#202D2D] p-1 rounded"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-[#485563] mb-1">
              Operational Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={reasonCode}
              onChange={e => setReasonCode(e.target.value as DeferReasonCode)}
              className="w-full border border-[#CBD5E1] rounded-lg p-2 text-xs text-[#202D2D] outline-none focus:border-[#F97316]"
            >
              {REASON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#485563] mb-1">
              Justification Note {requiresNote && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full border border-[#CBD5E1] rounded-lg p-2.5 text-xs text-[#202D2D] focus:border-[#F97316] outline-none resize-none"
              rows={3}
              placeholder="Provide specific notes regarding dock, schedule, or fleet status..."
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
            disabled={!canSubmit}
            onClick={() => onConfirm(reasonCode, note.trim())}
            className="py-1.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed rounded-lg text-xs font-semibold text-white transition-colors shadow-xs"
          >
            Confirm Deferral
          </button>
        </div>
      </div>
    </div>
  );
}
