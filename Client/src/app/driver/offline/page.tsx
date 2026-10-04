"use client";

import { Suspense } from "react";
import { DriverStopWorkflow } from "@/components/driver/stop-workflow";

export default function DriverOfflinePage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500 text-sm">Loading...</div>}>
      <DriverStopWorkflow initialStopRecorded={true} />
    </Suspense>
  );
}
