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
      // Fallback silent handle
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-950/80 text-purple-300 border border-purple-800">
          <GitMerge className="w-3 h-3" /> Merged
        </span>
      );
    }
    if (state === 'open') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-800">
          <CheckCircle2 className="w-3 h-3" /> Open PR
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
        <AlertCircle className="w-3 h-3" /> Closed
      </span>
    );
  };

  return (
    <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-slate-300">
            <GitPullRequest className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            GitHub SCM Traceability
            {totalCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono text-indigo-400">
                {totalCount}
              </span>
            )}
          </h3>
        </div>

        <button
          onClick={fetchScm}
          disabled={loading}
          className="text-slate-400 hover:text-slate-200 transition text-xs p-1"
          title="Refresh SCM links"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-2 px-2.5 font-semibold transition border-b-2 ${
            activeTab === 'all'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          All Activity ({totalCount})
        </button>
        <button
          onClick={() => setActiveTab('prs')}
          className={`pb-2 px-2.5 font-semibold transition border-b-2 ${
            activeTab === 'prs'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Pull Requests ({pullRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('commits')}
          className={`pb-2 px-2.5 font-semibold transition border-b-2 ${
            activeTab === 'commits'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Commits ({commits.length})
        </button>
      </div>

      {loading ? (
        <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
          <span>Scanning repository webhooks...</span>
        </div>
      ) : totalCount === 0 ? (
        <div className="p-6 text-center text-xs text-slate-500 space-y-1">
          <GitCommit className="w-6 h-6 mx-auto text-slate-600 mb-2 opacity-60" />
          <p className="font-semibold text-slate-400">No linked commits or PRs</p>
          <p className="text-[11px] text-slate-500">
            Mention <code className="text-indigo-400 bg-slate-950 px-1 py-0.5 rounded border border-slate-800">Fixes #{bugId}</code> in your commit or pull request to auto-link.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Pull Requests */}
          {(activeTab === 'all' || activeTab === 'prs') &&
            pullRequests.map((pr) => (
              <div
                key={`pr-${pr.id}`}
                className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start justify-between gap-3 text-xs hover:border-slate-700 transition"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getPrBadge(pr.pr_state)}
                    <span className="font-mono text-slate-400 font-semibold">
                      {pr.repo_full_name}#{pr.pr_number}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-200 truncate">{pr.pr_title}</div>
                </div>

                <a
                  href={pr.pr_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-slate-400 hover:text-indigo-400 transition"
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
                className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1.5 text-xs hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-2">
                    <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-mono text-indigo-300 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-[10px]">
                      {c.commit_sha.slice(0, 7)}
                    </span>
                    <span className="text-slate-300 font-medium">{c.author_name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(c.committed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <p className="text-slate-300 pl-5 font-mono text-[11px] leading-relaxed">
                  {c.commit_message}
                </p>

                {c.html_url && (
                  <div className="pl-5 pt-0.5">
                    <a
                      href={c.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 underline"
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
