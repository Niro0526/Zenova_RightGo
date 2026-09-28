"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./components/Sidebar";
import BottomNavBar from "./components/BottomNavBar";

interface AssignedTripsProps {
  onNavigate?: (tab: "assigned-trips" | "load-sequence" | "trip-readiness" | "report-issue" | "back") => void;
}

export default function AssignedTrips({ onNavigate }: AssignedTripsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "assigned-trips" | "load-sequence" | "trip-readiness"
  >("assigned-trips");

  const handleTabChange = (tab: "assigned-trips" | "load-sequence" | "trip-readiness") => {
    setActiveTab(tab);
    if (onNavigate) {
      onNavigate(tab);
    } else {
      if (tab === "assigned-trips") router.push("/loader");
      else if (tab === "load-sequence") router.push("/loader/load-sequence");
      else if (tab === "trip-readiness") router.push("/loader/trip-readiness");
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#F9FAFB] font-poppins text-[#202D2D]">
      {/* Desktop Sidebar with Assigned Trips as active */}
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Main Content Area - Blank for now as requested */}
      <main className="flex-1 md:ml-[220px] lg:ml-[240px] bg-[#F9FAFB] min-h-screen flex flex-col w-full overflow-x-hidden pb-[85px] md:pb-12">
        {/* Mobile Top Header */}
        <div className="flex md:hidden items-center justify-between px-5 h-14 bg-white border-b border-[#CBD5E1]">
          <h1 className="text-lg font-bold text-[#202D2D] leading-[27px] m-0">
            Assigned Trips
          </h1>
        </div>
        {/* Intentionally blank content area */}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <BottomNavBar activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
