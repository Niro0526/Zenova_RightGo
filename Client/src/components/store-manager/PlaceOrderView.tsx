import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  Edit3,
  X,
  ArrowLeft,
  Check,
  ShoppingBag
} from 'lucide-react';
import { PRODUCT_CATALOG } from '../../data/mockData';

interface PlaceOrderViewProps {
  selectedOutlet?: any;
  onOrderCreated: (order: any) => void;
  setCurrentView: (view: string) => void;
  storeClosureNotice?: any;
  editingOrder?: any;
  onCancelEdit?: () => void;
}

export default function PlaceOrderView({ 
  selectedOutlet = {}, 
  onOrderCreated, 
  setCurrentView,
  storeClosureNotice,
  editingOrder,
  onCancelEdit
}: PlaceOrderViewProps) {
  const brand = selectedOutlet.brand || 'Fresh';
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'dry' | 'chilled'>('all');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  // Default seed items for Fresh store replenishment or editingOrder items
  const [orderItems, setOrderItems] = useState<any[]>(editingOrder?.items || [
    { id: 'FC-03', name: 'Organic Chicken Breast (Fresh Cut)', qty: 4, unit: 'cases (5kg)', unitWeight: 5.0, unitVol: 0.008, temp: 'Chilled (+4°C)', isChilled: true },
    { id: 'FC-01', name: 'Farm Fresh Milk (1L Bottles)', qty: 8, unit: 'crates (12 btls)', unitWeight: 1.05, unitVol: 0.0015, temp: 'Chilled (+4°C)', isChilled: true },
    { id: 'FD-01', name: 'Keeri Samba Rice (10kg Bags)', qty: 3, unit: 'bags (10kg)', unitWeight: 10.0, unitVol: 0.015, temp: 'Ambient', isChilled: false }
  ]);

  useEffect(() => {
    if (editingOrder?.items) {
      setOrderItems(editingOrder.items);
    }
  }, [editingOrder]);

  // Adjust Quantity
  const handleQtyChange = (id: string, delta: number) => {
    setOrderItems((prev: any[]) => prev.map((item: any) => {
      if (item.id === id) {
        const newQty = Math.max(1, (Number(item.qty) || 1) + delta);
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
    setOrderItems((prev: any[]) => {
      const existing = prev.find((i: any) => i.id === catalogItem.id);
      if (existing) {
        return prev.map((i: any) => i.id === catalogItem.id ? { ...i, qty: (Number(i.qty) || 1) + 1 } : i);
      } else {
        const isChilled = catalogItem.temp === 'chilled' || catalogItem.isChilled === true;
        return [
          ...prev,
          {
            id: catalogItem.id,
            name: catalogItem.name,
            qty: 1,
            unit: catalogItem.unit || 'units',
            unitWeight: Number(catalogItem.unitWeight) || 5.0,
            unitVol: Number(catalogItem.unitVol) || 0.01,
            temp: isChilled ? 'Chilled (+4°C)' : 'Ambient',
            isChilled: isChilled
          }
        ];
      }
    });

    setJustAddedId(catalogItem.id);
    setTimeout(() => setJustAddedId(null), 2000);
    setShowAddModal(false);
  };

  // Available Fresh Catalog
  const allDryItems = PRODUCT_CATALOG?.Fresh?.dry?.map((i: any) => ({ ...i, isChilled: false })) || [];
  const allChilledItems = PRODUCT_CATALOG?.Fresh?.chilled?.map((i: any) => ({ ...i, isChilled: true })) || [];
  
  const getFilteredCatalog = () => {
    if (catalogFilter === 'dry') return allDryItems;
    if (catalogFilter === 'chilled') return allChilledItems;
    return [...allDryItems, ...allChilledItems];
  };

  // Live Dynamic Calculations for Order Summary
  const totalLineItems = orderItems.length;
  const totalVolumeCases = orderItems.reduce((acc: number, itm: any) => acc + (Number(itm.qty) || 1), 0);
  const chilledCases = orderItems
    .filter((i: any) => i.isChilled === true || (i.temp && i.temp.toLowerCase().includes('chilled')))
    .reduce((acc: number, itm: any) => acc + (Number(itm.qty) || 1), 0);
  const ambientCases = orderItems
    .filter((i: any) => !i.isChilled && (!i.temp || !i.temp.toLowerCase().includes('chilled')))
    .reduce((acc: number, itm: any) => acc + (Number(itm.qty) || 1), 0);
  
  const estimatedWeightKg = orderItems.reduce((acc: number, itm: any) => acc + ((Number(itm.unitWeight) || 5.0) * (Number(itm.qty) || 1)), 0);

  const handlePlaceOrderSubmit = () => {
    if (orderItems.length === 0) {
      alert('Please select at least 1 item to place an order.');
      return;
    }

    const newOrder = {
      delivery_id: editingOrder ? editingOrder.delivery_id : `RG-F-${Math.floor(3000 + Math.random() * 7000)}`,
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
        qty: Number(i.qty) || 1,
        unit: i.unit,
        expected: Number(i.qty) || 1,
        loaded: Number(i.qty) || 1,
        temp: i.temp || (i.isChilled ? 'Chilled (+4°C)' : 'Ambient')
      }))
    };

    setShowReviewModal(false);
    onOrderCreated(newOrder);
  };

  return (
    <div className="figma-main">
      {/* Top Header Bar */}
      <div className="figma-header-bar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-title-text">{editingOrder ? `Modify Order ${editingOrder.delivery_id}` : 'Place New Order'}</h1>
            {editingOrder && (
              <span style={{ fontSize: '11px', background: '#E0F2FE', color: '#0369A1', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                Editing Active Requisition
              </span>
            )}
          </div>
          <p className="page-subtitle-text">
            {editingOrder ? 'Adjust items or quantities before 16:00 cutoff locks dispatch planning' : `Prepare replenishment orders for ${selectedOutlet.outlet_id || 'OUT001'} · ${selectedOutlet.name || 'Colpetty Retailer'}`}
          </p>
        </div>

        {/* Right Action buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {editingOrder && (
            <button
              onClick={onCancelEdit || (() => setCurrentView('dashboard'))}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              Cancel Edit
            </button>
          )}

          <button
            onClick={() => setCurrentView('dashboard')}
            className="back-link-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', fontWeight: 600, fontSize: '13px', padding: '8px 14px', borderRadius: '8px' }}
          >
            <ArrowLeft size={15} />
            <span>Back to My Orders</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: '24px', alignItems: 'flex-start', marginTop: '16px' }}>
        
        {/* LEFT COLUMN: Order Line Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="figma-card" style={{ padding: '20px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                  Order Requisition Items ({orderItems.length})
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                  Select items and adjust quantities for warehouse pick & staging
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                style={{
                  background: '#FFF7ED',
                  border: '1px solid #FFD8A8',
                  borderRadius: '6px',
                  padding: '7px 12px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#C2410C',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={14} />
                <span>+ Add Item from Catalog</span>
              </button>
            </div>

            {/* Line Items Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {orderItems.map((item: any) => {
                const isItemChilled = item.isChilled === true || (item.temp && item.temp.toLowerCase().includes('chilled'));
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px',
                      borderRadius: '10px',
                      border: justAddedId === item.id ? '1.5px solid #FF6600' : '1px solid #F1F5F9',
                      background: justAddedId === item.id ? '#FFF7ED' : '#F8FAFC',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: isItemChilled ? '#E0F2FE' : '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {isItemChilled ? (
                          <Snowflake size={18} color="#0284C7" />
                        ) : (
                          <Package size={18} color="#475569" />
                        )}
                      </div>

                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#1E293B' }}>{item.name}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                          Unit: {item.unit} · {item.temp || (isItemChilled ? 'Chilled (+4°C)' : 'Ambient')}
                        </div>
                      </div>
                    </div>

                    {/* Quantity Stepper & Remove */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        overflow: 'hidden'
                      }}>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(item.id, -1)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            color: '#475569'
                          }}
                        >
                          <Minus size={14} />
                        </button>

                        <span style={{ padding: '0 8px', fontWeight: 700, fontSize: '13px', color: '#1E293B', minWidth: '24px', textAlign: 'center' }}>
                          {item.qty}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleQtyChange(item.id, 1)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            color: '#475569'
                          }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        title="Remove item"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F0F9FF', padding: '10px 14px', borderRadius: '8px', marginTop: '16px', fontSize: '12px', color: '#0369A1' }}>
              <Info size={16} color="#0284C7" />
              <span>Orders placed before 16:00 cutoff will be scheduled on tomorrow's primary morning fleet run.</span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Real-Time Dynamic Requisition Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Order Summary Card */}
          <div className="figma-card" style={{ padding: '20px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', marginBottom: '14px' }}>
              Requisition Summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Total Line Items</span>
                <strong style={{ color: '#1E293B', background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>
                  {totalLineItems} SKUs
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Total Order Units</span>
                <strong style={{ color: '#1E293B', background: '#FFF7ED', color: '#C2410C', padding: '2px 8px', borderRadius: '4px' }}>
                  {totalVolumeCases} units/cases
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Temperature Split</span>
                <span style={{ color: '#334155', fontWeight: 600, fontSize: '12.5px' }}>
                  <strong style={{ color: '#0284C7' }}>{chilledCases} Chilled</strong> / <strong style={{ color: '#64748B' }}>{ambientCases} Ambient</strong>
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Target Delivery</span>
                <strong style={{ color: '#FF6600' }}>Tomorrow Morning (Wave 1)</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                <span style={{ color: '#64748B' }}>Assigned Fleet Type</span>
                <strong style={{ color: chilledCases > 0 ? '#0284C7' : '#16A34A', fontSize: '12.5px' }}>
                  {chilledCases > 0 ? 'Reefer Van + Dry Box' : 'Dry-Box 6T Truck'}
                </strong>
              </div>
            </div>

            {/* Review & Submit Button */}
            <button
              type="button"
              className="btn-orange-primary"
              style={{ width: '100%', marginTop: '16px', padding: '12px', fontSize: '13.5px', fontWeight: 600 }}
              onClick={() => setShowReviewModal(true)}
            >
              {editingOrder ? 'Review & Save Changes' : 'Review & Place Order'}
            </button>

            <p style={{ fontSize: '11px', color: '#64748B', textAlign: 'center', lineHeight: '16px', margin: '8px 0 0' }}>
              You will have a chance to review all items before final submission.
            </p>
          </div>

          {/* Late Submission Policy */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px', fontSize: '12px', color: '#64748B', lineHeight: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
              <Clock size={14} color="#FF6600" />
              <span>16:00 Daily Planning Cutoff</span>
            </div>
            Orders submitted after 16:00 today will be rolled over to the following operating run.
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Pre-Submission Order Review Modal */}
      {/* ========================================================================= */}
      {showReviewModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '540px',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            <div style={{ background: '#F8FAFC', padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E293B', fontWeight: 700, fontSize: '15px' }}>
                <CheckCircle2 size={18} color="#FF6600" />
                <span>Review Order Requisition</span>
              </div>
              <button onClick={() => setShowReviewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
                Please review your selected items and quantities before submitting to Peliyagoda depot:
              </p>

              {/* Items Manifest in Review */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto', border: '1px solid #F1F5F9', borderRadius: '8px', padding: '10px' }}>
                {orderItems.map((item: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#F8FAFC', borderRadius: '6px', fontSize: '12.5px' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1E293B' }}>{item.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{item.temp || (item.isChilled ? 'Chilled' : 'Ambient')}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#FF6600' }}>
                      {item.qty} {item.unit}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#FFF7ED', padding: '10px 14px', borderRadius: '8px', fontSize: '12.5px', color: '#C2410C', fontWeight: 600 }}>
                <span>Total: {orderItems.length} SKUs</span>
                <span>{totalVolumeCases} units ({chilledCases} Chilled / {ambientCases} Ambient)</span>
              </div>

              {/* Review Modal Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#334155',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Edit3 size={14} />
                  <span>Adjust Quantities</span>
                </button>

                <button
                  type="button"
                  onClick={handlePlaceOrderSubmit}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#FF6600',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Check size={15} />
                  <span>{editingOrder ? 'Save & Submit' : 'Confirm & Place Order'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Product Catalog Modal */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(22, 26, 29, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
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
