'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Download, X, Snowflake, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import OrderDetailsDrawer from './OrderDetailsDrawer';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';
import { validateOrderIntake } from '@/lib/dispatcher/validation';
import type { Brand, OrderAssignment, S1Order } from '@/types/dispatcher';

type BrandFilter = 'All' | Brand;
type AllocationFilter = 'all' | 'assigned' | 'deferred' | 'unresolved' | 'needs_correction';
type ConstraintFilter = 'all' | 'chilled' | 'van_only' | 'mall_dock' | 'deferred_yesterday';

const BRAND_PILL: Record<Brand, string> = {
  Fresh: 'bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0]',
  Tech: 'bg-[#F3E8FF] text-[#8B5CF6] border border-[#DDD6FE]',
  Style: 'bg-[#FFF4ED] text-[#F97316] border border-[#FED7AA]',
};

function toCsv(orders: S1Order[]): string {
  const header = ['order_ref', 'outlet_id', 'brand', 'district', 'dock_type', 'temp_requirement', 'window_open_time', 'window_close_time', 'order_weight_kg', 'order_volume_m3', 'parking_constraint', 'mall_window'];
  const rows = orders.map(o => [o.orderRef, o.outletId, o.brand, o.district, o.dockType, o.tempRequirement, o.windowOpenTime, o.windowCloseTime, o.orderWeightKg, o.orderVolumeM3, o.parkingConstraint, o.mallWindow ?? '']);
  return [header, ...rows].map(r => r.join(',')).join('\n');
}

function StatusBadge({ order, allocation }: { order: S1Order; allocation: OrderAssignment | undefined }) {
  const intake = validateOrderIntake(order);
  if (intake.status === 'needs_correction') {
    return <span title={intake.issues.join('; ')} className="rounded-md border border-red-300 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">Needs correction</span>;
  }
  if (allocation?.decision === 'served') {
    return <span className="rounded-md border border-[#F97316]/30 bg-[#FFF4ED] px-2 py-0.5 text-[11px] font-semibold text-[#F97316]">Assigned</span>;
  }
  if (allocation?.decision === 'deferred') {
    return <span className="rounded-md border border-gray-300 bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">Deferred</span>;
  }
  return <span className="rounded-md border border-amber-200 bg-[#FFFBEB] px-2 py-0.5 text-[11px] font-semibold text-amber-700">Unallocated</span>;
}

function TempBadge({ order }: { order: S1Order }) {
  return order.tempRequirement === 'chilled' ? (
    <span className="inline-flex items-center gap-1 rounded-md border border-[#10B981]/30 bg-[#ECFDF5] px-1.5 py-0.5 text-[10px] font-semibold text-[#10B981]">
      <Snowflake size={10} /> Chilled
    </span>
  ) : null;
}

function AccessBadge({ order }: { order: S1Order }) {
  if (order.parkingConstraint === 'van_only') {
    return <span className="inline-flex rounded-md border border-[#F97316]/30 bg-[#FFF4ED] px-1.5 py-0.5 text-[10px] font-semibold text-[#F97316]">Van only</span>;
  }
  if (order.parkingConstraint === 'mall_dock') {
    return <span className="inline-flex rounded-md border border-indigo-200 bg-[#EEF2FF] px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">{order.mallWindow ?? 'Mall dock'}</span>;
  }
  return null;
}

const PAGE_SIZE = 15;

