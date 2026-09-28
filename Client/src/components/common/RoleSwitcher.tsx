'use client';

import { useRouter } from 'next/navigation';

export type Role = 'store-manager' | 'dispatcher' | 'loader' | 'driver';

const ROLE_LABELS: Record<Role, string> = {
  'store-manager': 'Store Manager',
  dispatcher: 'Dispatcher',
  loader: 'Loader',
  driver: 'Driver',
};

const ROLE_PATHS: Record<Role, string> = {
  'store-manager': '/store-manager/my-orders',
  dispatcher: '/dispatcher',
  loader: '/loader',
  driver: '/driver/today-run',
};

export default function RoleSwitcher({ active }: { active: Role }) {
  const router = useRouter();

  return (
    <label className="flex w-full flex-col gap-2 text-xs text-[#8A9BB0]">
      <span>Switch workspace</span>
      <select
        value={active}
        onChange={(event) => router.push(ROLE_PATHS[event.target.value as Role] || `/${event.target.value}`)}
        className="min-h-11 w-full rounded-lg border border-[#333c46] bg-[#232A2E] px-3 text-[13px] font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
      >
        {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
          <option key={role} value={role}>{ROLE_LABELS[role]}</option>
        ))}
      </select>
    </label>
  );
}
