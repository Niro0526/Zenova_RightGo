"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ShieldCheck,
  Info,
  FileCheck2,
  Truck,
} from "lucide-react";
import { ChevronLeftIcon } from "./icons";
import { fetchLatestManifest, postAckManifest, type ManifestResponse } from "@/lib/loader/loader-api";
import { ApiError } from "@/lib/api/client";

interface ReviewChangesProps {
  onNavigate?: (
    tab: "assigned-trips" | "load-sequence" | "trip-readiness" | "report-issue" | "review-changes" | "back"
  ) => void;
}

export default function ReviewChanges({ onNavigate }: ReviewChangesProps) {
  const router = useRouter();
  const [manifest, setManifest] = useState<ManifestResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAcking, setIsAcking] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setManifest(await fetchLatestManifest());
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.message : "Cannot reach the RightGo server.");
      }
    })();
  }, []);

  const handleBack = () => {
    if (onNavigate) onNavigate("load-sequence");
    else if (typeof window !== "undefined" && (window.history.state?.idx > 0 || window.history.length > 1)) router.back();
    else router.push("/loader/load-sequence");
  };

  const handleAcknowledge = async () => {
    if (!manifest) return;
    setIsAcking(true);
    try {
      const updated = await postAckManifest(manifest.version);
      setManifest(updated);
      setNotification(`Manifest v${manifest.version} acknowledged. Loader portal synced.`);
      setTimeout(() => handleBack(), 1800);
    } catch (err) {
      setNotification(err instanceof ApiError ? err.message : "Failed to acknowledge manifest.");
    } finally {
      setIsAcking(false);
    }
  };

  const isAcknowledged = manifest?.acknowledgement === "acknowledged";

  return (
    <main className="w-full max-w-full overflow-x-hidden bg-[#F9FAFB] flex flex-col box-border">
      <div className="flex lg:hidden items-center justify-between px-4 h-14 bg-white border-b border-[#CBD5E1] sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button type="button" className="p-1 text-[#202D2D] hover:bg-gray-100 rounded-md transition-colors" onClick={handleBack} title="Back to Load Sequence">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-[#202D2D] leading-[27px] m-0">Review Manifest</h1>
        </div>
        {manifest && (
          <span className="bg-[#FEF3C7] text-[#D97706] font-inter text-[11px] font-bold px-2 py-1 rounded-md border border-[#FDE68A]">
            v{manifest.version}
          </span>
        )}
      </div>

      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-[#202D2D] text-white px-5 py-3 rounded-xl text-xs font-semibold z-50 shadow-2xl border border-gray-700 text-center max-w-[90%] flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#22C55E] shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 box-border p-4 lg:p-0">
        {loadError && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {loadError}
          </div>
        )}

        <div className="hidden lg:flex flex-col gap-1">
          <h1 className="text-[22px] lg:text-2xl font-bold text-[#202D2D] leading-[33px] m-0">
            Released Manifest {manifest ? `v${manifest.version}` : ""}
          </h1>
          <p className="text-[13px] lg:text-sm text-[#485563] leading-5 m-0 font-normal">
            Published by {manifest?.decisionMaker ?? "-"} at {manifest?.publishedAt ?? "-"}. Review assigned trips before acknowledging.
          </p>
        </div>

        {manifest && (
          <div className="flex flex-col gap-4">
            {manifest.trips.map((t) => (
              <div key={t.id} className="bg-white border border-[#CBD5E1] rounded-xl p-4 lg:p-5 flex flex-col gap-3 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
                  <div className="flex items-center gap-2">
                    <Truck size={16} className="text-[#F97316]" />
                    <span className="text-sm font-bold text-[#202D2D]">{t.vehicleId}</span>
                    <span className="text-[11px] font-semibold text-[#485563] bg-[#F1F5F9] px-2 py-0.5 rounded">{t.tripId}</span>
                  </div>
                  <span className="text-xs text-[#64748B]">Depart: {t.plannedDepartureTime || "-"}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="flex flex-col">
                    <span className="text-[#64748B]">Outlets</span>
                    <span className="font-bold text-[#202D2D]">{t.stopOutletIds.length}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#64748B]">Orders</span>
                    <span className="font-bold text-[#202D2D]">{t.orderRefs.length}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#64748B]">Brand</span>
                    <span className="font-bold text-[#202D2D]">{t.brand || "-"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#64748B]">Status</span>
                    <span className="font-bold text-[#202D2D] capitalize">{t.loadingStatus}</span>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                <h3 className="text-sm font-bold text-[#202D2D] m-0 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#22C55E]" />
                  <span>Acknowledgement Status</span>
                </h3>
                <span className={`text-xs font-bold ${isAcknowledged ? "text-[#059669]" : "text-[#D97706]"}`}>
                  {isAcknowledged ? "ACKNOWLEDGED" : "PENDING"}
                </span>
              </div>
              <p className="text-xs text-[#485563] m-0">
                {isAcknowledged
                  ? `Manifest v${manifest.version} has been acknowledged by the loading team.`
                  : "This manifest has not yet been acknowledged. Acknowledge once all trips above have been reviewed."}
              </p>
            </div>

            <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 lg:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-[#64748B]">
                <Info size={15} className="text-[#F97316] shrink-0" />
                <span>Acknowledging notifies dispatch that the manifest is confirmed for loading.</span>
              </div>
              <button
                type="button"
                onClick={() => void handleAcknowledge()}
                disabled={isAcknowledged || isAcking}
                className="w-full sm:w-auto px-6 py-3 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                <FileCheck2 size={16} />
                <span>{isAcknowledged ? "Acknowledged" : isAcking ? "Acknowledging..." : `Acknowledge Manifest v${manifest.version}`}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
