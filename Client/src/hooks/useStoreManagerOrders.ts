import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import {
  mapApiOrderToUi,
  type ApiOrderRow,
} from "@/lib/store-manager/order-mapper";

export interface StoreOutlet {
  outlet_id: string;
  name: string;
  brand: string;
  district?: string;
  depot?: string;
}

async function fetchOutlets(): Promise<StoreOutlet[]> {
  const rows = await apiGet<StoreOutlet[]>("/reference/outlets");
  return rows.map((o) => ({
    outlet_id: o.outlet_id,
    name: o.name,
    brand: o.brand,
    district: o.district,
    depot: o.depot,
  }));
}

async function fetchOrdersForOutlet(outletId: string): Promise<Record<string, unknown>[]> {
  const rows = await apiGet<ApiOrderRow[]>(
    `/orders?scenario=S1&outlet_id=${encodeURIComponent(outletId)}`
  );
  return rows.map(mapApiOrderToUi);
}

/** Store Manager's order/outlet domain state (API-backed). */
export function useStoreManagerOrders() {
  const [selectedOutlet, setSelectedOutlet] = useState<StoreOutlet | null>(null);
  const [outlets, setOutlets] = useState<StoreOutlet[]>([]);
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOrder, setEditingOrder] = useState<Record<string, unknown> | null>(null);
  const [justConfirmedOrder, setJustConfirmedOrder] = useState<Record<string, unknown> | null>(
    null
  );
  const [storeClosureNotice, setStoreClosureNotice] = useState<Record<string, unknown> | null>(
    null
  );

  const reloadOrders = useCallback(async (outletId: string) => {
    try {
      const next = await fetchOrdersForOutlet(outletId);
      setOrders(next);
    } catch (err) {
      console.error("Failed to load store orders:", err);
      setOrders([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const outletRows = await fetchOutlets();
        if (cancelled) return;
        setOutlets(outletRows);
        const initial = outletRows[0] ?? null;
        setSelectedOutlet(initial);
        if (initial) {
          await reloadOrders(initial.outlet_id);
        }
      } catch (err) {
        console.error("Failed to load outlets:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadOrders]);

  useEffect(() => {
    if (selectedOutlet?.outlet_id) {
      void reloadOrders(selectedOutlet.outlet_id);
    }
  }, [selectedOutlet?.outlet_id, reloadOrders]);

  return {
    outlets,
    loading,
    selectedOutlet,
    setSelectedOutlet,
    orders,
    setOrders,
    reloadOrders,
    editingOrder,
    setEditingOrder,
    justConfirmedOrder,
    setJustConfirmedOrder,
    storeClosureNotice,
    setStoreClosureNotice,
  };
}
