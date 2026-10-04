'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import TopNavbar from '../layout/TopNavbar';
import DashboardView from './DashboardView';
import PlaceOrderView from './PlaceOrderView';
import OrderDetailView from './OrderDetailView';
import ConfirmReceiptView from './ConfirmReceiptView';
import DegradationView from './DegradationView';
import OrderConfirmationModal from './OrderConfirmationModal';
import EmptyState from '@/components/common/EmptyState';
import { useAuth } from '@/context/AuthContext';
import {
  acknowledgeDeferral,
  cancelOrder,
  confirmReceipt,
  getOrders,
  getOutlets,
  type DispatcherOrder,
  type OutletRecord,
} from '@/lib/api/dispatcher';
import { ApiError } from '@/lib/api/client';

export interface StoreManagerContentProps {
  initialView?: string;
}

function mapStatus(status: string): string {
  if (status === 'awaiting_planning') return 'Awaiting Planning';
  if (status === 'planned') return 'Planned';
  if (status === 'loading') return 'Loading';
  if (status === 'in_transit') return 'Out for Delivery';
  if (status === 'delivered') return 'Delivered';
  if (status === 'deferred') return 'Deferred';
  if (status === 'cancelled') return 'Cancelled';
  return status;
}

function mapSection(status: string): string {
  if (status === 'in_transit' || status === 'loading') return 'active';
  if (status === 'awaiting_planning' || status === 'planned') return 'future';
  if (status === 'deferred') return 'deferred';
  if (status === 'delivered' || status === 'cancelled') return 'completed';
  return 'future';
}

function mapOrder(order: DispatcherOrder) {
  return {
    delivery_id: order.orderRef,
    brand: order.brand,
    brand_code: order.brand === 'Fresh' ? 'FR' : order.brand === 'Style' ? 'ST' : 'TC',
    order_type: `Brand ${order.brand} - ${order.tempRequirement === 'chilled' ? 'Chilled' : 'Ambient'}`,
    order_date: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : (order.runDate ?? ''),
    status: mapStatus(order.status),
    raw_status: order.status,
    section: mapSection(order.status),
    order_units: order.orderUnits,
    weight_kg: order.orderWeightKg,
    volume_cbm: order.orderVolumeM3,
    items: [
      {
        name: `${order.brand} replenishment units`,
        qty: order.orderUnits,
        unit: 'units',
        expected: order.orderUnits,
        loaded: order.orderUnits,
        temp: order.tempRequirement === 'chilled' ? 'Chilled' : 'Ambient',
      },
    ],
  };
}

