"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LocationPinIcon, TruckIcon, ListChecksIcon, ShieldCheckIcon } from "./icons";

interface SidebarProps {
  activeTab?: "assigned-trips" | "load-sequence" | "trip-readiness";
  onTabChange?: (tab: "assigned-trips" | "load-sequence" | "trip-readiness") => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab = "assigned-trips",
  onTabChange,
}) => {
  const router = useRouter();

  const handleTabClick = (tab: "assigned-trips" | "load-sequence" | "trip-readiness") => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      if (tab === "assigned-trips") router.push("/loader");
      else if (tab === "load-sequence") router.push("/loader/load-sequence");
      else if (tab === "trip-readiness") router.push("/loader/trip-readiness");
    }
  };

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-[220px] lg:w-[240px] h-screen bg-[#161A1D] text-white shrink-0 p-[24px_16px_20px] hidden md:flex flex-col z-40 font-poppins overflow-y-auto">
      {/* Brand & Role Logo */}
      <div className="flex items-center gap-2.5 mb-5 px-1">
        <div className="w-8 h-8 bg-[#F97316] rounded-lg flex items-center justify-center text-white shrink-0 shadow-md">
          <LocationPinIcon />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-[15px] text-white leading-tight">RightGo</span>
          <span className="text-[10px] font-semibold tracking-wider text-[#F97316] bg-[#202D2D] px-1.5 py-0.5 rounded leading-none w-fit uppercase">
            LOADER ROLE
          </span>
        </div>
      </div>

      {/* Thin line under logo */}
      <div className="w-full h-0 border-t border-[#232A2E] mb-4" />

      {/* Navigation Links */}
      <nav className="flex flex-col gap-2 w-full">
        <button
          type="button"
          className={`flex items-center gap-3 p-3 rounded-lg text-[13px] w-full text-left transition-colors ${
            activeTab === "assigned-trips"
              ? "bg-[#F97316] text-white font-semibold shadow-sm"
              : "text-[#8A9BB0] hover:text-white hover:bg-white/5 font-medium"
          }`}
          onClick={() => handleTabClick("assigned-trips")}
        >
          <TruckIcon className="w-[18px] h-[18px] shrink-0" />
          <span>Assigned Trips</span>
        </button>

        <button
          type="button"
          className={`flex items-center gap-3 p-3 rounded-lg text-[13px] w-full text-left transition-colors ${
            activeTab === "load-sequence"
              ? "bg-[#F97316] text-white font-semibold shadow-sm"
              : "text-[#8A9BB0] hover:text-white hover:bg-white/5 font-medium"
          }`}
          onClick={() => handleTabClick("load-sequence")}
        >
          <ListChecksIcon className="w-[18px] h-[18px] shrink-0" />
          <span>Load Sequence</span>
        </button>

        <button
          type="button"
          className={`flex items-center gap-3 p-3 rounded-lg text-[13px] w-full text-left transition-colors ${
            activeTab === "trip-readiness"
              ? "bg-[#F97316] text-white font-semibold shadow-sm"
              : "text-[#8A9BB0] hover:text-white hover:bg-white/5 font-medium"
          }`}
          onClick={() => handleTabClick("trip-readiness")}
        >
          <ShieldCheckIcon className="w-[18px] h-[18px] shrink-0" />
          <span>Trip Readiness</span>
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;


