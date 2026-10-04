"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoadSequence from "@/components/loader/LoadSequence";

function LoadSequenceRouteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get("tripId");
  const suffix = tripId ? `?tripId=${tripId}` : "";

  const handleNavigate = (
    tab: "assigned-trips" | "load-sequence" | "trip-readiness" | "report-issue" | "review-changes" | "back"
  ) => {
    if (tab === "assigned-trips" || tab === "back") {
      router.push("/loader");
    } else if (tab === "load-sequence") {
      router.push(`/loader/load-sequence${suffix}`);
    } else if (tab === "report-issue") {
      router.push(`/loader/report-issue${suffix}`);
    } else if (tab === "trip-readiness") {
      router.push(`/loader/trip-readiness${suffix}`);
    } else if (tab === "review-changes") {
      router.push("/loader/review-changes");
    }
  };

  return <LoadSequence onNavigate={handleNavigate} />;
}

export default function LoadSequenceRoute() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500 text-sm">Loading...</div>}>
      <LoadSequenceRouteInner />
    </Suspense>
  );
}
