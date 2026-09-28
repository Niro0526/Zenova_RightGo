import { LayoutDashboard, ListOrdered, Calendar, PlayCircle, Boxes, BarChart3 } from 'lucide-react';
import type { NavItem } from '@/types/nav';

export const DISPATCHER_NAV: NavItem[] = [
  { href: '/dispatcher', label: 'Overview', icon: LayoutDashboard },
  { href: '/dispatcher/orders', label: 'Orders', icon: ListOrdered },
  { href: '/dispatcher/planning', label: 'Planning', icon: Calendar },
  { href: '/dispatcher/live-operations', label: 'Operations', icon: PlayCircle },
  { href: '/dispatcher/stock', label: 'Stock', icon: Boxes },
  { href: '/dispatcher/future-capacity', label: 'Capacity', icon: BarChart3 },
];
