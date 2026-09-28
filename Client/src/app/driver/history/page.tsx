import { DriverHistoryWorkflow } from "@/components/driver/today-run/history-workflow";

export const metadata = {
  title: "Delivery History - RightGo Driver Portal",
  description: "View completed delivery stops, proof of delivery, and sync records.",
};

export default function DriverHistoryPage() {
  return <DriverHistoryWorkflow />;
}
