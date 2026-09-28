import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export default function PageHeader({ title, subtitle, actions, className = "" }: PageHeaderProps) {
  return (
    <header className={`flex flex-wrap items-start justify-between gap-3 border-b border-[#CBD5E1] pb-4 ${className}`}>
      <div>
        <h1 className="text-[22px] font-bold leading-[33px] text-[#202D2D]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] leading-5 text-[#485563]">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
