/**
 * API client service for Store Manager operations with FastAPI backend.
 * Provides live synchronization with graceful fallback for offline resilience.
 */

const RAW_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_BASE = RAW_API.endsWith('/api') ? RAW_API : `${RAW_API}/api`;

export interface BackendOrder {
  order_ref: string;
  scenario: string;
  outlet_id: string;
  brand: string;
  district: string;
  depot: string;
  dock_type: string;
  parking_constraint: string;
  mall_window?: string | null;
  window_open_time: string;
  window_close_time: string;
  temp_requirement: string;
  order_units: number;
  order_weight_kg: number;
  order_volume_m3: number;
  deferred_yesterday: boolean;
  days_since_last_served: number;
  status: string;
  placed_by?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

export interface CreateOrderPayload {
  outlet_id: string;
  brand: string;
  units: number;
  temp_requirement?: string;
  notes?: string;
  placed_by?: string;
}

export interface CancelOrderPayload {
  reason: string;
  cancelled_by?: string;
}

export interface ConfirmReceiptPayload {
  order_ref: string;
  outlet_id: string;
  confirmed_units: number;
  delivery_record_id?: string;
  has_issue: boolean;
  issue_type?: string;
  notes?: string;
  confirmed_by?: string;
}

export interface DeferralAckPayload {
  outlet_id: string;
  order_ref: string;
  manifest_version: number;
  acknowledged_by?: string;
  notes?: string;
}

/**
 * Fetch orders for a specific outlet from FastAPI backend.
 */
export async function fetchStoreOrdersApi(outletId?: string, scenario: string = 'S1'): Promise<BackendOrder[] | null> {
  try {
    const url = new URL(`${API_BASE}/orders`);
    url.searchParams.set('scenario', scenario);
    if (outletId) {
      url.searchParams.set('outlet_id', outletId);
    }
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[RightGo Store Manager API] Failed to fetch orders from server:', err);
    return null;
  }
}

/**
 * Submit a replenishment order to FastAPI backend.
 */
export async function placeReplenishmentOrderApi(payload: CreateOrderPayload): Promise<BackendOrder | null> {
  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn('[RightGo Store Manager API] Order creation rejected:', errData);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn('[RightGo Store Manager API] Network error on order placement:', err);
    return null;
  }
}

/**
 * Cancel an order before warehouse loading commenced.
 */
export async function cancelStoreOrderApi(orderRef: string, payload: CancelOrderPayload): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderRef)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.warn('[RightGo Store Manager API] Network error on order cancellation:', err);
    return false;
  }
}

/**
 * Confirm goods receipt & sign off e-POD.
 */
export async function confirmStoreReceiptApi(payload: ConfirmReceiptPayload): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/receipts/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[RightGo Store Manager API] Network error on receipt confirmation:', err);
    return null;
  }
}

/**
 * Acknowledge deferral with explanation.
 */
export async function acknowledgeDeferralApi(payload: DeferralAckPayload): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/deferrals/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.warn('[RightGo Store Manager API] Network error on deferral ack:', err);
    return false;
  }
}
