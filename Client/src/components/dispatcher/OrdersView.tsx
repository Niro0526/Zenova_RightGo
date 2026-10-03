'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api-client';

const IconDashboard = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
const IconList = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
const IconCalendar = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const IconClipboard = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>;
const IconDatabase = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>;
const IconPlay = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>;
const IconBarChart = () => <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;



export default function Orders() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiGet<any[]>('/orders?scenario=S1')
      .then(rows => {
        if (cancelled) return;
        setOrders(rows.map(order => ({
          ref: order.delivery_id || order.order_ref,
          brand: String(order.brand || '').toUpperCase(),
          outlet: order.outlet_id,
          temp: order.temp_requirement === 'chilled' ? 'Cold Chain' : 'Ambient',
          weight: `${order.order_weight_kg ?? 0} kg`,
          vol: `${order.order_volume_m3 ?? 0} m³`,
          date: order.created_at?.slice(0, 10) || '',
          status: order.status === 'deferred' ? 'Deferred' : 'Confirmed',
        })));
      })
      .catch(error => console.error('Failed to load seeded orders:', error));

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredOrders = orders.filter(o => {
    const matchesBrand = activeFilter === 'All' || o.brand.toLowerCase() === activeFilter.toLowerCase();

    let matchesDate = true;
    if (fromDate && toDate) {
      matchesDate = o.date >= fromDate && o.date <= toDate;
    } else if (fromDate) {
      matchesDate = o.date >= fromDate;
    } else if (toDate) {
      matchesDate = o.date <= toDate;
    }

    return matchesBrand && matchesDate;
  });

  return (
    <div className="flex flex-col flex-1 p-4 md:p-10 gap-6 w-full max-w-[1160px] mx-auto bg-[#F9FAFB] h-full overflow-y-auto font-sans">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4 sm:gap-0">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-bold text-[24px] sm:text-[28px] text-[#202D2D] leading-tight sm:leading-[42px] m-0">Orders</h1>
            <h2 className="font-medium text-[11px] text-[#485563] uppercase tracking-wider m-0">842 Ready for Planning</h2>
          </div>
          <div className="flex flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none flex flex-row items-center justify-center px-4 py-2 bg-white border border-[#CBD5E1] rounded-lg gap-2 font-semibold text-sm text-[#485563] cursor-pointer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              Filter / Sort
            </button>
            <button className="flex-1 sm:flex-none flex flex-row items-center justify-center px-4 py-2 bg-[#F97316] rounded-lg gap-2 font-semibold text-sm text-white cursor-pointer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        {/* Filters */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between w-full gap-4">
          <div className="flex flex-row flex-wrap gap-2 sm:gap-3">
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

          {/* Date Range Filter */}
          <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
            <span className="font-semibold text-[13px] text-[#485563]">Date Limit:</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="flex-1 lg:flex-none py-1 px-3 border border-[#CBD5E1] rounded-lg text-[13px] text-[#485563] outline-none focus:border-[#F97316]" />
            <span className="text-[#485563] text-[13px] font-medium">to</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="flex-1 lg:flex-none py-1 px-3 border border-[#CBD5E1] rounded-lg text-[13px] text-[#485563] outline-none focus:border-[#F97316]" />
          </div>
        </div>

        {/* Table Container */}
        <div className="flex flex-col bg-white border border-[#CBD5E1] rounded-[10px] w-full flex-1 overflow-x-auto">
          <div className="min-w-[900px]">

          {/* Table Header */}
          <div className="flex flex-row items-center py-4 px-6 gap-6 border-b border-[#CBD5E1] bg-[#F9FAFB]">
            <div className="w-[100px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">ORDER REF</div>
            <div className="w-[100px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">BRAND</div>
            <div className="flex-1 font-bold text-[11px] text-[#485563] uppercase tracking-wider">OUTLET</div>
            <div className="w-[120px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">TEMP ZONE</div>
            <div className="w-[100px] text-left flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">WEIGHT</div>
            <div className="w-[100px] text-left flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">VOLUME</div>
            <div className="w-[100px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">STATUS</div>
            <div className="w-[120px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">DATE</div>
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
              <div className="w-[120px] flex-shrink-0 font-semibold text-sm text-[#202D2D]">
                {order.date}
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>
  );
}