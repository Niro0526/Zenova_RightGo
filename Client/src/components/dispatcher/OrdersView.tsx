'use client';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';

type StatusFilter = 'All' | 'Fresh' | 'Tech' | 'Style';

function statusLabel(orderStatus: string, decision: string | undefined): { label: string; className: string } {
  if (orderStatus === 'cancelled') return { label: 'Cancelled', className: 'bg-gray-200 text-gray-600 border-gray-300' };
  if (orderStatus === 'received') return { label: 'Received (Store Confirmed)', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  if (orderStatus === 'delivered') return { label: 'Delivered (Pending Receipt)', className: 'bg-teal-50 text-teal-700 border-teal-200' };
  if (orderStatus === 'delivered_short') return { label: 'Delivered Short', className: 'bg-amber-100 text-amber-800 border-amber-300' };
  if (orderStatus === 'in_transit') return { label: 'In Transit', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  if (orderStatus === 'ready') return { label: 'Trip Ready', className: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
  if (orderStatus === 'loading') return { label: 'Loading', className: 'bg-purple-50 text-purple-700 border-purple-200' };
  if (orderStatus === 'planned') return { label: 'Scheduled', className: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (decision === 'deferred' || orderStatus === 'deferred') return { label: 'Deferred', className: 'bg-amber-50 text-amber-700 border-amber-300' };
  if (decision === 'served') return { label: 'Assigned (draft)', className: 'bg-orange-50 text-orange-700 border-orange-300' };
  return { label: 'Confirmed', className: 'bg-green-50 text-green-700 border-green-200' };
}

function toCsv(rows: { ref: string; brand: string; outlet: string; temp: string; weight: number; vol: number; status: string; date: string }[]): string {
  const header = ['Order Ref', 'Brand', 'Outlet', 'Temp Zone', 'Weight (kg)', 'Volume (m3)', 'Status', 'Run Date'];
  const lines = rows.map(r => [r.ref, r.brand, r.outlet, r.temp, r.weight.toFixed(1), r.vol.toFixed(3), r.status, r.date].join(','));
  return [header.join(','), ...lines].join('\n');
}

export default function Orders() {
  const { orders, assignments, isLoading, error, ordersClosed, closeOrders, isSaving } = useDispatcherPlan();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const counts = useMemo(() => ({
    All: orders.length,
    Fresh: orders.filter(o => o.brand === 'Fresh').length,
    Tech: orders.filter(o => o.brand === 'Tech').length,
    Style: orders.filter(o => o.brand === 'Style').length,
  }), [orders]);

  const filteredOrders = useMemo(() => orders.filter(o => {
    const matchesBrand = activeFilter === 'All' || o.brand === activeFilter;
    const orderDate = o.runDate ?? (o.createdAt ? o.createdAt.slice(0, 10) : null);
    let matchesDate = true;
    if (orderDate) {
      if (fromDate && toDate) matchesDate = orderDate >= fromDate && orderDate <= toDate;
      else if (fromDate) matchesDate = orderDate >= fromDate;
      else if (toDate) matchesDate = orderDate <= toDate;
    } else if (fromDate || toDate) {
      matchesDate = false; // a date filter is active but this legacy row has no date to compare
    }
    return matchesBrand && matchesDate;
  }), [orders, activeFilter, fromDate, toDate]);

  function handleExportCsv() {
    const rows = filteredOrders.map(o => ({
      ref: o.orderRef, brand: o.brand, outlet: o.outletId, temp: o.tempRequirement,
      weight: o.orderWeightKg, vol: o.orderVolumeM3,
      status: statusLabel(o.status, assignments[o.orderRef]?.decision).label,
      date: o.runDate ?? o.createdAt?.slice(0, 10) ?? '-',
    }));
    const blob = new Blob([toCsv(rows)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rightgo-orders-${activeFilter.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCloseOrders() {
    const ok = await closeOrders();
    if (ok) router.push('/dispatcher/planning');
  }

  function openInPlanning(orderRef: string) {
    router.push(`/dispatcher/planning?orderRef=${encodeURIComponent(orderRef)}`);
  }

  if (isLoading) {
    return <div className="flex flex-col flex-1 items-center justify-center p-10 text-sm text-gray-400">Loading orders…</div>;
  }

  return (
    <div className="flex flex-col flex-1 p-4 md:p-10 gap-6 w-full max-w-[1160px] mx-auto bg-[#F9FAFB] h-full overflow-y-auto font-sans">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4 sm:gap-0">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-bold text-[24px] sm:text-[28px] text-[#202D2D] leading-tight sm:leading-[42px] m-0">Orders</h1>
            <h2 className="font-medium text-[11px] text-[#485563] uppercase tracking-wider m-0">
              {counts.All} active orders
              {ordersClosed ? ' · Closed for planning' : ' · Open intake (4 PM cutoff sets run date)'}
            </h2>
          </div>
          <div className="flex flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => void handleCloseOrders()}
              disabled={isSaving}
              className="flex-1 sm:flex-none flex flex-row items-center justify-center px-4 py-2 bg-white border border-[#CBD5E1] rounded-lg gap-2 font-semibold text-sm text-[#202D2D] cursor-pointer hover:bg-gray-50 disabled:opacity-50"
            >
              {isSaving ? 'Closing…' : ordersClosed ? 'Re-close & Auto-Plan' : 'Close Orders & Auto-Plan'}
            </button>
            <button onClick={handleExportCsv} className="flex-1 sm:flex-none flex flex-row items-center justify-center px-4 py-2 bg-[#F97316] rounded-lg gap-2 font-semibold text-sm text-white cursor-pointer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export CSV
            </button>
          </div>
        </div>

        {error && <div className="py-2.5 px-4 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600">{error}</div>}

        {/* Filters */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between w-full gap-4">
          <div className="flex flex-row flex-wrap gap-2 sm:gap-3">
            {(['All', 'Fresh', 'Tech', 'Style'] as StatusFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`flex flex-row items-center py-1.5 px-4 rounded-full gap-2 border cursor-pointer transition-colors ${activeFilter === f ? 'bg-[#F97316] border-[#F97316] text-white shadow-sm' : 'bg-white border-[#CBD5E1] hover:bg-gray-50'}`}
              >
                <span className={`font-semibold text-[13px] ${activeFilter === f ? 'text-white' : 'text-[#485563]'}`}>{f}</span>
                <span className={`font-bold text-[13px] ${activeFilter === f ? 'text-white' : 'text-[#485563]'}`}>{counts[f]}</span>
              </button>
            ))}
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
            <span className="font-semibold text-[13px] text-[#485563]">Run date:</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="flex-1 lg:flex-none py-1 px-3 border border-[#CBD5E1] rounded-lg text-[13px] text-[#485563] outline-none focus:border-[#F97316]" />
            <span className="text-[#485563] text-[13px] font-medium">to</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="flex-1 lg:flex-none py-1 px-3 border border-[#CBD5E1] rounded-lg text-[13px] text-[#485563] outline-none focus:border-[#F97316]" />
          </div>
        </div>

        {/* Table Container */}
        <div className="flex flex-col bg-white border border-[#CBD5E1] rounded-[10px] w-full flex-1 overflow-x-auto">
          <div className="min-w-[980px]">

          {/* Table Header */}
          <div className="flex flex-row items-center py-4 px-6 gap-6 border-b border-[#CBD5E1] bg-[#F9FAFB]">
            <div className="w-[100px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">ORDER REF</div>
            <div className="w-[80px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">BRAND</div>
            <div className="flex-1 font-bold text-[11px] text-[#485563] uppercase tracking-wider">OUTLET</div>
            <div className="w-[110px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">TEMP ZONE</div>
            <div className="w-[90px] text-left flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">WEIGHT</div>
            <div className="w-[90px] text-left flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">VOLUME</div>
            <div className="w-[130px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">STATUS</div>
            <div className="w-[110px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">RUN DATE</div>
            <div className="w-[100px] flex-shrink-0 font-bold text-[11px] text-[#485563] uppercase tracking-wider">PLANNING</div>
          </div>

          {/* Table Rows */}
          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500 flex flex-col items-center justify-center gap-2">
              <span className="text-2xl">📋</span>
              <span className="font-semibold text-gray-700">No orders in database</span>
              <span className="text-xs text-gray-400">
                {orders.length === 0
                  ? "Store replenishment orders will automatically populate here when placed."
                  : "No orders match the selected filters."}
              </span>
            </div>
          ) : filteredOrders.map((order) => {
            const a = assignments[order.orderRef];
            const st = statusLabel(order.status, a?.decision);
            return (
              <div key={order.orderRef} className="flex flex-row items-center py-4 px-6 gap-6 border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                <div className="w-[100px] flex-shrink-0 font-semibold text-sm text-[#202D2D]">{order.orderRef}</div>
                <div className="w-[80px] flex-shrink-0 font-semibold text-sm text-[#202D2D] uppercase">{order.brand}</div>
                <div className="flex-1 font-semibold text-sm text-[#202D2D]">{order.outletId}</div>
                <div className="w-[110px] flex-shrink-0">
                  {order.tempRequirement === 'chilled' ? (
                    <div className="flex flex-row items-center py-1 px-2.5 bg-[#ECFDF5] border border-[#10B981] rounded text-[#10B981] font-semibold text-[11px] uppercase w-fit gap-1">Chilled</div>
                  ) : (
                    <div className="flex flex-row items-center py-1 px-2.5 bg-[#FFFBEB] border border-[#F59E0B] rounded text-[#F59E0B] font-semibold text-[11px] uppercase w-fit gap-1">Ambient</div>
                  )}
                </div>
                <div className="w-[90px] text-left flex-shrink-0 font-medium text-[13px] text-[#485563]">{order.orderWeightKg.toFixed(1)} kg</div>
                <div className="w-[90px] text-left flex-shrink-0 font-medium text-[13px] text-[#485563]">{order.orderVolumeM3.toFixed(3)} m³</div>
                <div className="w-[130px] flex-shrink-0 flex flex-col gap-0.5">
                  <span className={`py-1 px-2.5 border rounded font-semibold text-[10px] uppercase w-fit ${st.className}`}>{st.label}</span>
                  {a?.decision === 'deferred' && a.reasonCode && (
                    <span className="text-[10px] text-gray-400" title={a.reasonNote ?? undefined}>{a.reasonCode}</span>
                  )}
                </div>
                <div className="w-[110px] flex-shrink-0 font-semibold text-sm text-[#202D2D]">
                  {order.runDate || (order.createdAt ? order.createdAt.slice(0, 10) : '—')}
                </div>
                <div className="w-[100px] flex-shrink-0">
                  <button onClick={() => openInPlanning(order.orderRef)} className="text-xs font-semibold text-orange-600 hover:underline">
                    Open in Planning
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>
  );
}
