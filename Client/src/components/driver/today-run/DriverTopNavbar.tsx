"use client";

import React, { useState } from "react";
import { Bell, Store, ChevronDown, Phone, X, CheckCircle2, Truck } from "lucide-react";
import { useConnectivity } from "@/context/DriverConnectivityContext";

export function DriverTopNavbar() {
  const { connectionState } = useConnectivity();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    {
      id: 1,
      title: "Dock Slot Confirmed",
      desc: "Street dock ready at OUT001 Colpetty Retailer for PEL-R04.",
      time: "05:10 AM",
      unread: true,
    },
    {
      id: 2,
      title: "Trip Plan S1-T001 Dispatched",
      desc: "4 delivery stops allocated from Peliyagoda Central Depot.",
      time: "04:30 AM",
      unread: false,
    },
  ];

  return (
    <>
      <header className="hidden md:flex rightgo-top-navbar">
        {/* Left Side: Active Depot Status + Current Stop Outlet Badge */}
        <div className="nav-left-section">
          {/* Active Depot Status Chip */}
          <div
            className="depot-status-chip"
            style={{
              background:
                connectionState === "offline"
                  ? "#FFF7ED"
                  : connectionState === "syncing"
                  ? "#EFF6FF"
                  : "#F0FDF4",
              borderColor:
                connectionState === "offline"
                  ? "#FFEDD5"
                  : connectionState === "syncing"
                  ? "#DBEAFE"
                  : "#DCFCE7",
              color:
                connectionState === "offline"
                  ? "#C2410C"
                  : connectionState === "syncing"
                  ? "#1D4ED8"
                  : "#166534",
            }}
          >
            <span
              className="live-pulse-dot"
              style={{
                background:
                  connectionState === "offline"
                    ? "#F97316"
                    : connectionState === "syncing"
                    ? "#3B82F6"
                    : "#22C55E",
                boxShadow:
                  connectionState === "offline"
                    ? "0 0 0 3px rgba(249, 115, 22, 0.2)"
                    : connectionState === "syncing"
                    ? "0 0 0 3px rgba(59, 130, 246, 0.2)"
                    : "0 0 0 3px rgba(34, 197, 94, 0.2)",
              }}
            />
            <span>
              Peliyagoda Central Depot ·{" "}
              <strong>
                {connectionState === "offline"
                  ? "Offline"
                  : connectionState === "syncing"
                  ? "Syncing..."
                  : connectionState === "synced"
                  ? "Synced"
                  : "Live Sync"}
              </strong>
            </span>
          </div>

          {/* Clean Static Outlet Badge */}
          <div className="outlet-badge-static">
            <Store size={15} color="#F97316" />
            <span className="outlet-selector-name">OUT001 · Colpetty Retailer</span>
            <span className="brand-tag-chip">FRESH</span>
          </div>
        </div>

        {/* Right Side: Notification Bell + Driver Profile */}
        <div className="nav-right-section">
          {/* Notification Bell */}
          <div style={{ position: "relative" }}>
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
                    <div key={n.id} className={`notification-item ${n.unread ? "unread" : ""}`}>
                      <div className="notif-title">{n.title}</div>
                      <div className="notif-desc">{n.desc}</div>
                      <div className="notif-time">{n.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Driver Profile Button */}
          <button
            type="button"
            className="store-manager-profile-btn"
            onClick={() => setShowProfileModal(true)}
            title="View Fleet Driver Profile"
          >
            <div className="profile-avatar-circle" style={{ background: "#F97316" }}>
              D
            </div>
            <div className="profile-info-text">
              <span className="profile-name-label">D. Silva (Driver PEL-R04)</span>
              <span className="profile-role-sub">Fleet Driver</span>
            </div>
            <ChevronDown size={14} color="#94A3B8" />
          </button>
        </div>
      </header>

      {/* Driver Profile Modal */}
      {showProfileModal && (
        <div className="profile-modal-backdrop" onClick={() => setShowProfileModal(false)}>
          <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div className="profile-avatar-large" style={{ background: "#F97316" }}>
                  D
                </div>
                <div>
                  <h3 className="modal-manager-name">Dinesh Silva</h3>
                  <span className="modal-role-badge">Lead Fleet Driver</span>
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
              <div className="dock-detail-row">
                <span className="dock-detail-label">Vehicle Assigned:</span>
                <span className="dock-detail-val">PEL-R04 · Isuzu Chilled Van (4.5T)</span>
              </div>
              <div className="dock-detail-row">
                <span className="dock-detail-label">Current Trip Plan:</span>
                <span className="dock-detail-val">S1-T001 (Plan v2)</span>
              </div>
              <div className="dock-detail-row">
                <span className="dock-detail-label">Depot Base:</span>
                <span className="dock-detail-val">Peliyagoda Central Depot</span>
              </div>
              <div className="dock-detail-row">
                <span className="dock-detail-label">Shift Status:</span>
                <span className="dock-detail-val">
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#22C55E",
                      marginRight: 6,
                    }}
                  />
                  Active On-Duty (05:00 - 14:00)
                </span>
              </div>
              <div className="dock-detail-row">
                <span className="dock-detail-label">Direct Contact:</span>
                <span className="dock-detail-val">
                  <a
                    href="tel:+94771234567"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      color: "#F97316",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    <Phone size={13} /> +94 77 123 4567
                  </a>
                </span>
              </div>
            </div>

            <div className="profile-modal-footer">
              <div className="dock-verified-chip">
                <CheckCircle2 size={14} color="#15803D" />
                <span>Peliyagoda Fleet Logged & Certified</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
