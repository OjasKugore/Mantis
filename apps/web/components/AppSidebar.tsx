'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { MantisLogo } from '@/components/MantisLogo';
import { useAuth, SEED_PERSONAS } from '@/lib/auth-context';

export interface AppSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeItem?: 'queue' | 'kanban' | 'graph' | 'analytics' | 'readiness' | 'settings' | 'audit' | 'docs' | 'new_bug';
  onTabChange?: (tab: 'queue' | 'graph' | 'analytics' | 'readiness', viewMode?: 'list' | 'kanban') => void;
}

export function AppSidebar({
  sidebarOpen,
  setSidebarOpen,
  activeItem,
  onTabChange,
}: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, quickLogin, logout } = useAuth();
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const handleNav = (
    tab: 'queue' | 'graph' | 'analytics' | 'readiness',
    viewMode: 'list' | 'kanban' = 'list',
    fallbackHref: string
  ) => {
    if (onTabChange && pathname === '/dashboard') {
      onTabChange(tab, viewMode);
    } else {
      router.push(fallbackHref);
    }
  };

  const isItemActive = (item: string) => {
    if (activeItem) return activeItem === item;
    if (item === 'new_bug') return pathname === '/bugs/new';
    if (item === 'settings') return pathname.startsWith('/settings');
    if (item === 'audit') return pathname === '/audit';
    if (item === 'docs') return pathname === '/docs';
    if (item === 'kanban') return pathname === '/kanban';
    return false;
  };

  return (
    <nav
      className={`bg-surface-container-low shadow-sm h-screen ${
        sidebarOpen ? 'w-64' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'
      } flex flex-col py-margin-sm px-4 gap-gutter shrink-0 border-r border-outline-variant/20 z-20 transition-all duration-300 overflow-hidden select-none`}
      id="sidebar"
    >
      {/* Brand / Header */}
      <div className="flex items-center gap-3 px-2 py-4">
        <Link
          href="/dashboard"
          onClick={(e) => {
            if (onTabChange && pathname === '/dashboard') {
              e.preventDefault();
              onTabChange('queue', 'list');
            }
          }}
          className="flex items-center gap-3 group"
        >
          <MantisLogo className="w-8 h-8 rounded-lg shadow-sm shrink-0 transition-transform group-hover:scale-105" size={32} />
          {sidebarOpen && (
            <div>
              <h1 className="font-headline-md text-headline-md font-bold text-primary leading-none text-xl tracking-tight">
                Mantis
              </h1>
            </div>
          )}
        </Link>
      </div>

      {/* CTA Button */}
      <Link
        href="/bugs/new"
        className={`w-full ${
          isItemActive('new_bug')
            ? 'bg-primary text-on-primary shadow-md'
            : 'bg-primary-container hover:bg-opacity-90 text-on-primary-container shadow-sm'
        } font-label-caps text-label-caps py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors mt-2 font-bold uppercase tracking-wider`}
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
          {/* Bug Queue */}
          <button
            type="button"
            onClick={() => handleNav('queue', 'list', '/dashboard?tab=queue')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group cursor-pointer ${
              isItemActive('queue')
                ? 'text-primary font-bold border-r-4 border-primary bg-surface-bright shadow-sm'
                : 'text-on-surface-variant hover:text-primary hover:bg-surface-variant/20'
            }`}
          >
            <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
              list_alt
            </span>
            {sidebarOpen && (
              <span className="font-label-caps text-label-caps tracking-wide uppercase">
                Bug Queue
              </span>
            )}
          </button>

          {/* Kanban Board */}
          <button
            type="button"
            onClick={() => handleNav('queue', 'kanban', '/dashboard?tab=queue&view=kanban')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group cursor-pointer ${
              isItemActive('kanban')
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

          {/* Dependency Graph */}
          <button
            type="button"
            onClick={() => handleNav('graph', 'list', '/dashboard?tab=graph')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group cursor-pointer ${
              isItemActive('graph')
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

          {/* Sprint Burndown */}
          <button
            type="button"
            onClick={() => handleNav('analytics', 'list', '/dashboard?tab=analytics')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group cursor-pointer ${
              isItemActive('analytics')
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

          {/* Release Readiness */}
          <button
            type="button"
            onClick={() => handleNav('readiness', 'list', '/dashboard?tab=readiness')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group cursor-pointer ${
              isItemActive('readiness')
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
        <Link
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${
            isItemActive('settings')
              ? 'text-primary font-bold bg-surface-bright border-r-4 border-primary'
              : 'text-on-surface-variant hover:text-primary hover:bg-surface-variant/20'
          }`}
          href="/settings/products"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:rotate-45 transition-transform">
            settings
          </span>
          {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Settings</span>}
        </Link>

        <Link
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${
            isItemActive('audit')
              ? 'text-primary font-bold bg-surface-bright border-r-4 border-primary'
              : 'text-on-surface-variant hover:text-primary hover:bg-surface-variant/20'
          }`}
          href="/audit"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
            manage_search
          </span>
          {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Audit Explorer</span>}
        </Link>

        <Link
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${
            isItemActive('docs')
              ? 'text-primary font-bold bg-surface-bright border-r-4 border-primary'
              : 'text-on-surface-variant hover:text-primary hover:bg-surface-variant/20'
          }`}
          href="/docs"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
            help
          </span>
          {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Docs &amp; Support</span>}
        </Link>

        <button
          type="button"
          onClick={() => setShowPersonaModal(true)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-variant/20 transition-colors group w-full text-left cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
            account_circle
          </span>
          {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Switch Account</span>}
        </button>
      </div>

      {/* Instant Persona Switcher Modal Dialog */}
      {showPersonaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPersonaModal(false);
          }}
        >
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-2xl max-w-md w-full relative space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">switch_account</span>
                <div>
                  <h3 className="font-headline-sm font-bold text-on-surface text-base">
                    Switch Test Persona
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Instant 1-click role switching for testing & demo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPersonaModal(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {SEED_PERSONAS.map((p) => {
                const isActive = user?.email === p.email;
                return (
                  <button
                    key={p.key}
                    type="button"
                    disabled={isSwitching}
                    onClick={async () => {
                      setIsSwitching(true);
                      await quickLogin(p.key);
                      setShowPersonaModal(false);
                      setIsSwitching(false);
                      window.location.reload();
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${
                      isActive
                        ? 'border-primary bg-primary-container/10 ring-1 ring-primary'
                        : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container-high hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${p.avatarColor} flex items-center justify-center text-white font-bold text-xs shadow-sm`}>
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-on-surface">
                            {p.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-container-highest text-on-surface-variant uppercase font-mono">
                            {p.badge}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant line-clamp-1 opacity-80">
                          {p.description}
                        </p>
                      </div>
                    </div>

                    {isActive && (
                      <span className="material-symbols-outlined text-primary text-base shrink-0 ml-2">
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between">
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  setShowPersonaModal(false);
                  window.location.href = '/login';
                }}
                className="text-xs text-error hover:underline font-semibold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                Sign Out
              </button>

              <Link
                href="/login"
                onClick={() => setShowPersonaModal(false)}
                className="text-xs text-primary hover:underline font-semibold"
              >
                Go to Login Page →
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
