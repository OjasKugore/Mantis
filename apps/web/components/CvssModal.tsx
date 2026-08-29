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
    key: 'AV',
    label: 'Attack Vector (AV)',
    options: [
      { value: 'N', label: 'Network' },
      { value: 'A', label: 'Adjacent' },
      { value: 'L', label: 'Local' },
      { value: 'P', label: 'Physical' },
    ],
  },
  {
    key: 'AC',
    label: 'Attack Complexity (AC)',
    options: [
      { value: 'L', label: 'Low' },
      { value: 'H', label: 'High' },
    ],
  },
  {
    key: 'AT',
    label: 'Attack Requirements (AT)',
    options: [
      { value: 'N', label: 'None' },
      { value: 'P', label: 'Present' },
    ],
  },
  {
    key: 'PR',
    label: 'Privileges Required (PR)',
    options: [
      { value: 'N', label: 'None' },
      { value: 'L', label: 'Low' },
      { value: 'H', label: 'High' },
    ],
  },
  {
    key: 'UI',
    label: 'User Interaction (UI)',
    options: [
      { value: 'N', label: 'None' },
      { value: 'P', label: 'Passive' },
      { value: 'A', label: 'Active' },
    ],
  },
];

const IMPACT_METRICS: MetricItem[] = [
  {
    key: 'VC',
    label: 'Vuln. Confidentiality (VC)',
    options: [
      { value: 'H', label: 'High' },
      { value: 'L', label: 'Low' },
      { value: 'N', label: 'None' },
    ],
  },
  {
    key: 'VI',
    label: 'Vuln. Integrity (VI)',
    options: [
      { value: 'H', label: 'High' },
      { value: 'L', label: 'Low' },
      { value: 'N', label: 'None' },
    ],
  },
  {
    key: 'VA',
    label: 'Vuln. Availability (VA)',
    options: [
      { value: 'H', label: 'High' },
      { value: 'L', label: 'Low' },
      { value: 'N', label: 'None' },
    ],
  },
  {
    key: 'SC',
    label: 'Subsequent Conf. (SC)',
    options: [
      { value: 'H', label: 'High' },
      { value: 'L', label: 'Low' },
      { value: 'N', label: 'None' },
    ],
  },
  {
    key: 'SI',
    label: 'Subsequent Integ. (SI)',
    options: [
      { value: 'H', label: 'High' },
      { value: 'L', label: 'Low' },
      { value: 'N', label: 'None' },
    ],
  },
  {
    key: 'SA',
    label: 'Subsequent Avail. (SA)',
    options: [
      { value: 'H', label: 'High' },
      { value: 'L', label: 'Low' },
      { value: 'N', label: 'None' },
    ],
  },
];

const DEFAULT_METRICS: CvssV4Metrics = {
  AV: 'N',
  AC: 'L',
  AT: 'N',
  PR: 'N',
  UI: 'N',
  VC: 'H',
  VI: 'H',
  VA: 'H',
  SC: 'N',
  SI: 'N',
  SA: 'N',
};

const SEVERITY_THEMES: Record<
  CvssSeverity,
  {
    cardBg: string;
    cardBorder: string;
    pillBg: string;
    pillText: string;
    scoreText: string;
    strokeColor: string;
    label: string;
  }
