'use client';
import React, { useState, useMemo } from 'react';
import { computeCvss4Score, CvssV4Metrics, CvssSeverity } from '@/lib/cvss4';

type MetricValue = CvssV4Metrics[keyof CvssV4Metrics];

interface MetricItem {
  key: keyof CvssV4Metrics;
  label: string;
  options: { value: MetricValue; label: string }[];
}

const EXPLOITABILITY_METRICS: MetricItem[] = [
  {
    key: 'AV', label: 'Attack Vector (AV)',
    options: [{ value: 'N', label: 'Network' }, { value: 'A', label: 'Adjacent' }, { value: 'L', label: 'Local' }, { value: 'P', label: 'Physical' }],
  },
  {
    key: 'AC', label: 'Attack Complexity (AC)',
    options: [{ value: 'L', label: 'Low' }, { value: 'H', label: 'High' }],
  },
  {
    key: 'AT', label: 'Attack Requirements (AT)',
    options: [{ value: 'N', label: 'None' }, { value: 'P', label: 'Present' }],
  },
  {
    key: 'PR', label: 'Privileges Required (PR)',
    options: [{ value: 'N', label: 'None' }, { value: 'L', label: 'Low' }, { value: 'H', label: 'High' }],
  },
  {
    key: 'UI', label: 'User Interaction (UI)',
    options: [{ value: 'N', label: 'None' }, { value: 'P', label: 'Passive' }, { value: 'A', label: 'Active' }],
  },
];

const IMPACT_METRICS: MetricItem[] = [
  {
    key: 'VC', label: 'Vuln. Confidentiality (VC)',
    options: [{ value: 'H', label: 'High' }, { value: 'L', label: 'Low' }, { value: 'N', label: 'None' }],
  },
  {
    key: 'VI', label: 'Vuln. Integrity (VI)',
    options: [{ value: 'H', label: 'High' }, { value: 'L', label: 'Low' }, { value: 'N', label: 'None' }],
  },
  {
    key: 'VA', label: 'Vuln. Availability (VA)',
    options: [{ value: 'H', label: 'High' }, { value: 'L', label: 'Low' }, { value: 'N', label: 'None' }],
  },
  {
    key: 'SC', label: 'Subsequent Conf. (SC)',
    options: [{ value: 'H', label: 'High' }, { value: 'L', label: 'Low' }, { value: 'N', label: 'None' }],
  },
  {
    key: 'SI', label: 'Subsequent Integ. (SI)',
    options: [{ value: 'H', label: 'High' }, { value: 'L', label: 'Low' }, { value: 'N', label: 'None' }],
  },
  {
    key: 'SA', label: 'Subsequent Avail. (SA)',
    options: [{ value: 'H', label: 'High' }, { value: 'L', label: 'Low' }, { value: 'N', label: 'None' }],
  },
];

const DEFAULT_METRICS: CvssV4Metrics = {
  AV: 'N', AC: 'L', AT: 'N', PR: 'N', UI: 'N',
  VC: 'H', VI: 'H', VA: 'H', SC: 'N', SI: 'N', SA: 'N',
};

const SEVERITY_STYLES: Record<CvssSeverity, { text: string; bg: string; border: string; arc: string }> = {
  NONE:     { text: 'text-slate-400',   bg: 'bg-slate-800/80',   border: 'border-slate-700', arc: '#64748b' },
  LOW:      { text: 'text-emerald-400', bg: 'bg-emerald-950/60', border: 'border-emerald-700/60', arc: '#10b981' },
  MEDIUM:   { text: 'text-yellow-400',  bg: 'bg-yellow-950/60',  border: 'border-yellow-700/60', arc: '#f59e0b' },
  HIGH:     { text: 'text-orange-400',  bg: 'bg-orange-950/60',  border: 'border-orange-700/60', arc: '#f97316' },
  CRITICAL: { text: 'text-red-400',     bg: 'bg-red-950/60',     border: 'border-red-700/60',    arc: '#ef4444' },
};

interface ScoreArcProps { score: number; severity: CvssSeverity }

