'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { MantisLogo } from '@/components/MantisLogo';
import { useAuth } from '@/lib/auth-context';

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
  const { user, logout } = useAuth();

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
              <p className="font-label-caps text-label-caps text-on-surface-variant mt-1 opacity-80">
                V3.0 Platform
              </p>
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
          onClick={async () => {
            await logout();
            window.location.href = '/login';
          }}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-variant/20 transition-colors group w-full text-left cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
            account_circle
          </span>
          {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Switch Account</span>}
        </button>
      </div>
    </nav>
  );
}
