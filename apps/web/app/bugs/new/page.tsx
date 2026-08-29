'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bug, BugPriority, BugSeverity } from '@mantis/shared';
import { NotificationBell } from '@/components/NotificationBell';
import { CvssModal } from '@/components/CvssModal';
import { useAuth, SEED_PERSONAS } from '@/lib/auth-context';
import { MantisLogo } from '@/components/MantisLogo';
import { ProfileDropdown } from '@/components/ProfileDropdown';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function NewBugPage() {
  const router = useRouter();
  const profileRef = useRef<HTMLDivElement>(null);
  const { user, quickLogin, logout } = useAuth();
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [productId, setProductId] = useState<number>(1);
  const [componentId, setComponentId] = useState<number>(1);
  const [priority, setPriority] = useState<BugPriority>('P3');
  const [severity, setSeverity] = useState<BugSeverity>('normal');
  const [isEmbargoed, setIsEmbargoed] = useState(false);
  const [cvssScore, setCvssScore] = useState<number | null>(null);
  const [cvssVector, setCvssVector] = useState<string | null>(null);
  const [cvssSeverity, setCvssSeverity] = useState<string | null>(null);
  const [showCvssModal, setShowCvssModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  const handleLogout = async () => {
    await logout();
    setProfileDropdownOpen(false);
    router.push('/');
  };

  const [duplicates, setDuplicates] = useState<Bug[]>([]);
  const [isSearchingDups, setIsSearchingDups] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced duplicate detection
  useEffect(() => {
    if (summary.trim().length < 10) {
      setDuplicates([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingDups(true);
      try {
        const res = await fetch(`${API_BASE}/api/v1/bugs/duplicates?q=${encodeURIComponent(summary)}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setDuplicates(data.duplicates || []);
        }
      } catch (err) {
        console.error('Duplicate search failed', err);
      } finally {
        setIsSearchingDups(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [summary]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/bugs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          summary,
          description,
          product_id: productId,
          component_id: componentId,
          priority,
          severity,
          is_embargoed: isEmbargoed,
          cvss_score: cvssScore,
          cvss_vector: cvssVector,
          cvss_severity: cvssSeverity,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/bugs/${data.id}`);
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to file bug');
      }
    } catch {
      setError('Network error filing bug');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body-md antialiased min-h-screen flex selection:bg-primary-container selection:text-on-primary-container">
      {/* SideNavBar */}
      <aside
        className={`h-screen ${
          sidebarOpen ? 'w-64' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'
        } fixed left-0 top-0 bg-surface-container-low shadow-sm flex flex-col border-r border-outline-variant/30 z-50 transition-all duration-300 overflow-hidden`}
        id="sidebar"
      >
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3">
            <MantisLogo className="w-8 h-8 rounded-lg shadow-sm shrink-0" size={32} />
            {sidebarOpen && (
              <div>
                <h1 className="font-headline-sm text-headline-sm font-bold text-primary leading-none text-xl">
                  Mantis
                </h1>
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mt-1 opacity-80">
                  Bug Monitoring
                </p>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-xl group"
          >
            <span className="material-symbols-outlined">dashboard</span>
            {sidebarOpen && <span className="font-body-md text-body-md">Dashboard</span>}
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-xl group"
          >
            <span className="material-symbols-outlined">list_alt</span>
            {sidebarOpen && <span className="font-body-md text-body-md">Bug Queue</span>}
          </Link>

          <Link
            href="/kanban"
            className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-xl group"
          >
            <span className="material-symbols-outlined">view_kanban</span>
            {sidebarOpen && <span className="font-body-md text-body-md">Kanban Board</span>}
          </Link>

          <Link
            href="/bugs/24/graph"
            className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-xl group"
          >
            <span className="material-symbols-outlined">hub</span>
            {sidebarOpen && <span className="font-body-md text-body-md">Dependency Graph</span>}
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-xl group"
          >
            <span className="material-symbols-outlined">gavel</span>
            {sidebarOpen && <span className="font-body-md text-body-md">Governance</span>}
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main
        className={`flex-1 ${
          sidebarOpen ? 'ml-64' : 'ml-0 md:ml-20'
        } flex flex-col min-h-screen transition-all duration-300`}
      >
        {/* TopNavBar */}
        <header className="bg-background border-b border-outline-variant/20 top-0 sticky z-40">
          <div className="flex justify-between items-center h-16 px-6 w-full max-w-max-width mx-auto">
            <div className="flex items-center gap-3 text-on-surface-variant font-body-sm text-body-sm">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center p-1 rounded-md hover:bg-surface-container"
                title="Toggle Sidebar"
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              <Link className="flex items-center gap-1 hover:text-primary transition-colors font-medium" href="/dashboard">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Dashboard
              </Link>
              <span className="text-outline-variant">/</span>
              <span className="text-on-surface font-medium">File a Bug</span>
            </div>

            <div className="flex items-center gap-4 relative">
              {/* User profile dropdown trigger */}
              {/* Profile Dropdown */}
              <div ref={profileRef}>
                <div
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-surface-container-high border border-outline-variant/30 text-sm cursor-pointer hover:ring-2 ring-primary/30 transition-all"
                >
                  <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs">
                    {user ? user.display_name.charAt(0).toUpperCase() : 'G'}
                  </span>
                  <span className="font-body-sm text-body-sm font-medium text-on-surface">
                    {user ? user.display_name : 'Guest User'}
                  </span>
                  <span className="bg-primary-container text-on-primary-container px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                    {user?.is_admin ? 'Admin' : 'Dev'}
                  </span>
                  <span className="material-symbols-outlined text-sm text-outline">expand_more</span>
                </div>
              </div>

              {profileDropdownOpen && (
                <ProfileDropdown
                  user={user}
                  triggerRef={profileRef}
                  onClose={() => setProfileDropdownOpen(false)}
                  onPersonaSwitch={quickLogin}
                  onLogout={handleLogout}
                />
              )}

              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Form Canvas */}
        <div className="flex-1 p-8 md:p-12 max-w-4xl mx-auto w-full">
          <div className="mb-10">
            <h1 className="font-display-lg text-display-lg text-on-surface mb-2 font-bold tracking-tight">
              Report a New Defect
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Please provide as much detail as possible to help triagers and engineers reproduce the issue.
            </p>
          </div>

          {/* Unauthenticated Quick Login Helper Banner */}
          {!user && (
            <div className="mb-8 p-5 rounded-2xl bg-surface-container-high border border-outline-variant/30 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">bolt</span>
                  <span className="text-sm font-bold text-on-surface font-headline-sm">
                    Authentication Required to File Bugs
                  </span>
                </div>
                <Link href="/login" className="text-xs text-primary hover:underline font-bold font-label-caps uppercase">
                  Go to Login Page →
                </Link>
              </div>
              <p className="text-xs text-on-surface-variant">
                Select an instant 1-click persona below or log in with your credentials to submit:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {SEED_PERSONAS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => quickLogin(p.key)}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 hover:border-primary hover:bg-primary-container/10 text-xs font-semibold text-on-surface transition flex items-center gap-2 shadow-sm"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-tr ${p.avatarColor}`} />
                    <span>{p.name}</span>
                    <span className="text-[10px] text-on-surface-variant font-mono">{p.badge}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-error-container text-on-error-container border border-error/20 text-sm font-semibold">
              {error}
            </div>
          )}

          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/20 p-8 md:p-10 space-y-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Summary */}
              <div className="space-y-2">
                <label className="block font-body-md text-body-md font-medium text-on-surface" htmlFor="summary">
                  Summary
                </label>
                <input
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none placeholder:text-outline"
                  id="summary"
                  required
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="e.g., Crash on startup when using specific proxy configuration"
                  type="text"
                />
              </div>

              {/* Debounced Duplicate Detection Radar */}
              {summary.trim().length >= 10 && (
                <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-4 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-caps flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">radar</span>
                      Duplicate Detection Radar
                    </h3>
                    {isSearchingDups && (
                      <span className="text-xs text-primary flex items-center gap-2 font-medium">
                        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Scanning master dataset...
                      </span>
                    )}
                  </div>

                  {!isSearchingDups && duplicates.length > 0 ? (
                    <ul className="space-y-2">
                      {duplicates.map((dup) => (
                        <li
                          key={dup.id}
                          className="text-sm flex gap-3 items-start bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/30 shadow-xs"
                        >
                          <span className="text-primary font-mono text-xs mt-0.5 font-bold">#{dup.id}</span>
                          <div className="flex-1">
                            <Link
                              href={`/bugs/${dup.id}`}
                              target="_blank"
                              className="text-on-surface hover:text-primary font-semibold block transition-colors"
                            >
                              {dup.summary}
                            </Link>
                            <span className="text-xs text-on-surface-variant font-medium">Status: {dup.status}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : !isSearchingDups ? (
                    <p className="text-xs text-primary font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      No apparent duplicates found in PostgreSQL database. You are good to go!
                    </p>
                  ) : null}
                </div>
              )}

              {/* Product & Component Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block font-body-md text-body-md font-medium text-on-surface" htmlFor="product">
                    Product
                  </label>
                  <div className="relative">
                    <select
                      value={productId}
                      onChange={(e) => setProductId(Number(e.target.value))}
                      className="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 pr-10 font-body-md text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      id="product"
                    >
                      <option value={1}>Firefox</option>
                      <option value={2}>Thunderbird</option>
                      <option value={3}>Core</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block font-body-md text-body-md font-medium text-on-surface" htmlFor="component">
                    Component
                  </label>
                  <div className="relative">
                    <select
                      value={componentId}
                      onChange={(e) => setComponentId(Number(e.target.value))}
                      className="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 pr-10 font-body-md text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      id="component"
                    >
                      <option value={1}>Networking</option>
                      <option value={2}>DOM &amp; Core</option>
                      <option value={3}>JavaScript Engine</option>
                      <option value={4}>Storage &amp; IndexedDB</option>
                      <option value={5}>Mail &amp; Compose</option>
                      <option value={6}>Calendar</option>
                      <option value={7}>General UI</option>
                      <option value={8}>Security</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>

              {/* Priority & Severity Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block font-body-md text-body-md font-medium text-on-surface" htmlFor="priority">
                    Priority
                  </label>
                  <div className="relative">
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as BugPriority)}
                      className="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 pr-10 font-body-md text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      id="priority"
                    >
                      <option value="P1">P1 (Critical)</option>
                      <option value="P2">P2 (High)</option>
                      <option value="P3">P3 (Normal)</option>
                      <option value="P4">P4 (Low)</option>
                      <option value="P5">P5 (Enhancement)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block font-body-md text-body-md font-medium text-on-surface" htmlFor="severity">
                    Severity
                  </label>
                  <div className="relative">
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as BugSeverity)}
                      className="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 pr-10 font-body-md text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      id="severity"
                    >
                      <option value="blocker">Blocker</option>
                      <option value="critical">Critical</option>
                      <option value="major">Major</option>
                      <option value="normal">Normal</option>
                      <option value="minor">Minor</option>
                      <option value="trivial">Trivial</option>
                      <option value="enhancement">Enhancement</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Toggle */}
              <div
                className="bg-error-container/20 border border-error/30 rounded-xl p-5 flex items-center gap-4 transition-colors hover:bg-error-container/30 cursor-pointer"
                onClick={() => setIsEmbargoed(!isEmbargoed)}
              >
                <div className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      className="w-5 h-5 rounded border-error/50 text-error focus:ring-error focus:ring-offset-0 bg-surface-container-lowest cursor-pointer"
                      id="security_toggle"
                      checked={isEmbargoed}
                      onChange={(e) => setIsEmbargoed(e.target.checked)}
                      type="checkbox"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="font-body-md text-body-md font-medium text-error cursor-pointer select-none" htmlFor="security_toggle">
                    Restrict as Security Bug (Zero-Leakage Embargo)
                  </label>
                  <p className="text-xs text-on-surface-variant/70 mt-0.5">
                    Automatically applies 90-day embargo and isolates visibility to security-team members.
                  </p>
                </div>
              </div>

              {/* CVSS v4.0 Vulnerability Score Card */}
              <div className="bg-surface-container-low border border-outline-variant/50 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">calculate</span>
                    <label className="font-body-md text-body-md font-bold text-on-surface">
                      CVSS v4.0 Vulnerability Score (Optional)
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCvssModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary-container font-label-caps text-xs uppercase font-bold hover:bg-opacity-90 transition shadow-sm"
                  >
                    {cvssScore ? 'Recalculate Score →' : 'Launch CVSS Calculator →'}
                  </button>
                </div>

                {cvssScore ? (
                  <div className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/40 flex items-center justify-between animate-fade-in">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-extrabold font-mono text-primary">
                          {cvssScore.toFixed(1)}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-error-container text-error">
                          {cvssSeverity || 'HIGH'}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-on-surface-variant/80 truncate max-w-md">
                        {cvssVector}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCvssScore(null);
                        setCvssVector(null);
                        setCvssSeverity(null);
                      }}
                      className="text-xs text-on-surface-variant hover:text-error transition"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-on-surface-variant/70">
                    Calculate vulnerability MacroVectors (Attack Vector, Complexity, Impact) to automatically attach CVSS severity ratings to this defect.
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="block font-body-md text-body-md font-medium text-on-surface" htmlFor="description">
                  Description (Steps to Reproduce)
                </label>
                <textarea
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 font-label-code text-label-code text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none placeholder:text-outline resize-y"
                  id="description"
                  required
                  rows={8}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="1. Navigate to...&#10;2. Click on...&#10;3. Observe..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end pt-4 border-t border-outline-variant/20">
                <button
                  type="submit"
                  disabled={isSubmitting || !summary.trim() || !description.trim()}
                  className="bg-primary text-on-primary px-8 py-3 rounded-xl font-body-md text-body-md font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {isSubmitting ? 'Submitting Bug Report...' : 'Submit Bug Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* CVSS Modal */}
      {showCvssModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/20 backdrop-blur-sm p-4">
          <CvssModal
            onClose={() => setShowCvssModal(false)}
            onApplyScore={(score, vector, severity) => {
              setCvssScore(score);
              setCvssVector(vector);
              setCvssSeverity(severity);
              if (score >= 7.0) {
                setIsEmbargoed(true);
                setPriority('P1');
                setSeverity('critical');
              }
              setShowCvssModal(false);
            }}
          />
        </div>
      )}
    </div>
  );
}


