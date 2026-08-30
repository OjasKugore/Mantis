'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  display_name: string;
  username: string;
  is_admin: boolean;
  avatar_url?: string;
  groups?: string[];
  priority_rank?: number;
  onboarded?: boolean;
  team_name?: string;
}

export interface Persona {
  key: string;
  name: string;
  email: string;
  role: string;
  badge: string;
  avatarColor: string;
  description: string;
  icon?: React.ReactNode;
}

export function isDemoUser(user: User | null): boolean {
  if (!user) return false;
  return user.email.endsWith('@mozilla.com') || user.email === 'admin@mantis.local';
}

export const SEED_PERSONAS: Persona[] = [
  {
    key: 'admin',
    name: 'System Administrator',
    email: 'admin@mantis.local',
    role: 'Admin',
    badge: 'Admin',
    avatarColor: 'from-amber-500 to-rose-600',
    description: 'Full administrative control over users, products, and system settings',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
  },
  {
    key: 'carol',
    name: 'Carol Security Lead',
    email: 'carol@mozilla.com',
    role: 'Security Team',
    badge: 'Security Lead',
    avatarColor: 'from-rose-600 to-pink-600',
    description: 'Access to embargoed zero-day vulnerabilities and CVSS scoring',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
  },
  {
    key: 'alice',
    name: 'Alice Developer',
    email: 'alice@mozilla.com',
    role: 'Dev Team',
    badge: 'Dev Lead',
    avatarColor: 'from-indigo-600 to-blue-500',
    description: 'Core engine engineering, status transitions, and dependency management',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
  },
  {
    key: 'bob',
    name: 'Bob QA Engineer',
    email: 'bob@mozilla.com',
    role: 'QA Team',
    badge: 'QA Automation',
    avatarColor: 'from-emerald-600 to-teal-500',
    description: 'Bug verification, defect triaging, and test suite tracking',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
  },
  {
    key: 'eve',
    name: 'Eve Triage Coordinator',
    email: 'eve@mozilla.com',
    role: 'Triage Lead',
    badge: 'Triager',
    avatarColor: 'from-purple-600 to-violet-500',
    description: 'AI defect triaging, priority assignments, and component routing',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
  },
];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (payload: { email: string; password: string; display_name: string; username?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  quickLogin: (personaKey: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user || data);
        return { success: true };
      } else {
        const err = await res.json();
        return { success: false, error: err.message || 'Invalid credentials' };
      }
    } catch {
      return { success: false, error: 'Network error connecting to auth server' };
    }
  };

  const signup = async (payload: { email: string; password: string; display_name: string; username?: string }) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user || data);
        return { success: true };
      } else {
        const err = await res.json();
        return { success: false, error: err.message || 'Signup failed' };
      }
    } catch {
      return { success: false, error: 'Network error during signup' };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore
    } finally {
      setUser(null);
    }
  };

  const quickLogin = async (personaKey: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/quick-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ persona: personaKey }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user || data);
        return { success: true };
      } else {
        const err = await res.json();
        return { success: false, error: err.message || 'Quick login failed' };
      }
    } catch {
      return { success: false, error: 'Network error connecting to auth server' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, quickLogin, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
