import Link from "next/link";
import type { ComponentType } from "react";

interface RoleCardProps {
  href: string;
  title: string;
  description: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
}

export default function RoleCard({ href, title, description, icon: Icon }: RoleCardProps) {
  return (
    <Link
      href={href}
      className="figma-card flex flex-col gap-3 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#FFF4ED] text-[#F97316]" aria-hidden="true">
        <Icon size={22} />
      </div>
      <div>
        <h2 className="text-base font-bold leading-6 text-[#202D2D]">{title}</h2>
        <p className="mt-1 text-[13px] leading-5 text-[#485563]">{description}</p>
      </div>
      <span className="mt-auto text-[13px] font-semibold text-[#F97316]">Open workspace &rarr;</span>
    </Link>
  );
}
