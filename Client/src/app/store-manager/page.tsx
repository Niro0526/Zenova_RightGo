'use client';

import React, { useState, useEffect } from 'react';
import { Package, FilePlus, Truck } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import TopNavbar from '../../components/layout/TopNavbar';
import MobileNavDrawer from '../../components/common/MobileNavDrawer';
import DashboardView from '../../components/store-manager/DashboardView';
import PlaceOrderView from '../../components/store-manager/PlaceOrderView';
import OrderDetailView from '../../components/store-manager/OrderDetailView';
import ConfirmReceiptView from '../../components/store-manager/ConfirmReceiptView';
import DegradationView from '../../components/store-manager/DegradationView';
import OrderConfirmationModal from '../../components/store-manager/OrderConfirmationModal';
import { MOCK_OUTLETS } from '../../data/mockData';

interface StoreManagerPageProps {
  initialView?: string;
}

export default function StoreManagerPage({ initialView }: StoreManagerPageProps) {
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
      section: 'deferred',
      items: [
        { name: 'Keeri Samba Rice (10kg Bags)', qty: 10, unit: 'bags' },
        { name: 'Pure Ceylon Tea Pack (500g)', qty: 25, unit: 'boxes' },
        { name: 'Full Cream Milk Powder (400g)', qty: 20, unit: 'pouches' }
      ]
    },
    {
      delivery_id: 'RG-F-2741',
      brand: 'Fresh',
      brand_code: 'FR',
      order_type: 'Brand Fresh · Ambient',
      order_date: '6 Jan 2026',
      status: 'Delivered',
      delivered_date: '7 Jan 2026',
      delivery_time: '7 Jan, 08:45',
      section: 'completed',
      receipt_ref: 'REC-S1-0988-001',
      items: [
        { name: 'Keeri Samba Rice (10kg Bags)', qty: 20, unit: 'bags' },
        { name: 'Pure Coconut Oil (1L Bottles)', qty: 25, unit: 'bottles' },
        { name: 'Refined White Sugar (1kg)', qty: 30, unit: 'packs' }
      ]
    },
    {
      delivery_id: 'RG-F-2891',
      brand: 'Fresh',
      brand_code: 'FR',
      order_type: 'Brand Fresh · Chilled',
      order_date: '5 Jan 2026',
      status: 'Delivered',
      delivered_date: '6 Jan 2026',
      delivery_time: '6 Jan, 07:15',
      section: 'completed',
      receipt_ref: 'REC-S1-0975-002',
      items: [
        { name: 'Farm Fresh Milk (1L Bottles)', qty: 40, unit: 'bottles' },
        { name: 'Highland Set Yoghurt (Cup pk)', qty: 48, unit: 'cups' },
        { name: 'Fresh Farm Eggs (Crate of 30)', qty: 10, unit: 'crates' }
      ]
    }
  ]);

  const [currentView, setCurrentView] = useState(initialView || 'dashboard');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [justConfirmedOrder, setJustConfirmedOrder] = useState<any>(null);
  const [storeClosureNotice, setStoreClosureNotice] = useState<any>(null);

  // Synchronize URL with active view and selected order
  const navigateTo = (view: string, order?: any) => {
    setCurrentView(view);
    if (order) setSelectedOrder(order);

    let path = '/store-manager/my-orders';
    if (view === 'dashboard' || view === 'my-orders' || view === 'orders') {
      path = '/store-manager/my-orders';
    } else if (view === 'place-order') {
      path = '/store-manager/place-order';
    } else if (view === 'confirm-receipt' || view === 'deliveries') {
      path = '/store-manager/deliveries';
    } else if (view === 'degradation') {
      const orderId = order?.delivery_id || selectedOrder?.delivery_id || 'RG-F-3180';
      path = '/store-manager/degradation?id=' + orderId;
    } else if (view === 'order-detail') {
      const orderId = order?.delivery_id || selectedOrder?.delivery_id || 'S1-000';
      path = '/store-manager/order-detail?id=' + orderId;
    }

    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', path);
    }
  };

  // Sync initial URL on mount and browser navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const orderId = searchParams.get('id');

      if (pathname.includes('/place-order')) {
        setCurrentView('place-order');
      } else if (pathname.includes('/deliveries') || pathname.includes('/confirm-receipt')) {
        setCurrentView('confirm-receipt');
      } else if (pathname.includes('/degradation')) {
        setCurrentView('degradation');
        if (orderId) {
          const ord = orders.find(o => o.delivery_id === orderId);
          if (ord) setSelectedOrder(ord);
        }
      } else if (pathname.includes('/order-detail')) {
        setCurrentView('order-detail');
        if (orderId) {
          const ord = orders.find(o => o.delivery_id === orderId);
          if (ord) setSelectedOrder(ord);
        }
      } else {
        setCurrentView('dashboard');
        if (pathname === '/store-manager' || pathname === '/store-manager/') {
          window.history.replaceState(null, '', '/store-manager/my-orders');
        }
      }

      const handlePopState = () => {
        const path = window.location.pathname;
        if (path.includes('/place-order')) setCurrentView('place-order');
        else if (path.includes('/deliveries')) setCurrentView('confirm-receipt');
        else if (path.includes('/degradation')) setCurrentView('degradation');
        else if (path.includes('/order-detail')) setCurrentView('order-detail');
        else setCurrentView('dashboard');
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  const handleOrderCreated = (newOrder: any) => {
    setOrders(prev => {
      const existing = prev.find(o => o.delivery_id === newOrder.delivery_id);
      if (existing) {
        return prev.map(o => o.delivery_id === newOrder.delivery_id ? newOrder : o);
      }
      return [newOrder, ...prev];
    });
    setEditingOrder(null);
    setJustConfirmedOrder(newOrder);
    navigateTo('order-confirmation');
  };

  const handleEditOrder = (orderToEdit: any) => {
    setEditingOrder(orderToEdit);
    navigateTo('place-order');
  };

  const handleCancelOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.delivery_id !== orderId));
    setJustConfirmedOrder(null);
    setEditingOrder(null);
    alert('✓ Order #' + orderId + ' cancelled and removed from queue.');
    navigateTo('dashboard');
  };

  const handleReceiptConfirmed = (deliveryId: string, receiptData: any) => {
    setOrders(prev => prev.map(ord => {
      if (ord.delivery_id === deliveryId) {
        return {
          ...ord,
          status: 'Delivered',
          section: 'completed',
          delivery_time: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          receipt_details: receiptData
        };
      }
      return ord;
    }));
    alert('✓ Electronic Proof of Delivery (e-POD) signed and submitted to Central Depot dispatcher!');
    navigateTo('dashboard');
  };

  const handleAcknowledgeDeferral = (deliveryId: string, slot?: string) => {
    setOrders(prev => prev.map(ord => {
      if (ord.delivery_id === deliveryId) {
        return {
          ...ord,
          degradation_level: 'Acknowledged',
          status: 'Rescheduled (' + (slot || 'Tomorrow Wave 1') + ')',
          section: 'future'
        };
      }
      return ord;
    }));
    navigateTo('dashboard');
  };

  const handleEscalateDeferral = (deliveryId: string, escalationData: any) => {
    setOrders(prev => prev.map(ord => {
      if (ord.delivery_id === deliveryId) {
        return {
          ...ord,
          status: 'Escalated (' + escalationData.ticketId + ')',
          degradation_level: 'Critical Escalation',
          escalation_ticket: escalationData.ticketId,
          escalation_data: escalationData
        };
      }
      return ord;
    }));
    navigateTo('dashboard');
  };

  const handleCancelDeferral = (deliveryId: string, cancelData: any) => {
    setOrders(prev => prev.map(ord => {
      if (ord.delivery_id === deliveryId) {
        return {
          ...ord,
          status: 'Cancelled',
          degradation_level: 'Cancelled by Store',
          section: 'completed',
          cancel_data: cancelData
        };
      }
      return ord;
    }));
    navigateTo('dashboard');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
      case 'my-orders':
        return (
          <DashboardView
            selectedOutlet={selectedOutlet}
            orders={orders}
            setCurrentView={(v: string) => navigateTo(v)}
            setSelectedOrder={(o: any) => setSelectedOrder(o)}
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
            setCurrentView={(v: string) => navigateTo(v)}
            storeClosureNotice={storeClosureNotice}
            editingOrder={editingOrder}
            onCancelEdit={() => {
              setEditingOrder(null);
              navigateTo('dashboard');
            }}
          />
        );
      case 'order-confirmation':
        return (
          <OrderConfirmationModal
            order={justConfirmedOrder || orders[0]}
            onClose={() => navigateTo('dashboard')}
            onViewDetails={() => {
              navigateTo('order-detail', justConfirmedOrder || orders[0]);
            }}
            onEditOrder={handleEditOrder}
            onCancelOrder={handleCancelOrder}
          />
        );
      case 'order-detail':
        return (
          <OrderDetailView
            order={selectedOrder || orders[1]}
            selectedOutlet={selectedOutlet}
            onBack={() => navigateTo('dashboard')}
            onConfirmReceipt={(ord: any) => {
              navigateTo('confirm-receipt', ord);
            }}
            onInspectDegradation={(ord: any) => {
              navigateTo('degradation', ord);
            }}
            onEditOrder={handleEditOrder}
            onCancelOrder={handleCancelOrder}
          />
        );
      case 'confirm-receipt':
      case 'deliveries':
        return (
          <ConfirmReceiptView
            order={selectedOrder || orders[1]}
            selectedOutlet={selectedOutlet}
            onReceiptConfirmed={handleReceiptConfirmed}
            onBack={() => navigateTo('dashboard')}
          />
        );
      case 'degradation':
        return (
          <DegradationView
            order={selectedOrder || orders[3]}
            selectedOutlet={selectedOutlet}
            onBack={() => navigateTo('dashboard')}
            onAcknowledge={handleAcknowledgeDeferral}
            onEscalate={handleEscalateDeferral}
            onCancel={handleCancelDeferral}
          />
        );
      default:
        return (
          <DashboardView
            selectedOutlet={selectedOutlet}
            orders={orders}
            setCurrentView={(v: string) => navigateTo(v)}
            setSelectedOrder={(o: any) => setSelectedOrder(o)}
            storeClosureNotice={storeClosureNotice}
            onSetStoreClosureNotice={setStoreClosureNotice}
            onCancelStoreClosureNotice={() => setStoreClosureNotice(null)}
          />
        );
    }
  };

  const isOrdersActive = currentView === 'dashboard' || currentView === 'orders' || currentView === 'my-orders';
  const isPlaceOrderActive = currentView === 'place-order';
  const isDeliveriesActive = currentView === 'confirm-receipt' || currentView === 'deliveries';

  return (
    <div className="app-container">
      {/* 240px Dark Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={(v: string) => navigateTo(v)}
        selectedOutlet={selectedOutlet}
      />

      {/* Main Content Area */}
      <main className="main-content-viewport">
        <MobileNavDrawer items={[
          { href: '/store-manager/my-orders', label: 'My Orders', icon: Package, active: isOrdersActive, onClick: () => navigateTo('dashboard') },
          { href: '/store-manager/place-order', label: 'Place Order', icon: FilePlus, active: isPlaceOrderActive, onClick: () => navigateTo('place-order') },
          { href: '/store-manager/deliveries', label: 'Deliveries', icon: Truck, active: isDeliveriesActive, onClick: () => navigateTo('confirm-receipt') },
        ]} />
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
