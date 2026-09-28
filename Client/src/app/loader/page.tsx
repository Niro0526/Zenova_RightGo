import type { Metadata } from 'next';
import LoaderDashboard from '@/components/loader/LoaderDashboard';

export const metadata: Metadata = {
  title: 'Assigned Trips | RightGo Loader',
  description: 'Loading schedule and active vehicle assignments.',
};

export default function LoaderPage() {
  return <LoaderDashboard />;
}
