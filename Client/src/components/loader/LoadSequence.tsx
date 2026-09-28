'use client';

import { useRef, useState } from 'react';
import { BadgeAlert, CheckCircle2, MapPin, X } from 'lucide-react';

import LoaderNavigation from './LoaderNavigation';
import ReportIssue from './ReportIssue';

type Issue = { outlet: string; description: string };
const stops = [
  { id: 'OUT003', label: 'Stop 3 (Load First)', name: 'Mount Lavinia Super', details: '1 order • 520 kg • Chilled zone • 4 cases' },
  { id: 'OUT002', label: 'Stop 2', name: 'Nugegoda Corner Store', details: '1 order • 150 kg • Ambient zone • 2 cases' },
  { id: 'OUT001', label: 'Stop 1 (Unload First)', name: 'Colpetty Retailer', details: 'Two orders for one outlet - grouped' },
];
const orders = [
  { id: 'S1-000', zone: 'Ambient', details: '12 units • 97.8 kg • 0.500 m³' },
  { id: 'S1-001', zone: 'Chilled', details: '80 units • 448.6 kg • 2.445 m³' },
];
const primary = 'rounded-md bg-[#F97316] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#EA580C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:cursor-not-allowed disabled:opacity-40';
const secondary = 'rounded-md border border-[#F97316] bg-white px-3 py-2 text-xs font-semibold text-[#485563] transition hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500';

