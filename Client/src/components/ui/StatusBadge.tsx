import type { ReactNode } from "react";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASS: Record<StatusTone, string> = {
  success: "out-for-delivery",
  warning: "deferred",
  danger: "danger",
  info: "info",
  neutral: "neutral",
};

interface StatusBadgeProps {
  tone: StatusTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Status is always conveyed by text (and optionally an icon), never color alone. */
export default function StatusBadge({ tone, icon, children, className = "" }: StatusBadgeProps) {
  return (
    <span className={`status-pill-figma ${TONE_CLASS[tone]} ${className}`.trim()}>
      {icon && <span className="mr-1.5 inline-flex items-center" aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