function ScoreArc({ score, severity }: ScoreArcProps) {
  const radius = 42;
  const circumference = Math.PI * radius;
  const pct = Math.min(1, Math.max(0, score / 10));
  const dashoffset = circumference * (1 - pct);
  const color = SEVERITY_STYLES[severity].arc;

  return (
    <svg width="110" height="60" viewBox="0 0 110 60" className="overflow-visible">
      <path
        d="M 10 55 A 45 45 0 0 1 100 55"
        fill="none"
        stroke="#1e293b"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M 10 55 A 45 45 0 0 1 100 55"
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        style={{ transition: 'stroke-dashoffset 0.35s ease, stroke 0.25s ease' }}
      />
      <text x="55" y="50" textAnchor="middle" fill={color} fontSize="18" fontWeight="bold" fontFamily="monospace">
        {score.toFixed(1)}
      </text>
    </svg>
  );
}

interface Props {
  bugId?: number;
  currentVector?: string;
  onSave?: () => void;
  onApplyScore?: (score: number, vector: string, severity: string) => void;
  onClose?: () => void;
}

export function CvssModal({ bugId, onSave, onApplyScore, onClose }: Props) {
  const [metrics, setMetrics] = useState<CvssV4Metrics>(DEFAULT_METRICS);
  const [saving, setSaving] = useState(false);

  const computed = useMemo(() => computeCvss4Score(metrics), [metrics]);
  const styles = SEVERITY_STYLES[computed.severity];

  const handleSave = async () => {
    if (onApplyScore) {
      onApplyScore(computed.score, computed.vector, computed.severity);
      onClose?.();
      return;
    }

    if (bugId) {
      setSaving(true);
      try {
        await fetch(`http://localhost:3001/api/v1/bugs/${bugId}/security`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ cvss_vector: computed.vector }),
        });
        onSave?.();
      } finally {
        setSaving(false);
      }
    }
  };

  const setMetric = (key: keyof CvssV4Metrics, value: MetricValue) =>
    setMetrics(prev => ({ ...prev, [key]: value }));

  const renderMetricRow = ({ key, label, options }: MetricItem) => (
    <div key={key} className="space-y-1">
      <label className="text-[11px] font-semibold text-slate-300 block">
        {label}
      </label>
      <div className="flex gap-1.5 flex-wrap">
        {options.map(opt => (
          <button
            key={opt.value}
            id={`cvss-${key}-${opt.value}`}
            onClick={() => setMetric(key, opt.value)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all duration-150
              ${(metrics[key] as string) === opt.value
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-900/40'
                : 'bg-slate-800 border-slate-700/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div
      id="cvss-modal"
      className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-700/80 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Fixed Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>🛡️</span> FIRST.org CVSS v4.0 Calculator
          </h3>
          <p className="text-xs text-slate-400">Spec lookup with real-time MacroVector math</p>
        </div>
        <button
          id="cvss-modal-close"
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-lg transition"
        >
          ×
        </button>
      </div>

      {/* Score Banner (Compact Horizontal) */}
      <div className={`mx-4 sm:mx-5 mt-4 p-3 rounded-xl border flex items-center justify-between ${styles.bg} ${styles.border} transition-colors duration-300`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-extrabold uppercase tracking-widest px-2 py-0.5 rounded border ${styles.text} ${styles.border}`}>
              {computed.severity}
            </span>
            <span className="text-xs text-slate-400 font-mono">Bug #{bugId}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono truncate max-w-sm sm:max-w-md">
            {computed.vector}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ScoreArc score={computed.score} severity={computed.severity} />
        </div>
      </div>

      {/* Scrollable Metrics Body (2 Columns) */}
      <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Column 1: Exploitability */}
          <div className="space-y-3 p-3.5 bg-slate-950/50 rounded-xl border border-slate-800/80">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 pb-1 border-b border-slate-800 flex items-center gap-1.5">
              <span>⚡</span> Exploitability Metrics (EQ1 & EQ2)
            </div>
            {EXPLOITABILITY_METRICS.map(renderMetricRow)}
          </div>

          {/* Column 2: Impact */}
          <div className="space-y-3 p-3.5 bg-slate-950/50 rounded-xl border border-slate-800/80">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-400 pb-1 border-b border-slate-800 flex items-center gap-1.5">
              <span>💥</span> Impact Metrics (EQ3 & EQ4)
            </div>
            {IMPACT_METRICS.map(renderMetricRow)}
          </div>
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="text-xs text-slate-400 font-mono hidden sm:block">
          MacroVector Score: <strong className="text-white">{computed.score.toFixed(1)}</strong>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <button
            id="cvss-modal-cancel"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
          >
            Close
          </button>
          <button
            id="cvss-modal-save"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
          >
            {saving ? 'Applying…' : `Apply CVSS ${computed.score.toFixed(1)} Score`}
          </button>
        </div>
      </div>
    </div>
  );
}
