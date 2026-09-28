'use client';

import { usePathname } from 'next/navigation';
import Logo from '@/components/common/Logo';
import NavItem from '@/components/common/NavItem';
import RoleSwitcher from '@/components/common/RoleSwitcher';
import { DRIVER_NAV } from './nav';

/** Single mobile-first header, matching Loader's compact style — Driver has one screen today. */
export default function DriverNav() {
  const pathname = usePathname();

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 bg-[#161A1D] px-4 py-3 font-poppins md:px-6">
      <Logo subtitle="Driver Role" />
      <nav className="flex items-center gap-2" aria-label="Driver sections">
        {DRIVER_NAV.map(({ href, label, icon }) => (
          <NavItem key={href} href={href} label={label} icon={icon} active={pathname === href} tone="dark" />
        ))}
      </nav>
      <div className="w-40">
        <RoleSwitcher active="driver" />
      </div>
    </header>
  );
}
