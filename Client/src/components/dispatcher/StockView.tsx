'use client';

import React, { useMemo, useState } from 'react';
import { Search, X, Package, Plus, AlertCircle, CheckCircle, Snowflake, Thermometer, Printer, Info, ChevronDown, ChevronUp } from 'lucide-react';
import Drawer from '@/components/common/Drawer';

interface StockItem {
  id: string;
  name: string;
  brand: 'Fresh' | 'Tech' | 'Style';
  temp: 'ambient' | 'chilled';
  unit: string;
  onHand: number;
  reserved: number;
  lastUpdated: string;
}

interface StockMovement {
  id: string;
  itemId: string;
  type: 'receipt' | 'adjustment' | 'reservation';
  qty: number;
  reference: string;
  note: string;
  time: string;
}

const DEMO_ITEMS: StockItem[] = [
  { id: 'SKU-001', name: 'Fresh Yoghurt 1L', brand: 'Fresh', temp: 'chilled', unit: 'ctn', onHand: 120, reserved: 80, lastUpdated: '06:00' },
  { id: 'SKU-002', name: 'Fresh Milk 2L', brand: 'Fresh', temp: 'chilled', unit: 'ctn', onHand: 200, reserved: 150, lastUpdated: '06:00' },
  { id: 'SKU-003', name: 'Bakery Mix 5kg', brand: 'Fresh', temp: 'ambient', unit: 'bag', onHand: 60, reserved: 30, lastUpdated: '05:45' },
  { id: 'SKU-004', name: 'Smart TV 43"', brand: 'Tech', temp: 'ambient', unit: 'unit', onHand: 8, reserved: 4, lastUpdated: '05:30' },
  { id: 'SKU-005', name: 'Laptop ProBook', brand: 'Tech', temp: 'ambient', unit: 'unit', onHand: 12, reserved: 6, lastUpdated: '05:30' },
  { id: 'SKU-006', name: 'Style Polo Shirts', brand: 'Style', temp: 'ambient', unit: 'box', onHand: 45, reserved: 20, lastUpdated: '05:00' },
  { id: 'SKU-007', name: 'Fresh Cream 500ml', brand: 'Fresh', temp: 'chilled', unit: 'ctn', onHand: 0, reserved: 0, lastUpdated: '—' },
];

const DEMO_MOVEMENTS: StockMovement[] = [
  { id: 'mv-001', itemId: 'SKU-001', type: 'receipt', qty: 200, reference: 'GRN-2026-001', note: 'Morning supplier shipment', time: '04:30' },
  { id: 'mv-002', itemId: 'SKU-001', type: 'reservation', qty: -80, reference: 'PLAN-S1', note: 'Allocated for S1 dispatch plan', time: '05:00' },
  { id: 'mv-003', itemId: 'SKU-002', type: 'receipt', qty: 250, reference: 'GRN-2026-002', note: 'Fresh dairy intake', time: '03:00' },
  { id: 'mv-004', itemId: 'SKU-002', type: 'reservation', qty: -150, reference: 'PLAN-S1', note: 'Allocated for S1 dispatch plan', time: '05:00' },
  { id: 'mv-005', itemId: 'SKU-003', type: 'adjustment', qty: -10, reference: 'ADJ-001', note: 'Damaged packaging adjustment', time: '05:30' },
  { id: 'mv-006', itemId: 'SKU-004', type: 'receipt', qty: 10, reference: 'GRN-2026-003', note: 'Replenishment intake', time: '02:00' },
];

const BRAND_STYLE: Record<string, string> = {
  Fresh: 'bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0]',
  Tech: 'bg-[#F3E8FF] text-[#8B5CF6] border border-[#DDD6FE]',
  Style: 'bg-[#FFF4ED] text-[#F97316] border border-[#FED7AA]',
};

type BrandFilter = 'All' | 'Fresh' | 'Tech' | 'Style';
type TempFilter = 'all' | 'chilled' | 'ambient';
type AvailFilter = 'all' | 'available' | 'zero';

