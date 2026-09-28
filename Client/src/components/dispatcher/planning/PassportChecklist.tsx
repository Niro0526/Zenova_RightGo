'use client';

import React, { useState } from 'react';

export type ChecklistRow = {
  kind: 'checker_pass' | 'checker_fail' | 'unverified';
  group: 'checker' | 'operational';
  label: string;
  detail: string;
};

type Bucket = 'blocked' | 'warning' | 'notVerified' | 'passed';

function bucketOf(row: ChecklistRow): Bucket {
  if (row.kind === 'checker_pass') return 'passed';
  if (row.kind === 'unverified') return 'notVerified';
  return row.group === 'checker' ? 'blocked' : 'warning'; // checker_fail
}

const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const AlertIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const GapIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;

const BUCKET_STYLE: Record<Bucket, { label: string; badgeClass: string; iconBg: string; icon: React.ReactNode }> = {
  blocked: { label: 'Blocked', badgeClass: 'bg-red-100 text-red-700', iconBg: 'bg-red-100 text-red-600', icon: <AlertIcon /> },
  warning: { label: 'Warning', badgeClass: 'bg-amber-100 text-amber-700', iconBg: 'bg-amber-100 text-amber-600', icon: <AlertIcon /> },
  notVerified: { label: 'Not verified', badgeClass: 'bg-gray-200 text-gray-600', iconBg: 'bg-gray-200 text-gray-500', icon: <GapIcon /> },
  passed: { label: 'Passed', badgeClass: 'bg-green-100 text-green-700', iconBg: 'bg-green-100 text-green-600', icon: <CheckIcon /> },
};

/**
 * Shared blockers-first checklist renderer, used both for a single candidate's
 * PassportResult.results and for the whole-plan PlanCheckRow[]. Pure UI
 * reorganization of validation.ts's kind/group data — never invents a
 * pass/fail verdict of its own. A row never renders as Passed unless its
 * source kind is literally 'checker_pass'.
 */
export default function PassportChecklist({ rows, emptyLabel = 'No checks to show.' }: { rows: ChecklistRow[]; emptyLabel?: string }) {
  const [showPassed, setShowPassed] = useState(false);

  if (rows.length === 0) {
    return <p className="text-sm text-gray-400">{emptyLabel}</p>;
  }

  const buckets: Record<Bucket, ChecklistRow[]> = { blocked: [], warning: [], notVerified: [], passed: [] };
  for (const row of rows) buckets[bucketOf(row)].push(row);

  const orderedNonPassed: { bucket: Bucket; row: ChecklistRow }[] = [
    ...buckets.blocked.map((row) => ({ bucket: 'blocked' as const, row })),
    ...buckets.warning.map((row) => ({ bucket: 'warning' as const, row })),
    ...buckets.notVerified.map((row) => ({ bucket: 'notVerified' as const, row })),
  ];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-[#485563]">
        {buckets.passed.length} passed · {buckets.warning.length} warning{buckets.warning.length === 1 ? '' : 's'} · {buckets.blocked.length} blocked · {buckets.notVerified.length} not verified
      </p>

      {orderedNonPassed.map(({ bucket, row }, i) => <ChecklistRowItem key={`${bucket}-${i}`} bucket={bucket} row={row} />)}

      {buckets.passed.length > 0 && (
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => setShowPassed((s) => !s)} className="self-start text-xs font-semibold text-[#F97316] hover:underline">
            {showPassed ? 'Hide' : 'View'} checks ({buckets.passed.length} passed)
          </button>
          {showPassed && buckets.passed.map((row, i) => <ChecklistRowItem key={`passed-${i}`} bucket="passed" row={row} />)}
        </div>
      )}
    </div>
  );
}

function ChecklistRowItem({ bucket, row }: { bucket: Bucket; row: ChecklistRow }) {
  const style = BUCKET_STYLE[bucket];
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded ${style.iconBg}`}>{style.icon}</div>
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase text-gray-500">{row.label}</span>
          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${style.badgeClass}`}>{style.label}</span>
          <span className="text-[9px] uppercase text-gray-400">{row.group}</span>
        </div>
        <span className="text-xs font-medium text-gray-900">{row.detail}</span>
      </div>
    </div>
  );
}
