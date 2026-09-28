import type { Metadata } from 'next';
import { Route, Store, PackageCheck, Truck } from 'lucide-react';
import Logo from '@/components/common/Logo';
import RoleCard from '@/components/common/RoleCard';

export const metadata: Metadata = {
  title: 'RightGo',
  description: 'Choose a workspace to continue.',
};

const ROLES = [
  { href: '/dispatcher', title: 'Dispatcher', icon: Route, description: 'Plan daily runs, review capacity, and publish dispatch decisions for the depot.' },
  { href: '/store-manager', title: 'Store Manager', icon: Store, description: 'Place replenishment orders, track deliveries, and confirm receipts at the outlet.' },
  { href: '/loader', title: 'Loader', icon: PackageCheck, description: 'Verify assigned trips, work the load sequence, and report loading issues.' },
  { href: '/driver', title: 'Driver', icon: Truck, description: 'View assigned stops and trip status while on the road.' },
];

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center overflow-y-auto bg-[#F9FAFB] px-4 py-10 md:py-16">
      <div className="w-full max-w-3xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo tone="light" />
          <p className="max-w-md text-[13px] leading-5 text-[#485563]">
            A single logistics workspace for dispatch, store, loading and driving operations.
            Choose a role below to continue.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ROLES.map((role) => (
            <RoleCard key={role.href} href={role.href} title={role.title} description={role.description} icon={role.icon} />
          ))}
        </div>

        <p className="mt-8 text-center text-[12px] leading-5 text-[#8A9BB0]">
          This preview build has no sign-in yet — every workspace above is open for demonstration.
          Use the role switcher inside any workspace to jump between them.
        </p>
      </div>
    </div>
  );
}
