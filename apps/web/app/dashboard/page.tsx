'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DependencyGraph } from '@/components/DependencyGraph';
import { EmbargoCountdown } from '@/components/EmbargoCountdown';
import { NotificationBell } from '@/components/NotificationBell';
import { AnalyticsBurndown } from '@/components/AnalyticsBurndown';
import { KanbanBoard, KanbanBug } from '@/components/KanbanBoard';
import { useAuth, SEED_PERSONAS, isDemoUser } from '@/lib/auth-context';
import { BugStatus } from '@mantis/shared';
import { applyBugStatusChange } from '@/lib/status-transition';
import { MantisLogo } from '@/components/MantisLogo';

interface BugItem {
  id: number;
  summary: string;
  status: string;
  priority: string;
  severity: string;
  product_name?: string;
  component_name?: string;
  is_embargoed?: boolean;
  embargo_until?: string;
  cvss_score?: number;
  cvss_severity?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, quickLogin, logout } = useAuth();
  const profileRef = useRef<HTMLDivElement>(null);
  const [bugs, setBugs] = useState<BugItem[]>([]);
  const [selectedBugId, setSelectedBugId] = useState<number>(1);
  const [apiOnline, setApiOnline] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'queue' | 'graph' | 'analytics' | 'governance'>('queue');
  const [queueViewMode, setQueueViewMode] = useState<'list' | 'kanban'>('list');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

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

  useEffect(() => {
    // Health check
    fetch('/health')
      .then((res) => (res.ok ? setApiOnline(true) : setApiOnline(false)))
      .catch(() => setApiOnline(false));

    // Fetch bugs with scope
    const scopeParam = user && !isDemoUser(user) ? '?scope=user&limit=50' : '?limit=50';
    fetch(`/api/v1/bugs${scopeParam}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.bugs) {
          setBugs(data.bugs);
          if (data.bugs.length > 0) {
            setSelectedBugId(Number(data.bugs[0].id));
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const filteredBugs = bugs.filter(
    (b) =>
      b.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toString().includes(searchQuery) ||
      b.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.priority.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredBugs.length / pageSize) || 1;
  const paginatedBugs = filteredBugs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-primary-container/15 text-primary-fixed-dim border-primary/20';
      case 'RESOLVED':
        return 'bg-surface-variant text-on-surface-variant border-outline-variant/30';
      case 'IN_PROGRESS':
        return 'bg-tertiary-container/20 text-tertiary border-tertiary/20';
      case 'CONFIRMED':
        return 'bg-secondary-container/30 text-secondary border-secondary/20';
      case 'UNCONFIRMED':
        return 'bg-surface-container-high text-on-surface-variant border-outline-variant/20';
      default:
        return 'bg-surface-container text-on-surface-variant border-outline-variant/20';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'P1':
        return 'bg-error-container/40 text-error border-error/20';
      case 'P2':
        return 'bg-tertiary/10 text-tertiary';
      case 'P3':
        return 'bg-tertiary-container/20 text-tertiary-container';
      default:
        return 'bg-surface-variant/40 text-on-surface-variant';
    }
  };

  return (
    <div className="bg-background text-on-surface font-body-md antialiased h-screen overflow-hidden flex selection:bg-primary-container selection:text-on-primary-container">
      {/* SideNavBar */}
      <nav
        className={`bg-surface-container-low shadow-sm h-screen ${
          sidebarOpen ? 'w-64' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'
        } flex flex-col py-margin-sm px-4 gap-gutter shrink-0 border-r border-outline-variant/20 z-20 transition-all duration-300 overflow-hidden`}
        id="sidebar"
      >
        {/* Brand / Header */}
        <div className="flex items-center gap-3 px-2 py-4">
          <Link href="/" className="flex items-center gap-3">
            <MantisLogo className="w-8 h-8 rounded-lg shadow-sm shrink-0" size={32} />
            {sidebarOpen && (
              <div>
                <h1 className="font-headline-md text-headline-md font-bold text-primary leading-none text-xl">
                  Mantis
                </h1>
                <p className="font-label-caps text-label-caps text-on-surface-variant mt-1 opacity-80">
                  V3.0 Platform
                </p>
              </div>
            )}
          </Link>
        </div>

        {/* CTA */}
        <Link
          href="/bugs/new"
          className="w-full bg-primary-container hover:bg-opacity-90 text-on-primary-container font-label-caps text-label-caps py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm mt-2 font-bold uppercase tracking-wider"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {sidebarOpen && 'Report Bug'}
        </Link>

        {/* Main Navigation */}
        <div className="flex-1 flex flex-col gap-1 mt-4 overflow-y-auto">
          {sidebarOpen && (
            <div className="px-3 py-2 text-label-caps font-label-caps text-on-surface-variant/60 uppercase tracking-wider">
              Dashboard
            </div>
          )}
          <div className="flex flex-col gap-1 pl-1">
            <button
              onClick={() => {
                setActiveTab('queue');
                setQueueViewMode('list');
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group ${
                activeTab === 'queue' && queueViewMode === 'list'
                  ? 'text-primary font-bold border-r-4 border-primary bg-surface-bright shadow-sm'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-variant/20'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">list_alt</span>
              {sidebarOpen && (
                <span className="font-label-caps text-label-caps tracking-wide uppercase">
                  Bug Queue
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('queue');
                setQueueViewMode('kanban');
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group ${
                activeTab === 'queue' && queueViewMode === 'kanban'
                  ? 'text-primary font-bold border-r-4 border-primary bg-surface-bright shadow-sm'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-variant/20'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
                view_kanban
              </span>
              {sidebarOpen && (
                <span className="font-label-caps text-label-caps tracking-wide uppercase">
                  Kanban Board
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('graph')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group ${
                activeTab === 'graph'
                  ? 'text-primary font-bold border-r-4 border-primary bg-surface-bright shadow-sm'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-variant/20'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
                hub
              </span>
              {sidebarOpen && (
                <span className="font-label-caps text-label-caps tracking-wide uppercase">
                  Dependency Graph
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group ${
                activeTab === 'analytics'
                  ? 'text-primary font-bold border-r-4 border-primary bg-surface-bright shadow-sm'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-variant/20'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
                trending_down
              </span>
              {sidebarOpen && (
                <span className="font-label-caps text-label-caps tracking-wide uppercase">
                  Sprint Burndown
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('governance')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group ${
                activeTab === 'governance'
                  ? 'text-primary font-bold border-r-4 border-primary bg-surface-bright shadow-sm'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-variant/20'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
                security
              </span>
              {sidebarOpen && (
                <span className="font-label-caps text-label-caps tracking-wide uppercase">
                  Governance
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-auto pt-4 border-t border-outline-variant/20 flex flex-col gap-1">
          <a
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-variant/20 transition-colors group"
            href="http://localhost:3001/docs"
            target="_blank"
            rel="noreferrer"
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
            {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Docs &amp; Support</span>}
          </a>
          <Link
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-variant/20 transition-colors group"
            href="/login"
          >
            <span className="material-symbols-outlined text-[20px]">account_circle</span>
            {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Switch Account</span>}
          </Link>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TopNavBar */}
        <header className="bg-background border-b border-outline-variant/30 flex justify-between items-center px-margin-lg py-4 w-full z-10 shrink-0">
          {/* Left: Menu Trigger / Breadcrumbs */}
          <div className="flex items-center gap-4">
            <button
              className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center p-1 rounded-md hover:bg-surface-container"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Toggle Sidebar"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="hidden sm:flex items-center text-sm font-body-sm text-on-surface-variant gap-2">
              <Link href="/" className="hover:text-primary cursor-pointer transition-colors">
                Mantis
              </Link>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <span className="text-on-surface font-medium capitalize">
                {activeTab === 'queue' ? 'Bug Queue' : activeTab === 'graph' ? 'Dependency Graph' : 'Governance'}
              </span>
            </div>
          </div>

          {/* Center: Top Nav Links */}
          <nav className="hidden lg:flex items-center gap-6">
            <Link
              className="text-on-surface-variant hover:text-primary transition-all font-body-sm text-body-sm cursor-pointer opacity-80 hover:opacity-100"
              href="/dashboard"
            >
              Dashboard
            </Link>
          </nav>

          {/* Right: Actions & Profile */}
          <div className="flex items-center gap-4 relative">
            {/* Mode Badge */}
            {user && !isDemoUser(user) ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface text-xs font-bold font-label-caps border border-outline-variant/30 shadow-xs">
                <span className="material-symbols-outlined text-[14px] text-primary">verified</span>
                Clean Workspace
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container/30 text-primary text-xs font-bold font-label-caps border border-primary/20 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                Judge Demo Sandbox
              </span>
            )}

            <div className="flex items-center gap-2 border-r border-outline-variant/30 pr-4">
              <NotificationBell />
            </div>

            {/* Profile Avatar / Dropdown Trigger */}
            <div className="relative" ref={profileRef}>
              <div
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container font-bold flex items-center justify-center border border-outline-variant/50 cursor-pointer hover:ring-2 ring-primary/30 transition-all text-xs"
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

        {/* Main Canvas */}
        <main className="flex-1 overflow-y-auto p-4 md:p-margin-lg lg:px-12 bg-background flex flex-col gap-6 relative">
          {activeTab === 'queue' && (
            <>
              {/* Page Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
                <div>
                  <h2 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-[32px]">
                      {queueViewMode === 'kanban' ? 'view_kanban' : 'inventory_2'}
                    </span>
                    {queueViewMode === 'kanban' ? 'Kanban Board' : 'Master Bug Queue'}
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-2xl opacity-80">
                    {queueViewMode === 'kanban'
                      ? 'Drag and drop cards across columns to update triage status in real time.'
                      : 'Sourced from the PostgreSQL master seed dataset. Review, triage, and assign issues to the engineering graph.'}
                  </p>
                </div>

                {/* Filter/Search Bar & View Toggle */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full md:w-64">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[18px]">
                      search
                    </span>
                    <input
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-9 pr-4 py-2 bg-surface-container-lowest border border-outline-variant/50 rounded-lg font-body-sm text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all shadow-sm placeholder:text-on-surface-variant/40 text-on-surface"
                      placeholder="Search issues..."
                      type="text"
                    />
                  </div>
                  <button
                    onClick={() => setSearchQuery('')}
                    title="Clear filter"
                    className="p-2 bg-surface-container-lowest border border-outline-variant/50 rounded-lg text-on-surface-variant hover:text-primary hover:border-primary/50 transition-colors shadow-sm flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[20px]">filter_list</span>
                  </button>

                  <div className="flex bg-surface-container-lowest rounded-lg p-0.5 border border-outline-variant/30 shadow-xs">
                    <button
                      onClick={() => setQueueViewMode('list')}
                      className={`px-3 py-1 rounded-md font-body-sm text-body-sm transition-all ${
                        queueViewMode === 'list'
                          ? 'bg-surface-container-high text-on-surface font-semibold shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Queue
                    </button>
                    <button
                      onClick={() => setQueueViewMode('kanban')}
                      className={`px-3 py-1 rounded-md font-body-sm text-body-sm transition-all ${
                        queueViewMode === 'kanban'
                          ? 'bg-surface-container-high text-on-surface font-semibold shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Kanban
                    </button>
                  </div>
                </div>
              </div>

              {queueViewMode === 'kanban' ? (
                <div className="flex-1 w-full min-w-0 min-h-[500px]">
                  <KanbanBoard
                    initialBugs={bugs as any}
                    filterQuery={searchQuery}
                    onStatusChange={async (bugId, newStatus) => {
                      const currentBug = bugs.find((b) => b.id === bugId);
                      const currentStatus = (currentBug?.status || 'UNCONFIRMED') as BugStatus;
                      await applyBugStatusChange(bugId, currentStatus, newStatus);
                      setBugs((prev) =>
                        prev.map((b) => (b.id === bugId ? { ...b, status: newStatus } : b))
                      );
                    }}
                  />
                </div>
              ) : (
                /* Bento-style Data Container */
                <div className="bg-surface-container-lowest rounded-xl shadow-[0_4px_24px_rgba(135,169,107,0.03)] border border-outline-variant/20 overflow-hidden flex flex-col flex-1 max-h-[800px]">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-surface-container-low/50 border-b border-outline-variant/20 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest sticky top-0 z-10 backdrop-blur-sm">
                    <div className="col-span-1">ID</div>
                    <div className="col-span-5">Summary</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-1">Priority</div>
                    <div className="col-span-1">Severity</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>

                  {/* Table Body */}
                  <div className="overflow-y-auto flex-1 divide-y divide-outline-variant/10">
                    {loading ? (
                      <div className="p-12 text-center text-on-surface-variant font-body-sm">Loading bugs from database...</div>
                    ) : paginatedBugs.length === 0 ? (
                      <div className="p-16 flex flex-col items-center justify-center text-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center mb-1">
                          <span className="material-symbols-outlined text-[32px]">task_alt</span>
                        </div>
                        <h3 className="font-bold text-base text-on-surface font-headline-sm">
                          {searchQuery ? 'No matching defects found' : 'Your Defect Queue is Clean'}
                        </h3>
                        <p className="text-xs text-on-surface-variant max-w-md">
                          {searchQuery
                            ? `No results match "${searchQuery}". Clear your search filter to view defects.`
                            : 'No defects currently logged in this workspace. Create your first defect or switch to the Judge Demo sandbox to evaluate pre-seeded test data.'}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <Link
                            href="/bugs/new"
                            className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-caps text-label-caps uppercase font-bold hover:bg-primary/90 transition shadow-xs flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            Report Defect
                          </Link>
                          {user && !isDemoUser(user) && (
                            <button
                              onClick={() => quickLogin('alice')}
                              className="bg-surface-container text-on-surface px-4 py-2 rounded-lg font-label-caps text-label-caps uppercase font-bold hover:bg-surface-container-high transition border border-outline-variant/30 flex items-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-[16px]">bolt</span>
                              Explore Demo Data
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      paginatedBugs.map((b) => (
                        <div
                          key={b.id}
                          className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-primary-container/5 transition-colors group"
                        >
                          <div className="col-span-1 font-label-code text-label-code text-primary/80 font-bold">
                            #{b.id}
                          </div>

                          <div className="col-span-5 font-body-sm text-on-surface font-medium pr-4 truncate group-hover:text-primary transition-colors">
                            <Link href={`/bugs/${b.id}`} className="hover:underline">
                              {b.summary}
                            </Link>
                          </div>

                          <div className="col-span-2">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full font-label-code text-[11px] uppercase border font-semibold ${getStatusBadge(
                                b.status
                              )}`}
                            >
                              {b.status}
                            </span>
                          </div>

                          <div className="col-span-1">
                            <span
                              className={`inline-block px-2 py-0.5 rounded font-label-code text-xs font-bold ${getPriorityBadge(
                                b.priority
                              )}`}
                            >
                              {b.priority}
                            </span>
                          </div>

                          <div className="col-span-1 font-body-sm text-xs text-on-surface-variant uppercase font-medium">
                            {b.severity}
                          </div>

                          <div className="col-span-2 flex items-center justify-end gap-2">
                            <Link
                              href={`/bugs/${b.id}`}
                              className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-primary-container hover:text-on-primary-container text-xs font-label-caps text-label-caps uppercase font-bold transition-all text-on-surface-variant shadow-xs"
                            >
                              Inspect
                            </Link>
                            <button
                              onClick={() => {
                                setSelectedBugId(b.id);
                                setActiveTab('graph');
                              }}
                              className="p-1.5 rounded-lg hover:bg-surface-variant/50 text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 text-xs font-label-caps"
                              title="View in Graph"
                            >
                              Graph
                              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Table Footer / Pagination */}
                  <div className="px-6 py-3 border-t border-outline-variant/20 bg-surface-container-lowest flex items-center justify-between text-sm text-on-surface-variant">
                    <span className="font-body-sm text-xs">
                      Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredBugs.length)} of{' '}
                      {filteredBugs.length} entries
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="w-8 h-8 rounded border border-outline-variant/30 flex items-center justify-center hover:bg-surface-variant/50 transition-colors disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                      </button>
                      <div className="flex items-center gap-1 font-label-code text-xs">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 rounded font-medium flex items-center justify-center transition-colors ${
                              currentPage === pageNum
                                ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                                : 'hover:bg-surface-variant/50 text-on-surface-variant'
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="w-8 h-8 rounded border border-outline-variant/30 flex items-center justify-center hover:bg-surface-variant/50 transition-colors disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'graph' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-[32px]">hub</span>
                    Live Dependency Graph (Bug #{selectedBugId})
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1 opacity-80">
                    Kahn&apos;s topological sort CPM with dynamic Earliest Finish Time (EFT) analysis. Pulsing red edges show critical bottlenecks.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label htmlFor="bug-select-dash" className="text-xs text-on-surface-variant font-semibold font-label-caps uppercase">
                    Root Bug:
                  </label>
                  <select
                    id="bug-select-dash"
                    value={selectedBugId}
                    onChange={(e) => setSelectedBugId(Number(e.target.value))}
                    className="bg-surface-container-lowest border border-outline-variant/50 text-on-surface text-xs rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:border-primary"
                  >
                    {bugs.map((b) => (
                      <option key={b.id} value={b.id}>
                        #{b.id} — {b.summary.slice(0, 30)}...
                      </option>
                    ))}
                  </select>
                  <Link
                    href={`/bugs/${selectedBugId}/graph`}
                    className="px-3 py-1.5 rounded bg-primary text-on-primary text-xs font-bold font-label-caps uppercase hover:bg-primary/90 transition shadow-sm"
                  >
                    Fullscreen DAG →
                  </Link>
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 shadow-xl">
                <DependencyGraph bugId={selectedBugId} />
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6 flex-1 overflow-y-auto">
              <AnalyticsBurndown />
            </div>
          )}

          {activeTab === 'governance' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[32px]">security</span>
                  Vulnerability Governance &amp; Embargo Quarantines
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1 opacity-80">
                  FIRST.org CVSS v4.0 scoring engine, zero-leakage 404 security group isolation, and 90-day embargo enforcement.
                </p>
              </div>

              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 shadow-xl space-y-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant font-label-caps mb-2">
                    Active 90-Day Security Embargo Countdown Demo
                  </h3>
                  <EmbargoCountdown embargoUntil={new Date(Date.now() + 87 * 24 * 60 * 60 * 1000).toISOString()} />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

