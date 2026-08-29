'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-body-sm text-body-sm antialiased selection:bg-primary-container selection:text-on-primary-container bg-surface text-on-surface">
      {/* TopNavBar */}
      <header className="bg-surface/80 backdrop-blur-md w-full top-0 sticky z-50 border-b border-outline-variant/30 opacity-0-init animate-fade-in-up delay-100">
        <div className="flex justify-between items-center w-full px-margin-sm md:px-margin-lg py-4 max-w-[1280px] mx-auto">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-3 font-display-lg text-display-lg font-bold tracking-tighter text-on-surface text-2xl"
            >
              <span className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-black text-sm shadow-md">
                M
              </span>
              Mantis
            </Link>
            <nav className="hidden md:flex gap-6">
              <Link
                className="text-on-surface-variant font-medium hover:text-primary-container transition-colors duration-200 font-label-caps text-label-caps uppercase"
                href="/dashboard"
              >
                Dashboard
              </Link>
              <a
                className="text-on-surface-variant font-medium hover:text-primary-container transition-colors duration-200 font-label-caps text-label-caps uppercase"
                href="http://localhost:3001/docs"
                target="_blank"
                rel="noreferrer"
              >
                Docs
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-on-surface-variant hover:text-primary-container transition-colors font-label-caps text-label-caps uppercase font-bold"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-primary-container text-on-primary-container px-4 py-2 rounded font-label-caps text-label-caps uppercase font-bold hover:bg-opacity-90 transition-all shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center">
        {/* Hero Section */}
        <section className="w-full max-w-[1280px] mx-auto px-margin-sm md:px-margin-lg pb-16 flex flex-col items-center text-center pt-32">
          <h1 className="font-display-lg text-display-lg md:text-[72px] md:leading-[1.1] text-on-surface max-w-4xl mb-8 tracking-tight font-bold opacity-0-init animate-fade-in-up delay-300">
            Stealthy monitoring, precise triage.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant/80 max-w-2xl mb-12 leading-relaxed opacity-0-init animate-fade-in-up delay-500">
            The stealthy, data-rich command center for engineering teams to monitor, log, and resolve issues in real-time. Signal instantly distinguishable from noise.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-20 opacity-0-init animate-fade-in-up delay-700">
            <Link
              href="/signup"
              className="bg-primary-container text-on-primary-container px-8 py-3 rounded-DEFAULT font-label-caps text-label-caps uppercase font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
            >
              Get Started Free
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
            <button
              onClick={() => setIsPlayingDemo(!isPlayingDemo)}
              className="glass-panel text-on-surface px-8 py-3 rounded-DEFAULT font-label-caps text-label-caps uppercase font-bold hover:bg-black/5 transition-all flex items-center justify-center gap-2"
            >
              {isPlayingDemo ? 'Pause Preview' : 'Watch Demo'}
              <span className="material-symbols-outlined text-[16px]">
                {isPlayingDemo ? 'pause_circle' : 'play_circle'}
              </span>
            </button>
          </div>

          {/* Dashboard Preview */}
          <div className="w-full relative group reveal-on-scroll is-visible">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary-container/20 to-secondary/20 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div
              onClick={() => setIsPlayingDemo(!isPlayingDemo)}
              className="relative glass-panel rounded-xl overflow-hidden shadow-2xl aspect-video bg-surface-container flex items-center justify-center group/video cursor-pointer"
            >
              {/* Abstract UI Shimmer Background */}
              <div className="absolute inset-0 opacity-50">
                <div className="w-full h-full bg-gradient-to-br from-primary-container/10 via-transparent to-secondary/10 animate-pulse"></div>
              </div>

              {/* Decorative Mock Dashboard Blueprint inside the frame */}
              <div className="absolute inset-4 rounded-lg border border-outline-variant/20 bg-surface-container-lowest/40 backdrop-blur-sm p-6 flex flex-col gap-4 text-left pointer-events-none opacity-40 group-hover/video:opacity-60 transition-opacity">
                <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-error/60 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-tertiary-container/60 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-primary-container/60 inline-block"></span>
                    <span className="font-label-code text-label-code text-on-surface-variant ml-2 font-mono">mantis://workspace/cluster-01</span>
                  </div>
                  <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-primary-container/20 text-on-primary-container uppercase font-bold">Live Stream</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 rounded bg-surface-container-low/60 border border-outline-variant/10">
                    <div className="text-xs text-on-surface-variant font-medium">Active Anomalies</div>
                    <div className="text-2xl font-bold text-on-surface mt-1">04</div>
                  </div>
                  <div className="p-3 rounded bg-surface-container-low/60 border border-outline-variant/10">
                    <div className="text-xs text-on-surface-variant font-medium">Critical Path EFT</div>
                    <div className="text-2xl font-bold text-primary mt-1">98.4%</div>
                  </div>
                  <div className="p-3 rounded bg-surface-container-low/60 border border-outline-variant/10">
                    <div className="text-xs text-on-surface-variant font-medium">Quarantined Bugs</div>
                    <div className="text-2xl font-bold text-tertiary mt-1">12</div>
                  </div>
                </div>
              </div>

              {/* Play Button Overlay */}
              <div className="relative z-10 flex flex-col items-center gap-4 transition-all duration-300 group-hover/video:scale-110">
                <div className="w-20 h-20 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-xl glow-active">
                  <span className="material-symbols-outlined text-[48px]">
                    {isPlayingDemo ? 'pause' : 'play_arrow'}
                  </span>
                </div>
                <span className="font-label-caps text-label-caps uppercase font-bold tracking-widest text-on-surface-variant">
                  {isPlayingDemo ? 'Interactive Preview Active' : 'Watch Demo'}
                </span>
              </div>

              {/* Subtle Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-outline-variant/20">
                <div className={`h-full bg-primary-container transition-all duration-1000 ${isPlayingDemo ? 'w-full' : 'w-1/3'}`}></div>
              </div>

              {/* Hover State Overlay */}
              <div className="absolute inset-0 bg-on-surface/5 opacity-0 group-hover/video:opacity-100 transition-opacity duration-300"></div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low text-on-surface-variant w-full py-12 border-t border-outline-variant/20 reveal-on-scroll is-visible">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-margin-sm md:px-margin-lg max-w-[1280px] mx-auto font-body-sm text-body-sm">
          <div className="col-span-1 md:col-span-2 mb-8 md:mb-0">
            <div className="flex items-center gap-2 font-headline-sm text-headline-sm font-bold text-on-surface mb-2">
              <span className="w-6 h-6 rounded bg-primary-container text-on-primary-container flex items-center justify-center font-black text-xs">
                M
              </span>
              Mantis
            </div>
            <p className="text-on-surface-variant mb-4 max-w-xs">The command center for elite engineering teams.</p>
            <div className="font-label-caps text-label-caps">© 2024 Mantis Inc. All rights reserved.</div>
          </div>
          <div className="col-span-1 flex flex-col gap-3 font-label-caps text-label-caps uppercase">
            <span className="text-on-surface font-bold mb-1">Product</span>
            <Link className="hover:text-primary-container transition-colors" href="/dashboard">
              Dashboard
            </Link>
            <a className="hover:text-primary-container transition-colors" href="http://localhost:3001/docs" target="_blank" rel="noreferrer">
              Docs &amp; API
            </a>
            <Link className="hover:text-primary-container transition-colors" href="/signup">
              Get Started
            </Link>
            <Link className="hover:text-primary-container transition-colors" href="/dashboard">
              DAG Explorer
            </Link>
          </div>
          <div className="col-span-1 flex flex-col gap-3 font-label-caps text-label-caps uppercase">
            <span className="text-on-surface font-bold mb-1">Legal</span>
            <a className="hover:text-primary-container transition-colors" href="#">
              Privacy Policy
            </a>
            <a className="hover:text-primary-container transition-colors" href="#">
              Terms of Service
            </a>
            <a className="hover:text-primary-container transition-colors" href="#">
              Security
            </a>
            <a className="hover:text-primary-container transition-colors" href="#">
              Status
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

