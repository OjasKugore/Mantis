'use client';

import React, { useState, useEffect } from 'react';
import { TrendingDown, Calendar, CheckCircle2, AlertCircle, RefreshCw, Activity, Zap } from 'lucide-react';
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
  const [milestone, setMilestone] = useState('128.0');
  const [data, setData] = useState<BurndownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [animKey, setAnimKey] = useState(0);

  const fetchBurndown = async (m: string) => {
    setLoading(true);
    try {
      const scopeParam = user && !isDemoUser(user) ? '&scope=user' : '';
      const res = await fetch(`${API_BASE}/api/v1/analytics/burndown?milestone=${encodeURIComponent(m)}${scopeParam}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setAnimKey((prev) => prev + 1); // trigger clean re-animation on data load
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
  const maxVal = data?.totalBugs || 15;

  // SVG Chart Geometry Constants
  const width = 600;
  const height = 240;
  const paddingX = 40;
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
    <div className="p-6 rounded-2xl border border-[#e5dde1] bg-[#fbf1f5] shadow-sm space-y-6 text-[#1b1c17]">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-container/20 border border-primary/30 flex items-center justify-center text-primary">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Sprint & Release Burndown
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-container text-on-primary-container">
                Live CPM Telemetry
              </span>
            </h3>
            <p className="text-xs text-slate-600">
              Trajectory of resolved vs pending blockers across sprint milestones.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-[#e5dde1] text-xs shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span className="text-slate-600 font-medium">Milestone:</span>
            <select
              value={milestone}
              onChange={(e) => setMilestone(e.target.value)}
              className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
            >
              <option value="128.0" className="bg-white">Firefox 128.0 (Current)</option>
              <option value="115.0" className="bg-white">Thunderbird 115.0</option>
              <option value="129.0" className="bg-white">Gecko 129.0 Next</option>
              <option value="---" className="bg-white">Unspecified (---)</option>
            </select>
          </div>

          <button
            onClick={() => fetchBurndown(milestone)}
            className="p-2 rounded-lg bg-white hover:bg-slate-100 border border-[#e5dde1] text-slate-700 transition shadow-sm"
            title="Refresh Burndown"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-[#e5dde1] shadow-sm space-y-1 transition-transform hover:-translate-y-0.5 duration-200">
          <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
            <Activity className="w-3 h-3 text-primary" /> Total Scope
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono">{data?.totalBugs ?? 0} Bugs</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#e5dde1] shadow-sm space-y-1 transition-transform hover:-translate-y-0.5 duration-200">
          <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Resolved
          </div>
          <div className="text-xl font-extrabold text-emerald-700 font-mono">{data?.resolvedCount ?? 0} Fixed</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#e5dde1] shadow-sm space-y-1 transition-transform hover:-translate-y-0.5 duration-200">
          <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-600" /> Remaining
          </div>
          <div className="text-xl font-extrabold text-amber-700 font-mono">{data?.openCount ?? 0} Open</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#e5dde1] shadow-sm space-y-1 transition-transform hover:-translate-y-0.5 duration-200">
          <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
            <Zap className="w-3 h-3 text-primary" /> Completion Rate
          </div>
          <div className="text-xl font-extrabold text-primary font-mono">{burnRatePercent}%</div>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="p-4 rounded-xl bg-white border border-[#e5dde1] shadow-sm relative overflow-hidden">
        {/* SVG Chart */}
        <svg
          key={animKey}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-56 select-none overflow-visible"
        >
          <defs>
            <linearGradient id="burndownLavenderGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#486730" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#486730" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glowLavender" x="-20%" y="-20%" width="140%" height="140%">
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
                  stroke="#f1e9ed"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#74796d"
                  fontSize="10"
                  fontFamily="monospace"
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
              fill="url(#burndownLavenderGradient)"
              className="anim-area"
            />
          )}

          {/* Ideal Trajectory Line (Dashed) */}
          {idealPath && (
            <path
              d={idealPath}
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              strokeDasharray="6 6"
              opacity="0.8"
              className="anim-line-ideal"
            />
          )}

          {/* Actual Remaining Line (Solid Forest Primary) */}
          {actualPath && (
            <path
              d={actualPath}
              fill="none"
              stroke="#486730"
              strokeWidth="3"
              filter="url(#glowLavender)"
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
                    r={10}
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
            className="absolute top-6 left-1/2 -translate-x-1/2 bg-white border border-[#c4c8ba] shadow-xl p-2.5 rounded-xl text-xs flex items-center gap-4 animate-fade-in pointer-events-none text-slate-800"
          >
            <div>
              <span className="text-[10px] text-slate-500 block font-semibold">{trajectory[hoverIndex].day}</span>
              <span className="text-slate-900 font-bold">{trajectory[hoverIndex].actual ?? trajectory[hoverIndex].ideal} Bugs Left</span>
            </div>
            <div className="border-l border-[#e5dde1] pl-3">
              <span className="text-[10px] text-primary block font-semibold">Ideal Target</span>
              <span className="text-slate-600 font-mono">{trajectory[hoverIndex].ideal}</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 px-1 border-t border-[#e5dde1] pt-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-0.5 bg-primary shadow-[0_0_6px_rgba(72,103,48,0.5)]" />
            <span className="text-slate-800 font-medium">Actual Remaining Defect Backlog</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-0.5 border-t border-dashed border-slate-400" />
            <span>Ideal Sprint Burndown Guideline</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          Updated live from CPM topological engine
        </div>
      </div>
    </div>
  );
}
