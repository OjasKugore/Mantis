'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DependencyGraph } from '@/components/DependencyGraph';
import { CvssModal } from '@/components/CvssModal';
import { EmbargoCountdown } from '@/components/EmbargoCountdown';

interface BugItem {
  id: number;
  summary: string;
  status: string;
  priority: string;
  severity: string;
  product_name?: string;
  component_name?: string;
  is_embargoed?: boolean;
  embargo_until?: string;
  cvss_score?: number;
  cvss_severity?: string;
}

const STATUS_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  UNCONFIRMED: { bg: 'bg-slate-800/80', text: 'text-slate-300', border: 'border-slate-700' },
  CONFIRMED:   { bg: 'bg-blue-950/80',  text: 'text-blue-300',  border: 'border-blue-800' },
  IN_PROGRESS: { bg: 'bg-purple-950/80',text: 'text-purple-300',border: 'border-purple-800' },
  RESOLVED:    { bg: 'bg-emerald-950/80', text: 'text-emerald-300', border: 'border-emerald-800' },
  VERIFIED:    { bg: 'bg-cyan-950/80',   text: 'text-cyan-300',   border: 'border-cyan-800' },
  CLOSED:      { bg: 'bg-slate-900',     text: 'text-slate-400',  border: 'border-slate-800' },
};

const PRIORITY_BADGES: Record<string, string> = {
  P1: 'text-red-400 bg-red-950/60 border-red-800/60',
  P2: 'text-orange-400 bg-orange-950/60 border-orange-800/60',
  P3: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
  P4: 'text-slate-400 bg-slate-800/60 border-slate-700/60',
  P5: 'text-slate-500 bg-slate-900 border-slate-800',
};

export default function Home() {
  const [bugs, setBugs] = useState<BugItem[]>([]);
  const [selectedBugId, setSelectedBugId] = useState<number>(1);
  const [showCvssModal, setShowCvssModal] = useState<boolean>(false);
  const [apiOnline, setApiOnline] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Health check
    fetch('http://localhost:3001/health')
      .then(res => res.ok ? setApiOnline(true) : setApiOnline(false))
      .catch(() => setApiOnline(false));

    // Fetch bugs
    fetch('http://localhost:3001/api/v1/bugs?limit=10')
      .then(res => res.json())
      .then(data => {
        if (data.bugs) {
          setBugs(data.bugs);
          if (data.bugs.length > 0) {
            setSelectedBugId(Number(data.bugs[0].id));
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans antialiased">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-rose-500 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-500/20">
                BZ
              </div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Bugzilla<span className="text-indigo-400 font-extrabold">Revamp</span>
              </span>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-indigo-500/30 bg-indigo-950/40 text-indigo-300">
              v3.0 Platform
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-slate-800 bg-slate-900/60 text-xs">
              <span className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-slate-400 font-medium">Fastify API: {apiOnline ? 'Online (:3001)' : 'Connecting...'}</span>
            </div>

            <a
              href="http://localhost:3001/docs"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition"
            >
              📚 Swagger Docs
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-8 shadow-2xl">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide uppercase">
              ⚡ 5 Core Algorithmic Moats Active
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Enterprise Defect & Vulnerability Governance Platform
            </h1>
            <p className="text-slate-400 text-base leading-relaxed">
              Replacing legacy CGI with Kahn&apos;s Critical Path DAG visualizer, FIRST.org CVSS v4.0 MacroVectors, 
              zero-leakage 404 security group secrecy, and real-time collaboration.
            </p>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Graph CPM Engine</div>
                <div className="text-sm font-semibold text-slate-200">Interactive Critical Path DAG</div>
                <div className="text-xs text-slate-400 mt-1">Kahn&apos;s topological sort with dynamic Earliest Finish Time (EFT) analysis.</div>
              </div>
              <a
                href={`/bugs/${selectedBugId}/graph`}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition"
              >
                Open Full DAG Viewer →
              </a>
            </div>

            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">FIRST.org CVSS v4.0</div>
                <div className="text-sm font-semibold text-slate-200">Vulnerability Calculator</div>
                <div className="text-xs text-slate-400 mt-1">MacroVector lookup with real-time SVG animated score arc.</div>
              </div>
              <button
                onClick={() => setShowCvssModal(true)}
                className="mt-4 text-left inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition"
              >
                Launch CVSS Calculator Modal →
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Security Isolation</div>
                <div className="text-sm font-semibold text-slate-200">90-Day Embargo Countdown</div>
                <div className="text-xs text-slate-400 mt-1">Automatic quarantine & strict 404 secrecy for unauthorized users.</div>
              </div>
              <div className="mt-4">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800/50">
                  🔒 Zero-Leakage 404 Enforced
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Live Embargo Banner Demonstration */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Security Embargo Banner Demo</h3>
          <EmbargoCountdown embargoUntil={new Date(Date.now() + 87 * 24 * 60 * 60 * 1000).toISOString()} />
        </section>

        {/* Interactive Critical Path DAG Visualizer Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>🕸️</span> Live Dependency Graph (Bug #{selectedBugId})
              </h2>
              <p className="text-xs text-slate-400">Pulsing red edges represent the longest critical path bottleneck.</p>
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="bug-select" className="text-xs text-slate-400 font-semibold">Select Root Bug:</label>
              <select
                id="bug-select"
                value={selectedBugId}
                onChange={(e) => setSelectedBugId(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:border-indigo-500"
              >
                {bugs.map((b) => (
                  <option key={b.id} value={b.id}>
                    #{b.id} — {b.summary.slice(0, 32)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DependencyGraph bugId={selectedBugId} />
        </section>

        {/* Bug Queue Explorer */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>📋</span> Master Bug Queue ({bugs.length} Sample Bugs Seeded)
              </h2>
              <p className="text-xs text-slate-400">Sourced from the PostgreSQL master seed dataset.</p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">Loading bugs from database...</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Summary</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {bugs.map((b) => {
                    const statusStyle = STATUS_BADGES[b.status] || STATUS_BADGES['CLOSED'];
                    const priorityStyle = PRIORITY_BADGES[b.priority] || PRIORITY_BADGES['P5'];

                    return (
                      <tr key={b.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 font-mono text-slate-400">
                          <Link href={`/bugs/${b.id}`} className="hover:text-indigo-400 font-semibold underline">
                            #{b.id}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-200 font-semibold max-w-md truncate">
                          <Link href={`/bugs/${b.id}`} className="hover:text-indigo-300 transition">
                            {b.summary}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                            {b.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${priorityStyle}`}>
                            {b.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{b.severity}</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <Link
                            href={`/bugs/${b.id}`}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-semibold border border-slate-700 transition"
                          >
                            Details
                          </Link>
                          <button
                            onClick={() => setSelectedBugId(Number(b.id))}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition"
                          >
                            DAG
                          </button>
                          <Link
                            href={`/bugs/${b.id}/graph`}
                            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition"
                          >
                            Graph →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* CVSS Modal Popup */}
      {showCvssModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <CvssModal
            bugId={selectedBugId}
            onClose={() => setShowCvssModal(false)}
            onSave={() => setShowCvssModal(false)}
          />
        </div>
      )}
    </div>
  );
}
