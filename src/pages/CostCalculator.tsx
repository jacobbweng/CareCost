import { Info, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CostBar, CostComparisonChart, COST_COLORS } from '../components/CostViz';
import { TRANSPORT_CHOICES } from '../components/ProfileSections';
import { Callout, NumberField, PageHeader, Term, cx } from '../components/ui';
import { IRS_SOURCE, MEDICARE_VISIT_SOURCE, PRIVATE_SOURCE, benchmarkVisit } from '../data/benchmarks';
import { DEFAULT_ASSUMPTIONS, PLAN_BY_ID } from '../data/plans';
import { COST_LABELS, distanceMiles, transportCost, type CostKey } from '../lib/cost';
import { estimateInsurance, estimateMedical, round2 } from '../lib/insurance';
import { usd, usd2 } from '../lib/format';
import type { CostBreakdown, InsuranceInputs, TransportMode } from '../lib/types';
import { href } from '../state/router';
import { useStore } from '../state/store';

export function CostCalculator({ initialProvider }: { initialProvider?: string | null }) {
  const { summary, profile, setProfile, assumptions, setAssumptions } = useStore();
  const options = [...summary.meets, ...summary.needsVerification, ...summary.doesNotMeet];
  const [pid, setPid] = useState<string>(
    initialProvider && options.some((o) => o.provider.id === initialProvider) ? initialProvider : (summary.recommended ?? options[0])?.provider.id ?? '',
  );
  const match = options.find((o) => o.provider.id === pid) ?? options[0];
  const provider = match?.provider;
  const plan = PLAN_BY_ID[profile.planId];
  const visit = benchmarkVisit(profile.specialty);

  const [quoted, setQuoted] = useState<number | null>(null);
  const [ins, setIns] = useState<Omit<InsuranceInputs, 'allowedAmount'>>(profile.insurance);
  const [parking, setParking] = useState<number | null>(null);
  useEffect(() => {
    setQuoted(null);
    setParking(null);
  }, [pid]);

  const calc = useMemo(() => {
    if (!provider) return null;
    const multiplier = plan.priceMultiplier ?? 1;
    const typical = round2(provider.allowedAmount * multiplier);
    const price = quoted ?? (plan.method === 'self_pay' || plan.method === 'unknown' ? provider.selfPayPrice : typical);

    // ── Visit share, in plain steps ──
    const lines: string[] = [];
    let share = 0;
    let low = 0;
    let high = 0;
    let warnings: string[] = [];
    if (plan.method === 'self_pay') {
      share = low = high = price;
      lines.push(quoted !== null ? `You pay the price the clinic quoted: ${usd2(price)}.` : `With no insurance you pay the full cash price — about ${usd2(price)}.`);
    } else if (plan.method === 'unknown') {
      const m = estimateMedical(provider, profile, plan);
      share = m.amount;
      low = m.low;
      high = m.high;
      lines.push(`Without your plan details we can only give a range: ${usd(low)} (fully covered) to ${usd(high)} (no coverage).`);
      lines.push('Choose how you pay to narrow it down.');
    } else {
      const e = estimateInsurance({ ...ins, allowedAmount: price });
      share = e.estimate;
      low = e.low;
      high = e.high;
      // Original Medicare has no out-of-pocket maximum, so don't warn about a missing one
      warnings = plan.kind === 'Medicare' ? e.warnings.filter((w) => !w.includes('out-of-pocket')) : e.warnings;
      if (ins.method === 'copay') {
        lines.push(ins.copay === null ? 'Your copay isn’t entered, so we show up to the full price.' : `You pay your copay: ${usd2(Math.min(ins.copay, price))}.`);
      } else {
        const ded = ins.deductibleRemaining ?? price;
        const dp = Math.min(price, Math.max(0, ded));
        const rest = price - dp;
        const pct = ins.coinsurancePct ?? 20;
        lines.push(dp > 0 ? `You pay the first ${usd2(dp)} — the deductible you have left${ins.deductibleRemaining === null ? ' (assumed, since it isn’t entered)' : ''}.` : 'Your deductible is already met.');
        if (rest > 0) lines.push(`Your plan pays most of the other ${usd2(rest)}. You pay ${pct}% of it: ${usd2(rest * pct / 100)}.`);
      }
      if (e.cappedByOop) lines.push(`That’s more than your out-of-pocket max left, so you pay ${usd2(e.estimate)}.`);
    }

    // ── Getting there ──
    const miles = distanceMiles(profile, provider, assumptions);
    const t = transportCost(profile.transport, miles, provider, assumptions);
    const park = parking ?? t.parking;
    const breakdown: CostBreakdown = {
      medical: round2(share),
      transportation: t.transportation,
      parking: round2(park),
      assistance: profile.extras.assistance,
      other: profile.extras.other,
      total: round2(share + t.transportation + park + profile.extras.assistance + profile.extras.other),
      medicalLow: low,
      medicalHigh: high,
      totalLow: round2(low + t.transportation + park + profile.extras.assistance + profile.extras.other),
      totalHigh: round2(high + t.transportation + park + profile.extras.assistance + profile.extras.other),
      distanceMiles: miles,
      notes: t.notes,
      medicalBasis: '',
    };
    return { typical, price, lines, warnings, breakdown, multiplier };
  }, [provider, plan, quoted, ins, parking, profile, assumptions]);

  if (!provider || !calc) {
    return <PageHeader title="What will a visit cost?">No clinics loaded yet. <a className="font-semibold underline" href={href('/map')}>Open the map</a>.</PageHeader>;
  }
  const b = calc.breakdown;
  const isDriving = profile.transport === 'own_vehicle' || profile.transport === 'driven_by_someone';
  const hasNumbers = plan.method === 'copay' || plan.method === 'deductible_coinsurance';

  return (
    <>
      <PageHeader eyebrow="Costs" title="What will a visit cost?" />

      <div className="panel mb-6 flex flex-col gap-5 p-5 md:flex-row md:items-end md:justify-between md:p-6">
        <div className="md:max-w-md md:flex-1">
          <label htmlFor="calc-provider" className="field-label">Clinic</label>
          <select id="calc-provider" className="input text-lg" value={pid} onChange={(e) => setPid(e.target.value)}>
            {options.map((o) => (
              <option key={o.provider.id} value={o.provider.id}>{o.provider.name} ({o.cost.distanceMiles} mi)</option>
            ))}
          </select>
        </div>
        <div className="md:text-right">
          <p className="text-sm font-semibold text-ink-600">Estimated total</p>
          <p className="num text-[2.8rem] font-extrabold leading-none tracking-tight text-white" aria-live="polite">{usd2(b.total)}</p>
          {b.totalHigh > b.total + 0.5 && <p className="text-sm text-ink-600">Could be {usd(b.totalLow)}–{usd(b.totalHigh)}</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {/* 1 — Visit */}
          <section className="panel p-5 md:p-6" aria-labelledby="s1">
            <h2 id="s1" className="flex items-center gap-3 text-xl font-bold"><Num n={1} /> The visit</h2>
            <p className="mt-3 text-ink-700">
              Paying with <strong className="text-white">{plan.name}</strong>. <a className="font-semibold text-pine-800 underline" href={href('/insurance')}>Change</a>
            </p>

            <div className="mt-4 rounded-xl bg-paper-100 p-4">
              <p className="text-sm font-semibold text-ink-600">Typical price for a new-patient visit</p>
              <p className="num mt-1 text-2xl font-extrabold text-white">{usd2(plan.method === 'self_pay' || plan.method === 'unknown' ? provider.selfPayPrice : calc.typical)}</p>
              <p className="mt-1 text-sm text-ink-600">
                Medicare pays {usd2(visit.amount)} (CPT {visit.code}).{' '}
                {calc.multiplier !== 1 || plan.method === 'self_pay' || plan.method === 'unknown' ? `Private and cash prices average about 143% of that.` : ''}
              </p>
              <details className="mt-2 text-xs text-ink-500">
                <summary className="cursor-pointer font-semibold">Sources</summary>
                <p className="mt-1">{MEDICARE_VISIT_SOURCE}. {PRIVATE_SOURCE}.</p>
              </details>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <NumberField id="quoted" label="Price the clinic quoted you" prefix="$" value={quoted} onChange={setQuoted} hint="Optional. Ask when you call." />
              {hasNumbers && ins.method === 'copay' && <NumberField id="c-copay" label={<>Your <Term term="copay">copay</Term></>} prefix="$" value={ins.copay} onChange={(v) => setIns({ ...ins, copay: v })} />}
              {hasNumbers && ins.method !== 'copay' && (
                <>
                  <NumberField id="c-ded" label={<><Term term="deductible">Deductible</Term> left</>} prefix="$" value={ins.deductibleRemaining} onChange={(v) => setIns({ ...ins, deductibleRemaining: v })} hint="Blank = not sure" />
                  <NumberField id="c-coins" label={<>Your share (<Term term="coinsurance">coinsurance</Term>)</>} suffix="%" max={100} value={ins.coinsurancePct} onChange={(v) => setIns({ ...ins, coinsurancePct: v })} />
                </>
              )}
              {hasNumbers && plan.kind !== 'Medicare' && <NumberField id="c-oop" label={<><Term term="out-of-pocket maximum">Out-of-pocket max</Term> left</>} prefix="$" value={ins.oopRemaining} onChange={(v) => setIns({ ...ins, oopRemaining: v })} hint="Blank = not sure" />}
            </div>
            {hasNumbers && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(['deductible_coinsurance', 'copay'] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={ins.method === m} onClick={() => setIns({ ...ins, method: m })} className={cx('min-h-[40px] rounded-xl border-2 px-3 text-sm font-bold', ins.method === m ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-700')}>
                    {m === 'copay' ? 'I pay a flat copay' : 'I pay a deductible, then a %'}
                  </button>
                ))}
                <button type="button" className="btn-ghost min-h-[40px] px-3 text-sm" onClick={() => setProfile((p) => ({ ...p, insurance: ins }))}>
                  <Save aria-hidden className="h-4 w-4" /> Save to my profile
                </button>
              </div>
            )}

            <ol className="mt-5 space-y-2 border-l-2 border-pine-300 pl-4">
              {calc.lines.map((l) => <li key={l} className="text-[1.02rem]">{l}</li>)}
            </ol>
            <p className="mt-4 text-lg">Your share of the visit: <strong className="num text-2xl text-white">{usd2(b.medical)}</strong></p>
            {calc.warnings.length > 0 && <ul className="mt-2 space-y-1 text-sm text-amberx-800">{calc.warnings.map((w) => <li key={w}>⚠ {w}</li>)}</ul>}
          </section>

          {/* 2 — Getting there */}
          <section className="panel p-5 md:p-6" aria-labelledby="s2">
            <h2 id="s2" className="flex items-center gap-3 text-xl font-bold"><Num n={2} /> Getting there</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="c-mode" className="field-label">How you’ll travel</label>
                <select id="c-mode" className="input" value={profile.transport} onChange={(e) => setProfile((p) => ({ ...p, transport: e.target.value as TransportMode }))}>
                  {TRANSPORT_CHOICES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="rounded-xl bg-paper-100 p-3">
                <p className="text-sm text-ink-600">Distance each way</p>
                <p className="text-lg font-bold text-white">{b.distanceMiles} mi{provider.driveMinutes ? ` · ${provider.driveMinutes} min` : ''}</p>
                <p className="text-xs text-ink-500">{provider.roadMiles !== undefined ? 'Real road distance (OSRM)' : 'Straight-line distance × 1.2'}</p>
              </div>
              {isDriving && <NumberField id="a-v" label="Cost per mile" prefix="$" allowEmpty={false} value={assumptions.vehiclePerMile} onChange={(v) => setAssumptions({ ...assumptions, vehiclePerMile: v ?? 0 })} hint={IRS_SOURCE} />}
              {profile.transport === 'accessible_rideshare' && (
                <>
                  <NumberField id="a-rb" label="Ride base fare" prefix="$" allowEmpty={false} value={assumptions.rideshareBase} onChange={(v) => setAssumptions({ ...assumptions, rideshareBase: v ?? 0 })} hint="Change to your local fare" />
                  <NumberField id="a-rpm" label="Per mile" prefix="$" allowEmpty={false} value={assumptions.ridesharePerMile} onChange={(v) => setAssumptions({ ...assumptions, ridesharePerMile: v ?? 0 })} />
                </>
              )}
              {profile.transport === 'paratransit' && <NumberField id="a-p" label="Fare per trip" prefix="$" allowEmpty={false} value={assumptions.paratransitFare} onChange={(v) => setAssumptions({ ...assumptions, paratransitFare: v ?? 0 })} hint="Your local paratransit fare" />}
              {profile.transport === 'public_transit' && <NumberField id="a-t" label="Fare per trip" prefix="$" allowEmpty={false} value={assumptions.transitFare} onChange={(v) => setAssumptions({ ...assumptions, transitFare: v ?? 0 })} />}
            </div>
            <p className="mt-4 text-[1.02rem]">{b.notes[0]}</p>
            <p className="mt-2 text-lg">Round trip: <strong className="num text-2xl text-white">{usd2(b.transportation)}</strong></p>
            <button type="button" className="btn-ghost mt-1 px-0 text-sm" onClick={() => setAssumptions(DEFAULT_ASSUMPTIONS)}>Reset travel rates</button>
          </section>

          {/* 3 — Anything else */}
          <section className="panel p-5 md:p-6" aria-labelledby="s3">
            <h2 id="s3" className="flex items-center gap-3 text-xl font-bold"><Num n={3} /> Anything else</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <NumberField id="c-park" label="Parking" prefix="$" value={parking ?? b.parking} onChange={setParking} hint="Ask the clinic" />
              <NumberField id="c-help" label="Paid help" prefix="$" allowEmpty={false} value={profile.extras.assistance} onChange={(v) => setProfile((p) => ({ ...p, extras: { ...p.extras, assistance: v ?? 0 } }))} hint="e.g. an aide’s time" />
              <NumberField id="c-other" label="Other" prefix="$" allowEmpty={false} value={profile.extras.other} onChange={(v) => setProfile((p) => ({ ...p, extras: { ...p.extras, other: v ?? 0 } }))} hint="e.g. childcare" />
            </div>
          </section>
        </div>

        {/* Receipt */}
        <aside className="lg:sticky lg:top-6 lg:self-start" aria-label="Receipt">
          <div className="panel p-5 md:p-6">
            <h2 className="text-xl font-bold">Your estimate</h2>
            <p className="text-sm text-ink-600">{provider.name}</p>
            <dl className="mt-4 divide-y divide-line">
              {(['medical', 'transportation', 'parking', 'assistance', 'other'] as CostKey[]).map((k) => (
                <div key={k} className="flex items-center justify-between py-2.5">
                  <dt className="flex items-center gap-2 text-ink-700"><span aria-hidden className="h-3 w-3 rounded-sm" style={{ background: COST_COLORS[k] }} />{k === 'medical' ? 'Visit (your share)' : COST_LABELS[k]}</dt>
                  <dd className="num font-semibold text-white">{usd2(b[k])}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between py-3 text-lg font-extrabold">
                <dt>Total</dt>
                <dd className="num text-white">{usd2(b.total)}</dd>
              </div>
            </dl>
            <div className="mt-2"><CostBar cost={b} showLegend={false} label={provider.name} /></div>
            <p className="mt-4 flex gap-2 text-sm text-ink-600"><Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />An estimate, not a bill. Ask the clinic for a price before you go.</p>
          </div>
          {profile.budget !== null && b.total > profile.budget && (
            <div className="mt-4"><Callout tone="warn">That’s {usd(b.total - profile.budget)} over your {usd(profile.budget)} budget.</Callout></div>
          )}
        </aside>
      </div>

      {options.length > 1 && (
        <section className="panel mt-6 p-5 md:p-6">
          <CostComparisonChart
            rows={[...summary.meets, ...summary.needsVerification].slice(0, 6).map((r) => ({ name: r.provider.name.length > 26 ? r.provider.name.slice(0, 25) + '…' : r.provider.name, cost: r.cost }))}
            title="Compare clinics"
            summary="Visit plus getting there, for clinics that aren’t missing a must-have."
          />
        </section>
      )}
    </>
  );
}

function Num({ n }: { n: number }) {
  return <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-accent text-base font-extrabold text-accent-ink">{n}</span>;
}
