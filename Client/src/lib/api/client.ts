// Single shared HTTP client for every backend call in the app. Owns the
// configurable base URL, the bearer token, and consistent error handling -
// previously AuthContext and PlaceOrderView each hardcoded their own
// 'http://localhost:8000/api' and nothing else in the app called the
// backend at all.
import { supabase } from '@/lib/supabase';

export const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api`;

const TOKEN_STORAGE_KEY = 'rightgo_token';

let authToken: string | null = null;

function loadStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  if (authToken === null) authToken = loadStoredToken();
  return authToken;
}

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window === 'undefined') return;
  try {
    if (token) sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    else sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // sessionStorage unavailable (private mode, etc.) - token still works for this tab's lifetime
  }
}

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

function extractErrorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => (e && typeof e === 'object' && 'msg' in e ? String((e as { msg: unknown }).msg) : JSON.stringify(e))).join(', ');
  }
  return fallback;
}

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: ApiFetchOptions['query']): string {
  const url = new URL(`${API_BASE}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * Core request function. Throws ApiError on any non-2xx response or network
 * failure, so callers can distinguish "server rejected this" (4xx/5xx with a
 * real message) from "couldn't reach the server at all" and show the right
 * message instead of a generic failure.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the RightGo server. Make sure the backend is running.', null);
  }

  // 204 / empty-body responses
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

  if (!res.ok) {
    const detail = data && typeof data === 'object' && 'detail' in data ? (data as { detail: unknown }).detail : data;
    throw new ApiError(res.status, extractErrorMessage(detail, `Request failed (${res.status})`), detail);
  }

  return data as T;
}

async function getSupabaseAuthFallback<T>(): Promise<T | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) return null;

    const user = data.session.user;
    const metadata = user.user_metadata ?? {};
    const role = metadata.role;
    if (!['dispatcher', 'loader', 'driver', 'store_manager'].includes(String(role))) {
      return null;
    }
    return {
      id: user.id,
      username: String(metadata.username ?? metadata.user_name ?? user.email ?? ''),
      email: user.email ?? '',
      role,
      display_name: String(metadata.display_name ?? metadata.full_name ?? metadata.username ?? ''),
      outlet_id: metadata.outlet_id ?? null,
      vehicle_id: metadata.vehicle_id ?? null,
      phone: user.phone ?? metadata.phone ?? null,
    } as T;
  } catch {
    return null;
  }
}

export async function apiGet<T>(
  path: string,
  query?: ApiFetchOptions['query'],
  signal?: AbortSignal,
): Promise<T> {
  try {
    return await apiFetch<T>(path, { method: 'GET', query, signal });
  } catch (error) {
    const isAuthMeRequest = path === '/auth/me' || path === 'auth/me';
    const isNotFoundOrUnavailable =
      error instanceof ApiError && (error.status === 404 || error.status === 0);
    if (!isAuthMeRequest || !isNotFoundOrUnavailable) throw error;

    const fallback = await getSupabaseAuthFallback<T>();
    if (fallback !== null) return fallback;
    return null as T;
  }
}

export const apiPost = <T>(path: string, body?: unknown, query?: ApiFetchOptions['query']) =>
  apiFetch<T>(path, { method: 'POST', body, query });
