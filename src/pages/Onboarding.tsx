import { ArrowLeft, ArrowRight, Check, Map as MapIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '../components/Layout';
import { BudgetTravelSection, CareSection, InsuranceSection, LocationSection, NeedsSection, validateLocation } from '../components/ProfileSections';
import { cx } from '../components/ui';
import { PLAN_BY_ID } from '../data/plans';
import type { Profile } from '../lib/types';
import { href, navigate } from '../state/router';
import { useStore } from '../state/store';

const STEPS = [
  { short: 'You', title: 'Let’s start with you' },
  { short: 'Care', title: 'What care do you need?' },
  { short: 'Access', title: 'What do you need at the clinic?' },
  { short: 'Paying', title: 'How do you pay?' },
  { short: 'Travel', title: 'How will you get there?' },
] as const;

export function Onboarding() {
  const { profile, completeOnboarding, onboarded } = useStore();
  const [draft, setDraft] = useState<Profile>(profile);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
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
          next.insurance = { method: plan.method, copay: plan.copay, deductibleRemaining: plan.deductibleRemaining, coinsurancePct: plan.coinsurancePct, oopRemaining: plan.oopRemaining };
        }
      }
      return next;
    });
    if (p.location) setErrors({});
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
    if (step < STEPS.length - 1) setStep(step + 1);
    else {
      completeOnboarding(draft);
      navigate('/map');
    }
  };
  const last = step === STEPS.length - 1;

  return (
    <div className="min-h-screen pb-32">
      <a href="#main" className="sr-only-focusable fixed left-3 top-3 z-50 rounded-lg bg-surface px-4 py-2 font-semibold text-pine-900 shadow-lift">Skip to main content</a>
      <header className="mx-auto flex max-w-[760px] items-center justify-between px-5 py-5">
        <a href={href('/')} aria-label="CareCost home"><Logo /></a>
        <a href={href(onboarded ? '/dashboard' : '/')} className="btn-ghost">Exit</a>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-[760px] px-5 focus:outline-none">
        <h1 id="page-title" tabIndex={-1} className="sr-only">Set up CareCost</h1>

        {/* Progress */}
        <nav aria-label="Setup progress">
          <p className="mb-3 text-sm font-semibold text-ink-600" aria-live="polite">Step {step + 1} of {STEPS.length}</p>
          <ol className="flex gap-2">
            {STEPS.map((s, i) => (
              <li key={s.short} className="flex-1" aria-current={i === step ? 'step' : undefined}>
                <button
                  type="button"
                  disabled={i > step}
                  onClick={() => i < step && setStep(i)}
                  className="w-full text-left disabled:cursor-default"
                  aria-label={`Step ${i + 1}: ${s.short}${i < step ? ' (done — go back)' : i === step ? ' (current)' : ''}`}
                >
                  <span className={cx('block h-2 rounded-full transition-colors duration-500', i < step ? 'bg-pine-500' : i === step ? 'bg-accent shadow-[0_0_12px_rgba(34,197,94,0.6)]' : 'bg-paper-200')} />
                  <span className={cx('mt-2 hidden items-center gap-1 text-sm font-semibold sm:flex', i <= step ? 'text-white' : 'text-ink-500')}>
                    {i < step && <Check aria-hidden className="h-3.5 w-3.5 text-pine-700" />}
                    {s.short}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <section className="animate-rise mt-8" aria-labelledby="step-h" key={step}>
          <h2 id="step-h" ref={headingRef} tabIndex={-1} className="mb-6 text-[2rem] font-extrabold leading-tight tracking-tight focus:outline-none md:text-[2.4rem]">
            {step === 0 && draft.name ? `Hi ${draft.name}!` : STEPS[step].title}
          </h2>
          {step === 0 && <LocationSection value={draft} onChange={patch} errors={errors} />}
          {step === 1 && <CareSection value={draft} onChange={patch} />}
          {step === 2 && <NeedsSection value={draft} onChange={patch} />}
          {step === 3 && <InsuranceSection value={draft} onChange={patch} />}
          {step === 4 && <BudgetTravelSection value={draft} onChange={patch} />}
        </section>
      </main>

      {/* Sticky actions — always in the same place, easy to reach */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-shell/90 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[760px] items-center justify-between gap-3 px-5 py-4">
          <button type="button" className="btn-secondary min-h-[52px] px-5" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            <ArrowLeft aria-hidden className="h-5 w-5" /> Back
          </button>
          <button type="button" className="btn-primary min-h-[52px] px-7 text-lg" onClick={next}>
            {last ? <><MapIcon aria-hidden className="h-5 w-5" /> Show my map</> : <>Next <ArrowRight aria-hidden className="h-5 w-5" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
