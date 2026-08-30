'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DependencyGraph } from '@/components/DependencyGraph';
import { NotificationBell } from '@/components/NotificationBell';
import { AnalyticsBurndown } from '@/components/AnalyticsBurndown';
import { KanbanBoard, KanbanBug } from '@/components/KanbanBoard';
import { useAuth, SEED_PERSONAS, isDemoUser } from '@/lib/auth-context';
import { BugStatus } from '@mantis/shared';
import { applyBugStatusChange } from '@/lib/status-transition';
import { MantisLogo } from '@/components/MantisLogo';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { SavedViewsBar } from '@/components/SavedViewsBar';
import { ReadinessDashboard } from '@/components/ReadinessDashboard';

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
  const profileRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const filterRef = useRef<HTMLDivElement>(null);
  const [bugs, setBugs] = useState<BugItem[]>([]);
  const [selectedBugId, setSelectedBugId] = useState<number>(1);
  const [apiOnline, setApiOnline] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'queue' | 'graph' | 'analytics' | 'readiness'>('queue');
  const [activeSavedViewName, setActiveSavedViewName] = useState<string | null>(null);
  const [queueViewMode, setQueueViewMode] = useState<'list' | 'kanban'>('list');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState<boolean>(false);

  // Filter criteria states
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterEmbargo, setFilterEmbargo] = useState<'all' | 'embargoed' | 'public'>('all');

  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  const activeFilterCount =
    (filterStatus !== 'all' ? 1 : 0) +
    (filterPriority !== 'all' ? 1 : 0) +
    (filterSeverity !== 'all' ? 1 : 0) +
    (filterEmbargo !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setFilterStatus('all');
    setFilterPriority('all');
    setFilterSeverity('all');
    setFilterEmbargo('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleLogout = async () => {
    await logout();
    setProfileDropdownOpen(false);
    router.push('/');
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterDropdownOpen(false);
      }
    }
    if (filterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filterDropdownOpen]);

  useEffect(() => {
    if (user && !isDemoUser(user) && !user.onboarded && !user.team_name) {
      router.replace('/onboarding');
    }
  }, [user, router]);

  useEffect(() => {
    // Health check
    fetch('/health')
      .then((res) => (res.ok ? setApiOnline(true) : setApiOnline(false)))
      .catch(() => setApiOnline(false));

    // Fetch bugs with scope
    const scopeParam = user && !isDemoUser(user) ? '?scope=user&limit=50' : '?scope=demo&limit=50';
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

  const filteredBugs = bugs.filter((b) => {
    const matchesSearch =
      !searchQuery.trim() ||
      b.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toString().includes(searchQuery) ||
      b.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.priority.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.product_name && b.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.component_name && b.component_name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;
    if (filterPriority !== 'all' && b.priority !== filterPriority) return false;
    if (filterSeverity !== 'all' && b.severity !== filterSeverity) return false;
    if (filterEmbargo === 'embargoed' && !b.is_embargoed) return false;
    if (filterEmbargo === 'public' && b.is_embargoed) return false;

    return true;
  });

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
              onClick={() => setActiveTab('readiness')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group ${
                activeTab === 'readiness'
                  ? 'text-primary font-bold border-r-4 border-primary bg-surface-bright shadow-sm'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-variant/20'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
                verified
              </span>
              {sidebarOpen && (
                <span className="font-label-caps text-label-caps tracking-wide uppercase">
                  Release Readiness
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-auto pt-4 border-t border-outline-variant/20 flex flex-col gap-1">
          {user?.is_admin && (
            <Link
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-variant/20 transition-colors group"
              href="/settings/products"
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
              {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Settings</span>}
            </Link>
          )}
          <Link
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-variant/20 transition-colors group"
            href="/audit"
          >
            <span className="material-symbols-outlined text-[20px]">manage_search</span>
            {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Audit Explorer</span>}
          </Link>
          <Link
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-variant/20 transition-colors group"
            href="/docs"
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
            {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Docs &amp; Support</span>}
          </Link>
          <button
            type="button"
            onClick={async () => {
              await logout();
              window.location.href = '/login';
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-variant/20 transition-colors group w-full text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">account_circle</span>
            {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Switch Account</span>}
          </button>
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
                {activeTab === 'queue'
                  ? 'Bug Queue'
                  : activeTab === 'graph'
                  ? 'Dependency Graph'
                  : activeTab === 'analytics'
                  ? 'Sprint Burndown'
                  : 'Release Readiness'}
              </span>
            </div>
          </div>

          {/* Center: Top Nav Links */}
          <nav className="hidden lg:flex items-center gap-6">
            <Link
              className="text-on-surface-variant hover:text-primary transition-all font-body-sm text-body-sm cursor-pointer opacity-80 hover:opacity-100"
              href="/docs"
            >
              API Docs
            </Link>
          </nav>

          {/* Right: Actions & Profile */}
          <div className="flex items-center gap-3 relative">
            {/* Mode & Role Badges */}
            {user && !isDemoUser(user) ? (
              <div className="hidden sm:flex items-center gap-1.5">
                {user.is_admin && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold font-mono border border-amber-500/30 shadow-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">shield_person</span>
                    ADMIN
                  </span>
                )}
                {user.groups && user.groups.map((g) => (
                  <span
                    key={g}
                    className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-bold font-mono border border-indigo-500/20 shadow-xs capitalize"
                  >
                    {g.replace('-team', '')}
                  </span>
                ))}
                {!user.is_admin && (!user.groups || user.groups.length === 0) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-medium font-mono border border-outline-variant/30">
                    MEMBER
                  </span>
                )}
              </div>
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
            <div ref={profileRef}>
              <div
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container font-bold flex items-center justify-center border border-outline-variant/50 cursor-pointer hover:ring-2 ring-primary/30 transition-all text-xs"
              >
                {user ? user.display_name.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>

            {/* Profile Dropdown — rendered via portal to escape stacking contexts */}
            {profileDropdownOpen && (
              <ProfileDropdown
                user={user}
                triggerRef={profileRef}
                onClose={() => setProfileDropdownOpen(false)}
                onPersonaSwitch={quickLogin}
                onLogout={handleLogout}
              />
            )}
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
                  {/* Filter Button & Popover */}
                  <div className="relative" ref={filterRef}>
                    <button
                      type="button"
                      onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                      title="Filter issues"
                      className={`p-2 rounded-lg border transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeFilterCount > 0 || filterDropdownOpen
                          ? 'bg-primary-container text-on-primary-container border-primary font-bold'
                          : 'bg-surface-container-lowest border-outline-variant/50 text-on-surface-variant hover:text-primary hover:border-primary/50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">filter_list</span>
                      {activeFilterCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[11px] font-mono flex items-center justify-center font-bold">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>

                    {/* Filter Popover */}
                    {filterDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-72 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl p-4 z-50 space-y-4 animate-fade-in-up text-xs">
                        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2.5">
                          <span className="font-bold text-on-surface flex items-center gap-1.5 font-label-caps uppercase text-[11px]">
                            <span className="material-symbols-outlined text-primary text-[16px]">tune</span>
                            Filter Issues
                          </span>
                          {activeFilterCount > 0 && (
                            <button
                              type="button"
                              onClick={resetFilters}
                              className="text-[11px] text-primary hover:underline font-bold"
                            >
                              Reset
                            </button>
                          )}
                        </div>

                        {/* Status Filter */}
                        <div className="space-y-1.5">
                          <label className="font-bold text-on-surface-variant text-[10px] font-label-caps uppercase">Status</label>
                          <select
                            value={filterStatus}
                            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                            className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                          >
                            <option value="all">All Statuses</option>
                            <option value="UNCONFIRMED">UNCONFIRMED</option>
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="RESOLVED">RESOLVED</option>
                            <option value="VERIFIED">VERIFIED</option>
                            <option value="CLOSED">CLOSED</option>
                          </select>
                        </div>

                        {/* Priority Filter */}
                        <div className="space-y-1.5">
                          <label className="font-bold text-on-surface-variant text-[10px] font-label-caps uppercase">Priority</label>
                          <select
                            value={filterPriority}
                            onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1); }}
                            className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                          >
                            <option value="all">All Priorities</option>
                            <option value="P1">P1 — Critical / Blocker</option>
                            <option value="P2">P2 — Major</option>
                            <option value="P3">P3 — Normal</option>
                            <option value="P4">P4 — Minor</option>
                            <option value="P5">P5 — Trivial</option>
                          </select>
                        </div>

                        {/* Severity Filter */}
                        <div className="space-y-1.5">
                          <label className="font-bold text-on-surface-variant text-[10px] font-label-caps uppercase">Severity</label>
                          <select
                            value={filterSeverity}
                            onChange={(e) => { setFilterSeverity(e.target.value); setCurrentPage(1); }}
                            className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary capitalize"
                          >
                            <option value="all">All Severities</option>
                            <option value="blocker">Blocker</option>
                            <option value="critical">Critical</option>
                            <option value="major">Major</option>
                            <option value="normal">Normal</option>
                            <option value="minor">Minor</option>
                            <option value="trivial">Trivial</option>
                            <option value="enhancement">Enhancement</option>
                          </select>
                        </div>

                        {/* Embargo Filter */}
                        <div className="space-y-1.5">
                          <label className="font-bold text-on-surface-variant text-[10px] font-label-caps uppercase">Security / Embargo</label>
                          <select
                            value={filterEmbargo}
                            onChange={(e) => { setFilterEmbargo(e.target.value as any); setCurrentPage(1); }}
                            className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                          >
                            <option value="all">All Issues</option>
                            <option value="embargoed">🔒 Embargoed 0-Days Only</option>
                            <option value="public">🌐 Public Issues Only</option>
                          </select>
                        </div>

                        {activeFilterCount > 0 && (
                          <button
                            type="button"
                            onClick={resetFilters}
                            className="w-full py-2 bg-surface-container border border-outline-variant/30 hover:bg-surface-container-high rounded-xl text-xs font-semibold text-on-surface transition"
                          >
                            Clear All ({activeFilterCount}) Filters
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <a
                    href={`/api/v1/bugs/export?status=${encodeURIComponent(filterStatus)}&priority=${encodeURIComponent(filterPriority)}&severity=${encodeURIComponent(filterSeverity)}&embargo=${encodeURIComponent(filterEmbargo)}&search=${encodeURIComponent(searchQuery)}`}
                    download
                    className="p-2 rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:border-primary/50 transition-all shadow-xs flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer"
                    title="Export filtered bug queue to CSV"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary">download</span>
                    <span className="hidden sm:inline">Export</span>
                  </a>

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

              {/* Saved Views / Named Queries Bar */}
              <SavedViewsBar
                currentFilters={{
                  status: filterStatus,
                  priority: filterPriority,
                  severity: filterSeverity,
                  embargo: filterEmbargo,
                }}
                onApplyView={(filters, viewName) => {
                  setFilterStatus(filters.status || 'all');
                  setFilterPriority(filters.priority || 'all');
                  setFilterSeverity(filters.severity || 'all');
                  setFilterEmbargo(filters.embargo || 'all');
                  setActiveSavedViewName(viewName || null);
                  setCurrentPage(1);
                }}
                activeViewName={activeSavedViewName}
              />

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
                    {bugs.length === 0 && !isDemoUser(user)
                      ? 'Dependency Graph'
                      : `Live Dependency Graph (Bug #${selectedBugId})`}
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1 opacity-80">
                    Kahn&apos;s topological sort CPM with dynamic Earliest Finish Time (EFT) analysis. Pulsing red edges show critical bottlenecks.
                  </p>
                </div>

                {bugs.length > 0 && (
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
                )}
              </div>

              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 shadow-xl">
                {bugs.length === 0 && !isDemoUser(user) ? (
                  /* ── Onboarding Empty State ─────────────────────────────── */
                  <div className="flex flex-col items-center justify-center gap-6 py-16 px-8 text-center">
                    {/* Animated DAG illustration placeholder */}
                    <div className="relative w-40 h-32 select-none">
                      {/* Ghost nodes */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-10 rounded-xl border-2 border-dashed border-primary/30 bg-primary-container/10 flex items-center justify-center">
                        <span className="text-[10px] font-mono text-primary/50 font-bold">Root Bug</span>
                      </div>
                      <div className="absolute bottom-0 left-4 w-24 h-10 rounded-xl border-2 border-dashed border-outline-variant/50 bg-surface-container flex items-center justify-center">
                        <span className="text-[10px] font-mono text-on-surface-variant/50 font-bold">Blocker A</span>
                      </div>
                      <div className="absolute bottom-0 right-4 w-24 h-10 rounded-xl border-2 border-dashed border-outline-variant/50 bg-surface-container flex items-center justify-center">
                        <span className="text-[10px] font-mono text-on-surface-variant/50 font-bold">Blocker B</span>
                      </div>
                      {/* Ghost edges */}
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 128" fill="none">
                        <line x1="80" y1="40" x2="40" y2="90" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" />
                        <line x1="80" y1="40" x2="120" y2="90" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" />
                      </svg>
                    </div>

                    <div className="space-y-2 max-w-sm">
                      <h3 className="font-bold text-lg text-on-surface tracking-tight">
                        Your dependency graph is empty
                      </h3>
                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        Create your first defect to start building a <strong>Critical Path Method (CPM)</strong> dependency graph. The engine automatically calculates Earliest Finish Times and highlights bottlenecks.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <Link
                        href="/bugs/new"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-label-caps text-label-caps uppercase font-bold text-xs hover:bg-primary/90 transition shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Report First Defect
                      </Link>
                      <button
                        onClick={() => quickLogin('alice')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface-container text-on-surface rounded-xl font-label-caps text-label-caps uppercase font-bold text-xs hover:bg-surface-container-high transition border border-outline-variant/30"
                      >
                        <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                        Explore Sample Workflow
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 w-full max-w-md mt-2">
                      {[
                        { icon: 'hub', label: 'Topological Sort', desc: 'Kahn\'s algorithm for DAG ordering' },
                        { icon: 'timeline', label: 'Critical Path', desc: 'Zero-slack bottleneck detection' },
                        { icon: 'schedule', label: 'EFT Analysis', desc: 'Earliest Finish Time per node' },
                      ].map((f) => (
                        <div key={f.label} className="text-center p-3 rounded-xl bg-surface-container border border-outline-variant/20">
                          <span className="material-symbols-outlined text-primary text-[22px] block mb-1">{f.icon}</span>
                          <div className="font-bold text-[10px] text-on-surface uppercase tracking-wider">{f.label}</div>
                          <div className="text-[9px] text-on-surface-variant mt-0.5">{f.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <DependencyGraph bugId={selectedBugId} />
                )}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6 flex-1 overflow-y-auto">
              <div>
                <h2 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[32px]">trending_down</span>
                  Sprint &amp; Release Burndown
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1 opacity-80">
                  Trajectory of resolved vs pending blockers across sprint milestones and Critical Path Method (CPM) telemetry.
                </p>
              </div>

              {bugs.length === 0 && !isDemoUser(user) ? (
                /* ── Sprint Burndown Empty State ───────────────────────────── */
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-8 shadow-xl">
                  <div className="flex flex-col items-center justify-center gap-6 py-10 text-center">
                    {/* Zero-state flat chart illustration */}
                    <div className="w-full max-w-md h-28 relative">
                      <svg viewBox="0 0 400 100" className="w-full h-full" fill="none">
                        {/* Grid lines */}
                        {[0, 25, 50, 75].map((y) => (
                          <line key={y} x1="40" y1={y + 10} x2="380" y2={y + 10} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3" />
                        ))}
                        {/* Y-axis */}
                        <line x1="40" y1="10" x2="40" y2="90" stroke="#cbd5e1" strokeWidth="1.5" />
                        {/* X-axis */}
                        <line x1="40" y1="90" x2="380" y2="90" stroke="#cbd5e1" strokeWidth="1.5" />
                        {/* Flat ideal line (dashed) */}
                        <line x1="40" y1="85" x2="380" y2="85" stroke="#86efac" strokeWidth="2" strokeDasharray="6 4" />
                        {/* Zero actual line */}
                        <line x1="40" y1="85" x2="180" y2="85" stroke="#6366f1" strokeWidth="2.5" />
                        {/* Y labels */}
                        <text x="30" y="14" fill="#94a3b8" fontSize="8" textAnchor="end">—</text>
                        <text x="30" y="90" fill="#94a3b8" fontSize="8" textAnchor="end">0</text>
                        {/* Legend */}
                        <line x1="52" y1="6" x2="70" y2="6" stroke="#86efac" strokeWidth="2" strokeDasharray="4 3" />
                        <text x="73" y="9" fill="#64748b" fontSize="7">Ideal</text>
                        <line x1="110" y1="6" x2="128" y2="6" stroke="#6366f1" strokeWidth="2.5" />
                        <text x="131" y="9" fill="#64748b" fontSize="7">Actual</text>
                      </svg>
                    </div>

                    <div className="space-y-2 max-w-sm">
                      <h3 className="font-bold text-lg text-on-surface tracking-tight">
                        No sprint data yet
                      </h3>
                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        The Sprint Burndown chart tracks open defects over your milestone timeline. Once you create bugs and assign milestone targets, the trajectory populates automatically.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <Link
                        href="/bugs/new"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-label-caps text-label-caps uppercase font-bold text-xs hover:bg-primary/90 transition shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Report First Defect
                      </Link>
                      <button
                        onClick={() => quickLogin('alice')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface-container text-on-surface rounded-xl font-label-caps text-label-caps uppercase font-bold text-xs hover:bg-surface-container-high transition border border-outline-variant/30"
                      >
                        <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                        Explore Sample Workflow
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 w-full max-w-md mt-2">
                      {[
                        { icon: 'trending_down', label: 'Velocity Tracking', desc: 'Open vs. resolved over time' },
                        { icon: 'flag', label: 'Milestone Scoping', desc: 'Filter by release milestone' },
                        { icon: 'timer', label: 'Effort Hours', desc: 'Remaining estimated hours' },
                      ].map((f) => (
                        <div key={f.label} className="text-center p-3 rounded-xl bg-surface-container border border-outline-variant/20">
                          <span className="material-symbols-outlined text-primary text-[22px] block mb-1">{f.icon}</span>
                          <div className="font-bold text-[10px] text-on-surface uppercase tracking-wider">{f.label}</div>
                          <div className="text-[9px] text-on-surface-variant mt-0.5">{f.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <AnalyticsBurndown />
              )}
            </div>
          )}

          {activeTab === 'readiness' && (
            <div className="max-w-6xl mx-auto w-full pb-8 animate-fade-in">
              <ReadinessDashboard
                onNavigateToGraph={(bugId) => {
                  setSelectedBugId(bugId);
                  setActiveTab('graph');
                }}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

