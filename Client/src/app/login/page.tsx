'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Truck, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Logo from '@/components/common/Logo';

export default function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const formPanel = (
    <div className="w-full max-w-[400px]">
      <div className="mb-6 flex items-center justify-center lg:hidden">
        <Logo tone="light" />
      </div>

      <div className="flex flex-col items-center text-center gap-1 mb-7">
        <h1 className="text-[20px] font-bold leading-[28px] text-[#0F172A]">Welcome to RightGo</h1>
        <p className="text-[13px] leading-5 text-[#64748B]">Sign in to continue</p>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2] text-[11px] text-[#991B1B]">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-[#0F172A] mb-1.5">Email address</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
              <input
                id="login-email" type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full pl-10 pr-3.5 py-3 bg-white border border-[#E2E8F0] rounded-lg text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#0F172A] mb-1.5">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
              <input
                id="login-password" type={showPwd ? 'text' : 'password'} required autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-10 py-3 bg-white border border-[#E2E8F0] rounded-lg text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15"
              />
              <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)} aria-label={showPwd ? 'Hide password' : 'Show password'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]">
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <a href="#" className="text-[12px] font-semibold text-[#F97316] hover:underline">Forgot Password?</a>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full mt-1 h-[46px] rounded-lg text-white text-[14px] font-bold flex items-center justify-center gap-2 bg-[#F97316] hover:bg-[#EA580C] transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-[11px] text-[#94A3B8]">
        Intelligent Logistics Platform · RightGo · Team ZENOVA
      </p>
    </div>
  );

  return (
    <div className="min-h-screen w-full flex font-sans">
      {/* Desktop-only brand hero panel */}
      <div className="relative hidden w-1/2 shrink-0 overflow-hidden bg-[#13171A] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(1100px 500px at -10% 110%, rgba(249,115,22,0.35), transparent 60%), linear-gradient(180deg, #13171A 0%, #1B2127 100%)',
          }}
        />
        <div className="relative flex items-center gap-3">
          <Logo tone="dark" />
        </div>

        <div className="relative flex max-w-md flex-col gap-3">
          <h2 className="text-[32px] font-bold leading-[40px] text-white">
            Smarter Deliveries
            <br />
            <span className="text-[#F97316]">for a Better Tomorrow</span>
          </h2>
          <p className="text-[14px] leading-6 text-[#8A9BB0]">Connected people. Efficient routes. Reliable deliveries.</p>
        </div>

        <div className="relative flex items-center gap-2 text-[12px] text-[#6B7C8C]">
          <Truck className="h-4 w-4 text-[#F97316]" />
          <span>Built for dispatch, store, loading &amp; driving operations</span>
        </div>
      </div>

      {/* Form panel — full width on mobile, right half on desktop */}
      <div className="flex w-full flex-1 items-center justify-center bg-[#F8FAFC] p-4 lg:w-1/2">
        {formPanel}
      </div>
    </div>
  );
}
