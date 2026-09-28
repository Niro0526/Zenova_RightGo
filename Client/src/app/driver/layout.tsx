/* ─── Driver Section Layout — responsive nav ─────────────────
   Mobile  (< md):  content full-width + fixed bottom tab bar
   Tablet/Desktop (md+): dark sidebar (256px) + content area
   ──────────────────────────────────────────────────────────── */

"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DriverSidebar, DriverMobileBottomNav } from "@/components/driver/driver-nav";

/* ─── Root Driver Layout ──────────────────────────────────── */
export default function DriverLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-[#F1F5F9]"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Sidebar — visible md+ */}
      <DriverSidebar pathname={pathname} />

      {/* Main content area */}
      <main
        className="
          flex-1 flex flex-col
          h-full min-h-0
          overflow-y-auto
          pb-[72px] md:pb-0
        "
      >
        {children}
      </main>

      {/* Mobile bottom nav — visible < md */}
      <DriverMobileBottomNav pathname={pathname} />
    </div>
  );
}
