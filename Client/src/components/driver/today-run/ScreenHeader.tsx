import { useConnectivity } from "@/context/DriverConnectivityContext";

interface ScreenHeaderProps {
  title?: string;
  isOnline?: boolean;
}

export default function ScreenHeader({
  title = "Today's Run",
  isOnline: propIsOnline,
}: ScreenHeaderProps) {
  const { connectionState, isOnline: contextIsOnline } = useConnectivity();
  const effectiveOnline = propIsOnline !== undefined ? propIsOnline : contextIsOnline;

  const dotColor =
    connectionState === "offline" || !effectiveOnline
      ? "#F97316"
      : connectionState === "syncing"
      ? "#3B82F6"
      : "#22C55E";

  const labelText =
    connectionState === "offline" || !effectiveOnline
      ? "Offline"
      : connectionState === "syncing"
      ? "Syncing"
      : connectionState === "synced"
      ? "Synced"
      : "Online";

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
        style={{ padding: "4px 8px", gap: 6, minWidth: 67, height: 25, boxSizing: "border-box" }}
      >
        <span
          className={`rounded-full shrink-0 ${connectionState === "syncing" ? "animate-pulse" : ""}`}
          style={{
            width: 8,
            height: 8,
            background: dotColor,
          }}
        />
        <span
          className="font-semibold"
          style={{ fontSize: 11, lineHeight: "16px", color: dotColor }}
        >
          {labelText}
        </span>
      </div>
    </header>
  );
}
