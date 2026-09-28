"use client";

import React, { useState } from "react";
import AssignedTrips from "./AssignedTrips";
import LoadSequence from "./LoadSequence";
import ReportIssue from "./ReportIssue";
import TripReadiness from "./TripReadiness";

export default function LoaderPage() {
  const [tabHistory, setTabHistory] = useState<
    Array<"assigned-trips" | "load-sequence" | "trip-readiness" | "report-issue">
  >(["assigned-trips"]);

  const currentTab = tabHistory[tabHistory.length - 1] || "assigned-trips";

  const handleNavigate = (
    tab: "assigned-trips" | "load-sequence" | "trip-readiness" | "report-issue" | "back"
  ) => {
    if (tab === "back") {
      setTabHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : ["assigned-trips"]));
    } else {
      setTabHistory((prev) => {
        if (prev[prev.length - 1] === tab) return prev;
        return [...prev, tab];
      });
    }
  };

  if (currentTab === "trip-readiness") {
    return <TripReadiness onNavigate={handleNavigate} />;
  }

  if (currentTab === "report-issue") {
    return <ReportIssue onNavigate={handleNavigate} />;
  }

  if (currentTab === "load-sequence") {
    return <LoadSequence onNavigate={handleNavigate} />;
  }

  return <AssignedTrips onNavigate={handleNavigate} />;
}


