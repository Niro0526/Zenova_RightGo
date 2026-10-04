'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

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
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; homeRoute?: string }>;
  logout: () => void;
}

const API_BASE = 'http://localhost:8000/api';
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
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('rightgo_user');
      const storedToken = sessionStorage.getItem('rightgo_token');
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      }
    } catch {}
    finally { setIsLoading(false); }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.detail;
        const errorMsg =
          typeof detail === 'string'
            ? detail
            : Array.isArray(detail)
            ? detail.map((e: any) => e.msg ?? JSON.stringify(e)).join(', ')
            : 'Invalid credentials.';
        return { success: false, error: errorMsg };
      }
      setUser(data.profile);
      setToken(data.access_token);
      sessionStorage.setItem('rightgo_user', JSON.stringify(data.profile));
      sessionStorage.setItem('rightgo_token', data.access_token);
      const homeRoute = getRoleHomeRoute(data.profile?.role);
      if (!homeRoute) {
        setUser(null);
        setToken(null);
        sessionStorage.removeItem('rightgo_user');
        sessionStorage.removeItem('rightgo_token');
        return { success: false, error: 'Your account has no valid workspace role.' };
      }
      return { success: true, homeRoute };
    } catch {
      return { success: false, error: 'Cannot reach server. Make sure the backend is running on port 8000.' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('rightgo_user');
    sessionStorage.removeItem('rightgo_token');
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
