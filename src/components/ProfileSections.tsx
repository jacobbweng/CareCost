// Form sections shared by setup (one per screen) and the profile page.
// Design rules: one question per block, big tap targets (≥48px), plain words,
// every control labeled, nothing required that isn't needed.
import {
  Accessibility,
  Activity,
  Bone,
  Brain,
  Bus,
  Car,
  CarTaxiFront,
  ChevronDown,
  CircleQuestionMark,
  Ear,
  Eye,
  HandCoins,
  Landmark,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Plus,
  ShieldPlus,
  Sparkles,
  Stethoscope,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { ACCOMMODATIONS, ACC_BY_ID, CATEGORY_META } from '../data/accommodations';
import { IRS_SOURCE } from '../data/benchmarks';
import { PLAN_BY_ID, PLAN_CHOICES } from '../data/plans';
import { SPECIALTIES } from '../data/providers';
import { aiAvailable, suggestNeedsWithAI } from '../lib/ai';
import { locateUser } from '../lib/location';
import { NEEDS_EXAMPLE, parseNeeds, type NeedSuggestion } from '../lib/needsParser';
import { geocodeZip } from '../lib/realProviders';
import type { AccCategory, AccId, NeedLevel, Profile, SpecialtyId, TransportMode } from '../lib/types';
import { NumberField, Term, cx } from './ui';

type Patch = (p: Partial<Profile>) => void;

export const CATEGORY_ICON: Record<AccCategory, ReactNode> = {
  mobility: <Accessibility aria-hidden className="h-5 w-5" />,
  hearing: <Ear aria-hidden className="h-5 w-5" />,
  vision: <Eye aria-hidden className="h-5 w-5" />,
  sensory: <Brain aria-hidden className="h-5 w-5" />,
};

// ── Big choice cards (radio group) ─────────────────────────

export function ChoiceCards<T extends string>({
  legend,
  value,
  options,
  onChange,
  columns = 2,
  hideLegend,
}: {
  legend: string;
  value: T | null;
  options: { value: T; label: string; hint?: string; icon?: ReactNode }[];
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3;
  hideLegend?: boolean;
}) {
  return (
    <fieldset>
      <legend className={hideLegend ? 'sr-only' : 'mb-3 text-lg font-bold'}>{legend}</legend>
      <div className={cx('grid gap-3', columns === 2 && 'sm:grid-cols-2', columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3')}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <label
              key={o.value}
              className={cx(
                'group flex min-h-[64px] cursor-pointer items-center gap-4 rounded-2xl border-2 px-4 py-3.5 transition-all focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-pine-600',
                on ? 'border-pine-500 bg-pine-50 shadow-glow' : 'border-line bg-surface hover:border-pine-300',
              )}
            >
              <input type="radio" className="sr-only" checked={on} onChange={() => onChange(o.value)} />
              {o.icon && <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-xl', on ? 'bg-accent text-accent-ink' : 'bg-paper-200 text-pine-700')}>{o.icon}</span>}
              <span className="min-w-0 flex-1">
                <span className="block text-[1.05rem] font-bold text-white">{o.label}</span>
                {o.hint && <span className="block text-sm text-ink-600">{o.hint}</span>}
              </span>
              <span aria-hidden className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full border-2', on ? 'border-accent bg-accent' : 'border-ink-500')}>
                {on && <span className="h-2.5 w-2.5 rounded-full bg-accent-ink" />}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// ── 1. You + location ──────────────────────────────────────

export function validateLocation(p: Profile) {
  const errors: Record<string, string> = {};
  if (!p.location) errors.zip = 'Use your location or enter your ZIP code.';
  return errors;
}

export function LocationSection({ value, onChange, errors = {} }: { value: Profile; onChange: Patch; errors?: Record<string, string> }) {
  const [busy, setBusy] = useState<'gps' | 'zip' | null>(null);
  const [err, setErr] = useState('');
  const [zip, setZip] = useState(value.location?.zip ?? value.zip ?? '');

  const useGps = async () => {
    setBusy('gps');
    setErr('');
    try {
      const l = await locateUser();
      onChange({ location: l, zip: l.zip ?? value.zip });
      if (l.zip) setZip(l.zip);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const useZip = async () => {
    setBusy('zip');
    setErr('');
    try {
      const l = await geocodeZip(zip.trim());
      onChange({ location: l, zip: l.zip });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const shownErr = err || errors.zip;

  return (
    <div className="space-y-8">
      <div>
        <label htmlFor="name" className="mb-2 block text-lg font-bold">Your first name <span className="font-normal text-ink-500">(optional)</span></label>
        <input id="name" className="input max-w-sm text-lg" autoComplete="given-name" value={value.name} placeholder="e.g. Jordan" onChange={(e) => onChange({ name: e.target.value })} />
      </div>

      <div>
        <p className="mb-3 text-lg font-bold" id="where-h">Where are you?</p>
        {value.location ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-pine-500 bg-pine-50 px-4 py-3.5" role="status">
            <MapPin aria-hidden className="h-6 w-6 text-pine-700" />
            <span className="flex-1 text-[1.05rem] font-bold text-white">{value.location.label}{value.location.zip ? ` · ${value.location.zip}` : ''}</span>
            <button type="button" className="btn-ghost min-h-[40px] px-3 text-sm" onClick={() => onChange({ location: null })}>Change</button>
          </div>
        ) : (
          <div className="space-y-4" aria-labelledby="where-h">
            <button type="button" className="btn-primary min-h-[56px] w-full text-lg sm:w-auto sm:px-8" onClick={useGps} disabled={busy !== null}>
              {busy === 'gps' ? <LoaderCircle aria-hidden className="h-5 w-5 animate-spin" /> : <LocateFixed aria-hidden className="h-5 w-5" />}
              {busy === 'gps' ? 'Finding you…' : 'Use my location'}
            </button>
            <div className="flex items-center gap-3 text-sm text-ink-500"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void useZip();
              }}
            >
              <div>
                <label htmlFor="zip" className="field-label">ZIP code</label>
                <input
                  id="zip"
                  className="input num w-40 text-lg"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={5}
                  value={zip}
                  aria-invalid={shownErr ? true : undefined}
                  aria-describedby={shownErr ? 'zip-err' : undefined}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                />
              </div>
              <button type="submit" className="btn-secondary min-h-[48px]" disabled={zip.length !== 5 || busy !== null}>
                {busy === 'zip' ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" /> : null} Use this ZIP
              </button>
            </form>
          </div>
        )}
        {shownErr && !value.location && <p id="zip-err" role="alert" className="mt-3 font-semibold text-rust-700">{shownErr}</p>}
        <p className="mt-3 text-sm text-ink-500">Stays on this device. Only used to find clinics near you.</p>
      </div>
    </div>
  );
}

// ── 2. Care type ───────────────────────────────────────────

const SPECIALTY_ICON: Record<SpecialtyId, ReactNode> = {
  primary_care: <Stethoscope aria-hidden className="h-6 w-6" />,
  neurology: <Brain aria-hidden className="h-6 w-6" />,
  orthopedics: <Bone aria-hidden className="h-6 w-6" />,
  pmr: <Activity aria-hidden className="h-6 w-6" />,
};
const SPECIALTY_HINT: Record<SpecialtyId, string> = {
  primary_care: 'Check-ups, everyday health',
  neurology: 'Brain, nerves, seizures, MS',
  orthopedics: 'Bones, joints, muscles',
  pmr: 'Rehab, mobility, chronic pain',
};

export function CareSection({ value, onChange }: { value: Profile; onChange: Patch }) {
  const order: SpecialtyId[] = ['primary_care', 'neurology', 'orthopedics', 'pmr'];
  return (
    <ChoiceCards<SpecialtyId>
      legend="What kind of care do you need?"
      value={value.specialty}
      onChange={(v) => onChange({ specialty: v })}
      options={order.map((id) => ({ value: id, label: SPECIALTIES.find((s) => s.id === id)!.label, hint: SPECIALTY_HINT[id], icon: SPECIALTY_ICON[id] }))}
    />
  );
}

// ── 3. Accessibility needs ─────────────────────────────────

const COMMON: AccId[] = ['step_free_entrance', 'accessible_exam_room', 'accessible_restroom', 'asl_interpreter', 'quiet_waiting', 'extended_appointments'];

function NeedRow({ id, level, onSet }: { id: AccId; level: NeedLevel | undefined; onSet: (l: NeedLevel | null) => void }) {
  const a = ACC_BY_ID[id];
  const btn = (l: NeedLevel, text: string) => (
    <button
      type="button"
      aria-pressed={level === l}
      onClick={() => onSet(level === l ? null : l)}
      className={cx(
        'min-h-[44px] flex-1 rounded-xl border-2 px-3 text-sm font-bold transition-colors sm:flex-none',
        level === l ? (l === 'essential' ? 'border-accent bg-accent text-accent-ink' : 'border-pine-500 bg-pine-100 text-white') : 'border-line text-ink-700 hover:border-pine-300',
      )}
    >
      {text}
      <span className="sr-only"> — {a.label}</span>
    </button>
  );
  return (
    <li className={cx('flex flex-col gap-3 rounded-2xl border-2 p-4 sm:flex-row sm:items-center', level ? 'border-pine-300 bg-pine-50/60' : 'border-line bg-surface')}>
      <div className="min-w-0 flex-1">
        <p className="text-[1.05rem] font-bold text-white">{a.label}</p>
        <p className="text-sm text-ink-600">{a.description}</p>
      </div>
      <div className="flex gap-2" role="group" aria-label={a.label}>
        {btn('essential', 'Must have')}
        {btn('preferred', 'Nice to have')}
      </div>
    </li>
  );
}

export function NeedsSection({ value, onChange }: { value: Profile; onChange: Patch }) {
  const [showAll, setShowAll] = useState(false);
  const set = (id: AccId, l: NeedLevel | null) => {
    const needs = { ...value.needs };
    if (l) needs[id] = l;
    else delete needs[id];
    onChange({ needs });
  };
  const chosen = Object.keys(value.needs).length;
  const others = (Object.keys(CATEGORY_META) as AccCategory[]).map((cat) => ({ cat, items: ACCOMMODATIONS.filter((a) => a.category === cat && !COMMON.includes(a.id)) }));

  return (
    <div className="space-y-6">
      <p className="text-ink-600">
        <strong className="text-white">Must have</strong> = we never recommend a clinic that can’t do it. <strong className="text-white">Nice to have</strong> = it helps the ranking. Skip anything you don’t need.
      </p>
      <ul className="space-y-3">
        {COMMON.map((id) => <NeedRow key={id} id={id} level={value.needs[id]} onSet={(l) => set(id, l)} />)}
      </ul>

      <button type="button" className="btn-secondary w-full" aria-expanded={showAll} aria-controls="more-needs" onClick={() => setShowAll((s) => !s)}>
        <ChevronDown aria-hidden className={cx('h-5 w-5 transition-transform', showAll && 'rotate-180')} />
        {showAll ? 'Show fewer' : `More options (${ACCOMMODATIONS.length - COMMON.length})`}
      </button>
      <div id="more-needs" hidden={!showAll} className="space-y-6">
        {others.map(({ cat, items }) =>
          items.length ? (
            <section key={cat} aria-labelledby={`cat-${cat}`}>
              <h3 id={`cat-${cat}`} className="mb-3 flex items-center gap-2 font-bold text-pine-800">{CATEGORY_ICON[cat]} {CATEGORY_META[cat].label}</h3>
              <ul className="space-y-3">{items.map((a) => <NeedRow key={a.id} id={a.id} level={value.needs[a.id]} onSet={(l) => set(a.id, l)} />)}</ul>
            </section>
          ) : null,
        )}
      </div>

      <DescribeNeeds value={value} onApply={(needs) => onChange({ needs: { ...value.needs, ...needs } })} />
      <p className="text-sm text-ink-500" aria-live="polite">{chosen ? `${chosen} selected.` : 'Nothing selected yet — that’s okay.'}</p>
    </div>
  );
}

function DescribeNeeds({ value, onApply }: { value: Profile; onApply: (n: Partial<Record<AccId, NeedLevel>>) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sugs, setSugs] = useState<NeedSuggestion[] | null>(null);
  const [accepted, setAccepted] = useState<Record<string, NeedLevel | 'skip'>>({});
  const [applied, setApplied] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState('');
  const showSugs = (s: NeedSuggestion[]) => {
    setSugs(s);
    setApplied(false);
    setAccepted(Object.fromEntries(s.map((x) => [x.id, value.needs[x.id] ?? x.level])));
  };
  const askAI = async () => {
    setAiBusy(true);
    setAiErr('');
    try {
      const r = await suggestNeedsWithAI(text);
      showSugs(r.map((n) => ({ id: n.id, level: n.level, matched: [n.reason || 'AI suggestion'], clause: text })));
    } catch (e) {
      setAiErr((e as Error).message);
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border-2 border-dashed border-pine-300 p-4" aria-labelledby="describe-h">
      <h3 id="describe-h" className="m-0">
        <button type="button" className="flex w-full items-center gap-2 text-left text-[1.05rem] font-bold" aria-expanded={open} aria-controls="describe-panel" onClick={() => setOpen((o) => !o)}>
          <Sparkles aria-hidden className="h-5 w-5 text-pine-700" /> Or describe it in your own words
          <ChevronDown aria-hidden className={cx('ml-auto h-5 w-5 transition-transform', open && 'rotate-180')} />
        </button>
      </h3>
      <div id="describe-panel" hidden={!open} className="mt-3">
        <label htmlFor="needs-text" className="sr-only">Describe your access needs</label>
        <textarea id="needs-text" className="input min-h-[100px] text-lg" placeholder={`e.g. ${NEEDS_EXAMPLE}`} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          {aiAvailable() && (
            <button type="button" className="btn-primary" disabled={!text.trim() || aiBusy} onClick={askAI}>
              <Sparkles aria-hidden className="h-4 w-4" /> {aiBusy ? 'Thinking…' : 'Ask AI'}
            </button>
          )}
          <button type="button" className={aiAvailable() ? 'btn-secondary' : 'btn-primary'} disabled={!text.trim()} onClick={() => showSugs(parseNeeds(text))}>
            Suggest
          </button>
        </div>
        {aiAvailable() && <p className="mt-2 text-xs text-ink-500">“Ask AI” sends only this text to DeepSeek. You confirm every suggestion.</p>}
        <div aria-live="polite">
          {aiErr && <p role="alert" className="mt-3 text-sm font-semibold text-rust-700">{aiErr}</p>}
          {sugs && sugs.length === 0 && <p className="mt-3 font-semibold">No matches. Try words like stairs, noise or phone calls — or pick from the list above.</p>}
          {sugs && sugs.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="font-semibold">{sugs.length} suggestion{sugs.length > 1 ? 's' : ''} — review before adding:</p>
              <ul className="space-y-2">
                {sugs.map((s) => (
                  <li key={s.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <p className="font-semibold">{ACC_BY_ID[s.id].label}</p>
                      <p className="text-sm text-ink-600">From: “{s.matched.join('”, “')}”</p>
                    </div>
                    <div className="flex gap-1.5" role="group" aria-label={`Add ${ACC_BY_ID[s.id].label} as`}>
                      {(['essential', 'preferred', 'skip'] as const).map((l) => (
                        <button
                          key={l}
                          type="button"
                          aria-pressed={(accepted[s.id] ?? s.level) === l}
                          onClick={() => setAccepted((a) => ({ ...a, [s.id]: l }))}
                          className={cx('min-h-[40px] rounded-lg border-2 px-3 text-sm font-bold', (accepted[s.id] ?? s.level) === l ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-700')}
                        >
                          {l === 'essential' ? 'Must have' : l === 'preferred' ? 'Nice to have' : 'Skip'}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const n: Partial<Record<AccId, NeedLevel>> = {};
                  for (const [id, lvl] of Object.entries(accepted)) if (lvl !== 'skip') n[id as AccId] = lvl;
                  onApply(n);
                  setApplied(true);
                }}
              >
                Add these
              </button>
              {applied && <p className="text-sm font-semibold text-pine-800" role="status">Added. You’ll see them checked above.</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── 4. Payment ─────────────────────────────────────────────

const PLAN_ICON: Record<string, ReactNode> = {
  private: <ShieldPlus aria-hidden className="h-6 w-6" />,
  medicare: <Landmark aria-hidden className="h-6 w-6" />,
  medicaid: <HandCoins aria-hidden className="h-6 w-6" />,
  'self-pay': <Wallet aria-hidden className="h-6 w-6" />,
  unknown: <CircleQuestionMark aria-hidden className="h-6 w-6" />,
};

export function InsuranceSection({ value, onChange }: { value: Profile; onChange: Patch }) {
  const plan = PLAN_BY_ID[value.planId];
  const ins = value.insurance;
  const setIns = (p: Partial<Profile['insurance']>) => onChange({ insurance: { ...ins, ...p } });
  const hasNumbers = plan && (plan.method === 'copay' || plan.method === 'deductible_coinsurance');
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-6">
      <ChoiceCards
        legend="How do you pay for care?"
        value={value.planId}
        onChange={(v) => onChange({ planId: v })}
        options={PLAN_CHOICES.map((p) => ({ value: p.id, label: p.name, hint: p.short, icon: PLAN_ICON[p.id] }))}
      />
      {plan && <p className="rounded-xl bg-paper-100 px-4 py-3 text-ink-700">{plan.description}</p>}

      {hasNumbers && (
        <section className="rounded-2xl border border-line p-4">
          <h3 className="m-0">
            <button type="button" className="flex w-full items-center gap-2 text-left font-bold" aria-expanded={open} aria-controls="plan-numbers" onClick={() => setOpen((o) => !o)}>
              I know my plan’s numbers <span className="font-normal text-ink-500">(optional — makes estimates closer)</span>
              <ChevronDown aria-hidden className={cx('ml-auto h-5 w-5 transition-transform', open && 'rotate-180')} />
            </button>
          </h3>
          <div id="plan-numbers" hidden={!open} className="mt-4 space-y-4">
            <fieldset>
              <legend className="field-label">At the doctor, I pay…</legend>
              <div className="flex flex-wrap gap-2">
                {([
                  ['deductible_coinsurance', 'Deductible, then a %'],
                  ['copay', 'A flat copay'],
                ] as const).map(([m, l]) => (
                  <button key={m} type="button" aria-pressed={ins.method === m} onClick={() => setIns({ method: m })} className={cx('min-h-[44px] rounded-xl border-2 px-4 font-bold', ins.method === m ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-700')}>
                    {l}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              {ins.method === 'copay' ? (
                <NumberField id="copay" label={<>Your <Term term="copay">copay</Term></>} prefix="$" value={ins.copay} onChange={(v) => setIns({ copay: v })} hint="On your insurance card. Blank = not sure." />
              ) : (
                <>
                  <NumberField id="ded" label={<><Term term="deductible">Deductible</Term> left this year</>} prefix="$" value={ins.deductibleRemaining} onChange={(v) => setIns({ deductibleRemaining: v })} hint="Blank = not sure." />
                  <NumberField id="coins" label={<>Your share (<Term term="coinsurance">coinsurance</Term>)</>} suffix="%" max={100} value={ins.coinsurancePct} onChange={(v) => setIns({ coinsurancePct: v })} hint="Often 20%." />
                </>
              )}
              {plan.kind !== 'Medicare' && <NumberField id="oop" label={<><Term term="out-of-pocket maximum">Out-of-pocket max</Term> left</>} prefix="$" value={ins.oopRemaining} onChange={(v) => setIns({ oopRemaining: v })} hint="Blank = not sure." />}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// ── 5. Travel ──────────────────────────────────────────────

export const TRANSPORT_CHOICES: { value: TransportMode; label: string; hint: string; icon: ReactNode }[] = [
  { value: 'own_vehicle', label: 'I drive', hint: 'Including an adapted vehicle', icon: <Car aria-hidden className="h-6 w-6" /> },
  { value: 'driven_by_someone', label: 'Someone drives me', hint: 'Family, friend or aide', icon: <Users aria-hidden className="h-6 w-6" /> },
  { value: 'accessible_rideshare', label: 'Accessible taxi or rideshare', hint: 'Wheelchair-accessible vehicle', icon: <CarTaxiFront aria-hidden className="h-6 w-6" /> },
  { value: 'paratransit', label: 'Paratransit', hint: 'Door-to-door, booked ahead', icon: <Accessibility aria-hidden className="h-6 w-6" /> },
  { value: 'public_transit', label: 'Bus or train', hint: 'Accessible public transit', icon: <Bus aria-hidden className="h-6 w-6" /> },
];

export function BudgetTravelSection({ value, onChange }: { value: Profile; onChange: Patch }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-8">
      <ChoiceCards<TransportMode> legend="How will you get there?" value={value.transport} onChange={(v) => onChange({ transport: v })} options={TRANSPORT_CHOICES} />
      {(value.transport === 'own_vehicle' || value.transport === 'driven_by_someone') && <p className="-mt-4 text-sm text-ink-500">Driving cost uses the {IRS_SOURCE}.</p>}

      <fieldset>
        <legend className="mb-3 text-lg font-bold">How far will you travel?</legend>
        <div className="flex flex-wrap gap-2">
          {[5, 10, 15, 25].map((m) => (
            <button key={m} type="button" aria-pressed={value.maxDistance === m} onClick={() => onChange({ maxDistance: m })} className={cx('min-h-[52px] min-w-[96px] rounded-2xl border-2 px-4 text-lg font-bold', value.maxDistance === m ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-700 hover:border-pine-300')}>
              {m} miles
            </button>
          ))}
        </div>
      </fieldset>

      <section className="rounded-2xl border border-line p-4">
        <h3 className="m-0">
          <button type="button" className="flex w-full items-center gap-2 text-left font-bold" aria-expanded={open} aria-controls="extra-costs" onClick={() => setOpen((o) => !o)}>
            Budget and other costs <span className="font-normal text-ink-500">(optional)</span>
            <ChevronDown aria-hidden className={cx('ml-auto h-5 w-5 transition-transform', open && 'rotate-180')} />
          </button>
        </h3>
        <div id="extra-costs" hidden={!open} className="mt-4 grid gap-4 sm:grid-cols-3">
          <NumberField id="budget" label="Most I can spend per visit" prefix="$" value={value.budget} onChange={(v) => onChange({ budget: v })} hint="We flag clinics above this." />
          <NumberField id="assist" label="Paid help per visit" prefix="$" allowEmpty={false} value={value.extras.assistance} onChange={(v) => onChange({ extras: { ...value.extras, assistance: v ?? 0 } })} hint="For example, an aide’s time." />
          <NumberField id="other" label="Other costs per visit" prefix="$" allowEmpty={false} value={value.extras.other} onChange={(v) => onChange({ extras: { ...value.extras, other: v ?? 0 } })} hint="For example, childcare." />
        </div>
      </section>
    </div>
  );
}

// ── Access Card details ────────────────────────────────────

export function EditableList({ label, items, onChange, placeholder, addLabel }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder: string; addLabel: string }) {
  const [draft, setDraft] = useState('');
  const id = label.replace(/\W+/g, '-').toLowerCase();
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    onChange([...items, t]);
    setDraft('');
  };
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      {items.length > 0 && (
        <ul className="mb-3 space-y-2">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5">
              <span className="flex-1 text-[0.95rem]">{it}</span>
              <button type="button" className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-paper-100 hover:text-rust-700" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove: ${it}`}>
                <X aria-hidden className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input id={id} className="input" value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
        <button type="button" className="btn-secondary shrink-0" onClick={add} disabled={!draft.trim()}>
          <Plus aria-hidden className="h-4 w-4" /> {addLabel}
        </button>
      </div>
    </div>
  );
}

export function CommunicationSection({ value, onChange }: { value: Profile; onChange: Patch }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <EditableList label="How staff should communicate with me" items={value.communication} onChange={(communication) => onChange({ communication })} placeholder="e.g. Please face me when speaking" addLabel="Add" />
      <EditableList label="Questions to ask the doctor" items={value.questions} onChange={(questions) => onChange({ questions })} placeholder="e.g. Will I need any tests?" addLabel="Add" />
    </div>
  );
}
