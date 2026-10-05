import React from 'react';
import { LogOut } from 'lucide-react';
import Logo from '@/components/common/Logo';
import NavItem from '@/components/common/NavItem';
import { STORE_MANAGER_NAV } from './nav';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  selectedOutlet?: any;
}

const VIEW_BY_HREF: Record<string, string> = {
  '/store-manager/my-orders': 'dashboard',
  '/store-manager/place-order': 'place-order',
  '/store-manager/deliveries': 'confirm-receipt',
};

export default function Sidebar({
  currentView,
  setCurrentView,
  selectedOutlet = {}
}: SidebarProps) {
  const { logout } = useAuth();
  const isActive = (href: string) => {
    const view = VIEW_BY_HREF[href];
    if (view === 'dashboard') return currentView === 'dashboard' || currentView === 'orders';
    return currentView === view;
  };

  return (
    <aside className="figma-sidebar flex flex-col justify-between">
      <div>
        {/* Top Header Section */}
        <div className="sidebar-top-section mb-6">
          <Logo subtitle="Store Manager" href="/" />
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav-list flex flex-col gap-2">
          {STORE_MANAGER_NAV.map(({ href, label, icon }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={isActive(href)}
              tone="dark"
              onClick={() => setCurrentView(VIEW_BY_HREF[href])}
            />
          ))}
        </nav>
      </div>

      {/* Bottom Sign Out */}
      <div className="pt-4 border-t border-white/10 mt-6">
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
