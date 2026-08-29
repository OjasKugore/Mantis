'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, SEED_PERSONAS } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, quickLogin, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await login(email, password);
    setSubmitting(false);

    if (res.success) {
      router.push('/');
    } else {
      setError(res.error || 'Failed to authenticate');
    }
  };

  const handlePersonaLogin = async (key: string) => {
    setSubmitting(true);
    setError(null);

    const res = await quickLogin(key);
    setSubmitting(false);

    if (res.success) {
      router.push('/');
    } else {
      setError(res.error || 'Persona login failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-rose-500 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            BZ
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-white">
            Bugzilla<span className="text-indigo-400">Revamp</span>
          </span>
        </Link>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Sign in to your account</h2>
        <p className="mt-1 text-sm text-slate-400">
          Or{' '}
          <Link href="/signup" className="font-semibold text-indigo-400 hover:text-indigo-300 transition">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl space-y-8">
        {/* 1-Click Seed Persona Matrix */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>⚡ 1-Click Fast Persona Switcher</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/80 font-mono">
                  Instant Access
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Click any seeded role to immediately authenticate and test permissions:</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SEED_PERSONAS.map((persona) => {
              const isCurrent = user?.email.toLowerCase() === persona.email.toLowerCase();
              return (
                <button
                  key={persona.key}
                  onClick={() => handlePersonaLogin(persona.key)}
                  disabled={submitting}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 group relative ${
                    isCurrent
                      ? 'bg-indigo-950/60 border-indigo-600/80 shadow-md shadow-indigo-900/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/90'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${persona.avatarColor} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md`}>
                    {persona.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 truncate">
                        {persona.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">{persona.badge}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block font-mono truncate">{persona.email}</span>
                    <span className="text-[11px] text-slate-400 block line-clamp-1 mt-1 leading-snug">
                      {persona.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Standard Email / Password Form */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Or Sign In With Custom Credentials
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleManualLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm text-white transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
