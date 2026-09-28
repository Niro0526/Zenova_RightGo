import Link from 'next/link';
import { BadgeAlert, TriangleAlert } from 'lucide-react';

type Status = 'Ready to Load' | 'Loading' | 'Attention';
type Trip = {
  vehicle: string;
  id: string;
  area: string;
  departure: string;
  outlets: number;
  orders: number;
  plan: number;
  status: Status;
  issue: boolean;
};

const trips: Trip[] = [
  { vehicle: 'PEL-R04', id: 'S1-T001', area: 'Colombo West', departure: '05:30', outlets: 4, orders: 6, plan: 1, status: 'Ready to Load', issue: false },
  { vehicle: 'PEL-D02', id: 'S1-T002', area: 'Colombo South', departure: '06:00', outlets: 3, orders: 4, plan: 1, status: 'Loading', issue: false },
  { vehicle: 'PEL-R02', id: 'S1-T003', area: 'Colombo East', departure: '06:30', outlets: 3, orders: 5, plan: 1, status: 'Attention', issue: true },
  { vehicle: 'PEL-V01', id: 'S1-T004', area: 'Colombo North', departure: '07:00', outlets: 2, orders: 2, plan: 2, status: 'Ready to Load', issue: false },
];

const primaryButton = 'min-h-[45px] w-full rounded-lg bg-[#F97316] px-4 py-3 text-sm font-bold leading-[21px] text-white transition-colors hover:bg-[#EA580C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316] disabled:cursor-not-allowed disabled:hover:bg-[#F97316]';
const continueLoadingButton = 'min-h-[45px] w-full rounded-lg bg-[#22C55E] px-4 py-3 text-sm font-bold leading-[21px] text-white transition-colors hover:bg-[#16A34A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E] disabled:cursor-not-allowed disabled:hover:bg-[#22C55E]';

function TripStatus({ status }: { status: Status }) {
  const colors = status === 'Loading'
    ? 'bg-[#ECFDF5] text-[#22C55E]'
    : status === 'Attention' ? 'bg-[#FFF4ED] text-[#F59E0B]' : 'bg-[#FFF4ED] text-[#F97316]';
  return <span className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs font-bold leading-[18px] ${colors}`}>{status}</span>;
}

function TripDetails({ trip }: { trip: Trip }) {
  return (
    <div className="flex flex-col gap-1.5 text-xs font-medium leading-[18px] text-[#485563]">
      <p className="text-[13px] font-normal leading-5">Depot: Peliyagoda • Brand: Unilever</p>
      <p>Planned departure: {trip.departure}</p>
      <p>{trip.outlets} outlets · {trip.orders} orders</p>
      <p>Plan v{trip.plan}</p>
      {trip.issue && <p className="flex items-center gap-1 text-[11px] font-semibold leading-[17px] text-[#EF4444]"><TriangleAlert size={14} aria-hidden="true" />1 loading issue reported</p>}
    </div>
  );
}

export default function LoaderDashboard() {
  return (
    <main id="loader-main" tabIndex={-1} className="flex-1 md:ml-[220px] lg:ml-[240px] min-h-screen w-full overflow-x-hidden p-4 pb-[85px] outline-none md:p-6 md:pb-12">
      <a href="#loader-main" className="sr-only z-50 rounded bg-white p-3 focus:not-sr-only focus:absolute">Skip to main content</a>
        <div className="flex flex-col gap-5">
          <header className="border-b border-[#CBD5E1] pb-4">
            <h1 className="text-[22px] font-bold leading-[33px]">Assigned Trips</h1>
            <p className="mt-1 text-[13px] leading-5 text-[#485563]">Today&apos;s loading schedule and active vehicle assignments</p>
          </header>

          <div className="flex items-center gap-3 rounded-xl border border-[#FFF4ED] bg-[#FFFBEB] px-4 py-[15px] text-[13px] leading-5 text-[#485563]">
            <BadgeAlert size={20} className="shrink-0 text-[#F59E0B]" aria-hidden="true" />
            <p>Scan vehicle barcode or select a trip card to begin</p>
          </div>
          <section aria-label="Assigned trips" className="flex flex-col gap-4">
            {trips.map((trip) => <article key={trip.id} aria-labelledby={`title-${trip.id}`} className={`flex flex-col gap-4 rounded-xl bg-white p-4 ${trip.status === 'Loading' ? 'border-2 border-[#22C55E]' : 'border border-[#CBD5E1]'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 id={`title-${trip.id}`} className="text-base font-bold leading-6">{trip.vehicle} / {trip.id}</h2><p className="mt-0.5 text-xs font-semibold leading-[18px] text-[#485563]">{trip.area}</p></div>
                <TripStatus status={trip.status} />
              </div>
              <TripDetails trip={trip} />
              {trip.id === 'S1-T001' || trip.status === 'Loading' ? (
                <Link
                  href="/loader/load-sequence"
                  className={`${trip.status === 'Loading' ? continueLoadingButton : primaryButton} block text-center`}
                  aria-label={`${trip.status === 'Loading' ? 'Continue loading' : 'Open trip'} ${trip.id}`}
                >
                  {trip.status === 'Loading' ? 'Continue Loading' : 'Open Trip'}
                </Link>
              ) : (
                <button
                  type="button"
                  className={trip.status === 'Loading' ? continueLoadingButton : primaryButton}
                  disabled
                  title="Loading details are not available for this demo trip"
                >
                  {trip.status === 'Loading' ? 'Continue Loading' : 'Open Trip'}
                </button>
              )}
            </article>)}
          </section>
          <p id="loader-integration-note" className="sr-only">Loading details are available for trip S1-T001.</p>

        </div>
    </main>
  );
}
