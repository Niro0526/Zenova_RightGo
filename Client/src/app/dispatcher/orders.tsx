'use client';

import React, { useMemo, useState } from 'react';
import { useDispatcherPlan } from './store/PlanningContext';
import type { Brand, S1Order } from './types';

const SearchIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const DownloadIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const SnowflakeIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="22"/><line x1="12" y1="2" x2="16" y2="6"/><line x1="12" y1="2" x2="8" y2="6"/><line x1="12" y1="22" x2="16" y2="18"/><line x1="12" y1="22" x2="8" y2="18"/><line x1="2.5" y1="9" x2="21.5" y2="15"/><line x1="21.5" y1="9" x2="2.5" y2="15"/></svg>;
const SunIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>;

type FilterKey = 'All' | 'Fresh' | 'Tech' | 'Style' | 'Chilled' | 'Van Only' | 'Mall Window' | 'Previously Deferred';

const BRAND_PILL: Record<Brand, string> = {
  Fresh: 'bg-[#ECFDF5] text-[#10B981] border border-[#10B981]',
  Tech: 'bg-[#F3E8FF] text-[#8B5CF6] border border-[#8B5CF6]',
  Style: 'bg-[#FFF4ED] text-[#F97316] border border-[#F97316]',
};

function toCsv(orders: S1Order[]): string {
  const header = ['order_ref', 'outlet_id', 'brand', 'district', 'dock_type', 'temp_requirement', 'window_open_time', 'window_close_time', 'order_weight_kg', 'order_volume_m3', 'parking_constraint', 'mall_window'];
  const rows = orders.map(o => [o.orderRef, o.outletId, o.brand, o.district, o.dockType, o.tempRequirement, o.windowOpenTime, o.windowCloseTime, o.orderWeightKg, o.orderVolumeM3, o.parkingConstraint, o.mallWindow ?? '']);
  return [header, ...rows].map(r => r.join(',')).join('\n');
}

