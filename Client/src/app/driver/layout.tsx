"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DriverSidebar, DriverMobileBottomNav } from "@/components/driver/driver-nav";
import { DriverConnectivityProvider } from "@/context/DriverConnectivityContext";
import { OfflineBanner } from "@/components/driver/today-run/OfflineBanner";
import RoleTopBar from "@/components/common/RoleTopBar";
import { useAuth } from "@/context/AuthContext";

/* ─── Root Driver Layout ──────────────────────────────────── */
export default function DriverLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const vehicleId = user?.vehicle_id || "";

  return (
    <DriverConnectivityProvider>
      <div
        className="flex flex-col md:flex-row min-h-screen md:h-screen w-full bg-[#F1F5F9] overflow-x-hidden md:overflow-hidden"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        {/* Sidebar — visible md+ */}
        <DriverSidebar pathname={pathname} />

        {/* Main content column with RoleTopBar & OfflineBanner */}
        <div className="flex-1 flex flex-col min-h-screen md:h-full md:min-h-0 md:overflow-hidden">
          <div className="hidden md:block">
            <RoleTopBar
              name={user?.display_name || "Driver"}
              role="Fleet Driver"
              initials={user?.display_name ? user.display_name.split(' ').map((p: string) => p[0]).join('').slice(0, 2) : "D"}
              stationId={vehicleId || undefined}
              stationName={vehicleId ? `Vehicle ${vehicleId}` : undefined}
              avatarColor="#F97316"
            />
          </div>
          <OfflineBanner />
          <main
            className="
              flex-1 flex flex-col
              w-full min-h-0
              overflow-y-auto
              pb-[84px] md:pb-6
            "
          >
            {children}
          </main>
        </div>

        {/* Mobile bottom nav — visible < md */}
        <DriverMobileBottomNav pathname={pathname} />
      </div>
    </DriverConnectivityProvider>
  );
}

