"use client";

import Link from 'next/link';
import React, { useState } from 'react';
import { 
  Search, 
  Scan, 
  ChevronRight, 
  AlertTriangle, 
  Truck, 
  Clock, 
  Package, 
  Thermometer 
} from 'lucide-react';

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

const trips: Trip[] = [
  { 
    vehicle: 'PEL-R04', 
    id: 'S1-T001', 
    bay: 'Bay 02',
    area: 'Colombo West', 
    routeStr: 'Peliyagoda → Pettah → Fort → Kollupitiya',
    departure: '05:30', 
    outlets: 4, 
    orders: 6, 
    payloadKg: 1320,
    vehicleType: '14ft Reefer',
    plan: 1, 
    status: 'Ready to Load', 
    issue: false 
  },
  { 
    vehicle: 'PEL-D02', 
    id: 'S1-T002', 
    bay: 'Bay 04',
    area: 'Colombo South', 
    routeStr: 'Peliyagoda → Bambalapitiya → Wellawatte → Dehiwala',
    departure: '06:00', 
    outlets: 3, 
    orders: 4, 
    payloadKg: 890,
    vehicleType: 'Dry Box Truck',
    plan: 1, 
    status: 'Loading', 
    issue: false,
    stagingProgress: 50
  },
  { 
    vehicle: 'PEL-R02', 
    id: 'S1-T003', 
    bay: 'Bay 01',
    area: 'Colombo East', 
    routeStr: 'Peliyagoda → Dematagoda → Borella → Rajagiriya',
    departure: '06:30', 
    outlets: 3, 
    orders: 5, 
    payloadKg: 1150,
    vehicleType: '14ft Reefer',
    plan: 1, 
    status: 'Attention', 
    issue: true,
    issueNotes: 'SKU count discrepancy reported during pallet staging'
  },
  { 
    vehicle: 'PEL-V01', 
    id: 'S1-T004', 
    bay: 'Bay 05',
    area: 'Colombo North', 
    routeStr: 'Peliyagoda → Wattala → Mabola → Ja-Ela',
    departure: '07:00', 
    outlets: 2, 
    orders: 2, 
    payloadKg: 740,
    vehicleType: '12ft Chilled',
    plan: 2, 
    status: 'Ready to Load', 
    issue: false 
  },
];

export default function LoaderDashboard() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTrips = trips.filter(trip => 
    trip.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trip.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trip.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trip.bay.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Assigned Trips</h1>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-medium text-xs rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Peliyagoda Hub • Shift 1 Active
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time vehicle docking schedule, cargo staging readiness, and loading sequence assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 shadow-sm transition">
            <Scan className="w-4 h-4 text-slate-500" />
            Scan Barcode
          </button>
          <Link 
            href="/loader/load-sequence" 
            className="flex items-center gap-2 px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-medium rounded-xl shadow-sm transition"
          >
            Current Trip <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* 2. Search & Total Metrics Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
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
        <div className="px-4 py-2.5 bg-slate-200/60 text-slate-700 text-xs font-semibold rounded-xl whitespace-nowrap">
          Total Planned: <span className="text-slate-900 font-bold">4 Vehicles • 4,100 kg</span>
        </div>
      </div>

      {/* 3. KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* All Trips */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex justify-between items-start">
          <div>
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">ALL TRIPS</span>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">4</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <Truck className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-medium text-slate-500">Planned</span>
          </div>
        </div>

        {/* Loading */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex justify-between items-start">
          <div>
            <span className="text-xs font-bold tracking-wider text-emerald-600 uppercase">LOADING</span>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">1</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] font-medium text-slate-500">Bay 04 Active</span>
          </div>
        </div>

        {/* Ready */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex justify-between items-start">
          <div>
            <span className="text-xs font-bold tracking-wider text-amber-600 uppercase">READY</span>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">2</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-[11px] font-medium text-slate-500">Staged at Docks</span>
          </div>
        </div>

        {/* Attention */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex justify-between items-start">
          <div>
            <span className="text-xs font-bold tracking-wider text-rose-600 uppercase">ATTENTION</span>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">1</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span className="text-[11px] font-bold text-rose-600">1 Discrepancy</span>
          </div>
        </div>
      </div>

      {/* 4. Trip Cards Grid (2x2 Layout) */}
      <section aria-label="Assigned trips grid" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredTrips.map((trip) => {
          const isLoading = trip.status === 'Loading';
          const isAttention = trip.status === 'Attention';
          const canOpen = trip.id === 'S1-T001' || isLoading;

          return (
            <article 
              key={trip.id} 
              aria-labelledby={`title-${trip.id}`} 
              className={`bg-white rounded-2xl p-5 shadow-sm space-y-4 ${
                isLoading 
                  ? 'border-2 border-emerald-500' 
                  : isAttention 
                    ? 'border border-rose-300' 
                    : 'border border-slate-200'
              }`}
            >
              {/* Card Top Pill Badges */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-slate-900 text-white font-bold text-xs rounded-md">{trip.vehicle}</span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-md border border-slate-200">{trip.id}</span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-md border border-slate-200">{trip.bay}</span>
                </div>

                {/* Status Badge */}
                {isLoading ? (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Loading in Progress
                  </span>
                ) : isAttention ? (
                  <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Attention Required
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Ready to Load
                  </span>
                )}
              </div>

              {/* Area & Route */}
              <div>
                <h2 id={`title-${trip.id}`} className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-emerald-500' : isAttention ? 'bg-rose-500' : 'bg-orange-500'}`}></span>
                  {trip.area} <span className="text-slate-400 font-normal text-xs">(Plan v{trip.plan})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  <span className="font-semibold text-slate-600">Route:</span> {trip.routeStr}
                </p>
              </div>

              {/* Metric Summary Box */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
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

              {/* Staging Progress Bar (if Loading) */}
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

              {/* Discrepancy Alert Box (if Attention) */}
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
                  <span className="text-emerald-600 font-medium">Cargo verified & staged at dock</span>
                  <span className="text-slate-400">{trip.vehicleType}</span>
                </div>
              )}

              {/* Action Button */}
              {canOpen ? (
                <Link
                  href="/loader/load-sequence"
                  className={`w-full py-2.5 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition shadow-sm ${
                    isLoading 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                      : 'bg-[#F97316] hover:bg-[#EA580C] text-white'
                  }`}
                  aria-label={`${isLoading ? 'Continue loading' : 'Open trip'} ${trip.id}`}
                >
                  {isLoading ? 'Continue Loading' : 'Open Trip'} <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-sm rounded-xl cursor-not-allowed text-center"
                  title="Loading details are not available for this demo trip"
                >
                  Open Trip (Locked)
                </button>
              )}
            </article>
          );
        })}
      </section>

      <p id="loader-integration-note" className="sr-only">Loading details are available for trip S1-T001.</p>
    </div>
  );
}