'use client';

import { usePathname } from 'next/navigation';
import MobileNavDrawer from '@/components/common/MobileNavDrawer';
import { DISPATCHER_NAV } from './nav';

export default function DispatcherMobileNav() {
  const pathname = usePathname();
  const items = DISPATCHER_NAV.map(({ href, label, icon }) => ({
    href, label, icon,
    active: href === '/dispatcher' ? pathname === '/dispatcher' : pathname === href || pathname?.startsWith(href + '/'),
  }));
  return <MobileNavDrawer items={items} />;
}
