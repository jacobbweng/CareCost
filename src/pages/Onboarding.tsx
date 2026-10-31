import { ArrowLeft, ArrowRight, Check, Pencil } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '../components/Layout';
import {
  BudgetTravelSection,
  InsuranceSection,
  LocationSection,
  NeedsSection,
  validateLocation,
} from '../components/ProfileSections';
import { Callout, cx } from '../components/ui';
import { ACC_BY_ID } from '../data/accommodations';
import { BLANK_PROFILE, DEMO_PROFILE, PLAN_BY_ID, TRANSPORT_LABELS } from '../data/plans';
import { SPECIALTY_BY_ID } from '../data/providers';
import { usd } from '../lib/format';
import type { AccId, Profile } from '../lib/types';
import { href, navigate } from '../state/router';
import { useStore } from '../state/store';

const STEPS = ['Location & care', 'Access needs', 'Insurance', 'Budget & travel', 'Review'] as const;

export function Onboarding() {
  const { profile, completeOnboarding, onboarded } = useStore();
  const [draft, setDraft] = useState<Profile>(onboarded ? profile : DEMO_PROFILE);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      document.getElementById('page-title')?.focus({ preventScroll: true });
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  const patch = (p: Partial<Profile>) => {
    setDraft((d) => {
      const next = { ...d, ...p };
      if (p.planId && p.planId !== d.planId) {
        const plan = PLAN_BY_ID[p.planId];
        if (plan.method === 'copay' || plan.method === 'deductible_coinsurance') {
          next.insurance =
            plan.id === 'custom'
              ? { method: 'deductible_coinsurance', copay: null, deductibleRemaining: null, coinsurancePct: null, oopRemaining: null }
              : { method: plan.method, copay: plan.copay, deductibleRemaining: plan.deductibleRemaining, coinsurancePct: plan.coinsurancePct, oopRemaining: plan.oopRemaining };
        }
      }
      return next;
    });
    if (p.zip !== undefined && errors.zip) setErrors({});
  };

  const next = () => {
    if (step === 0) {
      const e = validateLocation(draft);
      setErrors(e);
      if (Object.keys(e).length) {
        document.getElementById('zip')?.focus();
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const finish = () => {
    completeOnboarding(draft);
    navigate('/find');
  };

  const essentials = (Object.keys(draft.needs) as AccId[]).filter((k) => draft.needs[k] === 'essential');
  const preferred = (Object.keys(draft.needs) as AccId[]).filter((k) => draft.needs[k] === 'preferred');

  return (
    <div className="min-h-screen bg-transparent">
      <a href="#main" className="sr-only-focusable fixed left-3 top-3 z-50 rounded-lg bg-surface px-4 py-2 font-semibold text-pine-900 shadow-lift">Skip to main content</a>
      <header className="mx-auto flex max-w-[920px] items-center justify-between px-5 py-5">
        <a href={href('/')} aria-label="CareCost home"><Logo /></a>
        <a href={href(onboarded ? '/dashboard' : '/')} className="btn-ghost">Exit setup</a>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-[920px] px-5 pb-24 focus:outline-none">
        <p className="eyebrow animate-rise intro-1 mb-2">Your accessibility profile</p>
        <h1 id="page-title" tabIndex={-1} className="text-[2rem] font-extrabold leading-tight focus:outline-none md:text-[2.4rem]">
          Let&rsquo;s find care that fits you
        </h1>
        <p className="mt-2 text-ink-700">
          Five short steps. We&rsquo;ve pre-filled a sample patient — a wheelchair user looking for a neurologist — so you can click straight through, or change anything.
        </p>

        {/* Progress indicator */}
        <nav aria-label="Setup progress" className="mt-8">
          <p className="sr-only" aria-live="polite">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
          <ol className="flex gap-2">
            {STEPS.map((s, i) => (
              <li key={s} className="flex-1" aria-current={i === step ? 'step' : undefined}>
                <button
                  type="button"
                  disabled={i > step}
                  onClick={() => i < step && setStep(i)}
                  className="group w-full text-left disabled:cursor-default"
                  aria-label={`Step ${i + 1}: ${s}${i < step ? ' (completed — go back)' : i === step ? ' (current)' : ''}`}
                >
                  <span className={cx('block h-1.5 rounded-full transition-colors duration-500', i < step ? 'bg-pine-500' : i === step ? 'bg-accent shadow-[0_0_12px_rgba(34,197,94,0.6)]' : 'bg-paper-200')} />
                  <span className={cx('mt-2 hidden items-center gap-1 text-[0.82rem] font-semibold sm:flex', i <= step ? 'text-ink' : 'text-ink-500')}>
                    {i < step && <Check aria-hidden className="h-3.5 w-3.5 text-pine-700" />}
                    {s}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <section className="panel animate-rise intro-3 mt-6 p-5 md:p-8" aria-labelledby="step-h">
          <h2 id="step-h" ref={headingRef} tabIndex={-1} className="mb-1 text-[1.45rem] font-bold focus:outline-none">
            <span className="sr-only">Step {step + 1} of {STEPS.length}: </span>
            {[
              'Where are you, and what care do you need?',
              'What accommodations do you need?',
              'Your insurance',
              'Budget and getting there',
              'Review your profile',
            ][step]}
          </h2>
          <p className="mb-6 text-ink-600">
            {[
              'We use this to find nearby clinicians in the right specialty.',
              'Choose individual accommodations — you never have to name a diagnosis.',
              'Optional. It lets CareCost estimate your share of the medical bill.',
              'Travel is part of what care really costs. Add only what applies to you.',
              'Check everything looks right. You can edit your profile any time.',
            ][step]}
          </p>

          <div key={step} className="animate-rise">
          {step === 0 && <LocationSection value={draft} onChange={patch} errors={errors} />}
          {step === 1 && <NeedsSection value={draft} onChange={patch} />}
          {step === 2 && <InsuranceSection value={draft} onChange={patch} />}
          {step === 3 && <BudgetTravelSection value={draft} onChange={patch} />}
          {step === 4 && (
            <div className="space-y-5">
              {essentials.length === 0 && (
                <Callout tone="warn" title="No essential requirements selected">
                  CareCost will rank providers on cost alone. If any accommodation is a must-have, mark it Essential in step 2.
                </Callout>
              )}
              <dl className="divide-y divide-line rounded-xl border border-line">
                {[
                  { k: 'Care needed', v: `${SPECIALTY_BY_ID[draft.specialty].label} · ZIP ${draft.zip}`, s: 0 },
                  { k: 'Essential', v: essentials.map((id) => ACC_BY_ID[id].short).join(', ') || 'None', s: 1 },
                  { k: 'Preferred', v: preferred.map((id) => ACC_BY_ID[id].short).join(', ') || 'None', s: 1 },
                  { k: 'Insurance', v: PLAN_BY_ID[draft.planId]?.name ?? '—', s: 2 },
                  {
                    k: 'Budget & travel',
                    v: `${draft.budget !== null ? usd(draft.budget) + ' per visit' : 'No budget set'} · up to ${draft.maxDistance} mi · ${TRANSPORT_LABELS[draft.transport].label}`,
                    s: 3,
                  },
                ].map((r) => (
                  <div key={r.k} className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-center">
                    <dt className="w-40 shrink-0 text-sm font-bold text-ink-600">{r.k}</dt>
                    <dd className="flex-1">{r.v}</dd>
                    <dd>
                      <button type="button" className="btn-ghost min-h-[40px] px-3 text-sm" onClick={() => setStep(r.s)}>
                        <Pencil aria-hidden className="h-4 w-4" /> Edit<span className="sr-only"> {r.k}</span>
                      </button>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <button type="button" className="btn-secondary" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
              <ArrowLeft aria-hidden className="h-4 w-4" /> Back
            </button>
            <div className="flex flex-wrap gap-2">
              {step === 0 && !onboarded && (
                <button type="button" className="btn-ghost" onClick={() => { setDraft({ ...BLANK_PROFILE, zip: draft.zip }); }}>
                  Start from blank
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" className="btn-primary" onClick={next}>
                  Continue <ArrowRight aria-hidden className="h-4 w-4" />
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={finish}>
                  See my matches <ArrowRight aria-hidden className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