> = {
  CRITICAL: {
    cardBg: 'bg-error-container/20',
    cardBorder: 'border-error/20',
    pillBg: 'bg-error',
    pillText: 'text-on-error',
    scoreText: 'text-error',
    strokeColor: '#ba1a1a',
    label: 'Critical',
  },
  HIGH: {
    cardBg: 'bg-tertiary-container/20',
    cardBorder: 'border-tertiary-container/30',
    pillBg: 'bg-tertiary',
    pillText: 'text-on-tertiary',
    scoreText: 'text-tertiary',
    strokeColor: '#735a31',
    label: 'High',
  },
  MEDIUM: {
    cardBg: 'bg-tertiary-fixed/30',
    cardBorder: 'border-tertiary-fixed/40',
    pillBg: 'bg-tertiary',
    pillText: 'text-on-tertiary',
    scoreText: 'text-tertiary',
    strokeColor: '#b89a6b',
    label: 'Medium',
  },
  LOW: {
    cardBg: 'bg-primary-container/25',
    cardBorder: 'border-primary-container/40',
    pillBg: 'bg-primary',
    pillText: 'text-on-primary',
    scoreText: 'text-primary',
    strokeColor: '#486730',
    label: 'Low',
  },
  NONE: {
    cardBg: 'bg-surface-container',
    cardBorder: 'border-outline-variant/30',
    pillBg: 'bg-surface-variant',
    pillText: 'text-on-surface-variant',
    scoreText: 'text-on-surface-variant',
    strokeColor: '#74796d',
    label: 'None',
  },
};

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
  const theme = SEVERITY_THEMES[computed.severity] || SEVERITY_THEMES.CRITICAL;

  // Gauge calculation: 2 * PI * 45 = 282.743
  const circumference = 282.7;
  const dashoffset = circumference * (1 - Math.min(10, Math.max(0, computed.score)) / 10);

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
    setMetrics((prev) => ({ ...prev, [key]: value }));

  return (
    <div
      id="cvss-modal"
      className="relative z-50 w-full max-w-5xl bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/30 flex flex-col overflow-hidden max-h-[90vh] animate-fade-in text-on-surface"
    >
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 border-b border-outline-variant/20 bg-surface-container-low/50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-2xl">calculate</span>
          </div>
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2 font-bold">
              FIRST.org CVSS v4.0 Calculator
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Spec lookup with real-time MacroVector math
            </p>
          </div>
        </div>
        <button
          id="cvss-modal-close"
          onClick={onClose}
          className="text-on-surface-variant hover:text-on-surface hover:bg-surface-variant p-2 rounded-full transition-colors flex items-center justify-center"
          title="Close Modal"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Main Content Scrollable Area */}
      <div className="overflow-y-auto flex-1 p-6 space-y-6">
        {/* Score Summary Card */}
        <div
          className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden transition-colors duration-300`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-surface-tint/5 to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 ${theme.pillBg} ${theme.pillText} rounded-md font-label-caps text-label-caps tracking-wider uppercase shadow-xs font-bold`}
              >
                {theme.label}
              </span>
              <span className="font-body-md text-body-md text-on-surface-variant font-medium">
                {bugId ? `Bug #${bugId}` : 'New Defect'}
              </span>
            </div>
            <div className="font-label-code text-label-code text-on-surface bg-surface-container-low px-3 py-2 rounded-md border border-outline-variant/30 inline-block break-all max-w-xl font-bold">
              {computed.vector}
            </div>
          </div>

          {/* Circular Score Gauge */}
          <div className="relative z-10 w-24 h-24 flex items-center justify-center shrink-0 self-center sm:self-auto">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                className="text-outline-variant/30"
                cx="50"
                cy="50"
                fill="none"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                fill="none"
                r="45"
                stroke={theme.strokeColor}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={dashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.35s ease, stroke 0.25s ease' }}
              />
            </svg>
            <div
              className={`absolute inset-0 flex items-center justify-center font-headline-md text-headline-md font-extrabold ${theme.scoreText}`}
            >
              {computed.score.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Two Column Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column (Exploitability) */}
          <div className="space-y-6">
            {EXPLOITABILITY_METRICS.map(({ key, label, options }) => (
              <div key={key} className="space-y-2">
                <label className="font-body-sm text-body-sm font-semibold text-on-surface-variant block">
                  {label}
                </label>
                <div className="flex flex-wrap gap-2">
                  {options.map((opt) => {
                    const isSelected = (metrics[key] as string) === opt.value;
                    return (
                      <button
                        key={opt.value}
                        id={`cvss-${key}-${opt.value}`}
                        type="button"
                        onClick={() => setMetric(key, opt.value)}
                        className={`px-4 py-2 rounded-lg font-body-sm text-body-sm transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-primary text-on-primary font-bold shadow-sm'
                            : 'bg-surface-container-highest text-on-surface hover:bg-surface-variant border border-outline-variant/30 font-medium'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Right Column (Impact) */}
          <div className="space-y-6">
            {IMPACT_METRICS.map(({ key, label, options }) => (
              <div key={key} className="space-y-2">
                <label className="font-body-sm text-body-sm font-semibold text-on-surface-variant block">
                  {label}
                </label>
                <div className="flex flex-wrap gap-2">
                  {options.map((opt) => {
                    const isSelected = (metrics[key] as string) === opt.value;
                    return (
                      <button
                        key={opt.value}
                        id={`cvss-${key}-${opt.value}`}
                        type="button"
                        onClick={() => setMetric(key, opt.value)}
                        className={`px-4 py-2 rounded-lg font-body-sm text-body-sm transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-primary text-on-primary font-bold shadow-sm'
                            : 'bg-surface-container-highest text-on-surface hover:bg-surface-variant border border-outline-variant/30 font-medium'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-outline-variant/20 bg-surface-container-low/50 flex items-center justify-between shrink-0">
        <div className="font-label-code text-label-code text-on-surface-variant flex items-center gap-2">
          MacroVector Score: <span className="text-on-surface font-bold text-lg ml-1">{computed.score.toFixed(1)}</span>
        </div>
        <div className="flex gap-3">
          <button
            id="cvss-modal-cancel"
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg border border-outline-variant text-on-surface font-body-md text-body-md font-semibold hover:bg-surface-variant transition-colors"
          >
            Close
          </button>
          <button
            id="cvss-modal-save"
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-body-md text-body-md font-bold shadow-sm hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <span>{saving ? 'Applying...' : `Apply CVSS ${computed.score.toFixed(1)} Score`}</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}

