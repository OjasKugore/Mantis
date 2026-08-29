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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
          <Check className="w-3 h-3" /> Granted (+)
        </span>
      );
    }
    if (status === '-') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/80 text-red-300 border border-red-800">
          <X className="w-3 h-3" /> Denied (-)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800">
        <HelpCircle className="w-3 h-3" /> Requested (?)
      </span>
    );
  };

  return (
    <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-slate-300">
            <Flag className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            Governance Flags & Sign-offs
            {flags.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono text-amber-400">
                {flags.length}
              </span>
            )}
          </h3>
        </div>

        <button
          onClick={() => setShowRequestForm(!showRequestForm)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-semibold transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Request Flag</span>
        </button>
      </div>

      {actionError && (
        <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Request Flag Form Modal / Accordion */}
      {showRequestForm && (
        <form
          onSubmit={handleRequestFlag}
          className="p-3.5 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-3 animate-fade-in text-xs"
        >
          <div className="font-bold text-slate-200 flex items-center justify-between">
            <span>New Flag Request</span>
            <button
              type="button"
              onClick={() => setShowRequestForm(false)}
              className="text-slate-500 hover:text-slate-300"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                Flag Type
              </label>
              <select
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
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
              <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                Requestee (Recipient)
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
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
              className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Submit Request</span>
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="p-4 text-center text-xs text-slate-500">Loading flags...</div>
      ) : flags.length === 0 ? (
        <div className="p-4 text-center text-xs text-slate-500">
          No flags set on this bug. Click "+ Request Flag" to ask for <code className="text-amber-400">needinfo?</code> or code review.
        </div>
      ) : (
        <div className="space-y-2">
          {flags.map((f) => (
            <div
              key={f.id}
              className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-400">
                    {f.type_name}?
                  </span>
                  {getStatusBadge(f.status)}
                </div>
                <div className="text-[11px] text-slate-400">
                  <span>Requested from: </span>
                  <span className="text-slate-200 font-semibold">
                    {f.requestee_display_name || f.requestee_username || 'Anyone'}
                  </span>
                  <span className="text-slate-600 mx-1.5">•</span>
                  <span>by @{f.setter_username}</span>
                </div>
              </div>

              {/* Status Action Buttons for pending flags */}
              {f.status === '?' && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleUpdateFlagStatus(f.id, '+')}
                    title="Grant (+)"
                    className="p-1.5 rounded-md bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleUpdateFlagStatus(f.id, '-')}
                    title="Deny (-)"
                    className="p-1.5 rounded-md bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-400 transition"
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
