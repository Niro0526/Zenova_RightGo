'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost, apiGet, setAuthToken, ApiError } from '@/lib/api/client';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'dispatcher' | 'loader' | 'driver' | 'store_manager';
  display_name: string;
  outlet_id?: string | null;
  vehicle_id?: string | null;
  phone?: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; homeRoute?: string }>;
  logout: () => void;
}

const ROLE_HOME_ROUTES: Record<UserProfile['role'], string> = {
  dispatcher: '/dispatcher',
  loader: '/loader',
  driver: '/driver',
  store_manager: '/store-manager',
};

function getRoleHomeRoute(role: unknown): string | null {
  if (typeof role !== 'string' || !(role in ROLE_HOME_ROUTES)) return null;
  return ROLE_HOME_ROUTES[role as UserProfile['role']];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore the session from the server, not from whatever a stored
    // profile object claims - a stale/tampered sessionStorage profile must
    // never be trusted as an authenticated identity.
    (async () => {
      try {
        const storedUser = sessionStorage.getItem('rightgo_user');
        const storedToken = sessionStorage.getItem('rightgo_token');
        if (storedUser && storedToken) {
          setAuthToken(storedToken);
          const profile = await apiGet<UserProfile>('/auth/me');
          setUser(profile);
          sessionStorage.setItem('rightgo_user', JSON.stringify(profile));
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // The server says this session is invalid/expired - clear it rather than keep a stale profile.
          setAuthToken(null);
          try {
            sessionStorage.removeItem('rightgo_user');
            sessionStorage.removeItem('rightgo_token');
          } catch {}
        } else {
          // Could not reach the server (offline, request interrupted by a reload, 5xx): that says nothing
          // about the session, so the driver must not be logged out for it. Keep the token and show the
          // stored profile; every API call is still verified server-side.
          try {
            const stored = sessionStorage.getItem('rightgo_user');
            if (stored) setUser(JSON.parse(stored) as UserProfile);
          } catch {}
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await apiPost<{ access_token: string; home_route: string; profile: UserProfile }>('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      const homeRoute = getRoleHomeRoute(data.profile?.role);
      if (!homeRoute) {
        return { success: false, error: 'Your account has no valid workspace role.' };
      }
      setUser(data.profile);
      setAuthToken(data.access_token);
      sessionStorage.setItem('rightgo_user', JSON.stringify(data.profile));
      sessionStorage.setItem('rightgo_token', data.access_token);
      return { success: true, homeRoute };
    } catch (err) {
      if (err instanceof ApiError) return { success: false, error: err.message };
      return { success: false, error: 'Cannot reach server. Make sure the backend is running on port 8000.' };
    }
  };

  const logout = () => {
    // Best-effort server-side session invalidation - the client state clears
    // regardless of whether this call succeeds (e.g. backend unreachable).
    apiPost('/auth/logout').catch(() => {});
    setUser(null);
    setAuthToken(null);
    try {
      sessionStorage.removeItem('rightgo_user');
      sessionStorage.removeItem('rightgo_token');
    } catch {}
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
