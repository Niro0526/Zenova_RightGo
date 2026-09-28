'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Logo from '@/components/common/Logo';
import NavItem from '@/components/common/NavItem';
import { DISPATCHER_NAV } from './nav';

export default function DispatcherSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-full md:w-[240px] bg-[#161A1D] text-white py-8 px-5 flex-shrink-0 font-sans box-border md:h-screen md:sticky md:top-0 overflow-y-auto">
      <div className="mb-8">
        <Logo subtitle="Core Logistics Engine" href="/" />
      </div>

      <nav className="flex flex-col gap-2">
        {DISPATCHER_NAV.map(({ href, label, icon }) => {
          const active = href === '/dispatcher' ? pathname === '/dispatcher' : pathname === href || pathname?.startsWith(href + '/');
          return <NavItem key={href} href={href} label={label} icon={icon} active={!!active} tone="dark" />;
        })}
      </nav>
    </aside>
  );
}
