'use client';

import React, { useState, useEffect } from 'react';
import { GitCommit, GitPullRequest, GitMerge, ExternalLink, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface Commit {
  id: number;
  bug_id: number;
  repo_full_name: string;
  commit_sha: string;
  commit_message: string;
  author_name: string;
  author_email: string;
  committed_at: string;
  html_url: string | null;
}

interface PullRequest {
  id: number;
  bug_id: number;
  repo_full_name: string;
  pr_number: number;
  pr_title: string;
  pr_state: 'open' | 'closed' | 'merged';
  pr_url: string;
  merged_at: string | null;
}

interface Props {
  bugId: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function GitHubScmCard({ bugId }: Props) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'prs' | 'commits'>('all');

  const fetchScm = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/bugs/${bugId}/github`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setCommits(data.commits || []);
        setPullRequests(data.pull_requests || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScm();
  }, [bugId]);

  const totalCount = commits.length + pullRequests.length;

  const getPrBadge = (state: string) => {
    if (state === 'merged') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-tertiary-container/30 text-tertiary border border-tertiary-container font-label-caps">
          <GitMerge className="w-3 h-3" /> Merged
        </span>
      );
    }
    if (state === 'open') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary-container text-on-primary-container border border-primary/30 font-label-caps">
          <CheckCircle2 className="w-3 h-3" /> Open PR
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-container-high text-on-surface-variant border border-outline-variant/30 font-label-caps">
        <AlertCircle className="w-3 h-3" /> Closed
      </span>
    );
  };

  return (
    <div className="p-6 rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <GitPullRequest className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-2 font-label-caps">
            GitHub SCM Traceability
            {totalCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container text-[10px] font-mono font-bold">
                {totalCount}
              </span>
            )}
          </h3>
        </div>

        <button
          onClick={fetchScm}
          disabled={loading}
          className="text-on-surface-variant hover:text-primary transition text-xs p-1"
          title="Refresh SCM links"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/20 text-xs">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-2 px-3 font-bold transition border-b-2 font-label-caps uppercase ${
            activeTab === 'all'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          All Activity ({totalCount})
        </button>
        <button
          onClick={() => setActiveTab('prs')}
          className={`pb-2 px-3 font-bold transition border-b-2 font-label-caps uppercase ${
            activeTab === 'prs'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Pull Requests ({pullRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('commits')}
          className={`pb-2 px-3 font-bold transition border-b-2 font-label-caps uppercase ${
            activeTab === 'commits'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Commits ({commits.length})
        </button>
      </div>

      {loading ? (
        <div className="p-6 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2 font-body-sm">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
          <span>Scanning repository webhooks...</span>
        </div>
      ) : totalCount === 0 ? (
        <div className="p-6 text-center text-xs text-on-surface-variant space-y-1 font-body-sm">
          <GitCommit className="w-6 h-6 mx-auto text-on-surface-variant/40 mb-2" />
          <p className="font-bold text-on-surface">No linked commits or PRs</p>
          <p className="text-[11px] text-on-surface-variant/70">
            Mention <code className="text-primary bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30 font-mono">Fixes #{bugId}</code> in your commit or pull request to auto-link.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Pull Requests */}
          {(activeTab === 'all' || activeTab === 'prs') &&
            pullRequests.map((pr) => (
              <div
                key={`pr-${pr.id}`}
                className="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-start justify-between gap-3 text-xs hover:border-primary/40 transition"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getPrBadge(pr.pr_state)}
                    <span className="font-mono text-on-surface-variant font-bold">
                      {pr.repo_full_name}#{pr.pr_number}
                    </span>
                  </div>
                  <div className="font-bold text-on-surface truncate font-body-sm">{pr.pr_title}</div>
                </div>

                <a
                  href={pr.pr_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-on-surface-variant hover:text-primary transition"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ))}

          {/* Commits */}
          {(activeTab === 'all' || activeTab === 'commits') &&
            commits.map((c) => (
              <div
                key={`commit-${c.id}`}
                className="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-1.5 text-xs hover:border-primary/40 transition"
              >
                <div className="flex items-center justify-between text-on-surface-variant">
                  <div className="flex items-center gap-2">
                    <GitCommit className="w-3.5 h-3.5 text-primary" />
                    <span className="font-mono text-primary font-bold bg-surface-container-lowest px-1.5 py-0.5 rounded border border-outline-variant/30 text-[10px]">
                      {c.commit_sha.slice(0, 7)}
                    </span>
                    <span className="text-on-surface font-semibold">{c.author_name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-on-surface-variant/60 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(c.committed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <p className="text-on-surface pl-5 font-mono text-[11px] leading-relaxed">
                  {c.commit_message}
                </p>

                {c.html_url && (
                  <div className="pl-5 pt-0.5">
                    <a
                      href={c.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-bold font-label-caps uppercase"
                    >
                      View on GitHub <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

