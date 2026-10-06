'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

/* ─── Exact RightGo Truck & Route Pin Brand Logo ─── */
function RightGoLogoMark({ className = "w-20 h-14" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 116 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* ── Truck Outline (Navy #0F2847) ── */}
      {/* Cab and Box Body */}
      <path
        d="M25 48H13C11.3 48 10 46.7 10 45V34C10 32.5 11 31.2 12.5 30.8L19 29C20.2 28.6 21.2 27.8 21.8 26.6L25.5 19.2C26.4 17.5 28.2 16.5 30.2 16.5H44C45.7 16.5 47 17.8 47 19.5V48H37"
        stroke="#0F2847"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cab Windshield */}
      <path
        d="M25 28H39C40.1 28 41 28.9 41 30V36H21.5L24.2 29.5C24.4 28.6 24.6 28 25 28Z"
        stroke="#0F2847"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Cargo Box Separator & Outline */}
      <path
        d="M47 20H74C75.7 20 77 21.3 77 23V48H53"
        stroke="#0F2847"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Front Wheel */}
      <circle cx="19" cy="48" r="5" stroke="#0F2847" strokeWidth="3" fill="#FFFFFF" />
      <circle cx="19" cy="48" r="1.5" fill="#0F2847" />
      {/* Rear Wheel */}
      <circle cx="45" cy="48" r="5" stroke="#0F2847" strokeWidth="3" fill="#FFFFFF" />
      <circle cx="45" cy="48" r="1.5" fill="#0F2847" />

      {/* ── Location Pin (Navy #0F2847) ── */}
      <path
        d="M89 12C79.8 12 72.5 19.3 72.5 28.5C72.5 41 89 59 89 59C89 59 105.5 41 105.5 28.5C105.5 19.3 98.2 12 89 12Z"
        stroke="#0F2847"
        strokeWidth="3.4"
        strokeLinejoin="round"
      />

      {/* ── Orange Arrow & Loop (#F97316) ── */}
      {/* Horizontal Line Through Truck Body */}
      <path
        d="M16 38H77"
        stroke="#F97316"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* Arrowhead pointing right */}
      <path
        d="M72 34L78 38L72 42"
        stroke="#F97316"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Curved loop inside the Location Pin */}
      <path
        d="M78 38C83 38 91 35 93.5 30C95.5 25.5 93 20.5 87.5 20.5C82 20.5 78.5 25 81 30C83.5 35 88 36 89 36"
        stroke="#F97316"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
      window.location.href = result.homeRoute;
    } else {
      setLoading(false);
      setError(result.error ?? 'Invalid email or password.');
    }
  };

  const handleQuickFill = (demoEmail: string, demoPwd: string = 'password') => {
    setEmail(demoEmail);
    setPassword(demoPwd);
    setError(null);
  };

  return (
    <div className="relative min-h-screen w-full font-sans flex flex-col items-center py-8 sm:py-14 px-4 sm:px-6 lg:px-12">
      {/* ── Fixed Full-Screen Hero Background Image (Highway with Truck & City Skyline) ── */}
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat -z-10 pointer-events-none"
        style={{
          backgroundImage: "url('/brand/login-bg.jpg')",
        }}
      >
        {/* Soft overlay gradient matching reference mock */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.72) 42%, rgba(255,255,255,0.22) 72%, rgba(255,255,255,0.75) 100%)',
          }}
        />
      </div>

      {/* ── Main Layout Container ── */}
      <div className="relative z-10 w-full max-w-[1360px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14 my-auto">
        
        {/* ── LEFT HERO BRANDING (Matches Screenshot 1:1) ── */}
        <div className="w-full lg:max-w-xl flex flex-col justify-between py-2 lg:py-6 select-none cursor-default">
          {/* Top Brand Logo */}
          <div className="flex flex-col items-start gap-1 mb-6 lg:mb-10">
            <RightGoLogoMark className="w-24 h-16 -ml-2 drop-shadow-xs" />
            <div className="flex flex-col">
              <span className="text-[28px] sm:text-[32px] font-extrabold tracking-[-0.5px] text-[#0F2847] leading-none">
                Right<span className="text-[#F97316]">Go</span>
              </span>
              <span className="text-[13px] sm:text-[14px] font-semibold text-[#0F2847] tracking-[0.2px] mt-1">
                Intelligent Logistics
              </span>
            </div>
          </div>

          {/* Hero Typography */}
          <div className="mb-6 lg:mb-10">
            <h1 className="text-[44px] sm:text-[54px] xl:text-[62px] font-extrabold leading-[1.06] tracking-tight text-[#0B1E36]">
              Smarter
              <br />
              Deliveries
              <br />
              <span className="text-[#F97316]">for a Better</span>
              <br />
              <span className="text-[#F97316]">Tomorrow</span>
            </h1>
            <p className="mt-5 text-[17px] sm:text-[19px] font-medium leading-relaxed text-[#475569] max-w-md">
              Connected people. Efficient routes.
              <br />
              Reliable deliveries.
            </p>
          </div>
        </div>

        {/* ── RIGHT LOGIN CARD (Floating White Card) ── */}
        <div className="w-full max-w-[440px] bg-white rounded-[28px] shadow-2xl border border-slate-100/90 p-7 sm:p-9 shrink-0 relative overflow-hidden my-4 lg:my-0">
          {/* Top Organic Vector Decoration inside card */}
          <div
            className="pointer-events-none absolute -top-12 -left-12 w-48 h-48 rounded-full opacity-60"
            style={{
              background: 'radial-gradient(circle, #FED7AA 0%, #FFEDD5 40%, transparent 75%)',
            }}
          />

          <div className="relative z-10">
            {/* ── Centered Logo Mark & Wordmark ── */}
            <div className="flex flex-col items-center justify-center pt-1 pb-2 text-center select-none cursor-default">
              <RightGoLogoMark className="w-24 h-16 mb-1 drop-shadow-xs" />
              <div className="text-[28px] sm:text-[30px] font-extrabold tracking-[-0.5px] text-[#0F2847] leading-none">
                Right<span className="text-[#F97316]">Go</span>
              </div>
              <div className="text-[13px] font-semibold text-[#0F2847] tracking-[0.2px] mt-1">
                Intelligent Logistics
              </div>
            </div>

            {/* ── Welcome Heading ── */}
            <div className="text-center mt-5 mb-5 select-none cursor-default">
              <h2 className="text-[24px] sm:text-[26px] font-extrabold text-[#0B1E36] tracking-tight leading-tight">
                Welcome to RightGo
              </h2>
              <p className="text-[14px] text-[#64748B] mt-1 font-normal">
                Sign in to continue
              </p>
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label className="block text-[13px] font-bold text-[#1E293B] mb-1.5 select-none cursor-default">
                  Email address
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center justify-center pointer-events-none text-[#64748B]">
                    <Mail size={18} strokeWidth={1.8} />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-11 pr-4 h-[50px] bg-white border border-[#CBD5E1] rounded-xl text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 shadow-xs"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-[13px] font-bold text-[#1E293B] mb-1.5 select-none cursor-default">
                  Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center justify-center pointer-events-none text-[#64748B]">
                    <Lock size={18} strokeWidth={1.8} />
                  </div>
                  <input
                    id="login-password"
                    type={showPwd ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-11 pr-11 h-[50px] bg-white border border-[#CBD5E1] rounded-xl text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 shadow-xs"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 text-[#64748B] hover:text-[#0F172A] transition-colors p-1 cursor-pointer"
                  >
                    {showPwd ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end pt-0.5">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('For password resets, please contact Central Dispatch Administration at dispatch@rightgo.lk');
                  }}
                  className="text-[13px] font-bold text-[#1E40AF] hover:underline cursor-pointer select-none"
                >
                  Forgot Password?
                </a>
              </div>

              {/* Sign In CTA Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 h-[50px] rounded-xl text-white text-[15px] font-bold flex items-center justify-center gap-2 bg-[#F97316] hover:bg-[#EA580C] active:scale-[0.99] transition-all shadow-md shadow-orange-500/25 disabled:opacity-60 cursor-pointer border-none select-none"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={18} strokeWidth={2.2} />
                  </>
                )}
              </button>
            </form>

            {/* ── Divider ── */}
            <div className="relative flex items-center justify-center my-6 select-none cursor-default">
              <div className="w-full border-t border-[#E2E8F0]" />
              <span className="absolute bg-white px-3 text-[11px] font-medium text-[#94A3B8] tracking-normal">
                Intelligent Logistics Platform
              </span>
            </div>

            {/* Quick Demo Logins for Quick Role Switching */}
            <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-[11px]">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                Quick Test Accounts
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickFill('dispatcher@rightgo.lk')}
                  className="py-1 px-2 bg-white hover:bg-orange-50 hover:text-[#F97316] border border-slate-200 rounded text-slate-700 font-semibold transition-colors text-center cursor-pointer"
                >
                  Dispatcher (Dilani)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('store@rightgo.lk')}
                  className="py-1 px-2 bg-white hover:bg-orange-50 hover:text-[#F97316] border border-slate-200 rounded text-slate-700 font-semibold transition-colors text-center cursor-pointer"
                >
                  Store Mgr (Kavitha)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('loader@rightgo.lk')}
                  className="py-1 px-2 bg-white hover:bg-orange-50 hover:text-[#F97316] border border-slate-200 rounded text-slate-700 font-semibold transition-colors text-center cursor-pointer"
                >
                  Loader (Rizwan)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('sunil@rightgo.lk')}
                  className="py-1 px-2 bg-white hover:bg-orange-50 hover:text-[#F97316] border border-slate-200 rounded text-slate-700 font-semibold transition-colors text-center cursor-pointer"
                >
                  Driver (Sunil)
                </button>
              </div>
            </div>
          </div>

          {/* ── Bottom Decorative Peach Wave ── */}
          <div className="pointer-events-none absolute right-0 bottom-0 w-48 h-20 opacity-60 overflow-hidden">
            <svg viewBox="0 0 180 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M0 60 C 50 35, 110 75, 180 40 L 180 80 L 0 80 Z" fill="rgba(254, 215, 170, 0.55)" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
