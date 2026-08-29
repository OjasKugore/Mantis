'use client';

import React, { useState } from 'react';
import { DependencyGraph } from '@/components/DependencyGraph';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth, SEED_PERSONAS } from '@/lib/auth-context';
import Link from 'next/link';

interface Props {
  params: { id: string };
}

export default function BugGraphPage({ params }: Props) {
  const bugId = Number(params.id);
  const { user, quickLogin, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md antialiased flex flex-col selection:bg-primary-container selection:text-on-primary-container">
      {/* Top Header Bar Matching Website Template */}
      <header className="bg-background border-b border-outline-variant/30 flex justify-between items-center px-6 sm:px-10 py-4 w-full z-20 shrink-0">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center text-on-primary-container font-headline-md shadow-sm shrink-0">
              <span className="text-sm font-bold">M</span>
            </div>
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
          <div className="relative">
            <div
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container font-bold flex items-center justify-center border border-outline-variant/50 cursor-pointer hover:ring-2 ring-primary/30 transition-all text-xs select-none"
              title="Switch Persona / Account"
            >
              {user ? user.display_name.charAt(0).toUpperCase() : 'U'}
            </div>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-3 w-72 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-2xl p-4 z-50 animate-fade-in-up space-y-3">
                <div className="border-b border-outline-variant/20 pb-2">
                  <div className="font-bold text-sm text-on-surface font-headline-sm">
                    {user ? user.display_name : 'Guest User'}
                  </div>
                  <div className="text-xs text-on-surface-variant font-mono truncate">
                    {user ? user.email : 'not logged in'}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 font-label-caps">
                    1-Click Fast Persona Switch
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                    {SEED_PERSONAS.map((p) => (
                      <button
                        key={p.key}
                        onClick={async () => {
                          await quickLogin(p.key);
                          setProfileDropdownOpen(false);
                        }}
                        className="text-left px-2 py-1.5 rounded bg-surface-container-low hover:bg-primary-container/20 text-[11px] font-medium transition"
                      >
                        <div className="font-bold truncate text-on-surface">{p.name.split(' ')[0]}</div>
                        <div className="text-[9px] text-on-surface-variant font-mono">{p.badge}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between">
                  <Link
                    href="/login"
                    className="text-xs text-primary font-bold hover:underline font-label-caps uppercase"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    Sign In
                  </Link>
                  <button
                    onClick={async () => {
                      await logout();
                      setProfileDropdownOpen(false);
                    }}
                    className="text-xs text-error font-bold hover:underline font-label-caps uppercase"
                  >
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
