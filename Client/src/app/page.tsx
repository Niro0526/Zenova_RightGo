'use client';

import React from 'react';
import Link from 'next/link';
import { Route, Store, PackageCheck, Truck, ArrowRight, UserCheck } from 'lucide-react';
import Logo from '@/components/common/Logo';
import { useAuth } from '@/context/AuthContext';

const ROLES = [
  {
    roleKey: 'dispatcher',
    title: 'Dispatcher Console',
    href: '/login?role=dispatcher',
    icon: Route,
    accent: '#0284C7',
    iconBg: '#E0F2FE',
    description: 'Plan daily depot runs, validate constraint feasibility, and release master manifests.',
    actionLabel: 'Dispatcher Login & Access →',
  },
  {
    roleKey: 'store_manager',
    title: 'Store Manager',
    href: '/login?role=store_manager',
    icon: Store,
    accent: '#EA580C',
    iconBg: '#FFEDD5',
    description: 'Order stock replenishment, track incoming deliveries, and confirm goods with 4-digit code.',
    actionLabel: 'Store Manager Access →',
  },
  {
    roleKey: 'loader',
    title: 'Warehouse Loader',
    href: '/login?role=loader',
    icon: PackageCheck,
    accent: '#D97706',
    iconBg: '#FEF3C7',
    description: 'Execute reverse-LIFO load sequence, report dock issues, and clear departure gate.',
    actionLabel: 'Warehouse Loader Access →',
  },
  {
    roleKey: 'driver',
    title: 'Driver Fleet',
    href: '/login?role=driver',
    icon: Truck,
    accent: '#16A34A',
    iconBg: '#DCFCE7',
    description: 'Unlock vehicle run with 6-digit OTP, navigate stops, and perform electronic POD handshake.',
    actionLabel: 'Driver Access & OTP →',
  },
];

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-[#F9FAFB] px-4 py-10 md:py-16 font-sans">
      <div className="w-full max-w-4xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo tone="light" />
          <h1 className="text-xl md:text-2xl font-bold text-[#0F172A] mt-1">
            Enterprise Logistics & Replenishment System
          </h1>
          <p className="max-w-lg text-[13px] leading-5 text-[#64748B]">
            Peliyagoda Central Depot — Multi-Role Real-Time Logistics Operations
          </p>

          {/* Active Session Badge (if already logged in) */}
          {user && (
            <div className="mt-2 flex items-center gap-3 bg-white border border-[#DCFCE7] px-4 py-2 rounded-full shadow-sm">
              <UserCheck size={16} className="text-[#16A34A]" />
              <span className="text-xs font-semibold text-[#166534]">
                Signed in as <b>{user.display_name}</b> ({user.role.replace('_', ' ')})
              </span>
              <button
                type="button"
                onClick={logout}
                className="text-xs text-[#DC2626] font-bold hover:underline ml-2"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        {/* 4 Role Gateway Cards */}
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <Link
                key={role.roleKey}
                href={role.href}
                className="group flex flex-col justify-between p-6 bg-white border border-[#E2E8F0] rounded-2xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-[#CBD5E1]"
              >
                <div>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-105"
                    style={{ backgroundColor: role.iconBg, color: role.accent }}
                  >
                    <Icon size={24} />
                  </div>
                  <h2 className="text-base font-bold text-[#0F172A] group-hover:text-[#0284C7] transition-colors">
                    {role.title}
                  </h2>
                  <p className="mt-2 text-xs leading-5 text-[#64748B]">
                    {role.description}
                  </p>
                </div>

                <div
                  className="mt-6 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs font-bold"
                  style={{ color: role.accent }}
                >
                  <span>{role.actionLabel}</span>
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <p className="mt-12 text-center text-xs text-[#94A3B8]">
          RightGo Logistics Platform • Team ZENOVA • Tech-Triathlon 2026
        </p>
      </div>
    </div>
  );
}
