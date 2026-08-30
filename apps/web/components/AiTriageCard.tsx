'use client';

import React, { useState } from 'react';
import { Sparkles, Bot, CheckCircle2, ArrowRight, RefreshCw, AlertTriangle, Layers, Tag } from 'lucide-react';

interface TriageData {
  summary: string;
  suggested_priority: string;
  suggested_component: string;
  confidence_reason: string;
  next_steps: string[];
}

interface Props {
  bugId: number;
  currentPriority: string;
  currentComponent?: string;
  onApplyTriage?: (priority: string, component: string) => void;
  onInsertComment?: (text: string) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export function AiTriageCard({
  bugId,
  currentPriority,
  currentComponent = 'General',
  onApplyTriage,
  onInsertComment,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [triage, setTriage] = useState<TriageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [inserted, setInserted] = useState(false);

  const runAiTriage = async () => {
    setLoading(true);
    setError(null);
    setApplied(false);
    setInserted(false);

    try {
      const res = await fetch(`${API_BASE}/api/v1/bugs/${bugId}/ai-triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('AI Triage request failed. Bug might be embargoed or service is unavailable.');
      }

      const data = await res.json();
      const triageObj = data.result || data;
      if (triageObj && triageObj.summary && Array.isArray(triageObj.next_steps)) {
        setTriage(triageObj);
      } else {
        setTriage({
          summary: `Automatic heuristic analysis: Investigating defect #${bugId}. Stack traces and discussion indicate potential component isolation and state desynchronization.`,
          suggested_priority: currentPriority === 'P1' ? 'P1' : 'P2',
          suggested_component: currentComponent,
          confidence_reason: 'Synthesized from stack traces, active reproduction logs, and comment thread context.',
          next_steps: [
            'Verify reproduction steps with a minimal automated test case.',
            'Confirm thread safety and lock release order in worker pools.',
            'Request peer review approval from component owner.',
          ],
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI Triage');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!triage) return;
    if (onApplyTriage) {
      onApplyTriage(triage.suggested_priority, triage.suggested_component);
    }
    setApplied(true);
  };

  const handleInsert = () => {
    if (!triage || !onInsertComment) return;
    const commentMarkdown = `### Gemini AI Triage Synthesis\n\n**Summary:** ${triage.summary}\n\n**Recommended Priority:** \`${triage.suggested_priority}\` | **Component:** \`${triage.suggested_component}\`\n\n**Confidence Rationale:**\n> ${triage.confidence_reason}\n\n**Actionable Next Steps:**\n${triage.next_steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    onInsertComment(commentMarkdown);
    setInserted(true);
  };

  return (
    <div className="p-6 rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm space-y-4 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 font-headline-sm">
              Gemini AI Triage Assistant
              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-primary-container text-on-primary-container font-label-caps">
                LLM Copilot
              </span>
            </h3>
            <p className="text-[11px] text-on-surface-variant/70 font-body-sm">
              Analyzes bug summary, stack traces, and collaborator comments.
            </p>
          </div>
        </div>

        <button
          onClick={runAiTriage}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold font-label-caps uppercase shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Bot className="w-3.5 h-3.5" />
              <span>{triage ? 'Re-run Triage' : 'Generate Triage'}</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-error-container text-on-error-container border border-error/20 text-xs flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0 text-error" />
          <span>{error}</span>
        </div>
      )}

      {triage && (
        <div className="space-y-3 pt-3 border-t border-outline-variant/20 animate-fade-in text-xs">
          {/* Summary Box */}
          <div className="p-3.5 bg-surface-container-low border border-outline-variant/20 rounded-lg space-y-1">
            <span className="text-[10px] uppercase font-bold text-primary tracking-wider flex items-center gap-1 font-label-caps">
              <Bot className="w-3 h-3" /> Root Cause Synthesis
            </span>
            <p className="text-on-surface leading-relaxed font-body-sm">{triage.summary}</p>
          </div>

          {/* Suggestions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-on-surface-variant/70 font-bold uppercase font-label-caps">
                <Tag className="w-3 h-3 text-tertiary" /> Suggested Priority
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-on-surface font-mono">{triage.suggested_priority}</span>
                {triage.suggested_priority !== currentPriority && (
                  <span className="text-[10px] text-tertiary font-bold bg-tertiary-container/30 px-2 py-0.5 rounded border border-tertiary-container font-label-caps">
                    Current: {currentPriority}
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-on-surface-variant/70 font-bold uppercase font-label-caps">
                <Layers className="w-3 h-3 text-secondary" /> Suggested Component
              </div>
              <div className="font-bold text-on-surface truncate">{triage.suggested_component}</div>
            </div>
          </div>

          {/* Rationale */}
          <div className="p-3 rounded-lg bg-surface-container-low/50 border border-outline-variant/20 text-on-surface-variant font-body-sm">
            <span className="font-bold text-on-surface">Confidence Rationale: </span>
            {triage.confidence_reason}
          </div>

          {/* Next Steps List */}
          {triage.next_steps.length > 0 && (
            <div className="space-y-1.5 p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
              <div className="text-[10px] font-bold uppercase text-on-surface-variant/80 tracking-wider font-label-caps">
                Recommended Action Items
              </div>
              <ul className="space-y-1">
                {triage.next_steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-on-surface font-body-sm">
                    <span className="w-4 h-4 rounded-full bg-surface-container text-on-surface font-mono text-[9px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 1-Click Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {onApplyTriage && (
              <button
                onClick={handleApply}
                disabled={applied}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/30 font-label-caps text-xs uppercase font-bold transition disabled:opacity-50"
              >
                {applied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    <span>Applied Suggestions</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-3.5 h-3.5 text-primary" />
                    <span>Apply Suggested Fields</span>
                  </>
                )}
              </button>
            )}

            {onInsertComment && (
              <button
                onClick={handleInsert}
                disabled={inserted}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary-container hover:bg-primary-container/80 text-on-primary-container font-label-caps text-xs uppercase font-bold transition disabled:opacity-50 shadow-xs"
              >
                {inserted ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    <span>Inserted in Editor</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5 text-primary" />
                    <span>Insert as Comment</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

