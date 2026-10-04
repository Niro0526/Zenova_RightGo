"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Logo from "@/components/common/Logo";
import NavItem from "@/components/common/NavItem";
import { LOADER_NAV } from "./nav";

import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-[220px] lg:w-[240px] h-screen bg-[#161A1D] text-white shrink-0 p-[24px_16px_20px] hidden md:flex flex-col justify-between z-40 font-poppins overflow-y-auto">
      <div>
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
      </div>

      <div className="pt-4 border-t border-[#232A2E] mt-auto">
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
