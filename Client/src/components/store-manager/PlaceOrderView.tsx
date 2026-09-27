import React, { useState } from 'react';
import { 
  Plus, 
  Minus, 
  Trash2, 
  Calendar, 
  Clock, 
  Info, 
  User, 
  PlusCircle,
  Snowflake,
  Package,
  Store,
  CheckCircle2
} from 'lucide-react';
import { PRODUCT_CATALOG } from '../../data/mockData';

interface PlaceOrderViewProps {
  selectedOutlet?: any;
  onOrderCreated: (order: any) => void;
  setCurrentView: (view: string) => void;
  storeClosureNotice?: any;
}

export default function PlaceOrderView({ 
  selectedOutlet = {}, 
  onOrderCreated, 
  setCurrentView,
  storeClosureNotice
}: PlaceOrderViewProps) {
  const brand = selectedOutlet.brand || 'Fresh';
  const [showAddModal, setShowAddModal] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'dry' | 'chilled'>('all');

  // Default seed items for Fresh store replenishment
  const [orderItems, setOrderItems] = useState([
    { id: 'FC-03', name: 'Organic Chicken Breast (Fresh Cut)', qty: 4, unit: 'cases (5kg)', unitWeight: 5.0, unitVol: 0.008, temp: 'Chilled (+4°C)', isChilled: true },
    { id: 'FC-01', name: 'Farm Fresh Milk (1L Bottles)', qty: 8, unit: 'crates (12 btls)', unitWeight: 1.05, unitVol: 0.0015, temp: 'Chilled (+4°C)', isChilled: true },
    { id: 'FD-01', name: 'Keeri Samba Rice (10kg Bags)', qty: 3, unit: 'bags (10kg)', unitWeight: 10.0, unitVol: 0.015, temp: 'Ambient', isChilled: false }
  ]);

  // Adjust Quantity
  const handleQtyChange = (id: string, delta: number) => {
    setOrderItems((prev: any[]) => prev.map((item: any) => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  // Remove Item
  const handleRemoveItem = (id: string) => {
    if (orderItems.length <= 1) {
      alert('Your order must contain at least 1 item.');
      return;
    }
    setOrderItems((prev: any[]) => prev.filter((item: any) => item.id !== id));
  };

  // Add Item from Catalog
  const handleAddItemFromCatalog = (catalogItem: any) => {
    const existing = orderItems.find((i: any) => i.id === catalogItem.id);
    if (existing) {
      handleQtyChange(catalogItem.id, 1);
    } else {
      setOrderItems((prev: any[]) => [
        ...prev,
        {
          id: catalogItem.id,
          name: catalogItem.name,
          qty: 1,
          unit: catalogItem.unit || 'units',
          unitWeight: catalogItem.unitWeight || 5.0,
          unitVol: catalogItem.unitVol || 0.01,
          temp: catalogItem.temp === 'chilled' || catalogItem.isChilled ? 'Chilled (+4°C)' : 'Ambient',
          isChilled: catalogItem.temp === 'chilled' || !!catalogItem.isChilled
        }
      ]);
    }
    setShowAddModal(false);
  };

  // Available Fresh Catalog
  const allDryItems = PRODUCT_CATALOG.Fresh?.dry?.map((i: any) => ({ ...i, isChilled: false })) || [];
  const allChilledItems = PRODUCT_CATALOG.Fresh?.chilled?.map((i: any) => ({ ...i, isChilled: true })) || [];
  
  const getFilteredCatalog = () => {
    if (catalogFilter === 'dry') return allDryItems;
    if (catalogFilter === 'chilled') return allChilledItems;
    return [...allDryItems, ...allChilledItems];
  };

  // Live Calculations for Order Summary
  const totalVolumeCases = orderItems.reduce((acc: number, itm: any) => acc + itm.qty, 0);
  const chilledCases = orderItems.filter((i: any) => i.isChilled).reduce((acc: number, itm: any) => acc + itm.qty, 0);
  const ambientCases = orderItems.filter((i: any) => !i.isChilled).reduce((acc: number, itm: any) => acc + itm.qty, 0);
  
  // Real weight computation (approximate per crate/bag)
  const estimatedWeightKg = orderItems.reduce((acc: number, itm: any) => acc + (itm.unitWeight * itm.qty * 5), 0);

  const handlePlaceOrderSubmit = () => {
    if (orderItems.length === 0) {
      alert('Please select at least 1 item to place an order.');
      return;
    }

    const newOrder = {
      delivery_id: `RG-F-${Math.floor(3000 + Math.random() * 7000)}`,
      outlet_id: selectedOutlet.outlet_id || 'OUT001',
      brand: `Fresh`,
      brand_code: 'FR',
      order_type: chilledCases > 0 
        ? (ambientCases > 0 ? 'Brand Fresh · Chilled + Ambient' : 'Brand Fresh · Chilled Only') 
        : 'Brand Fresh · Ambient Dry',
      order_date: 'Today, 8 Jan 2026',
      requested_for: storeClosureNotice ? '10 Jan 2026' : '9 Jan 2026',
      placed_at: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Awaiting Planning',
      section: 'future',
      order_units: totalVolumeCases,
      items: orderItems.map(i => ({
        id: i.id,
        name: i.name,
        qty: i.qty,
        unit: i.unit,
        expected: i.qty,
        loaded: i.qty,
        temp: i.temp
      }))
    };

    onOrderCreated(newOrder);
  };

  return (
    <div className="figma-main">
      {/* Top Header Bar */}
      <div className="figma-header-bar">
        <div>
          <h1 className="page-title-text">Place New Order</h1>
          <p className="page-subtitle-text">
            Prepare replenishment orders for {selectedOutlet.outlet_id || 'OUT001'} · {selectedOutlet.name || 'Colpetty Retailer'}
          </p>
        </div>

        {/* Right Meta Badges */}
        <div className="meta-badges-row">
          <div className="meta-pill-box">
            <Store size={14} color="#FF6600" />
            <span>{selectedOutlet.outlet_id || 'OUT001'} · {selectedOutlet.name || 'Colpetty Retailer'}</span>
          </div>
          <div className="meta-pill-box">
            <span style={{ color: '#16A34A', fontWeight: 700 }}>RightGo Fresh</span>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <Calendar size={14} color="#485563" />
            <span style={{ fontWeight: 600, color: '#202D2D' }}>Today, 8 Jan 2026</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* LEFT COLUMN: Order Parameters & Items Table */}
        <div className="figma-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#202D2D', margin: 0 }}>Order Parameters</h2>

          {/* Simplified Store Category & Window Card */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Store size={16} color="#FF6600" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                Store Category: Fresh Groceries
              </span>
              <span style={{ background: '#DCFCE7', color: '#166534', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', textTransform: 'uppercase' }}>
                Dry & Chilled
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
              <Clock size={14} color="#16A34A" />
              <span>Delivery Window: <strong style={{ color: '#16A34A' }}>05:00 - 07:30 AM</strong></span>
            </div>
          </div>

          {/* Requested Delivery Date */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#485563', marginBottom: '6px' }}>
              Requested Delivery Date
            </label>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: storeClosureNotice ? '1.5px solid #FCD34D' : '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '10px 14px',
              background: storeClosureNotice ? '#FFFBEB' : '#FFFFFF'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, color: '#202D2D' }}>
                <Calendar size={15} color={storeClosureNotice ? '#B45309' : '#485563'} />
                <span>
                  {storeClosureNotice ? '10 Jan 2026 (Earliest Available - Store Closed on 9 Jan)' : '9 Jan 2026 (Tomorrow Morning)'}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: storeClosureNotice ? '#B45309' : '#22C55E', fontWeight: 600 }}>
                {storeClosureNotice ? 'Paused on 9 Jan' : 'Earliest Slot'}
              </span>
            </div>
          </div>

          {/* 16:00 Cutoff Pill */}
          <div style={{
            background: storeClosureNotice ? '#FFFBEB' : '#FFF4ED',
            border: storeClosureNotice ? '1px solid #FCD34D' : '1px solid #FED7AA',
            borderRadius: '6px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: storeClosureNotice ? '#92400E' : '#C2410C'
          }}>
            <Clock size={14} color={storeClosureNotice ? '#F59E0B' : '#F97316'} />
            <span>
              {storeClosureNotice 
                ? `Store closure active for ${storeClosureNotice.date} — queued for next open day.`
                : 'Orders placed before 16:00 today will arrive tomorrow morning.'}
            </span>
          </div>

          {/* Items to Replenish List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#202D2D' }}>
                Fresh Items to Replenish ({orderItems.length} items selected)
              </span>
              
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #86EFAC',
                  borderRadius: '6px',
                  color: '#16A34A',
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <PlusCircle size={15} />
                <span>+ Add Fresh Item</span>
              </button>
            </div>

            <table className="figma-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Quantity</th>
                  <th>Storage Class</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(item.id, -1)}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '4px',
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ fontWeight: 700, minWidth: '60px', textAlign: 'center' }}>
                          {item.qty} {item.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(item.id, 1)}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '4px',
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                    <td>
                      {item.isChilled ? (
                        <span style={{ background: '#E0F2FE', color: '#0284C7', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Snowflake size={11} />
                          {item.temp}
                        </span>
                      ) : (
                        <span style={{ background: '#F1F5F9', color: '#475569', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Package size={11} />
                          {item.temp}
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        title="Remove item"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Order Summary Card & Late Policy Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Order Summary Card */}
          <div className="figma-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#202D2D', margin: 0 }}>Order Summary</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Total Distinct Items</span>
                <span style={{ fontWeight: 600, color: '#202D2D' }}>{orderItems.length} items</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Total Volume</span>
                <span style={{ fontWeight: 600, color: '#202D2D' }}>{totalVolumeCases} cases / bags</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Estimated Weight</span>
                <span style={{ fontWeight: 700, color: '#202D2D' }}>~{Math.round(estimatedWeightKg)} kg</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Temperature Split</span>
                <span style={{ fontWeight: 600, color: '#202D2D', textAlign: 'right', fontSize: '12px' }}>
                  {chilledCases} Chilled, {ambientCases} Ambient
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                <span style={{ color: '#64748B' }}>Assigned Fleet Type</span>
                <span style={{ fontWeight: 700, color: chilledCases > 0 ? '#0284C7' : '#16A34A', fontSize: '12px' }}>
                  {chilledCases > 0 ? 'Reefer Van / Chilled Truck' : 'Dry-Box 6T Truck'}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-orange-primary"
              style={{ width: '100%', marginTop: '8px' }}
              onClick={handlePlaceOrderSubmit}
            >
              Place Replenishment Order
            </button>

            <p style={{ fontSize: '11px', color: '#64748B', textAlign: 'center', lineHeight: '16px', margin: 0 }}>
              By submitting, your replenishment order is transmitted directly to the Peliyagoda Central Logistics Dispatch.
            </p>
          </div>

          {/* Late Submission Policy Card */}
          <div className="figma-card" style={{ padding: '18px 20px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#202D2D', marginBottom: '6px' }}>
              <Info size={14} color="#64748B" />
              <span>Late Submission Policy</span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '18px', margin: 0 }}>
              Orders submitted after 16:00 today will be planned for the 10 Jan operating cycle. Orders are never rejected, always queued.
            </p>
          </div>
        </div>

      </div>

      {/* Product Catalog Modal for Adding New Items */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(22, 26, 29, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '580px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#202D2D', margin: 0 }}>
                  Fresh Supermarket Catalog
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                  Select dry groceries or cold-chain perishables to add to your order.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setCatalogFilter('all')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: catalogFilter === 'all' ? '1.5px solid #FF6600' : '1px solid #CBD5E1',
                  background: catalogFilter === 'all' ? '#FFF4ED' : '#FFFFFF',
                  color: catalogFilter === 'all' ? '#FF6600' : '#485563',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                All Fresh ({allDryItems.length + allChilledItems.length})
              </button>

              <button
                type="button"
                onClick={() => setCatalogFilter('dry')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: catalogFilter === 'dry' ? '1.5px solid #FF6600' : '1px solid #CBD5E1',
                  background: catalogFilter === 'dry' ? '#FFF4ED' : '#FFFFFF',
                  color: catalogFilter === 'dry' ? '#FF6600' : '#485563',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                🌾 Ambient Dry ({allDryItems.length})
              </button>

              <button
                type="button"
                onClick={() => setCatalogFilter('chilled')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: catalogFilter === 'chilled' ? '1.5px solid #FF6600' : '1px solid #CBD5E1',
                  background: catalogFilter === 'chilled' ? '#FFF4ED' : '#FFFFFF',
                  color: catalogFilter === 'chilled' ? '#FF6600' : '#485563',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                ❄️ Chilled Cold-Chain ({allChilledItems.length})
              </button>
            </div>

            {/* Catalog Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
              {getFilteredCatalog().map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => handleAddItemFromCatalog(item)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: '#F9FAFB',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#202D2D' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      Category: {item.category} • Unit: {item.unit}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.isChilled ? (
                      <span style={{ fontSize: '10px', background: '#E0F2FE', color: '#0284C7', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Snowflake size={10} /> Chilled
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Package size={10} /> Ambient
                      </span>
                    )}
                    <button
                      type="button"
                      style={{
                        background: '#FF6600',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
