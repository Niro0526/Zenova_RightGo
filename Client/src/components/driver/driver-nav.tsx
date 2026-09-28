"use client";

import Link from "next/link";
import {
  RouteIcon,
  NavigationIcon,
  AlertTriangleIcon,
} from "@/components/driver/today-run/icons";

/* ─── Nav item definition ─────────────────────────────────── */
export const DRIVER_NAV_ITEMS = [
  {
    label: "My Run",
    href: "/driver/today-run",
    icon: RouteIcon,
    id: "nav-my-run",
  },
  {
    label: "Current Stop",
    href: "/driver/current-stop",
    icon: NavigationIcon,
    id: "nav-current-stop",
  },
  {
    label: "Report",
    href: "/driver/report",
    icon: AlertTriangleIcon,
    id: "nav-report",
  },
] as const;

/* ─── Sidebar (desktop / tablet) ─────────────────────────── */
export function DriverSidebar({ pathname }: { pathname: string }) {
  return (
    <aside
      className="
        hidden md:flex
        flex-col w-64 h-full shrink-0
        bg-[#202D2D] shadow-2xl overflow-y-auto
      "
      aria-label="Driver sidebar navigation"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-[#F97316] flex items-center justify-center shadow-lg shrink-0">
          <RouteIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-[15px] leading-tight">
            RightGo
          </p>
          <p className="text-white/50 text-[11px]">Driver Portal</p>
        </div>
      </div>

      {/* Driver chip */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          D
        </div>
        <div className="min-w-0">
          <p className="text-white text-[13px] font-semibold truncate">
            Driver
          </p>
          <p className="text-white/50 text-[11px]">PEL-R04</p>
        </div>
        {/* Online dot */}
        <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded-full shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-[10px] font-semibold">
            Online
          </span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        {DRIVER_NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/driver/today-run"
              ? pathname === "/driver" || pathname.startsWith("/driver/today-run")
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.id}
              id={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl
                font-semibold text-[13px] transition-all duration-200
                ${
                  isActive
                    ? "bg-[#F97316] text-white shadow-lg shadow-orange-500/30"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }
              `}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
              {isActive && (
                <svg
                  className="w-4 h-4 ml-auto opacity-70"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M9 6L15 12L9 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Trip info footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-2">
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">
            Trip Plan
          </p>
          <div className="flex items-center justify-between">
            <span className="text-white font-bold text-[16px]">S1-T001</span>
            <span className="bg-white/10 text-white/70 text-[10px] font-semibold px-2 py-0.5 rounded">
              Plan v2
            </span>
          </div>
          <p className="text-white/40 text-[11px]">Vehicle: PEL-R04</p>
        </div>
      </div>
    </aside>
  );
}

/* ─── Fixed Bottom Bar (mobile only) ─────────────────────── */
export function DriverMobileBottomNav({ pathname }: { pathname: string }) {
  return (
    <nav
      id="bottom-nav"
      aria-label="Driver navigation"
      className="
        md:hidden
        fixed bottom-0 left-0 right-0 z-50
        flex flex-row justify-around items-center
        bg-white border-t border-[#E2E8F0]
        shadow-[0_-2px_12px_rgba(0,0,0,0.08)]
      "
      style={{ height: 64 }}
    >
      {DRIVER_NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/driver/today-run"
            ? pathname === "/driver" || pathname.startsWith("/driver/today-run")
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.id}
            id={`tab-${item.id}`}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
            className="flex flex-col justify-center items-center gap-1 flex-1 h-full"
          >
            <item.icon
              className={`w-[22px] h-[22px] ${
                isActive ? "text-[#202D2D]" : "text-[#485563]"
              }`}
            />
            <span
              className={`font-semibold text-[11px] leading-4 ${
                isActive ? "text-[#202D2D]" : "text-[#485563]"
              }`}
            >
              {item.label}
            </span>
            {/* Active indicator */}
            {isActive && (
              <span
                className="block bg-[#1D4ED8] rounded-[1.5px]"
                style={{ width: 24, height: 3 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
