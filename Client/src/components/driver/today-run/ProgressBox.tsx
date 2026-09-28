/* ─── Progress Box — top: 175 ──────────────────────────────── */

interface ProgressBoxProps {
  completedCount: number;
  totalCount: number;
}

export default function ProgressBox({ completedCount, totalCount }: ProgressBoxProps) {
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div
      id="progress-box"
      className="absolute flex flex-col"
      style={{ top: 175, left: 22, width: 358, gap: 8 }}
    >
      {/* Text row */}
      <div className="flex flex-row justify-between items-center" style={{ height: 21 }}>
        <span className="text-[#202D2D] font-bold" style={{ fontSize: 14, lineHeight: "21px" }}>
          {completedCount} of {totalCount} stops completed · {pct}%
        </span>
        <span className="text-[#485563] font-semibold" style={{ fontSize: 14, lineHeight: "21px" }}>
          {pct}%
        </span>
      </div>

      {/* Progress bar track */}
      <div
        className="bg-[#F9FAFB] rounded overflow-hidden"
        style={{ width: 358, height: 8 }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% of stops completed`}
      >
        <div
          className="bg-[#F97316] rounded transition-all duration-500"
          style={{ width: `${pct}%`, height: 8 }}
        />
      </div>
    </div>
  );
}
