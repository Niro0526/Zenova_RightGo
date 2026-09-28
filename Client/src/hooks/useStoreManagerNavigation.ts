import { useEffect, useState } from 'react';

/**
 * Store Manager's view-switch + URL sync. Deliberately keeps the existing
 * manual pushState/popstate pattern (not real route navigation) — the whole
 * Store Manager tree is one mounted component tree so in-memory order state
 * survives switching views; a real <Link> navigation would remount the page
 * and lose it. `orders` is used to resolve `?id=` back to a full order object
 * on mount and on browser back/forward.
 */
export function useStoreManagerNavigation(orders: any[], initialView?: string) {
  const [currentView, setCurrentView] = useState(initialView || 'dashboard');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

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
    } else if (view === 'order-confirmation') {
      // Transient confirmation overlay shown right after placing an order;
      // not a distinct sub-route, so it's addressed as My Orders underneath.
      path = '/store-manager/my-orders';
    }

    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', path);
    }
  };

  // Sync initial URL on mount and browser navigation
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally mount-once, mirrors pre-existing behavior; `orders` seed data doesn't change identity in this session-local demo
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
        const popOrderId = new URLSearchParams(window.location.search).get('id');
        if (path.includes('/place-order')) setCurrentView('place-order');
        else if (path.includes('/deliveries')) setCurrentView('confirm-receipt');
        else if (path.includes('/degradation')) {
          setCurrentView('degradation');
          if (popOrderId) {
            const ord = orders.find(o => o.delivery_id === popOrderId);
            if (ord) setSelectedOrder(ord);
          }
        } else if (path.includes('/order-detail')) {
          setCurrentView('order-detail');
          if (popOrderId) {
            const ord = orders.find(o => o.delivery_id === popOrderId);
            if (ord) setSelectedOrder(ord);
          }
        } else setCurrentView('dashboard');
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  return { currentView, setCurrentView, selectedOrder, setSelectedOrder, navigateTo };
}
