/* ─── Trip Info Card — top: 68, h: 83 ──────────────────────── */

interface TripInfoCardProps {
  vehicleId?: string;
  tripPlanId?: string;
  planVersion?: string;
}

export default function TripInfoCard({
  vehicleId = "",
  tripPlanId = "",
  planVersion = "",
}: TripInfoCardProps) {
  return (
    <div
      id="trip-info-card"
      className="absolute flex flex-col bg-white border border-[#CBD5E1] rounded-xl"
      style={{ top: 68, left: 17, width: 379, height: 83, padding: 14, gap: 10, boxSizing: "border-box" }}
    >
      {/* Labels row */}
      <div className="flex flex-row justify-between items-center" style={{ width: 351, height: 18 }}>
        <span className="text-[#485563] font-semibold" style={{ fontSize: 12, lineHeight: "18px" }}>
          CURRENT VEHICLE
        </span>
        <span className="text-[#485563] font-semibold" style={{ fontSize: 12, lineHeight: "18px" }}>
          TRIP PLAN
        </span>
      </div>

      {/* Values row */}
      <div className="flex flex-row justify-between items-center" style={{ width: 351, height: 27 }}>
        <span className="text-[#202D2D] font-bold" style={{ fontSize: 18, lineHeight: "27px" }}>
          {vehicleId || "—"}
        </span>
        <div className="flex flex-row items-center" style={{ gap: 8 }}>
          <span className="text-[#202D2D] font-bold" style={{ fontSize: 16, lineHeight: "24px" }}>
            {tripPlanId || "—"}
          </span>
          {planVersion ? (
            <span
              className="flex items-start bg-[#F9FAFB] rounded text-[#485563] font-semibold"
              style={{ padding: "2px 6px", fontSize: 11, lineHeight: "16px" }}
            >
              {planVersion}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
