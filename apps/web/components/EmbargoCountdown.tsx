'use client';
import React, { useState, useEffect } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcRemaining(embargoUntil: string): TimeLeft | null {
  const diff = new Date(embargoUntil).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function EmbargoCountdown({ embargoUntil, compact = false }: { embargoUntil: string; compact?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [remaining, setRemaining] = useState<TimeLeft | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setRemaining(calcRemaining(embargoUntil));
    const interval = setInterval(() => setRemaining(calcRemaining(embargoUntil)), 1000);
    return () => clearInterval(interval);
  }, [embargoUntil]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (compact) {
    if (!mounted) return null;
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          id="embargo-lock-button"
          title="Active Security Embargo (Click to view timer)"
          className={`p-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            isOpen
              ? 'text-red-600 dark:text-red-400 bg-red-500/10 scale-110'
              : 'text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 hover:scale-110'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">lock</span>
        </button>

        {isOpen && (
          <div
            id="embargo-popup-card"
            className="absolute right-0 mt-2 w-72 p-4 rounded-xl bg-surface-container-lowest dark:bg-slate-900 border border-red-500/30 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-outline-variant/20">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 uppercase font-label-caps">
                <span className="material-symbols-outlined text-[15px]">lock</span>
                Security Embargo
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-700 dark:text-red-300 font-mono font-bold">
                90-DAY
              </span>
            </div>

            {remaining ? (
              <div className="text-center py-2">
                <div className="text-[11px] text-on-surface-variant mb-1 font-medium">Time Remaining:</div>
                <div
                  id="embargo-popup-timer"
                  className="font-mono text-base font-bold text-red-600 dark:text-red-400 tracking-wider bg-red-500/10 py-1.5 px-2 rounded-lg border border-red-500/20 tabular-nums"
                >
                  {remaining.days}d {pad(remaining.hours)}h {pad(remaining.minutes)}m {pad(remaining.seconds)}s
                </div>
                <div className="text-[10px] text-on-surface-variant/70 mt-2">
                  Disclosure Date: <span className="font-semibold text-on-surface">{new Date(embargoUntil).toLocaleDateString()}</span>
                </div>
              </div>
            ) : (
              <div className="py-2 text-center text-xs font-semibold text-amber-500 flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                <span>Embargo Expired — Disclosure overdue</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (!mounted) {
    return (
      <div
        id="embargo-loading-banner"
        className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 text-sm font-semibold animate-pulse"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-400 text-base">lock</span>
          <span className="uppercase tracking-wide">Calculating Security Embargo...</span>
        </div>
      </div>
    );
  }

  if (!remaining) {
    return (
      <div
        id="embargo-expired-banner"
        className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-700/60 bg-amber-950/70 text-amber-300 text-sm font-semibold"
      >
        <span className="material-symbols-outlined text-amber-400 text-lg">warning</span>
        <span>EMBARGO EXPIRED — Security disclosure overdue. Coordinate with security-team immediately.</span>
      </div>
    );
  }

  return (
    <div
      id="embargo-active-banner"
      className="flex items-center justify-between px-4 py-3 rounded-xl border border-red-800/60 bg-red-950/60 text-red-200 text-sm font-semibold"
    >
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-red-400 text-lg">lock</span>
        <span className="uppercase tracking-wide text-red-300">Security Embargo Active</span>
      </div>
      <div
        id="embargo-countdown-timer"
        className="font-mono text-red-300 font-bold tracking-widest text-base tabular-nums"
      >
        {remaining.days}d {pad(remaining.hours)}h {pad(remaining.minutes)}m {pad(remaining.seconds)}s
      </div>
    </div>
  );
}
