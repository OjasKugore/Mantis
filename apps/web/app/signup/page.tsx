import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, isDemoUser } from '@/lib/auth-context';
import { MantisLogo } from '@/components/MantisLogo';
import { OAuthButtons } from '@/components/OAuthButtons';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite_token') || searchParams.get('invite') || '';
  const initialEmail = searchParams.get('email') || '';

  const { user, loading, signup } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [initialEmail, email]);

  // Redirect already-logged-in users
  useEffect(() => {
    if (!loading && user) {
      if (user.onboarded || isDemoUser(user)) {
        router.replace('/dashboard');
      } else {
        router.replace('/onboarding');
      }
    }
  }, [user, loading, router]);

  const handleOAuthSignup = (provider: 'github' | 'google') => {
    window.location.href = `${apiBase}/api/v1/oauth/${provider}`;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !displayName.trim()) return;

    // Client-side username validation
    if (username && !/^[a-zA-Z0-9_]{2,64}$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores (2–64 characters)');
      return;
    }

    setSubmitting(true);
    setError(null);
    setErrorCode(null);

    const res = await signup({
      email: email.trim().toLowerCase(),
      password,
      display_name: displayName.trim(),
      username: username.trim() || undefined,
      invite_token: inviteToken || undefined,
    });
    setSubmitting(false);

    if (res.success) {
      if (inviteToken) {
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }
    } else {
      // Parse the specific error code from the API message to give a better UX hint
      const code = (res as any).code || '';
      setErrorCode(code);
      setError(res.error || 'Failed to create account');
    }
  };

  // Show nothing while checking auth state (avoids flash)
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Already logged in — redirect handled by useEffect
  if (user) return null;

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col justify-center py-12 px-6 lg:px-8 relative selection:bg-primary-container selection:text-on-primary-container font-body-sm">
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-96 bg-gradient-to-br from-primary-container/20 via-transparent to-secondary/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 animate-fade-in-up">
        <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
          <MantisLogo className="w-10 h-10 group-hover:scale-105 transition-transform" size={40} />
          <span className="font-display-lg text-2xl font-bold tracking-tighter text-on-surface">
            Mantis
          </span>
        </Link>
        <h1 className="font-display-lg text-3xl font-bold tracking-tight text-on-surface">
          Create your Mantis workspace
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Already registered?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline transition">
            Sign in to existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 animate-fade-in-up delay-100">
        <div className="glass-panel bg-surface-container/70 border border-outline-variant/30 rounded-2xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
          {/* OAuth Buttons Section */}
          <OAuthButtons onLogin={handleOAuthSignup} mode="signup" />

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-outline-variant/30 w-full" />
            <span className="bg-surface-container px-3 text-[11px] font-label-caps uppercase font-bold text-on-surface-variant tracking-wider absolute">
              Or with work email
            </span>
          </div>

          {/* Error display with smart actionable hints */}
          {error && (
            <div className="p-3 rounded-lg bg-error-container text-on-error-container border border-error/20 text-xs font-semibold space-y-1">
              <p>{error}</p>
              {error.toLowerCase().includes('email already exists') && (
                <p className="font-normal">
                  <Link href="/login" className="underline font-bold hover:opacity-80">
                    Sign in to your existing account →
                  </Link>
                </p>
              )}
              {error.toLowerCase().includes('username') && (
                <p className="font-normal">Try a different username or leave it blank to auto-generate one.</p>
              )}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4" noValidate>
            <div>
              <label htmlFor="signup-name" className="block text-xs font-bold text-on-surface mb-1 font-label-caps uppercase">
                Full Name
              </label>
              <input
                id="signup-name"
                type="text"
                required
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ada Lovelace"
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              />
            </div>

            <div>
              <label htmlFor="signup-username" className="block text-xs font-bold text-on-surface mb-1 font-label-caps uppercase">
                Username <span className="text-[10px] text-on-surface-variant lowercase font-normal">(optional)</span>
              </label>
              <input
                id="signup-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  // Only allow valid characters as the user types
                  setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''));
                }}
                placeholder="ada_lead"
                maxLength={64}
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              />
              <p className="text-[11px] text-on-surface-variant/60 mt-1">Letters, numbers, underscores only. Auto-generated from email if left blank.</p>
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-xs font-bold text-on-surface mb-1 font-label-caps uppercase">
                Email Address
              </label>
              <input
                id="signup-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ada@company.com"
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-xs font-bold text-on-surface mb-1 font-label-caps uppercase">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              />
              <p className="text-[11px] text-on-surface-variant/70 mt-1">Minimum 6 characters · Argon2id cryptographic hashing</p>
            </div>

            <button
              type="submit"
              disabled={submitting || !email.trim() || !password || !displayName.trim()}
              className="w-full py-3 px-4 rounded-lg bg-primary-container text-on-primary-container hover:bg-opacity-90 disabled:opacity-50 font-label-caps text-label-caps uppercase font-bold transition shadow-md flex items-center justify-center gap-2"
            >
              {submitting ? 'Creating Workspace...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
