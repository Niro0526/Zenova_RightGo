import Link from "next/link";
import type { ComponentType } from "react";

interface NavItemProps {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
  active: boolean;
  /** 'dark' = dark sidebar rail (default), 'light' = light-background nav. */
  tone?: "dark" | "light";
  /** Provide to render as a <button> (e.g. in-memory view switch) instead of a real <Link> navigation. */
  onClick?: () => void;
}

/**
 * Shared nav link rendering: consistent spacing, touch target (>=44px),
 * icon+label layout, and focus/active styling contract. Each role decides
 * its own `active` boolean (pathname- or state-driven) and navigation
 * mechanism (`href` for real routes, `onClick` for in-memory view switches
 * that must not remount the page); this component only owns the shared
 * visual contract.
 */
export default function NavItem({ href, label, icon: Icon, active, tone = "dark", onClick }: NavItemProps) {
  const inactiveClass = tone === "dark"
    ? "text-[#8A9BB0] hover:text-white hover:bg-white/5 font-medium"
    : "text-[#485563] hover:bg-[#F1F5F9] font-medium";

  const className = `flex min-h-11 w-full items-center gap-3 rounded-lg p-3 text-left text-[13px] leading-5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316] ${
    active ? "bg-[#F97316] font-semibold text-white shadow-sm" : inactiveClass
  }`;

  const content = (
    <>
      <Icon size={18} className="shrink-0" />
      <span>{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={className}>
      {content}
    </Link>
  );
}
