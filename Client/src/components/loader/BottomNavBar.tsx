"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOADER_NAV } from "./nav";

export const BottomNavBar: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="flex md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#CBD5E1] flex-col pt-2 z-50 font-poppins" aria-label="Loader sections">
      <div className="flex justify-around items-center w-full">
        {LOADER_NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/loader" ? pathname === "/loader" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 flex-col items-center justify-center gap-1 py-1 px-4 text-[11px] transition-colors ${
                active ? "text-[#F97316] font-bold" : "text-[#485563] font-medium"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label === "Assigned Trips" ? "Trips" : label}</span>
            </Link>
          );
        })}
      </div>

      <div className="w-[134px] h-[5px] bg-[#202D2D] rounded-full mx-auto mt-2.5 mb-1.5" />
    </nav>
  );
};

export default BottomNavBar;
