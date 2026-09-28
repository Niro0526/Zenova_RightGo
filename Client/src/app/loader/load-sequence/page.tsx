"use client";

import React from "react";
import { useRouter } from "next/navigation";
import LoadSequence from "@/components/loader/LoadSequence";

export default function LoadSequenceRoute() {
  const router = useRouter();

  const handleNavigate = (tab: "assigned-trips" | "load-sequence" | "trip-readiness" | "report-issue" | "back") => {
    if (tab === "assigned-trips" || tab === "back") {
      router.push("/loader");
    } else if (tab === "load-sequence") {
      router.push("/loader/load-sequence");
    } else if (tab === "report-issue") {
      router.push("/loader/report-issue");
    } else if (tab === "trip-readiness") {
      router.push("/loader/trip-readiness");
    }
  };

  return <LoadSequence onNavigate={handleNavigate} />;
}
