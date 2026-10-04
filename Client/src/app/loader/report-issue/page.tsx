"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReportIssue from "@/components/loader/ReportIssue";

function ReportIssuePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get("tripId");
  const suffix = tripId ? `?tripId=${tripId}` : "";

  const handleNavigate = (tab: "assigned-trips" | "load-sequence" | "trip-readiness" | "report-issue" | "back") => {
    if (tab === "assigned-trips") {
      router.push("/loader");
    } else if (tab === "load-sequence" || tab === "back") {
      router.push(`/loader/load-sequence${suffix}`);
    } else if (tab === "trip-readiness") {
      router.push(`/loader/trip-readiness${suffix}`);
    } else if (tab === "report-issue") {
      router.push(`/loader/report-issue${suffix}`);
    }
  };

  return <ReportIssue onNavigate={handleNavigate} />;
}

export default function ReportIssuePage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500 text-sm">Loading...</div>}>
      <ReportIssuePageInner />
    </Suspense>
  );
}