export default function StockView() {
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('All');
  const [tempFilter, setTempFilter] = useState<TempFilter>('all');
  const [availFilter, setAvailFilter] = useState<AvailFilter>('all');
  const [items, setItems] = useState<StockItem[]>(DEMO_ITEMS);
  const [movements, setMovements] = useState<StockMovement[]>(DEMO_MOVEMENTS);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [drawerMode, setDrawerMode] = useState<'detail' | 'receipt' | 'adjust' | 'label'>('detail');
  const [showExplanation, setShowExplanation] = useState(false);

  // Form states
  const [receiptQty, setReceiptQty] = useState('');
  const [receiptRef, setReceiptRef] = useState('');
  const [receiptNote, setReceiptNote] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [receiptSuccess, setReceiptSuccess] = useState(false);
  const [adjustSuccess, setAdjustSuccess] = useState(false);

  const activeFilterCount = (search.trim() ? 1 : 0) + (brandFilter !== 'All' ? 1 : 0) + (tempFilter !== 'all' ? 1 : 0) + (availFilter !== 'all' ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  function clearFilters() {
    setSearch('');
    setBrandFilter('All');
    setTempFilter('all');
    setAvailFilter('all');
  }

  const filteredItems = useMemo(() => {
    let list = items;
    if (brandFilter !== 'All') list = list.filter(i => i.brand === brandFilter);
    if (tempFilter !== 'all') list = list.filter(i => i.temp === tempFilter);
    if (availFilter === 'available') list = list.filter(i => i.onHand - i.reserved > 0);
    if (availFilter === 'zero') list = list.filter(i => i.onHand === 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q));
    }
    return list;
  }, [items, brandFilter, tempFilter, availFilter, search]);

  const itemMovements = selectedItem ? movements.filter(m => m.itemId === selectedItem.id) : [];

  function openItem(item: StockItem) {
    setSelectedItem(item);
    setDrawerMode('detail');
    setReceiptSuccess(false);
    setAdjustSuccess(false);
    setReceiptQty(''); setReceiptRef(''); setReceiptNote(''); setReceiptError('');
    setAdjustQty(''); setAdjustReason(''); setAdjustError('');
  }

  function handleReceipt() {
    const qty = Number(receiptQty);
    if (!receiptQty || isNaN(qty) || qty <= 0) { setReceiptError('Enter a positive quantity.'); return; }
    if (!receiptRef.trim()) { setReceiptError('Reference is required.'); return; }
    setReceiptError('');
    const newMovement: StockMovement = {
      id: `mv-${Date.now()}`, itemId: selectedItem!.id, type: 'receipt',
      qty, reference: receiptRef.trim(), note: receiptNote.trim() || 'Stock receipt',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    };
    setMovements(m => [newMovement, ...m]);
    setItems(prevItems => prevItems.map(i => i.id === selectedItem!.id
      ? { ...i, onHand: i.onHand + qty, lastUpdated: newMovement.time }
      : i
    ));
    setSelectedItem(prev => prev ? { ...prev, onHand: prev.onHand + qty, lastUpdated: newMovement.time } : null);
    setReceiptQty(''); setReceiptRef(''); setReceiptNote('');
    setReceiptSuccess(true);
  }

  function handleAdjust() {
    const delta = Number(adjustQty);
    if (!adjustQty || isNaN(delta) || delta === 0) { setAdjustError('Enter a non-zero quantity (+ to add, - to remove).'); return; }
    if (!adjustReason.trim()) { setAdjustError('Reason is required.'); return; }
    const newOnHand = selectedItem!.onHand + delta;
    if (newOnHand < 0) { setAdjustError('Adjustment would result in negative stock.'); return; }
    if (newOnHand < selectedItem!.reserved) { setAdjustError('Adjustment cannot bring balance below current reserved quantity.'); return; }
    setAdjustError('');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const newMovement: StockMovement = {
      id: `mv-${Date.now()}`, itemId: selectedItem!.id, type: 'adjustment',
      qty: delta, reference: 'ADJ-manual', note: adjustReason.trim(), time,
    };
    setMovements(m => [newMovement, ...m]);
    setItems(prevItems => prevItems.map(i => i.id === selectedItem!.id ? { ...i, onHand: newOnHand, lastUpdated: time } : i));
    setSelectedItem(prev => prev ? { ...prev, onHand: newOnHand, lastUpdated: time } : null);
    setAdjustQty(''); setAdjustReason('');
    setAdjustSuccess(true);
  }

  return (
    <div className="flex flex-col flex-1 p-6 md:p-8 gap-5 w-full max-w-[1200px] mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] md:text-[24px] font-bold text-[#202D2D] m-0 tracking-tight">Stock</h1>
          <p className="text-sm text-[#64748B] m-0 mt-0.5">
            Depot inventory balances and intake registration · S1 Peliyagoda
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedItem(items[0]);
            setDrawerMode('receipt');
          }}
          className="flex items-center gap-2 rounded-lg bg-[#F97316] px-4 py-2 text-xs font-semibold text-white hover:bg-[#EA580C] transition-colors flex-shrink-0 shadow-xs"
        >
          <Plus size={15} />
          Record receipt
        </button>
      </div>

      {/* Required Concise Disclaimer */}
      <div className="rounded-xl border border-blue-200 bg-[#EFF6FF] p-3 text-xs text-blue-900 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Info size={15} className="text-blue-600" />
            <span>Demo inventory · Not linked to S1 orders</span>
          </div>
          <button
            onClick={() => setShowExplanation(s => !s)}
            className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-950 underline"
          >
            {showExplanation ? 'Hide details' : 'More info'}
            {showExplanation ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
        {showExplanation && (
          <p className="mt-2 text-[11px] text-blue-800 leading-relaxed border-t border-blue-200/60 pt-2 m-0">
            This repository does not define item-level SKU mappings for S1 orders. This workspace provides warehouse receipt intake, manual inventory adjustments, and label formatting for demonstration purposes without modifying competition order files.
          </p>
        )}
      </div>

      {/* Responsive Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-sm">
        {/* Search ~300px */}
        <div className="flex items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 w-full sm:w-[280px] md:w-[300px] focus-within:border-[#F97316] transition-colors">
          <Search size={14} className="text-[#94A3B8] flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items or codes"
            className="border-none outline-none text-xs text-[#202D2D] w-full bg-transparent placeholder-[#94A3B8]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[#94A3B8] hover:text-[#485563]">
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={brandFilter}
          onChange={e => setBrandFilter(e.target.value as BrandFilter)}
          className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium text-[#485563] outline-none cursor-pointer"
        >
          <option value="All">All brands</option>
          <option value="Fresh">Fresh</option>
          <option value="Tech">Tech</option>
          <option value="Style">Style</option>
        </select>

        <select
          value={tempFilter}
          onChange={e => setTempFilter(e.target.value as TempFilter)}
          className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium text-[#485563] outline-none cursor-pointer"
        >
          <option value="all">All temperatures</option>
          <option value="chilled">Chilled</option>
          <option value="ambient">Ambient</option>
        </select>

        <select
          value={availFilter}
          onChange={e => setAvailFilter(e.target.value as AvailFilter)}
          className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium text-[#485563] outline-none cursor-pointer"
        >
          <option value="all">All stock levels</option>
          <option value="available">In stock</option>
          <option value="zero">Zero stock</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs font-semibold text-[#F97316] hover:text-[#EA580C] px-2 py-1 rounded ml-auto"
          >
            <X size={13} />
            Clear filters
          </button>
        )}
      </div>

      {/* Stock Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider">Item / SKU</th>
                <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider">Brand</th>
                <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider">Condition</th>
                <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider text-right">On Hand</th>
                <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider text-right">Reserved</th>
                <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider text-right">Available</th>
                <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider text-right">Last Movement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredItems.map(item => {
                const available = item.onHand - item.reserved;
                return (
                  <tr
                    key={item.id}
                    onClick={() => openItem(item)}
                    className="cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-xs text-[#202D2D]">{item.name}</span>
                        <span className="text-[11px] text-[#64748B] font-mono">{item.id}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${BRAND_STYLE[item.brand]}`}>
                        {item.brand}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {item.temp === 'chilled' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#10B981]">
                          <Snowflake size={11} /> Chilled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#64748B]">
                          <Thermometer size={11} /> Ambient
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-right font-medium text-[#202D2D] tabular-nums">
                      {item.onHand} <span className="text-[#64748B] font-normal">{item.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-right text-[#64748B] tabular-nums">
                      {item.reserved} <span className="font-normal">{item.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-right font-semibold tabular-nums">
                      {item.onHand === 0 ? (
                        <span className="text-gray-400">0 {item.unit}</span>
                      ) : available < 10 ? (
                        <span className="text-amber-600">{available} {item.unit}</span>
                      ) : (
                        <span className="text-[#202D2D]">{available} {item.unit}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-right text-[#64748B] tabular-nums">
                      {item.lastUpdated}
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-[#94A3B8]">
                    No inventory items match current filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item Drawer */}
      <Drawer
        open={!!selectedItem}
        title={selectedItem?.name ?? 'Item Details'}
        subtitle={selectedItem ? `${selectedItem.id} · ${selectedItem.brand} · ${selectedItem.temp === 'chilled' ? 'Chilled' : 'Ambient'}` : undefined}
        onClose={() => setSelectedItem(null)}
        footer={selectedItem ? (
          <div className="flex gap-2">
            <button
              onClick={() => { setDrawerMode('receipt'); setReceiptSuccess(false); setReceiptError(''); }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                drawerMode === 'receipt' ? 'bg-[#F97316] text-white shadow-xs' : 'border border-[#CBD5E1] bg-white text-[#485563] hover:bg-[#F8FAFC]'
              }`}
            >
              Record receipt
            </button>
            <button
              onClick={() => { setDrawerMode('adjust'); setAdjustSuccess(false); setAdjustError(''); }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                drawerMode === 'adjust' ? 'bg-[#F97316] text-white shadow-xs' : 'border border-[#CBD5E1] bg-white text-[#485563] hover:bg-[#F8FAFC]'
              }`}
            >
              Adjust stock
            </button>
            <button
              onClick={() => setDrawerMode('label')}
              className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                drawerMode === 'label' ? 'bg-[#F97316] text-white shadow-xs' : 'border border-[#CBD5E1] bg-white text-[#485563] hover:bg-[#F8FAFC]'
              }`}
            >
              <Printer size={13} /> Label
            </button>
          </div>
        ) : undefined}
      >
        {selectedItem && (
          <div className="flex flex-col gap-5 p-1">
            {drawerMode === 'detail' && (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                    <span className="text-[10px] font-bold uppercase text-[#64748B]">On Hand</span>
                    <div className="font-bold text-sm text-[#202D2D] mt-1 tabular-nums">
                      {selectedItem.onHand} {selectedItem.unit}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                    <span className="text-[10px] font-bold uppercase text-[#64748B]">Reserved</span>
                    <div className="font-bold text-sm text-[#202D2D] mt-1 tabular-nums">
                      {selectedItem.reserved} {selectedItem.unit}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                    <span className="text-[10px] font-bold uppercase text-[#64748B]">Available</span>
                    <div className="font-bold text-sm text-[#202D2D] mt-1 tabular-nums">
                      {Math.max(0, selectedItem.onHand - selectedItem.reserved)} {selectedItem.unit}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                    <span className="text-[10px] font-bold uppercase text-[#64748B]">Last Updated</span>
                    <div className="font-semibold text-xs text-[#202D2D] mt-1 tabular-nums">
                      {selectedItem.lastUpdated}
                    </div>
                  </div>
                </div>

                {/* Audit Movements */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2 m-0">Movement History</h3>
                  {itemMovements.length === 0 ? (
                    <div className="text-xs text-[#94A3B8] italic p-3 rounded-lg border border-gray-100 bg-[#FAFAFA]">
                      No movement recorded.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {itemMovements.map(mv => (
                        <div key={mv.id} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 flex items-start gap-2.5">
                          <span className={`text-[10px] font-bold uppercase rounded px-1.5 py-0.5 flex-shrink-0 ${
                            mv.type === 'receipt' ? 'bg-emerald-100 text-emerald-800' : mv.type === 'adjustment' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {mv.type}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold tabular-nums ${mv.qty > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                {mv.qty > 0 ? '+' : ''}{mv.qty} {selectedItem.unit}
                              </span>
                              <span className="text-[11px] text-[#94A3B8] tabular-nums">{mv.time}</span>
                            </div>
                            <div className="text-xs text-[#485563] mt-0.5">{mv.note}</div>
                            <div className="text-[10px] text-[#94A3B8] font-mono mt-0.5">{mv.reference}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {drawerMode === 'receipt' && (
              <div className="flex flex-col gap-3.5">
                <h3 className="m-0 text-sm font-bold text-[#202D2D]">Record Intake — {selectedItem.name}</h3>
                {receiptSuccess && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle size={15} /> Receipt recorded successfully. Balance updated.
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#485563]">Quantity received ({selectedItem.unit}) *</label>
                  <input
                    type="number"
                    min={1}
                    value={receiptQty}
                    onChange={e => setReceiptQty(e.target.value)}
                    placeholder="e.g. 50"
                    className="rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs outline-none focus:border-[#F97316]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#485563]">GRN / Shipment Reference *</label>
                  <input
                    type="text"
                    value={receiptRef}
                    onChange={e => setReceiptRef(e.target.value)}
                    placeholder="e.g. GRN-2026-042"
                    className="rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs outline-none focus:border-[#F97316]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#485563]">Intake Note</label>
                  <textarea
                    value={receiptNote}
                    onChange={e => setReceiptNote(e.target.value)}
                    rows={2}
                    placeholder="Supplier or vehicle remarks"
                    className="rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs outline-none focus:border-[#F97316] resize-none"
                  />
                </div>
                {receiptError && <p className="text-xs text-red-600 m-0">{receiptError}</p>}
                <button
                  onClick={handleReceipt}
                  className="rounded-lg bg-[#F97316] py-2 text-xs font-semibold text-white hover:bg-[#EA580C] transition-colors shadow-xs"
                >
                  Save Receipt
                </button>
              </div>
            )}

            {drawerMode === 'adjust' && (
              <div className="flex flex-col gap-3.5">
                <h3 className="m-0 text-sm font-bold text-[#202D2D]">Stock Adjustment — {selectedItem.name}</h3>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                  Current on hand: <strong>{selectedItem.onHand} {selectedItem.unit}</strong> (Reserved: {selectedItem.reserved})
                </div>
                {adjustSuccess && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle size={15} /> Adjustment confirmed and logged.
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#485563]">Delta quantity (+ or -) *</label>
                  <input
                    type="number"
                    value={adjustQty}
                    onChange={e => setAdjustQty(e.target.value)}
                    placeholder="e.g. -5 or 10"
                    className="rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs outline-none focus:border-[#F97316]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#485563]">Reason code *</label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={e => setAdjustReason(e.target.value)}
                    placeholder="e.g. Damage in warehouse, count correction"
                    className="rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs outline-none focus:border-[#F97316]"
                  />
                </div>
                {adjustError && <p className="text-xs text-red-600 m-0">{adjustError}</p>}
                <button
                  onClick={handleAdjust}
                  className="rounded-lg bg-[#F97316] py-2 text-xs font-semibold text-white hover:bg-[#EA580C] transition-colors shadow-xs"
                >
                  Apply Adjustment
                </button>
              </div>
            )}

            {drawerMode === 'label' && (
              <div className="flex flex-col gap-4">
                <h3 className="m-0 text-sm font-bold text-[#202D2D]">Pallet / Unit Label</h3>
                <div className="border-2 border-dashed border-[#CBD5E1] rounded-xl p-4 flex flex-col gap-3 bg-white shadow-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-sm text-[#202D2D]">{selectedItem.name}</div>
                      <div className="text-[11px] text-[#64748B] mt-0.5">{selectedItem.brand} · per {selectedItem.unit}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${BRAND_STYLE[selectedItem.brand]}`}>
                      {selectedItem.brand}
                    </span>
                  </div>
                  <div className="flex flex-col items-center py-2">
                    <div className="flex gap-px h-10 items-end">
                      {selectedItem.id.split('').map((char, i) => (
                        <div key={i} className="bg-[#202D2D]" style={{ width: (parseInt(char) || 2) * 2, height: '100%' }} />
                      ))}
                    </div>
                    <span className="font-mono text-xs font-bold text-[#202D2D] mt-1">{selectedItem.id}</span>
                  </div>
                  <div className="text-[10px] text-[#64748B] border-t border-gray-100 pt-2 text-center">
                    Peliyagoda Depot · Internal Location S1-BAY4
                  </div>
                </div>
                <button
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#CBD5E1] bg-white py-2 text-xs font-semibold text-[#485563] hover:bg-[#F8FAFC] transition-colors"
                >
                  <Printer size={14} /> Print Label
                </button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
