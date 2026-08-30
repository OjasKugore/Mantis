'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { SEED_PERSONAS, isDemoUser } from '@/lib/auth-context';

interface ProfileDropdownProps {
  user: {
    display_name: string;
    email: string;
    is_admin?: boolean;
    groups?: string[];
  } | null;
  triggerRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onPersonaSwitch: (key: string) => void;
  onLogout: () => void;
}

export function ProfileDropdown({ user, triggerRef, onClose, onPersonaSwitch, onLogout }: ProfileDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Position the dropdown relative to the trigger button
  const getStyle = (): React.CSSProperties => {
    if (!triggerRef.current) return { position: 'fixed', top: 64, right: 24 };
    const rect = triggerRef.current.getBoundingClientRect();
    return {
      position: 'fixed',
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
      zIndex: 99999,
    };
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, triggerRef]);

  const style = getStyle();

  return createPortal(
    <div
      ref={dropdownRef}
      style={style}
      className="w-80 bg-white border border-slate-200 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.22)] p-5 animate-fade-in-up space-y-4 ring-1 ring-black/10 text-slate-900"
    >
      {/* User info */}
      <div className="border-b border-slate-100 pb-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
            {user ? user.display_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-sm text-slate-900 truncate">
              {user ? user.display_name : 'Guest User'}
            </div>
            <div className="text-xs text-slate-500 font-mono truncate">
              {user ? user.email : 'not logged in'}
            </div>
          </div>
        </div>

        {/* User Role Badges */}
        {user && (
          <div className="flex flex-wrap gap-1 pt-1">
            {user.is_admin && (
              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 text-[10px] font-bold border border-amber-500/30 font-mono">
                ADMIN
              </span>
            )}
            {user.groups && user.groups.map((g) => (
              <span
                key={g}
                className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200 font-mono capitalize"
              >
                {g.replace('-team', '').toUpperCase()}
              </span>
            ))}
            {!user.is_admin && (!user.groups || user.groups.length === 0) && (
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium font-mono">
                MEMBER
              </span>
            )}
          </div>
        )}
      </div>

      {/* Persona switcher — only visible in judge demo sandbox */}
      {isDemoUser(user as any) && (
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 font-label-caps flex items-center justify-between">
            <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Fast Persona Switcher</span>
            <span className="text-[9px] font-mono text-primary font-bold">1-Click</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {SEED_PERSONAS.map((p) => {
              const isCurrent = user?.email.toLowerCase() === p.email.toLowerCase();
              return (
                <button
                  key={p.key}
                  onClick={() => { onPersonaSwitch(p.key); onClose(); }}
                  className={`text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between border ${
                    isCurrent
                      ? 'bg-primary-container/20 border-primary text-primary font-bold shadow-xs'
                      : 'bg-slate-50 border-slate-200/70 hover:border-primary/50 hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <span className="font-bold truncate">{p.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2 flex items-center gap-1.5">
                    {p.icon && <span className={isCurrent ? "text-primary" : "text-slate-400"}>{p.icon}</span>}
                    {p.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <Link
          href="/login"
          onClick={onClose}
          className="text-xs text-slate-600 font-bold hover:text-primary font-label-caps uppercase transition-colors"
        >
          Switch Account
        </Link>
        <button
          onClick={() => { onLogout(); onClose(); }}
          className="text-xs text-rose-600 hover:text-rose-700 font-bold font-label-caps uppercase transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[14px]">logout</span>
          Log Out
        </button>
      </div>
    </div>,
    document.body
  );
}
