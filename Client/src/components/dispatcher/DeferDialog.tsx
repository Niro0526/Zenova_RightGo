'use client';

import React, { useState } from 'react';
import type { DeferReasonCode } from '@/types/dispatcher';

const REASON_OPTIONS: { value: DeferReasonCode; label: string }[] = [
  { value: 'capacity', label: 'Capacity exhausted' },
  { value: 'vehicle_unavailable', label: 'Vehicle unavailable' },
  { value: 'access_constraint', label: 'Access / van-only constraint' },
  { value: 'outlet_closed', label: 'Outlet closed' },
  { value: 'time_budget', label: 'Trip time budget exceeded' },
  { value: 'other', label: 'Other' },
];

export default function DeferDialog({
  orderRef,
  onCancel,
  onConfirm,
}: {
  orderRef: string;
  onCancel: () => void;
  onConfirm: (reasonCode: DeferReasonCode, note: string) => void;
}) {
  const [reasonCode, setReasonCode] = useState<DeferReasonCode>('capacity');
  const [note, setNote] = useState('');
  const requiresNote = reasonCode === 'other';
  const canSubmit = !requiresNote || note.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl w-[440px] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h2 className="font-bold text-xl text-gray-900">Defer Order</h2>
          <p className="text-sm text-gray-500 mt-1">Order {orderRef} will be removed from the active queue.</p>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Reason <span className="text-red-500">*</span></label>
            <select
              value={reasonCode}
              onChange={e => setReasonCode(e.target.value as DeferReasonCode)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              {REASON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Note {requiresNote && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
              rows={3}
              placeholder="E.g., outlet closed early, insufficient reefer capacity..."
            />
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button onClick={onCancel} className="py-2 px-4 border border-gray-300 bg-white rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => onConfirm(reasonCode, note.trim())}
            className="py-2 px-6 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white transition-colors"
          >
            Submit Deferral
          </button>
        </div>
      </div>
    </div>
  );
}
