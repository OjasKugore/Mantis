'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { MantisLogo } from '@/components/MantisLogo';
import { AppleProductShowcase } from '@/components/AppleProductShowcase';

export default function LandingPage() {
  const router = useRouter();
  const { quickLogin } = useAuth();
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string>('alice');
  const [launchingPersona, setLaunchingPersona] = useState<string | null>(null);

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

  const handleLaunchDemo = async (personaKey = selectedPersona) => {
    setLaunchingPersona(personaKey);
    try {
      const res = await quickLogin(personaKey);
      if (res.success) {
        router.push('/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch {
      router.push('/dashboard');
    } finally {
      setLaunchingPersona(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-body-md selection:bg-primary-container selection:text-on-primary-container relative">
      {/* Top Notification Banner for Judges & Evaluators */}
      <div className="bg-[#4a5e3a] text-white text-xs py-2 px-4 text-center flex items-center justify-center gap-2 border-b border-[#3d4e2f]/40">
        <span className="font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded text-[10px]">Clonefest Evaluator</span>
        <span>Judges and evaluators can use the <strong className="text-[#d8ebd0] font-bold">Judge Demo</strong> option to evaluate seeded workflows.</span>
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-outline-variant/30 transition-all duration-300">
        <div className="max-w-[1280px] mx-auto px-margin-sm md:px-margin-lg h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-3 font-display-lg text-display-lg font-bold tracking-tighter text-on-surface text-2xl group"
            >
              <MantisLogo className="w-8 h-8 transition-transform group-hover:scale-105" size={32} />
              Mantis
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-bold font-label-caps uppercase text-on-surface-variant hover:text-primary transition-colors px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/40 px-4 py-2 rounded-xl text-xs font-bold font-label-caps uppercase shadow-xs transition-all"
            >
              Create Account
            </Link>
            <button
              onClick={() => handleLaunchDemo(selectedPersona)}
              disabled={launchingPersona !== null}
              className="bg-[#4a5e3a] hover:bg-[#3d4e2f] text-white px-4 py-2 rounded-xl text-xs font-bold font-label-caps uppercase shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">play_arrow</span>
              {launchingPersona ? 'Launching...' : 'Judge Demo'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center">
        {/* Hero Section */}
        <section className="w-full max-w-[1280px] mx-auto px-margin-sm md:px-margin-lg pb-16 flex flex-col items-center text-center pt-24 md:pt-28">
          <h1 className="font-display-lg text-display-lg md:text-[68px] md:leading-[1.1] text-on-surface max-w-4xl mb-6 tracking-tight font-bold opacity-0-init animate-fade-in-up delay-300">
            Stealthy monitoring, precise triage.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant/80 max-w-2xl mb-10 leading-relaxed opacity-0-init animate-fade-in-up delay-500">
            The stealthy, data-rich command center for engineering teams to monitor, log, and resolve issues in real-time. Signal instantly distinguishable from noise.
          </p>

          {/* Hackathon Judge Demo Hub */}
          <div className="w-full max-w-5xl mb-12 opacity-0-init animate-fade-in-up delay-700 text-left">
            <div className="w-full bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-slate-100 flex flex-col relative">
              {/* Subtle brand top bar */}
              <div className="h-2 w-full bg-[#4a5e3a]" />
              <div className="p-8 md:p-10">
                {/* HeaderSection */}
                <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                  {/* Title and Description */}
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-3 mb-3">
                      <h2 className="text-sm sm:text-base font-bold tracking-widest uppercase text-slate-900 font-label-caps">
                        Clonefest Evaluator Quick Access
                      </h2>
                    </div>
                    <p className="text-slate-500 text-sm sm:text-base max-w-3xl leading-relaxed">
                      Select a persona to test role-based access control (RBAC), embargoes, and dependency graphs:
                    </p>
                  </div>
                  {/* CTA Button */}
                  <div className="shrink-0">
                    <button
                      onClick={() => handleLaunchDemo(selectedPersona)}
                      disabled={launchingPersona !== null}
                      className="w-full md:w-auto bg-[#87a96b] hover:bg-[#76975a] text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-sm shadow-[#87a96b]/20 focus:outline-none focus:ring-2 focus:ring-[#87a96b] focus:ring-offset-2 font-label-caps uppercase cursor-pointer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                      {launchingPersona ? 'Launching...' : 'Launch Judge Demo'}
                    </button>
                  </div>
                </header>

                {/* Subtle Divider */}
                <div className="h-px w-full bg-slate-100 mb-8" />

                {/* PersonaGrid */}
                <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {/* Persona Card: System */}
                  <button
                    type="button"
                    onClick={() => setSelectedPersona('admin')}
                    className={`group rounded-xl p-5 text-center flex flex-col justify-center items-center h-32 transition-all duration-200 focus:outline-none cursor-pointer ${
                      selectedPersona === 'admin'
                        ? 'border-2 border-[#87a96b] bg-white shadow-sm ring-2 ring-[#87a96b]/20'
                        : 'border border-slate-200 bg-white hover:border-[#87a96b]/60 hover:shadow-sm'
                    }`}
                  >
                    <h3 className={`font-bold text-lg mb-2 transition-colors ${
                      selectedPersona === 'admin' ? 'text-[#4a5e3a]' : 'text-slate-800 group-hover:text-[#4a5e3a]'
                    }`}>
                      System
                    </h3>
                    <div className={`flex items-center gap-2 transition-colors ${
                      selectedPersona === 'admin' ? 'text-[#4a5e3a]' : 'text-slate-500'
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                      <span className="text-sm font-medium font-mono tracking-tight">Admin</span>
                    </div>
                  </button>

                  {/* Persona Card: Carol */}
                  <button
                    type="button"
                    onClick={() => setSelectedPersona('carol')}
                    className={`group rounded-xl p-5 text-center flex flex-col justify-center items-center h-32 transition-all duration-200 focus:outline-none cursor-pointer ${
                      selectedPersona === 'carol'
                        ? 'border-2 border-[#87a96b] bg-white shadow-sm ring-2 ring-[#87a96b]/20'
                        : 'border border-slate-200 bg-white hover:border-[#87a96b]/60 hover:shadow-sm'
                    }`}
                  >
                    <h3 className={`font-bold text-lg mb-2 transition-colors ${
                      selectedPersona === 'carol' ? 'text-[#4a5e3a]' : 'text-slate-800 group-hover:text-[#4a5e3a]'
                    }`}>
                      Carol
                    </h3>
                    <div className={`flex items-center gap-2 transition-colors ${
                      selectedPersona === 'carol' ? 'text-[#4a5e3a]' : 'text-slate-500'
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                      <span className="text-sm font-medium font-mono tracking-tight">Security Lead</span>
                    </div>
                  </button>

                  {/* Persona Card: Alice */}
                  <button
                    type="button"
                    onClick={() => setSelectedPersona('alice')}
                    className={`group rounded-xl p-5 text-center flex flex-col justify-center items-center h-32 transition-all duration-200 focus:outline-none cursor-pointer ${
                      selectedPersona === 'alice'
                        ? 'border-2 border-[#87a96b] bg-white shadow-sm ring-2 ring-[#87a96b]/20'
                        : 'border border-slate-200 bg-white hover:border-[#87a96b]/60 hover:shadow-sm'
                    }`}
                  >
                    <h3 className={`font-bold text-lg mb-2 transition-colors ${
                      selectedPersona === 'alice' ? 'text-[#4a5e3a]' : 'text-slate-800 group-hover:text-[#4a5e3a]'
                    }`}>
                      Alice
                    </h3>
                    <div className={`flex items-center gap-2 transition-colors ${
                      selectedPersona === 'alice' ? 'text-[#4a5e3a]' : 'text-slate-500'
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                      <span className="text-sm font-medium font-mono tracking-tight">Dev Lead</span>
                    </div>
                  </button>

                  {/* Persona Card: Bob */}
                  <button
                    type="button"
                    onClick={() => setSelectedPersona('bob')}
                    className={`group rounded-xl p-5 text-center flex flex-col justify-center items-center h-32 transition-all duration-200 focus:outline-none cursor-pointer ${
                      selectedPersona === 'bob'
                        ? 'border-2 border-[#87a96b] bg-white shadow-sm ring-2 ring-[#87a96b]/20'
                        : 'border border-slate-200 bg-white hover:border-[#87a96b]/60 hover:shadow-sm'
                    }`}
                  >
                    <h3 className={`font-bold text-lg mb-2 transition-colors ${
                      selectedPersona === 'bob' ? 'text-[#4a5e3a]' : 'text-slate-800 group-hover:text-[#4a5e3a]'
                    }`}>
                      Bob
                    </h3>
                    <div className={`flex items-center gap-2 transition-colors ${
                      selectedPersona === 'bob' ? 'text-[#4a5e3a]' : 'text-slate-500'
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                      <span className="text-sm font-medium font-mono tracking-tight">QA Automation</span>
                    </div>
                  </button>

                  {/* Persona Card: Eve */}
                  <button
                    type="button"
                    onClick={() => setSelectedPersona('eve')}
                    className={`group rounded-xl p-5 text-center flex flex-col justify-center items-center h-32 transition-all duration-200 focus:outline-none cursor-pointer ${
                      selectedPersona === 'eve'
                        ? 'border-2 border-[#87a96b] bg-white shadow-sm ring-2 ring-[#87a96b]/20'
                        : 'border border-slate-200 bg-white hover:border-[#87a96b]/60 hover:shadow-sm'
                    }`}
                  >
                    <h3 className={`font-bold text-lg mb-2 transition-colors ${
                      selectedPersona === 'eve' ? 'text-[#4a5e3a]' : 'text-slate-800 group-hover:text-[#4a5e3a]'
                    }`}>
                      Eve
                    </h3>
                    <div className={`flex items-center gap-2 transition-colors ${
                      selectedPersona === 'eve' ? 'text-[#4a5e3a]' : 'text-slate-500'
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                      <span className="text-sm font-medium font-mono tracking-tight">Triager</span>
                    </div>
                  </button>
                </section>
              </div>
            </div>
          </div>

          {/* Clean Real Workspace Options */}
          <div className="flex flex-col sm:flex-row gap-4 mb-16 opacity-0-init animate-fade-in-up delay-700">
            <Link
              href="/signup"
              className="bg-white border border-slate-200 hover:border-[#87a96b] text-slate-800 hover:text-[#4a5e3a] hover:shadow-md px-6 py-3 rounded-xl font-label-caps text-label-caps uppercase font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px] text-[#87a96b]">add_circle</span>
              Create Fresh Workspace (0 Defects)
            </Link>
            <Link
              href="/login"
              className="bg-white border border-slate-200 hover:border-[#87a96b] text-slate-800 hover:text-[#4a5e3a] hover:shadow-md px-6 py-3 rounded-xl font-label-caps text-label-caps uppercase font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px] text-[#87a96b]">login</span>
              Sign In via OAuth / Email
            </Link>
          </div>
        </section>

        {/* Live Interactive Product Tour Preview (Apple-Style Showcase) */}
        <section id="demo" className="py-20 md:py-28 px-margin-sm md:px-margin-lg max-w-[1280px] mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="reveal-on-scroll is-visible max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold font-label-caps uppercase tracking-wider mb-4">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                High-Definition Product Tour
              </div>
              <h2 className="font-display-md text-3xl md:text-5xl font-extrabold text-on-surface tracking-tight">
                Designed for speed. Engineered for governance.
              </h2>
              <p className="text-on-surface-variant font-body-lg text-body-lg mt-3">
                Experience sub-50ms Critical Path analytics, Kanban drag-and-drop state transitions, and 90-day zero-leakage security embargoes in action.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleLaunchDemo(selectedPersona)}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-label-caps text-xs font-bold uppercase transition flex items-center gap-2 cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                Launch Live Sandbox
              </button>
            </div>
          </div>

          {/* Floating Apple MacBook Pro Frame & Ambient Glow */}
          <div className="w-full relative group reveal-on-scroll is-visible">
            {/* Multi-layered Ambient Backlight Glow Canvas */}
            <div className="absolute -inset-4 md:-inset-8 bg-gradient-to-tr from-primary/25 via-emerald-600/15 to-primary-container/30 rounded-3xl blur-3xl opacity-60 group-hover:opacity-90 transition duration-1000 -z-10" />

            {/* Hardware-Accelerated Floating macOS Window Frame */}
            <div className="relative rounded-2xl md:rounded-3xl border border-outline-variant/40 bg-surface-container-lowest shadow-2xl overflow-hidden backdrop-blur-xl transition-transform duration-500 hover:scale-[1.005]">
              {/* macOS Title Bar */}
              <div className="h-11 px-4 bg-surface-container-high/70 border-b border-outline-variant/30 flex items-center justify-between select-none">
                {/* Traffic Light Buttons */}
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] inline-block shadow-xs" />
                  <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] inline-block shadow-xs" />
                  <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] inline-block shadow-xs" />
                </div>

                {/* macOS Frosted Address Pill */}
                <div className="hidden sm:flex items-center gap-2 px-4 py-1 rounded-full bg-surface-container border border-outline-variant/30 text-xs text-on-surface-variant font-mono shadow-inner max-w-sm w-full justify-center">
                  <span className="material-symbols-outlined text-[14px] text-primary">lock</span>
                  <span className="text-[11px] truncate">mantis://workspace/live-product-tour</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse ml-1" />
                </div>

                {/* Window Actions */}
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="font-label-caps text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary-container/20 text-on-primary-container hidden md:inline-block">
                    60 FPS Retina
                  </span>
                </div>
              </div>

              {/* High-Definition Live Product Tour Canvas (Actual Website Walkthrough) */}
              <div
                onClick={() => setIsPlayingDemo(!isPlayingDemo)}
                className="relative aspect-[1440/759] w-full bg-surface-container overflow-hidden shadow-inner cursor-pointer group/screen"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/videos/mantis-demo-tour.webp"
                  alt="Mantis Actual Live Website Walkthrough"
                  className={`w-full h-full object-contain select-none transition-opacity duration-300 ${
                    isPlayingDemo ? 'opacity-100' : 'opacity-85'
                  }`}
                />

                {/* Hover Play/Pause Overlay */}
                <div className="absolute inset-0 bg-black/15 backdrop-blur-[2px] opacity-0 group-hover/screen:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="w-14 h-14 rounded-full bg-primary/95 text-on-primary flex items-center justify-center shadow-2xl transform scale-90 group-hover/screen:scale-100 transition-transform">
                      <span className="material-symbols-outlined text-[32px]">
                        {isPlayingDemo ? 'pause' : 'play_arrow'}
                      </span>
                    </div>
                    <span className="font-label-caps text-[11px] font-bold uppercase tracking-widest text-white drop-shadow-md bg-black/50 px-3 py-1 rounded-full">
                      {isPlayingDemo ? 'Click to Pause' : 'Click to Resume'}
                    </span>
                  </div>
                </div>

                {/* Bottom Scrubbing Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                  <div
                    className={`h-full bg-primary transition-all duration-700 ${
                      isPlayingDemo ? 'w-full animate-pulse' : 'w-1/2'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1.5">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase font-label-caps">
                  <span className="material-symbols-outlined text-[18px]">account_tree</span>
                  Topological DAG
                </div>
                <p className="text-xs text-on-surface-variant">
                  Kahn&apos;s algorithm calculates Critical Paths and dependency cycles in &lt;50ms.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1.5">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase font-label-caps">
                  <span className="material-symbols-outlined text-[18px]">security</span>
                  90-Day Embargo
                </div>
                <p className="text-xs text-on-surface-variant">
                  Zero-leakage timing-safe quarantine for confidential CVE vulnerability disclosures.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1.5">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase font-label-caps">
                  <span className="material-symbols-outlined text-[18px]">view_kanban</span>
                  Kanban State Sync
                </div>
                <p className="text-xs text-on-surface-variant">
                  Strict state machine transitions with drag-and-drop velocity tracking.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1.5">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase font-label-caps">
                  <span className="material-symbols-outlined text-[18px]">terminal</span>
                  GitHub Webhooks
                </div>
                <p className="text-xs text-on-surface-variant">
                  Bi-directional commit hash linking and automated Pull Request resolution.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low text-on-surface-variant w-full py-12 border-t border-outline-variant/20 reveal-on-scroll is-visible">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 px-margin-sm md:px-margin-lg max-w-[1280px] mx-auto font-body-sm text-body-sm">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5 font-headline-sm text-headline-sm font-bold text-on-surface mb-2">
              <MantisLogo className="w-6 h-6 rounded-md shadow-xs" size={24} />
              Mantis
            </div>
            <p className="text-on-surface-variant mb-4">The command center for elite engineering teams.</p>
            <div className="font-label-caps text-label-caps">© 2026 Mantis. Built for Clonefest.</div>
          </div>

          {/* Product Links */}
          <div className="flex flex-col gap-3 font-label-caps text-label-caps uppercase">
            <span className="text-on-surface font-bold mb-1">Product</span>
            <Link className="hover:text-primary transition-colors" href="/signup">
              Get Started
            </Link>
            <Link className="hover:text-primary transition-colors" href="/login">
              Sign In
            </Link>
            <Link className="hover:text-primary transition-colors" href="/docs">
              Docs &amp; API
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
