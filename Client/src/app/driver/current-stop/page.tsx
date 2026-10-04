"use client";

import { Suspense } from "react";
import { DriverStopWorkflow } from "@/components/driver/stop-workflow";

export default function CurrentStopPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px] text-slate-500 text-sm font-inter">
          Loading current stop...
        </div>
      }
    >
      <DriverStopWorkflow initialStopRecorded={false} />
    </Suspense>
  );
}
