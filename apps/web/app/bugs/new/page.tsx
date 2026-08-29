'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bug, BugPriority, BugSeverity } from '@bugzilla/shared';
import { NotificationBell } from '@/components/NotificationBell';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function NewBugPage() {
  const router = useRouter();
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [productId, setProductId] = useState<number>(1);
  const [componentId, setComponentId] = useState<number>(1);
  const [priority, setPriority] = useState<BugPriority>('P3');
  const [severity, setSeverity] = useState<BugSeverity>('normal');
  const [isEmbargoed, setIsEmbargoed] = useState(false);
  
  const [duplicates, setDuplicates] = useState<Bug[]>([]);
  const [isSearchingDups, setIsSearchingDups] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced duplicate detection
  useEffect(() => {
    if (summary.trim().length < 10) {
      setDuplicates([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingDups(true);
      try {
        const res = await fetch(`${API_BASE}/api/v1/bugs/duplicates?q=${encodeURIComponent(summary)}`);
        if (res.ok) {
          const data = await res.json();
          setDuplicates(data.duplicates || []);
        }
      } catch (err) {
        console.error('Duplicate search failed', err);
      } finally {
        setIsSearchingDups(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [summary]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/bugs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary,
          description,
          product_id: productId,
          component_id: componentId,
          priority,
          severity,
          is_embargoed: isEmbargoed,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/bugs/${data.id}`);
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to file bug');
      }
    } catch (err) {
      setError('Network error filing bug');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-slate-200 transition text-sm font-semibold">
              ← <span className="font-bold text-indigo-400">Dashboard</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800 text-slate-300">
              File a Bug
            </span>
          </div>
          <div className="flex items-center">
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Report a New Defect</h1>
          <p className="text-sm text-slate-400 mt-2">Please provide as much detail as possible to help triagers and engineers reproduce the issue.</p>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-sm font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 block">Summary</label>
            <input
              type="text"
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g., Crash on startup when using specific proxy configuration"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
            />
          </div>

          {/* Duplicate Detection Alert */}
          {summary.trim().length >= 10 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 transition-all">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Duplicate Detection Radar
                </h3>
                {isSearchingDups && (
                  <span className="text-xs text-indigo-400 flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    Scanning...
                  </span>
                )}
              </div>
              
              {!isSearchingDups && duplicates.length > 0 ? (
                <ul className="space-y-2">
                  {duplicates.map((dup) => (
                    <li key={dup.id} className="text-sm flex gap-3 items-start bg-slate-950/60 p-2 rounded-md border border-slate-800/80">
                      <span className="text-indigo-400 font-mono text-xs mt-0.5">#{dup.id}</span>
                      <div className="flex-1">
                        <Link href={`/bugs/${dup.id}`} target="_blank" className="text-slate-200 hover:text-indigo-300 font-semibold block transition-colors">
                          {dup.summary}
                        </Link>
                        <span className="text-xs text-slate-500">Status: {dup.status}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : !isSearchingDups ? (
                <p className="text-xs text-emerald-400 font-semibold">No apparent duplicates found. You are good to go!</p>
              ) : null}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 block">Product</label>
              <select
                value={productId}
                onChange={(e) => setProductId(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>Firefox</option>
                <option value={2}>Thunderbird</option>
                <option value={3}>Core</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 block">Component</label>
              <select
                value={componentId}
                onChange={(e) => setComponentId(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>Networking</option>
                <option value={2}>JS Engine</option>
                <option value={3}>CSS</option>
                <option value={4}>Storage</option>
                <option value={5}>Mail</option>
                <option value={6}>Calendar</option>
                <option value={7}>General</option>
                <option value={8}>Security</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 block">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as BugPriority)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="P1">P1 (Highest)</option>
                <option value="P2">P2</option>
                <option value="P3">P3 (Normal)</option>
                <option value="P4">P4</option>
                <option value="P5">P5 (Lowest)</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 block">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as BugSeverity)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="blocker">Blocker</option>
                <option value="critical">Critical</option>
                <option value="major">Major</option>
                <option value="normal">Normal</option>
                <option value="minor">Minor</option>
                <option value="trivial">Trivial</option>
                <option value="enhancement">Enhancement</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-rose-400 p-3 bg-rose-950/20 border border-rose-900/30 rounded-lg cursor-pointer hover:bg-rose-950/40 transition">
              <input
                type="checkbox"
                checked={isEmbargoed}
                onChange={(e) => setIsEmbargoed(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-rose-500 focus:ring-rose-500 focus:ring-offset-slate-900"
              />
              Restrict as Security Bug (Zero-Leakage Embargo)
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 block">Description (Steps to Reproduce)</label>
            <textarea
              required
              rows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-sm resize-y"
              placeholder="1. Navigate to...\n2. Click on...\n3. Observe..."
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !summary.trim() || !description.trim()}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-lg shadow-indigo-500/20 transition-all"
            >
              {isSubmitting ? 'Filing Bug...' : 'Submit Bug Report'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
