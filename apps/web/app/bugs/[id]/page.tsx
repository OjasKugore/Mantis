'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { EmbargoCountdown } from '@/components/EmbargoCountdown';
import { CvssModal } from '@/components/CvssModal';
import { CommentEditor } from '@/components/CommentEditor';
import { NotificationBell } from '@/components/NotificationBell';

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

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function BugDetailPage({ params }: { params: { id: string } }) {
  const bugId = Number(params.id);
  const [bug, setBug] = useState<BugDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCvssModal, setShowCvssModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchBug = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/v1/bugs/${bugId}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(res.status === 404 ? 'Bug not found (or protected under zero-leakage embargo)' : 'Failed to fetch bug');
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

  const handleStatusTransition = async (newStatus: string, resolution?: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/bugs/${bugId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
      fetchBug();
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
        body: JSON.stringify({ body: newComment, format: 'markdown' }),
      });

      if (res.ok) {
        setNewComment('');
        fetchBug();
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Loading Bug #{bugId}...</span>
        </div>
      </div>
    );
  }

  if (error || !bug) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 bg-red-950/60 border border-red-800 text-red-400 rounded-xl mx-auto flex items-center justify-center text-xl font-bold">
            404
          </div>
          <h2 className="text-xl font-bold text-white">Bug #{bugId} Unavailable</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            {error || 'This bug does not exist or is currently restricted under a 90-day Zero-Leakage Security Embargo.'}
          </p>
          <Link
            href="/"
            className="inline-flex px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
          >
            ← Return to Master Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const statusStyle = STATUS_COLORS[bug.status] || STATUS_COLORS['CLOSED'];
  const priorityStyle = PRIORITY_BADGES[bug.priority] || PRIORITY_BADGES['P5'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition text-sm font-semibold"
            >
              ← <span className="font-bold text-indigo-400">Dashboard</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800 text-slate-300">
              Bug #{bug.id}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/bugs/${bug.id}/graph`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/50 text-xs font-semibold transition shadow-sm"
            >
              🕸️ View Dependency DAG →
            </Link>
            <button
              onClick={() => setShowCvssModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 text-xs font-semibold transition shadow-sm"
            >
              🛡️ CVSS Calculator
            </button>
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Action Flash Alert */}
        {actionMessage && (
          <div className="p-3 rounded-xl border border-indigo-800 bg-indigo-950/80 text-indigo-200 text-xs font-semibold transition animate-fade-in">
            {actionMessage}
          </div>
        )}

        {/* Embargo Banner if active */}
        {bug.is_embargoed && bug.embargo_until && (
          <section className="space-y-2">
            <EmbargoCountdown embargoUntil={bug.embargo_until} />
          </section>
        )}

        {/* Bug Header Card */}
        <section className="p-6 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
              {bug.status.replace('_', ' ')}
            </span>
            {bug.resolution && (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold border border-slate-700 bg-slate-800 text-slate-300">
                {bug.resolution}
              </span>
            )}
            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${priorityStyle}`}>
              {bug.priority}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 border border-slate-800 text-slate-400 uppercase tracking-wide">
              {bug.severity}
            </span>
            {bug.cvss_score && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950/80 border border-rose-800 text-rose-300">
                CVSS {bug.cvss_score} ({bug.cvss_severity || 'HIGH'})
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            {bug.summary}
          </h1>

          <div className="text-xs text-slate-400 flex flex-wrap gap-4 pt-2 border-t border-slate-800/80">
            <div>Product: <span className="text-slate-200 font-semibold">{bug.product_name || 'Firefox'}</span></div>
            <div>Component: <span className="text-slate-200 font-semibold">{bug.component_name || 'Core'}</span></div>
            <div>Created: <span className="text-slate-300">{new Date(bug.created_at).toLocaleDateString()}</span></div>
            <div>Updated: <span className="text-slate-300">{new Date(bug.updated_at).toLocaleDateString()}</span></div>
          </div>
        </section>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description Card */}
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Description & Reproduction</h2>
              <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950/60 p-4 rounded-lg border border-slate-800 font-mono text-xs">
                {bug.description || 'No detailed reproduction steps provided.'}
              </div>
            </div>

            {/* Quick State Transition Actions */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Governance & State Machine Actions</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleStatusTransition('CONFIRMED')}
                  className="px-3 py-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-800 text-blue-300 text-xs font-semibold transition"
                >
                  ✓ Confirm Bug
                </button>
                <button
                  onClick={() => handleStatusTransition('IN_PROGRESS')}
                  className="px-3 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-800 text-purple-300 text-xs font-semibold transition"
                >
                  ⚙ Mark IN_PROGRESS
                </button>
                <button
                  onClick={() => handleStatusTransition('RESOLVED', 'FIXED')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-semibold transition"
                >
                  ★ Resolve (FIXED)
                </button>
                <button
                  onClick={() => handleStatusTransition('RESOLVED', 'WONTFIX')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Resolve (WONTFIX)
                </button>
                <button
                  onClick={() => handleStatusTransition('CLOSED')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 text-xs font-semibold transition"
                >
                  Close Archive
                </button>
              </div>
            </div>

            {/* Comments & Activity Stream */}
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Activity & Audit Timeline</h2>
              
              {bug.activity && bug.activity.length > 0 ? (
                <div className="space-y-3">
                  {bug.activity.map((act) => (
                    <div key={act.id} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                            {act.who_name ? act.who_name[0] : 'U'}
                          </span>
                          <span className="font-semibold text-slate-200">{act.who_name || 'System User'}</span>
                          <span className="text-slate-500 font-mono text-[10px]">@{act.who_username || 'system'}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{new Date(act.changed_at).toLocaleString()}</span>
                      </div>
                      
                      <div className="text-slate-300 pl-7 prose prose-sm prose-invert max-w-none">
                        {act.comment ? (
                          <div dangerouslySetInnerHTML={{ __html: act.comment }} />
                        ) : (
                          <p className="text-slate-400">
                            Changed <span className="font-mono text-indigo-300">{act.field}</span> from{' '}
                            <span className="text-slate-500">{act.old_value || 'none'}</span> →{' '}
                            <span className="text-slate-200 font-semibold">{act.new_value}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 text-slate-500 text-xs">No prior activity logged.</div>
              )}

              {/* Add Comment Form */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <label className="text-xs font-semibold text-slate-300 block">Add Comment / Mention Collaborators</label>
                <CommentEditor 
                  value={newComment} 
                  onChange={setNewComment} 
                  onSubmit={handleAddComment} 
                  isSubmitting={submittingComment} 
                />
              </div>
            </div>
          </div>

          {/* Right Sidebar Metadata Column */}
          <div className="space-y-6">
            {/* Governance Attributes Card */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Governance Attributes</h3>
              
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Assignee</span>
                  <span className="font-semibold text-slate-200">{bug.assignee_name || 'Unassigned'}</span>
                  {bug.assignee_username && (
                    <span className="text-slate-500 font-mono text-[10px] block">@{bug.assignee_username}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Reporter</span>
                  <span className="font-semibold text-slate-200">{bug.reporter_name || 'Anonymous'}</span>
                  {bug.reporter_username && (
                    <span className="text-slate-500 font-mono text-[10px] block">@{bug.reporter_username}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Target Milestone</span>
                  <span className="font-mono text-slate-300">{bug.target_milestone || '---'}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Version</span>
                  <span className="font-mono text-slate-300">{bug.version || 'unspecified'}</span>
                </div>
              </div>
            </div>

            {/* Time Tracking & Estimations */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Effort & Time Tracking</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Estimated</div>
                  <div className="text-base font-bold text-slate-200">{bug.estimated_time || 0}h</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Remaining</div>
                  <div className="text-base font-bold text-indigo-400">{bug.remaining_time || 0}h</div>
                </div>
              </div>
            </div>

            {/* CVSS v4.0 Vulnerability Score Card */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400">CVSS v4.0 Rating</h3>
                <button
                  onClick={() => setShowCvssModal(true)}
                  className="text-[10px] text-rose-400 hover:text-rose-300 underline font-semibold"
                >
                  Edit Vector
                </button>
              </div>

              {bug.cvss_score ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-rose-400 font-mono">{bug.cvss_score}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 border border-rose-800 text-rose-300 uppercase">
                      {bug.cvss_severity || 'CRITICAL'}
                    </span>
                  </div>
                  {bug.cvss_vector && (
                    <div className="p-2 bg-slate-950 rounded border border-slate-800 text-[9px] font-mono text-slate-400 break-all">
                      {bug.cvss_vector}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  No CVSS vulnerability vector scored for this defect yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* CVSS Modal */}
      {showCvssModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <CvssModal
            bugId={bug.id}
            onClose={() => setShowCvssModal(false)}
            onSave={() => {
              setShowCvssModal(false);
              fetchBug();
            }}
          />
        </div>
      )}
    </div>
  );
}
