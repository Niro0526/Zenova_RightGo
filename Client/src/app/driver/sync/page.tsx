"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DriverSyncMobileView, type SyncViewMode } from "@/components/driver/sync/DriverSyncMobileView";

function DriverSyncContent() {
  const searchParams = useSearchParams();
  const forcedMode = searchParams.get("mode") as SyncViewMode | null;

  return <DriverSyncMobileView forcedMode={forcedMode || undefined} />;
}

export default function DriverSyncPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500 text-sm">Loading sync status...</div>}>
      <DriverSyncContent />
    </Suspense>
  );
}
