'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KanbanBoard, KanbanBug } from '@/components/KanbanBoard';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth, SEED_PERSONAS, isDemoUser } from '@/lib/auth-context';
import { BugStatus } from '@mantis/shared';
import { applyBugStatusChange } from '@/lib/status-transition';
import { MantisLogo } from '@/components/MantisLogo';
import { ProfileDropdown } from '@/components/ProfileDropdown';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function KanbanPage() {
  const router = useRouter();
  const profileRef = useRef<HTMLDivElement>(null);
  const [bugs, setBugs] = useState<KanbanBug[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const { user, quickLogin, logout } = useAuth();

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

  const fetchBugs = () => {
    const scopeParam = user && !isDemoUser(user) ? '?scope=user&limit=100' : '?limit=100';
    fetch(`${API_BASE}/api/v1/bugs${scopeParam}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.bugs) {
          setBugs(data.bugs);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load bugs for Kanban', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBugs();
  }, [user]);

  const handleStatusChange = async (bugId: number, newStatus: BugStatus) => {
    const currentBug = bugs.find((b) => b.id === bugId);
    const currentStatus = (currentBug?.status || 'UNCONFIRMED') as BugStatus;
    await applyBugStatusChange(bugId, currentStatus, newStatus);
    setBugs((prev) =>
      prev.map((b) => (b.id === bugId ? { ...b, status: newStatus } : b))
    );
  };

  const activeBugsCount = bugs.filter(
    (b) => b.status !== 'CLOSED' && b.status !== 'RESOLVED'
  ).length;

  return (
    <div className="bg-background text-on-surface font-body-md antialiased h-screen overflow-hidden flex selection:bg-primary-container selection:text-on-primary-container">
      {/* SideNavBar */}
      <aside
        className={`h-screen ${
          sidebarOpen ? 'w-64' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'
        } bg-surface-container-low shadow-sm flex flex-col py-margin-sm px-4 gap-gutter z-20 shrink-0 border-r border-outline-variant/30 transition-all duration-300 overflow-hidden`}
        id="sidebar"
      >
        <div className="flex items-center gap-3 px-2 py-4">
          <Link href="/" className="flex items-center gap-3">
            <MantisLogo className="w-8 h-8 rounded-lg shadow-sm shrink-0" size={32} />
            {sidebarOpen && (
              <div>
                <h1 className="font-headline-sm text-headline-sm font-bold text-primary leading-none text-xl">
                  Mantis
                </h1>
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase opacity-70 mt-1">
                  V3.0 Platform
                </p>
              </div>
            )}
          </Link>
        </div>

        <Link
          href="/bugs/new"
          className="bg-primary-container text-on-primary-container font-label-caps text-label-caps uppercase py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-primary hover:text-on-primary transition-colors shadow-sm w-full font-bold"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          {sidebarOpen && 'Report Bug'}
        </Link>

        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
          <Link
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-variant/20 transition-colors"
            href="/dashboard"
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Dashboard</span>}
          </Link>
          <Link
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-variant/20 transition-colors"
            href="/dashboard"
          >
            <span className="material-symbols-outlined text-[20px]">list_alt</span>
            {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Bug Queue</span>}
          </Link>
          <Link
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-primary font-bold bg-surface-bright border-l-4 border-primary scale-95 duration-150 ease-in-out"
            href="/kanban"
          >
            <span className="material-symbols-outlined text-[20px]">view_kanban</span>
            {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Kanban Board</span>}
          </Link>
          <Link
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-variant/20 transition-colors"
            href="/bugs/24/graph"
          >
            <span className="material-symbols-outlined text-[20px]">hub</span>
            {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Dependency Graph</span>}
          </Link>
          <Link
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-variant/20 transition-colors"
            href="/dashboard"
          >
            <span className="material-symbols-outlined text-[20px]">security</span>
            {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Governance</span>}
          </Link>
        </nav>

        <div className="mt-auto pt-4 border-t border-outline-variant/30 flex flex-col gap-1">
          <a
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-variant/20 transition-colors"
            href="http://localhost:3001/docs"
            target="_blank"
            rel="noreferrer"
          >
            <span className="material-symbols-outlined text-lg">help</span>
            {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Support &amp; Docs</span>}
          </a>
          <Link
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-variant/20 transition-colors"
            href="/login"
          >
            <span className="material-symbols-outlined text-lg">account_circle</span>
            {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Account</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Top App Bar */}
        <header className="bg-background border-b border-outline-variant/30 px-4 md:px-margin-lg py-3.5 flex justify-between items-center w-full shrink-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center p-1 rounded-md hover:bg-surface-container"
              title="Toggle Sidebar"
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-sm text-on-surface-variant font-body-sm">
              <Link href="/dashboard" className="hover:text-primary transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="font-bold text-on-surface">Kanban Board</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-4 hidden sm:block relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-lg">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bugs by ID, summary, or component..."
              className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-full pl-9 pr-4 py-1.5 font-body-sm text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-xs"
            />
          </div>

          <div className="flex items-center gap-4">
            <nav className="hidden lg:flex items-center gap-6">
              <a
                className="text-on-surface-variant hover:text-primary transition-all font-body-sm font-medium opacity-80 hover:opacity-100"
                href="http://localhost:3001/docs"
                target="_blank"
                rel="noreferrer"
              >
                API Docs
              </a>
            </nav>

            <div className="h-6 w-px bg-outline-variant/30 hidden lg:block" />

            <div className="flex items-center gap-3">
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

              <NotificationBell />

              {/* Profile Avatar / Dropdown */}
              <div ref={profileRef}>
                <div
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container font-bold flex items-center justify-center border border-outline-variant/50 cursor-pointer hover:ring-2 ring-primary/30 transition-all text-xs"
                >
                  {user ? user.display_name.charAt(0).toUpperCase() : 'U'}
                </div>
              </div>

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
          </div>
        </header>

        {/* Board Toolbar */}
        <div className="px-4 md:px-margin-lg py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 border-b border-outline-variant/20 bg-background z-10">
          <div className="flex items-center gap-3">
            <h2 className="font-headline-md text-headline-sm text-on-surface font-bold tracking-tight">
              Kanban Board
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-code text-label-code font-bold">
              {activeBugsCount} Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/bugs/new"
              className="flex items-center gap-1 px-3 py-1.5 bg-primary text-on-primary rounded-lg font-label-caps text-label-caps uppercase font-bold hover:bg-primary/90 transition shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              New Bug
            </Link>

            <div className="h-6 w-px bg-outline-variant/30 mx-1" />

            <div className="flex bg-surface-container-lowest rounded-lg p-0.5 border border-outline-variant/30 shadow-xs">
              <Link
                href="/dashboard"
                className="px-3 py-1 rounded-md text-on-surface-variant hover:text-on-surface font-body-sm text-body-sm transition-colors"
              >
                Queue
              </Link>
              <button className="px-3 py-1 rounded-md bg-surface-container-high text-on-surface font-body-sm text-body-sm font-semibold shadow-xs">
                Kanban
              </button>
            </div>
          </div>
        </div>

        {/* Board Area */}
        <main className="flex-1 overflow-x-auto p-4 md:p-6 bg-background relative flex flex-col min-h-0">
          {loading ? (
            <div className="flex items-center justify-center flex-1 flex-col gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-on-surface-variant text-sm font-medium">
                Loading Kanban Board...
              </span>
            </div>
          ) : (
            <div className="flex-1 w-full min-w-0 min-h-0">
              <KanbanBoard
                initialBugs={bugs}
                onStatusChange={handleStatusChange}
                filterQuery={searchQuery}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
