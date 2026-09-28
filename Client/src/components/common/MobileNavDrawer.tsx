'use client';

import { useState } from 'react';
import type { ComponentType } from 'react';
import Logo from '@/components/common/Logo';
import NavItem from '@/components/common/NavItem';

export interface MobileNavDrawerItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
  /** Caller supplies this explicitly (same way each role's own sidebar already computes it) — this component never guesses active state from pathname, since some roles navigate via client-side view state, not routes. */
  active: boolean;
  /** Provide for roles that switch views in-memory rather than via real routes (e.g. Store Manager). Omit for real-route roles — NavItem renders a real <Link> in that case. */
  onClick?: () => void;
}

/**
 * Mobile-only (<md) sticky top bar with a hamburger that opens a slide-in
 * drawer reusing the same NavItem list each role's desktop sidebar already
 * renders — no duplicated nav config. Only used by roles with no existing
 * working mobile navigation (Dispatcher, Store Manager); Loader and Driver
 * already have a working bottom tab bar and are untouched by this.
 */
export default function MobileNavDrawer({ items }: { items: MobileNavDrawerItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#E2E8F0] bg-white px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={open}
          className="flex h-11 w-11 -ml-2 items-center justify-center rounded-lg text-[#202D2D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
        </button>
        <Logo tone="light" />
        <span className="h-9 w-9 rounded-full bg-gray-100" aria-hidden="true" />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="relative flex h-full w-[280px] flex-col overflow-y-auto bg-[#161A1D] p-5" role="dialog" aria-modal="true" aria-label="Navigation">
            <div className="mb-6 flex items-center justify-between">
              <Logo tone="dark" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <nav className="flex flex-col gap-2">
              {items.map(item => (
                // Closes the drawer on any click, Link-based or onClick-based, via bubbling — avoids forcing NavItem into one navigation mode.
                <div key={item.href} onClick={() => setOpen(false)}>
                  <NavItem href={item.href} label={item.label} icon={item.icon} active={item.active} tone="dark" onClick={item.onClick} />
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
