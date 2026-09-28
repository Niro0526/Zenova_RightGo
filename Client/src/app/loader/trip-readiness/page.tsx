"use client";

import React from "react";
import { useRouter } from "next/navigation";
import TripReadiness from "@/components/loader/TripReadiness";

export default function TripReadinessPage() {
  const router = useRouter();

  const handleNavigate = (tab: "assigned-trips" | "load-sequence" | "trip-readiness" | "report-issue" | "back") => {
    if (tab === "assigned-trips") {
      router.push("/loader");
    } else if (tab === "load-sequence" || tab === "back") {
      router.push("/loader/load-sequence");
    } else if (tab === "trip-readiness") {
      router.push("/loader/trip-readiness");
    } else if (tab === "report-issue") {
      router.push("/loader/report-issue");
    }
  };

  return <TripReadiness onNavigate={handleNavigate} />;
}
