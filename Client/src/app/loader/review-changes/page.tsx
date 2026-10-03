"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ReviewChanges from "@/components/loader/ReviewChanges";

export default function ReviewChangesPage() {
  const router = useRouter();

  const handleNavigate = (
    tab: "assigned-trips" | "load-sequence" | "trip-readiness" | "report-issue" | "review-changes" | "back"
  ) => {
    if (tab === "assigned-trips") {
      router.push("/loader");
    } else if (tab === "load-sequence" || tab === "back") {
      router.push("/loader/load-sequence");
    } else if (tab === "trip-readiness") {
      router.push("/loader/trip-readiness");
    } else if (tab === "report-issue") {
      router.push("/loader/report-issue");
    } else if (tab === "review-changes") {
      router.push("/loader/review-changes");
    }
  };

  return <ReviewChanges onNavigate={handleNavigate} />;
}