/* ─── Stops Directory — top: 464 ───────────────────────────── */

import { NavigationIcon } from "./icons";
import type { Stop } from "./types";

interface StopsDirectoryProps {
  stops: Stop[];
}

/* ── Single stop row ── */
function StopCard({ stop }: { stop: Stop }) {
  const isNext = stop.status === "next";

  return (
    <div
      id={`stop-card-${stop.id}`}
      role="listitem"
      className={`flex flex-row items-center bg-white border rounded-[10px] transition-all duration-200 hover:shadow-md ${
        isNext ? "border-[#22C55E]" : "border-[#CBD5E1]"
      }`}
      style={{ width: 374, height: 69, padding: 12, gap: 12, boxSizing: "border-box" }}
    >
      {/* Icon circle */}
      <div
        className={`flex justify-center items-center rounded-full shrink-0 ${
          isNext ? "bg-[#E0F2FE]" : "bg-[#F9FAFB]"
        }`}
        style={{ width: 24, height: 24 }}
      >
        {isNext ? (
          <NavigationIcon className="w-[14px] h-[14px] text-[#22C55E]" />
        ) : (
          <span
            className="rounded-full border-2 border-[#485563] box-border"
            style={{ width: 10, height: 10 }}
          />
        )}
      </div>

      {/* Text block */}
      <div className="flex flex-col items-start flex-1" style={{ width: 314 }}>
        <span
          className={`font-bold ${isNext ? "text-[#202D2D]" : "text-[#485563]"}`}
          style={{ fontSize: 14, lineHeight: "21px", width: "100%" }}
        >
          Stop {stop.id}: {stop.code} / {stop.name}
        </span>
        <span
          className="text-[#485563] font-semibold"
          style={{ fontSize: 12, lineHeight: "18px", width: "100%" }}
        >
          {stop.outlets} outlet · {stop.orders.length}{" "}
          {stop.orders.length === 1 ? "order" : "orders"}
        </span>
        <span
          className={`font-semibold ${isNext ? "text-[#22C55E]" : "text-[#485563]"}`}
          style={{ fontSize: 12, lineHeight: "18px" }}
        >
          ○ {isNext ? "Next" : "Upcoming"}
        </span>
      </div>
    </div>
  );
}

/* ── Section wrapper ── */
export default function StopsDirectory({ stops }: StopsDirectoryProps) {
  return (
    <section
      id="stops-directory"
      aria-label="Stops directory"
      className="absolute flex flex-col"
      style={{ top: 464, left: 6, width: 406, padding: 16, gap: 16 }}
    >
      <div className="flex flex-col" style={{ width: 374, gap: 12 }}>
        <h2 className="text-[#485563] font-bold" style={{ fontSize: 14, lineHeight: "21px" }}>
          STOPS DIRECTORY
        </h2>

        <div role="list" className="flex flex-col" style={{ gap: 8, width: 374 }}>
          {stops.map((stop) => (
            <StopCard key={stop.id} stop={stop} />
          ))}
        </div>
      </div>
    </section>
  );
}