export function StoreManagerContent({ initialView }: StoreManagerContentProps) {
  const { user } = useAuth();
  const [selectedOutlet, setSelectedOutlet] = useState<OutletRecord | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState(initialView || 'dashboard');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [justConfirmedOrder, setJustConfirmedOrder] = useState<any>(null);
  const [storeClosureNotice, setStoreClosureNotice] = useState<any>(null);

  const refreshOrders = useCallback(async () => {
    const serverOrders = await getOrders();
    setOrders(serverOrders.map(mapOrder));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoadingData(true);
      setLoadError(null);
      try {
        const [serverOrders, outlets] = await Promise.all([getOrders(), getOutlets()]);
        if (cancelled) return;
        setOrders(serverOrders.map(mapOrder));
        setSelectedOutlet(outlets.find((outlet) => outlet.outlet_id === user?.outlet_id) ?? null);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : 'Could not load store manager data from the server.');
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.outlet_id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const orderId = searchParams.get('id');

    if (pathname.includes('/place-order')) setCurrentView('place-order');
    else if (pathname.includes('/deliveries') || pathname.includes('/confirm-receipt')) setCurrentView('confirm-receipt');
    else if (pathname.includes('/degradation')) setCurrentView('degradation');
    else if (pathname.includes('/order-detail')) setCurrentView('order-detail');
    else {
      setCurrentView('dashboard');
      if (pathname === '/store-manager' || pathname === '/store-manager/') {
        window.history.replaceState(null, '', '/store-manager/my-orders');
      }
    }

    if (orderId) {
      const order = orders.find((o) => o.delivery_id === orderId);
      if (order) setSelectedOrder(order);
    }
  }, [orders]);

  const navigateTo = (view: string, order?: any) => {
    setCurrentView(view);
    if (order) setSelectedOrder(order);

    let path = '/store-manager/my-orders';
    if (view === 'place-order') path = '/store-manager/place-order';
    else if (view === 'confirm-receipt' || view === 'deliveries') path = '/store-manager/deliveries';
    else if (view === 'degradation') path = `/store-manager/degradation?id=${order?.delivery_id ?? selectedOrder?.delivery_id ?? ''}`;
    else if (view === 'order-detail') path = `/store-manager/order-detail?id=${order?.delivery_id ?? selectedOrder?.delivery_id ?? ''}`;

    if (typeof window !== 'undefined') window.history.pushState(null, '', path);
  };

  const handleOrderCreated = (newOrder: any) => {
    setJustConfirmedOrder(newOrder);
    setEditingOrder(null);
    void refreshOrders().catch(() => setOrders((prev) => [newOrder, ...prev]));
    navigateTo('order-confirmation', newOrder);
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrder(orderId, 'Cancelled by Store Manager before dispatch loading');
      await refreshOrders();
      setJustConfirmedOrder(null);
      setEditingOrder(null);
      navigateTo('dashboard');
    } catch (err) {
      alert('Could not cancel order #' + orderId + ': ' + (err instanceof ApiError ? err.message : 'the server is unreachable') + '. Nothing was changed.');
    }
  };

  const handleReceiptConfirmed = async (deliveryId: string, receiptData: any) => {
    if (!selectedOutlet) return;
    try {
      await confirmReceipt({
        orderRef: deliveryId,
        outletId: selectedOutlet.outlet_id,
        confirmedUnits: receiptData.confirmedUnits || 0,
        hasIssue: !receiptData.isFullMatch,
        issueType: receiptData.disputes?.[0]?.type || undefined,
        notes: receiptData.disputes?.[0]?.note || 'Store receipt confirmed with electronic signature',
      });
      await refreshOrders();
      navigateTo('dashboard');
    } catch (err) {
      alert('Could not confirm receipt for #' + deliveryId + ': ' + (err instanceof ApiError ? err.message : 'the server is unreachable') + '. Nothing was recorded - please try again.');
    }
  };

  const handleAcknowledgeDeferral = async (deliveryId: string, slot?: string) => {
    if (!selectedOutlet) return;
    try {
      await acknowledgeDeferral(selectedOutlet.outlet_id, deliveryId, 1, 'Store acknowledged deferral and confirmed slot: ' + (slot || 'Tomorrow Wave 1'));
      await refreshOrders();
      navigateTo('dashboard');
    } catch (err) {
      alert('Could not acknowledge deferral for #' + deliveryId + ': ' + (err instanceof ApiError ? err.message : 'the server is unreachable') + '. Nothing was recorded - please try again.');
    }
  };

  const handleEscalateDeferral = () => {
    alert('Escalation must be recorded by the backend before it can update this workspace.');
  };

  const handleCancelDeferral = () => {
    alert('Deferral cancellation must be recorded by the backend before it can update this workspace.');
  };

  const shell = (content: React.ReactNode) => (
    <div className="app-container">
      <Sidebar currentView={currentView} setCurrentView={(view) => navigateTo(view)} selectedOutlet={selectedOutlet ?? {}} />
      <main className="main-content-viewport">
        {selectedOutlet && <TopNavbar selectedOutlet={selectedOutlet} />}
        {content}
      </main>
    </div>
  );

  if (isLoadingData) return shell(<div className="p-10 text-sm text-gray-500">Loading store data from server...</div>);

  if (loadError || !selectedOutlet) {
    return shell(
      <div className="p-6">
        <EmptyState
          title="Store data unavailable"
          description={loadError ?? 'Your login is not linked to an outlet in the database.'}
        />
      </div>,
    );
  }

  const needOrder = (viewName: string) => (
    <div className="p-6">
      <EmptyState
        title="Select an order"
        description={`Open an order from My Orders before using ${viewName}.`}
      />
    </div>
  );

  let content: React.ReactNode;
  switch (currentView) {
    case 'dashboard':
    case 'my-orders':
      content = (
        <DashboardView
          selectedOutlet={selectedOutlet}
          orders={orders}
          setCurrentView={(view: string) => navigateTo(view)}
          setSelectedOrder={(order: any) => setSelectedOrder(order)}
          storeClosureNotice={storeClosureNotice}
          onSetStoreClosureNotice={setStoreClosureNotice}
          onCancelStoreClosureNotice={() => setStoreClosureNotice(null)}
        />
      );
      break;
    case 'place-order':
      content = (
        <PlaceOrderView
          selectedOutlet={selectedOutlet}
          onOrderCreated={handleOrderCreated}
          setCurrentView={(view: string) => navigateTo(view)}
          storeClosureNotice={storeClosureNotice}
          editingOrder={editingOrder}
          onCancelEdit={() => {
            setEditingOrder(null);
            navigateTo('dashboard');
          }}
        />
      );
      break;
    case 'order-confirmation':
      content = justConfirmedOrder ? (
        <OrderConfirmationModal
          order={justConfirmedOrder}
          onClose={() => navigateTo('dashboard')}
          onViewDetails={() => navigateTo('order-detail', justConfirmedOrder)}
          onEditOrder={(order: any) => {
            setEditingOrder(order);
            navigateTo('place-order');
          }}
          onCancelOrder={handleCancelOrder}
        />
      ) : needOrder('order confirmation');
      break;
    case 'order-detail':
      content = selectedOrder ? (
        <OrderDetailView
          order={selectedOrder}
          selectedOutlet={selectedOutlet}
          onBack={() => navigateTo('dashboard')}
          onConfirmReceipt={(order: any) => navigateTo('confirm-receipt', order)}
          onInspectDegradation={(order: any) => navigateTo('degradation', order)}
          onEditOrder={(order: any) => {
            setEditingOrder(order);
            navigateTo('place-order');
          }}
          onCancelOrder={handleCancelOrder}
        />
      ) : needOrder('order details');
      break;
    case 'confirm-receipt':
    case 'deliveries':
      content = selectedOrder ? (
        <ConfirmReceiptView
          order={selectedOrder}
          selectedOutlet={selectedOutlet}
          onReceiptConfirmed={handleReceiptConfirmed}
          onBack={() => navigateTo('dashboard')}
        />
      ) : needOrder('receipt confirmation');
      break;
    case 'degradation':
      content = selectedOrder ? (
        <DegradationView
          order={selectedOrder}
          selectedOutlet={selectedOutlet}
          onBack={() => navigateTo('dashboard')}
          onAcknowledge={handleAcknowledgeDeferral}
          onEscalate={handleEscalateDeferral}
          onCancel={handleCancelDeferral}
        />
      ) : needOrder('degradation review');
      break;
    default:
      content = (
        <DashboardView
          selectedOutlet={selectedOutlet}
          orders={orders}
          setCurrentView={(view: string) => navigateTo(view)}
          setSelectedOrder={(order: any) => setSelectedOrder(order)}
          storeClosureNotice={storeClosureNotice}
          onSetStoreClosureNotice={setStoreClosureNotice}
          onCancelStoreClosureNotice={() => setStoreClosureNotice(null)}
        />
      );
  }

  return shell(content);
}
