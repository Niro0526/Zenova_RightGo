"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Logo from "@/components/common/Logo";
import NavItem from "@/components/common/NavItem";
import { LOADER_NAV } from "./nav";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-[220px] lg:w-[240px] h-screen bg-[#161A1D] text-white shrink-0 p-[24px_16px_20px] hidden md:flex flex-col z-40 font-poppins overflow-y-auto">
      <div className="mb-5 px-1">
        <Logo subtitle="Loader Role" />
      </div>

      <div className="w-full h-0 border-t border-[#232A2E] mb-4" />

      <nav className="flex flex-col gap-2 w-full">
        {LOADER_NAV.map(({ href, label, icon }) => {
          const active = href === "/loader" ? pathname === "/loader" : pathname.startsWith(href);
          return <NavItem key={href} href={href} label={label} icon={icon} active={active} tone="dark" />;
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
