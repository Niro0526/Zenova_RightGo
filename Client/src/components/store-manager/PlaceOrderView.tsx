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
  ShoppingBag,
  Search,
  Filter,
  AlertTriangle,
  Layers,
  Truck,
  CheckCircle,
  ShieldAlert,
  LayoutGrid,
  List
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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showMobileCartDrawer, setShowMobileCartDrawer] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  // Default seed items for Fresh store replenishment or editingOrder items
  const [orderItems, setOrderItems] = useState<any[]>(editingOrder?.items || [
    { id: 'FC-03', name: 'Organic Chicken Breast (Fresh Cut)', qty: 4, unit: 'cases (5kg)', unitWeight: 5.0, unitVol: 0.008, temp: 'Chilled (+4°C)', isChilled: true, sku: 'SKU-FR-PL-103', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=300&auto=format&fit=crop&q=80' },
    { id: 'FC-01', name: 'Farm Fresh Pasteurised Milk (1L Bottles)', qty: 8, unit: 'crates (12 btls)', unitWeight: 1.05, unitVol: 0.0015, temp: 'Chilled (+4°C)', isChilled: true, sku: 'SKU-FR-ML-101', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&auto=format&fit=crop&q=80' },
    { id: 'FD-01', name: 'Keeri Samba Rice (10kg Bags)', qty: 3, unit: 'bags (10kg)', unitWeight: 10.0, unitVol: 0.015, temp: 'Ambient', isChilled: false, sku: 'SKU-FR-GR-001', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&auto=format&fit=crop&q=80' }
  ]);

  useEffect(() => {
    if (editingOrder?.items) {
      setOrderItems(editingOrder.items);
    }
  }, [editingOrder]);

  // Build Master Fresh Catalog
  const allDryItems = PRODUCT_CATALOG?.Fresh?.dry?.map((i: any) => ({ ...i, isChilled: false, tempDisplay: 'Ambient Dry' })) || [];
  const allChilledItems = PRODUCT_CATALOG?.Fresh?.chilled?.map((i: any) => ({ ...i, isChilled: true, tempDisplay: 'Chilled (+4°C)' })) || [];
  const masterCatalog = [...allDryItems, ...allChilledItems];

  // Filter Catalog
  const filteredCatalog = masterCatalog.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    
    let matchesCategory = true;
    if (activeCategory === 'chilled') {
      matchesCategory = item.isChilled === true;
    } else if (activeCategory === 'ambient') {
      matchesCategory = !item.isChilled;
    } else if (activeCategory === 'dairy') {
      matchesCategory = item.category.toLowerCase().includes('dairy');
    } else if (activeCategory === 'poultry') {
      matchesCategory = item.category.toLowerCase().includes('poultry') || item.category.toLowerCase().includes('meat');
    } else if (activeCategory === 'grains') {
      matchesCategory = item.category.toLowerCase().includes('grain') || item.category.toLowerCase().includes('pantry') || item.category.toLowerCase().includes('cooking');
    } else if (activeCategory === 'beverages') {
      matchesCategory = item.category.toLowerCase().includes('beverage') || item.category.toLowerCase().includes('spice');
    }

    let matchesStock = true;
    if (inStockOnly) {
      matchesStock = item.stockStatus !== 'out_of_stock';
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

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
      alert('Your requisition must contain at least 1 item.');
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
            sku: catalogItem.sku || `SKU-${catalogItem.id}`,
            name: catalogItem.name,
            qty: 1,
            unit: catalogItem.unit || 'units',
            unitWeight: Number(catalogItem.unitWeight) || 5.0,
            unitVol: Number(catalogItem.unitVol) || 0.01,
            temp: isChilled ? 'Chilled (+4°C)' : 'Ambient',
            isChilled: isChilled,
            image: catalogItem.image
          }
        ];
      }
    });

    setJustAddedId(catalogItem.id);
    setTimeout(() => setJustAddedId(null), 1800);
  };

  // Live Calculations for Requisition Passport
  const totalLineItems = orderItems.length;
  const totalUnits = orderItems.reduce((acc: number, itm: any) => acc + (Number(itm.qty) || 1), 0);
  const chilledUnits = orderItems
    .filter((i: any) => i.isChilled === true || (i.temp && i.temp.toLowerCase().includes('chilled')))
    .reduce((acc: number, itm: any) => acc + (Number(itm.qty) || 1), 0);
  const ambientUnits = orderItems
    .filter((i: any) => !i.isChilled && (!i.temp || !i.temp.toLowerCase().includes('chilled')))
    .reduce((acc: number, itm: any) => acc + (Number(itm.qty) || 1), 0);
  
  const estimatedWeightKg = orderItems.reduce((acc: number, itm: any) => acc + ((Number(itm.unitWeight) || 5.0) * (Number(itm.qty) || 1)), 0);
  const estimatedVolumeCbm = orderItems.reduce((acc: number, itm: any) => acc + ((Number(itm.unitVol) || 0.01) * (Number(itm.qty) || 1)), 0);

  const handlePlaceOrderSubmit = () => {
    if (orderItems.length === 0) {
      alert('Please select at least 1 item to place a requisition.');
      return;
    }

    const newOrder = {
      delivery_id: editingOrder ? editingOrder.delivery_id : `RG-F-${Math.floor(3000 + Math.random() * 7000)}`,
      outlet_id: selectedOutlet.outlet_id || 'OUT001',
      brand: `Fresh`,
      brand_code: 'FR',
      order_type: chilledUnits > 0 
        ? (ambientUnits > 0 ? 'Brand Fresh · Chilled + Ambient' : 'Brand Fresh · Chilled Only') 
        : 'Brand Fresh · Ambient Dry',
      order_date: 'Today, 8 Jan 2026',
      requested_for: storeClosureNotice ? '10 Jan 2026' : '9 Jan 2026',
      placed_at: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Awaiting Planning',
      section: 'future',
      order_units: totalUnits,
      weight_kg: Number(estimatedWeightKg.toFixed(1)),
      volume_cbm: Number(estimatedVolumeCbm.toFixed(3)),
      items: orderItems.map((i: any) => ({
        id: i.id,
        sku: i.sku,
        name: i.name,
        qty: Number(i.qty) || 1,
        unit: i.unit,
        expected: Number(i.qty) || 1,
        loaded: Number(i.qty) || 1,
        temp: i.temp || (i.isChilled ? 'Chilled (+4°C)' : 'Ambient'),
        image: i.image
      }))
    };

    onOrderCreated(newOrder);
  };

  return (
    <div className="figma-main">
      {/* Top Header Bar */}
      <div className="figma-header-bar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <button
              onClick={() => setCurrentView('dashboard')}
              className="back-link-btn"
              style={{ margin: 0 }}
            >
              <ArrowLeft size={16} />
              <span>Back to Orders</span>
            </button>
            {editingOrder && (
              <span style={{
                background: '#FEF3C7',
                color: '#D97706',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                Editing #{editingOrder.delivery_id}
              </span>
            )}
          </div>
          <h1 className="page-title-text">
            {editingOrder ? `Modify Requisition #${editingOrder.delivery_id}` : 'Place Daily Store Requisition'}
          </h1>
          <p className="page-subtitle-text">
            Peliyagoda Central Depot Fulfillment Catalog • Target Delivery: <strong>{storeClosureNotice ? '10 Jan 2026' : '9 Jan 2026'}</strong>
          </p>
        </div>

        {/* 16:00 Cutoff Banner Pill */}
        <div className="meta-badges-row">
          <div style={{
            background: '#FFF7ED',
            border: '1px solid #FFEDD5',
            borderRadius: '8px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#C2410C',
            fontWeight: 600
          }}>
            <Clock size={15} color="#EA580C" />
            <span>Daily Cutoff: <strong>16:00 Today</strong> (Auto Route Batching)</span>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Toolbar */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
      }}>
        {/* Top Row: Search Input + In Stock Toggle */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search Peliyagoda inventory by product name, category, or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontFamily: 'Poppins, sans-serif',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* In Stock Only Checkbox */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12.5px',
            color: '#475569',
            fontWeight: 500,
            cursor: 'pointer',
            userSelect: 'none',
            background: inStockOnly ? '#F0FDF4' : '#F8FAFC',
            border: inStockOnly ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
            padding: '8px 14px',
            borderRadius: '8px'
          }}>
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              style={{ accentColor: '#16A34A', cursor: 'pointer' }}
            />
            <span>In Stock Only ({masterCatalog.filter(i => i.stockStatus !== 'out_of_stock').length})</span>
          </label>
        </div>

        {/* Category Filter Pills (Daraz / Amazon Fresh Category Tabs) */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'all', label: '🌟 All Fresh Items', count: masterCatalog.length },
            { id: 'chilled', label: '❄️ Chilled Perishables (+4°C)', count: allChilledItems.length },
            { id: 'ambient', label: '📦 Ambient Dry Goods', count: allDryItems.length },
            { id: 'dairy', label: '🥛 Chilled Dairy', count: masterCatalog.filter(i => i.category.toLowerCase().includes('dairy')).length },
            { id: 'poultry', label: '🍗 Poultry & Meats', count: masterCatalog.filter(i => i.category.toLowerCase().includes('poultry')).length },
            { id: 'grains', label: '🌾 Grains & Pantry Staples', count: masterCatalog.filter(i => i.category.toLowerCase().includes('grain') || i.category.toLowerCase().includes('pantry')).length },
            { id: 'beverages', label: '☕ Beverages & Spices', count: masterCatalog.filter(i => i.category.toLowerCase().includes('beverage') || i.category.toLowerCase().includes('spice')).length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              style={{
                background: activeCategory === tab.id ? '#FF6600' : '#F8FAFC',
                color: activeCategory === tab.id ? '#FFFFFF' : '#475569',
                border: activeCategory === tab.id ? '1px solid #FF6600' : '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: activeCategory === tab.id ? 600 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label} <span style={{ opacity: activeCategory === tab.id ? 0.9 : 0.6, fontSize: '11px' }}>({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Content Layout: Left = Product Catalog Grid, Right = Requisition Basket */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        gap: '24px',
        alignItems: 'flex-start'
      }}>
        {/* LEFT: Product Catalog Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Catalog Top Header Bar with Count and View Switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1E293B' }}>
                Peliyagoda Master Catalog ({filteredCatalog.length} products available)
              </span>
              <span style={{ fontSize: '11.5px', color: '#64748B', marginLeft: '8px' }}>
                Verified Hub 01 Inventory
              </span>
            </div>

            {/* View Mode Toggle Switch */}
            <div style={{
              display: 'flex',
              background: '#F1F5F9',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0'
            }}>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: viewMode === 'grid' ? 700 : 500,
                  background: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'grid' ? '#FF6600' : '#64748B',
                  boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <LayoutGrid size={13} />
                <span>Compact Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: viewMode === 'table' ? 700 : 500,
                  background: viewMode === 'table' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'table' ? '#FF6600' : '#64748B',
                  boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <List size={13} />
                <span>Wholesale Table</span>
              </button>
            </div>
          </div>

          {filteredCatalog.length === 0 ? (
            <div style={{
              background: '#FFFFFF',
              border: '1px dashed #CBD5E1',
              borderRadius: '10px',
              padding: '40px 20px',
              textAlign: 'center',
              color: '#64748B'
            }}>
              <Package size={32} color="#94A3B8" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>No products match your filter</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Try adjusting your search keywords or switching category filters.</div>
            </div>
          ) : viewMode === 'grid' ? (
            /* COMPACT GRID VIEW (High density, smaller images, 4 cards per row) */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))',
              gap: '12px'
            }}>
              {filteredCatalog.map((item: any) => {
                const inBasket = orderItems.find((i: any) => i.id === item.id);
                const isOutOfStock = item.stockStatus === 'out_of_stock';
                const isLowStock = item.stockStatus === 'low_stock';

                return (
                  <div
                    key={item.id}
                    style={{
                      background: '#FFFFFF',
                      border: inBasket ? '1.5px solid #FF6600' : '1px solid #E2E8F0',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: inBasket ? '0 3px 10px rgba(255, 102, 0, 0.09)' : '0 1px 3px rgba(0, 0, 0, 0.02)',
                      transition: 'all 0.15s ease',
                      opacity: isOutOfStock ? 0.65 : 1
                    }}
                  >
                    {/* Compact Image Banner */}
                    <div 
                      style={{ 
                        position: 'relative', 
                        height: '105px', 
                        width: '100%', 
                        background: '#0F172A', 
                        overflow: 'hidden' 
                      }}
                    >
                      <img
                        src={item.image || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80'}
                        alt={item.name}
                        loading="lazy"
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          transition: 'transform 0.3s ease',
                          display: 'block'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.06)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
                      />

                      {/* Temperature Badge */}
                      <span style={{
                        position: 'absolute',
                        top: '6px',
                        left: '6px',
                        background: item.isChilled ? 'rgba(2, 132, 199, 0.95)' : 'rgba(30, 41, 59, 0.9)',
                        color: '#FFFFFF',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '9999px',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                      }}>
                        {item.isChilled ? <Snowflake size={10} /> : <Package size={10} />}
                        <span>{item.isChilled ? 'Chilled +4°C' : 'Ambient'}</span>
                      </span>

                      {/* Stock Badge */}
                      <span style={{
                        position: 'absolute',
                        bottom: '6px',
                        right: '6px',
                        background: isOutOfStock ? '#EF4444' : isLowStock ? '#F59E0B' : '#10B981',
                        color: '#FFFFFF',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
                      }}>
                        {isOutOfStock ? 'Out of Stock' : isLowStock ? `Low (${item.stockQty})` : `In Stock (${item.stockQty})`}
                      </span>
                    </div>

                    {/* Compact Product Details */}
                    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                          {item.category} • {item.sku}
                        </div>
                        <h4 style={{ 
                          fontSize: '12.5px', 
                          fontWeight: 700, 
                          color: '#1E293B', 
                          margin: '3px 0 4px', 
                          lineHeight: '16px',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }} title={item.name}>
                          {item.name}
                        </h4>

                        {/* Unit & Specs */}
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          <span style={{ background: '#F1F5F9', color: '#475569', fontSize: '10.5px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px' }}>
                            {item.unit}
                          </span>
                          <span style={{ background: '#F8FAFC', color: '#64748B', fontSize: '10.5px', fontWeight: 500, padding: '1px 6px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                            {item.unitWeight} kg/ea
                          </span>
                        </div>
                      </div>

                      {/* Action: Add / Stepper */}
                      <div>
                        {isOutOfStock ? (
                          <button
                            type="button"
                            disabled
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              background: '#F1F5F9',
                              border: '1px solid #E2E8F0',
                              borderRadius: '6px',
                              color: '#94A3B8',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'not-allowed',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <AlertTriangle size={12} />
                            <span>Out of Stock</span>
                          </button>
                        ) : inBasket ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#FFF4ED',
                            border: '1.5px solid #FF6600',
                            borderRadius: '6px',
                            padding: '3px 6px'
                          }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (inBasket.qty === 1) {
                                  handleRemoveItem(item.id);
                                } else {
                                  handleQtyChange(item.id, -1);
                                }
                              }}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                border: '1px solid #FED7AA',
                                background: '#FFFFFF',
                                color: '#EA580C',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '14px'
                              }}
                            >
                              -
                            </button>

                            <div style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#EA580C' }}>
                                {inBasket.qty} {inBasket.unit.split(' ')[0]}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.id, 1)}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                border: '1px solid #FED7AA',
                                background: '#FFFFFF',
                                color: '#EA580C',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '14px'
                              }}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddItemFromCatalog(item)}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              background: '#FFFFFF',
                              border: '1.5px solid #FF6600',
                              borderRadius: '6px',
                              color: '#FF6600',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#FF6600';
                              e.currentTarget.style.color = '#FFFFFF';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#FFFFFF';
                              e.currentTarget.style.color = '#FF6600';
                            }}
                          >
                            <Plus size={13} />
                            <span>Add to Order</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* WHOLESALE TABLE VIEW (Dense, High-Speed Wholesale B2B Row Ordering) */
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                    <th style={{ padding: '10px 14px', width: '56px' }}>Item</th>
                    <th style={{ padding: '10px 12px' }}>Product Description</th>
                    <th style={{ padding: '10px 12px' }}>Temp</th>
                    <th style={{ padding: '10px 12px' }}>Pkg & Wt</th>
                    <th style={{ padding: '10px 12px' }}>Stock</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', width: '130px' }}>Requisition Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCatalog.map((item: any, idx: number) => {
                    const inBasket = orderItems.find((i: any) => i.id === item.id);
                    const isOutOfStock = item.stockStatus === 'out_of_stock';
                    const isLowStock = item.stockStatus === 'low_stock';

                    return (
                      <tr 
                        key={item.id}
                        style={{ 
                          borderBottom: idx < filteredCatalog.length - 1 ? '1px solid #F1F5F9' : 'none',
                          background: inBasket ? '#FFFDF9' : 'transparent',
                          transition: 'background 0.1s ease'
                        }}
                      >
                        {/* Thumbnail */}
                        <td style={{ padding: '8px 14px' }}>
                          <img
                            src={item.image || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=100&auto=format&fit=crop&q=80'}
                            alt={item.name}
                            loading="lazy"
                            style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'cover', display: 'block', border: '1px solid #E2E8F0' }}
                          />
                        </td>

                        {/* Title & SKU */}
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '12.5px' }}>{item.name}</div>
                          <div style={{ fontSize: '10.5px', color: '#64748B' }}>{item.sku} • {item.category}</div>
                        </td>

                        {/* Temp Badge */}
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 7px',
                            borderRadius: '9999px',
                            fontSize: '10px',
                            fontWeight: 700,
                            background: item.isChilled ? '#E0F2FE' : '#F1F5F9',
                            color: item.isChilled ? '#0369A1' : '#475569'
                          }}>
                            {item.isChilled ? <Snowflake size={10} /> : <Package size={10} />}
                            {item.isChilled ? 'Chilled' : 'Ambient'}
                          </span>
                        </td>

                        {/* Pkg & Wt */}
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ fontWeight: 600, color: '#334155' }}>{item.unit}</div>
                          <div style={{ fontSize: '10.5px', color: '#64748B' }}>{item.unitWeight} kg/ea</div>
                        </td>

                        {/* Stock */}
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            background: isOutOfStock ? '#FEE2E2' : isLowStock ? '#FEF3C7' : '#D1FAE5',
                            color: isOutOfStock ? '#991B1B' : isLowStock ? '#92400E' : '#065F46'
                          }}>
                            {isOutOfStock ? '0 (Out of stock)' : `${item.stockQty} available`}
                          </span>
                        </td>

                        {/* Order Stepper / Button */}
                        <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                          {isOutOfStock ? (
                            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Unavailable</span>
                          ) : inBasket ? (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              background: '#FFF4ED',
                              border: '1.5px solid #FF6600',
                              borderRadius: '6px',
                              padding: '2px 6px',
                              gap: '6px'
                            }}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (inBasket.qty === 1) {
                                    handleRemoveItem(item.id);
                                  } else {
                                    handleQtyChange(item.id, -1);
                                  }
                                }}
                                style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '4px',
                                  border: '1px solid #FED7AA',
                                  background: '#FFFFFF',
                                  color: '#EA580C',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                -
                              </button>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#EA580C', minWidth: '20px', textAlign: 'center' }}>
                                {inBasket.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQtyChange(item.id, 1)}
                                style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '4px',
                                  border: '1px solid #FED7AA',
                                  background: '#FFFFFF',
                                  color: '#EA580C',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddItemFromCatalog(item)}
                              style={{
                                padding: '5px 12px',
                                background: '#FFFFFF',
                                border: '1.5px solid #FF6600',
                                borderRadius: '6px',
                                color: '#FF6600',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#FF6600';
                                e.currentTarget.style.color = '#FFFFFF';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#FFFFFF';
                                e.currentTarget.style.color = '#FF6600';
                              }}
                            >
                              <Plus size={13} />
                              <span>Add</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT: Requisition Basket & Capacity Passport */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '20px',
          position: 'sticky',
          top: '80px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
        }}>
          {/* Basket Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingBag size={18} color="#FF6600" />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Store Requisition
              </h3>
            </div>
            <span style={{
              background: '#FFF4ED',
              color: '#FF6600',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px'
            }}>
              {totalLineItems} Items ({totalUnits} units)
            </span>
          </div>

          {/* Added Line Items List */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxHeight: '260px',
            overflowY: 'auto',
            paddingRight: '4px'
          }}>
            {orderItems.map((item: any) => (
              <div
                key={item.id}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span style={{
                      fontSize: '10.5px',
                      color: item.isChilled ? '#0284C7' : '#64748B',
                      fontWeight: 600
                    }}>
                      {item.isChilled ? '❄️ Chilled' : '📦 Ambient'}
                    </span>
                    <span style={{ color: '#CBD5E1' }}>•</span>
                    <span style={{ fontSize: '10.5px', color: '#64748B' }}>
                      {((Number(item.unitWeight) || 5.0) * (Number(item.qty) || 1)).toFixed(1)} kg
                    </span>
                  </div>
                </div>

                {/* Stepper + Delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleQtyChange(item.id, -1)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQtyChange(item.id, 1)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: '2px',
                      marginLeft: '2px'
                    }}
                    title="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Live Capacity Passport Box */}
          <div style={{
            background: '#F0F9FF',
            border: '1px solid #BAE6FD',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#0369A1', fontWeight: 600 }}>Total Requisition Weight:</span>
              <span style={{ color: '#0C4A6E', fontWeight: 700, fontSize: '13px' }}>{estimatedWeightKg.toFixed(1)} kg</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#0369A1', fontWeight: 600 }}>Estimated Volume:</span>
              <span style={{ color: '#0C4A6E', fontWeight: 700 }}>{estimatedVolumeCbm.toFixed(3)} m³</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#0369A1', fontWeight: 600 }}>Compartment Needs:</span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: chilledUnits > 0 ? '#0284C7' : '#475569'
              }}>
                {chilledUnits > 0 ? `❄️ Reefer (${chilledUnits} units) + 📦 Dry` : '📦 Dry-Box Only'}
              </span>
            </div>
          </div>

          {/* Action: Review & Submit */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              className="btn-orange-primary"
              style={{ width: '100%', padding: '12px' }}
              onClick={() => setShowReviewModal(true)}
            >
              <span>Review & Lock Requisition →</span>
            </button>
            <div style={{ fontSize: '11px', color: '#64748B', textAlign: 'center', lineHeight: '14px' }}>
              Locked requisitions can be edited before 16:00 cutoff.
            </div>
          </div>
        </div>
      </div>

      {/* Pre-Submission Order Review Modal */}
      {showReviewModal && (
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
            maxWidth: '540px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={20} color="#FF6600" />
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                  Confirm Daily Requisition
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: '#64748B', marginBottom: '16px' }}>
              Please review your replenishment batch before locking into the <strong>Peliyagoda Central Depot</strong> dispatch queue.
            </p>

            {/* Manifest Review Table */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '12px',
              maxHeight: '220px',
              overflowY: 'auto',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {orderItems.map((item: any) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: '#1E293B' }}>{item.name}</span>
                    <span style={{ color: '#94A3B8', marginLeft: '6px' }}>({item.temp || 'Ambient'})</span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{item.qty} {item.unit}</span>
                </div>
              ))}
            </div>

            {/* Total Load Summary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              background: '#FFF4ED',
              border: '1px solid #FED7AA',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '18px',
              fontSize: '12px'
            }}>
              <div>
                <span style={{ color: '#9A3412', display: 'block', fontSize: '11px' }}>Total Line Items</span>
                <strong style={{ color: '#7C2D12' }}>{totalLineItems} Items ({totalUnits} total units)</strong>
              </div>
              <div>
                <span style={{ color: '#9A3412', display: 'block', fontSize: '11px' }}>Total Payload Weight</span>
                <strong style={{ color: '#7C2D12' }}>{estimatedWeightKg.toFixed(1)} kg ({estimatedVolumeCbm.toFixed(3)} m³)</strong>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: '13px',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Back to Edit
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowReviewModal(false);
                  handlePlaceOrderSubmit();
                }}
                className="btn-orange-primary"
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                ✓ Lock Requisition into Cutoff Queue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
