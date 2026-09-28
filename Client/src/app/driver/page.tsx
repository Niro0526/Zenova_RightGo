import type { Metadata } from 'next';
import DriverDashboard from '@/components/driver/DriverDashboard';

export const metadata: Metadata = {
  title: 'Trips | RightGo Driver',
  description: 'Assigned stops and trip status.',
};

export default function DriverPage() {
  return <DriverDashboard />;
}
