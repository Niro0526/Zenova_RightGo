'use client';

import { useState } from 'react';
import { Bell, ChevronDown, X, Check } from 'lucide-react';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const ACTION_LABEL: Record<string, string> = {
  assigned: 'Order assigned',
  deferred: 'Order deferred',
  reassigned: 'Order reassigned',
  published: 'Plan released',
  resequenced: 'Stops resequenced',
};

const ACTION_HREF: Record<string, string> = {
  assigned: '/dispatcher/planning',
  deferred: '/dispatcher/planning',
  reassigned: '/dispatcher/planning',
  published: '/dispatcher/live-operations',
  resequenced: '/dispatcher/planning',
};

/** Sticky topbar — sourced entirely from real session state. No live sync badge. */
export default function DispatcherTopbar() {
  const { ledger, draftRevision, releasedManifests, counts } = useDispatcherPlan();
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const recent = ledger.slice(0, 6);
  const lastManifest = releasedManifests[releasedManifests.length - 1];
  const isReleased = !!lastManifest;

  // Determine page title for breadcrumb
  const pageTitles: Record<string, string> = {
    '/dispatcher': 'Overview',
    '/dispatcher/orders': 'Orders',
    '/dispatcher/planning': 'Planning',
    '/dispatcher/live-operations': 'Operations',
    '/dispatcher/stock': 'Stock',
    '/dispatcher/future-capacity': 'Capacity',
  };
  const currentPage = pageTitles[pathname ?? ''] ?? '';

  return (
    <>
      <header className="sticky top-0 z-20 hidden h-[60px] flex-shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-6 md:flex gap-4">
        {/* Left: run context */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-[#485563] flex-shrink-0">
            <span className="font-bold text-[#202D2D]">S1 · Peliyagoda</span>
          </div>
          {isReleased ? (
            <span className="flex items-center gap-1.5 rounded-md border border-[#10B981] bg-[#ECFDF5] px-2.5 py-1 text-xs font-semibold text-[#065F46]">
              <Check size={12} />
              Released v{lastManifest.revision}
            </span>
          ) : (
            <span className="rounded-md border border-[#F97316] bg-[#FFF4ED] px-2.5 py-1 text-xs font-semibold text-[#F97316]">
              Draft · v{draftRevision}
            </span>
          )}
          {counts.unresolved > 0 && (
            <Link
              href="/dispatcher/planning"
              title="Click to resolve pending orders in Planning"
              className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-[#FFFBEB] px-2.5 py-1 text-xs font-semibold text-amber-800 no-underline hover:bg-amber-100 transition-colors"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              {counts.unresolved} unresolved
            </Link>
          )}
        </div>

        {/* Right: notifications + profile */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => { setShowNotifications((s) => !s); setShowProfile(false); }}
              title="Notifications"
              aria-label="Notifications"
              aria-expanded={showNotifications}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#485563] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
            >
              <Bell size={16} />
              {recent.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full border border-white bg-[#F97316]" />}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-[100] w-[320px] overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                  <span className="text-xs font-bold text-[#202D2D]">Notifications</span>
                  <button onClick={() => setShowNotifications(false)} className="text-[#64748B] hover:text-[#202D2D] p-1 rounded" aria-label="Close notifications"><X size={14} /></button>
                </div>
                <div className="max-h-[260px] overflow-y-auto">
                  {recent.length === 0 ? (
                    <div className="py-8 px-4 text-center text-xs text-[#64748B]">No new notifications</div>
                  ) : (
                    recent.map((entry) => (
                      <Link
                        key={entry.id}
                        href={ACTION_HREF[entry.action] ?? '/dispatcher'}
                        onClick={() => setShowNotifications(false)}
                        className="flex items-start gap-3 border-b border-[#F1F5F9] px-4 py-2.5 last:border-0 hover:bg-[#F8FAFC] no-underline transition-colors"
                      >
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#F97316] mt-1.5" />
                        <div>
                          <div className="text-xs font-semibold text-[#202D2D]">{ACTION_LABEL[entry.action] ?? entry.action} — {entry.orderRef}</div>
                          <div className="text-[11px] text-[#64748B]">{entry.outletId} · {entry.time}</div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
                <div className="border-t border-[#E2E8F0] px-4 py-2 text-[11px] text-[#64748B] bg-[#FAFAFA]">
                  Session activity ledger
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => { setShowProfile(true); setShowNotifications(false); }}
            className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white py-1 pl-1.5 pr-3 transition-colors hover:bg-[#F8FAFC]"
            aria-label="User profile"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F97316] text-[11px] font-bold text-white">DP</span>
            <span className="flex flex-col text-left leading-tight">
              <span className="text-xs font-semibold text-[#202D2D]">Dispatcher</span>
              <span className="text-[11px] text-[#64748B]">Peliyagoda</span>
            </span>
            <ChevronDown size={14} className="text-[#94A3B8]" />
          </button>
        </div>
      </header>

      {showProfile && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          role="presentation"
          onClick={() => setShowProfile(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowProfile(false); }}
        >
          <div className="w-full max-w-[360px] overflow-hidden rounded-xl border border-[#CBD5E1] bg-white shadow-xl animate-in fade-in zoom-in-95 duration-150" role="dialog" aria-modal="true" aria-label="Dispatcher Profile" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
              <h3 className="m-0 text-base font-bold text-[#202D2D]">Dispatcher Profile</h3>
              <button type="button" onClick={() => setShowProfile(false)} aria-label="Close" className="text-[#64748B] hover:text-[#202D2D] p-1"><X size={16} /></button>
            </div>
            <div className="flex flex-col gap-3 p-5 text-sm">
              <div className="flex justify-between"><span className="text-[#64748B]">Role</span><span className="font-semibold text-[#202D2D]">Dispatcher</span></div>
              <div className="flex justify-between"><span className="text-[#64748B]">Depot</span><span className="font-semibold text-[#202D2D]">S1 · Peliyagoda</span></div>
              <div className="flex justify-between"><span className="text-[#64748B]">Session</span><span className="font-semibold text-[#202D2D]">Local Session</span></div>
              <div className="mt-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-3 text-xs text-[#64748B] leading-relaxed">
                Operating under S1 Dispatcher context. State changes are maintained within this session.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
