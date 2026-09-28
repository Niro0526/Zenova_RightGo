'use client';

import React from 'react';
import Sidebar from '@/components/store-manager/Sidebar';
import TopNavbar from '@/components/store-manager/TopNavbar';
import DashboardView from '@/components/store-manager/DashboardView';
import PlaceOrderView from '@/components/store-manager/PlaceOrderView';
import OrderDetailView from '@/components/store-manager/OrderDetailView';
import ConfirmReceiptView from '@/components/store-manager/ConfirmReceiptView';
import DegradationView from '@/components/store-manager/DegradationView';
import OrderConfirmationModal from '@/components/store-manager/OrderConfirmationModal';
import { MOCK_OUTLETS } from '@/data/mockData';
import { useStoreManagerOrders } from '@/hooks/useStoreManagerOrders';
import { useStoreManagerNavigation } from '@/hooks/useStoreManagerNavigation';

interface StoreManagerAppProps {
  initialView?: string;
}

export default function StoreManagerApp({ initialView }: StoreManagerAppProps) {
  const {
    selectedOutlet, setSelectedOutlet,
    orders, setOrders,
    editingOrder, setEditingOrder,
    justConfirmedOrder, setJustConfirmedOrder,
    storeClosureNotice, setStoreClosureNotice,
  } = useStoreManagerOrders();

  const { currentView, selectedOrder, setSelectedOrder, navigateTo } = useStoreManagerNavigation(orders, initialView);

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
    // Discrepancy receipts (damaged/short/etc.) must stay distinguishable from a
    // clean receipt, not collapse into a uniform "Delivered" - the receiver's
    // reported outcome (receiptData.isFullMatch / .status) is the source of truth.
    const isFullMatch = receiptData?.isFullMatch !== false;
    setOrders(prev => prev.map(ord => {
      if (ord.delivery_id === deliveryId) {
        return {
          ...ord,
          status: isFullMatch ? 'Delivered' : 'Delivered - Exception Reported',
          section: 'completed',
          delivery_time: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          receipt_details: receiptData
        };
      }
      return ord;
    }));
    alert(isFullMatch
      ? '✓ Electronic Proof of Delivery (e-POD) signed and submitted to Central Depot dispatcher!'
      : '✓ Receipt recorded with a reported discrepancy - Central Depot dispatcher notified for resolution.');
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
          selectedOutlet={selectedOutlet}
          onSelectOutlet={setSelectedOutlet}
          outlets={MOCK_OUTLETS}
        />

        {renderContent()}
      </main>
    </div>
  );
}
