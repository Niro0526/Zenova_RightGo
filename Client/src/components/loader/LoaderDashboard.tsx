"use client";

import Link from 'next/link';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Scan, 
  ChevronRight, 
  AlertTriangle, 
  Truck, 
  Clock, 
  Package, 
  Thermometer,
  X,
  CheckCircle2,
  Camera,
  Keyboard
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { supabase } from '@/lib/supabase';

type Status = 'Ready to Load' | 'Loading' | 'Attention';

type Trip = {
  vehicle: string;
  id: string;
  bay: string;
  area: string;
  routeStr: string;
  departure: string;
  outlets: number;
  orders: number;
  payloadKg: number;
  vehicleType: string;
  plan: number;
  status: Status;
  issue: boolean;
  issueNotes?: string;
  stagingProgress?: number;
};

export default function LoaderDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [useCamera, setUseCamera] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const fetchTrips = async () => {
    if (!supabase) {
      setLoadError('Supabase is not configured.');
      return;
    }

    let { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('departure_time', { ascending: true });

    // Keep the dashboard usable when an older schema is missing one of the
    // optional display columns.
    if (error) {
      const fallback = await supabase.from('trips').select('*');
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      setLoadError('Trips are temporarily unavailable.');
      setTrips([]);
      return;
    }

    setLoadError(null);
    const shortfalls = await supabase.from('shortfalls').select('*');
    const activeIssues = shortfalls.error
      ? []
      : (shortfalls.data ?? []).filter((issue) => {
          const status = String(issue.status ?? 'open').toLowerCase();
          return !['resolved', 'closed', 'cleared', 'completed', 'cancelled'].includes(status);
        });
    setTrips((data ?? []).map((row) => {
      const rawStatus = String(row.status ?? '').toLowerCase();
      const hasActiveIssue = activeIssues.some(
        (issue) => String(issue.trip_id) === String(row.id) || String(issue.trip_id) === String(row.trip_code),
      );
      const status: Status = hasActiveIssue
        ? 'Attention'
        : rawStatus.includes('load') && !rawStatus.includes('ready')
        ? 'Loading'
        : rawStatus.includes('hold') || rawStatus.includes('attention') || rawStatus.includes('issue')
          ? 'Attention'
          : 'Ready to Load';
      const countValue = Number(row.outlets_count ?? 0);
      const count = Number.isFinite(countValue) ? countValue : 0;
      const payloadValue = Number(row.payload_kg ?? 0);

      return {
        vehicle: String(row.vehicle_id ?? 'Unknown Vehicle'),
        id: String(row.trip_code ?? 'Unassigned Trip'),
        bay: String(row.bay ?? 'Bay —'),
        area: String(row.route_summary ?? 'Route unavailable'),
        routeStr: String(row.route_summary ?? 'Route unavailable'),
        departure: row.departure_time
          ? new Date(String(row.departure_time)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '—',
        outlets: count,
        orders: count,
        payloadKg: Number.isFinite(payloadValue) ? payloadValue : 0,
        vehicleType: 'Vehicle',
        plan: 1,
        status,
        issue: status === 'Attention',
        issueNotes: status === 'Attention' ? 'Trip requires attention before loading.' : undefined,
        stagingProgress: status === 'Loading' ? 50 : undefined,
      };
    }));
  };

  useEffect(() => {
    void fetchTrips();
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel('loader-dashboard-trips')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => void fetchTrips())
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, []);

  const filteredTrips = trips.filter(trip => 
    trip.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trip.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trip.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trip.bay.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loadingCount = trips.filter((trip) => trip.status === 'Loading').length;
  const readyCount = trips.filter((trip) => trip.status === 'Ready to Load').length;
  const attentionCount = trips.filter((trip) => trip.status === 'Attention').length;
  const plannedPayload = trips.reduce((sum, trip) => sum + trip.payloadKg, 0);

  // Camera Barcode Scanning Setup
  useEffect(() => {
    if (isScannerOpen && useCamera && videoRef.current) {
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      codeReader.decodeFromVideoDevice(null, videoRef.current, (result, error) => {
        if (result) {
          setBarcodeInput(result.getText());
          setUseCamera(false); // Stop camera after successful scan
          codeReader.reset();
        }
      }).catch((err) => console.error("Camera error:", err));

      return () => {
        codeReader.reset();
      };
    } else if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
  }, [isScannerOpen, useCamera]);

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    
    console.log('Scanned Barcode Value:', barcodeInput);
    
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setIsScannerOpen(false);
    setBarcodeInput('');
    setUseCamera(false);
  };

  const handleCloseModal = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setIsScannerOpen(false);
    setBarcodeInput('');
    setUseCamera(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 relative pb-24 sm:pb-8">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Assigned Trips</h1>
            <span className="w-fit max-w-full px-3 py-1 bg-emerald-100 text-emerald-700 font-medium text-xs rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Peliyagoda Hub • Shift 1 Active
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time vehicle docking schedule, cargo staging readiness, and loading sequence assignments.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="min-h-11 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 shadow-sm transition"
          >
            <Scan className="w-4 h-4 text-[#F97316]" />
            Scan Barcode
          </button>
          
          <Link 
            href={trips[0] ? `/loader/load-sequence?trip_id=${encodeURIComponent(trips[0].id)}` : "/loader/load-sequence"}
            className="min-h-11 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-medium rounded-xl shadow-sm transition"
          >
            Current Trip <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Search & Total Metrics Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by vehicle (e.g. PEL-R04), trip ID (S1-T001), bay, or corridor..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition shadow-sm"
          />
        </div>
        <div className="px-4 py-2.5 bg-slate-200/60 text-slate-700 text-xs font-semibold rounded-xl sm:whitespace-nowrap">
          Total Planned: <span className="text-slate-900 font-bold">{trips.length} Vehicles • {plannedPayload.toLocaleString()} kg</span>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 sm:p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex justify-between items-start">
          <div>
            <span className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-400 uppercase">ALL TRIPS</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{trips.length}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <Truck className="w-4 h-4" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500">Planned</span>
          </div>
        </div>

        <div className="p-3 sm:p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex justify-between items-start">
          <div>
            <span className="text-[10px] sm:text-xs font-bold tracking-wider text-emerald-600 uppercase">LOADING</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{loadingCount}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500">Active loading</span>
          </div>
        </div>

        <div className="p-3 sm:p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex justify-between items-start">
          <div>
            <span className="text-[10px] sm:text-xs font-bold tracking-wider text-amber-600 uppercase">READY</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{readyCount}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500">Staged at Docks</span>
          </div>
        </div>

        <div className="p-3 sm:p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex justify-between items-start">
          <div>
            <span className="text-[10px] sm:text-xs font-bold tracking-wider text-rose-600 uppercase">ATTENTION</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{attentionCount}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span className="text-[10px] sm:text-[11px] font-bold text-rose-600">{attentionCount} {attentionCount === 1 ? 'Trip' : 'Trips'}</span>
          </div>
        </div>
      </div>

      {/* Trip Cards Grid */}
      <section aria-label="Assigned trips grid" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredTrips.map((trip) => {
          const isLoading = trip.status === 'Loading';
          const isAttention = trip.status === 'Attention';
          const canOpen = true;

          return (
            <article 
              key={trip.id} 
              className={`bg-white rounded-2xl p-5 shadow-sm space-y-4 ${
                isLoading 
                  ? 'border-2 border-emerald-500' 
                  : isAttention 
                    ? 'border border-rose-300' 
                    : 'border border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-md">{trip.vehicle}</span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs sm:text-sm font-semibold rounded-md border border-slate-200">{trip.id}</span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs sm:text-sm font-semibold rounded-md border border-slate-200">{trip.bay}</span>
                </div>

                {isLoading ? (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs sm:text-sm font-semibold rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Loading in Progress
                  </span>
                ) : isAttention ? (
                  <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs sm:text-sm font-semibold rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Attention Required
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs sm:text-sm font-semibold rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Ready to Load
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-emerald-500' : isAttention ? 'bg-rose-500' : 'bg-orange-500'}`}></span>
                  {trip.area} <span className="text-slate-400 font-normal text-xs">(Plan v{trip.plan})</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  <span className="font-semibold text-slate-600">Route:</span> {trip.routeStr}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">DEPARTURE</span>
                  <span className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-slate-400" /> {trip.departure}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">OUTLETS / ORDERS</span>
                  <span className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1 mt-1">
                    <Package className="w-3 h-3 text-slate-400" /> {trip.outlets} / {trip.orders}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">PAYLOAD / TEMP</span>
                  <span className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1 mt-1">
                    <Thermometer className="w-3 h-3 text-sky-500" /> {trip.payloadKg.toLocaleString()} kg
                  </span>
                </div>
              </div>

              {isLoading && (
                <div className="space-y-1.5 p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                  <div className="flex justify-between items-center text-xs text-emerald-800 font-semibold">
                    <span>Staging Stop 2 of 3 (450 kg staged)</span>
                    <span>{trip.stagingProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-emerald-200/80 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${trip.stagingProgress}%` }}></div>
                  </div>
                </div>
              )}

              {isAttention && trip.issueNotes && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">Loading issue reported</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">{trip.issueNotes}</p>
                  </div>
                </div>
              )}

              {!isLoading && !isAttention && (
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Cargo verified & staged at dock
                  </span>
                  <span className="text-slate-400">{trip.vehicleType}</span>
                </div>
              )}

              {canOpen ? (
                <Link
                  href={`/loader/load-sequence?trip_id=${encodeURIComponent(trip.id)}`}
                  className={`w-full py-2.5 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition shadow-sm ${
                    isLoading 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                      : 'bg-[#F97316] hover:bg-[#EA580C] text-white'
                  }`}
                >
                  {isLoading ? 'Continue Loading' : 'Open Trip'} <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs sm:text-sm rounded-xl cursor-not-allowed text-center"
                >
                  Open Trip (Locked)
                </button>
              )}
            </article>
          );
        })}
      </section>

      {/* BARCODE SCANNER MODAL WITH LIVE CAMERA STREAM */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-100">
            
            <button 
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="w-12 h-12 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-[#F97316]">
                <Scan className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Dock Barcode Scanner</h3>
              <p className="text-xs text-slate-500 mt-1">
                Scan vehicle, pallet staging tag, or dispatch sheet
              </p>
            </div>

            {/* CAMERA STREAM OR STATUS BADGE */}
            {useCamera ? (
              <div className="mt-4 mb-3 relative overflow-hidden rounded-xl bg-black aspect-video flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" />
                <div className="absolute inset-0 border-2 border-dashed border-orange-500/80 m-6 rounded-lg pointer-events-none animate-pulse flex items-center justify-center">
                  <span className="text-[10px] bg-black/70 text-white px-2 py-1 rounded">Align Barcode Inside Box</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 mb-3 text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Handheld Scanner Ready
                </span>
              </div>
            )}

            {/* CAMERA TOGGLE BUTTON */}
            <div className="flex justify-center mb-4">
              <button
                type="button"
                onClick={() => setUseCamera(!useCamera)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                {useCamera ? (
                  <>
                    <Keyboard className="w-3.5 h-3.5 text-slate-600" /> Switch to Handheld / Manual
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5 text-orange-500" /> Open Camera Scanner
                  </>
                )}
              </button>
            </div>

            {/* FORM INPUT */}
            <form onSubmit={handleScanSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  BARCODE NUMBER
                </label>
                <div className="relative">
                  <Scan className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Scan or enter barcode number..."
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                    autoFocus
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1.5 block">
                  Supported formats: Code 128, QR Code, DataMatrix
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl text-sm font-semibold transition shadow-sm"
                >
                  Confirm &gt;
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}