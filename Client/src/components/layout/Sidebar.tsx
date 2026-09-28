import React from 'react';
import { Package, FilePlus, Truck } from 'lucide-react';
import Logo from '@/components/common/Logo';
import NavItem from '@/components/common/NavItem';
import RoleSwitcher from '@/components/common/RoleSwitcher';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  selectedOutlet?: any;
}

export default function Sidebar({
  currentView,
  setCurrentView,
  selectedOutlet = {},
}: SidebarProps) {
  const isOrdersActive = currentView === 'dashboard' || currentView === 'orders' || currentView === 'my-orders';
  const isPlaceOrderActive = currentView === 'place-order';
  const isDeliveriesActive = currentView === 'confirm-receipt' || currentView === 'deliveries';

  return (
    <aside className="hidden md:flex flex-col w-[240px] h-screen bg-[#161A1D] text-white shrink-0 py-6 px-4 font-sans overflow-y-auto">
      <div className="mb-6 px-1">
        <Logo subtitle="Store Manager" />
      </div>

      <div className="store-profile-box mb-6">
        <span className="store-role-label">STORE MANAGER</span>
        <span className="store-outlet-name">{selectedOutlet.name || 'Colpetty Retailer'}</span>
      </div>

      <nav className="flex flex-col gap-2">
        <NavItem href="/store-manager/my-orders" label="My Orders" icon={Package} active={isOrdersActive} tone="dark" onClick={() => setCurrentView('dashboard')} />
        <NavItem href="/store-manager/place-order" label="Place Order" icon={FilePlus} active={isPlaceOrderActive} tone="dark" onClick={() => setCurrentView('place-order')} />
        <NavItem href="/store-manager/deliveries" label="Deliveries" icon={Truck} active={isDeliveriesActive} tone="dark" onClick={() => setCurrentView('confirm-receipt')} />
      </nav>

      <div className="mt-auto border-t border-[#232A2E] pt-4">
        <RoleSwitcher active="store-manager" />
      </div>
    </aside>
  );
}
