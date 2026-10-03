'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopNavbar from '../layout/TopNavbar';
import DashboardView from './DashboardView';
import PlaceOrderView from './PlaceOrderView';
import OrderDetailView from './OrderDetailView';
import ConfirmReceiptView from './ConfirmReceiptView';
import DegradationView from './DegradationView';
import OrderConfirmationModal from './OrderConfirmationModal';
import { useStoreManagerOrders } from '@/hooks/useStoreManagerOrders';

export interface StoreManagerContentProps {
  initialView?: string;
}

export function StoreManagerContent({ initialView }: StoreManagerContentProps) {
  const {
    outlets,
    selectedOutlet,
    setSelectedOutlet,
    orders,
    setOrders,
  } = useStoreManagerOrders();

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
      const updated = existing
        ? prev.map(o => o.delivery_id === newOrder.delivery_id ? newOrder : o)
        : [newOrder, ...prev];
      return updated;
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
    setOrders(prev => {
      return prev.filter(o => o.delivery_id !== orderId);
    });
    setJustConfirmedOrder(null);
    setEditingOrder(null);
    alert('✓ Order #' + orderId + ' cancelled and removed from queue.');
    navigateTo('dashboard');
  };

  const handleReceiptConfirmed = (deliveryId: string, receiptData: any) => {
    setOrders(prev => {
      const updated = prev.map(ord => {
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
      });
      return updated;
    });
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
            selectedOutlet={selectedOutlet || {}}
            orders={orders}
            setCurrentView={(v: string) => navigateTo(v)}
            setSelectedOrder={(o: any) => setSelectedOrder(o)}
            storeClosureNotice={storeClosureNotice}
            onSetStoreClosureNotice={(notice: any) => {
              setStoreClosureNotice(notice);
              alert('Central Dispatcher notified.');
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
            selectedOutlet={selectedOutlet || {}}
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
            selectedOutlet={selectedOutlet || {}}
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
            selectedOutlet={selectedOutlet || {}}
            onReceiptConfirmed={handleReceiptConfirmed}
            onBack={() => navigateTo('dashboard')}
          />
        );
      case 'degradation':
        return (
          <DegradationView
            order={selectedOrder || orders[3]}
            selectedOutlet={selectedOutlet || {}}
            onBack={() => navigateTo('dashboard')}
            onAcknowledge={handleAcknowledgeDeferral}
            onEscalate={handleEscalateDeferral}
            onCancel={handleCancelDeferral}
          />
        );
      default:
        return (
          <DashboardView
            selectedOutlet={selectedOutlet || {}}
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
        {/* Top Header Bar & Profile */}
        <TopNavbar
          selectedOutlet={selectedOutlet || {}}
          onSelectOutlet={setSelectedOutlet}
          outlets={outlets}
        />

        {renderContent()}
      </main>
    </div>
  );
}
