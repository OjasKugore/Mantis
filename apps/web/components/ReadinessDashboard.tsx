'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, isDemoUser } from '@/lib/auth-context';

interface RiskBreakdown {
  label: string;
  penalty: number;
  count: number;
  impact: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

interface UnresolvedBug {
  id: number;
  summary: string;
  status: string;
  priority: string;
  severity: string;
  cvss_severity?: string;
  is_on_critical_path: boolean;
}

interface ReadinessData {
  milestone: string;
  score: number | null;
  status: 'READY_FOR_RELEASE' | 'NEEDS_ATTENTION' | 'BLOCKED' | 'NO_DEFECTS';
  totalIssues: number;
  resolvedIssues: number;
  unresolvedIssues: number;
  criticalPathIds: number[];
  penalties: number;
  breakdown: RiskBreakdown[];
  unresolvedBugs: UnresolvedBug[];
  availableMilestones?: string[];
}

export function ReadinessDashboard({ onNavigateToGraph }: { onNavigateToGraph?: (bugId: number) => void }) {
  const { user } = useAuth();
  const isDemo = isDemoUser(user);
  const [milestone, setMilestone] = useState<string>('all');
  const [data, setData] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReadiness = async (ms: string) => {
    setLoading(true);
    setError(null);
    try {
      const scopeParam = user && !isDemo ? '&scope=user' : '&scope=demo';
      const res = await fetch(`/api/v1/analytics/readiness?milestone=${encodeURIComponent(ms)}${scopeParam}`);
      if (!res.ok) throw new Error('Failed to compute readiness score');
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set sensible default: demo users use '128.0', custom sandboxes use 'all'
    if (isDemo && milestone === 'all') {
      setMilestone('128.0');
    }
  }, [isDemo]);

  useEffect(() => {
    fetchReadiness(milestone);
  }, [milestone, user]);

  const hasDefects = data && data.totalIssues > 0;
  const score = data?.score ?? 0;

  const scoreColor =
    !hasDefects ? 'text-on-surface-variant border-outline-variant/50 bg-surface-container-high' :
    score >= 85 ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' :
    score >= 60 ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' :
    'text-rose-400 border-rose-500/40 bg-rose-500/10';

  const progressStrokeColor =
    !hasDefects ? '#64748B' :
    score >= 85 ? '#10B981' :
    score >= 60 ? '#F59E0B' :
    '#EF4444';

  const circumference = 2 * Math.PI * 52;
  const strokeDashoffset = hasDefects
    ? circumference - (score / 100) * circumference
    : circumference;

  return (
    <div className="space-y-6">
      {/* Header & Milestone Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-surface-container-high/60 border border-outline-variant/30 rounded-2xl backdrop-blur-md">
        <div>
          <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">verified</span>
            Milestone Release Readiness Engine
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Algorithmic 0–100 risk calculation powered by Kahn&apos;s Critical Path Method (CPM), CVSS v4.0 severity math, and review flag clearance.
          </p>
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-auto">
          <label className="text-xs font-semibold text-on-surface-variant shrink-0 uppercase tracking-wider">
            Target Release:
          </label>
          <select
            value={milestone}
            onChange={(e) => setMilestone(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-3 py-1.5 text-xs font-bold text-on-surface focus:outline-hidden focus:border-primary shadow-xs"
          >
            {isDemo ? (
              <>
                <option value="128.0">Firefox 128.0 (Current Sprint)</option>
                <option value="129.0">Firefox 129.0 (Next Cycle)</option>
                <option value="130.0">Firefox 130.0 (Backlog)</option>
                <option value="all">All Release Milestones</option>
              </>
            ) : (
              <>
                <option value="all">All Release Milestones</option>
                {data?.availableMilestones && data.availableMilestones.length > 0 ? (
                  data.availableMilestones.map((ms) => (
                    <option key={ms} value={ms}>
                      {ms === '---' ? 'Default Milestone (---)' : `Release Milestone ${ms}`}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="128.0">Release Milestone 128.0</option>
                    <option value="---">Default Milestone (---)</option>
                  </>
                )}
              </>
            )}
          </select>

          <button
            onClick={() => fetchReadiness(milestone)}
            className="p-1.5 rounded-xl bg-surface-container-highest/60 hover:bg-surface-container-highest text-on-surface transition-colors cursor-pointer"
            title="Refresh Score"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center p-16 bg-surface-container-low/40 rounded-2xl border border-outline-variant/20">
          <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-medium text-on-surface-variant">Computing CPM critical path & release risk factors...</p>
        </div>
      ) : error ? (
        <div className="p-5 bg-error/10 border border-error/30 rounded-2xl text-error text-xs">
          Error: {error}
        </div>
      ) : data ? (
        <>
          {/* Top Score Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Score Ring Gauge Card */}
            <div className="md:col-span-1 p-5 bg-surface-container-high/60 border border-outline-variant/30 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="relative w-32 h-32 flex items-center justify-center my-2">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    className="text-surface-container-highest/50"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    stroke={progressStrokeColor}
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-on-surface tracking-tight">
                    {hasDefects ? score : '—'}
                  </span>
                  <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest">
                    {hasDefects ? '/ 100' : 'No Data'}
                  </span>
                </div>
              </div>

              <div className={`mt-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${scoreColor}`}>
                {data.status === 'NO_DEFECTS' ? 'NO DEFECTS SCOPED' : data.status.replace(/_/g, ' ')}
              </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-surface-container-high/40 border border-outline-variant/30 rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Total Scoped</span>
                  <span className="material-symbols-outlined text-primary text-xl">folder_open</span>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-extrabold text-on-surface">{data.totalIssues}</span>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">{data.resolvedIssues} Resolved / Verified</p>
                </div>
              </div>

              <div className="p-4 bg-surface-container-high/40 border border-outline-variant/30 rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Unresolved Work</span>
                  <span className="material-symbols-outlined text-amber-400 text-xl">pending_actions</span>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-extrabold text-amber-400">{data.unresolvedIssues}</span>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">Active engineering defects</p>
                </div>
              </div>

              <div className="p-4 bg-surface-container-high/40 border border-outline-variant/30 rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Critical Path Blockers</span>
                  <span className="material-symbols-outlined text-rose-400 text-xl">account_tree</span>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-extrabold text-rose-400">{data.criticalPathIds.length}</span>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">On release bottleneck path</p>
                </div>
              </div>

              {/* Explanatory banner */}
              <div className="sm:col-span-3 p-3 bg-surface-container-low/80 border border-outline-variant/25 rounded-xl text-xs text-on-surface-variant flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">info</span>
                  Readiness score deducts points for open critical path bugs, unresolved CVSS vulnerabilities, and pending blocking review flags.
                </span>
                <span className="font-semibold text-on-surface">Total Risk Deductions: -{data.penalties} pts</span>
              </div>
            </div>
          </div>

          {/* Risk Factors Breakdown Table */}
          <div className="p-5 bg-surface-container-high/60 border border-outline-variant/30 rounded-2xl">
            <h3 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">fact_check</span>
              Identified Risk Factors & Penalties
            </h3>

            {data.totalIssues === 0 ? (
              <p className="text-xs text-on-surface-variant font-medium py-3">
                No defects are currently tracked under milestone &quot;{milestone}&quot;.
              </p>
            ) : data.breakdown.length === 0 ? (
              <p className="text-xs text-emerald-400 font-medium py-3">
                ✓ No active release blockers or high-risk vulnerabilities identified for this milestone.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant/30 text-on-surface-variant text-[11px] uppercase tracking-wider">
                      <th className="pb-2 font-semibold">Risk Category</th>
                      <th className="pb-2 font-semibold">Severity Impact</th>
                      <th className="pb-2 font-semibold text-right">Items Count</th>
                      <th className="pb-2 font-semibold text-right">Score Deduction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {data.breakdown.map((b, i) => (
                      <tr key={i} className="hover:bg-surface-container-highest/30">
                        <td className="py-2.5 font-medium text-on-surface">{b.label}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              b.impact === 'CRITICAL'
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : b.impact === 'HIGH'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {b.impact}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-semibold text-on-surface">{b.count}</td>
                        <td className="py-2.5 text-right font-bold text-rose-400">-{b.penalty} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Unresolved Bugs Queue with Critical Path Indicators */}
          <div className="p-5 bg-surface-container-high/60 border border-outline-variant/30 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">list_alt</span>
                Unresolved Milestone Defects ({data.unresolvedBugs.length})
              </h3>
            </div>

            {data.totalIssues === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 bg-surface-container-low/30 rounded-xl border border-dashed border-outline-variant/30">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant/60">rule</span>
                <div>
                  <div className="text-xs font-bold text-on-surface">No defects tracked in this milestone</div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Assign defects to this target milestone when reporting or editing bugs to compute real-time release readiness.
                  </p>
                </div>
                <Link
                  href="/bugs/new"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold shadow-xs hover:bg-primary/90 transition-all"
                >
                  <span className="material-symbols-outlined text-[15px]">add_circle</span>
                  Report Defect
                </Link>
              </div>
            ) : data.unresolvedBugs.length === 0 ? (
              <p className="text-xs text-emerald-400 font-medium py-3">
                ✓ All {data.totalIssues} defects in this milestone have been resolved and verified!
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant/30 text-on-surface-variant text-[11px] uppercase tracking-wider">
                      <th className="pb-2 font-semibold">ID</th>
                      <th className="pb-2 font-semibold">Summary</th>
                      <th className="pb-2 font-semibold">Status</th>
                      <th className="pb-2 font-semibold">Priority</th>
                      <th className="pb-2 font-semibold">Critical Path</th>
                      <th className="pb-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {data.unresolvedBugs.map((bug) => (
                      <tr key={bug.id} className="hover:bg-surface-container-highest/30">
                        <td className="py-2.5 font-bold text-primary">#{bug.id}</td>
                        <td className="py-2.5 font-medium text-on-surface max-w-xs truncate">
                          <Link href={`/bugs/${bug.id}`} className="hover:underline">
                            {bug.summary}
                          </Link>
                        </td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded-md bg-surface-container-highest text-[10px] font-bold text-on-surface-variant">
                            {bug.status}
                          </span>
                        </td>
                        <td className="py-2.5 font-semibold text-on-surface">{bug.priority}</td>
                        <td className="py-2.5">
                          {bug.is_on_critical_path ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-bold animate-pulse">
                              <span className="material-symbols-outlined text-[12px]">warning</span>
                              CRITICAL PATH
                            </span>
                          ) : (
                            <span className="text-on-surface-variant/50 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-2.5 text-right">
                          <Link
                            href={`/bugs/${bug.id}/graph`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container-highest hover:bg-primary/20 hover:text-primary text-[11px] font-medium text-on-surface transition-colors"
                          >
                            <span className="material-symbols-outlined text-[13px]">hub</span>
                            Graph
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
