'use client';

import React from 'react';
import { Search, Snowflake, Sun, X } from 'lucide-react';
import type { S1Order } from '@/types/dispatcher';

const BRAND_PILL: Record<string, string> = {
  Fresh: 'bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0]',
  Tech: 'bg-[#F3E8FF] text-[#8B5CF6] border border-[#DDD6FE]',
  Style: 'bg-[#FFF4ED] text-[#F97316] border border-[#FED7AA]',
};

export default function QueueStage({
  queue,
  selectedRef,
  search,
  onSearchChange,
  onSelect,
}: {
  queue: S1Order[];
  selectedRef: string | null;
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (ref: string) => void;
}) {
  return (
    <div className="w-full md:w-[280px] lg:w-[290px] flex-shrink-0 h-full overflow-y-auto bg-white p-3 flex flex-col gap-2.5 border-r border-[#E2E8F0]">
      {/* Title & Count */}
      <div className="flex items-center justify-between px-1">
        <h2 className="m-0 font-bold text-xs uppercase tracking-wider text-[#64748B]">
          Unallocated Queue
        </h2>
        <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-700 tabular-nums">
          {queue.length}
        </span>
      </div>

      {/* Search Input */}
      <div className="flex w-full items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 focus-within:border-[#F97316] transition-colors">
        <Search size={13} className="text-[#94A3B8] flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          type="text"
          placeholder="Filter queue..."
          className="w-full border-none font-sans text-xs text-[#202D2D] outline-none bg-transparent placeholder-[#94A3B8]"
        />
        {search && (
          <button onClick={() => onSearchChange('')} className="text-[#94A3B8] hover:text-[#485563]">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Orders List */}
      <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 pr-0.5">
        {queue.map((q) => {
          const isSelected = selectedRef === q.orderRef;
          return (
            <div
              key={q.orderRef}
              onClick={() => onSelect(q.orderRef)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(q.orderRef); }}
              role="button"
              tabIndex={0}
              aria-selected={isSelected}
              className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-2.5 transition-all text-left ${
                isSelected
                  ? 'border-[#F97316] bg-[#FFF4ED] shadow-xs ring-1 ring-[#F97316]/50'
                  : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#202D2D] tabular-nums">{q.orderRef}</span>
                <span className={`rounded px-1.5 py-0.2 text-[9px] font-semibold uppercase ${BRAND_PILL[q.brand]}`}>
                  {q.brand}
                </span>
              </div>
              <div className="line-clamp-1 text-xs font-medium text-[#485563]">
                {q.outletId} · <span className="text-[#64748B]">{q.district}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#64748B] mt-0.5 pt-1 border-t border-gray-100/80">
                <div className="flex items-center gap-1">
                  {q.tempRequirement === 'chilled' ? (
                    <span className="inline-flex items-center gap-0.5 text-[#10B981] font-medium">
                      <Snowflake size={11} /> Chilled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[#64748B]">
                      <Sun size={11} /> Ambient
                    </span>
                  )}
                </div>
                <span className="tabular-nums font-medium text-[#485563]">
                  {q.orderWeightKg.toFixed(0)}kg · {q.orderVolumeM3.toFixed(2)}m³
                </span>
              </div>
            </div>
          );
        })}
        {queue.length === 0 && (
          <div className="p-6 text-center text-xs text-[#94A3B8]">
            {search ? 'No orders match search.' : 'All orders assigned or deferred.'}
          </div>
        )}
      </div>
    </div>
  );
}
