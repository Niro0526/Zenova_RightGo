import { Truck } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';

export default function DriverDashboard() {
  return (
    <div className="flex flex-col gap-5 p-4 md:p-6">
      <PageHeader title="Trips" subtitle="Assigned stops and trip status" />
      <EmptyState
        icon={<Truck size={32} />}
        title="No trip data connected yet"
        description="This is a navigation shell only — the driver workspace (assigned stops, arrival windows, event reporting) is not implemented. It will appear here once the driver trip API is connected."
      />
    </div>
  );
}
