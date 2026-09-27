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

const Sidebar = () => (
  <aside className="flex flex-col w-[280px] bg-[#171c21] text-white py-8 px-5 flex-shrink-0 font-sans box-border h-screen sticky top-0">
    <div className="flex items-center gap-3 mb-10">
      <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center text-white">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h4l3-9 5 18 3-9h5"/></svg>
      </div>
      <div className="flex flex-col">
        <h2 className="font-bold text-[22px] text-white m-0 leading-none">RightGo</h2>
        <span className="font-medium text-[10px] text-gray-400 mt-1 tracking-wider uppercase">Precision, in motion</span>
      </div>
    </div>
    
    <div className="flex items-center p-3 bg-[#282f37] rounded-xl mb-8 gap-3">
      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center font-semibold text-sm text-gray-200">SJ</div>
      <div className="flex flex-col gap-0.5">
        <p className="font-semibold text-sm text-white m-0">Sarah Jenkins</p>
        <span className="bg-orange-500 text-white text-[10px] font-bold py-[2px] px-1.5 rounded w-fit uppercase">Dispatcher</span>
      </div>
    </div>

    <div className="flex flex-col gap-2">
      <Link href="/dispatcher" className="flex flex-row items-center p-3 rounded-lg gap-3 text-gray-400 font-medium text-sm cursor-pointer transition-all duration-200 no-underline hover:bg-[#282f37] hover:text-white">
        <IconDashboard /> Dashboard
      </Link>
      <Link href="/dispatcher/orders" className="flex flex-row items-center p-3 rounded-lg gap-3 text-white font-medium text-sm cursor-pointer transition-all duration-200 no-underline bg-orange-500 hover:bg-orange-600">
        <IconList /> Orders
      </Link>
      <Link href="/dispatcher/planning" className="flex flex-row items-center p-3 rounded-lg gap-3 text-gray-400 font-medium text-sm cursor-pointer transition-all duration-200 no-underline hover:bg-[#282f37] hover:text-white">
        <IconCalendar /> Planning
      </Link>
      <div className="flex flex-row items-center p-3 rounded-lg gap-3 text-gray-400 font-medium text-sm cursor-pointer transition-all duration-200 no-underline hover:bg-[#282f37] hover:text-white">
        <IconClipboard /> Plan Review
      </div>
      <div className="flex flex-row items-center p-3 rounded-lg gap-3 text-gray-400 font-medium text-sm cursor-pointer transition-all duration-200 no-underline hover:bg-[#282f37] hover:text-white">
        <IconDatabase /> Decision Ledger
      </div>
      <div className="flex flex-row items-center p-3 rounded-lg gap-3 text-gray-400 font-medium text-sm cursor-pointer transition-all duration-200 no-underline hover:bg-[#282f37] hover:text-white">
        <IconPlay /> Live Operations
      </div>
      <div className="flex flex-row items-center p-3 rounded-lg gap-3 text-gray-400 font-medium text-sm cursor-pointer transition-all duration-200 no-underline hover:bg-[#282f37] hover:text-white">
        <IconBarChart /> Future Capacity
      </div>
    </div>
  </aside>
);

