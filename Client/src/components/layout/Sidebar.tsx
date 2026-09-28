import React from 'react';
import { 
  MapPin, 
  Package, 
  FilePlus, 
  Truck, 
  ChevronDown 
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  selectedOutlet?: any;
}

export default function Sidebar({ 
  currentView, 
  setCurrentView, 
  selectedOutlet = {}
}: SidebarProps) {
  const isOrdersActive = currentView === 'dashboard' || currentView === 'orders';
  const isPlaceOrderActive = currentView === 'place-order';
  const isDeliveriesActive = currentView === 'confirm-receipt';

  return (
    <aside className="figma-sidebar">
      {/* Top Header Section */}
      <div className="sidebar-top-section">
        {/* Logo and Brand */}
        <div className="brand-logo-row">
          <div className="logo-pin-box">
            <MapPin size={20} color="#FFFFFF" />
          </div>
          <div className="brand-title-box">
            <span className="brand-title-text">RightGo</span>
            <span className="brand-pulse-text">PULSE</span>
          </div>
        </div>
      </div>

      {/* Navigation List - Exact 3 Items matching Figma screenshot */}
      <nav className="sidebar-nav-list">
        <button
          className={`sidebar-nav-btn ${isOrdersActive ? 'active' : ''}`}
          onClick={() => setCurrentView('dashboard')}
        >
          <Package 
            size={18} 
            color={isOrdersActive ? '#FFFFFF' : '#8A9BB0'} 
          />
          <span>My Orders</span>
        </button>

        <button
          className={`sidebar-nav-btn ${isPlaceOrderActive ? 'active' : ''}`}
          onClick={() => setCurrentView('place-order')}
        >
          <FilePlus 
            size={18} 
            color={isPlaceOrderActive ? '#FFFFFF' : '#8A9BB0'} 
          />
          <span>Place Order</span>
        </button>

        <button
          className={`sidebar-nav-btn ${isDeliveriesActive ? 'active' : ''}`}
          onClick={() => setCurrentView('confirm-receipt')}
        >
          <Truck 
            size={18} 
            color={isDeliveriesActive ? '#FFFFFF' : '#8A9BB0'} 
          />
          <span>Deliveries</span>
        </button>
      </nav>
    </aside>
  );
}
