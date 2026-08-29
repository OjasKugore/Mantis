'use client';

import React, { useState, useEffect } from 'react';
import { Flag, Plus, Check, X, HelpCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface FlagItem {
  id: number;
  type_id: number;
  status: '?' | '+' | '-';
  bug_id: number;
  type_name: string;
  type_description: string;
  setter_id: string;
  setter_username: string;
  setter_display_name?: string;
  requestee_id: string | null;
  requestee_username: string | null;
  requestee_display_name?: string | null;
  created_at: string;
}

interface FlagType {
  id: number;
  name: string;
  description: string;
}

interface Props {
  bugId: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const SEED_USERS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Alice Developer', username: 'alice_dev' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Bob QA Engineer', username: 'bob_qa' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Carol Security Lead', username: 'carol_sec' },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Dave Performance Eng', username: 'dave_eng' },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Eve Triage Lead', username: 'eve_triage' },
];

export function FlagsCard({ bugId }: Props) {
  const { user } = useAuth();
  const [flags, setFlags] = useState<FlagItem[]>([]);
  const [flagTypes, setFlagTypes] = useState<FlagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<number>(1);
  const [selectedUserId, setSelectedUserId] = useState<string>(SEED_USERS[0].id);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const [fRes, ftRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/bugs/${bugId}/flags`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/v1/flag-types`, { credentials: 'include' }),
      ]);

      if (fRes.ok) {
        const data = await fRes.json();
        setFlags(data);
      }
      if (ftRes.ok) {
        const tData = await ftRes.json();
        setFlagTypes(tData);
        if (tData.length > 0 && !selectedTypeId) {
          setSelectedTypeId(tData[0].id);
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, [bugId]);

  const handleRequestFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/bugs/${bugId}/flags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type_id: Number(selectedTypeId),
          status: '?',
          requestee_id: selectedUserId || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to request flag');
      }

      setShowRequestForm(false);
      fetchFlags();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateFlagStatus = async (flagId: number, status: '+' | '-') => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/flags/${flagId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const err = await res.json();
        setActionError(err.message || 'Failed to update flag');
        return;
      }

      fetchFlags();
    } catch {
      setActionError('Network error updating flag');
    }
  };

  const getStatusBadge = (status: '?' | '+' | '-') => {
    if (status === '+') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-primary-container text-on-primary-container border border-primary/30 font-label-caps">
          <Check className="w-3 h-3" /> Granted (+)
        </span>
      );
    }
    if (status === '-') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-error-container text-on-error-container border border-error/30 font-label-caps">
          <X className="w-3 h-3" /> Denied (-)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-tertiary-container/30 text-tertiary border border-tertiary-container font-label-caps">
        <HelpCircle className="w-3 h-3" /> Requested (?)
      </span>
    );
  };

  return (
    <div className="p-6 rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-tertiary">
            <Flag className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-2 font-label-caps">
            Governance Flags &amp; Sign-offs
            {flags.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-tertiary-container/30 text-tertiary text-[10px] font-mono font-bold">
                {flags.length}
              </span>
            )}
          </h3>
        </div>

        <button
          onClick={() => setShowRequestForm(!showRequestForm)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-caps text-xs uppercase font-bold hover:bg-primary/90 transition shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Request Flag</span>
        </button>
      </div>

      {actionError && (
        <div className="p-3 rounded-lg bg-error-container text-on-error-container border border-error/30 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-error" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Request Flag Form Modal / Accordion */}
      {showRequestForm && (
        <form
          onSubmit={handleRequestFlag}
          className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3 animate-fade-in text-xs"
        >
          <div className="font-bold text-on-surface flex items-center justify-between font-headline-sm">
            <span>New Flag Request</span>
            <button
              type="button"
              onClick={() => setShowRequestForm(false)}
              className="text-on-surface-variant hover:text-on-surface"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1 font-label-caps">
                Flag Type
              </label>
              <select
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(Number(e.target.value))}
                className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2 text-on-surface text-xs focus:ring-1 focus:ring-primary focus:border-primary"
              >
                {flagTypes.length > 0 ? (
                  flagTypes.map((ft) => (
                    <option key={ft.id} value={ft.id}>
                      {ft.name}? ({ft.description})
                    </option>
                  ))
                ) : (
                  <>
                    <option value={1}>needinfo? (Request more information)</option>
                    <option value={2}>review? (Patch code review)</option>
                    <option value={3}>approval? (Release management sign-off)</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1 font-label-caps">
                Requestee (Recipient)
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2 text-on-surface text-xs focus:ring-1 focus:ring-primary focus:border-primary"
              >
                {SEED_USERS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} (@{u.username})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowRequestForm(false)}
              className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-caps uppercase text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded-lg bg-primary text-on-primary font-bold font-label-caps uppercase flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
            >
              {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Submit Request</span>
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="p-4 text-center text-xs text-on-surface-variant font-body-sm">Loading flags...</div>
      ) : flags.length === 0 ? (
        <div className="p-4 text-center text-xs text-on-surface-variant font-body-sm">
          No flags set on this bug. Click &quot;+ Request Flag&quot; to ask for <code className="text-tertiary font-mono">needinfo?</code> or code review.
        </div>
      ) : (
        <div className="space-y-2">
          {flags.map((f) => (
            <div
              key={f.id}
              className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-tertiary">
                    {f.type_name}?
                  </span>
                  {getStatusBadge(f.status)}
                </div>
                <div className="text-[11px] text-on-surface-variant font-body-sm">
                  <span>Requested from: </span>
                  <span className="text-on-surface font-semibold">
                    {f.requestee_display_name || f.requestee_username || 'Anyone'}
                  </span>
                  <span className="text-outline-variant mx-1.5">•</span>
                  <span>by @{f.setter_username}</span>
                </div>
              </div>

              {/* Status Action Buttons for pending flags */}
              {f.status === '?' && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleUpdateFlagStatus(f.id, '+')}
                    title="Grant (+)"
                    className="p-1.5 rounded-md bg-primary-container text-on-primary-container hover:bg-primary-container/80 transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleUpdateFlagStatus(f.id, '-')}
                    title="Deny (-)"
                    className="p-1.5 rounded-md bg-error-container text-on-error-container hover:bg-error-container/80 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

