'use client';

import { useRouter } from 'next/navigation';

type Role = 'store-manager' | 'dispatcher' | 'loader';

export default function RoleSwitcher({ active }: { active: Role }) {
  const router = useRouter();

  return (
    <label className="flex w-full flex-col gap-2 text-xs text-[#8A9BB0]">
      <span>Switch workspace</span>
      <select
        value={active}
        onChange={(event) => router.push(`/${event.target.value}`)}
        className="min-h-11 w-full rounded-lg border border-[#333c46] bg-[#232A2E] px-3 text-[13px] font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
      >
        <option value="store-manager">Store Manager</option>
        <option value="dispatcher">Dispatcher</option>
        <option value="loader">Loader</option>
      </select>
    </label>
  );
}
