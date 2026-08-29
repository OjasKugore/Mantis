'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { KanbanBoard } from '@/components/KanbanBoard';
import { NotificationBell } from '@/components/NotificationBell';
import { Bug } from '@bugzilla/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function KanbanPage() {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/bugs?limit=100`)
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
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto w-full px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-slate-200 transition text-sm font-semibold">
              ← <span className="font-bold text-indigo-400">Dashboard</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800 text-slate-300 flex items-center gap-2">
              <span>📋</span> Kanban Board
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400 text-xs hidden sm:inline-block">Drag and drop cards to update status</span>
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-6 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-64 flex-col gap-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-400 text-sm">Loading Workspace...</span>
          </div>
        ) : (
          <div className="flex-1 min-h-0 bg-slate-900/40 rounded-xl border border-slate-800 p-4">
            <KanbanBoard initialBugs={bugs} />
          </div>
        )}
      </main>
    </div>
  );
}