export default function Orders() {
  const [activeFilter, setActiveFilter] = useState('All');
  
  const initialOrders = [
    { ref: 'S1-001', brand: 'FRESH', outlet: 'OUT001', temp: 'Cold Chain', weight: '226.4 kg', vol: '1.145 m³', constraints: ['van_only'], status: 'Confirmed' },
    { ref: 'S1-002', brand: 'STYLE', outlet: 'OUT002', temp: 'Ambient', weight: '80.0 kg', vol: '1.200 m³', constraints: [], status: 'Confirmed' },
    { ref: 'S1-003', brand: 'TECH', outlet: 'OUT003', temp: 'Ambient', weight: '85.0 kg', vol: '0.500 m³', constraints: ['high_value'], status: 'Deferred' },
    { ref: 'S1-004', brand: 'FRESH', outlet: 'OUT004', temp: 'Cold Chain', weight: '150.0 kg', vol: '0.800 m³', constraints: ['time_window'], status: 'Confirmed' },
    { ref: 'S1-005', brand: 'STYLE', outlet: 'OUT005', temp: 'Ambient', weight: '120.0 kg', vol: '1.500 m³', constraints: [], status: 'Deferred' },
    { ref: 'S1-006', brand: 'FRESH', outlet: 'OUT006', temp: 'Cold Chain', weight: '90.0 kg', vol: '0.600 m³', constraints: ['van_only', 'time_window'], status: 'Confirmed' },
    { ref: 'S1-007', brand: 'TECH', outlet: 'OUT007', temp: 'Ambient', weight: '200.0 kg', vol: '2.000 m³', constraints: ['tail_lift'], status: 'Confirmed' },
  ];

  const filteredOrders = activeFilter === 'All' 
    ? initialOrders 
    : initialOrders.filter(o => o.brand.toLowerCase() === activeFilter.toLowerCase());

  return (
    <div className="flex flex-row min-h-screen bg-[#FAFAFA]">
      <Sidebar />
      <div className="flex flex-col flex-1 p-10 gap-6 w-full max-w-[1160px] mx-auto bg-[#F9FAFB] h-full overflow-y-auto font-sans">
        
        {/* Header */}
        <div className="flex flex-row justify-between items-center w-full h-[69px]">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-bold text-[28px] text-[#202D2D] leading-[42px] m-0">Orders</h1>
            <h2 className="font-medium text-[11px] text-[#485563] uppercase tracking-wider m-0">842 Ready for Planning</h2>
          </div>
          <div className="flex flex-row gap-3">
            <button className="flex flex-row items-center px-4 py-2 bg-white border border-[#CBD5E1] rounded-lg gap-2 font-semibold text-sm text-[#485563] cursor-pointer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              Filter / Sort
            </button>
            <button className="flex flex-row items-center px-4 py-2 bg-[#F97316] rounded-lg gap-2 font-semibold text-sm text-white cursor-pointer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Brand Filters */}
        <div className="flex flex-row gap-3">
          <button 
            onClick={() => setActiveFilter('All')}
            className={`flex flex-row items-center py-1.5 px-4 rounded-full gap-2 border cursor-pointer transition-colors ${activeFilter === 'All' ? 'bg-[#F97316] border-[#F97316] text-white shadow-sm' : 'bg-white border-[#CBD5E1] hover:bg-gray-50'}`}
          >
            <span className={`font-semibold text-[13px] ${activeFilter === 'All' ? 'text-white' : 'text-[#485563]'}`}>All</span>
            <span className={`font-bold text-[13px] ${activeFilter === 'All' ? 'text-white' : 'text-[#485563]'}`}>85</span>
          </button>
          <button 
            onClick={() => setActiveFilter('Fresh')}
            className={`flex flex-row items-center py-1.5 px-4 rounded-full gap-2 border cursor-pointer transition-colors ${activeFilter === 'Fresh' ? 'bg-[#F97316] border-[#F97316] text-white shadow-sm' : 'bg-white border-[#CBD5E1] hover:bg-gray-50'}`}
          >
            <span className={`font-semibold text-[13px] ${activeFilter === 'Fresh' ? 'text-white' : 'text-[#485563]'}`}>Fresh</span>
            <span className={`font-bold text-[13px] ${activeFilter === 'Fresh' ? 'text-white' : 'text-[#485563]'}`}>75</span>
          </button>
          <button 
            onClick={() => setActiveFilter('Tech')}
            className={`flex flex-row items-center py-1.5 px-4 rounded-full gap-2 border cursor-pointer transition-colors ${activeFilter === 'Tech' ? 'bg-[#F97316] border-[#F97316] text-white shadow-sm' : 'bg-white border-[#CBD5E1] hover:bg-gray-50'}`}
          >
            <span className={`font-semibold text-[13px] ${activeFilter === 'Tech' ? 'text-white' : 'text-[#485563]'}`}>Tech</span>
            <span className={`font-bold text-[13px] ${activeFilter === 'Tech' ? 'text-white' : 'text-[#485563]'}`}>5</span>
          </button>
          <button 
            onClick={() => setActiveFilter('Style')}
            className={`flex flex-row items-center py-1.5 px-4 rounded-full gap-2 border cursor-pointer transition-colors ${activeFilter === 'Style' ? 'bg-[#F97316] border-[#F97316] text-white shadow-sm' : 'bg-white border-[#CBD5E1] hover:bg-gray-50'}`}
          >
            <span className={`font-semibold text-[13px] ${activeFilter === 'Style' ? 'text-white' : 'text-[#485563]'}`}>Style</span>
            <span className={`font-bold text-[13px] ${activeFilter === 'Style' ? 'text-white' : 'text-[#485563]'}`}>5</span>
          </button>
        </div>

        {/* Table Container */}
        <div className="flex flex-col bg-white border border-[#CBD5E1] rounded-[10px] w-full flex-1 overflow-hidden">
          
          {/* Table Header */}
          <div className="flex flex-row items-center py-4 px-6 gap-6 border-b border-[#CBD5E1] bg-[#F9FAFB]">
            <div className="w-[100px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">ORDER REF</div>
            <div className="w-[100px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">BRAND</div>
            <div className="flex-1 font-bold text-[11px] text-[#485563] uppercase tracking-wider">OUTLET</div>
            <div className="w-[120px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">TEMP ZONE</div>
            <div className="w-[100px] text-left flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">WEIGHT</div>
            <div className="w-[100px] text-left flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">VOLUME</div>
            <div className="w-[100px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">STATUS</div>
            <div className="w-[160px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">CONSTRAINTS</div>
          </div>

          {/* Table Rows */}
          {filteredOrders.map((order, i) => (
            <div key={i} className="flex flex-row items-center py-4 px-6 gap-6 border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
              <div className="w-[100px] flex-shrink-0 font-semibold text-sm text-[#202D2D]">{order.ref}</div>
              <div className="w-[100px] flex-shrink-0 font-semibold text-sm text-[#202D2D]">{order.brand}</div>
              <div className="flex-1 font-semibold text-sm text-[#202D2D]">{order.outlet}</div>
              <div className="w-[120px] flex-shrink-0">
                {order.temp === 'Cold Chain' ? (
                  <div className="flex flex-row items-center py-1 px-2.5 bg-[#ECFDF5] border border-[#10B981] rounded text-[#10B981] font-semibold text-[11px] uppercase w-fit gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="22"></line><line x1="12" y1="2" x2="16" y2="6"></line><line x1="12" y1="2" x2="8" y2="6"></line><line x1="12" y1="22" x2="16" y2="18"></line><line x1="12" y1="22" x2="8" y2="18"></line><line x1="2.5" y1="9" x2="21.5" y2="15"></line><line x1="2.5" y1="9" x2="6.5" y2="7.5"></line><line x1="2.5" y1="9" x2="4.5" y2="13"></line><line x1="21.5" y1="15" x2="17.5" y2="16.5"></line><line x1="21.5" y1="15" x2="19.5" y2="11"></line><line x1="2.5" y1="15" x2="21.5" y2="9"></line><line x1="2.5" y1="15" x2="6.5" y2="16.5"></line><line x1="2.5" y1="15" x2="4.5" y2="11"></line><line x1="21.5" y1="9" x2="17.5" y2="7.5"></line><line x1="21.5" y1="9" x2="19.5" y2="13"></line></svg>
                    Cold Chain
                  </div>
                ) : (
                  <div className="flex flex-row items-center py-1 px-2.5 bg-[#FFFBEB] border border-[#F59E0B] rounded text-[#F59E0B] font-semibold text-[11px] uppercase w-fit gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                    Ambient
                  </div>
                )}
              </div>
              <div className="w-[100px] text-left flex-shrink-0 font-medium text-[13px] text-[#485563]">{order.weight}</div>
              <div className="w-[100px] text-left flex-shrink-0 font-medium text-[13px] text-[#485563]">{order.vol}</div>
              <div className="w-[100px] flex-shrink-0">
                {order.status === 'Confirmed' ? (
                  <span className="py-1 px-2.5 bg-green-50 text-green-700 border border-green-200 rounded font-semibold text-[10px] uppercase">Confirmed</span>
                ) : (
                  <span className="py-1 px-2.5 bg-gray-100 text-gray-600 border border-gray-300 rounded font-semibold text-[10px] uppercase">Deferred</span>
                )}
              </div>
              <div className="w-[160px] flex-shrink-0 font-medium text-[11px] text-[#485563]">
                {order.constraints.length > 0 ? order.constraints.map((c, j) => (
                  <span key={j} className="inline-flex py-1 px-2.5 bg-[#F1F5F9] rounded-full mr-2 mb-1">{c}</span>
                )) : (
                  <span className="text-gray-400 italic">None</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
