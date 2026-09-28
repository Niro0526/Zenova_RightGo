'use client';
import React, { useState } from 'react';
import Link from 'next/link';

const IconDashboard = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
const IconList = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
const IconCalendar = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const IconClipboard = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>;
const IconDatabase = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>;
const IconPlay = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>;
const IconBarChart = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;

const SearchIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const AlertIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const SnowflakeIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="22" /><line x1="12" y1="2" x2="16" y2="6" /><line x1="12" y1="2" x2="8" y2="6" /><line x1="12" y1="22" x2="16" y2="18" /><line x1="12" y1="22" x2="8" y2="18" /><line x1="2.5" y1="9" x2="21.5" y2="15" /><line x1="2.5" y1="9" x2="6.5" y2="7.5" /><line x1="2.5" y1="9" x2="4.5" y2="13" /><line x1="21.5" y1="15" x2="17.5" y2="16.5" /><line x1="21.5" y1="15" x2="19.5" y2="11" /><line x1="2.5" y1="15" x2="21.5" y2="9" /><line x1="2.5" y1="15" x2="6.5" y2="16.5" /><line x1="2.5" y1="15" x2="4.5" y2="11" /><line x1="21.5" y1="9" x2="17.5" y2="7.5" /><line x1="21.5" y1="9" x2="19.5" y2="13" /></svg>;
const SunIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /></svg>;



// Initial Mock Data
const initialOrders = [
  {
    id: 'S1-000', ref: 'S1-000', customer: 'Keells Supermarkets', outlet: 'OUT001 - Union Place', date: '27 Sep 2026 14:00',
    weight: 320, vol: 1.8, brand: 'FRESH', isChilled: true, status: 'unallocated', constraints: ['van_only', 'time_window'],
    products: [
      { id: 1, name: 'Fresh Milk 1L', qty: 200, weight: 200, stock: 'Available' },
      { id: 2, name: 'Yogurt 80g', qty: 1500, weight: 120, stock: 'Available' }
    ]
  },
  {
    id: 'S1-001', ref: 'S1-001', customer: 'Keells Supermarkets', outlet: 'OUT001 - Union Place', date: '27 Sep 2026 14:30',
    weight: 226.4, vol: 1.145, brand: 'FRESH', isChilled: true, status: 'unallocated', constraints: ['van_only'],
    products: [
      { id: 3, name: 'Cheese Blocks 200g', qty: 500, weight: 100, stock: 'Available' },
      { id: 4, name: 'Butter 500g', qty: 252, weight: 126.4, stock: 'Low Stock' }
    ]
  },
  {
    id: 'S1-002', ref: 'S1-002', customer: 'Fashion Bug', outlet: 'OUT002 - Borella', date: '27 Sep 2026 10:00',
    weight: 80, vol: 1.2, brand: 'STYLE', isChilled: false, status: 'unallocated', constraints: [],
    products: [
      { id: 5, name: 'Summer Collection Boxes', qty: 10, weight: 80, stock: 'Available' }
    ]
  },
  {
    id: 'S1-003', ref: 'S1-003', customer: 'Singer Plus', outlet: 'OUT003 - Nugegoda', date: '27 Sep 2026 11:15',
    weight: 85, vol: 0.5, brand: 'TECH', isChilled: false, status: 'unallocated', constraints: ['high_value'],
    products: [
      { id: 6, name: 'Smartphones Crate', qty: 5, weight: 25, stock: 'Available' },
      { id: 7, name: 'Laptops Box', qty: 20, weight: 60, stock: 'Available' }
    ]
  }
];

const availableVehicles = [
  { id: 'VEH036', name: 'VEH036', type: 'REFRIGERATED VAN', depot: 'Peliyagoda', capacityKg: 1040, currentLoadKg: 0, status: 'Available', isReefer: true, isVan: true },
  { id: 'VEH041', name: 'VEH041', type: 'STANDARD VAN', depot: 'Peliyagoda', capacityKg: 1200, currentLoadKg: 400, status: 'Blocked', blockReason: 'Requires reefer for Cold Chain order', isReefer: false, isVan: true },
  { id: 'VEH048', name: 'VEH048', type: 'REFRIGERATED TRUCK', depot: 'Kelaniya', capacityKg: 5000, currentLoadKg: 4000, status: 'Available', isReefer: true, isVan: false }
];


const LoaderIcon = () => <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

