/* ─── Next Stop Card — top: 217, h: 242 ────────────────────── */

import Link from "next/link";
import { ClockIcon, ExternalLinkIcon } from "./icons";
import type { Stop } from "./types";

interface NextStopCardProps {
  stop: Stop;
  onOpenStop?: (stop: Stop) => void;
}

export default function NextStopCard({ stop, onOpenStop }: NextStopCardProps) {
  return (
    <div
      id="next-stop-card"
      className="absolute flex flex-col bg-white border-2 border-[#F97316] rounded-[14px]"
      style={{ top: 217, left: 16, width: 380, height: 242, padding: 16, gap: 14, boxSizing: "border-box" }}
    >
      {/* ── Row 1: badge + stop number ── */}
      <div className="flex flex-row justify-between items-center" style={{ width: 348, height: 25 }}>
        <div
          className="flex flex-row items-center bg-[#22C55E] rounded-[6px]"
          style={{ padding: "4px 8px", gap: 6, width: 76, height: 25 }}
        >
          <span className="text-white font-bold" style={{ fontSize: 11, lineHeight: "16px" }}>
            NEXT STOP
          </span>
        </div>
        <span className="text-[#485563] font-semibold" style={{ fontSize: 13, lineHeight: "20px" }}>
          Stop {stop.id}
        </span>
      </div>

      {/* ── Row 2: name + time window ── */}
      <div className="flex flex-col items-start" style={{ width: 348, gap: 4 }}>
        <span className="text-[#202D2D] font-bold" style={{ width: 348, fontSize: 20, lineHeight: "30px" }}>
          {stop.code} / {stop.name}
        </span>
        <div className="flex flex-row items-center" style={{ gap: 6 }}>
          <ClockIcon className="w-[14px] h-[14px] text-[#485563]" />
          <span className="text-[#485563] font-semibold" style={{ fontSize: 13, lineHeight: "20px" }}>
            Window: {stop.timeWindow}
          </span>
        </div>
      </div>

      {/* ── Row 3: orders + outlet ── */}
      <div
        className="flex flex-row items-start border-t border-[#CBD5E1]"
        style={{ width: 348, gap: 16, paddingTop: 4, boxSizing: "border-box" }}
      >
        <div className="flex flex-col items-start" style={{ gap: 2, width: 110 }}>
          <span className="text-[#485563] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
            ORDERS
          </span>
          <span className="text-[#202D2D] font-bold" style={{ fontSize: 15, lineHeight: "22px" }}>
            {stop.orders.join(", ")}
          </span>
        </div>
        <div className="flex flex-col items-start" style={{ gap: 2 }}>
          <span className="text-[#485563] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
            OUTLET
          </span>
          <span className="text-[#202D2D] font-bold" style={{ fontSize: 15, lineHeight: "22px" }}>
            {stop.outlets} outlet
          </span>
        </div>
      </div>

      {/* ── Row 4: Open Stop CTA ── */}
      <Link
        id="btn-open-next-stop"
        href="/driver/current-stop"
        aria-label={`Open stop ${stop.id}: ${stop.name}`}
        onClick={() => onOpenStop?.(stop)}
        className="flex flex-row justify-center items-center bg-[#F97316] rounded-xl border-none cursor-pointer transition-all duration-200 hover:bg-[#ea6c0a] active:scale-[0.98] no-underline"
        style={{ width: 348, height: 48, gap: 8, padding: "0 16px" }}
      >
        <ExternalLinkIcon className="w-[18px] h-[18px] text-white" />
        <span className="text-white font-bold" style={{ fontSize: 15, lineHeight: "22px" }}>
          Open Stop
        </span>
      </Link>
    </div>
  );
}
