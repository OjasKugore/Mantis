'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  GitPullRequest,
  CheckCircle2,
  Clock,
  Layers,
  Filter,
  ArrowRight,
  Sparkles,
  Zap,
  Lock,
  GitCommit,
  Flame,
  Search,
} from 'lucide-react';

interface TabItem {
  id: 'triage' | 'kanban' | 'dag' | 'embargo';
  label: string;
  badge: string;
  icon: string;
}

const TABS: TabItem[] = [
  { id: 'triage', label: 'Triage Queue', badge: 'Sub-50ms', icon: 'view_list' },
  { id: 'kanban', label: 'Kanban State Sync', badge: 'Drag & Drop', icon: 'view_kanban' },
  { id: 'dag', label: 'Topological DAG', badge: "Kahn's CPM", icon: 'account_tree' },
  { id: 'embargo', label: '90-Day Embargo', badge: 'CVSS 4.0', icon: 'security' },
];

export function AppleProductShowcase() {
  const [activeTab, setActiveTab] = useState<'triage' | 'kanban' | 'dag' | 'embargo'>('triage');
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  // Simulated countdown for Embargo tab
  const [seconds, setSeconds] = useState(48);

  useEffect(() => {
    const secTimer = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 59));
    }, 1000);
    return () => clearInterval(secTimer);
  }, []);

  // Auto-cycling timer between tabs
  useEffect(() => {
    if (isPaused) return;

    const interval = 50; // ms
    const totalDuration = 5000; // 5 seconds per tab
    const step = (interval / totalDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveTab((curr) => {
            const nextIdx = (TABS.findIndex((t) => t.id === curr) + 1) % TABS.length;
            return TABS[nextIdx].id;
          });
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [activeTab, isPaused]);

  const handleTabClick = (tabId: 'triage' | 'kanban' | 'dag' | 'embargo') => {
    setActiveTab(tabId);
    setProgress(0);
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="w-full h-full flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden"
    >
      {/* Top App Bar & Showcase Tab Switcher */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between gap-4 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-primary/20 text-emerald-400 border border-primary/40 shadow-xs font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full uppercase tracking-wider font-bold ${
                    isActive ? 'bg-primary/30 text-emerald-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>

                {/* Tab progress indicator */}
                {isActive && !isPaused && (
                  <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-75"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <Link
            href="/login"
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm"
          >
            <span>Live Demo</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 p-4 md:p-6 overflow-hidden relative flex flex-col justify-center bg-radial-gradient from-slate-900 to-slate-950">
        {/* ========================================================================= */}
        {/* TAB 1: TRIAGE QUEUE & MULTI-DIMENSIONAL FILTER */}
        {/* ========================================================================= */}
        {activeTab === 'triage' && (
          <div className="space-y-4 animate-fade-in">
            {/* Filter Pill Controls Bar */}
            <div className="flex items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800 shadow-sm">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono text-[11px]">filter: security-embargo</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active 0-Day (1)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                  Blocker (3)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  P1 High (8)
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 shrink-0">
                <span className="text-emerald-400 font-bold">30</span> defects indexed · <span className="text-slate-300">0.04s</span>
              </div>
            </div>

            {/* Triage Issue Cards */}
            <div className="space-y-2.5">
              {/* Card 1: Embargoed 0-day */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-rose-500/40 hover:border-rose-400 transition shadow-lg flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="px-2 py-1 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold shrink-0 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> BUG #1
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-100 truncate">
                      Necko HTTP/3 connection pool hang on packet loss
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="text-rose-400 font-semibold flex items-center gap-1">
                        <Flame className="w-3 h-3" /> CVSS 9.8 Critical
                      </span>
                      <span>·</span>
                      <span>Core :: Networking</span>
                      <span>·</span>
                      <span className="text-slate-300 font-mono">Carol Security Lead</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase font-mono">
                    87d Embargo
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold uppercase">
                    IN_PROGRESS
                  </span>
                </div>
              </div>

              {/* Card 2: Wayland sync buffer */}
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition shadow-md flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono font-bold shrink-0">
                    BUG #2
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">
                      Wayland compositor frame callback synchronization stutter
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="text-amber-400 font-semibold">Major</span>
                      <span>·</span>
                      <span>Widget :: Gtk</span>
                      <span>·</span>
                      <span className="text-slate-300 font-mono">Dave Perf Lead</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase">
                    RESOLVED
                  </span>
                </div>
              </div>

              {/* Card 3: WebRender raster crash */}
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition shadow-md flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono font-bold shrink-0">
                    BUG #3
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">
                      WebRender texture cache fragmentation during CSS 3D transforms
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="text-rose-400 font-semibold">Blocker</span>
                      <span>·</span>
                      <span>Graphics :: WebRender</span>
                      <span>·</span>
                      <span className="text-slate-300 font-mono">Alice Developer</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold uppercase">
                    CONFIRMED
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: KANBAN BOARD DRAG & DROP SIMULATION */}
        {/* ========================================================================= */}
        {activeTab === 'kanban' && (
          <div className="grid grid-cols-4 gap-3 h-full animate-fade-in">
            {/* Column 1: Unconfirmed */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800">
                <span>Unconfirmed</span>
                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">1</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60 space-y-1">
                <span className="text-[10px] font-mono text-slate-400">#15 · Core</span>
                <div className="text-[11px] font-bold text-slate-200">IndexedDB cursor leak</div>
              </div>
            </div>

            {/* Column 2: Confirmed */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800">
                <span>Confirmed</span>
                <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">2</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60 space-y-1">
                <span className="text-[10px] font-mono text-blue-300">#3 · Graphics</span>
                <div className="text-[11px] font-bold text-slate-200">WebRender texture cache</div>
              </div>
            </div>

            {/* Column 3: In Progress (Active Animated Card) */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex flex-col gap-2 relative">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800">
                <span className="text-amber-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> In Progress
                </span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">1</span>
              </div>

              {/* Animated Floating Card */}
              <div className="p-3 rounded-lg bg-slate-800 border-2 border-emerald-400/80 shadow-xl space-y-1.5 transform hover:scale-105 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-rose-400">#1 · 0-Day</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <div className="text-[11px] font-bold text-slate-100">
                  Necko HTTP/3 connection pool hang
                </div>
                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-emerald-400" /> Auto-syncing status...
                </div>
              </div>
            </div>

            {/* Column 4: Resolved */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800">
                <span className="text-emerald-400">Resolved</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">1</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60 space-y-1">
                <span className="text-[10px] font-mono text-emerald-400">#2 · FIXED</span>
                <div className="text-[11px] font-bold text-slate-200">Wayland frame sync</div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: TOPOLOGICAL DAG & CRITICAL PATH METHOD */}
        {/* ========================================================================= */}
        {activeTab === 'dag' && (
          <div className="h-full flex flex-col justify-between space-y-3 animate-fade-in">
            <div className="flex items-center justify-between text-xs bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold text-[10px] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  CRITICAL PATH EFT: 14.5 DAYS
                </span>
                <span className="text-slate-400 text-[11px]">0 Dependency Cycles Detected</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Kahn&apos;s Topological Sort: O(V + E)</span>
            </div>

            {/* Interactive SVG Flow Diagram */}
            <div className="flex-1 flex items-center justify-center p-2">
              <div className="flex items-center gap-6 w-full justify-center">
                {/* Node 1 */}
                <div className="p-3 rounded-xl bg-slate-900 border-2 border-rose-500 shadow-lg text-center space-y-1 w-36 shrink-0">
                  <span className="text-[10px] font-mono font-bold text-rose-400">BUG #1 (Root)</span>
                  <div className="text-xs font-bold text-slate-100 truncate">HTTP/3 Necko</div>
                  <div className="text-[9px] bg-rose-500/20 text-rose-300 py-0.5 rounded font-mono">
                    Critical Bottleneck
                  </div>
                </div>

                {/* Animated Edge */}
                <div className="flex-1 max-w-[80px] h-0.5 bg-gradient-to-r from-rose-500 to-amber-500 relative flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute" />
                </div>

                {/* Node 2 */}
                <div className="p-3 rounded-xl bg-slate-900 border-2 border-amber-500 shadow-lg text-center space-y-1 w-36 shrink-0">
                  <span className="text-[10px] font-mono font-bold text-amber-400">BUG #4 (Blocked)</span>
                  <div className="text-xs font-bold text-slate-100 truncate">TLS Session Cache</div>
                  <div className="text-[9px] bg-amber-500/20 text-amber-300 py-0.5 rounded font-mono">
                    Depends on #1
                  </div>
                </div>

                {/* Animated Edge */}
                <div className="flex-1 max-w-[80px] h-0.5 bg-gradient-to-r from-amber-500 to-emerald-500 relative flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute" />
                </div>

                {/* Node 3 */}
                <div className="p-3 rounded-xl bg-slate-900 border-2 border-emerald-500 shadow-lg text-center space-y-1 w-36 shrink-0">
                  <span className="text-[10px] font-mono font-bold text-emerald-400">BUG #7 (Target)</span>
                  <div className="text-xs font-bold text-slate-100 truncate">Release Milestone</div>
                  <div className="text-[9px] bg-emerald-500/20 text-emerald-300 py-0.5 rounded font-mono">
                    Ready on #4 Fix
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-[11px] text-slate-400 font-mono">
              ⚡ Topological scheduling automatically orders tasks to maximize parallel developer throughput.
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: 90-DAY EMBARGO & CVSS 4.0 RADAR */}
        {/* ========================================================================= */}
        {activeTab === 'embargo' && (
          <div className="space-y-4 animate-fade-in">
            {/* Live Embargo Countdown Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border border-rose-500/50 shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-rose-300 uppercase tracking-wider font-mono flex items-center gap-2">
                    Confidential Security Embargo Active
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-[10px]">Zero-Leakage</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Restricted strictly to <strong className="text-slate-200">security-team</strong> · CVE Quarantine
                  </div>
                </div>
              </div>

              {/* Ticking Counter */}
              <div className="font-mono text-right shrink-0">
                <div className="text-lg md:text-xl font-extrabold text-rose-400 tracking-wider">
                  87d 14h 22m {seconds}s
                </div>
                <div className="text-[10px] text-slate-400 uppercase">Remaining Until Public Release</div>
              </div>
            </div>

            {/* CVSS Threat Assessment & SCM Traceability Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">CVSS v4.0 Threat Matrix</span>
                  <span className="px-2 py-0.5 rounded bg-rose-500 text-white font-mono font-bold text-[10px]">
                    9.8 CRITICAL
                  </span>
                </div>
                <p className="font-mono text-[10px] text-slate-400 break-all">
                  CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N
                </p>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Timing-Safe 404 Guardrails Enforced
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <GitPullRequest className="w-3.5 h-3.5 text-primary" /> SCM Webhook Trace
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                    AUTO-LINKED
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
                  <GitCommit className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">a1f89c42b03</span>
                  <span className="text-slate-400 truncate">Fixes #1: Refactor Necko pool</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  By <strong className="text-slate-200">Alice Developer</strong> via GitHub Webhook
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
