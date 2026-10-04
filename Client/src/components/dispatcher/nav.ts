import { LayoutDashboard, ListOrdered, Calendar, ClipboardList, Database, PlayCircle, BarChart3, FileText } from 'lucide-react';
import type { NavItem } from '@/types/nav';

export const DISPATCHER_NAV: NavItem[] = [
  { href: '/dispatcher', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dispatcher/orders', label: 'Confirmed Orders', icon: ListOrdered },
  { href: '/dispatcher/planning', label: 'Planning', icon: Calendar },
  { href: '/dispatcher/live-operations', label: 'Live Operations', icon: PlayCircle },
  { href: '/dispatcher/future-capacity', label: 'Future Capacity', icon: Database },
  { href: '/dispatcher/reports', label: 'Reports', icon: FileText },
];
