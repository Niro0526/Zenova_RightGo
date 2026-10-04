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
import { MOCK_OUTLETS } from '../../data/mockData';
import { getInitialStoreOrders } from '@/hooks/useStoreManagerOrders';
import { 
  fetchStoreOrdersApi, 
  cancelStoreOrderApi, 
  confirmStoreReceiptApi, 
  acknowledgeDeferralApi,
  BackendOrder 
} from '@/lib/storeManagerApi';

export interface StoreManagerContentProps {
  initialView?: string;
}

export function StoreManagerContent({ initialView }: StoreManagerContentProps) {
  const [selectedOutlet, setSelectedOutlet] = useState(MOCK_OUTLETS[0]);

  // Master Interactive State with LocalStorage Persistence
  const [orders, setOrders] = useState<any[]>(getInitialStoreOrders);

  // Sync from localStorage and FastAPI backend
  useEffect(() => {
    let localList: any[] = [];
    try {
      const cached = localStorage.getItem('rightgo_store_manager_orders');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localList = parsed;
          setOrders(parsed);
        }
      }
    } catch {}

    // Live sync from FastAPI backend
    fetchStoreOrdersApi(selectedOutlet.outlet_id).then(serverOrders => {
      if (serverOrders && serverOrders.length > 0) {
        setOrders(prev => {
          const mapStatus = (st: string) => {
            if (st === 'awaiting_planning') return 'Awaiting Planning';
            if (st === 'planned') return 'Planned';
            if (st === 'loading') return 'Loading';
            if (st === 'in_transit') return 'Out for Delivery';
            if (st === 'delivered') return 'Delivered';
            if (st === 'deferred') return 'Deferred';
            if (st === 'cancelled') return 'Cancelled';
            return st;
          };

          const mapSection = (st: string) => {
            if (st === 'in_transit' || st === 'loading') return 'active';
            if (st === 'awaiting_planning' || st === 'planned') return 'future';
            if (st === 'deferred') return 'deferred';
            if (st === 'delivered' || st === 'cancelled') return 'completed';
            return 'future';
          };

          const updated = [...prev];
          serverOrders.forEach(so => {
            const existingIdx = updated.findIndex(o => o.delivery_id === so.order_ref);
            const mappedOrder = {
              delivery_id: so.order_ref,
              brand: so.brand,
              brand_code: so.brand === 'Fresh' ? 'FR' : 'ST',
              order_type: `Brand ${so.brand} · ${so.temp_requirement === 'chilled' ? 'Chilled' : 'Ambient'}`,
              order_date: so.created_at ? new Date(so.created_at).toLocaleDateString() : 'Today',
              status: mapStatus(so.status),
              section: mapSection(so.status),
              order_units: so.order_units,
              weight_kg: so.order_weight_kg,
              volume_cbm: so.order_volume_m3,
              vehicle_id: 'VEH003 (Reefer Van)',
              driver_name: 'Chaminda Vithanage',
              items: existingIdx >= 0 && updated[existingIdx].items?.length > 0 
                ? updated[existingIdx].items 
                : [
                    { name: `${so.brand} Assorted Stock Pack`, qty: so.order_units, unit: 'crates', expected: so.order_units, loaded: so.order_units, temp: so.temp_requirement === 'chilled' ? 'Chilled (+4°C)' : 'Ambient' }
                  ]
            };

            if (existingIdx >= 0) {
              updated[existingIdx] = { ...updated[existingIdx], ...mappedOrder };
            } else {
              updated.unshift(mappedOrder);
            }
          });

          return updated;
        });
      }
    });
  }, [selectedOutlet.outlet_id]);

  // Keep localStorage synced across tabs and route navigations
  useEffect(() => {
    if (orders && orders.length > 0) {
      try {
        localStorage.setItem('rightgo_store_manager_orders', JSON.stringify(orders));
      } catch {}
    }
  }, [orders]);

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
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('rightgo_store_manager_orders', JSON.stringify(updated));
        } catch {}
      }
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
    cancelStoreOrderApi(orderId, {
      reason: 'Cancelled by Store Manager before dispatch loading',
      cancelled_by: selectedOutlet.manager_name || 'Store Manager'
    }).catch(() => {});

    setOrders(prev => {
      const updated = prev.filter(o => o.delivery_id !== orderId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('rightgo_store_manager_orders', JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
    setJustConfirmedOrder(null);
    setEditingOrder(null);
    alert('✓ Order #' + orderId + ' cancelled and removed from queue.');
    navigateTo('dashboard');
  };

  const handleReceiptConfirmed = (deliveryId: string, receiptData: any) => {
    confirmStoreReceiptApi({
      order_ref: deliveryId,
      outlet_id: selectedOutlet.outlet_id,
      confirmed_units: receiptData.confirmedUnits || 12,
      has_issue: !receiptData.isFullMatch,
      issue_type: receiptData.disputes?.[0]?.type || undefined,
      notes: receiptData.disputes?.[0]?.note || 'Store receipt confirmed with electronic signature',
      confirmed_by: receiptData.receiverName || selectedOutlet.manager_name || 'Store Manager'
    }).catch(() => {});

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
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('rightgo_store_manager_orders', JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
    alert('✓ Electronic Proof of Delivery (e-POD) signed and submitted to Central Depot dispatcher!');
    navigateTo('dashboard');
  };

  const handleAcknowledgeDeferral = (deliveryId: string, slot?: string) => {
    acknowledgeDeferralApi({
      outlet_id: selectedOutlet.outlet_id,
      order_ref: deliveryId,
      manifest_version: 1,
      notes: 'Store acknowledged deferral and confirmed slot: ' + (slot || 'Tomorrow Wave 1'),
      acknowledged_by: selectedOutlet.manager_name || 'Store Manager'
    }).catch(() => {});

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
