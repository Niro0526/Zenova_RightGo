"use client";

import Link from "next/link";
import { Route, Navigation, History } from "lucide-react";
import Logo from "@/components/common/Logo";
import NavItem from "@/components/common/NavItem";
import { useConnectivity } from "@/context/DriverConnectivityContext";

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
              Plan v2
            </span>
          </div>
          <span className="text-white font-bold text-sm">S1-T001</span>
          <span className="text-gray-400 text-[11px]">Vehicle: PEL-R04 · Wave 1</span>
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
                className="block bg-[#F97316] rounded-[1.5px]"
                style={{ width: 24, height: 3 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
