'use client';

import React, { useState } from 'react';
import { Bell, ChevronDown, User, X, CheckCircle2 } from 'lucide-react';

export interface RoleTopBarProps {
  name: string;
  role: string;
  initials: string;
  stationId?: string;
  stationName?: string;
  avatarColor?: string;
  title?: React.ReactNode;
}

export default function RoleTopBar({
  name,
  role,
  initials,
  stationId,
  stationName,
  avatarColor = '#F97316',
  title,
}: RoleTopBarProps) {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    {
      id: 1,
      title: 'Operational Dispatch Sync',
      desc: 'Peliyagoda Central Depot live channel active.',
      time: 'Just now',
      unread: true,
    },
    {
      id: 2,
      title: 'Active Schedule Allocated',
      desc: 'Daily logistics workflow synchronized.',
      time: '04:30 AM',
      unread: false,
    },
  ];

  return (
    <>
      <header className="rightgo-top-navbar w-full flex items-center justify-between px-6 py-3 bg-white border-b border-[#E2E8F0] sticky top-0 z-40">
        {/* Left: Title or Blank */}
        <div className="flex items-center gap-3">
          {title}
        </div>

        {/* Right: Notification Bell + User Profile */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Notification Bell */}
          <div className="relative">
            <button
              type="button"
              className="nav-icon-btn"
              onClick={() => setShowNotifications(!showNotifications)}
              title="Operational Alerts"
              aria-label="View notifications"
            >
              <Bell size={18} color="#485563" />
              <span className="notification-badge-dot" />
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

          {/* User Profile Button with Circle Avatar */}
          <button
            type="button"
            className="store-manager-profile-btn"
            onClick={() => setShowProfileModal(true)}
            title={`View ${name} profile`}
          >
            <div
              className="profile-avatar-circle"
              style={{ background: avatarColor }}
            >
              {initials}
            </div>
            <div className="profile-info-text">
              <span className="profile-name-label">{name}</span>
              <span className="profile-role-sub">{role}</span>
            </div>
            <ChevronDown size={14} color="#94A3B8" />
          </button>
        </div>
      </header>

      {/* Profile Details Modal */}
      {showProfileModal && (
        <div className="profile-modal-backdrop" onClick={() => setShowProfileModal(false)}>
          <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="profile-avatar-large" style={{ background: avatarColor }}>
                  <User size={24} color="#FFFFFF" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#202D2D', margin: 0 }}>
                    {name}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    {role} {stationId ? `• ${stationId}` : ''}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowProfileModal(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="profile-modal-body">
              <div className="profile-param-grid">
                <div className="param-item">
                  <span className="param-label">Role Designation</span>
                  <span className="param-value">{role}</span>
                </div>
                <div className="param-item">
                  <span className="param-label">Central Depot</span>
                  <span className="param-value">Peliyagoda Central Depot (S1)</span>
                </div>
                {stationId && (
                  <div className="param-item">
                    <span className="param-label">Station Identifier</span>
                    <span className="param-value">{stationId}</span>
                  </div>
                )}
                {stationName && (
                  <div className="param-item">
                    <span className="param-label">Assignment</span>
                    <span className="param-value">{stationName}</span>
                  </div>
                )}
              </div>

              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 14px',
                  background: '#F0FDF4',
                  borderRadius: '10px',
                  border: '1px solid #DCFCE7',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <CheckCircle2 size={16} color="#16A34A" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#166534' }}>
                  Authenticated & Connected to Central Depot Dispatch Feed
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
