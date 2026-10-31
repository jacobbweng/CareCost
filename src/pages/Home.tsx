import { Accessibility, ArrowRight, ChevronDown, Lock, Receipt } from 'lucide-react';
import { useEffect } from 'react';
import { Logo } from '../components/Layout';
import { StoryDemo } from '../components/StoryDemo';
import { href } from '../state/router';
import { useStore } from '../state/store';

const HEADLINE = ['Find', 'care', 'that', 'works', 'for', 'you.'];

export function Home() {
  const { onboarded } = useStore();
  const appHref = href(onboarded ? '/dashboard' : '/start');
  useEffect(() => {
    document.getElementById('page-title')?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <a href="#main" className="sr-only-focusable fixed left-3 top-3 z-50 rounded-lg bg-surface px-4 py-2 font-semibold text-pine-900 shadow-lift">Skip to main content</a>

      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-paper/60 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-3 md:px-8">
          <a href={href('/')} aria-label="CareCost home" className="animate-fade"><Logo /></a>
          <nav aria-label="Primary" className="animate-fade flex items-center gap-1">
            <a className="btn-ghost hidden text-ink-700 hover:text-white sm:inline-flex" href="#mission">Mission</a>
            <a className="btn-ghost hidden text-ink-700 hover:text-white sm:inline-flex" href="#how">How it works</a>
            <a className="btn-primary ml-2 min-h-[40px] px-4 text-sm" href={appHref}>Go to app</a>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="relative focus:outline-none">
        {/* 1 — Full-screen intro */}
        <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 pb-16 pt-24 text-center">
          <div aria-hidden="true" className="grid-pan pointer-events-none absolute inset-0" />
          <div aria-hidden="true" className="orb-a pointer-events-none absolute left-[8%] top-[18%] h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(34,197,94,0.35),transparent)] blur-2xl" />
          <div aria-hidden="true" className="orb-b pointer-events-none absolute bottom-[10%] right-[6%] h-96 w-96 rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.25),transparent)] blur-3xl" />

          <div className="relative">
            <svg aria-hidden="true" className="splash-mark animate-pop mx-auto mb-8 h-16 w-16 drop-shadow-[0_0_30px_rgba(34,197,94,0.55)] md:h-20 md:w-20" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="9" fill="#22c55e" />
              <path d="M9 17.5a7 7 0 0 1 12.2-4.7" fill="none" stroke="#03140a" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M23 14.5a7 7 0 0 1-12.2 4.7" fill="none" stroke="#0b5a2e" strokeWidth="2.6" strokeLinecap="round" />
              <circle cx="16" cy="16" r="2.3" fill="#03140a" />
            </svg>
            <h1 id="page-title" tabIndex={-1} aria-label="Find care that works for you." className="mx-auto max-w-5xl text-balance text-[3.1rem] font-extrabold leading-[0.95] tracking-[-0.05em] focus:outline-none sm:text-[4.6rem] md:text-[6.4rem]">
              {HEADLINE.map((w, i) => (
                <span key={w} aria-hidden="true" className={i < 3 ? 'word text-white' : 'word text-gradient'} style={{ animationDelay: `${250 + i * 110}ms` }}>
                  {w}
                  {i < HEADLINE.length - 1 && ' '}
                </span>
              ))}
            </h1>
            <p className="animate-rise mx-auto mt-7 max-w-md text-lg text-ink-600 md:text-xl" style={{ animationDelay: '1000ms' }}>
              Accessible clinics. Real costs. One plan.
            </p>
            <div className="animate-rise mt-10 flex justify-center" style={{ animationDelay: '1200ms' }}>
              <a href={appHref} className="btn-primary min-h-[58px] px-9 text-[1.1rem]">
                Go to app <ArrowRight aria-hidden className="h-5 w-5" />
              </a>
            </div>
          </div>

          <a href="#mission" className="animate-fade absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-sm font-semibold text-ink-500 hover:text-white" style={{ animationDelay: '1600ms' }}>
            Our mission
            <ChevronDown aria-hidden className="bob h-5 w-5" />
          </a>
        </section>

        {/* 2 — Mission */}
        <section id="mission" aria-labelledby="mission-h" className="relative scroll-mt-16 border-t border-white/5 bg-shell/60 px-5 py-28 md:py-36">
          <div className="mx-auto max-w-[1100px]">
            <p className="reveal eyebrow text-center">Our mission</p>
            <h2 id="mission-h" className="reveal mx-auto mt-5 max-w-4xl text-balance text-center text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.04em] md:text-[4.4rem]">
              Healthcare <span className="text-gradient">every body</span> can reach.
            </h2>
            <p className="reveal mx-auto mt-6 max-w-xl text-center text-lg text-ink-600">
              No one should pay more or go without care because a clinic wasn’t built for them.
            </p>

            <ul className="mt-16 grid gap-5 md:grid-cols-3">
              {[
                { icon: Accessibility, t: 'Access first', d: 'Your must-haves are never traded for a lower price.' },
                { icon: Receipt, t: 'Honest costs', d: 'Care, travel and parking — all in, all shown.' },
                { icon: Lock, t: 'Private by default', d: 'No diagnosis. Your data stays on your device.' },
              ].map((g) => (
                <li key={g.t} className="reveal lift rounded-[1.4rem] border border-line bg-surface/80 p-7 backdrop-blur">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-pine-100 text-pine-700 ring-1 ring-pine-300 shadow-[0_0_28px_rgba(34,197,94,0.2)]">
                    <g.icon aria-hidden className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-2xl font-extrabold tracking-tight">{g.t}</h3>
                  <p className="mt-2 text-ink-600">{g.d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 3 — Story */}
        <section id="how" aria-labelledby="how-h" className="scroll-mt-16 px-4 py-28 md:px-8">
          <div className="mx-auto max-w-[980px]">
            <p className="reveal eyebrow text-center">How it works</p>
            <h2 id="how-h" className="reveal mt-4 text-balance text-center text-[2.4rem] font-extrabold tracking-[-0.04em] md:text-[3.6rem]">One trip, start to finish.</h2>
            <div className="reveal mt-12">
              <StoryDemo />
            </div>
          </div>
        </section>

        {/* 4 — Final CTA */}
        <section className="px-5 pb-28 md:px-8">
          <div className="reveal relative mx-auto max-w-[1180px] overflow-hidden rounded-[2rem] border border-pine-300 bg-gradient-to-br from-pine-100 via-paper-100 to-paper px-6 py-20 text-center shadow-glow md:py-24">
            <div aria-hidden="true" className="animate-glow pointer-events-none absolute -top-24 left-1/2 h-64 w-[600px] max-w-full -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(34,197,94,0.35),transparent)] blur-2xl" />
            <h2 className="relative text-balance text-[2.4rem] font-extrabold tracking-[-0.04em] md:text-[3.8rem]">Care you can actually get to.</h2>
            <a href={appHref} className="btn-primary relative mt-10 min-h-[58px] px-9 text-[1.1rem]">Go to app <ArrowRight aria-hidden className="h-5 w-5" /></a>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-8 text-center text-sm text-ink-500">
        Estimates only — not medical, insurance or financial advice.
      </footer>
    </div>
  );
}
