'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MantisLogo } from '@/components/MantisLogo';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth, isDemoUser } from '@/lib/auth-context';

interface AuditItem {
  id: number;
  bug_id: number;
  bug_summary: string;
  user_id: string;
  who_name?: string;
  who_email?: string;
  who_avatar?: string;
  field_name: string;
  removed?: string;
  added?: string;
  timestamp: string;
  is_embargoed?: boolean;
}

export default function AuditPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activities, setActivities] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [fieldFilter, setFieldFilter] = useState<string>('all');
  const limit = 20;

  const fetchActivities = async (currentPage: number, field: string) => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * limit;
      const scopeParam = user && !isDemoUser(user) ? '&scope=user' : '&scope=demo';
      const res = await fetch(`/api/v1/audit?limit=${limit}&offset=${offset}&field=${field}${scopeParam}`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
        setTotal(data.total || 0);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities(page, fieldFilter);
  }, [page, fieldFilter, user]);

  const totalPages = Math.ceil(total / limit) || 1;

  const formatFieldName = (f: string) => {
    switch (f) {
      case 'bug_status': return 'Status';
      case 'resolution': return 'Resolution';
      case 'priority': return 'Priority';
      case 'severity': return 'Severity';
      case 'assignee_id': return 'Assignee';
      case 'cvss_score': return 'CVSS Score';
      case 'is_embargoed': return 'Embargo';
      case 'flag': return 'Review Flag';
      case 'keywords': return 'Keyword';
      case 'cc': return 'CC List';
      default: return f.replace(/_/g, ' ');
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <MantisLogo className="w-7 h-7 text-primary transition-transform group-hover:scale-105" />
            <span className="font-extrabold text-base tracking-tight text-on-surface">Mantis</span>
          </Link>
          <span className="text-on-surface-variant/40">/</span>
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-primary">history</span>
            Audit Explorer
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-xs font-semibold text-on-surface flex items-center gap-1.5 transition-colors border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-sm">dashboard</span>
            Dashboard
          </Link>
          <NotificationBell />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-surface-container-high/60 border border-outline-variant/30 rounded-2xl">
          <div>
            <h1 className="text-xl font-extrabold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl">manage_search</span>
              System-Wide Audit Trail & Event Stream
            </h1>
            <p className="text-xs text-on-surface-variant mt-1">
              Immutable, append-only record of all defect mutations, status transitions, review flag modifications, and security updates across the workspace.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Field Filter:</label>
            <select
              value={fieldFilter}
              onChange={(e) => {
                setFieldFilter(e.target.value);
                setPage(1);
              }}
              className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-3 py-1.5 text-xs font-bold text-on-surface focus:outline-hidden focus:border-primary"
            >
              <option value="all">All Field Mutations</option>
              <option value="bug_status">Status Transitions</option>
              <option value="resolution">Resolutions</option>
              <option value="priority">Priority</option>
              <option value="severity">Severity</option>
              <option value="assignee_id">Assignee</option>
              <option value="cvss_score">CVSS Score</option>
              <option value="is_embargoed">Embargo</option>
              <option value="flag">Review Flags</option>
              <option value="keywords">Keywords</option>
              <option value="cc">CC List</option>
            </select>
          </div>
        </div>

        {/* Activity Table */}
        <div className="bg-surface-container-high/40 border border-outline-variant/30 rounded-2xl overflow-hidden shadow-xs">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16">
              <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mb-2"></div>
              <p className="text-xs text-on-surface-variant">Loading audit records...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant text-xs">
              No audit records found matching the filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-surface-container-high/80 border-b border-outline-variant/30 text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Bug Reference</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Field Mutated</th>
                    <th className="px-4 py-3">Previous Value</th>
                    <th className="px-4 py-3">New Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {activities.map((act) => (
                    <tr key={act.id} className="hover:bg-surface-container-highest/40 transition-colors">
                      <td className="px-4 py-3 text-on-surface-variant font-mono text-[11px] whitespace-nowrap">
                        {new Date(act.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/bugs/${act.bug_id}`} className="font-bold text-primary hover:underline inline-flex items-center gap-1">
                          #{act.bug_id}
                          {act.bug_summary && (
                            <span className="font-normal text-on-surface-variant/80 max-w-[200px] truncate">
                              — {act.bug_summary}
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-on-surface">
                          {act.who_name || act.who_email || 'System'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-surface-container-highest font-bold text-[10px] uppercase tracking-wider text-on-surface">
                          {formatFieldName(act.field_name)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-rose-400 max-w-[150px] truncate">
                        {act.removed ? `-${act.removed}` : <span className="text-on-surface-variant/40">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-emerald-400 max-w-[150px] truncate">
                        {act.added ? `+${act.added}` : <span className="text-on-surface-variant/40">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="px-5 py-3.5 bg-surface-container-high/60 border-t border-outline-variant/30 flex items-center justify-between text-xs">
            <span className="text-on-surface-variant">
              Showing {activities.length > 0 ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)} of {total} events
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg bg-surface-container-highest/60 hover:bg-surface-container-highest text-on-surface disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="px-2 font-semibold text-on-surface">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg bg-surface-container-highest/60 hover:bg-surface-container-highest text-on-surface disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
