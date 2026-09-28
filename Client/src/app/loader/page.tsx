import type { Metadata } from 'next';
import AssignedTrips from './AssignedTrips';

export const metadata: Metadata = {
  title: 'Assigned Trips | RightGo Loader',
  description: 'Loading schedule and active vehicle assignments.',
};

export default function LoaderPage() {
  return <AssignedTrips />;
}
