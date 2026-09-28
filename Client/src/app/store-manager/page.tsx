'use client';

import React, { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import TopNavbar from '../../components/layout/TopNavbar';
import DashboardView from '../../components/store-manager/DashboardView';
import PlaceOrderView from '../../components/store-manager/PlaceOrderView';
import OrderDetailView from '../../components/store-manager/OrderDetailView';
import ConfirmReceiptView from '../../components/store-manager/ConfirmReceiptView';
import DegradationView from '../../components/store-manager/DegradationView';
import OrderConfirmationModal from '../../components/store-manager/OrderConfirmationModal';
import { MOCK_OUTLETS } from '../../data/mockData';

export default function StoreManagerPage() {
  const [selectedOutlet, setSelectedOutlet] = useState(MOCK_OUTLETS[0]);

  // Master Interactive State for All Store Orders
  const [orders, setOrders] = useState<any[]>([
    {
      delivery_id: 'S1-000',
      brand: 'Fresh',
      brand_code: 'FR',
      order_type: 'Brand Fresh · Ambient',
      order_date: 'Today, 8 Jan 2026',
      status: 'Out for Delivery',
      expected_arrival: 'Today, 05:00-07:30',
      section: 'active',
      vehicle_id: 'VEH014 (Dry-Box 6T)',
      driver_name: 'Sunil Jayawardena',
      items: [
        { name: 'Keeri Samba Rice (10kg Bags)', qty: 20, unit: 'bags', expected: 20, loaded: 20 },
        { name: 'Pure Ceylon Tea Pack (500g)', qty: 50, unit: 'boxes', expected: 50, loaded: 50 },
        { name: 'Refined White Sugar (1kg)', qty: 40, unit: 'packs', expected: 40, loaded: 40 }
      ]
    },
    {
      delivery_id: 'S1-001',
      brand: 'Fresh',
      brand_code: 'FR',
      order_type: 'Brand Fresh · Chilled',
      order_date: 'Today, 8 Jan 2026',
      status: 'Out for Delivery',
      expected_arrival: 'Today, 05:00-07:30',
      section: 'active',
      vehicle_id: 'VEH003 (Reefer Van)',
      driver_name: 'Chaminda Vithanage',
      items: [
        { id: 'item-1', name: 'Organic Chicken Breast (Fresh Cut)', qty: 4, unit: 'cases (5kg)', expected: 4, loaded: 4, temp: 'Chilled (+4°C)' },
        { id: 'item-2', name: 'Farm Fresh Milk (1L Bottles)', qty: 8, unit: 'crates (12 btls)', expected: 8, loaded: 8, temp: 'Chilled (+4°C)' },
        { id: 'item-3', name: 'Keeri Samba Rice (10kg Bags)', qty: 3, unit: 'bags (10kg)', expected: 3, loaded: 3, temp: 'Ambient' }
      ]
    },
    {
      delivery_id: 'RG-F-3201',
      brand: 'Fresh',
      brand_code: 'FR',
      order_type: 'Brand Fresh',
      order_date: '8 Jan 2026',
      status: 'Awaiting Planning',
      planned_dispatch: '9 Jan',
      section: 'future',
      items: [
        { name: 'Keeri Samba Rice (10kg Bags)', qty: 15, unit: 'bags' },
        { name: 'Coconut Milk Powder (1kg)', qty: 30, unit: 'packs' }
      ]
    },
    {
      delivery_id: 'RG-F-3180',
      brand: 'Fresh',
      brand_code: 'FR',
      order_type: 'Brand Fresh',
      order_date: '7 Jan 2026',
      status: 'Deferred',
      degradation_level: 'Critical (Tier 3)',
      reason: 'Fleet dry-dock emergency: 2x 10T trucks grounded at Peliyagoda. Prioritised perishables.',
      section: 'degraded',
      items: [
        { name: 'Keeri Samba Rice (10kg Bags)', qty: 10, unit: 'bags' }
      ]
    },
    {
      delivery_id: 'RG-S-8821',
      brand: 'Style',
      brand_code: 'ST',
      order_type: 'Brand Style',
      order_date: '6 Jan 2026',
      status: 'Delivered',
      delivery_time: '7 Jan, 08:45',
      section: 'past',
      items: [
        { name: 'Linen Shirts (Box of 20)', qty: 5, unit: 'boxes' },
        { name: 'Cotton Trousers (Box of 15)', qty: 4, unit: 'boxes' }
      ]
    },
    {
      delivery_id: 'RG-L-1104',
      brand: 'Living',
      brand_code: 'LV',
      order_type: 'Brand Living',
      order_date: '5 Jan 2026',
      status: 'Delivered',
      delivery_time: '6 Jan, 14:20',
      section: 'past',
      items: [
        { name: 'Ceramic Dinner Plates (Set of 6)', qty: 10, unit: 'sets' },
        { name: 'Glass Tumbler Sets (6pk)', qty: 15, unit: 'sets' }
      ]
    }
  ]);

  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [justConfirmedOrder, setJustConfirmedOrder] = useState<any>(null);
  const [storeClosureNotice, setStoreClosureNotice] = useState<any>(null);

  const handleOrderCreated = (newOrder: any) => {
    setOrders(prev => [newOrder, ...prev]);
    setJustConfirmedOrder(newOrder);
    setCurrentView('order-confirmation');
  };

  const handleReceiptConfirmed = (deliveryId: string, receiptData: any) => {
    setOrders(prev => prev.map(ord => {
      if (ord.delivery_id === deliveryId) {
        return {
          ...ord,
          status: 'Delivered',
          section: 'past',
          delivery_time: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          receipt_details: receiptData
        };
      }
      return ord;
    }));
    alert('✓ Electronic Proof of Delivery (e-POD) signed and submitted to Central Depot dispatcher!');
    setCurrentView('dashboard');
  };

  const handleAcknowledgeDeferral = (deliveryId: string) => {
    setOrders(prev => prev.map(ord => {
      if (ord.delivery_id === deliveryId) {
        return {
          ...ord,
          degradation_level: 'Acknowledged',
          status: 'Rescheduled (Jan 10)'
        };
      }
      return ord;
    }));
    alert('✓ Deferral acknowledged! Store inventory priority flag logged with Central Logistics Dispatch.');
    setCurrentView('dashboard');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            selectedOutlet={selectedOutlet}
            orders={orders}
            setCurrentView={setCurrentView}
            setSelectedOrder={setSelectedOrder}
            storeClosureNotice={storeClosureNotice}
            onSetStoreClosureNotice={(notice: any) => {
              setStoreClosureNotice(notice);
              alert('✓ Central Dispatcher notified! Store ' + selectedOutlet.outlet_id + ' flagged as UNAVAILABLE for ' + notice.date + '. Fleet routing paused.');
            }}
            onCancelStoreClosureNotice={() => {
              setStoreClosureNotice(null);
              alert('✓ Store closure cancelled. Regular delivery schedule restored.');
            }}
          />
        );
      case 'place-order':
        return (
          <PlaceOrderView
            selectedOutlet={selectedOutlet}
            onOrderCreated={handleOrderCreated}
            setCurrentView={setCurrentView}
            storeClosureNotice={storeClosureNotice}
          />
        );
      case 'order-confirmation':
        return (
          <OrderConfirmationModal
            order={justConfirmedOrder || orders[0]}
            onClose={() => setCurrentView('dashboard')}
            onViewDetails={() => {
              setSelectedOrder(justConfirmedOrder || orders[0]);
              setCurrentView('order-detail');
            }}
          />
        );
      case 'order-detail':
        return (
          <OrderDetailView
            order={selectedOrder || orders[1]}
            selectedOutlet={selectedOutlet}
            onBack={() => setCurrentView('dashboard')}
            onConfirmReceipt={(ord: any) => {
              setSelectedOrder(ord);
              setCurrentView('confirm-receipt');
            }}
            onInspectDegradation={(ord: any) => {
              setSelectedOrder(ord);
              setCurrentView('degradation');
            }}
          />
        );
      case 'confirm-receipt':
        return (
          <ConfirmReceiptView
            order={selectedOrder || orders[1]}
            selectedOutlet={selectedOutlet}
            onReceiptConfirmed={handleReceiptConfirmed}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      case 'degradation':
        return (
          <DegradationView
            order={selectedOrder || orders[3]}
            selectedOutlet={selectedOutlet}
            onBack={() => setCurrentView('dashboard')}
            onAcknowledge={handleAcknowledgeDeferral}
          />
        );
      default:
        return (
          <DashboardView
            selectedOutlet={selectedOutlet}
            orders={orders}
            setCurrentView={setCurrentView}
            setSelectedOrder={setSelectedOrder}
            storeClosureNotice={storeClosureNotice}
            onSetStoreClosureNotice={setStoreClosureNotice}
            onCancelStoreClosureNotice={() => setStoreClosureNotice(null)}
          />
        );
    }
  };

  return (
    <div className="app-container">
      {/* 240px Dark Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        selectedOutlet={selectedOutlet}
      />

      {/* Main Content Area */}
      <main className="main-content-viewport">
        {/* Top Header Bar & Profile */}
        <TopNavbar
          selectedOutlet={selectedOutlet}
          onSelectOutlet={setSelectedOutlet}
          outlets={MOCK_OUTLETS}
        />

        {renderContent()}
      </main>
    </div>
  );
}
