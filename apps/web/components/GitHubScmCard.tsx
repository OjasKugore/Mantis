'use client';

import React, { useState, useEffect } from 'react';
import { GitCommit, GitPullRequest, GitMerge, ExternalLink, RefreshCw, AlertCircle, CheckCircle2, Clock, Plus, X } from 'lucide-react';

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export function GitHubScmCard({ bugId }: Props) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'prs' | 'commits'>('all');

  // Modal linking state
  const [modalOpen, setModalOpen] = useState(false);
  const [linkType, setLinkType] = useState<'commit' | 'pr'>('commit');
  const [repoName, setRepoName] = useState('mozilla/gecko-dev');
  const [commitSha, setCommitSha] = useState('');
  const [commitMsg, setCommitMsg] = useState('');
  const [prNumber, setPrNumber] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [prState, setPrState] = useState<'open' | 'merged' | 'closed'>('open');
  const [submitting, setSubmitting] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

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

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setLinkError(null);

    try {
      const payload: any = {
        type: linkType,
        repo_full_name: repoName.trim() || 'mozilla/gecko-dev',
      };

      if (linkType === 'commit') {
        payload.commit_sha = commitSha.trim() || undefined;
        payload.commit_message = commitMsg.trim() || `Bug ${bugId}: Fixed defect in ${repoName}`;
        payload.html_url = `https://github.com/${payload.repo_full_name}/commit/${payload.commit_sha || 'a1b2c3d'}`;
      } else {
        payload.pr_number = parseInt(prNumber, 10) || Math.floor(Math.random() * 5000) + 1000;
        payload.pr_title = prTitle.trim() || `Resolve Bug #${bugId} in ${repoName}`;
        payload.pr_state = prState;
        payload.html_url = `https://github.com/${payload.repo_full_name}/pull/${payload.pr_number}`;
      }

      const res = await fetch(`${API_BASE}/api/v1/bugs/${bugId}/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalOpen(false);
        setCommitSha('');
        setCommitMsg('');
        setPrNumber('');
        setPrTitle('');
        await fetchScm();
      } else {
        const err = await res.json().catch(() => ({}));
        setLinkError(err.message || 'Failed to link SCM record');
      }
    } catch {
      setLinkError('Network error connecting to SCM endpoint');
    } finally {
      setSubmitting(false);
    }
  };

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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="px-3 py-1 rounded-lg bg-primary text-on-primary text-xs font-bold font-label-caps uppercase flex items-center gap-1 hover:bg-primary/90 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Link Git Commit / PR
          </button>
          <button
            onClick={fetchScm}
            disabled={loading}
            className="text-on-surface-variant hover:text-primary transition text-xs p-1 cursor-pointer"
            title="Refresh SCM links"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/20 text-xs">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-2 px-3 font-bold transition border-b-2 font-label-caps uppercase cursor-pointer ${
            activeTab === 'all'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          All Activity ({totalCount})
        </button>
        <button
          onClick={() => setActiveTab('prs')}
          className={`pb-2 px-3 font-bold transition border-b-2 font-label-caps uppercase cursor-pointer ${
            activeTab === 'prs'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Pull Requests ({pullRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('commits')}
          className={`pb-2 px-3 font-bold transition border-b-2 font-label-caps uppercase cursor-pointer ${
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
        <div className="p-6 text-center text-xs text-on-surface-variant space-y-2 font-body-sm">
          <GitCommit className="w-6 h-6 mx-auto text-on-surface-variant/40 mb-2" />
          <p className="font-bold text-on-surface">No linked commits or PRs yet</p>
          <p className="text-[11px] text-on-surface-variant/70 max-w-sm mx-auto">
            Mention <code className="text-primary bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30 font-mono">Fixes #{bugId}</code> in your Git commit message, or click <strong>&quot;Link Git Commit / PR&quot;</strong> above to manually attach an SCM change.
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

      {/* Interactive Link Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">link</span>
                <h3 className="font-bold text-sm text-on-surface uppercase font-label-caps">
                  Link SCM Commit or PR
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {linkError && (
              <div className="p-3 bg-error-container/30 text-error rounded-xl text-xs font-semibold border border-error/20">
                {linkError}
              </div>
            )}

            <form onSubmit={handleLinkSubmit} className="space-y-4 text-xs">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 bg-surface-container p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLinkType('commit')}
                  className={`py-1.5 rounded-lg font-bold font-label-caps uppercase transition ${
                    linkType === 'commit'
                      ? 'bg-surface-container-lowest text-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Git Commit
                </button>
                <button
                  type="button"
                  onClick={() => setLinkType('pr')}
                  className={`py-1.5 rounded-lg font-bold font-label-caps uppercase transition ${
                    linkType === 'pr'
                      ? 'bg-surface-container-lowest text-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Pull Request
                </button>
              </div>

              {/* Repo Name */}
              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant uppercase font-label-caps text-[10px]">
                  Repository Full Name
                </label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="e.g. mozilla/gecko-dev or your-org/core-api"
                  className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-mono focus:outline-none focus:border-primary"
                />
              </div>

              {linkType === 'commit' ? (
                <>
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant uppercase font-label-caps text-[10px]">
                      Commit SHA Hash (Optional)
                    </label>
                    <input
                      type="text"
                      value={commitSha}
                      onChange={(e) => setCommitSha(e.target.value)}
                      placeholder="e.g. 9c3a80b12ad"
                      className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-mono focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant uppercase font-label-caps text-[10px]">
                      Commit Message
                    </label>
                    <input
                      type="text"
                      value={commitMsg}
                      onChange={(e) => setCommitMsg(e.target.value)}
                      placeholder={`Bug ${bugId}: Refactor memory handler and sync state`}
                      className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-on-surface-variant uppercase font-label-caps text-[10px]">
                        PR Number
                      </label>
                      <input
                        type="number"
                        value={prNumber}
                        onChange={(e) => setPrNumber(e.target.value)}
                        placeholder="e.g. 4821"
                        className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-mono focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-on-surface-variant uppercase font-label-caps text-[10px]">
                        PR State
                      </label>
                      <select
                        value={prState}
                        onChange={(e) => setPrState(e.target.value as any)}
                        className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary"
                      >
                        <option value="open">Open</option>
                        <option value="merged">Merged</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant uppercase font-label-caps text-[10px]">
                      Pull Request Title
                    </label>
                    <input
                      type="text"
                      value={prTitle}
                      onChange={(e) => setPrTitle(e.target.value)}
                      placeholder={`Fix Necko HTTP/3 packet loss degradation`}
                      className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold font-label-caps uppercase hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Linking...' : 'Attach SCM Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
