/* ─── Bottom Navigation Bar — top: 829, h: 64 ──────────────── */

import { RouteIcon, NavigationIcon, AlertTriangleIcon } from "./icons";
import type { TabId } from "./types";

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

interface NavTabProps {
  id: string;
  label: string;
  tabId: TabId;
  activeTab: TabId;
  icon: React.ReactNode;
  onTabChange: (tab: TabId) => void;
}

/* ── Single tab button ── */
function NavTab({ id, label, tabId, activeTab, icon, onTabChange }: NavTabProps) {
  const isActive = activeTab === tabId;

  return (
    <button
      id={id}
      type="button"
      aria-selected={isActive}
      aria-label={label}
      onClick={() => onTabChange(tabId)}
      className="flex flex-col justify-center items-center border-none bg-transparent cursor-pointer"
      style={{ width: 100, height: 52, gap: 4 }}
    >
      {/* Icon */}
      <span className={isActive ? "text-[#202D2D]" : "text-[#485563]"}>
        {icon}
      </span>

      {/* Label */}
      <span
        className={`font-semibold ${isActive ? "text-[#202D2D]" : "text-[#485563]"}`}
        style={{ fontSize: 11, lineHeight: "16px" }}
      >
        {label}
      </span>

      {/* Active indicator — 24 × 3 blue rectangle */}
      {isActive && (
        <span
          className="block bg-[#1D4ED8]"
          style={{ width: 24, height: 3, borderRadius: 1.5 }}
        />
      )}
    </button>
  );
}

/* ── Nav bar ── */
export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <>
      {/* Tab bar */}
      <nav
        id="bottom-nav-canvas"
        aria-label="Driver navigation"
        className="md:hidden absolute flex flex-row justify-between items-center"
        style={{ top: 829, left: 14, width: 390, height: 64, padding: "0 12px", boxSizing: "border-box" }}
      >
        <NavTab
          id="tab-my-run"
          label="My Run"
          tabId="myRun"
          activeTab={activeTab}
          onTabChange={onTabChange}
          icon={<RouteIcon className="w-[22px] h-[22px]" />}
        />
        <NavTab
          id="tab-current-stop"
          label="Current Stop"
          tabId="currentStop"
          activeTab={activeTab}
          onTabChange={onTabChange}
          icon={<NavigationIcon className="w-[22px] h-[22px]" />}
        />
        <NavTab
          id="tab-report"
          label="Report"
          tabId="report"
          activeTab={activeTab}
          onTabChange={onTabChange}
          icon={<AlertTriangleIcon className="w-[22px] h-[22px]" />}
        />
      </nav>

      {/* Home indicator — 150 × 5 — mobile only */}
      <div
        aria-hidden="true"
        className="md:hidden absolute bg-[#202D2D] rounded-full"
        style={{ width: 150, height: 5, left: 131, top: 908 }}
      />
    </>
  );
}