export default function Orders() {
  const { orders, assignments } = useDispatcherPlan();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialize from URL params
  const initialAllocation = (searchParams?.get('filter') as AllocationFilter) ?? 'all';

  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('All');
  const [allocationFilter, setAllocationFilter] = useState<AllocationFilter>(initialAllocation);
  const [constraintFilter, setConstraintFilter] = useState<ConstraintFilter>('all');
  const [detailRef, setDetailRef] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Sync allocation filter from URL param changes
  useEffect(() => {
    const f = searchParams?.get('filter') as AllocationFilter;
    if (f) {
      setAllocationFilter(f);
      setCurrentPage(1);
    }
  }, [searchParams]);

  // Count active filters
  const activeFilterCount = (search.trim() ? 1 : 0) + (brandFilter !== 'All' ? 1 : 0) + (allocationFilter !== 'all' ? 1 : 0) + (constraintFilter !== 'all' ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  function clearFilters() {
    setSearch('');
    setBrandFilter('All');
    setAllocationFilter('all');
    setConstraintFilter('all');
    setCurrentPage(1);
    router.push('/dispatcher/orders');
  }

  const filteredOrders = useMemo(() => {
    let list = orders;

    // Brand filter
    if (brandFilter !== 'All') list = list.filter(o => o.brand === brandFilter);

    // Allocation filter
    switch (allocationFilter) {
      case 'assigned': list = list.filter(o => assignments[o.orderRef]?.decision === 'served'); break;
      case 'deferred': list = list.filter(o => assignments[o.orderRef]?.decision === 'deferred'); break;
      case 'unresolved': list = list.filter(o => assignments[o.orderRef]?.decision === 'unresolved'); break;
      case 'needs_correction': list = list.filter(o => validateOrderIntake(o).status === 'needs_correction'); break;
    }

    // Constraint filter
    switch (constraintFilter) {
      case 'chilled': list = list.filter(o => o.tempRequirement === 'chilled'); break;
      case 'van_only': list = list.filter(o => o.parkingConstraint === 'van_only'); break;
      case 'mall_dock': list = list.filter(o => o.parkingConstraint === 'mall_dock'); break;
      case 'deferred_yesterday': list = list.filter(o => o.deferredYesterday); break;
    }

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(o =>
        o.orderRef.toLowerCase().includes(q) ||
        o.outletId.toLowerCase().includes(q) ||
        o.district.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, assignments, brandFilter, allocationFilter, constraintFilter, search]);

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, currentPage]);

  const detailOrder = orders.find(o => o.orderRef === detailRef) || null;

  function handleExport() {
    const csv = toCsv(filteredOrders);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `s1-orders-filtered.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const BRANDS: BrandFilter[] = ['All', 'Fresh', 'Tech', 'Style'];
  const ALLOCATIONS: { value: AllocationFilter; label: string }[] = [
    { value: 'all', label: 'All status' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'deferred', label: 'Deferred' },
    { value: 'unresolved', label: 'Unallocated' },
    { value: 'needs_correction', label: 'Needs correction' },
  ];
  const CONSTRAINTS: { value: ConstraintFilter; label: string }[] = [
    { value: 'all', label: 'All constraints' },
    { value: 'chilled', label: 'Chilled' },
    { value: 'van_only', label: 'Van only' },
    { value: 'mall_dock', label: 'Mall dock' },
    { value: 'deferred_yesterday', label: 'Deferred yesterday' },
  ];

  return (
    <div className="flex flex-col flex-1 p-6 md:p-8 gap-5 w-full max-w-[1200px] mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] md:text-[24px] font-bold text-[#202D2D] m-0 tracking-tight">
            Orders
            <span className="ml-2.5 text-sm font-normal text-[#64748B] tabular-nums">
              ({filteredOrders.length} of {orders.length})
            </span>
          </h1>
          <p className="text-sm text-[#64748B] m-0 mt-0.5">Confirmed S1 customer orders and delivery constraints</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-colors flex-shrink-0 shadow-xs"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Responsive Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-sm">
        {/* Search Input ~300px */}
        <div className="flex items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 w-full sm:w-[280px] md:w-[300px] focus-within:border-[#F97316] transition-colors">
          <Search size={14} className="text-[#94A3B8] flex-shrink-0" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search orders or outlets"
            className="border-none outline-none text-xs text-[#202D2D] w-full bg-transparent placeholder-[#94A3B8]"
          />
          {search && (
            <button onClick={() => { setSearch(''); setCurrentPage(1); }} className="text-[#94A3B8] hover:text-[#485563]" aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Brand Dropdown */}
        <select
          value={brandFilter}
          onChange={e => { setBrandFilter(e.target.value as BrandFilter); setCurrentPage(1); }}
          className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium text-[#485563] outline-none focus:border-[#F97316] cursor-pointer"
        >
          {BRANDS.map(b => <option key={b} value={b}>{b === 'All' ? 'All brands' : b}</option>)}
        </select>

        {/* Status Dropdown */}
        <select
          value={allocationFilter}
          onChange={e => { setAllocationFilter(e.target.value as AllocationFilter); setCurrentPage(1); }}
          className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium text-[#485563] outline-none focus:border-[#F97316] cursor-pointer"
        >
          {ALLOCATIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>

        {/* Constraints Dropdown */}
        <select
          value={constraintFilter}
          onChange={e => { setConstraintFilter(e.target.value as ConstraintFilter); setCurrentPage(1); }}
          className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium text-[#485563] outline-none focus:border-[#F97316] cursor-pointer"
        >
          {CONSTRAINTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#F97316] hover:text-[#EA580C] px-2 py-1 rounded transition-colors ml-auto"
          >
            <X size={13} />
            Clear filters ({activeFilterCount})
          </button>
        )}
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No orders match this filter"
          description="Try selecting a different filter or clearing search."
          action={
            <button
              onClick={clearFilters}
              className="px-3.5 py-1.5 rounded-lg bg-[#F97316] text-white text-xs font-semibold hover:bg-[#EA580C] transition-colors shadow-xs"
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[620px]">
              <table className="w-full text-left border-collapse min-w-[860px]">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider">Order</th>
                    <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider">Outlet / District</th>
                    <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider">Brand</th>
                    <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider">Load</th>
                    <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider">Window</th>
                    <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider">Status</th>
                    <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {paginatedOrders.map((order) => {
                    const allocation = assignments[order.orderRef];
                    return (
                      <tr
                        key={order.orderRef}
                        onClick={() => setDetailRef(order.orderRef)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDetailRef(order.orderRef); }}
                        tabIndex={0}
                        role="button"
                        aria-label={`View order ${order.orderRef}`}
                        className="cursor-pointer hover:bg-[#F8FAFC] focus:bg-[#F8FAFC] focus:outline-none transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-xs text-[#202D2D] tabular-nums">{order.orderRef}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-xs text-[#202D2D] leading-tight">{order.outletId}</span>
                            <span className="text-[11px] text-[#64748B]">{order.district} · {order.dockType.replace('_', ' ')}</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              <TempBadge order={order} />
                              <AccessBadge order={order} />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`py-0.5 px-2 rounded-md font-semibold text-[10px] uppercase ${BRAND_PILL[order.brand]}`}>{order.brand}</span>
                        </td>
                        <td className="py-3 px-4 text-xs text-[#485563] tabular-nums">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-[#202D2D]">{order.orderWeightKg.toFixed(1)} kg</span>
                            <span className="text-[11px] text-[#64748B]">{order.orderVolumeM3.toFixed(3)} m³</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-[#485563] tabular-nums">{order.windowOpenTime}–{order.windowCloseTime}</td>
                        <td className="py-3 px-4"><StatusBadge order={order} allocation={allocation} /></td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); setDetailRef(order.orderRef); }}
                            className="p-1 rounded text-[#94A3B8] hover:text-[#F97316] hover:bg-[#FFF4ED] transition-colors"
                            aria-label={`Open details for ${order.orderRef}`}
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] bg-[#FAFAFA] text-xs text-[#64748B]">
              <span className="tabular-nums">
                Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredOrders.length)} of {filteredOrders.length} orders
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold text-[#485563] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <span className="px-2 font-medium text-[#202D2D] tabular-nums">Page {currentPage} of {totalPages}</span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold text-[#485563] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {paginatedOrders.map((order) => {
              const allocation = assignments[order.orderRef];
              return (
                <div
                  key={order.orderRef}
                  onClick={() => setDetailRef(order.orderRef)}
                  className="flex cursor-pointer flex-col gap-2 rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-sm active:bg-[#F8FAFC]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#202D2D] tabular-nums">{order.orderRef}</span>
                    <StatusBadge order={order} allocation={allocation} />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#202D2D]">{order.outletId}</span>
                    <span className="text-xs text-[#64748B]"> · {order.district}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`py-0.5 px-2 rounded-md font-semibold text-[10px] uppercase ${BRAND_PILL[order.brand]}`}>{order.brand}</span>
                    <TempBadge order={order} />
                    <AccessBadge order={order} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748B] tabular-nums">
                    <span>{order.orderWeightKg.toFixed(1)} kg / {order.orderVolumeM3.toFixed(3)} m³</span>
                    <span>{order.windowOpenTime}–{order.windowCloseTime}</span>
                  </div>
                </div>
              );
            })}

            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs text-[#64748B]">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white font-semibold disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="tabular-nums">Page {currentPage} of {totalPages}</span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white font-semibold disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <OrderDetailsDrawer order={detailOrder} open={!!detailRef} onClose={() => setDetailRef(null)} />
    </div>
  );
}
