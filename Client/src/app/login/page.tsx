'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Route, Store, PackageCheck, Truck, Mail, Lock, ArrowRight, ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Logo from '@/components/common/Logo';

const ROLE_CONFIG: Record<string, {
  title: string; subtitle: string;
  icon: React.ElementType;
  accent: string; bg: string; border: string;
  hintEmail: string;
  defaultPassword: string;
}> = {
  dispatcher: {
    title: 'Dispatcher Planning Console',
    subtitle: 'Fleet Capacity · Demand Scheduling · Manifest Release',
    icon: Route, accent: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD',
    hintEmail: 'dilani@rightgo.lk',
    defaultPassword: 'Dispatch@2026',
  },
  loader: {
    title: 'Warehouse Loader Bay',
    subtitle: 'Peliyagoda Central Depot · LIFO Loading · Departure Gate',
    icon: PackageCheck, accent: '#D97706', bg: '#FFFBEB', border: '#FDE68A',
    hintEmail: 'rizwan@rightgo.lk',
    defaultPassword: 'Loader@2026',
  },
  driver: {
    title: 'Driver Fleet Portal',
    subtitle: 'OTP Trip Unlock · Stop Navigation · Electronic POD',
    icon: Truck, accent: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0',
    hintEmail: 'sunil@rightgo.lk',
    defaultPassword: 'Driver@2026',
  },
  store_manager: {
    title: 'Store Manager Portal',
    subtitle: 'Replenishment Orders · Live Tracking · Receipt Confirmation',
    icon: Store, accent: '#EA580C', bg: '#FFF7ED', border: '#FED7AA',
    hintEmail: 'kavitha@rightgo.lk',
    defaultPassword: 'Store@2026',
  },
};

function LoginContent() {
  const params = useSearchParams();
  const roleKey = params.get('role') ?? 'store_manager';
  const cfg = ROLE_CONFIG[roleKey] ?? ROLE_CONFIG.store_manager;
  const RoleIcon = cfg.icon;
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setEmail('');
    setPassword('');
    setError(null);
  }, [roleKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!email.trim() || !password.trim()) {
      setError('Please enter both your email address and password.');
      return;
    }
    setError(null);
    setLoading(true);
    const result = await login(email.trim(), password.trim());
    if (result.success && result.homeRoute) {
      // Keep loading true so button does not flicker before page transition
      window.location.href = result.homeRoute;
    } else {
      setLoading(false);
      setError(result.error ?? 'Invalid email or password.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[420px]">

        <div className="mb-5 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] hover:text-[#0F172A] transition-colors">
            <ArrowLeft size={13} /> All Roles
          </Link>
          <Logo tone="light" />
        </div>

        <div className="rounded-2xl p-4 mb-5 border flex items-center gap-3.5" style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: cfg.accent }}>
            <RoleIcon size={22} />
          </div>
          <div>
            <h1 className="text-[13px] font-bold text-[#0F172A]">{cfg.title}</h1>
            <p className="text-[11px] text-[#475569] mt-0.5">{cfg.subtitle}</p>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-[#F1F5F9]">
            <p className="text-xs font-bold text-[#0F172A]">Sign In to Your Workspace</p>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">Enter your operational credentials to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2] text-[11px] text-[#991B1B]">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-[#475569] mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                <input
                  id="login-email" type="email" required autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="name@rightgo.lk"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[12px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-[#475569] mb-1.5">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                <input
                  id="login-password" type={showPwd ? 'text' : 'password'} required autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-9 pr-10 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[12px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:bg-white transition"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]">
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full mt-1 py-2.5 rounded-xl text-white text-[12px] font-bold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 cursor-pointer"
              style={{ backgroundColor: cfg.accent }}
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Redirecting to Dashboard…</span>
                </>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-[#CBD5E1]">
          RightGo Logistics Platform · Team ZENOVA · Tech-Triathlon 2026
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs font-semibold text-[#64748B]">Loading…</div>}>
      <LoginContent />
    </Suspense>
  );
}
