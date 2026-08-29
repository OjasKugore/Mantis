'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  display_name: string;
  username: string;
  is_admin: boolean;
}

export interface Persona {
  key: string;
  name: string;
  email: string;
  role: string;
  badge: string;
  avatarColor: string;
  description: string;
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
    badge: '👑 Admin',
    avatarColor: 'from-amber-500 to-rose-600',
    description: 'Full administrative control over users, products, and system settings',
  },
  {
    key: 'carol',
    name: 'Carol Security Lead',
    email: 'carol@mozilla.com',
    role: 'Security Team',
    badge: '🛡️ Security Lead',
    avatarColor: 'from-rose-600 to-pink-600',
    description: 'Access to embargoed zero-day vulnerabilities and CVSS scoring',
  },
  {
    key: 'alice',
    name: 'Alice Developer',
    email: 'alice@mozilla.com',
    role: 'Dev Team',
    badge: '💻 Dev Lead',
    avatarColor: 'from-indigo-600 to-blue-500',
    description: 'Core engine engineering, status transitions, and dependency management',
  },
  {
    key: 'bob',
    name: 'Bob QA Engineer',
    email: 'bob@mozilla.com',
    role: 'QA Team',
    badge: '🧪 QA Automation',
    avatarColor: 'from-emerald-600 to-teal-500',
    description: 'Bug verification, defect triaging, and test suite tracking',
  },
  {
    key: 'eve',
    name: 'Eve Triage Coordinator',
    email: 'eve@mozilla.com',
    role: 'Triage Lead',
    badge: '⚡ Triager',
    avatarColor: 'from-purple-600 to-violet-500',
    description: 'AI defect triaging, priority assignments, and component routing',
  },
];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signup: (payload: { email: string; password: string; display_name: string; username?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  quickLogin: (personaKey: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
        setUser(data);
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

  const login = async (email: string, password = 'password123') => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        return { success: true };
      } else {
        const err = await res.json();
        return { success: false, error: err.message || 'Invalid credentials' };
      }
    } catch (err) {
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
        const userData = await res.json();
        setUser(userData);
        return { success: true };
      } else {
        const err = await res.json();
        return { success: false, error: err.message || 'Signup failed' };
      }
    } catch (err) {
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
    const persona = SEED_PERSONAS.find((p) => p.key === personaKey);
    if (!persona) return { success: false, error: 'Unknown persona' };
    return login(persona.email, 'password123');
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
