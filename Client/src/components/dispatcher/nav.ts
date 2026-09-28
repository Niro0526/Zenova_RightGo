import { LayoutDashboard, ListOrdered, Calendar, ClipboardList, Database, PlayCircle, BarChart3 } from 'lucide-react';
import type { NavItem } from '@/types/nav';

export const DISPATCHER_NAV: NavItem[] = [
  { href: '/dispatcher', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dispatcher/orders', label: 'Confirmed Orders', icon: ListOrdered },
  { href: '/dispatcher/planning', label: 'Planning', icon: Calendar },
  { href: '/dispatcher/plan-review', label: 'Plan Review', icon: ClipboardList },
  { href: '/dispatcher/decision-ledger', label: 'Decision Ledger', icon: Database },
  { href: '/dispatcher/live-operations', label: 'Live Operations', icon: PlayCircle },
  { href: '/dispatcher/future-capacity', label: 'Future Capacity', icon: BarChart3 },
];
