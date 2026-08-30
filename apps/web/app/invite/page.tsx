'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { MantisLogo } from '@/components/MantisLogo';
import { OAuthButtons } from '@/components/OAuthButtons';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface InviteData {
  id: string;
  email?: string;
  is_admin: boolean;
  groups: string[];
  invited_by: string;
  expires_at: string;
}

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invitation token was provided in the link.');
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/v1/team/invites/validate?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setInvite(data.invite);
        } else {
          setError(data.message || 'Invitation is invalid or has expired.');
        }
      })
      .catch(() => setError('Failed to validate invitation link.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/team/invites/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok) {
        setAcceptSuccess(true);
        await refreshUser();
        setTimeout(() => {
          router.push('/dashboard');
        }, 1200);
      } else {
        setError(data.message || 'Failed to accept invitation');
      }
    } catch {
      setError('Network error accepting invite');
    } finally {
      setAccepting(false);
    }
  };

  const handleOAuthLogin = (provider: 'github' | 'google') => {
    window.location.href = `${API_BASE}/api/v1/oauth/${provider}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-on-surface-variant">Validating team invitation token...</p>
        </div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface-container border border-outline-variant/30 rounded-2xl p-8 shadow-xl text-center space-y-4">
          <span className="material-symbols-outlined text-5xl text-error">link_off</span>
          <h1 className="text-xl font-bold text-on-surface">Invitation Unavailable</h1>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {error || 'This invitation link is invalid, has expired, or has already been accepted.'}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold font-label-caps uppercase shadow-md hover:opacity-90 transition"
            >
              ← Back to Mantis Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col justify-center py-12 px-6 lg:px-8 relative selection:bg-primary-container selection:text-on-primary-container font-body-sm">
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-96 bg-gradient-to-br from-primary-container/20 via-transparent to-secondary/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 animate-fade-in-up">
        <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
          <MantisLogo className="w-10 h-10 group-hover:scale-105 transition-transform" size={40} />
          <span className="font-display-lg text-2xl font-bold tracking-tighter text-on-surface">
            Mantis
          </span>
        </Link>
        <h1 className="font-display-lg text-3xl font-bold tracking-tight text-on-surface">
          You&apos;ve Been Invited
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Invited by <strong className="text-on-surface">{invite.invited_by}</strong> to join the Mantis Workspace.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg relative z-10 animate-fade-in-up delay-100">
        <div className="glass-panel bg-surface-container/80 border border-outline-variant/30 rounded-2xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Pre-allotted Roles Card */}
          <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-3">
            <div className="text-[11px] font-bold text-on-surface-variant font-label-caps uppercase tracking-wider">
              Your Pre-Allotted Roles &amp; Permissions:
            </div>
            <div className="flex flex-wrap gap-2">
              {invite.is_admin && (
                <span className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30 text-xs flex items-center gap-1.5 shadow-xs">
                  <span className="material-symbols-outlined text-[16px]">shield_person</span>
                  Workspace Administrator
                </span>
              )}
              {invite.groups.map((g) => (
                <span
                  key={g}
                  className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary-container font-bold border border-primary/20 text-xs flex items-center gap-1.5 shadow-xs capitalize"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {g === 'security-team' ? 'security' : g === 'qa-team' ? 'bug_report' : 'code'}
                  </span>
                  {g.replace('-team', ' Team')}
                </span>
              ))}
            </div>
          </div>

          {acceptSuccess ? (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-bold text-center flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              Invitation accepted! Redirecting to your workspace...
            </div>
          ) : user ? (
            /* Logged in state — 1-click accept */
            <div className="space-y-4">
              <div className="text-xs text-on-surface-variant">
                You are currently signed in as <strong className="text-on-surface font-mono">{user.email}</strong>.
              </div>
              <button
                type="button"
                onClick={handleAccept}
                disabled={accepting}
                className="w-full py-3.5 px-4 rounded-xl bg-primary text-on-primary text-xs font-bold font-label-caps uppercase hover:opacity-90 disabled:opacity-50 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                {accepting ? 'Joining Team...' : 'Accept Invitation & Enter Dashboard'}
              </button>
            </div>
          ) : (
            /* Logged out state — sign up or log in to claim */
            <div className="space-y-6">
              <div>
                <p className="text-xs text-on-surface-variant mb-4 text-center">
                  Sign in or create a free account to join the workspace with these roles:
                </p>
                <OAuthButtons onLogin={handleOAuthLogin} mode="signup" />
              </div>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-outline-variant/30 w-full" />
                <span className="bg-surface-container px-3 text-[11px] font-label-caps uppercase font-bold text-on-surface-variant tracking-wider absolute">
                  Or with email
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Link
                  href={`/signup?invite_token=${token}${invite.email ? `&email=${encodeURIComponent(invite.email)}` : ''}`}
                  className="py-3 px-4 rounded-xl bg-primary-container text-on-primary-container text-center font-bold text-xs font-label-caps uppercase hover:opacity-90 transition shadow-sm"
                >
                  Create Account
                </Link>
                <Link
                  href={`/login?invite_token=${token}`}
                  className="py-3 px-4 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface text-center font-bold text-xs font-label-caps uppercase hover:border-primary transition"
                >
                  Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <InviteContent />
    </Suspense>
  );
}
