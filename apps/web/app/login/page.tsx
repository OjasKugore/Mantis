'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { MantisLogo } from '@/components/MantisLogo';

const PERSONAS = [
  {
    key: 'admin',
    name: 'System',
    role: 'Admin',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    ),
  },
  {
    key: 'carol',
    name: 'Carol',
    role: 'Security Lead',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    ),
  },
  {
    key: 'alice',
    name: 'Alice',
    role: 'Dev Lead',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    ),
  },
  {
    key: 'bob',
    name: 'Bob',
    role: 'QA Automation',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    ),
  },
  {
    key: 'eve',
    name: 'Eve',
    role: 'Triager',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    ),
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, quickLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<string>('alice');
  const [launchingPersona, setLaunchingPersona] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  const handleOAuthLogin = (provider: 'github' | 'google') => {
    window.location.href = `${apiBase}/api/v1/oauth/${provider}`;
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await login(email, password);
    setSubmitting(false);

    if (res.success) {
      router.push('/dashboard');
    } else {
      setError(res.error || 'Failed to authenticate');
    }
  };

  const handleLaunchDemo = async (personaKey = selectedPersona) => {
    setLaunchingPersona(personaKey);
    setError(null);

    const res = await quickLogin(personaKey);
    setLaunchingPersona(null);

    if (res.success) {
      router.push('/dashboard');
    } else {
      setError(res.error || 'Persona login failed');
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col justify-center py-12 px-6 lg:px-8 relative selection:bg-primary-container selection:text-on-primary-container font-body-sm">
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-96 bg-gradient-to-br from-primary-container/20 via-transparent to-secondary/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 animate-fade-in-up">
        <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
          <MantisLogo className="w-10 h-10 group-hover:scale-105 transition-transform" size={40} />
          <span className="font-display-lg text-2xl font-bold tracking-tighter text-on-surface">
            Mantis
          </span>
        </Link>
        <h1 className="font-display-lg text-3xl font-bold tracking-tight text-on-surface">
          Sign in to your command center
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Sign in for a clean workspace, or use the 1-click{' '}
          <span className="font-bold text-primary">Judge Demo Sandbox</span> below.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto w-full max-w-5xl space-y-8 relative z-10 animate-fade-in-up delay-100">
        {/* Main Auth Card */}
        <div className="glass-panel bg-surface-container/70 border border-outline-variant/30 rounded-2xl p-8 shadow-2xl backdrop-blur-xl space-y-6 max-w-xl mx-auto">
          {/* OAuth Buttons Section */}
          <div className="space-y-3">
            <button
              onClick={() => handleOAuthLogin('github')}
              type="button"
              className="w-full py-3 px-4 rounded-lg bg-on-surface text-surface-container-lowest font-label-caps text-label-caps uppercase font-bold hover:bg-on-surface/90 transition-all flex items-center justify-center gap-3 shadow-md glow-active"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              Continue with GitHub
            </button>

            <button
              onClick={() => handleOAuthLogin('google')}
              type="button"
              className="w-full py-3 px-4 rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/30 font-label-caps text-label-caps uppercase font-bold hover:bg-surface-container-high transition-all flex items-center justify-center gap-3 shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-outline-variant/30 w-full" />
            <span className="bg-surface-container px-3 text-[11px] font-label-caps uppercase font-bold text-on-surface-variant tracking-wider absolute">
              Or with credentials
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-error-container text-on-error-container border border-error/20 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleManualLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1 font-label-caps uppercase">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@mantis.io"
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1 font-label-caps uppercase">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full py-3 px-4 rounded-lg bg-primary-container text-on-primary-container hover:bg-opacity-90 disabled:opacity-50 font-label-caps text-label-caps uppercase font-bold transition shadow-md flex items-center justify-center gap-2"
            >
              {submitting ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Hackathon Judge Demo Hub (Matching Landing Page) */}
        <div className="w-full bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-slate-100 flex flex-col relative text-left">
          {/* Subtle brand top bar */}
          <div className="h-2 w-full bg-[#4a5e3a]" />
          <div className="p-6 sm:p-8 md:p-10">
            {/* HeaderSection */}
            <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
              {/* Title and Description */}
              <div className="flex-1">
                <div className="flex items-center flex-wrap gap-3 mb-3">
                  {/* Lightning Icon */}
                  <svg className="w-5 h-5 text-[#87a96b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                  <h2 className="text-sm sm:text-base font-bold tracking-widest uppercase text-slate-900 font-label-caps">
                    Hackathon Evaluator Quick Access
                  </h2>
                  {/* Badge */}
                  <span className="bg-[#f1f5ee] text-[#4a5e3a] text-xs font-semibold px-3 py-1 rounded-full border border-[#87a96b]/20 font-mono">
                    Pre-Seeded Dataset
                  </span>
                </div>
                <p className="text-slate-500 text-sm sm:text-base max-w-3xl leading-relaxed">
                  Select a persona to test role-based access control (RBAC), embargoes, and dependency graphs:
                </p>
              </div>
              {/* CTA Button */}
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => handleLaunchDemo(selectedPersona)}
                  disabled={launchingPersona !== null}
                  className="w-full md:w-auto bg-[#87a96b] hover:bg-[#76975a] text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-sm shadow-[#87a96b]/20 focus:outline-none focus:ring-2 focus:ring-[#87a96b] focus:ring-offset-2 font-label-caps uppercase cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                  {launchingPersona ? 'Launching...' : 'Launch Judge Demo'}
                </button>
              </div>
            </header>

            {/* Subtle Divider */}
            <div className="h-px w-full bg-slate-100 mb-8" />

            {/* PersonaGrid */}
            <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {PERSONAS.map((p) => {
                const isSelected = selectedPersona === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setSelectedPersona(p.key)}
                    onDoubleClick={() => handleLaunchDemo(p.key)}
                    disabled={launchingPersona !== null}
                    className={`group rounded-xl p-5 text-center flex flex-col justify-center items-center h-32 transition-all duration-200 focus:outline-none cursor-pointer ${
                      isSelected
                        ? 'border-2 border-[#87a96b] bg-white shadow-sm ring-2 ring-[#87a96b]/20'
                        : 'border border-slate-200 bg-white hover:border-[#87a96b]/60 hover:shadow-sm'
                    }`}
                  >
                    <h3
                      className={`font-bold text-lg mb-2 transition-colors ${
                        isSelected ? 'text-[#4a5e3a]' : 'text-slate-800 group-hover:text-[#4a5e3a]'
                      }`}
                    >
                      {p.name}
                    </h3>
                    <div
                      className={`flex items-center gap-2 transition-colors ${
                        isSelected ? 'text-[#4a5e3a]' : 'text-slate-500'
                      }`}
                    >
                      {p.icon}
                      <span className="text-sm font-medium font-mono tracking-tight">{p.role}</span>
                    </div>
                  </button>
                );
              })}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
