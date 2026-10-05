"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Route, Navigation, History, LogOut } from "lucide-react";
import Logo from "@/components/common/Logo";
import NavItem from "@/components/common/NavItem";
import { useConnectivity } from "@/context/DriverConnectivityContext";
import { useAuth } from "@/context/AuthContext";
import { fetchDriverRun, type DriverRunResponse } from "@/lib/driver/driver-api";

/* ─── Nav item definition ─────────────────────────────────── */
export const DRIVER_NAV_ITEMS = [
  {
    label: "My Run",
    href: "/driver/today-run",
    icon: Route,
    id: "nav-my-run",
  },
  {
    label: "Current Stop",
    href: "/driver/current-stop",
    icon: Navigation,
    id: "nav-current-stop",
  },
  {
    label: "History",
    href: "/driver/history",
    icon: History,
    id: "nav-history",
  },
] as const;

/* ─── Sidebar (desktop / tablet) ─────────────────────────── */
export function DriverSidebar({ pathname }: { pathname: string }) {
  const { connectionState } = useConnectivity();
  const { user, logout } = useAuth();
  const [navRun, setNavRun] = useState<DriverRunResponse | null>(null);
  useEffect(() => {
    let alive = true;
    fetchDriverRun()
      .then((r) => {
        if (alive) setNavRun(r.hasRun ? r : null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname]);

  return (
    <aside
      className="hidden md:flex flex-col w-full md:w-[240px] bg-[#161A1D] text-white py-8 px-5 flex-shrink-0 font-sans box-border md:h-screen md:sticky md:top-0 overflow-y-auto"
      aria-label="Driver sidebar navigation"
    >
      {/* Brand */}
      <div className="mb-8">
        <Logo subtitle="Driver Portal" href="/" />
      </div>

      {/* Nav links using shared NavItem */}
      <nav className="flex flex-col gap-2 flex-1">
        {DRIVER_NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/driver/today-run"
              ? pathname === "/driver" || pathname.startsWith("/driver/today-run")
              : pathname.startsWith(item.href);
          return (
            <NavItem
              key={item.id}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive}
              tone="dark"
            />
          );
        })}
      </nav>

      {/* Trip info footer */}
      <div className="mt-auto pt-6 border-t border-[#282f37] flex flex-col gap-3">
        <div className="bg-[#232A2E] rounded-xl p-3.5 flex flex-col gap-1.5 border border-[#2e3740]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Active Trip
            </span>
            <span className="bg-white/10 text-white/80 text-[10px] font-semibold px-2 py-0.5 rounded">
              {navRun?.manifestVersion || "-"}
            </span>
          </div>
          <span className="text-white font-bold text-sm">{navRun?.tripId || "No active run"}</span>
          <span className="text-gray-400 text-[11px]">Vehicle: {user?.vehicle_id || "-"}{navRun ? ` · Trip ${navRun.tripNo}` : ""}</span>
        </div>

        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

/* ─── Fixed Bottom Bar (mobile only) ─────────────────────── */
export function DriverMobileBottomNav({ pathname }: { pathname: string }) {
  const isMyRunActive = pathname === "/driver" || pathname.startsWith("/driver/today-run");
  const isCurrentStopActive = pathname.startsWith("/driver/current-stop");
  const isHistoryActive = pathname.startsWith("/driver/history");

  return (
    <nav
      id="bottom-nav"
      aria-label="Driver Navigation"
      className="
        md:hidden
        fixed bottom-0 left-0 right-0 z-40
        w-full bg-white border-t border-[#E2E8F0]
        shadow-[0_-2px_12px_rgba(0,0,0,0.06)]
        font-inter select-none
      "
      style={{
        height: 62,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="grid grid-cols-3 w-full h-full max-w-[430px] mx-auto items-center px-1">
        {/* 1. My Run */}
        <Link
          id="tab-nav-my-run"
          href="/driver/today-run"
          aria-current={isMyRunActive ? "page" : undefined}
          aria-label="My Run"
          className="flex flex-col items-center justify-center gap-1 h-full py-1 no-underline transition-all active:scale-95 cursor-pointer"
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <svg
              className={`w-5 h-5 transition-colors ${
                isMyRunActive ? "text-[#ED5214]" : "text-[#455263]"
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="6" cy="19" r="3" />
              <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
              <circle cx="18" cy="5" r="3" />
            </svg>
          </div>
          <span
            className={`text-[11px] leading-[13px] tracking-tight transition-colors ${
              isMyRunActive ? "font-bold text-[#ED5214]" : "font-medium text-[#455263]"
            }`}
          >
            My Run
          </span>
        </Link>

        {/* 2. Current Stop */}
        <Link
          id="tab-nav-current-stop"
          href="/driver/current-stop"
          aria-current={isCurrentStopActive ? "page" : undefined}
          aria-label="Current Stop"
          className="flex flex-col items-center justify-center gap-1 h-full py-1 no-underline transition-all active:scale-95 cursor-pointer"
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <svg
              className={`w-5 h-5 transition-colors ${
                isCurrentStopActive ? "text-[#ED5214]" : "text-[#455263]"
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <span
            className={`text-[11px] leading-[13px] tracking-tight transition-colors ${
              isCurrentStopActive ? "font-bold text-[#ED5214]" : "font-medium text-[#455263]"
            }`}
          >
            Current Stop
          </span>
        </Link>

        {/* 3. History */}
        <Link
          id="tab-nav-history"
          href="/driver/history"
          aria-current={isHistoryActive ? "page" : undefined}
          aria-label="History"
          className="flex flex-col items-center justify-center gap-1 h-full py-1 no-underline transition-all active:scale-95 cursor-pointer"
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <svg
              className={`w-5 h-5 transition-colors ${
                isHistoryActive ? "text-[#ED5214]" : "text-[#455263]"
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <span
            className={`text-[11px] leading-[13px] tracking-tight transition-colors ${
              isHistoryActive ? "font-bold text-[#ED5214]" : "font-medium text-[#455263]"
            }`}
          >
            History
          </span>
        </Link>
      </div>
    </nav>
  );
}
