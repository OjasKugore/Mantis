'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, SEED_PERSONAS } from '@/lib/auth-context';

export function AuthBar() {
  const { user, loading, logout, quickLogin } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQuickSwitch = async (key: string) => {
    setSwitching(key);
    await quickLogin(key);
    setSwitching(null);
    setDropdownOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
        <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
        Checking session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/40 hover:bg-indigo-900/60 text-xs font-semibold text-indigo-300 transition-all shadow-sm"
          >
            <span>⚡ Quick Persona</span>
            <svg className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl z-50 p-2 space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
                1-Click Instant Login
              </div>
              {SEED_PERSONAS.map((persona) => (
                <button
                  key={persona.key}
                  onClick={() => handleQuickSwitch(persona.key)}
                  disabled={switching !== null}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/80 transition flex items-start gap-2.5 group"
                >
                  <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${persona.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5 shadow-sm`}>
                    {persona.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 truncate">
                        {persona.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{persona.badge}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block truncate">{persona.email}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/login"
          className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition"
        >
          Log In
        </Link>
        <Link
          href="/signup"
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition shadow-sm shadow-indigo-600/30"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  // Active Authenticated State
  const currentPersona = SEED_PERSONAS.find((p) => p.email.toLowerCase() === user.email.toLowerCase());

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-full border border-slate-800 bg-slate-900/90 hover:bg-slate-800/90 transition shadow-sm"
      >
        <div
          className={`w-6 h-6 rounded-full bg-gradient-to-tr ${
            currentPersona ? currentPersona.avatarColor : 'from-indigo-500 to-purple-600'
          } flex items-center justify-center text-[11px] font-black text-white shadow-sm`}
        >
          {user.display_name.charAt(0).toUpperCase()}
        </div>
        <div className="text-left leading-tight hidden sm:block">
          <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            {user.display_name}
            {user.is_admin && (
              <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800/80 px-1 rounded font-mono">
                Admin
              </span>
            )}
          </div>
        </div>
        <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl z-50 p-2 space-y-2">
          {/* User Details */}
          <div className="px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="text-xs font-bold text-slate-200">{user.display_name}</div>
            <div className="text-[11px] text-slate-400 font-mono truncate">{user.email}</div>
            <div className="text-[10px] text-indigo-400 font-mono mt-1">@{user.username}</div>
          </div>

          {/* Quick Switch Personas */}
          <div>
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Switch Persona
            </div>
            <div className="space-y-1 mt-1">
              {SEED_PERSONAS.map((persona) => {
                const isActive = persona.email.toLowerCase() === user.email.toLowerCase();
                return (
                  <button
                    key={persona.key}
                    onClick={() => handleQuickSwitch(persona.key)}
                    disabled={isActive || switching !== null}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between ${
                      isActive
                        ? 'bg-indigo-950/50 text-indigo-300 border border-indigo-800/50 font-semibold cursor-default'
                        : 'hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-tr ${persona.avatarColor} text-[10px] font-bold flex items-center justify-center text-white`}>
                        {persona.name.charAt(0)}
                      </div>
                      <span className="truncate">{persona.name}</span>
                    </div>
                    {isActive ? (
                      <span className="text-[10px] text-indigo-400 font-mono">Active</span>
                    ) : (
                      <span className="text-[10px] text-slate-500">{persona.badge.split(' ')[0]}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Logout button */}
          <div className="border-t border-slate-800/80 pt-2">
            <button
              onClick={() => {
                logout();
                setDropdownOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