export default function Orders() {
  const { orders } = useDispatcherPlan();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('All');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => ({
    All: orders.length,
    Fresh: orders.filter(o => o.brand === 'Fresh').length,
    Tech: orders.filter(o => o.brand === 'Tech').length,
    Style: orders.filter(o => o.brand === 'Style').length,
    Chilled: orders.filter(o => o.tempRequirement === 'chilled').length,
    'Van Only': orders.filter(o => o.parkingConstraint === 'van_only').length,
    'Mall Window': orders.filter(o => o.mallWindow !== null).length,
    'Previously Deferred': orders.filter(o => o.deferredYesterday).length,
  }), [orders]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    switch (activeFilter) {
      case 'Fresh': list = list.filter(o => o.brand === 'Fresh'); break;
      case 'Tech': list = list.filter(o => o.brand === 'Tech'); break;
      case 'Style': list = list.filter(o => o.brand === 'Style'); break;
      case 'Chilled': list = list.filter(o => o.tempRequirement === 'chilled'); break;
      case 'Van Only': list = list.filter(o => o.parkingConstraint === 'van_only'); break;
      case 'Mall Window': list = list.filter(o => o.mallWindow !== null); break;
      case 'Previously Deferred': list = list.filter(o => o.deferredYesterday); break;
      default: break;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(o => o.orderRef.toLowerCase().includes(q) || o.outletId.toLowerCase().includes(q) || o.district.toLowerCase().includes(q));
    }
    return list;
  }, [orders, activeFilter, search]);

  function handleExport() {
    const csv = toCsv(filteredOrders);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `s1-confirmed-orders-${activeFilter.toLowerCase().replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col flex-1 p-6 md:p-10 gap-6 w-full max-w-[1160px] mx-auto bg-[#F9FAFB] font-sans">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-bold text-[28px] text-[#202D2D] leading-[42px] m-0">Confirmed Orders</h1>
          <h2 className="font-medium text-[13px] text-[#485563] m-0">S1 scenario orders (data/task2b_peak_day_scenarios.csv)</h2>
        </div>
        <div className="flex flex-row items-center gap-3 flex-wrap">
          <div className="flex flex-row items-center py-2 px-3 gap-2 bg-white border border-[#CBD5E1] rounded-lg">
            <SearchIcon />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search orders, outlets..."
              className="border-none outline-none font-sans text-sm text-[#485563] w-[180px]"
            />
          </div>
          <button onClick={handleExport} className="flex flex-row items-center px-4 py-2 bg-[#F97316] hover:bg-orange-600 rounded-lg gap-2 font-semibold text-sm text-white cursor-pointer transition-colors">
            <DownloadIcon />
            Export CSV ({filteredOrders.length})
          </button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-row gap-3 flex-wrap">
        {(Object.keys(counts) as FilterKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`flex flex-row items-center py-1.5 px-4 rounded-full gap-2 border cursor-pointer transition-colors ${activeFilter === key ? 'bg-[#F97316] border-[#F97316] shadow-sm' : 'bg-white border-[#CBD5E1] hover:bg-gray-50'}`}
          >
            <span className={`font-semibold text-[13px] ${activeFilter === key ? 'text-white' : 'text-[#485563]'}`}>{key}</span>
            <span className={`font-bold text-[13px] ${activeFilter === key ? 'text-white' : 'text-[#485563]'}`}>{counts[key]}</span>
          </button>
        ))}
      </div>

      {/* Table Container */}
      <div className="flex flex-col bg-white border border-[#CBD5E1] rounded-[10px] w-full flex-1 overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Table Header */}
          <div className="flex flex-row items-center py-4 px-6 gap-4 border-b border-[#CBD5E1] bg-[#F9FAFB]">
            <div className="w-[90px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">Order Ref</div>
            <div className="flex-1 min-w-[140px] font-bold text-[11px] text-[#485563] uppercase tracking-wider">Outlet / District</div>
            <div className="w-[70px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">Brand</div>
            <div className="w-[110px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">Temp Req</div>
            <div className="w-[110px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">Delivery Window</div>
            <div className="w-[90px] text-left flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">Weight</div>
            <div className="w-[90px] text-left flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">Volume</div>
            <div className="w-[180px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">Constraints / State</div>
          </div>

          {/* Table Rows */}
          {filteredOrders.map((order) => (
            <div key={order.orderRef} className="flex flex-row items-center py-4 px-6 gap-4 border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
              <div className="w-[90px] flex-shrink-0 font-semibold text-sm text-[#202D2D]">{order.orderRef}</div>
              <div className="flex-1 min-w-[140px] flex flex-col">
                <span className="font-semibold text-sm text-[#202D2D]">{order.outletId}</span>
                <span className="text-xs text-[#485563]">{order.district} · {order.dockType.replace('_', ' ')}</span>
              </div>
              <div className="w-[70px] flex-shrink-0">
                <span className={`py-1 px-2 rounded font-bold text-[10px] uppercase ${BRAND_PILL[order.brand]}`}>{order.brand}</span>
              </div>
              <div className="w-[110px] flex-shrink-0">
                {order.tempRequirement === 'chilled' ? (
                  <div className="flex flex-row items-center py-1 px-2.5 bg-[#ECFDF5] border border-[#10B981] rounded text-[#10B981] font-semibold text-[11px] uppercase w-fit gap-1">
                    <SnowflakeIcon /> Chilled
                  </div>
                ) : (
                  <div className="flex flex-row items-center py-1 px-2.5 bg-[#FFFBEB] border border-[#F59E0B] rounded text-[#F59E0B] font-semibold text-[11px] uppercase w-fit gap-1">
                    <SunIcon /> Ambient
                  </div>
                )}
              </div>
              <div className="w-[110px] flex-shrink-0 font-medium text-[13px] text-[#485563]">{order.windowOpenTime}-{order.windowCloseTime}</div>
              <div className="w-[90px] text-left flex-shrink-0 font-medium text-[13px] text-[#485563]">{order.orderWeightKg.toFixed(1)} kg</div>
              <div className="w-[90px] text-left flex-shrink-0 font-medium text-[13px] text-[#485563]">{order.orderVolumeM3.toFixed(3)} m³</div>
              <div className="w-[180px] flex-shrink-0 font-medium text-[11px] text-[#485563] flex flex-wrap gap-1">
                {order.parkingConstraint === 'van_only' && <span className="inline-flex py-1 px-2.5 bg-[#FFF4ED] text-[#F97316] border border-[#F97316] rounded-full uppercase font-semibold text-[10px]">van only</span>}
                {order.parkingConstraint === 'mall_dock' && <span className="inline-flex py-1 px-2.5 bg-[#EEF2FF] text-[#6366F1] border border-[#6366F1] rounded-full uppercase font-semibold text-[10px]">{order.mallWindow}</span>}
                {order.deferredYesterday && <span className="inline-flex py-1 px-2.5 bg-gray-100 text-gray-500 border border-gray-300 rounded-full uppercase font-semibold text-[10px]">deferred yesterday</span>}
                {order.parkingConstraint === 'normal' && !order.deferredYesterday && <span className="text-gray-400 italic">None</span>}
              </div>
            </div>
          ))}
          {filteredOrders.length === 0 && (
            <div className="p-10 text-center text-gray-400 text-sm font-medium">No orders match this filter.</div>
          )}
        </div>
      </div>
    </div>
  );
}
