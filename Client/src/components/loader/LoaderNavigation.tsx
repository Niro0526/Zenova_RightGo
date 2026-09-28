import Link from 'next/link';
import { ListChecks, ShieldCheck, Truck } from 'lucide-react';

const sections = [
  { label: 'Assigned Trips', icon: Truck, href: '/loader' },
  { label: 'Load Sequence', icon: ListChecks, href: '/loader/load-sequence' },
  { label: 'Trip Readiness', icon: ShieldCheck, href: null },
] as const;

export default function LoaderNavigation({ active }: { active: 'Assigned Trips' | 'Load Sequence' }) {
  return (
    <nav className="flex gap-2 overflow-x-auto md:flex-col" aria-label="Loader sections">
      {sections.map(({ label, icon: Icon, href }) => {
        const className = `flex min-h-11 shrink-0 items-center gap-3 whitespace-nowrap rounded-lg p-3 text-left text-[13px] leading-5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${active === label ? 'bg-[#F97316] font-semibold text-white' : 'font-medium text-[#8A9BB0]'} ${href ? 'hover:bg-[#232A2E]' : 'cursor-not-allowed'}`;
        const content = <><Icon size={18} aria-hidden="true" />{label}</>;
        return href
          ? <Link key={label} href={href} aria-current={active === label ? 'page' : undefined} className={className}>{content}</Link>
          : <button key={label} type="button" disabled className={className}>{content}</button>;
      })}
    </nav>
  );
}
