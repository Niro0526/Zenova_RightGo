'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Logo from '@/components/common/Logo';
import NavItem from '@/components/common/NavItem';
import RoleSwitcher from '@/components/common/RoleSwitcher';
import { DISPATCHER_NAV } from './nav';

export default function DispatcherSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-full md:w-[280px] bg-[#171c21] text-white py-8 px-5 flex-shrink-0 font-sans box-border md:h-screen md:sticky md:top-0 overflow-y-auto">
      <div className="mb-10">
        <Logo subtitle="Core Logistics Engine" />
      </div>

      <div className="flex items-center p-3 bg-[#282f37] rounded-xl mb-8 gap-3">
        <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center font-semibold text-sm text-gray-200 flex-shrink-0">SJ</div>
        <div className="flex flex-col gap-0.5">
          <p className="font-semibold text-sm text-white m-0">Sarah Jenkins</p>
          <span className="bg-orange-500 text-white text-[10px] font-bold py-[2px] px-1.5 rounded w-fit uppercase">Dispatcher</span>
        </div>
      </div>

      <nav className="flex flex-col gap-2">
        {DISPATCHER_NAV.map(({ href, label, icon }) => {
          const active = href === '/dispatcher' ? pathname === '/dispatcher' : pathname === href || pathname?.startsWith(href + '/');
          return <NavItem key={href} href={href} label={label} icon={icon} active={!!active} tone="dark" />;
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-[#282f37] flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          <span className="font-semibold text-[10px] text-gray-400 uppercase tracking-wider">Demo Switcher</span>
        </div>
        <RoleSwitcher active="dispatcher" />
        <span className="text-[11px] text-gray-500">v2.4.12 · Peliyagoda Depot</span>
        <span className="text-[10px] text-gray-600 leading-snug">Session-local demo data — resets on refresh. No backend is connected.</span>
      </div>
    </aside>
  );
}
