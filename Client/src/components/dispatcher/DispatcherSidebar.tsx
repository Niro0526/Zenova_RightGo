'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Logo from '@/components/common/Logo';
import NavItem from '@/components/common/NavItem';
import { DISPATCHER_NAV } from './nav';

export default function DispatcherSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-full md:w-[240px] bg-[#161A1D] text-white py-0 flex-shrink-0 font-sans box-border md:h-screen md:sticky md:top-0 overflow-y-auto">
      <div className="h-[65px] bg-white border-b border-gray-200 flex items-center gap-2 px-5 mb-8 overflow-hidden">
        <img src="/icons/logo.png" alt="RightGo Logo" className="h-14 w-14 object-contain scale-[1.3] flex-shrink-0" />
        <div className="h-5 w-px bg-gray-300 mx-1"></div>
        <span className="font-bold text-[20px] tracking-tight leading-none mt-1">
          <span className="text-[#161A1D]">Right</span><span className="text-orange-500">Go</span>
        </span>
      </div>

      <nav className="flex flex-col gap-2 px-5 pb-8">
        {DISPATCHER_NAV.map(({ href, label, icon }) => {
          const active = href === '/dispatcher' ? pathname === '/dispatcher' : pathname === href || pathname?.startsWith(href + '/');
          return <NavItem key={href} href={href} label={label} icon={icon} active={!!active} tone="dark" />;
        })}
      </nav>
    </aside>
  );
}
