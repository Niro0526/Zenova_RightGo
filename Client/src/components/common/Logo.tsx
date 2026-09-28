import Link from "next/link";

interface LogoProps {
  /** Small uppercase tag shown under the wordmark, e.g. "Loader Role", "PULSE". */
  subtitle?: string;
  /** Compact single-letter mark instead of the full wordmark (tight spaces). */
  compact?: boolean;
  /** 'dark' = for dark sidebars (white wordmark), 'light' = for light backgrounds (dark wordmark). */
  tone?: "dark" | "light";
  href?: string;
  className?: string;
}

/**
 * Temporary text wordmark — no approved RightGo brand asset exists in this
 * repo yet. Replace with the approved logo file once design delivers one.
 */
export default function Logo({ subtitle, compact = false, tone = "dark", href, className = "" }: LogoProps) {
  const wordmarkColor = tone === "dark" ? "text-white" : "text-[#202D2D]";
  const mark = compact ? (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F97316] text-[15px] font-bold leading-none text-white"
      aria-hidden="true"
    >
      R
    </span>
  ) : (
    <span className={`text-[17px] font-bold leading-[22px] tracking-[-0.2px] ${wordmarkColor}`}>
      Right<span className="text-[#F97316]">Go</span>
    </span>
  );

  const content = (
    <span className={`flex items-center gap-2.5 ${className}`}>
      {mark}
      {subtitle && !compact && (
        <span className="flex flex-col gap-0.5">
          <span className="w-fit rounded bg-[#202D2D] px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-[15px] tracking-wider text-[#F97316]">
            {subtitle}
          </span>
        </span>
      )}
    </span>
  );

  if (compact && subtitle) {
    return (
      <span className={`flex flex-col items-start gap-0.5 ${className}`}>
        {mark}
        <span className="w-fit rounded bg-[#202D2D] px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-[13px] tracking-wider text-[#F97316]">
          {subtitle}
        </span>
      </span>
    );
  }

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" aria-label="RightGo home">
        {content}
      </Link>
    );
  }

  return content;
}
