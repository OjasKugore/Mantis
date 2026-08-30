'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { MantisLogo } from '@/components/MantisLogo';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface TeamMember {
  id: string;
  email: string;
  display_name: string;
  username: string;
  avatar_url?: string;
  is_admin: boolean;
  is_enabled: boolean;
  priority_rank: number;
  created_at: string;
  groups: string[];
}

interface TeamInvite {
  id: string;
  email?: string;
  token: string;
  is_admin: boolean;
  groups: string[];
  expires_at: string;
  created_at: string;
  invited_by_name?: string;
}

const AVAILABLE_ROLES = [
  { key: 'dev-team', label: 'Developer', color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30', icon: 'code' },
  { key: 'qa-team', label: 'QA Engineer', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30', icon: 'bug_report' },
  { key: 'security-team', label: 'Security Lead', color: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30', icon: 'security' },
];

export default function TeamSettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite Modal / Form State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteIsAdmin, setInviteIsAdmin] = useState(false);
  const [inviteGroups, setInviteGroups] = useState<string[]>(['dev-team']);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Action states
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Redirect guard
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  const loadData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/team/members`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/v1/team/invites`, { credentials: 'include' }),
      ]);

      if (membersRes.ok) {
        const mData = await membersRes.json();
        setMembers(mData.members || []);
      }
      if (invitesRes.ok) {
        const iData = await invitesRes.json();
        setInvites(iData.invites || []);
      }
    } catch {
      setError('Failed to load team members');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (user?.is_admin) {
      loadData();
    }
  }, [user, loadData]);

  // Toggle role for a member
  const handleToggleRole = async (member: TeamMember, roleKey: string) => {
    const isCurrentlyInRole = member.groups.includes(roleKey);
    const newGroups = isCurrentlyInRole
      ? member.groups.filter((g) => g !== roleKey)
      : [...member.groups, roleKey];

    // Optimistic update
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, groups: newGroups } : m))
    );

    setActionInProgress(member.id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/team/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ groups: newGroups }),
      });
      if (!res.ok) {
        // Revert on error
        loadData();
      }
    } catch {
      loadData();
    } finally {
      setActionInProgress(null);
    }
  };

  // Toggle Admin status
  const handleToggleAdmin = async (member: TeamMember) => {
    const newAdmin = !member.is_admin;
    if (!newAdmin && member.id === user?.id) {
      if (!confirm('Are you sure you want to remove your own Admin privileges? You will lose access to team settings.')) {
        return;
      }
    }

    // Optimistic update
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, is_admin: newAdmin } : m))
    );

    setActionInProgress(member.id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/team/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_admin: newAdmin }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Failed to update admin role');
        loadData();
      }
    } catch {
      loadData();
    } finally {
      setActionInProgress(null);
    }
  };

  // Move member rank up or down
  const handleMoveRank = async (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === members.length - 1)) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newMembers = [...members];
    const temp = newMembers[index];
    newMembers[index] = newMembers[targetIndex];
    newMembers[targetIndex] = temp;

    setMembers(newMembers);

    try {
      await fetch(`${API_BASE}/api/v1/team/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ member_ids: newMembers.map((m) => m.id) }),
      });
    } catch {
      loadData();
    }
  };

  // Deactivate member
  const handleDeactivateMember = async (member: TeamMember) => {
    if (!confirm(`Deactivate account for ${member.display_name}? They will no longer be able to log in.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/v1/team/members/${member.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== member.id));
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to deactivate member');
      }
    } catch {
      alert('Network error');
    }
  };

  // Create Invite
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingInvite(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/team/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: inviteEmail.trim() || undefined,
          is_admin: inviteIsAdmin,
          groups: inviteGroups,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.direct_assigned) {
          alert(data.message);
          setInviteModalOpen(false);
          setInviteEmail('');
          loadData();
        } else {
          setGeneratedLink(data.invite_url);
          loadData();
        }
      } else {
        setError(data.message || 'Failed to generate invite');
      }
    } catch {
      setError('Network error generating invite');
    } finally {
      setGeneratingInvite(false);
    }
  };

  // Revoke invite
  const handleRevokeInvite = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/team/invites/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setInvites((prev) => prev.filter((inv) => inv.id !== id));
      }
    } catch {
      alert('Failed to revoke invite');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (!user.is_admin) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-md bg-surface-container p-8 rounded-2xl border border-outline-variant/30 shadow-xl">
          <span className="material-symbols-outlined text-6xl text-error">admin_panel_settings</span>
          <h1 className="text-2xl font-bold text-on-surface">Administrator Access Required</h1>
          <p className="text-on-surface-variant text-sm">
            Only workspace administrators have authority to view members, invite new users, and allot team permissions.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold shadow-sm">
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body-md antialiased">
      {/* Top Header */}
      <header className="border-b border-outline-variant/20 bg-surface-container/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-on-surface-variant hover:text-primary transition-colors p-1">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </Link>
            <MantisLogo size={28} />
            <div>
              <h1 className="font-bold text-on-surface text-base leading-tight">Workspace Governance &amp; Settings</h1>
              <p className="text-xs text-on-surface-variant">Team RBAC permissions, member escalation, and invite tokens</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setInviteModalOpen(true);
              setGeneratedLink(null);
              setInviteEmail('');
            }}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold font-label-caps uppercase flex items-center gap-1.5 hover:opacity-90 shadow-md transition"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            Invite Member
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="max-w-5xl mx-auto px-6 flex gap-6 border-t border-outline-variant/10 text-xs font-bold font-label-caps uppercase">
          <Link
            href="/settings/products"
            className="py-3 border-b-2 border-transparent text-on-surface-variant hover:text-primary transition"
          >
            Products &amp; Components
          </Link>
          <Link
            href="/settings/team"
            className="py-3 border-b-2 border-primary text-primary flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">group</span>
            Team &amp; Roles
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Pending Invites Section */}
        {invites.length > 0 && (
          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-on-surface text-sm uppercase tracking-wider font-label-caps flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-[18px]">mark_email_unread</span>
              Pending Invitations ({invites.length})
            </h2>
            <div className="divide-y divide-outline-variant/20">
              {invites.map((inv) => (
                <div key={inv.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-on-surface flex items-center gap-2">
                      <span>{inv.email || 'Shareable Open Link'}</span>
                      {inv.is_admin && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold border border-rose-500/20 font-mono text-[10px]">
                          Admin Invite
                        </span>
                      )}
                    </div>
                    <div className="text-on-surface-variant text-[11px] mt-0.5 flex items-center gap-2">
                      <span>Roles: {inv.groups.join(', ') || 'Developer'}</span>
                      <span>•</span>
                      <span>Expires in {Math.ceil((new Date(inv.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`${typeof window !== 'undefined' ? window.location.origin : ''}/invite?token=${inv.token}`)}
                      className="px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/40 hover:border-primary text-on-surface font-semibold flex items-center gap-1.5 transition"
                    >
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      Copy Link
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevokeInvite(inv.id)}
                      className="px-3 py-1.5 rounded-lg text-error hover:bg-error-container/30 font-semibold transition"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Workspace Members Table */}
        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-on-surface text-sm uppercase tracking-wider font-label-caps flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">manage_accounts</span>
                Active Workspace Members ({members.length})
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Use the <span className="font-bold">▲ / ▼</span> arrows to arrange triage escalation ranking. Click any role badge to toggle permissions in real-time.
              </p>
            </div>
          </div>

          {loadingData ? (
            <div className="flex items-center gap-3 py-12 justify-center text-on-surface-variant text-sm">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Loading team directory...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/20 text-on-surface-variant font-label-caps uppercase text-[11px]">
                    <th className="py-3 px-2 w-16 text-center">Rank</th>
                    <th className="py-3 px-3">Member</th>
                    <th className="py-3 px-3">Role &amp; Team Allotments</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {members.map((member, index) => (
                    <tr key={member.id} className="hover:bg-surface-container/30 transition group">
                      {/* Priority Rank / Reorder Controls */}
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono font-bold text-on-surface-variant w-5 text-center">
                            #{index + 1}
                          </span>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveRank(index, 'up')}
                              className="text-on-surface-variant hover:text-primary disabled:opacity-20 p-0.5 rounded transition"
                              title="Move up in escalation priority"
                            >
                              <span className="material-symbols-outlined text-[14px]">arrow_drop_up</span>
                            </button>
                            <button
                              type="button"
                              disabled={index === members.length - 1}
                              onClick={() => handleMoveRank(index, 'down')}
                              className="text-on-surface-variant hover:text-primary disabled:opacity-20 p-0.5 rounded transition"
                              title="Move down in escalation priority"
                            >
                              <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Member Info */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                            {member.display_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-on-surface truncate flex items-center gap-2">
                              <span>{member.display_name}</span>
                              {member.id === user.id && (
                                <span className="text-[10px] bg-surface-container px-1.5 py-0.2 rounded text-primary font-mono font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-on-surface-variant text-[11px] font-mono truncate">{member.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Interactive Role Badges */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Admin Badge */}
                          <button
                            type="button"
                            onClick={() => handleToggleAdmin(member)}
                            disabled={actionInProgress === member.id}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                              member.is_admin
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 shadow-xs'
                                : 'bg-surface-container/50 text-on-surface-variant/40 border-outline-variant/20 hover:border-amber-500/40 hover:text-amber-600'
                            }`}
                            title={member.is_admin ? 'Admin active (click to demote)' : 'Click to grant Admin privileges'}
                          >
                            <span className="material-symbols-outlined text-[14px]">shield_person</span>
                            Admin
                          </button>

                          {/* Team Group Badges */}
                          {AVAILABLE_ROLES.map((r) => {
                            const hasRole = member.groups.includes(r.key);
                            return (
                              <button
                                key={r.key}
                                type="button"
                                onClick={() => handleToggleRole(member, r.key)}
                                disabled={actionInProgress === member.id}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                                  hasRole
                                    ? `${r.color} shadow-xs`
                                    : 'bg-surface-container/50 text-on-surface-variant/40 border-outline-variant/20 hover:border-primary/40 hover:text-primary'
                                }`}
                                title={hasRole ? `Remove from ${r.label}` : `Add to ${r.label}`}
                              >
                                <span className="material-symbols-outlined text-[14px]">{r.icon}</span>
                                {r.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        {member.id !== user.id && (
                          <button
                            type="button"
                            onClick={() => handleDeactivateMember(member)}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/30 transition opacity-0 group-hover:opacity-100"
                            title="Deactivate member"
                          >
                            <span className="material-symbols-outlined text-[18px]">person_off</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Roles & Authority Guide */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs font-label-caps uppercase">
              <span className="material-symbols-outlined text-[18px]">code</span>
              Developer Team
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Authority to transition bug statuses to <span className="font-mono">IN_PROGRESS</span> and <span className="font-mono">RESOLVED</span>, author patch attachments, and grant formal <span className="font-mono">review+</span> code gates.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs font-label-caps uppercase">
              <span className="material-symbols-outlined text-[18px]">bug_report</span>
              QA Automation Team
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Authority to verify fixes into <span className="font-mono">VERIFIED</span>, manage reproduction test harnesses, tag regression keywords, and issue diagnostic <span className="font-mono">needinfo?</span> flags.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-2">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-xs font-label-caps uppercase">
              <span className="material-symbols-outlined text-[18px]">security</span>
              Security Response Team
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Zero-leakage quarantine access to embargoed zero-day vulnerabilities, FIRST.org CVSS v4.0 calculator scoring, and 90-day embargo timeline control.
            </p>
          </div>
        </section>
      </main>

      {/* Invite Member Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person_add</span>
                <h3 className="font-bold text-base text-on-surface">Invite to Workspace</h3>
              </div>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs font-semibold">
                {error}
              </div>
            )}

            {generatedLink ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-sm">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Invite Link Ready
                  </div>
                  <p>Share this link with your teammate. When they open it, they will automatically join with the preset roles.</p>
                </div>

                <div className="flex gap-2">
                  <input
                    readOnly
                    value={generatedLink}
                    className="flex-1 bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-xs font-mono text-on-surface select-all"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedLink)}
                    className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGeneratedLink(null);
                      setInviteEmail('');
                    }}
                    className="w-full py-2.5 rounded-lg border border-outline-variant text-xs font-bold hover:bg-surface-container transition"
                  >
                    Generate Another Invite
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateInvite} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1 font-label-caps uppercase">
                    Recipient Email <span className="text-[10px] text-on-surface-variant lowercase font-normal">(Optional — leave blank for shareable open link)</span>
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                  />
                </div>

                {/* Role selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface font-label-caps uppercase">
                    Pre-Allotted Teams &amp; Permissions
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {/* Admin Checkbox */}
                    <label className="flex items-center gap-3 p-3 rounded-xl border border-outline-variant/30 hover:bg-surface-container/50 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={inviteIsAdmin}
                        onChange={(e) => setInviteIsAdmin(e.target.checked)}
                        className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4"
                      />
                      <div>
                        <div className="font-bold text-xs text-on-surface flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-amber-500">shield_person</span>
                          Workspace Administrator
                        </div>
                        <div className="text-[11px] text-on-surface-variant">Full authority to invite, reorder, and configure products</div>
                      </div>
                    </label>

                    {/* Team Checkboxes */}
                    {AVAILABLE_ROLES.map((r) => {
                      const checked = inviteGroups.includes(r.key);
                      return (
                        <label key={r.key} className="flex items-center gap-3 p-3 rounded-xl border border-outline-variant/30 hover:bg-surface-container/50 cursor-pointer transition">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setInviteGroups([...inviteGroups, r.key]);
                              } else {
                                setInviteGroups(inviteGroups.filter((g) => g !== r.key));
                              }
                            }}
                            className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4"
                          />
                          <div>
                            <div className="font-bold text-xs text-on-surface flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">{r.icon}</span>
                              {r.label}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(false)}
                    className="px-4 py-2.5 rounded-lg border border-outline-variant text-xs font-bold hover:bg-surface-container transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generatingInvite || (!inviteIsAdmin && inviteGroups.length === 0)}
                    className="px-5 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-bold font-label-caps uppercase hover:opacity-90 disabled:opacity-50 transition shadow-sm flex items-center gap-2"
                  >
                    {generatingInvite ? 'Generating...' : 'Create Invite Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
