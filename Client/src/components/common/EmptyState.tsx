import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#CBD5E1] bg-white px-6 py-12 text-center">
      {icon && <div className="text-[#8A9BB0]" aria-hidden="true">{icon}</div>}
      <h2 className="text-base font-bold leading-6 text-[#202D2D]">{title}</h2>
      {description && <p className="max-w-sm text-[13px] leading-5 text-[#485563]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
