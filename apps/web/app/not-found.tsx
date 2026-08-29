'use client';

import React from 'react';
import Link from 'next/link';
import { MantisLogo } from '@/components/MantisLogo';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col justify-center items-center px-6 py-12 selection:bg-primary-container selection:text-on-primary-container relative overflow-hidden font-body-md">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-primary-container/20 to-secondary/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full text-center relative z-10 space-y-6">
        <Link href="/" className="inline-flex items-center gap-3 group mb-2">
          <MantisLogo className="w-10 h-10 group-hover:scale-105 transition-transform" size={40} />
          <span className="font-display-lg text-2xl font-bold tracking-tighter text-on-surface">
            Mantis
          </span>
        </Link>

        {/* 404 Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container/20 border border-primary/30 text-primary text-xs font-mono font-bold uppercase tracking-wider">
          <span className="material-symbols-outlined text-[14px]">menu_book</span>
          Placeholder Page • 404
        </div>

        <div className="space-y-2">
          <h1 className="font-display-lg text-3xl sm:text-4xl font-bold tracking-tight text-on-surface">
            Docs &amp; Support Coming Soon
          </h1>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            The documentation and support portal is currently under development for the Clonefest submission. All core defect workflows, RBAC testing, and graph analytics are live in the app.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-label-caps text-label-caps uppercase font-bold text-xs hover:bg-primary/90 transition shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            Return to Dashboard
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-surface-container text-on-surface rounded-xl font-label-caps text-label-caps uppercase font-bold text-xs hover:bg-surface-container-high transition border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            Landing Page
          </Link>
        </div>
      </div>
    </div>
  );
}
