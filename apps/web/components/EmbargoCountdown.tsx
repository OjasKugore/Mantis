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

export function EmbargoCountdown({ embargoUntil }: { embargoUntil: string }) {
  const [mounted, setMounted] = useState(false);
  const [remaining, setRemaining] = useState<TimeLeft | null>(null);

  useEffect(() => {
    setMounted(true);
    setRemaining(calcRemaining(embargoUntil));
    const interval = setInterval(() => setRemaining(calcRemaining(embargoUntil)), 1000);
    return () => clearInterval(interval);
  }, [embargoUntil]);

  if (!mounted) {
    return (
      <div
        id="embargo-loading-banner"
        className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 text-sm font-semibold animate-pulse"
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-base">🔒</span>
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
        <span className="text-base">⚠️</span>
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
        <span className="text-red-400 text-base">🔒</span>
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
