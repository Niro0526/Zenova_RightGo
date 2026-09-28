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
    <aside className="hidden md:flex flex-col w-[240px] flex-shrink-0 bg-[#161A1D] text-white font-sans box-border fixed left-0 top-0 h-screen z-30 overflow-y-auto border-r border-[#1F262B]">
      {/* Logo area */}
      <div className="px-5 pt-7 pb-6 border-b border-[#232A2E]">
        <Logo subtitle="DISPATCHER" />
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        {DISPATCHER_NAV.map(({ href, label, icon }) => {
          const active = href === '/dispatcher'
            ? pathname === '/dispatcher'
            : pathname === href || pathname?.startsWith(href + '/');
          return <NavItem key={href} href={href} label={label} icon={icon} active={!!active} tone="dark" />;
        })}
      </nav>

      {/* Footer: role switcher + context */}
      <div className="px-5 pb-5 pt-4 border-t border-[#232A2E] flex flex-col gap-3">
        <RoleSwitcher active="dispatcher" />
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold text-[#F97316]">S1 · Peliyagoda</span>
          <span className="text-[10px] text-[#64748B]">Demo session · no live data</span>
        </div>
      </div>
    </aside>
  );
}
