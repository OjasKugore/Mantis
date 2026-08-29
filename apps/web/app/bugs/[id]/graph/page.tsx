'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DependencyGraph } from '@/components/DependencyGraph';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth, SEED_PERSONAS } from '@/lib/auth-context';
import { MantisLogo } from '@/components/MantisLogo';
import Link from 'next/link';

interface Props {
  params: { id: string };
}

export default function BugGraphPage({ params }: Props) {
  const bugId = Number(params.id);
  const router = useRouter();
  const profileRef = useRef<HTMLDivElement>(null);
  const { user, quickLogin, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  const handleLogout = async () => {
    await logout();
    setProfileDropdownOpen(false);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md antialiased flex flex-col selection:bg-primary-container selection:text-on-primary-container">
      {/* Top Header Bar Matching Website Template */}
      <header className="bg-background border-b border-outline-variant/30 flex justify-between items-center px-6 sm:px-10 py-4 w-full z-20 shrink-0">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <MantisLogo className="w-8 h-8 rounded-lg shadow-sm shrink-0" size={32} />
          </Link>
          <div className="flex items-center text-sm font-body-sm text-on-surface-variant gap-2">
            <Link href="/dashboard" className="hover:text-primary transition-colors font-medium">
              Dashboard
            </Link>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <Link href={`/bugs/${bugId}`} className="hover:text-primary transition-colors">
              Bug #{bugId}
            </Link>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-on-surface font-bold">Dependency DAG</span>
          </div>
        </div>

        {/* Center/Right Actions & Profile */}
        <div className="flex items-center gap-4 relative">
          <Link
            href={`/bugs/${bugId}`}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold font-label-caps uppercase bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface rounded-xl transition shadow-sm"
          >
            ← Back to Bug Workspace
          </Link>

          <div className="flex items-center gap-2 border-r border-outline-variant/30 pr-4">
            <NotificationBell />
          </div>

          {/* Administrative Persona Switcher / Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <div
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container font-bold flex items-center justify-center border border-outline-variant/50 cursor-pointer hover:ring-2 ring-primary/30 transition-all text-xs select-none"
              title="Switch Persona / Account"
            >
              {user ? user.display_name.charAt(0).toUpperCase() : 'U'}
            </div>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-5 z-[999] animate-fade-in-up space-y-4 ring-1 ring-black/10">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                      {user ? user.display_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {user ? user.display_name : 'Guest User'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                        {user ? user.email : 'not logged in'}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 font-label-caps flex items-center justify-between">
                    <span>⚡ Fast Persona Switcher</span>
                    <span className="text-[9px] font-mono text-primary font-bold">1-Click</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {SEED_PERSONAS.map((p) => {
                      const isCurrent = user?.email.toLowerCase() === p.email.toLowerCase();
                      return (
                        <button
                          key={p.key}
                          onClick={async () => {
                            await quickLogin(p.key);
                            setProfileDropdownOpen(false);
                          }}
                          className={`text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between border ${
                            isCurrent
                              ? 'bg-primary-container/20 border-primary text-primary font-bold shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-700/60 hover:border-primary/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-bold truncate">{p.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono shrink-0 ml-2">
                            {p.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Link
                    href="/login"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="text-xs text-slate-600 dark:text-slate-300 font-bold hover:text-primary font-label-caps uppercase transition-colors"
                  >
                    Switch Account
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold font-label-caps uppercase transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">logout</span>
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-6">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[32px]">hub</span>
              <span>Critical Path DAG &amp; Blocker Matrix</span>
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-primary-container text-on-primary-container">
                Bug #{bugId}
              </span>
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1 opacity-80">
              Interactive topological dependency network, critical bottleneck paths, and cycle-protected blocker mutations.
            </p>
          </div>

          <Link
            href={`/bugs/${bugId}`}
            className="sm:hidden inline-flex items-center justify-center px-4 py-2 text-xs font-bold font-label-caps uppercase bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface rounded-xl transition shadow-sm"
          >
            ← Back to Bug Workspace
          </Link>
        </div>

        {/* Legend & Instructions */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-body-sm text-on-surface-variant px-1">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-0.5 bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
              <span className="text-red-700 font-semibold">Critical Bottleneck Path</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-0.5 bg-slate-400" />
              <span>Standard Blocker Edge</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded border-2 border-red-500 bg-red-50" />
              <span>Critical Node (Zero Slack)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded border-2 border-primary bg-primary-container/20" />
              <span>Active Bug Root</span>
            </div>
          </div>

          <div className="text-[11px] text-on-surface-variant/70 font-mono">
            Click any node in graph to inspect or unlink dependency
          </div>
        </div>

        {/* Graph Component */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-4 shadow-xl">
          <DependencyGraph bugId={bugId} />
        </div>
      </main>
    </div>
  );
}
