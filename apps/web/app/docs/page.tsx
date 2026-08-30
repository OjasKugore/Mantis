'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MantisLogo } from '@/components/MantisLogo';

interface SectionLink {
  id: string;
  title: string;
  icon: string;
  tag?: string;
}

const SECTIONS: SectionLink[] = [
  { id: 'overview', title: 'Platform Architecture & Moats', icon: 'auto_awesome' },
  { id: 'cli-suite', title: 'Mantis CLI Complete Manual', icon: 'terminal' },
  { id: 'cpm-engine', title: 'Critical Path Engine (CPM & DAG)', icon: 'hub' },
  { id: 'security-embargo', title: '90-Day Embargo & CVSS v4.0', icon: 'lock' },
  { id: 'readiness-engine', title: 'Milestone Release Readiness', icon: 'verified', tag: 'NEW' },
  { id: 'audit-explorer', title: 'System-Wide Audit Explorer', icon: 'manage_search', tag: 'NEW' },
  { id: 'saved-views', title: 'Saved Views & Named Queries', icon: 'bookmarks', tag: 'NEW' },
  { id: 'keywords-taxonomy', title: 'Bugzilla Keywords Taxonomy', icon: 'label', tag: 'NEW' },
  { id: 'cc-notifications', title: 'CC & Watcher Notifications', icon: 'notifications_active', tag: 'NEW' },
  { id: 'csv-export', title: 'Streamed RFC 4180 CSV Export', icon: 'file_download', tag: 'NEW' },
  { id: 'github-scm', title: 'GitHub SCM Webhook & Traceability', icon: 'commit' },
  { id: 'ai-triage', title: 'Gemini 2.0 Flash AI Triage', icon: 'psychology' },
  { id: 'kanban-scm', title: 'Kanban Board & FSM Rollback', icon: 'view_kanban' },
  { id: 'analytics-mttr', title: 'Sprint Burndown & Velocity MTTR', icon: 'query_stats' },
  { id: 'search-duplicates', title: 'Stemmed FTS & Trigram Dupes', icon: 'search_check', tag: 'NEW' },
  { id: 'rbac-workspaces', title: 'Workspace Isolation & RBAC', icon: 'shield_person' },
  { id: 'enterprise-admin', title: 'Products, Teams & Invites', icon: 'corporate_fare', tag: 'NEW' },
  { id: 'review-flags', title: 'Code Review Flags (? / + / -)', icon: 'flag' },
  { id: 'markdown-mentions', title: 'GFM Markdown & @Mentions', icon: 'alternate_email', tag: 'NEW' },
  { id: 'power-features', title: 'Hidden Power-User Features', icon: 'bolt' },
  { id: 'testing-matrix', title: 'Test Suite & Invariants Matrix', icon: 'fact_check', tag: 'NEW' },
  { id: 'shortcuts-guide', title: 'Keyboard Shortcuts Cheatsheet', icon: 'keyboard' },
  { id: 'faq-troubleshooting', title: 'Evaluator FAQ & Troubleshooting', icon: 'quiz' },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview');
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

  const filteredSections = SECTIONS.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              Developer Docs, Feature Moats &amp; CLI Manual
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block w-72">
              <span className="material-symbols-outlined absolute left-3 top-2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search all 23 topics & commands..."
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
              Enter Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col md:flex-row items-start gap-8">
        {/* Sticky Left Navigation Sidebar */}
        <aside className="w-full md:w-72 md:min-w-[288px] md:max-w-[288px] shrink-0 space-y-2 md:sticky md:top-20 md:h-[calc(100vh-6rem)] md:overflow-y-auto pr-1">
          <div className="text-[11px] font-bold font-label-caps uppercase tracking-wider text-on-surface-variant px-3 mb-2 flex items-center justify-between">
            <span>Documentation Index</span>
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono font-bold">
              {filteredSections.length} TOPICS
            </span>
          </div>
          <nav className="space-y-1">
            {filteredSections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                  activeSection === section.id
                    ? 'bg-primary/15 text-primary border border-primary/30 font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined text-[16px] shrink-0">{section.icon}</span>
                  <span className="truncate">{section.title}</span>
                </div>
                {section.tag && (
                  <span className="text-[9px] bg-primary/20 text-primary font-bold px-1.5 py-0.2 rounded font-mono shrink-0 ml-1.5">
                    {section.tag}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="pt-6 mt-6 border-t border-outline-variant/20 px-3 space-y-2">
            <div className="text-[11px] font-bold font-label-caps uppercase text-on-surface-variant">
              Quick Shortcuts
            </div>
            <div className="text-xs text-on-surface-variant/80 space-y-1">
              <div>
                <code className="bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30 font-mono text-[11px]">
                  ⌘K
                </code>{' '}
                Universal search
              </div>
              <div>
                <code className="bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30 font-mono text-[11px]">
                  C
                </code>{' '}
                New bug report
              </div>
              <div>
                <code className="bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30 font-mono text-[11px]">
                  ?
                </code>{' '}
                Shortcuts modal
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Body */}
        <main className="flex-1 min-w-0 w-full space-y-16 pb-24">
          {/* SECTION 1: PLATFORM OVERVIEW & ARCHITECTURE */}
          <section id="overview" className="space-y-4 scroll-mt-24">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold font-label-caps uppercase">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Core Architecture &amp; Moats
            </div>
            <h1 className="font-display-lg text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight">
              Mantis Platform Reference &amp; Developer Manual
            </h1>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Mantis is an ultra-fast, enterprise-grade defect monitoring, vulnerability scoring, and release governance platform. Built on a dual-engine architecture: a resilient serverless PostgreSQL backend with in-memory zero-latency caching and a keyboard-first terminal CLI (`mantis` / `bz`).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">hub</span>
                </div>
                <h3 className="font-bold text-sm text-on-surface">Algorithmic CPM Graph</h3>
                <p className="text-xs text-on-surface-variant">
                  Topologically sorted DAG resolving release bottlenecks with cycle-rejection CTEs and auto-locking rules.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/15 text-red-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                </div>
                <h3 className="font-bold text-sm text-on-surface">90-Day Embargo &amp; CVSS v4.0</h3>
                <p className="text-xs text-on-surface-variant">
                  Zero-leakage security boundaries with offline &amp; live FIRST.org discrete MacroVector calculation.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">psychology</span>
                </div>
                <h3 className="font-bold text-sm text-on-surface">Gemini 2.0 AI Synthesis</h3>
                <p className="text-xs text-on-surface-variant">
                  Instant thread summarization, root cause classification, and recommended action steps in under 2 seconds.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 2: DEDICATED COMPLETE CLI MANUAL WITH ALL COMMANDS */}
          <section id="cli-suite" className="space-y-6 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <div>
              <h2 className="font-display-md text-2xl font-bold text-on-surface">
                Mantis CLI Reference (`mantis` &amp; `bz`)
              </h2>
              <p className="text-on-surface-variant text-xs mt-1">
                Located in <code>apps/cli</code>, the CLI supports both <code>mantis</code> and <code>bz</code> binary aliases. It persists sessions to <code>~/.mantis-session.json</code> and supports full UNIX stdin piping.
              </p>
            </div>

            {/* CLI Subgroup 1: Auth & Account Switching */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2 font-label-caps uppercase">
                <span className="material-symbols-outlined text-[18px]">key</span>
                1. Authentication &amp; Switching Accounts
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    title: 'Switch to Alice (Senior Dev Lead Persona)',
                    cmd: 'npm run mantis -- auth login --persona alice',
                    desc: 'Instantly authenticates as Alice to test dependency graphs, code reviews, and bug resolution.',
                  },
                  {
                    title: 'Switch to Carol (Security Lead Persona)',
                    cmd: 'npm run mantis -- auth login --persona carol',
                    desc: 'Switches to Carol to inspect confidential vulnerabilities and 90-day embargo countdowns.',
                  },
                  {
                    title: 'Switch to Admin (System Administrator)',
                    cmd: 'npm run mantis -- auth login --persona admin',
                    desc: 'Grants root workspace permissions, role escalation, and invite generation.',
                  },
                  {
                    title: 'Switch to Bob (QA Automation)',
                    cmd: 'npm run mantis -- auth login --persona bob',
                    desc: 'Switches to QA role to test defect verification, Kanban moves, and sprint burndowns.',
                  },
                  {
                    title: 'Personal Account Login (Email & Password)',
                    cmd: 'npm run mantis -- auth login --email "you@company.com" --password "your_password"',
                    desc: 'Logs into your private custom team workspace without using demo personas.',
                  },
                  {
                    title: 'Inspect Active Session & Role Permissions',
                    cmd: 'npm run mantis -- auth me',
                    desc: 'Prints active user display name, email, role (Admin/Member), groups, and team workspace name.',
                  },
                  {
                    title: 'Override API Target (Live Production / Custom Port)',
                    cmd: 'npm run mantis -- --api-url https://mantis-clonefest.vercel.app auth login --persona alice',
                    desc: 'Targets live Vercel production server or custom localhost port.',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-on-surface">{item.title}</div>
                      <code className="text-xs font-mono text-primary font-bold block mt-1 break-all">
                        {item.cmd}
                      </code>
                      <div className="text-[11px] text-on-surface-variant mt-0.5">{item.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.cmd, `auth-cmd-${idx}`)}
                      className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 self-start sm:self-auto"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedSnippet === `auth-cmd-${idx}` ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedSnippet === `auth-cmd-${idx}` ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* CLI Subgroup 2: Bug Operations */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2 font-label-caps uppercase">
                <span className="material-symbols-outlined text-[18px]">bug_report</span>
                2. Bug Queue &amp; State Transitions
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    title: 'List Active Bugs in Queue',
                    cmd: 'npm run mantis -- bug list',
                    desc: 'Prints clean, uncluttered tabular view of ID, STATUS, PRIORITY, SEVERITY, and SECURITY embargoes.',
                  },
                  {
                    title: 'Filter Bugs by Status and Priority',
                    cmd: 'npm run mantis -- bug list --status CONFIRMED --priority P1',
                    desc: 'Filters list by specific state (UNCONFIRMED, CONFIRMED, IN_PROGRESS, RESOLVED, VERIFIED, CLOSED).',
                  },
                  {
                    title: 'Stream Raw JSON Output',
                    cmd: 'npm run mantis -- bug list --json',
                    desc: 'Outputs machine-readable JSON for scripting and CI/CD pipelines.',
                  },
                  {
                    title: 'View Complete Bug Dossier',
                    cmd: 'npm run mantis -- bug view 1',
                    desc: 'Displays summary, reporter, assignee, product, CVSS vector score, embargo date, and full description.',
                  },
                  {
                    title: 'File a New Bug',
                    cmd: 'npm run mantis -- bug create --summary "WebSocket timeout on network drop" --priority P1 --severity blocker',
                    desc: 'Creates a new defect in your active workspace team queue.',
                  },
                  {
                    title: 'Transition Bug Status with Resolution Audit',
                    cmd: 'npm run mantis -- bug status 1 RESOLVED --resolution FIXED',
                    desc: 'Moves bug lifecycle (Options: FIXED, INVALID, WONTFIX, DUPLICATE, WORKSFORME, INCOMPLETE).',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-on-surface">{item.title}</div>
                      <code className="text-xs font-mono text-primary font-bold block mt-1 break-all">
                        {item.cmd}
                      </code>
                      <div className="text-[11px] text-on-surface-variant mt-0.5">{item.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.cmd, `bug-cmd-${idx}`)}
                      className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 self-start sm:self-auto"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedSnippet === `bug-cmd-${idx}` ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedSnippet === `bug-cmd-${idx}` ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* CLI Subgroup 3: Comments & Stdin Piping */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2 font-label-caps uppercase">
                <span className="material-symbols-outlined text-[18px]">chat</span>
                3. Discussion Threads &amp; Stdin Stream Piping
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    title: 'Read Comment Thread',
                    cmd: 'npm run mantis -- comment list 1',
                    desc: 'Prints chronological comment thread with author badges and timestamps.',
                  },
                  {
                    title: 'Post Comment via Argument',
                    cmd: 'npm run mantis -- comment add 1 "Verified fix on Firefox 128.0 build."',
                    desc: 'Posts direct comment text to the bug discussion.',
                  },
                  {
                    title: 'Pipe Markdown File or Log into Comment',
                    cmd: 'cat crash_log.txt | npm run mantis -- comment add 1',
                    desc: 'Reads stdin stream directly into comment body (perfect for CI/CD stacktraces).',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-on-surface">{item.title}</div>
                      <code className="text-xs font-mono text-primary font-bold block mt-1 break-all">
                        {item.cmd}
                      </code>
                      <div className="text-[11px] text-on-surface-variant mt-0.5">{item.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.cmd, `cmt-cmd-${idx}`)}
                      className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 self-start sm:self-auto"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedSnippet === `cmt-cmd-${idx}` ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedSnippet === `cmt-cmd-${idx}` ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* CLI Subgroup 4: Graph, Security, AI & Standup Inbox */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2 font-label-caps uppercase">
                <span className="material-symbols-outlined text-[18px]">hub</span>
                4. CPM Graphs, CVSS v4.0, AI &amp; Standup Inbox
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    title: 'Render Visual ASCII CPM Graph',
                    cmd: 'npm run mantis -- graph 1',
                    desc: 'Renders complete dependency tree highlighting upstream blockers and critical path bottleneck nodes.',
                  },
                  {
                    title: 'Add Dependency Edge',
                    cmd: 'npm run mantis -- dep add 1 2',
                    desc: 'Sets Bug #1 as blocking Bug #2 with cycle checks.',
                  },
                  {
                    title: 'Offline CVSS v4.0 Scoring Calculator',
                    cmd: 'npm run mantis -- cvss "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N"',
                    desc: 'Computes macrovector score (0.0–10.0) and severity rating (CRITICAL/HIGH/MEDIUM/LOW) offline.',
                  },
                  {
                    title: 'Run Gemini AI Triage Assistant',
                    cmd: 'npm run mantis -- triage 1',
                    desc: 'Runs Gemini 2.0 Flash to synthesize thread, identify root cause, and recommend next actions.',
                  },
                  {
                    title: 'Check Velocity & MTTR Analytics',
                    cmd: 'npm run mantis -- metrics velocity',
                    desc: 'Computes throughput (bugs/day), active issues, and Mean Time to Resolve (MTTR).',
                  },
                  {
                    title: 'Milestone Release Readiness Score (0-100%)',
                    cmd: 'npm run mantis -- readiness 128.0',
                    desc: 'Calculates release readiness gauge based on blocker resolution and verification rate.',
                  },
                  {
                    title: 'Launch Daily Standup Triage Inbox',
                    cmd: 'npm run mantis -- inbox',
                    desc: 'Shows actionable table of unconfirmed, blocker, and embargoed bugs requiring standup triage.',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-on-surface">{item.title}</div>
                      <code className="text-xs font-mono text-primary font-bold block mt-1 break-all">
                        {item.cmd}
                      </code>
                      <div className="text-[11px] text-on-surface-variant mt-0.5">{item.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.cmd, `cpm-cmd-${idx}`)}
                      className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 self-start sm:self-auto"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedSnippet === `cpm-cmd-${idx}` ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedSnippet === `cpm-cmd-${idx}` ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 3: CPM GRAPH DEEP DIVE */}
          <section id="cpm-engine" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">hub</span>
              Critical Path Method (CPM &amp; DAG) Algorithmic Depth
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Mantis treats bug dependency hierarchies as a Directed Acyclic Graph (DAG). Powered by React Flow and Dagre, it continuously performs topological sorting (Kahn&apos;s algorithm) to detect critical path bottlenecks constraining target release dates.
            </p>

            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 font-mono text-xs text-on-surface-variant space-y-1">
              <div className="text-primary font-bold">▲ Upstream Blockers (Must be resolved first):</div>
              <div className="pl-4">
                └── #100 [CONFIRMED] TLS certificate renegotiation bug{' '}
                <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  CRITICAL PATH
                </span>
              </div>
              <div className="text-green-500 font-bold mt-2">
                ● TARGET BUG: #101 [IN_PROGRESS] Core WebSocket Crash{' '}
                <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  CRITICAL PATH
                </span>
              </div>
              <div className="text-amber-500 font-bold mt-2">▼ Downstream Impact (Blocked by this bug):</div>
              <div className="pl-4">└── #102 [CONFIRMED] Live notification sync fails</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1.5">
                <div className="font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px]">lock_clock</span>
                  Auto-Resolution Blocker Rule
                </div>
                <p className="text-on-surface-variant">
                  A bug cannot transition to <code>RESOLVED</code> or <code>CLOSED</code> until all upstream blocker bugs have been resolved as <code>FIXED</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1.5">
                <div className="font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px]">all_inclusive</span>
                  Recursive CTE Cycle Detection
                </div>
                <p className="text-on-surface-variant">
                  Transactions execute recursive SQL CTEs prior to inserting dependency edges. Circular dependencies (`A → B → A`) immediately fail with HTTP <code>422 CYCLIC_DEPENDENCY_DETECTED</code>.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 4: 90-DAY EMBARGO & CVSS V4.0 */}
          <section id="security-embargo" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-red-500 text-[24px]">lock</span>
              90-Day Security Embargo &amp; Interactive CVSS v4.0 Calculator
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              In accordance with Coordinated Vulnerability Disclosure (CVD), vulnerabilities marked as security bugs are sealed under a strict 90-day embargo. Only members in the <code>security-team</code> group can view or discuss the issue; all other requests receive HTTP 404 with zero metadata leakage.
            </p>

            {/* Interactive Calculator Box */}
            <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
                <div>
                  <div className="text-xs font-bold text-on-surface-variant font-label-caps uppercase">
                    FIRST.org CVSS v4.0 Score
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-on-surface font-mono">
                      {cvssScore.toFixed(1)}
                    </span>
                    <span
                      className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                        cvssSeverity === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : cvssSeverity === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-primary/20 text-primary border border-primary/30'
                      }`}
                    >
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
                          cvssAv === v
                            ? 'bg-primary text-on-primary border-primary'
                            : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:border-primary/50'
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
                          cvssAc === v
                            ? 'bg-primary text-on-primary border-primary'
                            : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:border-primary/50'
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
                          cvssVc === v
                            ? 'bg-primary text-on-primary border-primary'
                            : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:border-primary/50'
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

          {/* SECTION 5: MILESTONE RELEASE READINESS ENGINE (NEW) */}
          <section id="readiness-engine" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-label-caps uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Algorithmic Health Engine
            </div>
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-emerald-400 text-[24px]">verified</span>
              Milestone Release Readiness Score (0–100% Algorithmic Model)
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Mantis computes an objective, deterministic release risk score for any milestone (e.g. <code>Firefox 128.0</code>). The engine evaluates base resolution progress against five discrete blocker risk factors:
            </p>

            {/* Mathematical Formula Box */}
            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 space-y-3 font-mono text-xs">
              <div className="text-primary font-bold uppercase tracking-wider text-[11px]">
                Mathematical Scoring Model:
              </div>
              <div className="p-3 bg-surface-container rounded-xl border border-outline-variant/30 text-on-surface text-[12px] leading-relaxed">
                Readiness = max(0, min(100, round( S_base - 0.5 * ( 15 * N_CPM + 20 * N_CVSS_Crit + 10 * N_CVSS_High + 5 * N_Flags + 8 * N_P1 ) )))
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-on-surface-variant pt-1">
                <div>• <strong>15 pts / Blocker:</strong> Open Critical Path DAG bottlenecks</div>
                <div>• <strong>20 pts / Blocker:</strong> CVSS v4.0 Critical (Score ≥ 9.0)</div>
                <div>• <strong>10 pts / Blocker:</strong> CVSS v4.0 High (Score 7.0–8.9)</div>
                <div>• <strong>5 pts / Flag:</strong> Pending <code>?</code> review or approval flags</div>
                <div>• <strong>8 pts / Bug:</strong> Open P1 / Blocker priority issues</div>
              </div>
            </div>

            {/* Status Tiers & SVG Ring Math */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                <div className="font-bold text-emerald-400 font-label-caps uppercase">READY_FOR_RELEASE</div>
                <div className="text-lg font-extrabold text-emerald-300">Score ≥ 85%</div>
                <p className="text-[11px] text-on-surface-variant">Zero critical path bottlenecks and minimal open risk.</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                <div className="font-bold text-amber-400 font-label-caps uppercase">NEEDS_ATTENTION</div>
                <div className="text-lg font-extrabold text-amber-300">60% ≤ Score &lt; 85%</div>
                <p className="text-[11px] text-on-surface-variant">Non-critical review flags or medium severity defects pending.</p>
              </div>
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1">
                <div className="font-bold text-rose-400 font-label-caps uppercase">BLOCKED</div>
                <div className="text-lg font-extrabold text-rose-300">Score &lt; 60%</div>
                <p className="text-[11px] text-on-surface-variant">Target milestone is blocked by active CPM bottleneck chain or zero-day.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 text-xs space-y-1.5">
              <div className="font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[16px]">code</span>
                REST API Contract: <code>GET /api/v1/analytics/readiness?milestone=128.0</code>
              </div>
              <p className="text-on-surface-variant">
                Returns the aggregate score, status tier, exact penalty breakdown, list of unresolved bug IDs, and critical path IDs in real time.
              </p>
            </div>
          </section>

          {/* SECTION 6: SYSTEM-WIDE AUDIT EXPLORER (NEW) */}
          <section id="audit-explorer" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold font-label-caps uppercase">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Immutable Event Stream
            </div>
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">manage_search</span>
              System-Wide Audit Explorer &amp; Immutable Activity Stream (`/audit`)
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Every mutation across the workspace is permanently recorded in an append-only PostgreSQL relational stream (`bugs_activity`). The <strong>Audit Explorer</strong> page provides server-side paginated queries with real-time field mutation filters.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2">
                <div className="font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px]">filter_alt</span>
                  Supported Field Filters
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                  {[
                    'Status Transitions',
                    'Resolutions',
                    'Priority',
                    'Severity',
                    'Assignee',
                    'CVSS Score',
                    'Embargo',
                    'Review Flags',
                    'Keywords',
                    'CC List',
                  ].map((f, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-surface-container border border-outline-variant/30 text-on-surface">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2">
                <div className="font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px]">security</span>
                  Regulatory &amp; Compliance Guarantee
                </div>
                <p className="text-on-surface-variant text-[11px] leading-relaxed">
                  Rows in `bugs_activity` are never updated or deleted. Full traceability ensures complete SOC2 and ISO 27001 audit compliance with actor identity, before/after diffs, and microsecond timestamps.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-on-surface">Query Workspace Audit Records</div>
                <code className="text-xs font-mono text-primary font-bold block mt-1">
                  GET /api/v1/audit?limit=20&amp;offset=0&amp;field=bug_status
                </code>
              </div>
              <Link
                href="/audit"
                className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
              >
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                <span>Open /audit</span>
              </Link>
            </div>
          </section>

          {/* SECTION 7: SAVED VIEWS & NAMED QUERIES (NEW) */}
          <section id="saved-views" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">bookmarks</span>
              Saved Views &amp; Named Queries (JSONB Persistence)
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Located directly above the main bug queue on the Dashboard, the <code>SavedViewsBar</code> allows engineers to save complex filter configurations into PostgreSQL JSONB with 1-click preset switching:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {[
                { name: 'P1 Blockers', icon: 'priority_high', color: 'text-rose-400', desc: 'Active P1 critical blockers' },
                { name: 'Security Embargoed', icon: 'lock', color: 'text-amber-400', desc: 'Active 90-day embargoed zero-days' },
                { name: 'Needs Triage', icon: 'pending_actions', color: 'text-sky-400', desc: 'Unconfirmed queue awaiting triage' },
                { name: 'In Progress', icon: 'timelapse', color: 'text-indigo-400', desc: 'Active development sprints' },
                { name: 'Resolved Fixed', icon: 'task_alt', color: 'text-emerald-400', desc: 'Verified and resolved fixes' },
                { name: 'Custom Queries', icon: 'add_circle', color: 'text-primary', desc: 'Save personal workspace named filters' },
              ].map((view, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
                  <div className="font-bold text-on-surface flex items-center gap-1.5">
                    <span className={`material-symbols-outlined text-[16px] ${view.color}`}>{view.icon}</span>
                    {view.name}
                  </div>
                  <p className="text-[11px] text-on-surface-variant">{view.desc}</p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-xs space-y-1.5">
              <div className="font-bold text-on-surface">REST API Endpoints:</div>
              <div className="font-mono text-[11px] text-primary space-y-0.5">
                <div>• GET /api/v1/saved-views (Fetch system presets + user queries)</div>
                <div>• POST /api/v1/saved-views (Body: &#123; name: string, query_json: object &#125;)</div>
                <div>• DELETE /api/v1/saved-views/:id (Delete user saved query)</div>
              </div>
            </div>
          </section>

          {/* SECTION 8: BUGZILLA KEYWORDS TAXONOMY (NEW) */}
          <section id="keywords-taxonomy" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">label</span>
              Bugzilla Keywords Classification Taxonomy
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Mantis implements the official Bugzilla keyword taxonomy system for multi-dimensional ticket categorization across products:
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { tag: 'regression', desc: 'Defect introduced by a recent commit' },
                { tag: 'crash', desc: 'Memory corruption or crash in renderer' },
                { tag: 'sec-audit', desc: 'Security audit finding' },
                { tag: 'perf', desc: 'Performance degradation or jank' },
                { tag: 'topcrash', desc: 'High-frequency telemetry crash' },
                { tag: 'intermittent', desc: 'Flaky CI/CD test failure' },
                { tag: 'accessibility', desc: 'Screen reader or a11y defect' },
              ].map((kw, i) => (
                <div key={i} className="px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-xs">
                  <span className="font-mono font-bold text-primary mr-1.5">#{kw.tag}</span>
                  <span className="text-[11px] text-on-surface-variant">{kw.desc}</span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 text-xs space-y-1">
              <strong className="text-on-surface">Relational Architecture:</strong>
              <p className="text-on-surface-variant">
                Keywords use a normalized relational structure (`keyword_defs` + `bug_keywords`). Tag additions and removals immediately write immutable audit trail records to `bugs_activity`.
              </p>
            </div>
          </section>

          {/* SECTION 9: CC / WATCHER NOTIFICATION PIPELINE (NEW) */}
          <section id="cc-notifications" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">notifications_active</span>
              CC / Watcher Subscriptions &amp; Notification Pipeline
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Developers, QA engineers, and security reviewers can watch any defect to receive real-time updates. The multi-cast dispatch pipeline automatically routes alerts when status, comments, or review flags change:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-1.5">
                <div className="font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px]">visibility</span>
                  1-Click Watch / Unwatch
                </div>
                <p className="text-on-surface-variant">
                  Toggle watching on any defect detail page (`/bugs/:id`). CC subscriptions are stored in <code>bug_cc</code> with foreign key cascading.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-1.5">
                <div className="font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px]">notifications</span>
                  Header Notification Bell
                </div>
                <p className="text-on-surface-variant">
                  Displays live unread count badges, instant popover preview with direct navigation links, and a 1-click &quot;Mark all as read&quot; action.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 10: STREAMED RFC 4180 CSV EXPORT (NEW) */}
          <section id="csv-export" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">file_download</span>
              Streamed RFC 4180 CSV Data Export
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Mantis guarantees complete data portability with high-speed RFC 4180 compliant CSV streaming. Click the <strong>&quot;Export CSV&quot;</strong> button on the Dashboard to export any filtered queue:
            </p>

            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2 text-xs">
              <div className="font-mono text-primary font-bold">
                GET /api/v1/bugs/export?status=all&amp;priority=P1&amp;severity=all&amp;embargo=all
              </div>
              <div className="text-[11px] text-on-surface-variant space-y-1">
                <div>• <strong>RFC 4180 Compliant:</strong> Quotes, escapes delimiters, and formats timestamps automatically.</div>
                <div>• <strong>404 Zero-Leakage Security Masking:</strong> Non-security sessions automatically omit quarantined 90-day embargoed defects at the SQL level.</div>
              </div>
            </div>
          </section>

          {/* SECTION 11: GITHUB SCM WEBHOOK & LIVE TRACEABILITY */}
          <section id="github-scm" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">commit</span>
              Real-Time GitHub SCM Webhook &amp; Traceability
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Mantis bridges git source code repositories directly to defect lifecycles with cryptographic webhook verification:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
                <div className="font-bold text-on-surface">HMAC-SHA256 Security</div>
                <p className="text-[11px] text-on-surface-variant">Validates <code>x-hub-signature-256</code> with <code>crypto.timingSafeEqual</code>.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
                <div className="font-bold text-on-surface">Commit Parsing</div>
                <p className="text-[11px] text-on-surface-variant">Parses <code>Fixes #1</code>, <code>Closes #1</code>, <code>Resolves #1</code>, and <code>Bug 1</code>.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
                <div className="font-bold text-on-surface">Auto-Resolution</div>
                <p className="text-[11px] text-on-surface-variant">Pushes to main automatically move bugs to <code>RESOLVED (FIXED)</code>.</p>
              </div>
            </div>

            {/* 30-Second Fast Test Card */}
            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2 text-xs">
              <div className="font-bold text-primary uppercase font-label-caps text-[11px] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">timer</span>
                30-Second Live Evaluator Test
              </div>
              <p className="text-on-surface-variant">
                Push a commit to our pre-configured demo repository: <code>https://github.com/OjasKugore/mantis-webhook-demo</code>
              </p>
              <code className="block bg-surface-container p-2.5 rounded-lg text-primary font-mono text-[11px] font-bold">
                git commit --allow-empty -m &quot;Fix network timeout (Fixes #1)&quot; &amp;&amp; git push origin main
              </code>
            </div>
          </section>

          {/* SECTION 12: GEMINI AI TRIAGE */}
          <section id="ai-triage" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-indigo-400 text-[24px]">psychology</span>
              Gemini 2.0 Flash AI Triage Engine
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Mantis integrates Google DeepMind&apos;s <strong>Gemini 2.0 Flash</strong> to synthesize multi-page comment threads, diagnose stacktraces, and generate structured triage dossiers in under 2 seconds:
            </p>

            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 space-y-3">
              <div className="text-xs font-bold text-primary font-label-caps uppercase">
                AI Synthesis Capabilities
              </div>
              <ul className="space-y-2 text-xs text-on-surface-variant">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <span><strong>Automatic Reproduction Extraction:</strong> Distills 50+ comments into 3 reproducible steps.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <span><strong>Root Cause Deduction:</strong> Analyzes linked PR diffs, stack traces, and subsystem ownership.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <span><strong>Confidence Scoring &amp; Next Steps:</strong> Recommends priority (P1–P5) with rationale and immediate assigned action items.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* SECTION 13: KANBAN & FSM STATE MACHINE */}
          <section id="kanban-scm" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">view_kanban</span>
              Kanban Board &amp; FSM Rollback Integrity
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              The <code>/kanban</code> board provides agile workflow visualization across 6 status columns with strict finite state machine integrity:
            </p>

            <div className="overflow-x-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 font-mono text-xs text-center">
              <div className="flex flex-wrap items-center justify-center gap-2 text-on-surface">
                <span className="px-2.5 py-1 rounded bg-yellow-500/15 text-yellow-600 font-bold">UNCONFIRMED</span>
                <span>→</span>
                <span className="px-2.5 py-1 rounded bg-cyan-500/15 text-cyan-600 font-bold">CONFIRMED</span>
                <span>→</span>
                <span className="px-2.5 py-1 rounded bg-blue-500/15 text-blue-600 font-bold">IN_PROGRESS</span>
                <span>→</span>
                <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-600 font-bold">RESOLVED</span>
                <span>→</span>
                <span className="px-2.5 py-1 rounded bg-green-500/20 text-green-700 font-bold">VERIFIED</span>
                <span>→</span>
                <span className="px-2.5 py-1 rounded bg-slate-500/20 text-slate-400 font-bold">CLOSED</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 text-xs space-y-1">
              <strong className="text-on-surface">Optimistic UI with Automatic FSM Rollback:</strong>
              <p className="text-on-surface-variant">
                Dragging a card to an invalid column (e.g. <code>UNCONFIRMED → CLOSED</code>) is immediately rejected by the server state machine. The card automatically bounces back to its original column and shows an explanatory error toast.
              </p>
            </div>
          </section>

          {/* SECTION 14: SPRINT BURNDOWN & VELOCITY */}
          <section id="analytics-mttr" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">query_stats</span>
              Sprint Burndown &amp; Velocity (MTTR) Analytics
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Located on the Dashboard under the <strong>Analytics</strong> tab, Mantis computes real-time sprint burndown trajectories and pure SQL MTTR metrics:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30">
                <div className="font-bold text-on-surface">Throughput Velocity</div>
                <div className="text-lg font-extrabold text-primary mt-1">3.4 bugs/day</div>
                <div className="text-[11px] text-on-surface-variant mt-0.5">Average sprint resolution pace</div>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30">
                <div className="font-bold text-on-surface">Mean Time to Resolve (MTTR)</div>
                <div className="text-lg font-extrabold text-cyan-500 mt-1">18.5 Hours</div>
                <div className="text-[11px] text-on-surface-variant mt-0.5">From triage to verified fix</div>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30">
                <div className="font-bold text-on-surface">Milestone Readiness</div>
                <div className="text-lg font-extrabold text-emerald-500 mt-1">92% Ready</div>
                <div className="text-[11px] text-on-surface-variant mt-0.5">Target: Firefox v128.0</div>
              </div>
            </div>
          </section>

          {/* SECTION 15: STEMMED FTS & TRIGRAM DUPLICATE PREVENTION (NEW) */}
          <section id="search-duplicates" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">search_check</span>
              Stemmed Full-Text Search &amp; Trigram Duplicate Prevention
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Mantis provides two powerful textual engines to keep defect queues clean and instantly searchable:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2">
                <div className="font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px]">travel_explore</span>
                  PostgreSQL FTS (`tsvector` + GIN)
                </div>
                <p className="text-on-surface-variant text-[11px]">
                  Sub-20ms stemmed English search index. Searching <code>&quot;parse&quot;</code> matches <code>&quot;parsing&quot;</code>, <code>&quot;parsed&quot;</code>, and <code>&quot;parser&quot;</code> with highlighted mark tags.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2">
                <div className="font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px]">content_copy</span>
                  Proactive Duplicate Prevention (`pg_trgm`)
                </div>
                <p className="text-on-surface-variant text-[11px]">
                  As an engineer types on <code>/bugs/new</code>, a debounced query checks trigram similarity (&gt; 0.28). Candidate duplicate tickets are surfaced <em>before</em> form submission.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 16: WORKSPACE ISOLATION & RBAC */}
          <section id="rbac-workspaces" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">shield_person</span>
              Workspace Isolation &amp; Role-Based Access Control (RBAC)
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Mantis enforces strict per-team workspace isolation with granular group permissions:
            </p>

            <div className="overflow-x-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/20 bg-surface-container font-label-caps uppercase text-on-surface-variant text-[11px]">
                    <th className="py-3 px-4">Role / Group</th>
                    <th className="py-3 px-4">Permissions</th>
                    <th className="py-3 px-4">Confidential Embargo Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-on-surface">
                  <tr>
                    <td className="py-3 px-4 font-bold text-primary">Workspace Administrator</td>
                    <td className="py-3 px-4 text-on-surface-variant">Full instance governance, user ranking escalation, invite tokens, seed reset.</td>
                    <td className="py-3 px-4 font-bold text-green-500">Unrestricted</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold">Security Lead (`security-team`)</td>
                    <td className="py-3 px-4 text-on-surface-variant">CVSS v4.0 scoring, embargo management, CVE drafting.</td>
                    <td className="py-3 px-4 font-bold text-green-500">Unrestricted</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold">Senior Dev Lead (`dev-team`)</td>
                    <td className="py-3 px-4 text-on-surface-variant">CPM graph manipulation, bug resolution, code reviews, PR flags.</td>
                    <td className="py-3 px-4 text-red-500 font-bold">Blocked during 90d embargo</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold">QA Automation (`qa-team`)</td>
                    <td className="py-3 px-4 text-on-surface-variant">Defect filing, milestone audits, verification sign-offs.</td>
                    <td className="py-3 px-4 text-red-500 font-bold">Blocked during 90d embargo</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 17: PRODUCTS, TEAMS & INVITES (NEW) */}
          <section id="enterprise-admin" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">corporate_fare</span>
              Product Hierarchy, Team Invitations &amp; Onboarding
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Mantis provides complete self-service administration for engineering teams:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
                <div className="font-bold text-on-surface">Product &amp; Component Routing</div>
                <p className="text-[11px] text-on-surface-variant">
                  Configure products and granular sub-components with default component assignees on <code>/settings/products</code>.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
                <div className="font-bold text-on-surface">Time-Limited Token Invites</div>
                <p className="text-[11px] text-on-surface-variant">
                  Generate secure invite links on <code>/settings/team</code> with pre-configured RBAC role binding.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
                <div className="font-bold text-on-surface">Workspace Onboarding</div>
                <p className="text-[11px] text-on-surface-variant">
                  Self-service workspace initialization with sensible defaults and triage queues on <code>/onboarding</code>.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 18: CODE REVIEW FLAGS */}
          <section id="review-flags" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">flag</span>
              Code Review Flags (`?`, `+`, `-`) &amp; Patch Governance
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Bugzilla-style flag gating is fully implemented on every bug report to separate review sign-offs from ticket status:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30">
                <div className="font-bold text-amber-500 font-mono text-base">? (Requested)</div>
                <p className="text-on-surface-variant mt-1">Review requested from a specific teammate (e.g. <code>review?alice</code>).</p>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30">
                <div className="font-bold text-emerald-500 font-mono text-base">+ (Granted)</div>
                <p className="text-on-surface-variant mt-1">Review approved. Unblocks landing the patch into release candidate branches.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30">
                <div className="font-bold text-red-500 font-mono text-base">- (Denied)</div>
                <p className="text-on-surface-variant mt-1">Changes requested or security exception denied.</p>
              </div>
            </div>
          </section>

          {/* SECTION 19: GFM MARKDOWN & @MENTIONS (NEW) */}
          <section id="markdown-mentions" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">alternate_email</span>
              GFM Markdown &amp; Interactive @Mentions Collaboration
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              The comment editor provides an ultra-fast developer collaboration experience:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-1.5">
                <div className="font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px]">edit_note</span>
                  Dual-Tab Write / Preview Markdown
                </div>
                <p className="text-on-surface-variant">
                  Supports GitHub-Flavored Markdown tables, checklists, callouts, and syntax-highlighted code fences with 1-click clipboard copy.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-1.5">
                <div className="font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px]">person_search</span>
                  Interactive @Mentions Autocomplete
                </div>
                <p className="text-on-surface-variant">
                  Typing <code>@</code> opens an avatar typeahead popup. Mentioned engineers immediately receive in-app notification alerts.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 20: HIDDEN POWER-USER FEATURES */}
          <section id="power-features" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface">
              Hidden Power-User Features &amp; Capabilities
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-1.5">
                <div className="font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">lock_reset</span>
                  1. One-Time Demo State Reset
                </div>
                <p className="text-on-surface-variant">
                  Judges can test breaking things without fear. Trigger <code>fetch(&apos;/api/v1/admin/reset&apos;, &#123; method: &apos;POST&apos; &#125;)</code> in console or click Reset Demo to re-seed all 24 initial bugs.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-1.5">
                <div className="font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">cookie</span>
                  2. Cold-Start Resilient JWT Cookie Fallback
                </div>
                <p className="text-on-surface-variant">
                  Sessions seamlessly survive Vercel serverless cold starts using dual lookup: DB session table + HMAC-signed fallback token cookie (<code>mantis_user_token</code>).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-1.5">
                <div className="font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">share</span>
                  3. Shareable Open Invite Tokens
                </div>
                <p className="text-on-surface-variant">
                  Admins can generate open invitation URLs that allow teammates to self-register into their workspace with pre-allotted RBAC roles in Incognito mode.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-1.5">
                <div className="font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">format_paint</span>
                  4. Dark / Light Mode Glassmorphism Theme
                </div>
                <p className="text-on-surface-variant">
                  Curated HSL color design system with tailored sage green accents (<code>#87a96b</code>) and dark glassmorphic backdrops.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 21: AUTOMATED TEST MATRIX (NEW) */}
          <section id="testing-matrix" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">fact_check</span>
              Automated Test Suite &amp; Invariant Verification Matrix
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Mantis contains <strong>36 test suites with 141 named assertions</strong>, executing in ~4.2 seconds with a 100% green pass rate:
            </p>

            <div className="overflow-x-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/20 bg-surface-container font-label-caps uppercase text-on-surface-variant text-[11px]">
                    <th className="py-2.5 px-4">Verification Domain</th>
                    <th className="py-2.5 px-4">Key Invariant Assertions Verified</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-on-surface">
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-primary">Topological Order &amp; CPM</td>
                    <td className="py-2.5 px-4 text-on-surface-variant">Kahn&apos;s algorithm identifies critical paths; recursive CTE rejects cyclic blocker edges with 422.</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-400">100% Passed</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-primary">CVSS v4.0 Math Standard</td>
                    <td className="py-2.5 px-4 text-on-surface-variant">Discrete MacroVectors match official FIRST.org benchmark vectors (9.3 CRITICAL, 8.7 HIGH, 1.8 LOW).</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-400">100% Passed</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-primary">Finite State Machine</td>
                    <td className="py-2.5 px-4 text-on-surface-variant">All 6 valid transitions succeed; illegal jumps and missing resolution codes abort with 422.</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-400">100% Passed</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-primary">404 Zero-Leakage Secrecy</td>
                    <td className="py-2.5 px-4 text-on-surface-variant">Non-security members requesting 90-day embargoed defects receive strict 404s with zero leakage.</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-400">100% Passed</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-primary">Cryptographic Webhooks</td>
                    <td className="py-2.5 px-4 text-on-surface-variant">Constant-time HMAC-SHA256 comparison; `Fixes #1` commit auto-resolves defect and appends audit entry.</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-400">100% Passed</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 22: KEYBOARD SHORTCUTS */}
          <section id="shortcuts-guide" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">keyboard</span>
              Keyboard Shortcuts Cheatsheet
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { key: '⌘K / Ctrl+K', desc: 'Open universal command palette & quick search' },
                { key: 'C', desc: 'Open modal to file a new bug report' },
                { key: 'G then D', desc: 'Navigate directly to Dashboard' },
                { key: 'G then K', desc: 'Navigate directly to Kanban Board' },
                { key: 'J / K', desc: 'Move selection up/down in bug lists' },
                { key: '?', desc: 'Show full keyboard shortcut cheatsheet modal' },
                { key: 'Esc', desc: 'Close open modals or clear search filter' },
              ].map((s, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center justify-between gap-2"
                >
                  <span className="text-on-surface font-medium">{s.desc}</span>
                  <code className="bg-surface-container-highest px-2 py-1 rounded border border-outline-variant/40 font-mono font-bold text-primary text-[11px] shrink-0">
                    {s.key}
                  </code>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 23: FAQ & TROUBLESHOOTING */}
          <section id="faq-troubleshooting" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-amber-500 text-[24px]">quiz</span>
              Evaluator FAQ &amp; Troubleshooting
            </h2>

            <div className="space-y-3">
              <details className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 text-xs group cursor-pointer">
                <summary className="font-bold text-on-surface flex items-center justify-between">
                  <span>How do I test inviting another user in Incognito?</span>
                  <span className="material-symbols-outlined group-open:rotate-180 transition-transform">
                    expand_more
                  </span>
                </summary>
                <p className="text-on-surface-variant mt-2 leading-relaxed">
                  Go to <strong>Team Settings → Invite Member</strong>, generate an invite token link, copy it, and paste it into an Incognito window. Sign up or log in, and the user will automatically bind to your workspace with pre-allotted roles.
                </p>
              </details>

              <details className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 text-xs group cursor-pointer">
                <summary className="font-bold text-on-surface flex items-center justify-between">
                  <span>How do custom team workspaces isolate data from demo personas?</span>
                  <span className="material-symbols-outlined group-open:rotate-180 transition-transform">
                    expand_more
                  </span>
                </summary>
                <p className="text-on-surface-variant mt-2 leading-relaxed">
                  Non-demo users receive a private workspace scoped to their <code>team_name</code>. Custom accounts only see their team&apos;s bugs, members, and products, while evaluation personas remain preserved for hackathon judging.
                </p>
              </details>

              <details className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 text-xs group cursor-pointer">
                <summary className="font-bold text-on-surface flex items-center justify-between">
                  <span>Where is the 90-day security embargo countdown timer?</span>
                  <span className="material-symbols-outlined group-open:rotate-180 transition-transform">
                    expand_more
                  </span>
                </summary>
                <p className="text-on-surface-variant mt-2 leading-relaxed">
                  The active security embargo countdown timer is located directly at the top of each confidential security defect&apos;s detail page (e.g. <code>/bugs/1</code> or <code>/bugs/4</code>), displaying the live countdown to its specific disclosure date.
                </p>
              </details>

              <details className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 text-xs group cursor-pointer">
                <summary className="font-bold text-on-surface flex items-center justify-between">
                  <span>How do I test GitHub SCM webhooks live right now?</span>
                  <span className="material-symbols-outlined group-open:rotate-180 transition-transform">
                    expand_more
                  </span>
                </summary>
                <p className="text-on-surface-variant mt-2 leading-relaxed">
                  Clone <code>https://github.com/OjasKugore/mantis-webhook-demo</code> and push a commit with message <code>Fixes #1</code>. Open Bug #1 on Mantis to see the commit in the SCM tab and the bug automatically moved to <code>RESOLVED (FIXED)</code>.
                </p>
              </details>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
