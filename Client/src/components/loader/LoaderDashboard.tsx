'use client';

import { useState } from 'react';
import { ArrowLeft, BadgeAlert, CheckCircle2, ListChecks, MapPin, ShieldCheck, TriangleAlert, Truck } from 'lucide-react';

type View = 'Assigned Trips' | 'Load Sequence' | 'Trip Readiness';
type Status = 'Ready to Load' | 'Loading' | 'Attention' | 'Ready for Departure';
type Trip = {
  vehicle: string;
  id: string;
  area: string;
  departure: string;
  outlets: number;
  orders: number;
  plan: number;
  status: Status;
  loaded: number[];
  checked: string[];
  issue: boolean;
};

const initialTrips: Trip[] = [
  { vehicle: 'PEL-R04', id: 'S1-T001', area: 'Colombo West', departure: '05:30', outlets: 4, orders: 6, plan: 1, status: 'Ready to Load', loaded: [], checked: [], issue: false },
  { vehicle: 'PEL-D02', id: 'S1-T002', area: 'Colombo South', departure: '06:00', outlets: 3, orders: 4, plan: 1, status: 'Loading', loaded: [], checked: [], issue: false },
  { vehicle: 'PEL-R02', id: 'S1-T003', area: 'Colombo East', departure: '06:30', outlets: 3, orders: 5, plan: 1, status: 'Attention', loaded: [], checked: [], issue: true },
  { vehicle: 'PEL-V01', id: 'S1-T004', area: 'Colombo North', departure: '07:00', outlets: 2, orders: 2, plan: 2, status: 'Ready to Load', loaded: [], checked: [], issue: false },
];

const navigation = [
  { label: 'Assigned Trips' as const, icon: Truck },
  { label: 'Load Sequence' as const, icon: ListChecks },
  { label: 'Trip Readiness' as const, icon: ShieldCheck },
];
const checks = ['Vehicle inspected', 'Orders and quantities verified', 'Load secured', 'Dispatch documents checked'];
const primaryButton = 'min-h-[45px] w-full rounded-lg bg-[#F97316] px-4 py-3 text-sm font-bold leading-[21px] text-white transition-colors hover:bg-[#EA580C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500';

