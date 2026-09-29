import React, { useState } from 'react';
import { 
  Bell, 
  User, 
  ChevronDown, 
  Store, 
  Phone, 
  X,
  CheckCircle2
} from 'lucide-react';

interface TopNavbarProps {
  selectedOutlet: any;
  onSelectOutlet?: (outlet: any) => void;
  outlets?: any[];
}

export default function TopNavbar({ 
  selectedOutlet = {} 
}: TopNavbarProps) {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    {
      id: 1,
      title: 'Vehicle En Route to Dock',
      desc: 'Driver Chaminda Vithanage (VEH003 Reefer) is 15 mins away from dock.',
      time: '07:15 AM',
      unread: true
    },
    {
      id: 2,
      title: 'Order Dispatched from Peliyagoda',
      desc: 'Order S1-000 loaded onto VEH014 (Dry-Box 6T).',
      time: '04:45 AM',
      unread: false
    }
  ];

  return (
    <>
      <header className="rightgo-top-navbar">
        {/* Left Side: Store & Operational Hub Connection */}
        <div className="nav-left-section">
          {/* Active Depot Status */}
          <div className="depot-status-chip">
            <span className="live-pulse-dot"></span>
            <span>Peliyagoda Central Depot · <strong>Live Sync</strong></span>
          </div>

          {/* Clean Static Outlet Badge */}
          <div className="outlet-badge-static">
            <Store size={15} color="#F97316" />
            <span className="outlet-selector-name">
              {selectedOutlet.outlet_id || 'OUT001'} · {selectedOutlet.name || 'Colpetty Retailer'}
            </span>
            <span className="brand-tag-chip">{selectedOutlet.brand || 'Fresh'}</span>
          </div>
        </div>

        {/* Right Side: Notification Bell + Store Manager Profile */}
        <div className="nav-right-section">
          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button 
              type="button" 
              className="nav-icon-btn"
              onClick={() => setShowNotifications(!showNotifications)}
              title="Operational Alerts"
            >
              <Bell size={18} color="#485563" />
              <span className="notification-badge-dot"></span>
            </button>

            {showNotifications && (
              <div className="notifications-dropdown-menu">
                <div className="notifications-header">
                  <span>Logistics Alerts</span>
                  <span className="unread-count">1 New</span>
                </div>
                <div className="notifications-list">
                  {notifications.map((n) => (
                    <div key={n.id} className={`notification-item ${n.unread ? 'unread' : ''}`}>
                      <div className="notif-title">{n.title}</div>
                      <div className="notif-desc">{n.desc}</div>
                      <div className="notif-time">{n.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Store Manager Profile Button */}
          <button 
            type="button" 
            className="store-manager-profile-btn"
            onClick={() => setShowProfileModal(true)}
            title="View Store Dock & Manager Profile"
          >
            <div className="profile-avatar-circle">
              {selectedOutlet.manager_name ? selectedOutlet.manager_name.split(' ').map((p: string) => p[0]).join('').slice(0, 2) : 'KP'}
            </div>
            <div className="profile-info-text">
              <span className="profile-name-label">{selectedOutlet.manager_name || 'Kasun Perera'}</span>
              <span className="profile-role-sub">Store Manager</span>
            </div>
            <ChevronDown size={14} color="#94A3B8" />
          </button>
        </div>
      </header>

      {/* Store Manager Profile Modal */}
      {showProfileModal && (
        <div className="profile-modal-backdrop" onClick={() => setShowProfileModal(false)}>
          <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="profile-avatar-large">
                  <User size={24} color="#FFFFFF" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#202D2D', margin: 0 }}>
                    {selectedOutlet.manager_name || 'Kasun Perera'}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    Store Manager • {selectedOutlet.outlet_id || 'OUT001'}
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                className="modal-close-btn"
                onClick={() => setShowProfileModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="profile-modal-body">
              {/* Store & Dock Parameters */}
              <div className="profile-param-grid">
                <div className="param-item">
                  <span className="param-label">Store Outlet</span>
                  <span className="param-value">{selectedOutlet.name || 'Colpetty Retailer'}</span>
                </div>
                <div className="param-item">
                  <span className="param-label">Brand Operational Scope</span>
                  <span className="param-value">RightGo {selectedOutlet.brand || 'Fresh'}</span>
                </div>
                <div className="param-item">
                  <span className="param-label">District & Depot</span>
                  <span className="param-value">{selectedOutlet.district || 'Colombo'} ({selectedOutlet.depot || 'Peliyagoda'})</span>
                </div>
                <div className="param-item">
                  <span className="param-label">Dock & Parking Type</span>
                  <span className="param-value">{selectedOutlet.dock_type || 'rear_dock'} • {selectedOutlet.parking_constraint || 'normal'}</span>
                </div>
                <div className="param-item">
                  <span className="param-label">Delivery Arrival Window</span>
                  <span className="param-value" style={{ color: '#16A34A', fontWeight: 700 }}>
                    {selectedOutlet.window_open_time || '05:00'} - {selectedOutlet.window_close_time || '07:30'}
                  </span>
                </div>
                <div className="param-item">
                  <span className="param-label">Unloading Service Allowance</span>
                  <span className="param-value">
                    {selectedOutlet.brand === 'Fresh' ? '15 minutes' : (selectedOutlet.brand === 'Style' ? '38 minutes' : '43 minutes')}
                  </span>
                </div>
              </div>

              {/* Direct Dispatch Line */}
              <div className="dispatch-contact-box">
                <Phone size={16} color="#0284C7" />
                <div>
                  <span style={{ fontWeight: 600, color: '#0369A1' }}>Peliyagoda Central Dispatch Desk: </span>
                  <span style={{ color: '#0C4A6E' }}>+94 11 291 4455 (Ext. 204)</span>
                </div>
              </div>
            </div>

            <div className="profile-modal-footer">
              <button 
                type="button" 
                className="figma-btn-primary"
                style={{ width: '100%', padding: '10px' }}
                onClick={() => setShowProfileModal(false)}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
