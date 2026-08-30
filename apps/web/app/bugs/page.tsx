'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bug } from '@mantis/shared';
import { NotificationBell } from '@/components/NotificationBell';
import { AuthBar } from '@/components/AuthBar';
import { Search } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function BugsSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search bar on '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMDK takes over root '/', but we can capture it here if we want or use a different shortcut for local search
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen to global triage commands from CommandPalette for j/k navigation
  useEffect(() => {
    const handleNext = () => {
      setSelectedIndex(prev => Math.min(prev + 1, bugs.length - 1));
    };
    const handlePrev = () => {
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    };

    document.addEventListener('triage:next', handleNext);
    document.addEventListener('triage:prev', handlePrev);
    return () => {
      document.removeEventListener('triage:next', handleNext);
      document.removeEventListener('triage:prev', handlePrev);
    };
  }, [bugs]);

  // Handle Enter to open selected bug
  useEffect(() => {
    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < bugs.length) {
        // If not typing in the search box
        if (document.activeElement !== searchInputRef.current) {
          router.push(`/bugs/${bugs[selectedIndex].id}`);
        }
      }
    };
    window.addEventListener('keydown', handleEnter);
    return () => window.removeEventListener('keydown', handleEnter);
  }, [selectedIndex, bugs, router]);


  const performSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSelectedIndex(-1);
    try {
      const res = await fetch(`${API_BASE}/api/v1/bugs/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setBugs(data.bugs || []);
      }
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-slate-400 hover:text-slate-200 transition text-sm font-semibold">
              ← <span className="font-bold text-indigo-400">Dashboard</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800 text-slate-300">
              Bug Search
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500 text-xs hidden sm:inline-block">Cmd+S to focus search. Use j/k to navigate results.</span>
            <AuthBar />
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <form onSubmit={performSearch} className="relative w-full">
          <div className="relative flex items-center w-full">
            <Search className="absolute left-4 w-5 h-5 text-indigo-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Full-Text Search (e.g. crash in networking)"
              className="w-full bg-slate-900 border border-indigo-500/50 rounded-xl pl-12 pr-4 py-4 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-lg shadow-lg shadow-indigo-500/10"
            />
            <button type="submit" className="absolute right-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition">
              Search
            </button>
          </div>
        </form>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 mt-8">
            {bugs.length === 0 && query && (
              <div className="text-center text-slate-500 p-8">No results found for "{query}".</div>
            )}
            
            {bugs.map((b, idx) => (
              <Link key={b.id} href={`/bugs/${b.id}`} className="block">
                <div 
                  className={`p-4 rounded-xl border transition-all ${
                    idx === selectedIndex 
                      ? 'border-indigo-500 bg-indigo-950/30 shadow-lg shadow-indigo-500/10 scale-[1.01]' 
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-indigo-400 font-mono text-xs font-bold">#{b.id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-slate-700 bg-slate-800 text-slate-300">
                      {b.status}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-slate-700 bg-slate-800 text-slate-300">
                      {b.priority}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-200 mb-1" dangerouslySetInnerHTML={{ __html: (b as any).headline_summary || b.summary }} />
                  <p className="text-sm text-slate-400 line-clamp-2" dangerouslySetInnerHTML={{ __html: (b as any).headline_description || b.description }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
