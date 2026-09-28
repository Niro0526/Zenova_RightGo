import React from 'react';
import Logo from '@/components/common/Logo';
import NavItem from '@/components/common/NavItem';
import { STORE_MANAGER_NAV } from './nav';

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
  const isActive = (href: string) => {
    const view = VIEW_BY_HREF[href];
    if (view === 'dashboard') return currentView === 'dashboard' || currentView === 'orders';
    return currentView === view;
  };

  return (
    <aside className="figma-sidebar">
      {/* Top Header Section */}
      <div className="sidebar-top-section mb-6">
        <Logo subtitle="PULSE" href="/" />
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
    </aside>
  );
}
