import type { NavItem } from '@/types/nav';
import { TruckIcon, ListChecksIcon, ShieldCheckIcon, BadgeAlertIcon } from './icons';

export const LOADER_NAV: NavItem[] = [
  { href: '/loader', label: 'Assigned Trips', icon: TruckIcon },
  { href: '/loader/load-sequence', label: 'Load Sequence', icon: ListChecksIcon },
  { href: '/loader/trip-readiness', label: 'Trip Readiness', icon: ShieldCheckIcon },
  { href: '/loader/report-issue', label: 'Report Issue', icon: BadgeAlertIcon },
];
