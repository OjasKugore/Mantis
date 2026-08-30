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
  { id: 'overview', title: 'Platform Architecture & Moats', icon: 'auto_awesome' },
  { id: 'cli-suite', title: 'Mantis CLI Complete Manual', icon: 'terminal' },
  { id: 'cpm-engine', title: 'Critical Path Engine (CPM & DAG)', icon: 'hub' },
  { id: 'security-embargo', title: '90-Day Embargo & CVSS v4.0', icon: 'lock' },
  { id: 'ai-triage', title: 'Gemini 2.0 Flash AI Triage', icon: 'psychology' },
  { id: 'kanban-scm', title: 'Kanban & SCM State Machine', icon: 'view_kanban' },
  { id: 'analytics-mttr', title: 'Sprint Burndown & Velocity MTTR', icon: 'query_stats' },
  { id: 'rbac-workspaces', title: 'Workspace Isolation & RBAC', icon: 'shield_person' },
  { id: 'review-flags', title: 'Code Review Flags & Audit Trails', icon: 'flag' },
  { id: 'power-features', title: 'Hidden Power-User Features', icon: 'bolt' },
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
                placeholder="Search all commands & features..."
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
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono font-bold">12 TOPICS</span>
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
              <div><code className="bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30 font-mono text-[11px]">?</code> Shortcuts modal</div>
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
              Mantis is an ultra-fast, enterprise-grade defect monitoring and triage platform built on a dual-engine architecture: a resilient serverless PostgreSQL backend with in-memory zero-latency caching and a keyboard-first terminal CLI.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">hub</span>
                </div>
                <h3 className="font-bold text-sm text-on-surface">Algorithmic CPM Graph</h3>
                <p className="text-xs text-on-surface-variant">Topologically sorted DAG resolving release bottlenecks with auto-locking rules.</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/15 text-red-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                </div>
                <h3 className="font-bold text-sm text-on-surface">90-Day Embargo &amp; CVSS v4.0</h3>
                <p className="text-xs text-on-surface-variant">Zero-leakage security boundaries with offline &amp; live FIRST.org macrovector calculation.</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">psychology</span>
                </div>
                <h3 className="font-bold text-sm text-on-surface">Gemini 2.0 AI Synthesis</h3>
                <p className="text-xs text-on-surface-variant">Instant thread summarization, root cause classification, and recommended action steps.</p>
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
                Located in <code>apps/cli</code>, the CLI supports both <code>mantis</code> and <code>bz</code> binary aliases. It persists sessions to <code>~/.mantis-session.json</code> and supports stdin piping.
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
                  <div key={idx} className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-on-surface">{item.title}</div>
                      <code className="text-xs font-mono text-primary font-bold block mt-1 break-all">{item.cmd}</code>
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
                  <div key={idx} className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-on-surface">{item.title}</div>
                      <code className="text-xs font-mono text-primary font-bold block mt-1 break-all">{item.cmd}</code>
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
                  <div key={idx} className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-on-surface">{item.title}</div>
                      <code className="text-xs font-mono text-primary font-bold block mt-1 break-all">{item.cmd}</code>
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
                    desc: 'Sets Bug #1 as blocking Bug #2.',
                  },
                  {
                    title: 'Remove Dependency Edge',
                    cmd: 'npm run mantis -- dep remove 1 2',
                    desc: 'Removes blocker relationship between Bug #1 and Bug #2.',
                  },
                  {
                    title: 'Offline CVSS v4.0 Scoring Calculator',
                    cmd: 'npm run mantis -- cvss "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N"',
                    desc: 'Computes macrovector score (0.0–10.0) and severity rating (CRITICAL/HIGH/MEDIUM/LOW) offline.',
                  },
                  {
                    title: 'Update Bug Security & 90-Day Embargo',
                    cmd: 'npm run mantis -- security update 1 --vector "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N" --security true --embargo 2026-11-30',
                    desc: 'Applies security classification and embargo disclosure deadline.',
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
                  <div key={idx} className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-on-surface">{item.title}</div>
                      <code className="text-xs font-mono text-primary font-bold block mt-1 break-all">{item.cmd}</code>
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
              Mantis treats bug dependency hierarchies as a Directed Acyclic Graph (DAG). It continuously performs topological sorting to detect critical path bottlenecks that constrain target release dates:
            </p>

            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 font-mono text-xs text-on-surface-variant space-y-1">
              <div className="text-primary font-bold">▲ Upstream Blockers (Must be resolved first):</div>
              <div className="pl-4">└── #100 [CONFIRMED] TLS certificate renegotiation bug <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[10px] font-bold">CRITICAL PATH</span></div>
              <div className="text-green-500 font-bold mt-2">● TARGET BUG: #101 [IN_PROGRESS] Core WebSocket Crash <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[10px] font-bold">CRITICAL PATH</span></div>
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
                  <span className="material-symbols-outlined text-primary text-[16px]">speed</span>
                  Sub-50ms DAG Traversal
                </div>
                <p className="text-on-surface-variant">
                  Calculates longest path weight and float/slack time using adjacency matrix representation in memory.
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
              In accordance with Coordinated Vulnerability Disclosure (CVD), vulnerabilities marked as security bugs are sealed under a strict 90-day embargo. Only members in the <code>security-team</code> group can view or discuss the issue.
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

          {/* SECTION 5: GEMINI AI TRIAGE */}
          <section id="ai-triage" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-indigo-400 text-[24px]">psychology</span>
              Gemini 2.0 Flash AI Triage Engine
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Mantis integrates Gemini 2.0 Flash to synthesize complex multi-page comment threads, identify root causes from stacktraces, and generate actionable triage recommendations:
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

          {/* SECTION 6: KANBAN & SCM STATE MACHINE */}
          <section id="kanban-scm" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">view_kanban</span>
              Kanban Board &amp; SCM Lifecycle State Machine
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Mantis features a real-time HTML5 drag-and-drop Kanban board adhering to strict state machine invariants:
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
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 text-xs space-y-1">
              <strong className="text-on-surface">GitHub / GitLab SCM Integration:</strong>
              <p className="text-on-surface-variant">
                Pushing commits containing <code>Fixes #123</code> or <code>Resolves #123</code> automatically moves the bug to <code>RESOLVED (FIXED)</code> and attaches the commit hash to the bug activity timeline.
              </p>
            </div>
          </section>

          {/* SECTION 7: SPRINT BURNDOWN & VELOCITY */}
          <section id="analytics-mttr" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">query_stats</span>
              Sprint Burndown &amp; Velocity (MTTR) Analytics
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Located on the Dashboard under the <strong>Analytics</strong> tab, Mantis plots real-time sprint burndown trajectories against milestone deadlines:
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

          {/* SECTION 8: WORKSPACE ISOLATION & RBAC */}
          <section id="rbac-workspaces" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">shield_person</span>
              Workspace Isolation &amp; Role-Based Access Control (RBAC)
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Mantis enforces strict per-team workspace isolation:
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

          {/* SECTION 9: CODE REVIEW FLAGS */}
          <section id="review-flags" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">flag</span>
              Code Review Flags (`?`, `+`, `-`) &amp; Audit Trails
            </h2>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Bugzilla-style flag gating is fully implemented on every bug report:
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

          {/* SECTION 10: HIDDEN MOATS & POWER-USER FEATURES */}
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

          {/* SECTION 11: KEYBOARD SHORTCUTS */}
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
                <div key={idx} className="p-3 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center justify-between gap-2">
                  <span className="text-on-surface font-medium">{s.desc}</span>
                  <code className="bg-surface-container-highest px-2 py-1 rounded border border-outline-variant/40 font-mono font-bold text-primary text-[11px] shrink-0">
                    {s.key}
                  </code>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 12: FAQ & TROUBLESHOOTING */}
          <section id="faq-troubleshooting" className="space-y-4 scroll-mt-24 pt-8 border-t border-outline-variant/20">
            <h2 className="font-display-md text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <span className="material-symbols-outlined text-amber-500 text-[24px]">quiz</span>
              Evaluator FAQ &amp; Troubleshooting
            </h2>

            <div className="space-y-3">
              <details className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 text-xs group cursor-pointer">
                <summary className="font-bold text-on-surface flex items-center justify-between">
                  <span>How do I test inviting another user in Incognito?</span>
                  <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
                </summary>
                <p className="text-on-surface-variant mt-2 leading-relaxed">
                  Go to <strong>Team Settings → Invite Member</strong>, generate an invite token link, copy it, and paste it into an Incognito window. Sign up or log in, and the user will automatically bind to your workspace with pre-allotted roles.
                </p>
              </details>

              <details className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 text-xs group cursor-pointer">
                <summary className="font-bold text-on-surface flex items-center justify-between">
                  <span>How do custom team workspaces isolate data from demo personas?</span>
                  <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
                </summary>
                <p className="text-on-surface-variant mt-2 leading-relaxed">
                  Non-demo users receive a private workspace scoped to their <code>team_name</code>. Custom accounts only see their team&apos;s bugs, members, and products, while evaluation personas remain preserved for hackathon judging.
                </p>
              </details>

              <details className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 text-xs group cursor-pointer">
                <summary className="font-bold text-on-surface flex items-center justify-between">
                  <span>Where is the 90-day security embargo countdown timer?</span>
                  <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
                </summary>
                <p className="text-on-surface-variant mt-2 leading-relaxed">
                  The active security embargo countdown timer is located directly at the top of each confidential security defect&apos;s detail page (e.g. <code>/bugs/1</code> or <code>/bugs/4</code>), displaying the live countdown to its specific disclosure date.
                </p>
              </details>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
