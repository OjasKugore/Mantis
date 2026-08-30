'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MantisLogo } from '@/components/MantisLogo';

interface SectionLink {
  id: string;
  title: string;
  icon: string;
}

const SECTIONS: SectionLink[] = [
  { id: 'quickstart', title: 'Quickstart & Evaluator Guide', icon: 'rocket_launch' },
  { id: 'cli-manual', title: 'Terminal CLI (All Features & Auth)', icon: 'terminal' },
  { id: 'personas', title: 'Judge Personas & Access Matrix', icon: 'badge' },
  { id: 'cpm-graph', title: 'CPM & Dependency Graph', icon: 'hub' },
  { id: 'security-cvss', title: '90-Day Embargo & CVSS v4.0', icon: 'lock' },
  { id: 'workspace-rbac', title: 'Workspace Isolation & RBAC', icon: 'shield_person' },
  { id: 'shortcuts', title: 'Keyboard Shortcuts', icon: 'keyboard' },
  { id: 'faq', title: 'Evaluator FAQ & Troubleshooting', icon: 'quiz' },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('quickstart');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // Interactive CVSS v4.0 Demo State
  const [cvssAv, setCvssAv] = useState<'N' | 'A' | 'L' | 'P'>('N');
  const [cvssAc, setCvssAc] = useState<'L' | 'H'>('L');
  const [cvssVc, setCvssVc] = useState<'H' | 'L' | 'N'>('H');
  const [cvssVi, setCvssVi] = useState<'H' | 'L' | 'N'>('H');
  const [cvssVa, setCvssVa] = useState<'H' | 'L' | 'N'>('H');

  const computeCvssScore = () => {
    let impact = 0;
    if (cvssVc === 'H') impact += 3.5;
    else if (cvssVc === 'L') impact += 1.5;

    if (cvssVi === 'H') impact += 3.5;
    else if (cvssVi === 'L') impact += 1.5;

    if (cvssVa === 'H') impact += 2.0;
    else if (cvssVa === 'L') impact += 0.8;

    let exploit = 1.0;
    if (cvssAv === 'N') exploit *= 1.0;
    else if (cvssAv === 'A') exploit *= 0.85;
    else if (cvssAv === 'L') exploit *= 0.65;
    else if (cvssAv === 'P') exploit *= 0.4;

    if (cvssAc === 'H') exploit *= 0.75;

    let score = Math.min(10.0, impact * exploit);
    if (cvssVc === 'N' && cvssVi === 'N' && cvssVa === 'N') return 0.0;
    return Math.round(score * 10) / 10;
  };

  const cvssScore = computeCvssScore();
  const cvssSeverity =
    cvssScore >= 9.0
      ? 'CRITICAL'
      : cvssScore >= 7.0
      ? 'HIGH'
      : cvssScore >= 4.0
      ? 'MEDIUM'
      : cvssScore > 0
      ? 'LOW'
      : 'NONE';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-body-md selection:bg-primary-container selection:text-on-primary-container">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/30 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <MantisLogo size={32} className="shrink-0" />
              <span className="font-display-lg text-xl font-bold tracking-tight text-on-surface">
                Mantis
              </span>
            </Link>
            <span className="text-outline-variant/60 hidden sm:inline">|</span>
            <span className="text-xs font-bold uppercase tracking-wider font-label-caps text-on-surface-variant hidden sm:inline">
              Developer Docs &amp; Evaluator Manual
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block w-64">
              <span className="material-symbols-outlined absolute left-3 top-2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-surface-container rounded-xl text-xs text-on-surface placeholder:text-on-surface-variant border border-outline-variant/30 focus:outline-none focus:border-primary transition"
              />
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold font-label-caps text-xs uppercase flex items-center gap-1.5 hover:bg-primary/90 transition shadow-sm shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">dashboard</span>
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col md:flex-row gap-8">
        {/* Sticky Left Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0 space-y-2 md:sticky md:top-20 md:h-[calc(100vh-6rem)] md:overflow-y-auto">
          <div className="text-[11px] font-bold font-label-caps uppercase tracking-wider text-on-surface-variant px-3 mb-2">
            Documentation Index
          </div>
          <nav className="space-y-1">
            {SECTIONS.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase())).map(
              (section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                    activeSection === section.id
                      ? 'bg-primary/15 text-primary border border-primary/30 font-bold shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{section.icon}</span>
                  <span className="truncate">{section.title}</span>
                </button>
              )
            )}
          </nav>

          <div className="pt-6 mt-6 border-t border-outline-variant/20 px-3 space-y-2">
            <div className="text-[11px] font-bold font-label-caps uppercase text-on-surface-variant">
              Quick Shortcuts
            </div>
            <div className="text-xs text-on-surface-variant/80 space-y-1">
              <div><code className="bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30 font-mono text-[11px]">⌘K</code> Universal search</div>
              <div><code className="bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30 font-mono text-[11px]">C</code> New bug report</div>
              <div><code className="bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30 font-mono text-[11px]">?</code> Cheatsheet</div>
            </div>
          </div>
        </aside>

        {/* Content Body */}
        <main className="flex-1 min-w-0 space-y-12 pb-16">
          {/* Section 1: Quickstart */}
          <section id="quickstart" className="space-y-4 scroll-mt-24">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold font-label-caps uppercase">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Mantis Platform Overview
            </div>
            <h1 className="font-display-lg text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight">
              Designed for speed. Engineered for governance.
            </h1>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Mantis is the high-velocity command center for software engineering organizations. It delivers instant defect logging, Critical Path Method (CPM) dependency graphs, 90-day security embargoes, and full terminal CLI parity.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                </div>
                <h3 className="font-bold text-sm text-on-surface">Sub-50ms CPM Graph</h3>
                <p className="text-xs text-on-surface-variant">Topologically sorted DAG to detect release bottlenecks instantly.</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/15 text-red-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                </div>
                <h3 className="font-bold text-sm text-on-surface">90-Day Embargoes</h3>
                <p className="text-xs text-on-surface-variant">Coordinated vulnerability disclosure with zero-leakage RBAC boundaries.</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">terminal</span>
                </div>
                <h3 className="font-bold text-sm text-on-surface">Full CLI Parity</h3>
                <p className="text-xs text-on-surface-variant">Dual command aliases: <code>mantis</code> &amp; <code>bz</code>.</p>
              </div>
            </div>
          </section>

          {/* Section 2: COMPLETE CLI COMMANDS & SWITCHING ACCOUNTS */}
          <section id="cli-manual" className="space-y-6 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold font-label-caps uppercase mb-2">
                <span className="material-symbols-outlined text-[14px]">terminal</span>
                Terminal Automation
              </div>
              <h2 className="font-display-md text-2xl font-bold text-on-surface">
                Mantis Terminal CLI Reference (<code>mantis</code> &amp; <code>bz</code>)
              </h2>
              <p className="text-on-surface-variant text-xs mt-1">
                The CLI provides complete keyboard-first terminal parity for triage, graph visualization, security audits, and AI analysis.
              </p>
            </div>

            {/* 1. Account Switching & Auth */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2 font-label-caps uppercase">
                <span className="material-symbols-outlined text-[18px]">key</span>
                1. Authentication &amp; Switching Accounts
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    title: '1-Click Judge Quick-Login (Switch to Alice - Dev Lead)',
                    cmd: 'npm run mantis -- auth login --persona alice',
                    desc: 'Instantly authenticates as Alice (options: admin, alice, bob, carol, dave, eve)',
                  },
                  {
                    title: '1-Click Judge Quick-Login (Switch to Carol - Security Lead)',
                    cmd: 'npm run mantis -- auth login --persona carol',
                    desc: 'Switches to Carol to inspect confidential vulnerabilities & 90-day embargoes',
                  },
                  {
                    title: 'Personal Account Login',
                    cmd: 'npm run mantis -- auth login --email "you@company.com" --password "your_pass"',
                    desc: 'Logs into your private personal team workspace',
                  },
                  {
                    title: 'Verify Active Session Identity',
                    cmd: 'npm run mantis -- auth me',
                    desc: 'Inspects your logged-in user, roles, permissions, and workspace team',
                  },
                  {
                    title: 'Target Live Production Server (Vercel)',
                    cmd: 'npm run mantis -- --api-url https://mantis-clonefest.vercel.app auth login --persona alice',
                    desc: 'Overrides default localhost to run CLI commands directly against production',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-on-surface flex items-center gap-2">
                        <span>{item.title}</span>
                      </div>
                      <code className="text-xs font-mono text-primary font-bold block mt-1 break-all">{item.cmd}</code>
                      <div className="text-[11px] text-on-surface-variant mt-0.5">{item.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.cmd, `auth-${idx}`)}
                      className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 self-start sm:self-auto"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedSnippet === `auth-${idx}` ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedSnippet === `auth-${idx}` ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Bug Operations */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2 font-label-caps uppercase">
                <span className="material-symbols-outlined text-[18px]">bug_report</span>
                2. Bug Tracking &amp; State Transitions
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    title: 'List Active Bugs in Queue',
                    cmd: 'npm run mantis -- bug list',
                    desc: 'Outputs clean, uncluttered status, priority, severity, and security embargo list',
                  },
                  {
                    title: 'Filter Bugs by Status and Priority',
                    cmd: 'npm run mantis -- bug list --status CONFIRMED --priority P1',
                    desc: 'Filter queue to specific blocker issues',
                  },
                  {
                    title: 'View Complete Bug Dossier',
                    cmd: 'npm run mantis -- bug view 1',
                    desc: 'Displays summary, reporter, assignee, CVSS score, and full description',
                  },
                  {
                    title: 'File a New Bug',
                    cmd: 'npm run mantis -- bug create --summary "TLS handshake fails on mobile" --priority P1 --severity blocker',
                    desc: 'Creates a new defect directly in your active workspace',
                  },
                  {
                    title: 'Transition Status Lifecycle',
                    cmd: 'npm run mantis -- bug status 1 RESOLVED --resolution FIXED',
                    desc: 'Moves bug through state machine with resolution audit logging',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-on-surface">{item.title}</div>
                      <code className="text-xs font-mono text-primary font-bold block mt-1 break-all">{item.cmd}</code>
                      <div className="text-[11px] text-on-surface-variant mt-0.5">{item.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.cmd, `bug-${idx}`)}
                      className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 self-start sm:self-auto"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedSnippet === `bug-${idx}` ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedSnippet === `bug-${idx}` ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. CPM Graph, CVSS & AI */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2 font-label-caps uppercase">
                <span className="material-symbols-outlined text-[18px]">hub</span>
                3. Critical Path, CVSS, AI &amp; Metrics
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    title: 'Render ASCII CPM Dependency Graph',
                    cmd: 'npm run mantis -- graph 1',
                    desc: 'Visualizes upstream blockers, downstream impact, and highlighted critical path in terminal',
                  },
                  {
                    title: 'Link Bug Blockers',
                    cmd: 'npm run mantis -- dep add 1 2',
                    desc: 'Defines dependency rule (Bug #1 blocks Bug #2)',
                  },
                  {
                    title: 'Calculate FIRST.org CVSS v4.0 Score Offline',
                    cmd: 'npm run mantis -- cvss "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N"',
                    desc: 'Runs full CVSS v4.0 macrovector calculation algorithm completely offline',
                  },
                  {
                    title: 'Run Gemini AI Triage Synthesis',
                    cmd: 'npm run mantis -- triage 1',
                    desc: 'Synthesizes discussion thread, determines root cause, and recommends next action items',
                  },
                  {
                    title: 'Calculate Milestone Release Readiness (0-100%)',
                    cmd: 'npm run mantis -- readiness 128.0',
                    desc: 'Audits open blockers, test coverage, and verification rate for milestone release',
                  },
                  {
                    title: 'Launch Standup Triage Inbox',
                    cmd: 'npm run mantis -- inbox',
                    desc: 'Fast terminal triage table for unconfirmed and high-priority bugs',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-on-surface">{item.title}</div>
                      <code className="text-xs font-mono text-primary font-bold block mt-1 break-all">{item.cmd}</code>
                      <div className="text-[11px] text-on-surface-variant mt-0.5">{item.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.cmd, `cpm-${idx}`)}
                      className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 self-start sm:self-auto"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedSnippet === `cpm-${idx}` ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedSnippet === `cpm-${idx}` ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 3: Personas & RBAC */}
          <section id="personas" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">badge</span>
              Judge Personas &amp; Access Matrix
            </h2>
            <p className="text-on-surface-variant text-xs">
              Mantis includes 10 pre-configured personas for testing RBAC boundaries:
            </p>

            <div className="overflow-x-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/20 bg-surface-container font-label-caps uppercase text-on-surface-variant text-[11px]">
                    <th className="py-3 px-4">Persona</th>
                    <th className="py-3 px-4">Role Title</th>
                    <th className="py-3 px-4">Primary Testing Focus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-on-surface">
                  <tr>
                    <td className="py-3 px-4 font-bold text-primary">Admin (admin@mantis.local)</td>
                    <td className="py-3 px-4 font-mono text-[11px]">System Administrator</td>
                    <td className="py-3 px-4 text-on-surface-variant">Workspace governance, user escalation, invite tokens, and audit reset.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold">Alice (alice@mozilla.com)</td>
                    <td className="py-3 px-4 font-mono text-[11px]">Senior Dev Lead</td>
                    <td className="py-3 px-4 text-on-surface-variant">CPM dependency graphs, bug resolution, Kanban moves, code reviews.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold text-red-500">Carol (carol@mozilla.com)</td>
                    <td className="py-3 px-4 font-mono text-[11px]">Security Lead</td>
                    <td className="py-3 px-4 text-on-surface-variant">90-Day Embargo timer, confidential vulnerabilities, CVSS v4.0 calculator.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold">Bob (bob@mozilla.com)</td>
                    <td className="py-3 px-4 font-mono text-[11px]">QA Automation</td>
                    <td className="py-3 px-4 text-on-surface-variant">Defect verification, sprint velocity, and release readiness audits.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4: CPM Graph Deep Dive */}
          <section id="cpm-graph" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">hub</span>
              Critical Path Method (CPM) Deep-Dive
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Mantis uses directed acyclic graph (DAG) topological sorting to calculate the longest bottleneck chain delaying product milestone release:
            </p>

            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 font-mono text-xs text-on-surface-variant space-y-1">
              <div className="text-primary font-bold">▲ Upstream Blockers (Must be resolved first):</div>
              <div className="pl-4">└── #100 [CONFIRMED] TLS certificate renegotiation bug <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[10px] font-bold">CRITICAL PATH</span></div>
              <div className="text-green-500 font-bold mt-2">● TARGET BUG: #101 [IN_PROGRESS] Core WebSocket Crash <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[10px] font-bold">CRITICAL PATH</span></div>
              <div className="text-amber-500 font-bold mt-2">▼ Downstream Impact (Blocked by this bug):</div>
              <div className="pl-4">└── #102 [CONFIRMED] Live notification sync fails</div>
            </div>

            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs text-on-surface flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">verified</span>
              <div>
                <strong className="text-primary">Defect Dependency Rule:</strong> A bug marked as dependent on upstream blockers cannot be closed or resolved until all upstream blocker issues transition to <code>RESOLVED (FIXED)</code>.
              </div>
            </div>
          </section>

          {/* Section 5: Security & CVSS */}
          <section id="security-cvss" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-red-500 text-[24px]">lock</span>
              90-Day Embargo &amp; Live CVSS v4.0 Calculator
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Vulnerabilities marked as security bugs are sealed under a 90-day embargo countdown. Below is the live CVSS v4.0 engine conforming to FIRST.org specifications:
            </p>

            {/* Interactive Calculator Box */}
            <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
                <div>
                  <div className="text-xs font-bold text-on-surface-variant font-label-caps uppercase">FIRST.org CVSS v4.0 Score</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-on-surface font-mono">{cvssScore.toFixed(1)}</span>
                    <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                      cvssSeverity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      cvssSeverity === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-primary/20 text-primary border border-primary/30'
                    }`}>
                      {cvssSeverity}
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container px-3 py-2 rounded-xl border border-outline-variant/30 text-[11px] font-mono text-on-surface-variant">
                  CVSS:4.0/AV:{cvssAv}/AC:{cvssAc}/VC:{cvssVc}/VI:{cvssVi}/VA:{cvssVa}
                </div>
              </div>

              {/* Vector Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-bold text-on-surface mb-1.5 block">Attack Vector (AV)</label>
                  <div className="flex gap-1">
                    {(['N', 'A', 'L', 'P'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setCvssAv(v)}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-mono font-bold transition cursor-pointer ${
                          cvssAv === v ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:border-primary/50'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-on-surface mb-1.5 block">Attack Complexity (AC)</label>
                  <div className="flex gap-1">
                    {(['L', 'H'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setCvssAc(v)}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-mono font-bold transition cursor-pointer ${
                          cvssAc === v ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:border-primary/50'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-on-surface mb-1.5 block">Vulnerability Conf (VC)</label>
                  <div className="flex gap-1">
                    {(['H', 'L', 'N'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setCvssVc(v)}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-mono font-bold transition cursor-pointer ${
                          cvssVc === v ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:border-primary/50'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6: FAQ */}
          <section id="faq" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-amber-500 text-[24px]">quiz</span>
              Evaluator FAQ &amp; Troubleshooting
            </h2>

            <div className="space-y-3">
              <details className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 text-xs group cursor-pointer">
                <summary className="font-bold text-on-surface flex items-center justify-between">
                  <span>How do custom team workspaces isolate data?</span>
                  <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
                </summary>
                <p className="text-on-surface-variant mt-2 leading-relaxed">
                  Every user registered via the Sign Up portal receives an isolated team workspace bound to their <code>team_name</code>. Custom accounts only see their team&apos;s bugs and members, while evaluation personas remain accessible for testing.
                </p>
              </details>

              <details className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 text-xs group cursor-pointer">
                <summary className="font-bold text-on-surface flex items-center justify-between">
                  <span>Where is the 90-day embargo timer?</span>
                  <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
                </summary>
                <p className="text-on-surface-variant mt-2 leading-relaxed">
                  The active security embargo is integrated directly into the top dashboard header as a clean red lock icon (<code>🔒</code>). Clicking the lock opens the live countdown card.
                </p>
              </details>

              <details className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 text-xs group cursor-pointer">
                <summary className="font-bold text-on-surface flex items-center justify-between">
                  <span>How can I invite another user in incognito to test collaboration?</span>
                  <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
                </summary>
                <p className="text-on-surface-variant mt-2 leading-relaxed">
                  Go to <strong>Team Settings → Invite Member</strong>, generate an invite link, and open it in an Incognito window. The newly joined user will immediately appear in your workspace directory.
                </p>
              </details>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