export default function LoadSequence() {
  const [loaded, setLoaded] = useState(['OUT003']);
  const [acknowledged, setAcknowledged] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [notice, setNotice] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const [reportOutlet, setReportOutlet] = useState<string | null>(null);
  const current = stops.find((stop) => !loaded.includes(stop.id));

  function acknowledge() {
    setAcknowledged(true);
    setNotice('Plan v2 acknowledged for this session.');
    dialog.current?.close();
  }

  if (reportOutlet) {
    const stop = stops.find(item => item.id === reportOutlet)!;
    return <ReportIssue outlet={`${stop.id} / ${stop.name}`} expectedQuantity={stop.id === 'OUT001' ? 80 : null} expectedLabel={stop.id === 'OUT001' ? '80 chilled units' : stop.details} orderRef={stop.id === 'OUT001' ? 'S1-001' : '—'} onBack={() => setReportOutlet(null)} onReport={(description) => setIssues(previous => [...previous, { outlet: stop.id, description }])} />;
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-y-auto bg-[#F9FAFB] text-[#202D2D] md:flex-row md:overflow-hidden">
      <aside className="shrink-0 bg-[#161A1D] px-4 pb-5 pt-6 md:w-[220px]" aria-label="Loader navigation">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F97316]"><MapPin size={18} aria-hidden="true" /></span>
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-[15px] font-bold leading-[23px] text-white">RightGo</span>
            <span className="rounded bg-[#202D2D] px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-[15px] text-[#F97316]">Loader Role</span>
          </div>
        </div>
        <div className="my-4 border-t border-[#232A2E]" />
        <LoaderNavigation active="Load Sequence" />
      </aside>

      <main className="min-w-0 flex-1 p-4 md:overflow-y-auto md:p-6">
        <header className="mb-4 border-b border-[#CBD5E1] pb-4">
          <h1 className="text-[22px] font-bold leading-[33px]">Load Sequence - Trip PEL-R04 / S1-T001</h1>
          <p className="mt-1 text-[13px] leading-5 text-[#485563]">Vehicle PEL-R04 (Refrigerated Truck) · Plan v{acknowledged ? '2' : '1'} · Departure 05:30</p>
        </header>

        {!acknowledged && <section aria-label="Plan update" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#FEF3C7] p-3">
          <p className="flex items-center gap-2 text-[13px] font-semibold"><BadgeAlert size={18} className="shrink-0 text-[#F59E0B]" aria-hidden="true" />Plan v2 available - 1 change on this trip</p>
          <div className="flex flex-wrap gap-2">
            <button className={`${secondary} !font-bold !text-[#F97316]`} onClick={() => { dialog.current?.showModal(); }}>Review Changes</button>
            <button className={primary} onClick={acknowledge}>Acknowledge Update</button>
          </div>
        </section>}

        <section aria-labelledby="sequence-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 id="sequence-heading" className="text-[15px] font-bold">Loading Sequence (LIFO Order)</h2>
            <p className="text-xs text-[#485563]">Load last-delivered stops first. Scan parcel barcode to verify sequence.</p>
          </div>
          <div className="flex flex-col gap-3">
            {stops.map((stop) => {
              const isLoaded = loaded.includes(stop.id);
              const isCurrent = current?.id === stop.id;
              return <article key={stop.id} className={`rounded-[10px] border bg-white p-4 ${isCurrent ? 'border-2 border-[#F97316]' : 'border-[#CBD5E1]'}`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2"><span className="font-mono text-sm font-bold leading-[18px]">{stop.id}</span><span className="text-xs font-semibold text-[#485563]">{stop.label}</span></div>
                    <h3 className="text-sm font-semibold leading-[21px] text-[#485563]">{stop.name}</h3>
                    <p className="text-xs leading-[18px] text-[#485563]">{stop.details}</p>
                  </div>
                  {isLoaded ? <span className="flex items-center gap-1 rounded-md bg-[#ECFDF5] px-2.5 py-1.5 text-xs font-bold text-[#22C55E]"><CheckCircle2 size={14} aria-hidden="true" />Loaded</span> : isCurrent ? <div className="flex gap-2">
                    <button className={secondary} onClick={() => setReportOutlet(stop.id)}>Report Issue</button>
                    <button className={`${primary} px-4`} onClick={() => { setLoaded((previous) => [...previous, stop.id]); setNotice(`${stop.id} marked as loaded.`); }}>Mark Loaded</button>
                  </div> : <span className="rounded-md bg-[#F9FAFB] px-2.5 py-1.5 text-xs font-bold text-[#485563]">Pending</span>}
                </div>
                {stop.id === 'OUT001' && <div className="mt-3 flex flex-col gap-2.5">{orders.map((order) => <div key={order.id} className="rounded-lg bg-[#F9FAFB] p-3">
                  <div className="mb-1.5 flex items-center justify-between"><h4 className="text-[13px] font-bold">Order {order.id}</h4><span className="px-2 py-1 text-[11px] font-semibold text-[#485563]">{order.zone}</span></div>
                  <p className="text-xs text-[#485563]">{order.details}</p>
                </div>)}</div>}
              </article>;
            })}
          </div>
        </section>

        {issues.length > 0 && <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4"><h2 className="mb-2 text-sm font-semibold">Reported issues (this session)</h2>{issues.map((issue, index) => <p key={index} className="break-words text-xs leading-6">{issue.outlet}: {issue.description}</p>)}</section>}
        <p role="status" className="mt-3 text-xs text-[#485563]">{notice}</p>
      </main>

      <dialog ref={dialog} aria-labelledby="loader-dialog-title" className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl bg-white p-6 text-[#202D2D] shadow-xl backdrop:bg-black/40">
        <div className="mb-4 flex items-center justify-between gap-4"><h2 id="loader-dialog-title" className="text-lg font-bold">Review plan v2</h2><button aria-label="Close dialog" onClick={() => dialog.current?.close()} className="rounded p-1 hover:bg-slate-100"><X size={20} /></button></div>
        <p className="mb-4 text-sm leading-6 text-[#485563]">1 change is flagged for PEL-R04 / S1-T001. The supplied demo does not include the revised plan details. Confirm the change with your dispatcher before acknowledging.</p>
        <div className="flex justify-end gap-2"><button className={secondary} onClick={() => dialog.current?.close()}>Close</button><button className={primary} onClick={acknowledge}>Acknowledge Update</button></div>
      </dialog>
    </div>
  );
}
