'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BadgeAlert, Camera, CheckCircle2, CircleHelp, ListChecks, MapPin, Minus, Settings, ShieldCheck, TriangleAlert, Truck, X } from 'lucide-react';

const issueTypes = [
  { label: 'Missing', icon: CircleHelp },
  { label: 'Damaged', icon: TriangleAlert },
  { label: 'Short Quantity', icon: Minus },
  { label: 'Vehicle Problem', icon: Settings },
] as const;
type IssueType = typeof issueTypes[number]['label'];
type View = 'Assigned Trips' | 'Load Sequence' | 'Trip Readiness';
type Photo = { name: string; url: string };
type Report = { issue: IssueType; quantity: string; notes: string; reporter: string; eventTime: string; resolution: string; photoCount: number };
const resolutions = ['Replace affected stock', 'Defer entire order to next dispatch wave'];
const initialNotes = 'Packaging compromised - visible moisture damage on 8 units of chilled stock';
const fieldClass = 'h-[45px] w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm text-[#202D2D] outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100';
const focusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2';

export default function LoaderPage() {
  const [view, setView] = useState<View>('Load Sequence');
  const [issue, setIssue] = useState<IssueType>('Damaged');
  const [quantity, setQuantity] = useState('8');
  const [notes, setNotes] = useState(initialNotes);
  const [reporter, setReporter] = useState('Kasun Perera (Loader)');
  const [eventTime, setEventTime] = useState('2026-01-08T05:45');
  const [resolution, setResolution] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<Report | null>(null);
  const [dragging, setDragging] = useState(false);
  const photoUrls = useRef(new Set<string>());
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = photoUrls.current;
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, []);

  function clearPhotos() {
    photoUrls.current.forEach(url => URL.revokeObjectURL(url));
    photoUrls.current.clear();
    setPhotos([]);
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    if (selected.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024)) {
      setError('Choose JPG, PNG or WebP photos, up to 10 MB each.');
      return;
    }
    if (photos.length + selected.length > 5) {
      setError('You can attach up to 5 photos.');
      return;
    }
    setPhotos(previous => [...previous, ...selected.map(file => {
      const url = URL.createObjectURL(file);
      photoUrls.current.add(url);
      return { name: file.name, url };
    })]);
    setError('');
  }

  function resetForm() {
    setIssue('Damaged'); setQuantity('8'); setNotes(initialNotes);
    setReporter('Kasun Perera (Loader)'); setEventTime('2026-01-08T05:45');
    setResolution(''); setError(''); clearPhotos();
  }

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!notes.trim() || !reporter.trim()) {
      setError('Enter notes and the reporter name.'); return;
    }
    if (!resolution) {
      setError('Select a resolution option before reporting the issue.'); return;
    }
    setError('');
    setSubmitted({ issue, quantity, notes, reporter, eventTime, resolution, photoCount: photos.length });
    setView('Trip Readiness');
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white text-[#202D2D] md:flex-row">
      <aside className="flex shrink-0 flex-col gap-4 bg-[#161A1D] px-4 py-5 md:w-[220px] md:py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#F97316]"><MapPin size={18} aria-hidden="true" /></div>
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-[15px] font-bold text-white">RightGo</span>
            <span className="rounded bg-[#202D2D] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#F97316]">Loader Role</span>
          </div>
        </div>
        <div className="h-px bg-[#232A2E]" />
        <nav aria-label="Loader navigation" className="grid grid-cols-3 gap-2 md:flex md:flex-col">
          {([{ label: 'Assigned Trips', icon: Truck }, { label: 'Load Sequence', icon: ListChecks }, { label: 'Trip Readiness', icon: ShieldCheck }] as const).map(({ label, icon: Icon }) => (
            <button key={label} onClick={() => setView(label)} aria-current={view === label ? 'page' : undefined}
              className={`flex min-h-11 flex-col items-center gap-2 rounded-lg px-2 py-3 text-[11px] transition md:flex-row md:gap-3 md:px-3 md:text-[13px] ${focusClass} ${view === label ? 'bg-[#F97316] font-semibold text-white' : 'font-medium text-[#8A9BB0] hover:bg-[#232A2E] hover:text-white'}`}>
              <Icon size={18} className="shrink-0" aria-hidden="true" /><span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-4 p-4 md:p-6">
          <header className="border-b border-[#CBD5E1] pb-4">
            <h1 className="text-[22px] font-bold leading-[33px]">{view === 'Load Sequence' ? 'Report Issue' : view}</h1>
            <p className="mt-1 text-[13px] leading-5 text-[#485563]">{view === 'Load Sequence' ? 'Loading shortfall before departure - fast issue logging to alert dispatch and operations' : view === 'Assigned Trips' ? 'Review your assigned trip and prepare the order for departure.' : 'Review loading issues before the trip is cleared for departure.'}</p>
          </header>

          <dl className="grid grid-cols-2 gap-x-5 gap-y-3 rounded-lg bg-[#F9FAFB] p-3 lg:flex lg:flex-wrap">
            {[['Active Trip', 'PEL-R04 / S1-T001'], ['Vehicle', 'PEL-R04'], ['Outlet', 'OUT001 / Colpetty Retailer'], ['Order Ref', 'S1-001']].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] font-semibold uppercase leading-[17px] text-[#485563]">{label}</dt>
                <dd className={`mt-0.5 text-sm font-bold leading-[21px] ${label === 'Order Ref' ? 'font-mono' : ''} ${label === 'Outlet' ? 'font-semibold text-[#485563]' : ''}`}>{value}</dd>
              </div>
            ))}
          </dl>

          {view === 'Load Sequence' ? (
            <form onSubmit={submitReport} className="flex flex-col gap-4">
              <fieldset>
                <legend className="mb-3 text-[13px] font-bold text-[#485563]">Select Issue Type</legend>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {issueTypes.map(({ label, icon: Icon }) => (
                    <label key={label} className="relative cursor-pointer">
                      <input className="peer sr-only" type="radio" name="issue" value={label} checked={issue === label} onChange={() => setIssue(label)} />
                      <span className={`flex h-[88px] flex-col items-center justify-center gap-3 rounded-xl border bg-white px-2 text-center text-[13px] font-bold peer-focus-visible:ring-2 peer-focus-visible:ring-orange-400 peer-focus-visible:ring-offset-2 ${issue === label ? 'border-2 border-[#F97316]' : 'border-[#CBD5E1] hover:border-orange-300'}`}>
                        <Icon size={24} className={label === 'Damaged' ? 'text-[#F59E0B]' : 'text-[#485563]'} aria-hidden="true" />{label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-[13px] font-bold text-[#485563]">Expected Quantity
                  <input readOnly value="80 chilled units" className={`${fieldClass} font-normal`} />
                </label>
                <label className="flex flex-col gap-1.5 text-[13px] font-bold text-[#485563]">Reported Affected Quantity
                  <span className="relative"><input type="number" min="1" max="80" step="1" required value={quantity} onChange={event => setQuantity(event.target.value)} className={`${fieldClass} pr-16 font-normal`} /><span className="pointer-events-none absolute right-4 top-3 text-sm font-normal text-slate-500">units</span></span>
                </label>
                <label className="flex flex-col gap-1.5 text-[13px] font-bold text-[#485563]">Notes
                  <textarea required maxLength={2000} value={notes} onChange={event => setNotes(event.target.value)} className={`${fieldClass} min-h-[45px] resize-y py-3 font-normal`} rows={1} />
                </label>
                <div>
                  <p id="photo-label" className="mb-1.5 text-[13px] font-bold text-[#485563]">Photo Evidence</p>
                  <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" aria-label="Choose photo evidence" onChange={event => { addPhotos(event.target.files); event.target.value = ''; }} />
                  <button type="button" aria-labelledby="photo-label photo-instructions" onClick={() => fileInput.current?.click()}
                    onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
                    onDrop={event => { event.preventDefault(); setDragging(false); addPhotos(event.dataTransfer.files); }}
                    className={`flex min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-[#485563] transition ${focusClass} ${dragging ? 'border-orange-500 bg-orange-50' : 'border-[#CBD5E1] hover:border-orange-400 hover:bg-orange-50/30'}`}>
                    <Camera size={32} aria-hidden="true" />
                    <span id="photo-instructions" className="text-[13px] font-semibold">Add Photo - Attach clear photo of damage/packaging/label</span>
                    <span className="text-[11px] text-slate-500">Drop files here or browse · JPG, PNG, WebP · Up to 5 photos, 10 MB each</span>
                  </button>
                  {photos.length > 0 && <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">{photos.map(photo => (
                    <li key={photo.url} className="relative overflow-hidden rounded-lg border border-slate-200">
                      {/* Local object URLs are temporary previews, not remote image assets. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={photo.name} className="h-24 w-full object-cover" />
                      <p className="truncate p-2 text-[10px]">{photo.name}</p>
                      <button type="button" aria-label={`Remove ${photo.name}`} className={`absolute right-1 top-1 rounded-full bg-white p-1 shadow ${focusClass}`} onClick={() => { URL.revokeObjectURL(photo.url); photoUrls.current.delete(photo.url); setPhotos(previous => previous.filter(item => item.url !== photo.url)); }}><X size={14} /></button>
                    </li>
                  ))}</ul>}
                </div>
                <label className="flex flex-col gap-1.5 text-[13px] font-bold text-[#485563]">Reporter
                  <input required value={reporter} onChange={event => setReporter(event.target.value)} className={`${fieldClass} font-normal`} />
                </label>
                <label className="flex flex-col gap-1.5 text-[13px] font-bold text-[#485563]">Event Time
                  <input type="datetime-local" required value={eventTime} onChange={event => setEventTime(event.target.value)} className={`${fieldClass} font-normal`} />
                </label>
              </div>

              <fieldset>
                <legend className="mb-2 text-[13px] font-bold text-[#485563]">Resolution Options</legend>
                <div className="grid gap-3 sm:grid-cols-2">{resolutions.map(option => (
                  <label key={option} className="cursor-pointer">
                    <input type="radio" name="resolution" value={option} checked={resolution === option} onChange={() => setResolution(option)} className="peer sr-only" />
                    <span className={`flex min-h-[52px] items-center justify-center rounded-xl border p-3 text-center text-[13px] font-bold peer-focus-visible:ring-2 peer-focus-visible:ring-orange-400 peer-focus-visible:ring-offset-2 ${resolution === option ? 'border-orange-500 bg-orange-50' : 'border-[#CBD5E1] hover:border-orange-300'}`}>{option}</span>
                  </label>
                ))}</div>
              </fieldset>
              <div className="flex items-center gap-3 rounded-xl bg-[#FFF4ED] p-3 text-[13px] leading-5 text-[#485563]">
                <BadgeAlert size={20} className="shrink-0 text-[#F59E0B]" aria-hidden="true" />
                <p>Dispatcher will be notified. Trip status will change to Not Ready until resolved.</p>
              </div>
              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-[13px] text-red-700">{error}</p>}
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => { resetForm(); setView('Assigned Trips'); }} className={`min-h-[45px] rounded-lg bg-[#F9FAFB] px-3 py-3 text-sm font-bold text-[#485563] hover:bg-slate-100 ${focusClass}`}>Cancel</button>
                  <button type="submit" className={`min-h-[45px] rounded-lg bg-[#F97316] px-3 py-3 text-sm font-bold hover:bg-orange-600 ${focusClass}`}>Report Shortfall</button>
                </div>
                <p className="mt-2 text-center text-[11px] leading-[17px] text-[#485563]">Note: This shortage is a simulated operational event for prototype demonstration, not a supplied dataset fact.</p>
              </div>
            </form>
          ) : (
            <section className="rounded-xl border border-[#CBD5E1] p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold">{view === 'Assigned Trips' ? 'S1-T001 · Colpetty Retailer' : 'Departure readiness'}</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${submitted ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>{submitted ? 'Not Ready' : 'Awaiting checks'}</span>
              </div>
              <p className="mt-3 text-sm text-[#485563]">80 chilled units · Order S1-001 · Vehicle PEL-R04</p>
              {submitted ? <div role="status" className="mt-5 rounded-lg bg-[#FFF4ED] p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={18} className="text-orange-600" />Issue recorded in this demo session</p>
                <p className="mt-2">{submitted.issue} · {submitted.quantity} affected units · {submitted.resolution}</p>
                <p className="mt-2 text-[#485563]">{submitted.notes}</p>
                <p className="mt-2 text-xs text-[#485563]">{submitted.reporter} · {submitted.eventTime.replace('T', ' ')} · {submitted.photoCount} photo(s)</p>
                <p className="mt-3 text-xs text-[#485563]">Demo only: no dispatcher notification has been sent. This report is cleared when the page reloads.</p>
              </div> : <p className="mt-4 text-sm text-[#485563]">Inspect the stock and report any loading issues before departure.</p>}
              <button onClick={() => setView('Load Sequence')} className={`mt-5 rounded-lg bg-[#F97316] px-5 py-3 text-sm font-semibold hover:bg-orange-600 ${focusClass}`}>{submitted ? 'Review issue' : 'Report an issue'}</button>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
