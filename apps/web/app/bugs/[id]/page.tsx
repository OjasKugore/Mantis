'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { EmbargoCountdown } from '@/components/EmbargoCountdown';
import { CvssModal } from '@/components/CvssModal';
import { CommentEditor } from '@/components/CommentEditor';
import { NotificationBell } from '@/components/NotificationBell';
import { AiTriageCard } from '@/components/AiTriageCard';
import { GitHubScmCard } from '@/components/GitHubScmCard';
import { FlagsCard } from '@/components/FlagsCard';
import { useAuth, SEED_PERSONAS } from '@/lib/auth-context';
import { CheckCircle2 } from 'lucide-react';

interface ActivityItem {
  id: number;
  bug_id: number;
  who_id: string;
  who_name?: string;
  who_username?: string;
  changed_at: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  comment?: string;
}

interface BugDetail {
  id: number;
  summary: string;
  description: string;
  status: string;
  resolution: string | null;
  priority: string;
  severity: string;
  product_id: number;
  product_name?: string;
  component_id: number;
  component_name?: string;
  version: string;
  target_milestone: string;
  reporter_id: string;
  reporter_name?: string;
  reporter_username?: string;
  assignee_id: string | null;
  assignee_name?: string;
  assignee_username?: string;
  estimated_time: string | number;
  remaining_time: string | number;
  is_embargoed: boolean;
  embargo_until: string | null;
  cvss_score: number | null;
  cvss_vector: string | null;
  cvss_severity: string | null;
  created_at: string;
  updated_at: string;
  activity?: ActivityItem[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function BugDetailPage({ params }: { params: { id: string } }) {
  const bugId = Number(params.id);
  const { user, quickLogin, logout } = useAuth();
  const [bug, setBug] = useState<BugDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCvssModal, setShowCvssModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [livePulse, setLivePulse] = useState(false);
  const [activeTab, setActiveTab] = useState<'activity' | 'ai' | 'scm' | 'flags'>('activity');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const fetchBug = (silent = false) => {
    if (!silent) setLoading(true);
    fetch(`${API_BASE}/api/v1/bugs/${bugId}`, {
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? 'Bug not found (or protected under confidential security group embargo)'
              : 'Failed to fetch bug'
          );
        }
        return res.json();
      })
      .then((data) => {
        setBug(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBug();
  }, [bugId]);

  // ── ⚡ Real-Time Collaboration (SSE Stream) ──────────────────────────────────
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`${API_BASE}/api/v1/bugs/${bugId}/live`, {
        withCredentials: true,
      });

      eventSource.addEventListener('connected', () => {
        setSseConnected(true);
      });

      eventSource.addEventListener('update', () => {
        setLivePulse(true);
        setTimeout(() => setLivePulse(false), 2000);
        fetchBug(true);
      });

      eventSource.onerror = () => {
        setSseConnected(false);
      };
    } catch {
      setSseConnected(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [bugId]);

  const handleStatusTransition = async (newStatus: string, resolution?: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/bugs/${bugId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus,
          resolution: resolution || (newStatus === 'RESOLVED' ? 'FIXED' : undefined),
          comment: `Status transitioned to ${newStatus} via Web UI`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setActionMessage(`Error: ${err.message || 'Status transition forbidden'}`);
        return;
      }

      setActionMessage(`✅ Successfully transitioned to ${newStatus}`);
      setTimeout(() => setActionMessage(null), 3000);
      fetchBug(true);
    } catch {
      setActionMessage('Failed to update status.');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/bugs/${bugId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: newComment, format: 'markdown' }),
      });

      if (res.ok) {
        setNewComment('');
        fetchBug(true);
        setActionMessage('✅ Comment posted.');
        setTimeout(() => setActionMessage(null), 2500);
      } else {
        setActionMessage('Failed to post comment');
      }
    } catch {
      setActionMessage('Network error posting comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-on-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-on-surface-variant text-sm font-medium">Loading Bug #{bugId}...</span>
        </div>
      </div>
    );
  }

  if (error || !bug) {
    return (
      <div className="min-h-screen bg-background text-on-surface p-8 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 bg-error-container text-on-error-container border border-error/20 rounded-xl mx-auto flex items-center justify-center text-xl font-bold">
            404
          </div>
          <h2 className="text-xl font-bold text-on-surface font-headline-sm">Bug #{bugId} Unavailable</h2>
          <p className="text-on-surface-variant text-xs leading-relaxed">
            {error || 'This bug does not exist or is currently restricted under security embargo.'}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold font-label-caps uppercase hover:bg-primary/90 transition shadow-sm"
          >
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-secondary-container/30 text-on-secondary-container border-secondary-container';
      case 'RESOLVED':
        return 'bg-surface-container-high text-on-surface-variant border-outline-variant/30';
      case 'IN_PROGRESS':
        return 'bg-tertiary-container/20 text-tertiary border-tertiary-container';
      case 'CONFIRMED':
        return 'bg-primary-container/20 text-primary border-primary/20';
      case 'UNCONFIRMED':
        return 'bg-surface-container-high text-on-surface-variant border-outline-variant/30';
      default:
        return 'bg-surface-container text-on-surface-variant border-outline-variant/20';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'P1':
        return 'bg-error-container text-on-error-container border-error/30 font-bold';
      case 'P2':
        return 'bg-tertiary-fixed text-on-tertiary-container border-tertiary/30';
      case 'P3':
        return 'bg-tertiary-container/20 text-tertiary border-tertiary-container/40';
      default:
        return 'bg-surface-container-high text-on-surface-variant border-outline-variant/30';
    }
  };

  return (
    <div className="bg-background text-on-surface font-body-md h-screen flex overflow-hidden selection:bg-primary-container selection:text-on-primary-container">
      {/* SideNavBar */}
      <aside
        className={`h-screen ${
          sidebarOpen ? 'w-64' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'
        } bg-surface-container-low shadow-sm flex flex-col py-margin-sm px-4 gap-gutter z-20 shrink-0 border-r border-outline-variant/30 transition-all duration-300 overflow-hidden`}
        id="sidebar"
      >
        <div className="flex items-center gap-3 px-2 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center text-on-primary-container font-headline-md shadow-sm shrink-0">
              <span className="text-sm font-bold">M</span>
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-headline-sm text-headline-sm font-bold text-primary leading-none text-xl">
                  Mantis
                </h1>
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase opacity-70 mt-1">
                  V3.0 Platform
                </p>
              </div>
            )}
          </Link>
        </div>

        <Link
          href="/bugs/new"
          className="bg-primary-container text-on-primary-container font-label-caps text-label-caps uppercase py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-primary hover:text-on-primary transition-colors shadow-sm w-full font-bold"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          {sidebarOpen && 'Report Bug'}
        </Link>

        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
          <Link
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-primary font-bold bg-surface-bright border-l-4 border-primary scale-95 duration-150 ease-in-out"
            href="/dashboard"
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Dashboard</span>}
          </Link>
          <Link
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-variant/20 transition-colors"
            href="/dashboard"
          >
            <span className="material-symbols-outlined text-[20px]">list_alt</span>
            {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Bug Queue</span>}
          </Link>
          <Link
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-variant/20 transition-colors"
            href="/kanban"
          >
            <span className="material-symbols-outlined text-[20px]">view_kanban</span>
            {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Kanban Board</span>}
          </Link>
          <Link
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-variant/20 transition-colors"
            href={`/bugs/${bug.id}/graph`}
          >
            <span className="material-symbols-outlined text-[20px]">hub</span>
            {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Dependency Graph</span>}
          </Link>
          <Link
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-variant/20 transition-colors"
            href="/dashboard"
          >
            <span className="material-symbols-outlined text-[20px]">security</span>
            {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Governance</span>}
          </Link>
        </nav>

        <div className="mt-auto pt-4 border-t border-outline-variant/30 flex flex-col gap-1">
          <a
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-variant/20 transition-colors"
            href="http://localhost:3001/docs"
            target="_blank"
            rel="noreferrer"
          >
            <span className="material-symbols-outlined text-lg">help</span>
            {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Support &amp; Docs</span>}
          </a>
          <Link
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-variant/20 transition-colors"
            href="/login"
          >
            <span className="material-symbols-outlined text-lg">account_circle</span>
            {sidebarOpen && <span className="font-label-caps text-label-caps uppercase">Account</span>}
          </Link>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TopNavBar */}
        <header className="w-full bg-background border-b border-outline-variant/30 z-10 shrink-0">
          <div className="flex justify-between items-center px-4 md:px-margin-lg py-4 w-full max-w-max-width mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center p-1 rounded-md hover:bg-surface-container"
                title="Toggle Sidebar"
              >
                <span className="material-symbols-outlined text-2xl">menu</span>
              </button>

              <div className="hidden sm:flex items-center gap-2 text-sm text-on-surface-variant font-body-sm">
                <Link href="/dashboard" className="hover:text-primary transition-colors">
                  Dashboard
                </Link>
                <span>/</span>
                <span className="font-medium text-on-surface">Bug #{bug.id}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <nav className="hidden lg:flex items-center gap-6">
                <a
                  className="text-on-surface-variant hover:text-primary transition-all font-body-sm font-medium opacity-80 hover:opacity-100"
                  href="http://localhost:3001/docs"
                  target="_blank"
                  rel="noreferrer"
                >
                  API Docs
                </a>
              </nav>

              <div className="h-6 w-px bg-outline-variant/30 hidden lg:block" />

              <div className="flex items-center gap-3">
                <NotificationBell />

                <button
                  onClick={() => setShowCvssModal(true)}
                  title="CVSS Calculator"
                  className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-variant/50 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">calculate</span>
                </button>

                {/* Profile Avatar / Dropdown Trigger */}
                <div className="relative">
                  <div
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container font-bold flex items-center justify-center border border-outline-variant/50 cursor-pointer hover:ring-2 ring-primary/30 transition-all text-xs"
                  >
                    {user ? user.display_name.charAt(0).toUpperCase() : 'U'}
                  </div>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-72 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-2xl p-4 z-50 animate-fade-in-up space-y-3">
                      <div className="border-b border-outline-variant/20 pb-2">
                        <div className="font-bold text-sm text-on-surface">{user ? user.display_name : 'Guest User'}</div>
                        <div className="text-xs text-on-surface-variant font-mono truncate">
                          {user ? user.email : 'not logged in'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 font-label-caps">
                          1-Click Fast Persona Switch
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                          {SEED_PERSONAS.map((p) => (
                            <button
                              key={p.key}
                              onClick={() => {
                                quickLogin(p.key);
                                setProfileDropdownOpen(false);
                              }}
                              className="text-left px-2 py-1 rounded bg-surface-container-low hover:bg-primary-container/20 text-[11px] font-medium transition"
                            >
                              <div className="font-bold truncate text-on-surface">{p.name.split(' ')[0]}</div>
                              <div className="text-[9px] text-on-surface-variant font-mono">{p.badge}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between">
                        <Link href="/login" className="text-xs text-primary font-bold hover:underline font-label-caps uppercase">
                          Sign In
                        </Link>
                        <button
                          onClick={() => {
                            logout();
                            setProfileDropdownOpen(false);
                          }}
                          className="text-xs text-error font-bold hover:underline font-label-caps uppercase"
                        >
                          Log Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Canvas */}
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6 lg:p-gutter">

          <div className="max-w-max-width mx-auto flex flex-col gap-6">
            {/* Action Flash Alert */}
            {actionMessage && (
              <div className="p-3 rounded-xl border border-primary/30 bg-primary-container/20 text-on-surface text-xs font-semibold transition animate-fade-in flex items-center gap-2 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>{actionMessage}</span>
              </div>
            )}

            {/* Embargo Banner if active */}
            {bug.is_embargoed && bug.embargo_until && (
              <section className="space-y-2">
                <EmbargoCountdown embargoUntil={bug.embargo_until} />
              </section>
            )}

            {/* Page Header & Actions Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-body-sm">
                <Link
                  className="flex items-center text-on-surface-variant hover:text-primary transition-colors group font-medium"
                  href="/dashboard"
                >
                  <span className="material-symbols-outlined text-[18px] mr-1 group-hover:-translate-x-0.5 transition-transform">
                    arrow_back
                  </span>
                  Dashboard
                </Link>
                <span className="text-outline-variant">/</span>
                <span className="font-semibold text-on-surface">Bug #{bug.id}</span>
                <div className="flex items-center gap-1.5 bg-surface-container-high px-2.5 py-0.5 rounded-full border border-outline-variant/30 ml-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      livePulse
                        ? 'bg-tertiary animate-ping'
                        : sseConnected
                        ? 'bg-primary animate-pulse'
                        : 'bg-outline'
                    }`}
                  />
                  <span className="font-label-caps text-[10px] uppercase text-on-surface-variant tracking-wider font-bold">
                    {livePulse ? 'Syncing...' : sseConnected ? 'Live SSE' : 'Offline'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  href={`/bugs/${bug.id}/graph`}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:border-primary/50 transition-all font-label-caps text-label-caps uppercase font-bold shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">account_tree</span>
                  View Dependency DAG
                </Link>
                <button
                  onClick={() => setShowCvssModal(true)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:border-primary/50 transition-all font-label-caps text-label-caps uppercase font-bold shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px] text-error">calculate</span>
                  CVSS Calculator
                </button>
              </div>
            </div>

            {/* Bug Title Card */}
            <section className="bg-surface-container-lowest rounded-xl p-6 md:p-8 shadow-sm border border-outline-variant/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-container/20 rounded-bl-full -mr-10 -mt-10 blur-xl pointer-events-none" />

              <div className="flex flex-wrap gap-2 mb-4">
                <span
                  className={`px-2.5 py-1 rounded font-label-caps text-[10px] uppercase tracking-wider border font-bold ${getStatusBadge(
                    bug.status
                  )}`}
                >
                  {bug.status.replace('_', ' ')}
                </span>
                {bug.resolution && (
                  <span className="px-2.5 py-1 rounded bg-surface-container-high text-on-surface-variant font-label-caps text-[10px] uppercase tracking-wider border border-outline-variant/30 font-bold">
                    {bug.resolution}
                  </span>
                )}
                <span
                  className={`px-2.5 py-1 rounded font-label-caps text-[10px] uppercase tracking-wider border ${getPriorityBadge(
                    bug.priority
                  )}`}
                >
                  {bug.priority}
                </span>
                <span className="px-2.5 py-1 rounded bg-surface-container-high text-on-surface-variant font-label-caps text-[10px] uppercase tracking-wider border border-outline-variant/30">
                  {bug.severity.toUpperCase()}
                </span>
                {bug.cvss_score && (
                  <span className="px-2.5 py-1 rounded bg-error-container text-on-error-container font-label-caps text-[10px] uppercase tracking-wider border border-error/30 font-bold">
                    CVSS {bug.cvss_score} ({bug.cvss_severity || 'HIGH'})
                  </span>
                )}
              </div>

              <h2 className="font-display-lg text-display-lg text-on-surface mb-6 leading-tight tracking-tight font-bold">
                {bug.summary}
              </h2>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-on-surface-variant">
                <div>
                  <span className="opacity-70 mr-1">Product:</span>
                  <span className="font-medium text-on-surface">{bug.product_name || 'Core'}</span>
                </div>
                <div>
                  <span className="opacity-70 mr-1">Component:</span>
                  <span className="font-medium text-on-surface">{bug.component_name || 'General'}</span>
                </div>
                <div>
                  <span className="opacity-70 mr-1">Created:</span>
                  <span>{new Date(bug.created_at).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="opacity-70 mr-1">Updated:</span>
                  <span>{new Date(bug.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </section>

            {/* 2-Column Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column (Main Content) */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {/* Description & Reproduction */}
                <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/20">
                  <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-4 tracking-widest opacity-80 font-bold">
                    Description &amp; Reproduction
                  </h3>
                  <div className="bg-surface-container p-4 rounded-lg font-label-code text-label-code text-on-surface-variant/90 border border-outline-variant/20 whitespace-pre-wrap">
                    {bug.description || 'No detailed reproduction steps provided.'}
                  </div>
                </section>

                {/* Governance & State Machine Actions */}
                <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/20">
                  <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-4 tracking-widest opacity-80 font-bold">
                    Governance &amp; State Machine Actions
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleStatusTransition('CONFIRMED')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary-container/20 text-secondary border border-secondary-container hover:bg-secondary-container/40 transition-colors font-body-sm font-medium"
                    >
                      <span className="material-symbols-outlined text-[18px]">check</span>
                      Confirm Bug
                    </button>
                    <button
                      onClick={() => handleStatusTransition('IN_PROGRESS')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-tertiary-container/20 text-tertiary border border-tertiary-container hover:bg-tertiary-container/40 transition-colors font-body-sm font-medium"
                    >
                      <span className="material-symbols-outlined text-[18px]">settings</span>
                      Mark IN_PROGRESS
                    </button>
                    <button
                      onClick={() => handleStatusTransition('RESOLVED', 'FIXED')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary border border-primary hover:bg-primary/90 transition-colors font-body-sm font-medium shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">star</span>
                      Resolve (FIXED)
                    </button>
                    <button
                      onClick={() => handleStatusTransition('RESOLVED', 'WONTFIX')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container-high transition-colors font-body-sm font-medium"
                    >
                      Resolve (WONTFIX)
                    </button>
                    <button
                      onClick={() => handleStatusTransition('CLOSED')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container-high transition-colors font-body-sm font-medium"
                    >
                      Close Archive
                    </button>
                  </div>
                </section>

                {/* Tabbed Interface & Activity */}
                <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden flex flex-col">
                  {/* Tabs Header */}
                  <div className="flex border-b border-outline-variant/20 px-2 pt-2 bg-surface-container-low/50">
                    <button
                      onClick={() => setActiveTab('activity')}
                      className={`px-5 py-3 font-label-caps text-label-caps uppercase flex items-center gap-2 rounded-t-lg transition-all ${
                        activeTab === 'activity'
                          ? 'text-primary border-b-2 border-primary bg-surface-container-lowest font-bold shadow-xs'
                          : 'text-on-surface-variant hover:text-primary opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      Timeline ({bug.activity?.length || 0})
                    </button>

                    <button
                      onClick={() => setActiveTab('ai')}
                      className={`px-5 py-3 font-label-caps text-label-caps uppercase flex items-center gap-2 rounded-t-lg transition-all ${
                        activeTab === 'ai'
                          ? 'text-primary border-b-2 border-primary bg-surface-container-lowest font-bold shadow-xs'
                          : 'text-on-surface-variant hover:text-primary opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                      AI Triage
                    </button>

                    <button
                      onClick={() => setActiveTab('scm')}
                      className={`px-5 py-3 font-label-caps text-label-caps uppercase flex items-center gap-2 rounded-t-lg transition-all ${
                        activeTab === 'scm'
                          ? 'text-primary border-b-2 border-primary bg-surface-container-lowest font-bold shadow-xs'
                          : 'text-on-surface-variant hover:text-primary opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">account_tree</span>
                      GitHub SCM
                    </button>

                    <button
                      onClick={() => setActiveTab('flags')}
                      className={`px-5 py-3 font-label-caps text-label-caps uppercase flex items-center gap-2 rounded-t-lg transition-all ${
                        activeTab === 'flags'
                          ? 'text-primary border-b-2 border-primary bg-surface-container-lowest font-bold shadow-xs'
                          : 'text-on-surface-variant hover:text-primary opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">flag</span>
                      Flags
                    </button>
                  </div>

                  {/* Tab Body */}
                  <div className="p-6">
                    {activeTab === 'ai' && (
                      <AiTriageCard
                        bugId={bug.id}
                        currentPriority={bug.priority}
                        currentComponent={bug.component_name}
                        onApplyTriage={(p) => {
                          setActionMessage(`Applied AI suggestions: Priority ${p}`);
                          setTimeout(() => setActionMessage(null), 3000);
                        }}
                        onInsertComment={(txt) => {
                          setNewComment(txt);
                          setActiveTab('activity');
                        }}
                      />
                    )}

                    {activeTab === 'scm' && <GitHubScmCard bugId={bug.id} />}

                    {activeTab === 'flags' && <FlagsCard bugId={bug.id} />}

                    {activeTab === 'activity' && (
                      <div className="space-y-6">
                        <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-widest opacity-80 font-bold">
                          Activity &amp; Audit Timeline
                        </h3>

                        {bug.activity && bug.activity.length > 0 ? (
                          <div className="space-y-3">
                            {bug.activity.map((act) => (
                              <div
                                key={act.id}
                                className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-1.5 text-xs"
                              >
                                <div className="flex items-center justify-between text-on-surface-variant">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-primary text-on-primary font-bold flex items-center justify-center text-[10px]">
                                      {act.who_name ? act.who_name[0] : 'U'}
                                    </span>
                                    <span className="font-semibold text-on-surface">{act.who_name || 'System User'}</span>
                                    <span className="text-on-surface-variant/60 font-mono text-[10px]">
                                      @{act.who_username || 'system'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-on-surface-variant/60">
                                    {new Date(act.changed_at).toLocaleString()}
                                  </span>
                                </div>

                                <div className="text-on-surface pl-7 prose prose-sm max-w-none">
                                  {act.comment ? (
                                    <div dangerouslySetInnerHTML={{ __html: act.comment }} />
                                  ) : (
                                    <p className="text-on-surface-variant font-body-sm">
                                      Changed <span className="font-mono text-primary font-bold">{act.field}</span> from{' '}
                                      <span className="text-on-surface-variant/70">{act.old_value || 'none'}</span> →{' '}
                                      <span className="text-on-surface font-semibold">{act.new_value}</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-10 flex items-center justify-center border-b border-outline-variant/20">
                            <p className="text-on-surface-variant/60 font-body-sm italic">No prior activity logged.</p>
                          </div>
                        )}

                        {/* Comment Editor */}
                        <div className="pt-2">
                          <h4 className="font-label-caps text-label-caps uppercase text-on-surface mb-3 font-bold">
                            Add Comment / Mention Collaborators
                          </h4>
                          <CommentEditor
                            value={newComment}
                            onChange={setNewComment}
                            onSubmit={handleAddComment}
                            isSubmitting={submittingComment}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Right Column (Sidebar) */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                {/* Governance Attributes */}
                <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/20">
                  <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-5 tracking-widest opacity-80 font-bold">
                    Governance Attributes
                  </h3>
                  <div className="flex flex-col gap-5">
                    <div>
                      <span className="block font-label-caps text-[10px] uppercase text-on-surface-variant/70 mb-1">
                        Assignee
                      </span>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs shrink-0">
                          {bug.assignee_name ? bug.assignee_name.charAt(0) : 'U'}
                        </div>
                        <div>
                          <div className="font-body-sm font-semibold text-on-surface leading-tight">
                            {bug.assignee_name || 'Unassigned'}
                          </div>
                          <div className="text-[11px] text-on-surface-variant/70 font-mono">
                            @{bug.assignee_username || 'unassigned'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block font-label-caps text-[10px] uppercase text-on-surface-variant/70 mb-1">
                        Reporter
                      </span>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs shrink-0">
                          {bug.reporter_name ? bug.reporter_name.charAt(0) : 'R'}
                        </div>
                        <div>
                          <div className="font-body-sm font-semibold text-on-surface leading-tight">
                            {bug.reporter_name || 'Anonymous'}
                          </div>
                          <div className="text-[11px] text-on-surface-variant/70 font-mono">
                            @{bug.reporter_username || 'reporter'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block font-label-caps text-[10px] uppercase text-on-surface-variant/70 mb-1">
                        Target Milestone
                      </span>
                      <div className="font-body-sm text-on-surface opacity-60">
                        {bug.target_milestone || '---'}
                      </div>
                    </div>

                    <div>
                      <span className="block font-label-caps text-[10px] uppercase text-on-surface-variant/70 mb-1">
                        Version
                      </span>
                      <div className="font-label-code text-label-code text-on-surface bg-surface-container px-2.5 py-1 rounded w-fit border border-outline-variant/20 font-bold">
                        {bug.version || 'unspecified'}
                      </div>
                    </div>
                  </div>
                </section>

                {/* CVSS Rating */}
                <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/20 relative overflow-hidden group">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-widest opacity-80 font-bold">
                      CVSS v4.0 Rating
                    </h3>
                    <button
                      onClick={() => setShowCvssModal(true)}
                      className="font-label-caps text-[10px] uppercase text-primary hover:underline underline-offset-2 font-bold"
                    >
                      Edit Vector
                    </button>
                  </div>

                  {bug.cvss_score ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-error font-mono">{bug.cvss_score}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-error-container text-on-error-container border border-error/30 uppercase font-label-caps">
                          {bug.cvss_severity || 'HIGH'}
                        </span>
                      </div>
                      {bug.cvss_vector && (
                        <div className="p-2 bg-surface-container rounded border border-outline-variant/20 text-[10px] font-mono text-on-surface-variant break-all">
                          {bug.cvss_vector}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-body-sm text-on-surface-variant/70">
                      No CVSS vulnerability vector scored for this defect yet.
                    </p>
                  )}
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* CVSS Modal */}
      {showCvssModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/20 backdrop-blur-sm p-4">
          <CvssModal
            bugId={bug.id}
            onClose={() => setShowCvssModal(false)}
            onSave={() => {
              setShowCvssModal(false);
              fetchBug(true);
            }}
          />
        </div>
      )}
    </div>
  );
}


