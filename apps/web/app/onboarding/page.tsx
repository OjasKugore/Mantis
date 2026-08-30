'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, isDemoUser } from '@/lib/auth-context';
import { MantisLogo } from '@/components/MantisLogo';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface DetectedInvite {
  id: string;
  token: string;
  is_admin: boolean;
  groups: string[];
  invited_by: string;
  team_name: string;
  expires_at: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();

  // Mode: 'select' | 'create' | 'join'
  const [selectedMode, setSelectedMode] = useState<'create' | 'join'>('create');

  // Create Team state
  const [teamName, setTeamName] = useState('');
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join Team state
  const [inviteTokenInput, setInviteTokenInput] = useState('');
  const [detectedInvites, setDetectedInvites] = useState<DetectedInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Redirect guard
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (isDemoUser(user) || user.onboarded) {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router]);

  // Check for auto-detected invites on mount
  useEffect(() => {
    if (user && !user.onboarded) {
      setLoadingInvites(true);
      fetch(`${API_BASE}/api/v1/onboarding/pending-invites`, { credentials: 'include' })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data.invites) && data.invites.length > 0) {
            setDetectedInvites(data.invites);
            setSelectedMode('join'); // Pre-select join if an invite exists for their email
          }
        })
        .catch(() => {})
        .finally(() => setLoadingInvites(false));
    }
  }, [user]);

  // Handle Create Team
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !productName.trim()) return;

    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/onboarding/create-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          team_name: teamName.trim(),
          product_name: productName.trim(),
          description: productDesc.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        await refreshUser();
        router.replace('/dashboard');
      } else {
        setCreateError(data.message || 'Failed to create team');
      }
    } catch {
      setCreateError('Network error creating team');
    } finally {
      setCreating(false);
    }
  };

  // Handle Accept Detected or Inputted Invite
  const handleAcceptInvite = async (tokenToUse: string) => {
    const cleanToken = tokenToUse.includes('token=')
      ? tokenToUse.split('token=')[1].split('&')[0]
      : tokenToUse.trim();

    if (!cleanToken) {
      setJoinError('Please enter a valid invitation code or link');
      return;
    }

    setJoining(true);
    setJoinError(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/team/invites/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: cleanToken }),
      });

      const data = await res.json();
      if (res.ok) {
        await refreshUser();
        router.replace('/dashboard');
      } else {
        setJoinError(data.message || 'Failed to accept invitation');
      }
    } catch {
      setJoinError('Network error accepting invitation');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.onboarded) return null;

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col justify-center py-12 px-6 lg:px-8 relative selection:bg-primary-container selection:text-on-primary-container font-body-sm">
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-[900px] h-96 bg-gradient-to-br from-primary-container/20 via-transparent to-secondary/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center relative z-10 animate-fade-in-up">
        <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
          <MantisLogo className="w-10 h-10 group-hover:scale-105 transition-transform" size={40} />
          <span className="font-display-lg text-2xl font-bold tracking-tighter text-on-surface">
            Mantis
          </span>
        </Link>
        <h1 className="font-display-lg text-3xl font-bold tracking-tight text-on-surface">
          Welcome, {user.display_name.split(' ')[0]}!
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant max-w-md mx-auto">
          Choose whether to launch your own workspace as an administrator or join an existing team.
        </p>
      </div>

      {/* Main Mode Selector Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-3xl relative z-10 animate-fade-in-up delay-100 space-y-6">
        {/* Toggle Pills */}
        <div className="flex p-1.5 rounded-2xl bg-surface-container border border-outline-variant/30 max-w-md mx-auto shadow-inner">
          <button
            type="button"
            onClick={() => setSelectedMode('create')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold font-label-caps uppercase transition flex items-center justify-center gap-2 cursor-pointer ${
              selectedMode === 'create'
                ? 'bg-surface-container-lowest text-primary shadow-sm border border-outline-variant/20'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">add_business</span>
            Create New Team
          </button>
          <button
            type="button"
            onClick={() => setSelectedMode('join')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold font-label-caps uppercase transition flex items-center justify-center gap-2 cursor-pointer relative ${
              selectedMode === 'join'
                ? 'bg-surface-container-lowest text-primary shadow-sm border border-outline-variant/20'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">group_add</span>
            Join Existing Team
            {detectedInvites.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Card Content based on Mode */}
        {selectedMode === 'create' ? (
          /* Create Team Card */
          <div className="glass-panel bg-surface-container/80 border border-outline-variant/30 rounded-2xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
            <div className="flex items-start gap-4 border-b border-outline-variant/20 pb-5">
              <div className="w-12 h-12 rounded-2xl bg-primary-container text-on-primary-container font-bold flex items-center justify-center text-xl shrink-0 shadow-md">
                <span className="material-symbols-outlined text-[24px]">shield_person</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-on-surface">Launch a New Team Workspace</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  You will become the <span className="font-bold text-primary">Root Administrator</span> with full governance over team members, security embargoes, and project taxonomy.
                </p>
              </div>
            </div>

            {createError && (
              <div className="p-3.5 rounded-xl bg-error-container text-on-error-container border border-error/20 text-xs font-semibold">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5 font-label-caps uppercase">
                  Team / Company Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Acme Corporation, Apollo Labs"
                  maxLength={255}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5 font-label-caps uppercase">
                  First Software Product / Repository <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Mobile App, Backend API, Storefront"
                  maxLength={64}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                />
                <p className="text-[11px] text-on-surface-variant/70 mt-1">
                  We will automatically configure initial engineering components (<span className="font-mono">General UI</span>, <span className="font-mono">Core Engine</span>, <span className="font-mono">Networking</span>) for this product.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5 font-label-caps uppercase">
                  Product Description <span className="text-[10px] text-on-surface-variant font-normal lowercase">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={productDesc}
                  onChange={(e) => setProductDesc(e.target.value)}
                  placeholder="Brief summary of this product"
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={creating || !teamName.trim() || !productName.trim()}
                  className="w-full py-3.5 px-4 rounded-xl bg-primary text-on-primary font-bold font-label-caps uppercase text-xs hover:opacity-90 disabled:opacity-50 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                  {creating ? 'Setting Up Workspace...' : 'Launch Team & Enter Dashboard'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Join Team Card */
          <div className="glass-panel bg-surface-container/80 border border-outline-variant/30 rounded-2xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
            <div className="flex items-start gap-4 border-b border-outline-variant/20 pb-5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xl shrink-0 shadow-md">
                <span className="material-symbols-outlined text-[24px]">group</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-on-surface">Join an Existing Team</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Join a workspace created by your administrator with your pre-allotted team roles.
                </p>
              </div>
            </div>

            {joinError && (
              <div className="p-3.5 rounded-xl bg-error-container text-on-error-container border border-error/20 text-xs font-semibold">
                {joinError}
              </div>
            )}

            {/* Auto-detected pending invites section */}
            {loadingInvites ? (
              <div className="flex items-center gap-2 text-xs text-on-surface-variant py-4 justify-center">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Checking for invitations sent to {user.email}...
              </div>
            ) : detectedInvites.length > 0 ? (
              <div className="space-y-3">
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 font-label-caps uppercase flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">mark_email_read</span>
                  Invitation Found for Your Email!
                </div>
                {detectedInvites.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-on-surface text-sm">
                        {inv.team_name}
                      </div>
                      <div className="text-on-surface-variant text-[11px] mt-0.5">
                        Invited by <strong className="text-on-surface">{inv.invited_by}</strong> as{' '}
                        <span className="font-semibold text-primary">
                          {inv.is_admin ? 'Administrator & ' : ''}{inv.groups.join(', ') || 'Member'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAcceptInvite(inv.token)}
                      disabled={joining}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase font-label-caps flex items-center justify-center gap-1.5 transition shadow-sm shrink-0 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      {joining ? 'Joining...' : 'Accept & Join Team'}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Manual Token or Link Input */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-on-surface font-label-caps uppercase">
                {detectedInvites.length > 0 ? 'Or enter a different invite code / link:' : 'Paste your invitation code or link:'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteTokenInput}
                  onChange={(e) => setInviteTokenInput(e.target.value)}
                  placeholder="e.g. 7f9a2b... or https://.../invite?token=xyz"
                  className="flex-1 bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-3 text-xs font-mono text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                />
                <button
                  type="button"
                  onClick={() => handleAcceptInvite(inviteTokenInput)}
                  disabled={joining || !inviteTokenInput.trim()}
                  className="px-5 py-3 rounded-xl bg-primary text-on-primary font-bold font-label-caps uppercase text-xs hover:opacity-90 disabled:opacity-50 transition shadow-sm shrink-0 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">login</span>
                  {joining ? 'Joining...' : 'Join'}
                </button>
              </div>
            </div>

            {/* Helper callout */}
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/20 text-xs text-on-surface-variant flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-amber-500 shrink-0 mt-0.5">info</span>
              <div>
                <span className="font-semibold text-on-surface">Need an invitation?</span>
                <p className="mt-0.5 leading-relaxed">
                  Ask your workspace administrator to send you an invite link from <strong className="text-on-surface">Settings → Team &amp; Roles</strong>. Alternatively, switch to <strong className="text-primary cursor-pointer" onClick={() => setSelectedMode('create')}>Create New Team</strong> to start your own organization.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
