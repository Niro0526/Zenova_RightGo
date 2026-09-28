'use client';

import React, { useMemo, useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';
import type { DecisionLedgerAction } from '@/types/dispatcher';

const SearchIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const CalendarIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;

type TabKey = 'All Decisions' | 'Deferrals Only' | 'Assignments' | 'Reassignments' | 'Resequenced';
const TABS: { key: TabKey; match: (d: DecisionLedgerAction) => boolean }[] = [
  { key: 'All Decisions', match: () => true },
  { key: 'Deferrals Only', match: d => d === 'deferred' },
  { key: 'Assignments', match: d => d === 'assigned' },
  { key: 'Reassignments', match: d => d === 'reassigned' },
  { key: 'Resequenced', match: d => d === 'resequenced' },
];

const ACTION_STYLE: Record<DecisionLedgerAction, string> = {
  deferred: 'text-[#F97316]',
  reassigned: 'text-[#10B981]',
  assigned: 'text-[#485563]',
  published: 'text-blue-600',
  resequenced: 'text-purple-600',
};

export default function DecisionLedger() {
  const { ledger, draftRevision } = useDispatcherPlan();
  const [tab, setTab] = useState<TabKey>('All Decisions');
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');

  const rows = useMemo(() => {
    const tabDef = TABS.find(t => t.key === tab)!;
    let list = ledger.filter(d => tabDef.match(d.action));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(d => d.orderRef.toLowerCase().includes(q) || d.outletId.toLowerCase().includes(q));
    }
    return list;
  }, [ledger, tab, search]);

  return (
    <div className="flex flex-col flex-1 p-6 md:p-10 gap-6 w-full max-w-[1300px] mx-auto bg-[#F9FAFB] font-sans">

      <PageHeader
        title="Decision Ledger"
        subtitle={`S1 Peak Day · Draft revision ${draftRevision} · Append-only session-local decision history — ${ledger.length} entries recorded this session`}
        actions={
          <>
            <div className="flex flex-row items-center py-2 px-3 gap-2 bg-white border border-[#CBD5E1] rounded-lg">
              <SearchIcon />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order or outlet..." className="border-none outline-none font-sans text-sm text-[#485563] w-[160px]" />
            </div>
            <div className="flex flex-row items-center py-2 px-3 gap-2 bg-white border border-[#CBD5E1] rounded-lg" title="Date filtering is not applicable — every entry is from this session only">
              <CalendarIcon />
              <input value={date} onChange={e => setDate(e.target.value)} type="date" className="border-none outline-none font-sans text-sm text-[#485563]" disabled />
            </div>
          </>
        }
      />

      {/* Tabs */}
      <div className="flex flex-row gap-3 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`py-1.5 px-4 rounded-full border font-semibold text-[13px] transition-colors ${tab === t.key ? 'bg-[#F97316] border-[#F97316] text-white shadow-sm' : 'bg-white border-[#CBD5E1] text-[#485563] hover:bg-gray-50'}`}
          >
            {t.key}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#CBD5E1] rounded-[10px] overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="bg-[#F9FAFB] border-b border-[#CBD5E1]">
            <tr>
              <th className="py-3.5 px-5 font-bold text-[11px] text-[#485563] uppercase">Order ID</th>
              <th className="py-3.5 px-5 font-bold text-[11px] text-[#485563] uppercase">Outlet ID</th>
              <th className="py-3.5 px-5 font-bold text-[11px] text-[#485563] uppercase">Decision</th>
              <th className="py-3.5 px-5 font-bold text-[11px] text-[#485563] uppercase">Reason</th>
              <th className="py-3.5 px-5 font-bold text-[11px] text-[#485563] uppercase">Decision Maker</th>
              <th className="py-3.5 px-5 font-bold text-[11px] text-[#485563] uppercase">Time</th>
              <th className="py-3.5 px-5 font-bold text-[11px] text-[#485563] uppercase">Previous Assignment</th>
              <th className="py-3.5 px-5 font-bold text-[11px] text-[#485563] uppercase">Updated Assignment</th>
              <th className="py-3.5 px-5 font-bold text-[11px] text-[#485563] uppercase">Plan Version</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className={`border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC] ${d.action === 'deferred' ? 'bg-[#FFF9F2]' : d.action === 'reassigned' ? 'bg-[#F0FDF4]' : ''}`}>
                <td className="py-3.5 px-5 font-bold text-sm text-[#202D2D]">{d.orderRef}</td>
                <td className="py-3.5 px-5 text-sm text-[#485563]">{d.outletId}</td>
                <td className={`py-3.5 px-5 font-bold text-sm capitalize ${ACTION_STYLE[d.action]}`}>{d.action}</td>
                <td className="py-3.5 px-5 text-sm text-[#485563] max-w-[260px]">{d.reasonCode ? `${d.reasonCode}${d.reasonNote ? ` — ${d.reasonNote}` : ''}` : (d.reasonNote ?? '-')}</td>
                <td className="py-3.5 px-5 text-sm text-[#485563]">{d.decisionMaker}</td>
                <td className="py-3.5 px-5 text-sm text-[#485563]">{d.time}</td>
                <td className="py-3.5 px-5 text-sm text-[#485563]">{d.previousAssignment}</td>
                <td className="py-3.5 px-5 text-sm text-[#485563]">{d.updatedAssignment}</td>
                <td className="py-3.5 px-5 text-sm text-[#485563]">v{d.planVersion}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="py-10 text-center text-gray-400 text-sm font-medium">No decisions recorded yet this session — go to Planning to assign or defer orders.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
