'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import Logo from '@/components/common/Logo';
import NavItem from '@/components/common/NavItem';
import { DISPATCHER_NAV } from './nav';
import { useAuth } from '@/context/AuthContext';

export default function DispatcherSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="hidden md:flex flex-col justify-between w-full md:w-[240px] bg-[#161A1D] text-white py-8 px-5 flex-shrink-0 font-sans box-border md:h-screen md:sticky md:top-0 overflow-y-auto">
      <div>
        <div className="mb-8">
          <Logo subtitle="Dispatcher Console" href="/" />
        </div>

        <nav className="flex flex-col gap-2">
          {DISPATCHER_NAV.map(({ href, label, icon }) => {
            const active = href === '/dispatcher' ? pathname === '/dispatcher' : pathname === href || pathname?.startsWith(href + '/');
            return <NavItem key={href} href={href} label={label} icon={icon} active={!!active} tone="dark" />;
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-[#232A2E] mt-auto">
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
