import { ArrowRight, Check, ClipboardCheck, Map as MapIcon, Receipt, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Logo } from '../components/Layout';
import { StoryDemo } from '../components/StoryDemo';
import { cx } from '../components/ui';
import { ACCOMMODATIONS } from '../data/accommodations';
import { DEFAULT_ASSUMPTIONS, DEMO_PROFILE } from '../data/plans';
import { PROVIDERS } from '../data/providers';
import { usd } from '../lib/format';
import { matchProviders } from '../lib/matching';
import { href, navigate } from '../state/router';
import { useStore } from '../state/store';

export function Home() {
  const { onboarded, loadDemo } = useStore();
  useEffect(() => {
    document.getElementById('page-title')?.focus({ preventScroll: true });
  }, []);

  const demo = useMemo(() => matchProviders(DEMO_PROFILE, PROVIDERS, DEFAULT_ASSUMPTIONS), []);
  const barrier = demo.barrierInsight?.extraTransportCost ?? 0;

  const openMap = () => {
    if (!onboarded) loadDemo();
    navigate('/map');
  };

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <a href="#main" className="sr-only-focusable fixed left-3 top-3 z-50 rounded-lg bg-surface px-4 py-2 font-semibold text-pine-900 shadow-lift">Skip to main content</a>

      {/* Ambient glow */}
      <div aria-hidden="true" className="animate-glow pointer-events-none absolute left-1/2 top-[-260px] h-[620px] w-[1000px] max-w-[160vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(34,197,94,0.30),transparent)] blur-2xl" />

      {/* Nav */}
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-40 border-b border-white/5 bg-paper/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-3 md:px-8">
          <a href={href('/')} aria-label="CareCost home" className="animate-fade"><Logo /></a>
          <nav aria-label="Primary" className="animate-fade flex items-center gap-1">
            <button type="button" className="btn-ghost hidden text-ink-700 hover:text-white sm:inline-flex" onClick={openMap}>Map</button>
            <a className="btn-ghost hidden text-ink-700 hover:text-white sm:inline-flex" href={href('/insurance')}>Insurance</a>
            {onboarded && <a className="btn-ghost hidden text-ink-700 hover:text-white md:inline-flex" href={href('/dashboard')}>Dashboard</a>}
            <a className="btn-primary ml-2 min-h-[40px] px-4 text-sm" href={href('/start')}>Get started</a>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="relative focus:outline-none">
        {/* Hero */}
        <section className="mx-auto max-w-[1180px] px-5 pb-10 pt-14 text-center md:px-8 md:pt-24">
          <p className="animate-rise intro-1 mx-auto inline-flex items-center gap-2 rounded-full border border-pine-300 bg-pine-50/80 px-3.5 py-1.5 text-[0.8rem] font-semibold text-pine-800">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_#22c55e]" />
            For patients with disabilities
          </p>
          <h1 id="page-title" tabIndex={-1} className="animate-rise intro-2 mx-auto mt-6 max-w-4xl text-balance text-[2.9rem] font-extrabold leading-[0.98] tracking-[-0.045em] focus:outline-none sm:text-[4rem] md:text-[5.4rem]">
            <span className="text-gradient">Find care that works for you.</span>
          </h1>
          <p className="animate-rise intro-3 mx-auto mt-6 max-w-xl text-[1.15rem] text-ink-600 md:text-[1.3rem]">
            Accessible providers. Real costs. One plan.
          </p>
          <div className="animate-rise intro-4 mt-9 flex flex-wrap items-center justify-center gap-3">
            <a href={href('/start')} className="btn-primary min-h-[54px] px-7 text-[1.05rem]">
              Get started <ArrowRight aria-hidden className="h-5 w-5" />
            </a>
            <button type="button" className="btn-secondary min-h-[54px] px-6 text-[1.05rem]" onClick={openMap}>
              <MapIcon aria-hidden className="h-5 w-5" /> Explore the map
            </button>
          </div>
          <p className="animate-rise intro-5 mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-ink-500">
            {['Free', 'No diagnosis needed', 'Stays on your device'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5"><Check aria-hidden className="h-3.5 w-3.5 text-pine-700" />{t}</span>
            ))}
          </p>
        </section>

        {/* The story */}
        <section aria-label="Product story" className="animate-slide-left intro-5 mx-auto max-w-[980px] px-4 pb-20 md:px-8">
          <StoryDemo />
        </section>

        {/* Accommodation marquee */}
        <section aria-label="Accommodations" className="border-y border-white/5 bg-shell/60 py-6">
          <p className="sr-only">Choose from {ACCOMMODATIONS.length} accommodations, from step-free entrances to sign-language interpreters and quiet waiting rooms.</p>
          <div className="marquee-wrap relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]" aria-hidden="true">
            <div className="marquee flex w-max gap-3">
              {[...ACCOMMODATIONS, ...ACCOMMODATIONS].map((a, i) => (
                <span key={i} className="whitespace-nowrap rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-700">{a.short}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Numbers */}
        <section aria-label="By the numbers" className="mx-auto grid max-w-[1180px] gap-10 px-5 py-24 text-center sm:grid-cols-3 md:px-8">
          {[
            { n: usd(barrier), l: 'extra per visit when the nearest clinic is inaccessible' },
            { n: `${demo.meets.length} of ${demo.results.length}`, l: 'nearby clinics actually fit Jordan' },
            { n: '0', l: 'diagnoses asked' },
          ].map((s) => (
            <div key={s.l} className="reveal">
              <p className="text-gradient font-display text-[3.6rem] font-extrabold leading-none tracking-tight md:text-[4.4rem]">{s.n}</p>
              <p className="mx-auto mt-3 max-w-[16rem] text-ink-600">{s.l}</p>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section aria-labelledby="how-h" className="mx-auto max-w-[1180px] px-5 pb-24 md:px-8">
          <h2 id="how-h" className="reveal text-center text-[2.2rem] font-extrabold tracking-tight md:text-[3rem]">Three steps. No guesswork.</h2>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { icon: SlidersHorizontal, t: 'Tell us what you need', d: 'Pick accommodations. Mark the must-haves.', vis: <NeedsVis /> },
              { icon: Receipt, t: 'See the true cost', d: 'Care + travel + parking, all in.', vis: <CostVis /> },
              { icon: ClipboardCheck, t: 'Walk in prepared', d: 'Call scripts and an Access Card.', vis: <PlanVis /> },
            ].map((s, i) => (
              <li key={s.t} className="reveal lift flex flex-col overflow-hidden rounded-[1.4rem] border border-line bg-surface/80 backdrop-blur">
                <div className="h-40 border-b border-line bg-[radial-gradient(400px_160px_at_50%_0%,rgba(34,197,94,0.14),transparent)] p-5">{s.vis}</div>
                <div className="p-6">
                  <p className="flex items-center gap-2 text-sm font-bold text-pine-700"><s.icon aria-hidden className="h-4 w-4" /> Step {i + 1}</p>
                  <h3 className="mt-2 text-xl font-extrabold">{s.t}</h3>
                  <p className="mt-1 text-ink-600">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Final CTA */}
        <section className="px-5 pb-24 md:px-8">
          <div className="reveal relative mx-auto max-w-[1180px] overflow-hidden rounded-[2rem] border border-pine-300 bg-gradient-to-br from-pine-100 via-paper-100 to-paper px-6 py-16 text-center shadow-glow md:py-20">
            <div aria-hidden="true" className="animate-glow pointer-events-none absolute -top-24 left-1/2 h-64 w-[600px] max-w-full -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(34,197,94,0.35),transparent)] blur-2xl" />
            <h2 className="relative text-balance text-[2.3rem] font-extrabold tracking-tight md:text-[3.4rem]">Care you can actually get to.</h2>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <a href={href('/start')} className="btn-primary min-h-[54px] px-7 text-[1.05rem]">Get started <ArrowRight aria-hidden className="h-5 w-5" /></a>
              <button type="button" className="btn-secondary min-h-[54px] px-6 text-[1.05rem]" onClick={openMap}>Explore the map</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-8 text-center text-sm text-ink-500">
        <p>Demo data is synthetic. Estimates only — not medical, insurance or financial advice.</p>
      </footer>
    </div>
  );
}

/* ── Tiny animated illustrations for the three steps ── */

function NeedsVis() {
  const chips = [
    { t: 'Step-free entrance', on: 'essential' },
    { t: 'Accessible exam room', on: 'essential' },
    { t: 'Quiet waiting', on: 'preferred' },
    { t: 'ASL interpreter', on: '' },
  ];
  return (
    <div aria-hidden="true" className="flex flex-wrap content-start gap-2">
      {chips.map((c, i) => (
        <span
          key={c.t}
          className={cx(
            'animate-pop rounded-full px-3 py-1.5 text-xs font-semibold',
            `intro-${i + 1}`,
            c.on === 'essential' ? 'bg-accent text-accent-ink' : c.on === 'preferred' ? 'border border-pine-300 bg-pine-100 text-pine-900' : 'border border-line text-ink-600',
          )}
        >
          {c.on === 'essential' && '● '}{c.t}
        </span>
      ))}
    </div>
  );
}

function CostVis() {
  const rows = [
    { l: 'Cheapest bill', care: 70, ride: 0, x: true },
    { l: 'True cost', care: 62, ride: 26, x: false },
  ];
  return (
    <div aria-hidden="true" className="space-y-4 pt-2">
      {rows.map((r, i) => (
        <div key={r.l}>
          <div className="mb-1.5 flex justify-between text-xs font-semibold text-ink-600">
            <span>{r.l}</span>
            <span className={r.x ? 'text-rust-700' : 'text-pine-700'}>{r.x ? '✕ can’t get in' : '✓ fits'}</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-white/5">
            <span className={cx('animate-grow-x h-full', r.x ? 'bg-rust-700/70' : 'bg-accent', `intro-${i * 2 + 2}`)} style={{ width: `${r.care}%` }} />
            {r.ride > 0 && <span className={cx('animate-grow-x h-full border-l-2 border-surface bg-[#a7f3d0]', `intro-${i * 2 + 3}`)} style={{ width: `${r.ride}%` }} />}
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanVis() {
  return (
    <ul aria-hidden="true" className="space-y-2.5 pt-1">
      {['Reserve accessible room', 'Get referral', 'Book accessible ride'].map((t, i) => (
        <li key={t} className={cx('animate-rise flex items-center gap-2.5 text-sm text-ink-700', `intro-${i + 2}`)}>
          <span className={cx('animate-pop grid h-5 w-5 place-items-center rounded-md bg-accent text-accent-ink', `intro-${i + 3}`)}><Check className="h-3.5 w-3.5" /></span>
          {t}
        </li>
      ))}
    </ul>
  );
}