export default function Planning() {
  const [planningStage, setPlanningStage] = useState<'prepare' | 'review' | 'release'>('prepare');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showManualFallback, setShowManualFallback] = useState(false);

  const handleGenerateDraft = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setPlanningStage('review');
    }, 1500);
  };

  if (showManualFallback) {
    return <ManualPlanningFallback onBack={() => setShowManualFallback(false)} />;
  }

  return (
    <>
      <div className="flex flex-col flex-1 p-10 w-full max-w-[1160px] mx-auto bg-[#F9FAFB] h-full overflow-y-auto font-sans">
        
        {/* Stepper Header */}
        <div className="flex flex-row items-center justify-between py-4 px-6 bg-white border border-[#CBD5E1] rounded-[10px] mb-6 shadow-sm">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-xl text-[#202D2D] m-0">Planning</h1>
            <span className="py-1 px-2 bg-gray-100 border border-gray-300 rounded font-semibold text-[11px] text-gray-600 uppercase tracking-wider">
              Dispatcher Workflow
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-sm font-semibold">
            <div className={`flex items-center gap-2 ${planningStage === 'prepare' ? 'text-orange-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${planningStage === 'prepare' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>1</div>
              Prepare
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className={`flex items-center gap-2 ${planningStage === 'review' ? 'text-orange-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${planningStage === 'review' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>2</div>
              Review Draft
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className={`flex items-center gap-2 ${planningStage === 'release' ? 'text-orange-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${planningStage === 'release' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>3</div>
              Review & Release
            </div>
          </div>
        </div>

        {planningStage === 'prepare' && (
          <PrepareStage onGenerate={handleGenerateDraft} isGenerating={isGenerating} onManual={() => setShowManualFallback(true)} />
        )}

        {planningStage === 'review' && (
          <ReviewStage onNext={() => setPlanningStage('release')} onBack={() => setPlanningStage('prepare')} onManual={() => setShowManualFallback(true)} />
        )}

        {planningStage === 'release' && (
          <ReleaseStage onBack={() => setPlanningStage('review')} />
        )}

      </div>
    </>
  );
}

function PrepareStage({ onGenerate, isGenerating, onManual }: any) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="bg-white border border-[#CBD5E1] rounded-[10px] p-8 flex flex-col gap-6 shadow-sm">
        
        <div className="flex flex-row justify-between items-start">
          <div className="flex flex-col gap-1">
            <h2 className="font-bold text-2xl text-gray-900 m-0">Prepare Planning Run</h2>
            <p className="text-sm text-gray-500 m-0">Review inputs before generating a suggested draft allocation.</p>
          </div>
          <div className="flex flex-col text-right gap-0.5 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <span className="font-semibold text-sm text-gray-900">Peliyagoda Depot</span>
            <span className="text-xs text-gray-500">Run Date: 27 Sep 2026 (Assumed)</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-2">
          <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Eligible Orders</span>
            <span className="text-3xl font-black text-gray-900">842</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Available Fleet</span>
            <span className="text-3xl font-black text-gray-900">12</span>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-5 flex flex-col">
            <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-2">Missing Inputs</span>
            <span className="text-3xl font-black text-red-700">3</span>
            <span className="text-xs text-red-600 mt-1 font-medium">Require verification</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Draft Status</span>
            <span className="text-lg font-bold text-gray-900 mt-1">No draft exists</span>
            <span className="text-xs text-gray-500 mt-1">Ready to generate</span>
          </div>
        </div>

        <details className="group border border-gray-200 rounded-lg mt-4 bg-gray-50">
          <summary className="flex cursor-pointer items-center justify-between p-4 font-semibold text-gray-900 text-sm marker:content-none">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
              Planning Priorities & Rules
            </div>
            <svg className="w-5 h-5 text-gray-500 transition group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </summary>
          <div className="p-5 pt-2 text-sm text-gray-600 border-t border-gray-200 bg-white rounded-b-lg">
            <ul className="list-disc pl-5 space-y-2">
              <li>Respect vehicle and outlet constraints (e.g. Van-only access, Reefer required).</li>
              <li>Consider delivery windows and perishable goods cutoffs.</li>
              <li>Consider previous deferrals and service history.</li>
              <li>Consolidate compatible orders by brand and district where practical.</li>
              <li>Preserve scarce vehicle capabilities for specialized orders.</li>
            </ul>
          </div>
        </details>

        <div className="flex flex-row justify-end gap-4 mt-6 pt-6 border-t border-gray-100">
          <button onClick={onManual} className="py-2.5 px-6 border border-gray-300 rounded-lg font-semibold text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            View Orders (Manual Fallback)
          </button>
          <button 
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center justify-center min-w-[200px] gap-2 py-2.5 px-6 bg-[#F97316] hover:bg-orange-600 disabled:bg-orange-400 rounded-lg font-semibold text-sm text-white transition-colors"
          >
            {isGenerating ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
            )}
            {isGenerating ? 'Generating Draft Plan...' : 'Generate Draft Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewStage({ onNext, onBack, onManual }: any) {
  const [activeTab, setActiveTab] = useState<'trips'|'exceptions'>('trips');
  const [selectedTrip, setSelectedTrip] = useState<any>(null);

  const trips = [
    { id: 'T-101', vehicle: 'VEH036', type: 'REFRIGERATED VAN', district: 'Union Place / Borella', orders: 4, stops: 2, weightUsed: 980, capacityKg: 1040, volUsed: 4.2, volMax: 5.0, status: 'Ready', isReefer: true, reason: 'Reefer van selected for chilled goods and van-only access.' },
    { id: 'T-102', vehicle: 'VEH048', type: 'REFRIGERATED TRUCK', district: 'Nugegoda / Kohuwala', orders: 12, stops: 5, weightUsed: 4100, capacityKg: 5000, volUsed: 12.5, volMax: 15.0, status: 'Needs review', isReefer: true, reason: 'High-capacity reefer allocated for bulk fresh run.' },
    { id: 'T-103', vehicle: 'VEH022', type: 'STANDARD VAN', district: 'Pettah', orders: 8, stops: 6, weightUsed: 1100, capacityKg: 1200, volUsed: 4.8, volMax: 5.0, status: 'Ready', isReefer: false, reason: 'Standard van for ambient Tech/Style goods.' }
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 relative h-full">
      {/* Summary Bar */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-[10px] p-5 shadow-sm">
        <div className="flex gap-8">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Orders Allocated</span>
            <span className="text-xl font-black text-gray-900 mt-1">814 <span className="text-sm font-semibold text-gray-400">/ 842</span></span>
          </div>
          <div className="w-px h-10 bg-gray-200 mt-1"></div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Suggested Trips</span>
            <span className="text-xl font-black text-gray-900 mt-1">24</span>
          </div>
          <div className="w-px h-10 bg-gray-200 mt-1"></div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Needs Decision</span>
            <span className="text-xl font-black text-amber-600 mt-1">28</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onManual} className="py-2.5 px-5 border border-gray-300 rounded-lg font-semibold text-sm text-gray-700 hover:bg-gray-50">
            Fallback
          </button>
          <button onClick={onBack} className="py-2.5 px-5 border border-gray-300 rounded-lg font-semibold text-sm text-gray-700 hover:bg-gray-50">
            Regenerate
          </button>
          <button onClick={onNext} className="py-2.5 px-6 bg-orange-500 hover:bg-orange-600 rounded-lg font-semibold text-sm text-white shadow-sm">
            Continue to Release
          </button>
        </div>
      </div>

      <div className="flex gap-6 min-h-[500px]">
        {/* Main Workspace */}
        <div className="flex flex-col flex-1 bg-white border border-gray-200 rounded-[10px] overflow-hidden shadow-sm">
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button onClick={() => setActiveTab('trips')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'trips' ? 'border-orange-500 text-orange-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>Suggested Trips (24)</button>
            <button onClick={() => setActiveTab('exceptions')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'exceptions' ? 'border-amber-500 text-amber-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>Exceptions & Attention (28)</button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 bg-[#F9FAFB]">
            {activeTab === 'trips' ? (
              <div className="grid grid-cols-2 gap-5">
                {trips.map(t => (
                  <div key={t.id} onClick={() => setSelectedTrip(t)} className={`bg-white border rounded-xl p-5 cursor-pointer transition-all ${selectedTrip?.id === t.id ? 'border-orange-500 shadow-md ring-1 ring-orange-500' : 'border-gray-200 hover:border-orange-300 hover:shadow-sm'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black text-lg text-gray-900 m-0">{t.vehicle} <span className="text-gray-400 font-medium text-sm ml-1">Trip {t.id}</span></h3>
                        <p className="text-[11px] font-bold text-gray-500 uppercase mt-1">{t.type}</p>
                      </div>
                      <span className={`py-1 px-2 rounded font-bold text-[10px] uppercase ${t.status === 'Ready' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{t.status}</span>
                    </div>
                    
                    <div className="flex items-center gap-5 text-sm font-medium text-gray-700 mb-5">
                      <div className="flex items-center gap-1.5"><svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect></svg> {t.orders} Orders</div>
                      <div className="flex items-center gap-1.5"><svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> {t.stops} Stops</div>
                    </div>

                    <div className="space-y-4 mb-5">
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1.5">
                          <span className="text-gray-500 uppercase">Weight Utilisation</span>
                          <span className="text-gray-900">{t.weightUsed} / {t.capacityKg} kg</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${t.weightUsed/t.capacityKg > 0.9 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${(t.weightUsed/t.capacityKg)*100}%` }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-blue-50 border border-blue-100 rounded text-xs font-medium text-blue-800 leading-relaxed">
                      <strong>Recommendation:</strong> {t.reason}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4 max-w-3xl mx-auto">
                <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-gray-900 text-base">S1-009 (OUT009 - Malabe)</h4>
                      <p className="text-sm text-gray-600 mt-1"><strong>Reason:</strong> No available compatible reefer van remaining in the active fleet for this timeframe.</p>
                    </div>
                    <span className="py-1 px-2 bg-amber-100 text-amber-800 rounded text-[10px] font-bold uppercase">Needs Decision</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">Review Alternatives</button>
                    <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">Confirm Deferral</button>
                  </div>
                </div>
                
                <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-gray-900 text-base">S1-015 (OUT012 - Kottawa)</h4>
                      <p className="text-sm text-gray-600 mt-1"><strong>Reason:</strong> Weight exceeds remaining compatible capacity in this sector.</p>
                    </div>
                    <span className="py-1 px-2 bg-amber-100 text-amber-800 rounded text-[10px] font-bold uppercase">Needs Decision</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">Adjust Trip</button>
                    <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">Confirm Deferral</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Details Drawer */}
        {selectedTrip && (
          <div className="w-[420px] bg-white border border-gray-200 rounded-[10px] flex flex-col shadow-xl overflow-hidden shrink-0 animate-in slide-in-from-right-8 duration-300">
            <div className="p-5 border-b border-gray-200 flex justify-between items-start bg-gray-50">
              <div>
                <h3 className="font-black text-xl text-gray-900">Trip {selectedTrip.id}</h3>
                <p className="text-sm font-semibold text-gray-500 mt-0.5">{selectedTrip.vehicle} · {selectedTrip.type}</p>
              </div>
              <button onClick={() => setSelectedTrip(null)} className="p-2 -m-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-200 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-8">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Delivery Sequence</h4>
                  <span className="text-[10px] font-bold text-gray-400 uppercase bg-gray-100 px-2 py-0.5 rounded">Estimated Timing</span>
                </div>
                
                <div className="relative pl-5 border-l-2 border-gray-200 space-y-6 ml-2">
                  <div className="relative">
                    <div className="absolute -left-[25px] bg-gray-300 rounded-full w-3 h-3 ring-4 ring-white"></div>
                    <span className="text-sm font-bold text-gray-900 block">Depot Departure</span>
                    <span className="text-[11px] font-medium text-gray-500 block mt-0.5">Est. 08:00 AM</span>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute -left-[25px] bg-white border-2 border-orange-500 rounded-full w-3 h-3 ring-4 ring-white"></div>
                    <span className="text-sm font-bold text-gray-900 block">Stop 1: OUT001 - Union Place</span>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[11px] font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">Arrival: 08:45</span>
                      <span className="text-[11px] font-medium text-gray-600 bg-orange-50 px-1.5 py-0.5 rounded text-orange-700">Window: 08:00-10:00</span>
                    </div>
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-bold text-gray-500 uppercase">Orders (2)</span>
                        <span className="text-[11px] font-bold text-gray-700">546.4 kg</span>
                      </div>
                      <div className="text-xs font-medium text-gray-800">S1-000, S1-001</div>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[25px] bg-white border-2 border-orange-500 rounded-full w-3 h-3 ring-4 ring-white"></div>
                    <span className="text-sm font-bold text-gray-900 block">Stop 2: OUT002 - Borella</span>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[11px] font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">Arrival: 09:30</span>
                      <span className="text-[11px] font-medium text-gray-600 bg-orange-50 px-1.5 py-0.5 rounded text-orange-700">Window: 09:00-12:00</span>
                    </div>
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-bold text-gray-500 uppercase">Orders (1)</span>
                        <span className="text-[11px] font-bold text-gray-700">80.0 kg</span>
                      </div>
                      <div className="text-xs font-medium text-gray-800">S1-002</div>
                    </div>
                  </div>
                  
                  <div className="relative opacity-60">
                    <div className="absolute -left-[25px] bg-gray-300 rounded-full w-3 h-3 ring-4 ring-white"></div>
                    <span className="text-sm font-bold text-gray-900 block">Return to Depot</span>
                    <span className="text-[11px] font-medium text-gray-500 block mt-0.5">Est. 10:15 AM</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Dispatcher Adjustments</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button className="py-2 px-3 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">Change Vehicle</button>
                  <button className="py-2 px-3 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">Move Order</button>
                  <button className="py-2 px-3 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">Edit Sequence</button>
                  <button className="py-2 px-3 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors shadow-sm">Defer Orders</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReleaseStage({ onBack }: any) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300 max-w-[800px] mx-auto w-full mt-10">
      <div className="bg-white border border-[#CBD5E1] rounded-2xl p-10 flex flex-col items-center text-center shadow-lg">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 ring-8 ring-green-50">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        
        <h2 className="font-black text-3xl text-gray-900 m-0">Review & Release</h2>
        <p className="text-gray-500 mt-3 mb-10 text-base max-w-md">The suggested plan is fully validated and ready for operational handoff to loaders and drivers.</p>
        
        <div className="grid grid-cols-2 gap-6 w-full text-left mb-10">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Assigned Orders</span>
            <div className="text-4xl font-black text-gray-900 mt-2">814</div>
            <div className="text-sm font-medium text-green-600 mt-2 flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Validated
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Trips Created</span>
            <div className="text-4xl font-black text-gray-900 mt-2">24</div>
            <div className="text-sm font-medium text-gray-500 mt-2">Across 12 Vehicles</div>
          </div>
        </div>

        <div className="flex flex-col w-full gap-3 mb-10">
          <button className="flex justify-between items-center w-full p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
              <div className="text-left">
                <div className="font-bold text-gray-900 text-sm">Preview Loader Manifest</div>
                <div className="text-xs text-gray-500 mt-0.5">Check loading sequences and handling instructions</div>
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          
          <button className="flex justify-between items-center w-full p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
              <div className="text-left">
                <div className="font-bold text-gray-900 text-sm">Preview Driver Trip Summary</div>
                <div className="text-xs text-gray-500 mt-0.5">Review route sequencing and delivery windows</div>
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        <div className="flex gap-4 w-full">
          <button onClick={onBack} className="flex-1 py-3.5 px-4 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors">
            Back to Review
          </button>
          <button className="flex-1 py-3.5 px-4 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold text-white shadow-md transition-colors text-lg flex items-center justify-center gap-2">
            Release Plan
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
    </div>
  );
}


function ManualPlanningFallback({ onBack }: any) {

  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [queueTab, setQueueTab] = useState<'unallocated' | 'assigned'>('unallocated');

  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeferModal, setShowDeferModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [deferReason, setDeferReason] = useState('');

  const activeOrders = orders.filter(o => o.status === queueTab);

  const handleAssign = () => {
    if (!selectedVehicle || !selectedOrder) return;
    setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, status: 'assigned', assignedVehicle: selectedVehicle } : o));
    setSelectedOrder(null);
    setShowAssignModal(false);
    setSelectedVehicle(null);
  };

  const handleDefer = () => {
    if (!deferReason.trim() || !selectedOrder) return;
    setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, status: 'deferred' } : o));
    setSelectedOrder(null);
    setShowDeferModal(false);
    setDeferReason('');
  };

  return (
    <>
      <div className="flex flex-col flex-1 p-10 w-full max-w-[1160px] mx-auto bg-[#F9FAFB] h-full overflow-y-auto">
        {/* Top Bar */}
        <div className="flex flex-row justify-between items-center py-4 px-6 bg-white border border-[#CBD5E1] rounded-t-[10px]">
          <div className="flex flex-row items-center gap-3">
            <button onClick={onBack} className="mr-2 p-1 text-gray-500 hover:bg-gray-100 rounded">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <h1 className="font-bold text-lg text-[#202D2D] m-0">Manual Assignment Fallback</h1>
            <span className="py-1 px-2 bg-[#FFF4ED] border border-[#F97316] rounded font-semibold text-[11px] text-[#202D2D] uppercase">DISPATCHER WORKFLOW</span>
          </div>
          <div className="font-medium text-sm text-[#485563]">
            Run Date: 27 Sep 2026
          </div>
        </div>

        {/* 2-Column Split */}
        <div className="flex flex-row flex-1 bg-[#CBD5E1] gap-[1px] border-x border-b border-[#CBD5E1] rounded-b-[10px] overflow-hidden min-h-[600px]">

          {/* Left Column - Queue */}
          <div className="w-[340px] bg-white flex flex-col p-4 gap-4 flex-shrink-0 h-[calc(100vh-170px)] overflow-y-auto">
            <div className="flex flex-row p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => { setQueueTab('unallocated'); setSelectedOrder(null); }}
                className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${queueTab === 'unallocated' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Unallocated ({orders.filter(o => o.status === 'unallocated').length})
              </button>
              <button
                onClick={() => { setQueueTab('assigned'); setSelectedOrder(null); }}
                className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${queueTab === 'assigned' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Allocated ({orders.filter(o => o.status === 'assigned').length})
              </button>
            </div>
            <div className="flex flex-row items-center py-2 px-2.5 gap-2 border border-[#CBD5E1] rounded-md w-full box-border">
              <SearchIcon />
              <input type="text" placeholder="Search orders..." className="border-none outline-none font-sans text-xs text-[#485563] w-full" />
            </div>

            <div className="flex flex-col gap-2">
              {activeOrders.map((q) => {
                const isSelected = selectedOrder?.id === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedOrder(q)}
                    className={`flex flex-col p-3 gap-2 bg-white border rounded-md cursor-pointer transition-all ${isSelected ? 'bg-[#FFF4ED] border-[#F97316] shadow-sm' : 'border-[#CBD5E1] hover:border-gray-400'}`}
                  >
                    <div className="flex flex-row justify-between items-center">
                      <span className="font-bold text-[13px] text-[#202D2D]">{q.ref}</span>
                      <span className={`py-0.5 px-1.5 rounded font-semibold text-[10px] uppercase ${q.brand === 'FRESH' ? 'bg-[#ECFDF5] text-[#10B981]' : q.brand === 'STYLE' ? 'bg-[#FFF4ED] border border-[#F97316] text-[#F97316]' : 'bg-[#F3E8FF] text-[#8B5CF6]'}`}>{q.brand}</span>
                    </div>
                    <h3 className="font-semibold text-xs text-[#485563] m-0 line-clamp-1">{q.outlet}</h3>
                    <div className="flex flex-row items-center gap-2 font-medium text-[11px] text-[#485563]">
                      {q.isChilled ? <SnowflakeIcon /> : <SunIcon />}
                      {q.weight} kg / {q.vol} m³
                    </div>
                  </div>
                );
              })}
              {activeOrders.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm font-medium">{queueTab === 'unallocated' ? 'All orders assigned or deferred.' : 'No allocated orders yet.'}</div>
              )}
            </div>
          </div>

          {/* Right Column - Order Details View */}
          <div className="flex-1 bg-white flex flex-col p-8 overflow-y-auto h-[calc(100vh-170px)] relative">
            {selectedOrder ? (
              selectedOrder.status === 'assigned' ? (
                <div className="flex flex-col max-w-[800px] w-full mx-auto pb-20">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
                    <div>
                      <h2 className="font-bold text-2xl text-gray-900 m-0">Live Trip Execution</h2>
                      <p className="text-gray-500 text-sm mt-1">Order {selectedOrder.ref} · {selectedOrder.customer}</p>
                    </div>
                    <span className="py-1 px-3 bg-green-50 text-green-700 border border-green-200 rounded font-bold text-[11px] uppercase">
                      IN PROGRESS
                    </span>
                  </div>

                  {/* Status Cards */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm flex items-start gap-4">
                      <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 uppercase">Assigned Vehicle</h3>
                        <p className="text-xl font-black text-gray-900 mt-1">{selectedOrder.assignedVehicle?.name || 'VEH-XXX'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{selectedOrder.assignedVehicle?.type || 'STANDARD'}</p>
                      </div>
                    </div>

                    <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 uppercase">Driver Info</h3>
                        <p className="text-lg font-bold text-gray-900 mt-1">Kamal Perera</p>
                        <p className="text-xs text-gray-500 mt-0.5">+94 77 123 4567</p>
                      </div>
                    </div>
                  </div>

                  {/* Timeline Tracker */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-lg text-gray-900 mb-6">Execution Timeline</h3>
                    <div className="relative pl-6 border-l-2 border-gray-200 space-y-8 ml-3">

                      <div className="relative">
                        <div className="absolute -left-[31px] bg-green-500 rounded-full w-4 h-4 ring-4 ring-white"></div>
                        <h4 className="font-bold text-sm text-gray-900">Vehicle Assigned</h4>
                        <p className="text-xs text-gray-500 mt-1">Dispatcher allocated {selectedOrder.assignedVehicle?.name || 'vehicle'} to the order.</p>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-[31px] bg-orange-500 rounded-full w-4 h-4 ring-4 ring-white animate-pulse"></div>
                        <h4 className="font-bold text-sm text-gray-900">Loading in Progress</h4>
                        <p className="text-xs text-orange-600 font-medium mt-1">Currently loading at Dock 4. 60% complete.</p>
                      </div>

                      <div className="relative opacity-50">
                        <div className="absolute -left-[31px] bg-gray-300 rounded-full w-4 h-4 ring-4 ring-white"></div>
                        <h4 className="font-bold text-sm text-gray-700">In Transit</h4>
                        <p className="text-xs text-gray-500 mt-1">Awaiting departure from depot.</p>
                      </div>

                      <div className="relative opacity-50">
                        <div className="absolute -left-[31px] bg-gray-300 rounded-full w-4 h-4 ring-4 ring-white"></div>
                        <h4 className="font-bold text-sm text-gray-700">Delivered</h4>
                        <p className="text-xs text-gray-500 mt-1">Pending arrival at {selectedOrder.outlet}</p>
                      </div>

                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col max-w-[800px] w-full mx-auto pb-20">
                  {/* Order Header */}
                  <div className="flex flex-row justify-between items-start border-b border-gray-200 pb-5 mb-5">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <h2 className="font-bold text-2xl text-[#202D2D] m-0">Order {selectedOrder.ref}</h2>
                        <span className="py-1 px-2 bg-blue-50 text-blue-600 border border-blue-200 rounded font-semibold text-[11px] uppercase">UNALLOCATED</span>
                      </div>
                      <p className="font-medium text-sm text-[#485563] m-0">{selectedOrder.customer}</p>
                    </div>
                    <span className={`py-1 px-3 rounded font-bold text-xs uppercase ${selectedOrder.brand === 'FRESH' ? 'bg-[#ECFDF5] text-[#10B981]' : selectedOrder.brand === 'STYLE' ? 'bg-[#FFF4ED] border border-[#F97316] text-[#F97316]' : 'bg-[#F3E8FF] text-[#8B5CF6]'}`}>
                      {selectedOrder.brand} BRAND
                    </span>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="flex flex-col p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <span className="font-semibold text-[11px] text-gray-500 uppercase mb-1">OUTLET</span>
                      <span className="font-bold text-sm text-gray-900">{selectedOrder.outlet}</span>
                    </div>
                    <div className="flex flex-col p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <span className="font-semibold text-[11px] text-gray-500 uppercase mb-1">DATE / TIME</span>
                      <span className="font-bold text-sm text-gray-900">{selectedOrder.date}</span>
                    </div>
                    <div className="flex flex-col p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <span className="font-semibold text-[11px] text-gray-500 uppercase mb-1">TOTAL WEIGHT</span>
                      <span className="font-bold text-sm text-gray-900">{selectedOrder.weight} kg</span>
                    </div>
                    <div className="flex flex-col p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <span className="font-semibold text-[11px] text-gray-500 uppercase mb-1">TEMP ZONE</span>
                      <span className={`font-bold text-sm ${selectedOrder.isChilled ? 'text-green-600' : 'text-amber-500'}`}>
                        {selectedOrder.isChilled ? 'Cold Chain' : 'Ambient'}
                      </span>
                    </div>
                  </div>

                  {/* Constraints Alert */}
                  {selectedOrder.constraints.length > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-8">
                      <AlertIcon />
                      <span className="font-medium text-sm text-amber-800">
                        <strong>Constraints:</strong> {selectedOrder.constraints.join(', ').replace('_', ' ')}
                      </span>
                    </div>
                  )}

                  {/* Products Table */}
                  <h3 className="font-bold text-[15px] text-[#202D2D] mb-3">Ordered Products</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden mb-8">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="py-3 px-4 font-bold text-[11px] text-[#485563] uppercase">Product</th>
                          <th className="py-3 px-4 font-bold text-[11px] text-[#485563] uppercase">Qty</th>
                          <th className="py-3 px-4 font-bold text-[11px] text-[#485563] uppercase">Weight</th>
                          <th className="py-3 px-4 font-bold text-[11px] text-[#485563] uppercase">Stock Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.products.map((p: any) => (
                          <tr key={p.id} className="border-b border-gray-100 last:border-0">
                            <td className="py-3 px-4 font-medium text-sm text-gray-900">{p.name}</td>
                            <td className="py-3 px-4 font-medium text-sm text-gray-600">{p.qty}</td>
                            <td className="py-3 px-4 font-medium text-sm text-gray-600">{p.weight} kg</td>
                            <td className="py-3 px-4">
                              <span className={`py-1 px-2 rounded-full font-semibold text-[10px] uppercase ${p.stock === 'Available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {p.stock}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Action Buttons - Fixed at bottom of container */}
                  <div className="flex flex-row gap-4 mt-auto pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 rounded-lg font-semibold text-sm text-white transition-colors flex justify-center items-center gap-2"
                    >
                      Assign to Vehicle
                    </button>
                    <button
                      onClick={() => setShowDeferModal(true)}
                      className="flex-1 py-3 px-4 bg-white border-2 border-gray-300 hover:border-gray-400 rounded-lg font-semibold text-sm text-gray-700 transition-colors"
                    >
                      Defer Order
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">No Order Selected</h3>
                <p className="text-sm text-gray-500">{queueTab === 'unallocated' ? 'Select an unallocated order from the queue on the left to view details, analyze constraints, and assign it to a vehicle.' : 'Select an allocated order from the queue to view its live execution status.'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ASSIGN MODAL */}
      {showAssignModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl w-[900px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-gray-200">
              <div>
                <h2 className="font-bold text-xl text-gray-900">Assign Vehicle</h2>
                <p className="text-sm text-gray-500 mt-1">Order {selectedOrder.ref} · {selectedOrder.weight} kg</p>
              </div>
              <button onClick={() => { setShowAssignModal(false); setSelectedVehicle(null); }} className="text-gray-400 hover:text-gray-700">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-row flex-1 overflow-hidden bg-gray-50">
              {/* Vehicles List */}
              <div className="w-[350px] bg-white border-r border-gray-200 p-4 overflow-y-auto flex flex-col gap-3">
                <h3 className="font-bold text-sm text-gray-700 uppercase mb-1">Available Vehicles</h3>
                {availableVehicles.map(v => {
                  const isBlocked = v.status === 'Blocked';
                  const isSelected = selectedVehicle?.id === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVehicle(v)}
                      className={`flex flex-col p-3 border rounded-lg cursor-pointer transition-all ${isSelected ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'border-gray-200 hover:border-orange-300'}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-sm text-gray-900">{v.name}</span>
                        {isBlocked ? (
                          <span className="py-0.5 px-1.5 bg-red-100 text-red-600 rounded text-[10px] font-bold uppercase">Blocked</span>
                        ) : (
                          <span className="py-0.5 px-1.5 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase">Eligible</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 font-medium mb-2">{v.type} · {v.depot}</span>

                      {/* Capacity Bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full ${isBlocked ? 'bg-red-400' : 'bg-blue-500'}`} style={{ width: `${(v.currentLoadKg / v.capacityKg) * 100}%` }}></div>
                        </div>
                        <span className="text-[10px] text-gray-500 font-semibold">{v.currentLoadKg}/{v.capacityKg} kg</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Validation / Passport */}
              <div className="flex-1 p-6 overflow-y-auto">
                {selectedVehicle ? (
                  <div className="flex flex-col h-full">
                    <h3 className="font-bold text-sm text-gray-700 uppercase mb-4">Constraint Validation</h3>

                    <div className="flex flex-col gap-3">
                      {/* Weight Check */}
                      <div className="flex items-center p-3 bg-white border border-gray-200 rounded-lg gap-3">
                        {selectedOrder.weight + selectedVehicle.currentLoadKg <= selectedVehicle.capacityKg ? (
                          <div className="w-6 h-6 rounded bg-green-100 text-green-600 flex items-center justify-center"><CheckIcon /></div>
                        ) : (
                          <div className="w-6 h-6 rounded bg-red-100 text-red-600 flex items-center justify-center"><AlertIcon /></div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-gray-500 uppercase">Weight Capacity</span>
                          <span className="text-xs font-medium text-gray-900">New Load: {selectedOrder.weight + selectedVehicle.currentLoadKg} kg / {selectedVehicle.capacityKg} kg max</span>
                        </div>
                      </div>

                      {/* Reefer Check */}
                      <div className="flex items-center p-3 bg-white border border-gray-200 rounded-lg gap-3">
                        {(!selectedOrder.isChilled || selectedVehicle.isReefer) ? (
                          <div className="w-6 h-6 rounded bg-green-100 text-green-600 flex items-center justify-center"><CheckIcon /></div>
                        ) : (
                          <div className="w-6 h-6 rounded bg-red-100 text-red-600 flex items-center justify-center"><AlertIcon /></div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-gray-500 uppercase">Temperature Requirement</span>
                          <span className="text-xs font-medium text-gray-900">{selectedOrder.isChilled ? 'Cold Chain Required. Vehicle is Reefer.' : 'Ambient. No reefer required.'}</span>
                        </div>
                      </div>

                      {/* Van Access Check */}
                      <div className="flex items-center p-3 bg-white border border-gray-200 rounded-lg gap-3">
                        {(!selectedOrder.constraints.includes('van_only') || selectedVehicle.isVan) ? (
                          <div className="w-6 h-6 rounded bg-green-100 text-green-600 flex items-center justify-center"><CheckIcon /></div>
                        ) : (
                          <div className="w-6 h-6 rounded bg-red-100 text-red-600 flex items-center justify-center"><AlertIcon /></div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-gray-500 uppercase">Access Restrictions</span>
                          <span className="text-xs font-medium text-gray-900">{selectedOrder.constraints.includes('van_only') ? 'Outlet requires Van access.' : 'No access restrictions.'}</span>
                        </div>
                      </div>
                    </div>

                    {selectedVehicle.status === 'Blocked' && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium flex gap-2">
                        <AlertIcon /> Cannot assign: {selectedVehicle.blockReason}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-gray-400 font-medium">
                    Select a vehicle from the list to run constraint validation.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-3">
              <button
                onClick={() => { setShowAssignModal(false); setSelectedVehicle(null); }}
                className="py-2 px-4 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!selectedVehicle || selectedVehicle.status === 'Blocked' || (selectedOrder.weight + selectedVehicle.currentLoadKg > selectedVehicle.capacityKg)}
                onClick={handleAssign}
                className="py-2 px-6 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white transition-colors"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEFER MODAL */}
      {showDeferModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl w-[450px] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-200">
              <h2 className="font-bold text-xl text-gray-900">Defer Order</h2>
              <p className="text-sm text-gray-500 mt-1">Order {selectedOrder.ref} will be removed from the active queue.</p>
            </div>
            <div className="p-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for Deferral <span className="text-red-500">*</span></label>
              <textarea
                value={deferReason}
                onChange={e => setDeferReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
                rows={4}
                placeholder="E.g., Outlet closed early, insufficient reefer capacity..."
              ></textarea>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => { setShowDeferModal(false); setDeferReason(''); }}
                className="py-2 px-4 border border-gray-300 bg-white rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!deferReason.trim()}
                onClick={handleDefer}
                className="py-2 px-6 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white transition-colors"
              >
                Submit Deferral
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}