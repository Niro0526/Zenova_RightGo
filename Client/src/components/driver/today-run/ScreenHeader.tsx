/* ─── Screen Header — top: 0, h: 55 ───────────────────────── */

interface ScreenHeaderProps {
  title?: string;
  isOnline?: boolean;
}

export default function ScreenHeader({
  title = "Today's Run",
  isOnline = true,
}: ScreenHeaderProps) {
  return (
    <header
      id="driver-header"
      className="md:hidden absolute flex flex-row items-center justify-between bg-[#202D2D]"
      style={{ top: 0, left: 0, width: 412, height: 55, padding: "14px 16px", boxSizing: "border-box" }}
    >
      {/* Left — title */}
      <span className="text-white font-bold" style={{ fontSize: 18, lineHeight: "27px" }}>
        {title}
      </span>

      {/* Right — connectivity pill */}
      <div
        id="connectivity-pill"
        className="flex flex-row items-center bg-white border border-[#CBD5E1] rounded-full"
        style={{ padding: "4px 8px", gap: 6, width: 67, height: 25, boxSizing: "border-box" }}
      >
        <span
          className="rounded-full shrink-0"
          style={{
            width: 8,
            height: 8,
            background: isOnline ? "#22C55E" : "#EF4444",
          }}
        />
        <span
          className="font-semibold"
          style={{ fontSize: 11, lineHeight: "16px", color: isOnline ? "#22C55E" : "#EF4444" }}
        >
          {isOnline ? "Online" : "Offline"}
        </span>
      </div>
    </header>
  );
}
