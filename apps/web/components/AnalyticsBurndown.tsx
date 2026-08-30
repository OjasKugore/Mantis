'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, isDemoUser } from '@/lib/auth-context';

interface TrajectoryPoint {
  day: string;
  ideal: number;
  actual: number | null;
  remainingEffortHours: number;
}

interface BurndownData {
  milestone: string;
  totalBugs: number;
  resolvedCount: number;
  openCount: number;
  trajectory: TrajectoryPoint[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export function AnalyticsBurndown() {
  const { user } = useAuth();
  const isDemo = isDemoUser(user);
  const [milestone, setMilestone] = useState(isDemo ? '128.0' : 'all');
  const [data, setData] = useState<BurndownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [animKey, setAnimKey] = useState(0);

  const fetchBurndown = async (m: string) => {
    setLoading(true);
    try {
      const scopeParam = user && !isDemoUser(user) ? '&scope=user' : '&scope=demo';
      const res = await fetch(`${API_BASE}/api/v1/analytics/burndown?milestone=${encodeURIComponent(m)}${scopeParam}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setAnimKey((prev) => prev + 1);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBurndown(milestone);
  }, [milestone, user]);

  const trajectory = data?.trajectory || [];
  const maxVal = Math.max(data?.totalBugs || 15, 1);

  // SVG Chart Geometry Constants
  const width = 600;
  const height = 240;
  const paddingX = 45;
  const paddingY = 30;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  // Transform coordinates
  const getX = (index: number) => {
    const count = Math.max(trajectory.length - 1, 1);
    return paddingX + (index / count) * chartW;
  };

  const getY = (val: number) => {
    return paddingY + (1 - val / maxVal) * chartH;
  };

  // Build ideal path
  const idealPath = trajectory
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.ideal)}`)
    .join(' ');

  // Build actual path
  const actualPoints = trajectory.filter((p) => p.actual !== null);
  const actualPath = actualPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.actual!)}`)
    .join(' ');

  // Build area fill under actual path
  const actualArea =
    actualPoints.length > 0
      ? `${actualPath} L ${getX(actualPoints.length - 1)} ${height - paddingY} L ${paddingX} ${height - paddingY} Z`
      : '';

  const burnRatePercent = data && data.totalBugs > 0 ? Math.round((data.resolvedCount / data.totalBugs) * 100) : 0;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 md:p-8 shadow-sm space-y-6 text-on-surface">
      <style jsx>{`
        @keyframes drawTrajectory {
          0% {
            stroke-dashoffset: 800;
            opacity: 0.3;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }
        @keyframes fadeInGrad {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes softPopNode {
          0% {
            transform: scale(0.7);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .anim-line-actual {
          stroke-dasharray: 800;
          animation: drawTrajectory 0.75s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .anim-line-ideal {
          stroke-dasharray: 800;
          animation: drawTrajectory 0.65s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .anim-area {
          animation: fadeInGrad 0.6s ease-out forwards;
        }
        .anim-dot {
          transform-origin: center;
          animation: softPopNode 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}</style>

      {/* Header with Milestone Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/20 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-[22px]">trending_down</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-on-surface tracking-tight">
                Sprint Velocity &amp; Release Burndown
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-container text-on-primary-container font-mono border border-primary/20">
                Live Telemetry
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Trajectory of resolved vs. open defect backlog calculated across sprint timelines.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 bg-surface-container-high/40 px-3 py-1.5 rounded-xl border border-outline-variant/40 text-xs shadow-xs">
            <span className="material-symbols-outlined text-primary text-[16px]">flag</span>
            <span className="text-on-surface-variant font-medium">Milestone:</span>
            <select
              value={milestone}
              onChange={(e) => setMilestone(e.target.value)}
              className="bg-transparent text-on-surface font-bold focus:outline-none cursor-pointer pr-1"
            >
              {isDemo ? (
                <>
                  <option value="128.0">Firefox 128.0 (Current)</option>
                  <option value="115.0">Thunderbird 115.0</option>
                  <option value="129.0">Gecko 129.0 Next</option>
                  <option value="all">All Sprint Milestones</option>
                </>
              ) : (
                <>
                  <option value="all">All Workspace Issues</option>
                  <option value="1.0.0">Release 1.0.0</option>
                  <option value="v1.1">Sprint v1.1</option>
                  <option value="---">Unscheduled (---)</option>
                </>
              )}
            </select>
          </div>

          <button
            onClick={() => fetchBurndown(milestone)}
            className="p-2 rounded-xl bg-surface-container-high/40 hover:bg-surface-container-high border border-outline-variant/40 text-on-surface transition shadow-xs cursor-pointer flex items-center justify-center"
            title="Refresh Burndown Data"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-surface-container-high/30 border border-outline-variant/30 shadow-xs space-y-1.5 transition-transform hover:-translate-y-0.5 duration-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label-caps flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[15px]">inventory_2</span>
            Total Scope
          </div>
          <div className="text-2xl font-extrabold text-on-surface font-mono">{data?.totalBugs ?? 0} Bugs</div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-high/30 border border-outline-variant/30 shadow-xs space-y-1.5 transition-transform hover:-translate-y-0.5 duration-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label-caps flex items-center gap-1.5">
            <span className="material-symbols-outlined text-emerald-600 text-[15px]">check_circle</span>
            Resolved
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 font-mono">{data?.resolvedCount ?? 0} Fixed</div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-high/30 border border-outline-variant/30 shadow-xs space-y-1.5 transition-transform hover:-translate-y-0.5 duration-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label-caps flex items-center gap-1.5">
            <span className="material-symbols-outlined text-amber-600 text-[15px]">pending</span>
            Remaining Open
          </div>
          <div className="text-2xl font-extrabold text-amber-600 font-mono">{data?.openCount ?? 0} Open</div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-high/30 border border-outline-variant/30 shadow-xs space-y-1.5 transition-transform hover:-translate-y-0.5 duration-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label-caps flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[15px]">bolt</span>
            Burn Rate
          </div>
          <div className="text-2xl font-extrabold text-primary font-mono">{burnRatePercent}%</div>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="p-5 rounded-2xl bg-surface-container/20 border border-outline-variant/30 shadow-inner relative overflow-hidden">
        <svg
          key={animKey}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-60 select-none overflow-visible"
        >
          <defs>
            <linearGradient id="burndownPrimaryGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#486730" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#486730" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glowBurndown" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = paddingY + pct * chartH;
            const val = Math.round(maxVal * (1 - pct));
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#c4c8ba"
                  strokeOpacity="0.3"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#74796d"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          {actualArea && (
            <path
              d={actualArea}
              fill="url(#burndownPrimaryGradient)"
              className="anim-area"
            />
          )}

          {/* Ideal Trajectory Line (Dashed) */}
          {idealPath && (
            <path
              d={idealPath}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="6 6"
              opacity="0.8"
              className="anim-line-ideal"
            />
          )}

          {/* Actual Remaining Line (Solid Mantis Forest Primary) */}
          {actualPath && (
            <path
              d={actualPath}
              fill="none"
              stroke="#486730"
              strokeWidth="3"
              filter="url(#glowBurndown)"
              className="anim-line-actual"
            />
          )}

          {/* Data Points on Actual */}
          {actualPoints.map((p, i) => {
            const cx = getX(i);
            const cy = getY(p.actual!);
            const isHovered = hoverIndex === i;
            const delayStyle = { animationDelay: `${i * 70 + 400}ms` };
            return (
              <g
                key={i}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6 : 4}
                  fill="#ffffff"
                  stroke="#486730"
                  strokeWidth={isHovered ? 3 : 2}
                  style={delayStyle}
                  className="anim-dot transition-all duration-150"
                />
                {isHovered && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={12}
                    fill="#486730"
                    opacity="0.2"
                  />
                )}
              </g>
            );
          })}

          {/* X Axis Labels */}
          {trajectory.map((p, i) => {
            if (i % 2 !== 0 && i !== trajectory.length - 1) return null;
            return (
              <text
                key={i}
                x={getX(i)}
                y={height - 8}
                textAnchor="middle"
                fill="#74796d"
                fontSize="10"
                fontWeight="500"
                fontFamily="sans-serif"
              >
                {p.day}
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoverIndex !== null && trajectory[hoverIndex] && (
          <div
            className="absolute top-5 left-1/2 -translate-x-1/2 bg-surface-container-lowest border border-outline-variant/50 shadow-2xl p-3 rounded-xl text-xs flex items-center gap-4 animate-fade-in pointer-events-none text-on-surface"
          >
            <div>
              <span className="text-[10px] text-on-surface-variant block font-semibold">{trajectory[hoverIndex].day}</span>
              <span className="text-on-surface font-bold font-mono">{trajectory[hoverIndex].actual ?? trajectory[hoverIndex].ideal} Bugs Left</span>
            </div>
            <div className="border-l border-outline-variant/30 pl-3">
              <span className="text-[10px] text-primary block font-semibold">Ideal Target</span>
              <span className="text-on-surface-variant font-mono">{trajectory[hoverIndex].ideal}</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend & Telemetry Engine Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-on-surface-variant px-1 border-t border-outline-variant/20 pt-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(72,103,48,0.5)]" />
            <span className="text-on-surface font-medium">Actual Remaining Defect Backlog</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-0.5 border-t-2 border-dashed border-slate-400" />
            <span>Ideal Sprint Guideline</span>
          </div>
        </div>

        <div className="text-[11px] text-on-surface-variant/70 font-mono flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Critical Path Method (CPM) Realtime Engine
        </div>
      </div>
    </div>
  );
}