function TripStatus({ status }: { status: Status }) {
  const colors = status === 'Loading' || status === 'Ready for Departure'
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
  const [view, setView] = useState<View>('Assigned Trips');
  const [trips, setTrips] = useState(initialTrips);
  const [selectedId, setSelectedId] = useState<string>('');
  const selected = trips.find((trip) => trip.id === selectedId);

  function updateTrip(id: string, change: Partial<Trip>) {
    setTrips((current) => current.map((trip) => trip.id === id ? { ...trip, ...change } : trip));
  }

  function openTrip(trip: Trip) {
    setSelectedId(trip.id);
    setView('Load Sequence');
  }

  const complete = selected && selected.loaded.length === selected.orders && selected.checked.length === checks.length && !selected.issue;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#F9FAFB] font-poppins text-[#202D2D] md:flex-row">
      <a href="#loader-main" className="sr-only z-50 rounded bg-white p-3 focus:not-sr-only focus:absolute">Skip to main content</a>
      <aside className="flex shrink-0 flex-col gap-4 bg-[#161A1D] px-4 pb-4 pt-5 md:w-[220px] md:pb-5 md:pt-6" aria-label="Loader navigation">
        <div className="flex min-h-11 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F97316]"><MapPin size={18} aria-hidden="true" /></div>
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-[15px] font-bold leading-[23px] text-white">RightGo</span>
            <span className="rounded bg-[#202D2D] px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-[15px] text-[#F97316]">Loader Role</span>
          </div>
        </div>
        <div className="h-px bg-[#232A2E]" />
        <nav className="flex gap-2 overflow-x-auto md:flex-col" aria-label="Loader sections">
          {navigation.map(({ label, icon: Icon }) => (
            <button key={label} type="button" onClick={() => setView(label)} aria-current={view === label ? 'page' : undefined}
              className={`flex min-h-11 shrink-0 items-center gap-3 rounded-lg p-3 text-left text-[13px] leading-5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${view === label ? 'bg-[#F97316] font-semibold text-white' : 'font-medium text-[#8A9BB0] hover:bg-[#232A2E] hover:text-white'}`}>
              <Icon size={18} aria-hidden="true" />{label}
            </button>
          ))}
        </nav>
      </aside>

      <main id="loader-main" tabIndex={-1} className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 outline-none md:p-6">
        <div className="flex flex-col gap-5">
          <header className="border-b border-[#CBD5E1] pb-4">
            <h1 className="text-[22px] font-bold leading-[33px]">{view}</h1>
            <p className="mt-1 text-[13px] leading-5 text-[#485563]">{view === 'Assigned Trips' ? "Today's loading schedule and active vehicle assignments" : view === 'Load Sequence' ? 'Select a trip and track its loading progress' : 'Complete the checks before marking a trip ready for departure'}</p>
          </header>

          {view === 'Assigned Trips' ? <>
            <div className="flex items-center gap-3 rounded-xl border border-[#FFF4ED] bg-[#FFFBEB] px-4 py-[15px] text-[13px] leading-5 text-[#485563]">
              <BadgeAlert size={20} className="shrink-0 text-[#F59E0B]" aria-hidden="true" />
              <p>Select a trip card to begin loading</p>
            </div>
            <section aria-label="Assigned trips" className="flex flex-col gap-4">
              {trips.map((trip) => <article key={trip.id} aria-labelledby={`title-${trip.id}`} className={`flex flex-col gap-4 rounded-xl bg-white p-4 ${trip.status === 'Loading' ? 'border-2 border-[#22C55E]' : 'border border-[#CBD5E1]'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 id={`title-${trip.id}`} className="text-base font-bold leading-6">{trip.vehicle} / {trip.id}</h2><p className="mt-0.5 text-xs font-semibold leading-[18px] text-[#485563]">{trip.area}</p></div>
                  <TripStatus status={trip.status} />
                </div>
                <TripDetails trip={trip} />
                <button type="button" className={primaryButton} onClick={() => openTrip(trip)} aria-label={`${trip.status === 'Loading' ? 'Continue loading' : 'Open trip'} ${trip.id}`}>{trip.status === 'Loading' ? 'Continue Loading' : 'Open Trip'}</button>
              </article>)}
            </section>
          </> : <>
            <div className="flex flex-col gap-2">
              <label htmlFor="selected-trip" className="text-xs font-semibold text-[#485563]">Select assigned trip</label>
              <select id="selected-trip" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="min-h-11 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm focus:border-orange-500 focus:outline-orange-500">
                <option value="">Choose a trip</option>
                {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.vehicle} / {trip.id} — {trip.area}</option>)}
              </select>
            </div>
            {!selected ? <div className="rounded-xl border border-dashed border-[#CBD5E1] p-10 text-center text-sm text-[#485563]">Choose an assigned trip to view {view === 'Load Sequence' ? 'its loading sequence.' : 'its readiness checks.'}</div> :
              <section className="flex flex-col gap-4 rounded-xl border border-[#CBD5E1] bg-white p-4" aria-label={`${selected.id} details`}>
                <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-bold">{selected.vehicle} / {selected.id}</h2><TripStatus status={selected.status} /></div>
                <TripDetails trip={selected} />
                {selected.issue && <div role="status" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">This trip has a reported loading issue. Confirm that it has been resolved before departure.<button type="button" onClick={() => updateTrip(selected.id, { issue: false, status: selected.loaded.length ? 'Loading' : 'Ready to Load' })} className="mt-2 block rounded border border-red-300 px-3 py-2 font-semibold hover:bg-red-100">Confirm issue resolved</button></div>}
                {view === 'Load Sequence' ? <>
                  <div className="flex justify-between text-xs font-medium text-[#485563]"><span>Loading progress</span><span aria-live="polite">{selected.loaded.length} / {selected.orders} orders</span></div>
                  <progress className="h-2 w-full accent-[#22C55E]" value={selected.loaded.length} max={selected.orders} aria-label="Orders loaded" />
                  <p className="text-xs text-[#64748B]">Demo checklist — order manifests are not connected.</p>
                  <div className="divide-y divide-slate-100">
                    {Array.from({ length: selected.orders }, (_, index) => index + 1).map((order) => <label key={order} className="flex min-h-14 cursor-pointer items-center gap-3 py-3 text-[13px]">
                      <input type="checkbox" checked={selected.loaded.includes(order)} disabled={selected.status === 'Ready for Departure'} onChange={(event) => updateTrip(selected.id, { loaded: event.target.checked ? [...selected.loaded, order] : selected.loaded.filter((value) => value !== order), status: selected.issue ? 'Attention' : 'Loading' })} className="h-4 w-4 accent-[#F97316]" />
                      <span className="flex-1">Order {String(order).padStart(2, '0')}</span><span className={selected.loaded.includes(order) ? 'text-green-600' : 'text-slate-500'}>{selected.loaded.includes(order) ? 'Loaded' : 'Pending'}</span>
                    </label>)}
                  </div>
                  <button type="button" onClick={() => setView('Trip Readiness')} className={primaryButton}>Review Trip Readiness</button>
                </> : <>
                  <p className="text-[13px] text-[#485563]">{selected.loaded.length} of {selected.orders} orders loaded</p>
                  <fieldset className="flex flex-col gap-3"><legend className="mb-3 text-sm font-semibold">Pre-departure checks</legend>
                    {checks.map((check) => <label key={check} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-[13px]"><input type="checkbox" checked={selected.checked.includes(check)} disabled={selected.status === 'Ready for Departure'} onChange={(event) => updateTrip(selected.id, { checked: event.target.checked ? [...selected.checked, check] : selected.checked.filter((value) => value !== check) })} className="h-4 w-4 accent-[#F97316]" />{check}</label>)}
                  </fieldset>
                  {selected.status === 'Ready for Departure' ? <p role="status" className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-sm font-semibold text-green-700"><CheckCircle2 size={18} />Trip is ready for departure</p> : <>
                    <p className="text-xs text-[#64748B]">Load all orders, resolve any issues, and complete every check to continue.</p>
                    <button type="button" disabled={!complete} onClick={() => updateTrip(selected.id, { status: 'Ready for Departure' })} className={primaryButton}>Mark Ready for Departure</button>
                  </>}
                </>}
              </section>}
            <button type="button" onClick={() => setView('Assigned Trips')} className="flex min-h-11 items-center gap-2 self-start rounded px-2 text-[13px] font-medium text-[#485563] hover:text-[#F97316]"><ArrowLeft size={16} />Back to Assigned Trips</button>
          </>}
        </div>
      </main>
    </div>
  );
}
