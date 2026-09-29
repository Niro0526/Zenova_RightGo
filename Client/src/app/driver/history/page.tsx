import { Suspense } from "react";
import { DriverHistoryWorkflow } from "@/components/driver/today-run/history-workflow";

export const metadata = {
  title: "Delivery & Report History - RightGo Driver Portal",
  description: "View completed delivery stops, proof of delivery, issue reports, and sync records.",
};

export default function DriverHistoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500 text-sm">Loading history records...</div>}>
      <DriverHistoryWorkflow />
    </Suspense>
  );
}

