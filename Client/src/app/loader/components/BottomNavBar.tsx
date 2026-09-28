"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { TruckIcon, ListChecksIcon, ShieldCheckIcon } from "./icons";

interface BottomNavBarProps {
  activeTab?: "assigned-trips" | "load-sequence" | "trip-readiness";
  onTabChange?: (tab: "assigned-trips" | "load-sequence" | "trip-readiness") => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
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
    <nav className="flex md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#CBD5E1] flex-col pt-2 z-50 font-poppins">
      <div className="flex justify-around items-center w-full">
        <button
          type="button"
          className={`flex flex-col items-center justify-center gap-1 py-1 px-4 text-[11px] transition-colors ${
            activeTab === "assigned-trips"
              ? "text-[#F97316] font-bold"
              : "text-[#485563] font-medium"
          }`}
          onClick={() => handleTabClick("assigned-trips")}
        >
          <TruckIcon className="w-5 h-5" />
          <span>Trips</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center justify-center gap-1 py-1 px-4 text-[11px] transition-colors ${
            activeTab === "load-sequence"
              ? "text-[#F97316] font-bold"
              : "text-[#485563] font-medium"
          }`}
          onClick={() => handleTabClick("load-sequence")}
        >
          <ListChecksIcon className="w-5 h-5" />
          <span>Load Sequence</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center justify-center gap-1 py-1 px-4 text-[11px] transition-colors ${
            activeTab === "trip-readiness"
              ? "text-[#F97316] font-bold"
              : "text-[#485563] font-medium"
          }`}
          onClick={() => handleTabClick("trip-readiness")}
        >
          <ShieldCheckIcon className="w-5 h-5" />
          <span>Trip Readiness</span>
        </button>
      </div>

      {/* iOS Home Indicator */}
      <div className="w-[134px] h-[5px] bg-[#202D2D] rounded-full mx-auto mt-2.5 mb-1.5" />
    </nav>
  );
};

export default BottomNavBar;

