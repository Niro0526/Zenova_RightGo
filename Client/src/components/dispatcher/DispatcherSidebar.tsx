'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const IconDashboard = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
const IconList = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
const IconCalendar = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const IconClipboard = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>;
const IconDatabase = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>;
const IconPlay = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>;
const IconBarChart = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;
const IconChevron = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>;

const NAV_ITEMS = [
  { href: '/dispatcher', label: 'Dashboard', Icon: IconDashboard, exact: true },
  { href: '/dispatcher/orders', label: 'Confirmed Orders', Icon: IconList, exact: false },
  { href: '/dispatcher/planning', label: 'Planning', Icon: IconCalendar, exact: false },
  { href: '/dispatcher/plan-review', label: 'Plan Review', Icon: IconClipboard, exact: false },
  { href: '/dispatcher/decision-ledger', label: 'Decision Ledger', Icon: IconDatabase, exact: false },
  { href: '/dispatcher/live-operations', label: 'Live Operations', Icon: IconPlay, exact: false },
  { href: '/dispatcher/future-capacity', label: 'Future Capacity', Icon: IconBarChart, exact: false },
];

export default function DispatcherSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-[280px] bg-[#171c21] text-white py-8 px-5 flex-shrink-0 font-sans box-border h-screen sticky top-0 overflow-y-auto">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h4l3-9 5 18 3-9h5"/></svg>
        </div>
        <div className="flex flex-col">
          <h2 className="font-bold text-[20px] text-white m-0 leading-none">Waypoint Pulse</h2>
          <span className="font-semibold text-[10px] text-gray-400 mt-1.5 tracking-wider uppercase">Core Logistics Engine</span>
        </div>
      </div>

      <div className="flex items-center p-3 bg-[#282f37] rounded-xl mb-8 gap-3">
        <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center font-semibold text-sm text-gray-200 flex-shrink-0">SJ</div>
        <div className="flex flex-col gap-0.5">
          <p className="font-semibold text-sm text-white m-0">Sarah Jenkins</p>
          <span className="bg-orange-500 text-white text-[10px] font-bold py-[2px] px-1.5 rounded w-fit uppercase">Dispatcher</span>
        </div>
      </div>

      <nav className="flex flex-col gap-2">
        {NAV_ITEMS.map(({ href, label, Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname === href || pathname?.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-row items-center p-3 rounded-lg gap-3 font-medium text-sm cursor-pointer transition-all duration-200 no-underline ${
                isActive ? 'bg-orange-500 text-white hover:bg-orange-600' : 'text-gray-400 hover:bg-[#282f37] hover:text-white'
              }`}
            >
              <Icon /> {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-[#282f37] flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          <span className="font-semibold text-[10px] text-gray-400 uppercase tracking-wider">Demo Switcher</span>
        </div>
        <button
          type="button"
          onClick={() => alert('Dispatcher is the active role for this console.')}
          className="flex flex-row justify-between items-center py-2.5 px-3.5 bg-[#282f37] border border-[#333c46] rounded-lg text-white font-medium text-[13px] cursor-pointer hover:bg-[#333c46] transition-colors"
        >
          <span>Switch to Dispatcher</span>
          <IconChevron />
        </button>
        <span className="text-[11px] text-gray-500">v2.4.12 · Peliyagoda Depot</span>
      </div>
    </aside>
  );
}
