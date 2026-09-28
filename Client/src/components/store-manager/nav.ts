import { Package, FilePlus, Truck } from 'lucide-react';
import type { NavItem } from '@/types/nav';

export const STORE_MANAGER_NAV: NavItem[] = [
  { href: '/store-manager/my-orders', label: 'My Orders', icon: Package },
  { href: '/store-manager/place-order', label: 'Place Order', icon: FilePlus },
  { href: '/store-manager/deliveries', label: 'Deliveries', icon: Truck },
];
