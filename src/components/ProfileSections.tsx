import { Accessibility, Brain, Ear, Eye, Plus, Sparkles, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { ACCOMMODATIONS, ACC_BY_ID, CATEGORY_META } from '../data/accommodations';
import { PLANS, PLAN_BY_ID, TRANSPORT_LABELS } from '../data/plans';
import { AREAS, SPECIALTIES } from '../data/providers';
import { NEEDS_EXAMPLE, parseNeeds, type NeedSuggestion } from '../lib/needsParser';
import type { AccCategory, AccId, NeedLevel, Profile, TransportMode } from '../lib/types';
import { NumberField, Segmented, Term, cx } from './ui';

type Patch = (p: Partial<Profile>) => void;

export const CATEGORY_ICON: Record<AccCategory, ReactNode> = {
  mobility: <Accessibility aria-hidden className="h-5 w-5" />,
  hearing: <Ear aria-hidden className="h-5 w-5" />,
  vision: <Eye aria-hidden className="h-5 w-5" />,
  sensory: <Brain aria-hidden className="h-5 w-5" />,
};

export function validateLocation(p: Profile) {
  const errors: Record<string, string> = {};
  if (!/^\d{5}$/.test(p.zip.trim())) errors.zip = 'Enter a 5-digit ZIP code, for example 30301.';
  return errors;
}

export function LocationSection({ value, onChange, errors = {} }: { value: Profile; onChange: Patch; errors?: Record<string, string> }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <label htmlFor="zip" className="field-label">ZIP code</label>
        <input
          id="zip"
          className="input num max-w-[12rem]"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          value={value.zip}
          aria-invalid={errors.zip ? true : undefined}
          aria-describedby={errors.zip ? 'zip-err' : 'zip-hint'}
          onChange={(e) => onChange({ zip: e.target.value.replace(/\D/g, '').slice(0, 5) })}
        />
        {errors.zip ? (
          <p id="zip-err" className="mt-1 text-sm font-semibold text-rust-700">{errors.zip}</p>
        ) : (
          <p id="zip-hint" className="field-hint">Used only on this device. We never ask for your street address.</p>
        )}
      </div>
      <div>
        <label htmlFor="area" className="field-label">Starting neighborhood (demo region)</label>
        <select id="area" className="input" value={value.homeAreaId} onChange={(e) => onChange({ homeAreaId: e.target.value })} aria-describedby="area-hint">
          {AREAS.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <p id="area-hint" className="field-hint">Distances are measured on a fictional demo map, so this stands in for your real location.</p>
      </div>
      <div className="md:col-span-2">
        <label htmlFor="specialty" className="field-label">What kind of care do you need?</label>
        <select id="specialty" className="input max-w-md" value={value.specialty} onChange={(e) => onChange({ specialty: e.target.value as Profile['specialty'] })}>
          {SPECIALTIES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <p className="field-hint">You don&rsquo;t need to share a diagnosis — just the type of clinician you&rsquo;re looking for.</p>
      </div>
    </div>
  );
}

const LEVEL_OPTIONS: { value: 'none' | NeedLevel; label: string }[] = [
  { value: 'none', label: 'Not needed' },
  { value: 'preferred', label: 'Preferred' },
  { value: 'essential', label: 'Essential' },
];

export function NeedsSection({ value, onChange }: { value: Profile; onChange: Patch }) {
  const setLevel = (id: AccId, level: 'none' | NeedLevel) => {
    const needs = { ...value.needs };
    if (level === 'none') delete needs[id];
    else needs[id] = level;
    onChange({ needs });
  };
  const counts = (cat: AccCategory) => ACCOMMODATIONS.filter((a) => a.category === cat && value.needs[a.id]).length;
  const [open, setOpen] = useState<Record<AccCategory, boolean>>({ mobility: true, hearing: false, vision: false, sensory: false });

  return (
    <div className="space-y-6">
      <DescribeNeeds value={value} onApply={(needs) => onChange({ needs: { ...value.needs, ...needs } })} />

      <div className="rounded-xl border border-line bg-paper-100/60 px-4 py-3 text-[0.95rem] text-ink-700">
        <strong className="text-ink">Essential</strong> means CareCost will never recommend a provider that confirms it can&rsquo;t provide it.{' '}
        <strong className="text-ink">Preferred</strong> improves a provider&rsquo;s ranking but isn&rsquo;t required.
      </div>

      {(Object.keys(CATEGORY_META) as AccCategory[]).map((cat) => (
        <section key={cat} className="rounded-xl2 border border-line bg-surface" aria-labelledby={`cat-${cat}`}>
          <h3 id={`cat-${cat}`} className="m-0">
            <button
              type="button"
              aria-expanded={open[cat]}
              aria-controls={`cat-panel-${cat}`}
              onClick={() => setOpen((o) => ({ ...o, [cat]: !o[cat] }))}
              className="flex w-full items-center gap-3 rounded-xl2 px-5 py-4 text-left"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-pine-50 text-pine-800">{CATEGORY_ICON[cat]}</span>
              <span className="flex-1">
                <span className="block text-[1.05rem] font-bold">{CATEGORY_META[cat].label}</span>
                <span className="block text-sm font-normal text-ink-600">{CATEGORY_META[cat].description}</span>
              </span>
              {counts(cat) > 0 && <span className="chip bg-pine-100 text-pine-900">{counts(cat)} selected</span>}
              <span aria-hidden className={cx('text-xl text-ink-500 transition-transform', open[cat] && 'rotate-90')}>›</span>
            </button>
          </h3>
          <div id={`cat-panel-${cat}`} hidden={!open[cat]} className="border-t border-line px-5 py-2">
            <ul className="divide-y divide-line">
              {ACCOMMODATIONS.filter((a) => a.category === cat).map((a) => {
                const lvl = value.needs[a.id] ?? 'none';
                return (
                  <li key={a.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-xl">
                      <p className="font-semibold">{a.label}</p>
                      <p className="text-sm text-ink-600">{a.description}</p>
                    </div>
                    <Segmented legend={a.label} hideLegend size="sm" value={lvl} options={LEVEL_OPTIONS} onChange={(v) => setLevel(a.id, v)} />
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}

function DescribeNeeds({ value, onApply }: { value: Profile; onApply: (n: Partial<Record<AccId, NeedLevel>>) => void }) {
  const [text, setText] = useState('');
  const [sugs, setSugs] = useState<NeedSuggestion[] | null>(null);
  const [accepted, setAccepted] = useState<Record<string, NeedLevel | 'skip'>>({});
  const [applied, setApplied] = useState(false);

  return (
    <section className="rounded-xl2 border border-pine-200 bg-pine-50/60 p-5" aria-labelledby="describe-h">
      <h3 id="describe-h" className="flex items-center gap-2 text-[1.05rem] font-bold">
        <Sparkles aria-hidden className="h-5 w-5 text-pine-700" /> Describe your needs in your own words <span className="font-normal text-ink-600">(optional)</span>
      </h3>
      <p className="mt-1 text-sm text-ink-700">
        CareCost suggests matching accommodations for you to confirm. Language matching runs on this device — your words are not sent anywhere.
      </p>
      <label htmlFor="needs-text" className="sr-only">Describe your access needs</label>
      <textarea
        id="needs-text"
        className="input mt-3 min-h-[96px]"
        placeholder={`For example: "${NEEDS_EXAMPLE}"`}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={!text.trim()}
          onClick={() => {
            const s = parseNeeds(text);
            setSugs(s);
            setApplied(false);
            setAccepted(Object.fromEntries(s.map((x) => [x.id, value.needs[x.id] ?? x.level])));
          }}
        >
          Suggest accommodations
        </button>
        <button type="button" className="btn-ghost" onClick={() => setText(NEEDS_EXAMPLE)}>Use an example</button>
      </div>
      <div aria-live="polite">
        {sugs && sugs.length === 0 && <p className="mt-3 text-sm font-semibold">No matches found. Try describing what is hard (for example, stairs, noise, phone calls) or pick from the lists below.</p>}
        {sugs && sugs.length > 0 && (
          <div className="mt-4 rounded-xl border border-line bg-surface p-4">
            <p className="font-semibold">{sugs.length} suggestion{sugs.length > 1 ? 's' : ''} — review before adding:</p>
            <ul className="mt-2 divide-y divide-line">
              {sugs.map((s) => (
                <li key={s.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold">{ACC_BY_ID[s.id].label}</p>
                    <p className="text-sm text-ink-600">Because you wrote: &ldquo;{s.matched.join('”, “')}&rdquo;</p>
                  </div>
                  <Segmented
                    legend={`Add ${ACC_BY_ID[s.id].label} as`}
                    hideLegend
                    size="sm"
                    value={(accepted[s.id] ?? s.level) as string}
                    onChange={(v) => setAccepted((a) => ({ ...a, [s.id]: v as NeedLevel | 'skip' }))}
                    options={[
                      { value: 'skip', label: 'Skip' },
                      { value: 'preferred', label: 'Preferred' },
                      { value: 'essential', label: 'Essential' },
                    ]}
                  />
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="btn-primary mt-2"
              onClick={() => {
                const n: Partial<Record<AccId, NeedLevel>> = {};
                for (const [id, lvl] of Object.entries(accepted)) if (lvl !== 'skip') n[id as AccId] = lvl;
                onApply(n);
                setApplied(true);
              }}
            >
              Add to my profile
            </button>
            {applied && <p className="mt-2 text-sm font-semibold text-pine-800" role="status">Added. You can fine-tune them in the lists below.</p>}
          </div>
        )}
      </div>
    </section>
  );
}

export function InsuranceSection({ value, onChange }: { value: Profile; onChange: Patch }) {
  const plan = PLAN_BY_ID[value.planId];
  const editable = plan && plan.method !== 'self_pay' && plan.method !== 'unknown';
  const ins = value.insurance;
  const setIns = (p: Partial<Profile['insurance']>) => onChange({ insurance: { ...ins, ...p } });
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="field-label">Insurance plan (optional)</legend>
        <p className="field-hint mb-3 mt-0">Real plans can&rsquo;t be looked up in this demo. Try a sample plan, or enter your own numbers.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {PLANS.map((p) => (
            <label
              key={p.id}
              className={cx(
                'flex cursor-pointer gap-3 rounded-xl border bg-surface p-4 transition-colors focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-pine-600',
                value.planId === p.id ? 'border-pine-600 ring-1 ring-pine-600' : 'border-line hover:border-pine-300',
              )}
            >
              <input type="radio" name="plan" className="mt-1 h-5 w-5 accent-pine-700" checked={value.planId === p.id} onChange={() => onChange({ planId: p.id })} />
              <span>
                <span className="block font-semibold">{p.name}</span>
                <span className="block text-sm text-ink-600">{p.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {editable && (
        <div className="rounded-xl2 border border-line bg-paper-100/50 p-5">
          <Segmented
            legend="How does your plan charge for a specialist visit?"
            value={ins.method}
            onChange={(m) => setIns({ method: m })}
            options={[
              { value: 'deductible_coinsurance', label: 'Deductible + coinsurance' },
              { value: 'copay', label: 'Fixed copay' },
            ]}
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {ins.method === 'copay' ? (
              <NumberField id="copay" label={<><Term term="copay">Copay</Term> per specialist visit</>} prefix="$" value={ins.copay} onChange={(v) => setIns({ copay: v })} hint="Leave blank if you're not sure." />
            ) : (
              <>
                <NumberField id="ded" label={<>Remaining <Term term="deductible">deductible</Term></>} prefix="$" value={ins.deductibleRemaining} onChange={(v) => setIns({ deductibleRemaining: v })} hint="How much is left to meet this year. Blank = unknown." />
                <NumberField id="coins" label={<Term term="coinsurance">Coinsurance</Term>} suffix="%" max={100} value={ins.coinsurancePct} onChange={(v) => setIns({ coinsurancePct: v })} hint="Your share after the deductible." />
              </>
            )}
            <NumberField id="oop" label={<>Remaining <Term term="out-of-pocket maximum">out-of-pocket maximum</Term></>} prefix="$" value={ins.oopRemaining} onChange={(v) => setIns({ oopRemaining: v })} hint="Blank = unknown (no cap applied)." />
          </div>
        </div>
      )}
    </div>
  );
}

export function BudgetTravelSection({ value, onChange }: { value: Profile; onChange: Patch }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <NumberField id="budget" label="Budget for this visit (all costs)" prefix="$" value={value.budget} onChange={(v) => onChange({ budget: v })} hint="Optional. Providers above this are flagged, never hidden." />
        <NumberField id="maxdist" label="Farthest you'd like to travel" suffix="mi" allowEmpty={false} min={1} max={100} value={value.maxDistance} onChange={(v) => onChange({ maxDistance: v ?? 20 })} />
      </div>
      <fieldset>
        <legend className="field-label">How will you usually get there?</legend>
        <div className="grid gap-3 md:grid-cols-2">
          {(Object.keys(TRANSPORT_LABELS) as TransportMode[]).map((m) => (
            <label
              key={m}
              className={cx(
                'flex cursor-pointer gap-3 rounded-xl border bg-surface p-4 focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-pine-600',
                value.transport === m ? 'border-pine-600 ring-1 ring-pine-600' : 'border-line hover:border-pine-300',
              )}
            >
              <input type="radio" name="transport" className="mt-1 h-5 w-5 accent-pine-700" checked={value.transport === m} onChange={() => onChange({ transport: m })} />
              <span>
                <span className="block font-semibold">{TRANSPORT_LABELS[m].label}</span>
                <span className="block text-sm text-ink-600">{TRANSPORT_LABELS[m].hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="rounded-xl2 border border-line bg-paper-100/50 p-5">
        <p className="font-semibold">Other costs you pay to get care (optional)</p>
        <p className="field-hint mt-0.5">
          Only what you choose to enter is included. CareCost never adds a cost because of a disability or an accessibility need.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberField id="assist" label="Paid personal assistance per visit" prefix="$" allowEmpty={false} value={value.extras.assistance} onChange={(v) => onChange({ extras: { ...value.extras, assistance: v ?? 0 } })} hint="For example, an attendant's hours for travel and the visit." />
          <NumberField id="other" label="Other costs per visit" prefix="$" allowEmpty={false} value={value.extras.other} onChange={(v) => onChange({ extras: { ...value.extras, other: v ?? 0 } })} hint="For example, childcare or lost wages." />
        </div>
      </div>
    </div>
  );
}

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
              <button type="button" className="rounded-lg p-1.5 text-ink-500 hover:bg-paper-100 hover:text-rust-700" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove: ${it}`}>
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
      <EditableList
        label="Communication preferences for staff"
        items={value.communication}
        onChange={(communication) => onChange({ communication })}
        placeholder="e.g. Please face me when speaking"
        addLabel="Add"
      />
      <EditableList
        label="Questions to ask at the appointment"
        items={value.questions}
        onChange={(questions) => onChange({ questions })}
        placeholder="e.g. Will I need any tests?"
        addLabel="Add"
      />
    </div>
  );
}
