import { Info, RotateCcw, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CostBar, CostComparisonChart, COST_COLORS } from '../components/CostViz';
import { Callout, NumberField, PageHeader, Segmented, Term, cx } from '../components/ui';
import { DEFAULT_ASSUMPTIONS, PLAN_BY_ID, TRANSPORT_LABELS } from '../data/plans';
import { COST_KEYS, COST_LABELS, computeTrueCost, type CostKey, type CostOverrides } from '../lib/cost';
import { estimateInsurance, networkStatus } from '../lib/insurance';
import { usd, usd2 } from '../lib/format';
import type { EstimateMethod, InsuranceEstimate, InsuranceInputs, TransportMode } from '../lib/types';
import { useStore } from '../state/store';

export function CostCalculator({ initialProvider }: { initialProvider?: string | null }) {
  const { summary, profile, setProfile, assumptions, setAssumptions } = useStore();
  const options = summary.results;
  const [pid, setPid] = useState<string>(initialProvider && options.some((o) => o.provider.id === initialProvider) ? initialProvider : summary.recommended?.provider.id ?? options[0]?.provider.id ?? '');
  const match = options.find((o) => o.provider.id === pid) ?? options[0];
  const provider = match?.provider;
  const plan = PLAN_BY_ID[profile.planId];

  // Insurance estimator inputs (local until saved)
  const [ins, setIns] = useState<InsuranceInputs>({ ...profile.insurance, allowedAmount: provider?.allowedAmount ?? null });
  useEffect(() => setIns((s) => ({ ...s, allowedAmount: provider?.allowedAmount ?? null })), [provider?.id]);
  const copayEst = estimateInsurance({ ...ins, method: 'copay' });
  const dedEst = estimateInsurance({ ...ins, method: 'deductible_coinsurance' });
  const chosen = ins.method === 'copay' ? copayEst : dedEst;

  const [overrides, setOverrides] = useState<CostOverrides>({});
  useEffect(() => setOverrides({}), [pid]);

  const base = useMemo(() => (provider ? computeTrueCost(provider, profile, plan, assumptions) : null), [provider, profile, plan, assumptions]);
  const cost = useMemo(() => (provider ? computeTrueCost(provider, profile, plan, assumptions, overrides) : null), [provider, profile, plan, assumptions, overrides]);

  if (!provider || !cost || !base) {
    return <PageHeader title="Cost Calculator">No providers available for this specialty.</PageHeader>;
  }

  const net = networkStatus(provider, plan.id);
  const setOv = (k: CostKey, v: number | null) => setOverrides((o) => {
    const n = { ...o };
    if (v === null) delete n[k];
    else n[k] = v;
    return n;
  });
  const overridden = Object.keys(overrides).length > 0;

  const eligible = [...summary.meets, ...summary.needsVerification];
  const chartRows = eligible.map((r) => ({
    name: r.provider.name.replace(/ (Associates|Center|Clinic|Group|Institute)$/, ''),
    cost: r.provider.id === provider.id ? cost : r.cost,
  }));
  const cheapestMed = [...eligible].sort((a, b) => a.cost.medical - b.cost.medical)[0];
  const cheapestTotal = [...eligible].sort((a, b) => a.cost.total - b.cost.total)[0];

  return (
    <>
      <PageHeader eyebrow="Cost calculator" title="The true cost of getting care">
        Your share of the medical bill is only part of the story. CareCost adds what it takes to actually get there.
      </PageHeader>

      {/* Formula */}
      <section className="panel mb-6 p-6" aria-labelledby="formula-h">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="md:max-w-sm">
            <label htmlFor="calc-provider" className="field-label">Provider</label>
            <select id="calc-provider" className="input" value={pid} onChange={(e) => setPid(e.target.value)}>
              {options.map((o) => (
                <option key={o.provider.id} value={o.provider.id}>
                  {o.provider.name} — {o.status === 'meets' ? 'meets requirements' : o.status === 'needs_verification' ? 'needs verification' : 'does not meet requirements'}
                </option>
              ))}
            </select>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-ink-600"><Term term="true cost of access">Estimated true cost of access</Term></p>
            <p className="num text-[2.6rem] font-extrabold leading-none tracking-tight" aria-live="polite">{usd2(cost.total)}</p>
            {cost.totalHigh > cost.total + 0.5 && <p className="text-sm text-ink-600">Range {usd(cost.totalLow)}–{usd(cost.totalHigh)}</p>}
          </div>
        </div>
        <h2 id="formula-h" className="sr-only">Formula</h2>
        <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2 rounded-xl bg-paper-100 px-4 py-3 text-[0.95rem]" aria-label={`Total ${usd2(cost.total)} equals medical ${usd2(cost.medical)} plus transportation ${usd2(cost.transportation)} plus assistance ${usd2(cost.assistance)} plus parking ${usd2(cost.parking)} plus other ${usd2(cost.other)}`}>
          <span className="font-bold">Total</span><span aria-hidden>=</span>
          {(['medical', 'transportation', 'assistance', 'parking', 'other'] as CostKey[]).map((k, i) => (
            <span key={k} className="inline-flex items-center gap-2">
              {i > 0 && <span aria-hidden>+</span>}
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1 ring-1 ring-line">
                <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: COST_COLORS[k] }} />
                <span className="text-ink-600">{COST_LABELS[k].replace(' (your share)', '')}</span>
                <span className="num font-bold">{usd2(cost[k])}</span>
              </span>
            </span>
          ))}
        </p>
        <div className="mt-4"><CostBar cost={cost} showLegend={false} label={provider.name} /></div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        {/* Components */}
        <section className="panel p-6" aria-labelledby="comp-h">
          <div className="flex items-center justify-between gap-3">
            <h2 id="comp-h" className="text-xl font-bold">Cost components</h2>
            <button type="button" className="btn-ghost min-h-[40px] px-3 text-sm" disabled={!overridden} onClick={() => setOverrides({})}>
              <RotateCcw aria-hidden className="h-4 w-4" /> Reset to estimates
            </button>
          </div>
          <p className="mt-1 text-sm text-ink-600">Edit any value. Clear a field to return to CareCost&rsquo;s estimate.</p>
          <div className="mt-5 space-y-5">
            {COST_KEYS.map((k) => (
              <div key={k} className="grid items-end gap-2 sm:grid-cols-[1fr_auto]">
                <NumberField
                  id={`c-${k}`}
                  label={COST_LABELS[k]}
                  prefix="$"
                  value={overrides[k] ?? cost[k]}
                  onChange={(v) => setOv(k, v)}
                  hint={
                    overrides[k] !== undefined
                      ? `Your value · estimate was ${usd2(base[k])}`
                      : k === 'medical'
                        ? base.medicalBasis
                        : k === 'assistance' || k === 'other'
                          ? 'Only what you enter — never assumed.'
                          : 'Estimated from distance and travel mode.'
                  }
                />
                {k === 'medical' && (
                  <button type="button" className="btn-secondary mb-[26px] text-sm" onClick={() => setOv('medical', chosen.estimate)}>
                    Use estimator result
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <h3 className="font-bold">Travel assumptions</h3>
            <div className="mt-3">
              <label htmlFor="calc-mode" className="field-label">Travel mode</label>
              <select id="calc-mode" className="input" value={profile.transport} onChange={(e) => setProfile((p) => ({ ...p, transport: e.target.value as TransportMode }))}>
                {(Object.keys(TRANSPORT_LABELS) as TransportMode[]).map((m) => <option key={m} value={m}>{TRANSPORT_LABELS[m].label}</option>)}
              </select>
            </div>
            <p className="mt-2 text-sm text-ink-700">{cost.distanceMiles} mi each way. {base.notes.filter((n) => /trip|mi ×|fare/i.test(n)).join(' ')}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {profile.transport === 'accessible_rideshare' && (
                <>
                  <NumberField id="a-rb" label="Accessible ride base fare" prefix="$" allowEmpty={false} value={assumptions.rideshareBase} onChange={(v) => setAssumptions({ ...assumptions, rideshareBase: v ?? 0 })} />
                  <NumberField id="a-rpm" label="Per mile" prefix="$" allowEmpty={false} value={assumptions.ridesharePerMile} onChange={(v) => setAssumptions({ ...assumptions, ridesharePerMile: v ?? 0 })} />
                </>
              )}
              {(profile.transport === 'own_vehicle' || profile.transport === 'driven_by_someone') && (
                <NumberField id="a-v" label="Vehicle cost per mile" prefix="$" allowEmpty={false} value={assumptions.vehiclePerMile} onChange={(v) => setAssumptions({ ...assumptions, vehiclePerMile: v ?? 0 })} hint="Fuel and wear. Edit to match your vehicle." />
              )}
              {profile.transport === 'paratransit' && (
                <NumberField id="a-p" label="Paratransit fare per trip" prefix="$" allowEmpty={false} value={assumptions.paratransitFare} onChange={(v) => setAssumptions({ ...assumptions, paratransitFare: v ?? 0 })} />
              )}
              {profile.transport === 'public_transit' && (
                <NumberField id="a-t" label="Transit fare per trip" prefix="$" allowEmpty={false} value={assumptions.transitFare} onChange={(v) => setAssumptions({ ...assumptions, transitFare: v ?? 0 })} />
              )}
            </div>
            <button type="button" className="btn-ghost mt-2 px-0 text-sm" onClick={() => setAssumptions(DEFAULT_ASSUMPTIONS)}>Restore default travel assumptions</button>
          </div>
        </section>

        {/* Insurance estimator */}
        <section className="panel p-6" aria-labelledby="ins-h">
          <h2 id="ins-h" className="text-xl font-bold">Insurance cost estimator</h2>
          <p className="mt-1 text-sm text-ink-600">
            {plan.name} · {net === 'in' ? 'listed in network' : net === 'out' ? 'listed out of network' : 'network status unknown'} for {provider.name}.
          </p>
          {net !== 'in' && plan.method !== 'self_pay' && plan.method !== 'unknown' && (
            <div className="mt-3"><Callout tone="warn">This estimator assumes in-network coverage. Because this provider is {net === 'out' ? 'out of network' : 'not confirmed in network'}, the medical line above uses a more conservative figure.</Callout></div>
          )}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <NumberField id="i-allowed" label={<>Expected in-network <Term term="allowed amount">allowed amount</Term></>} prefix="$" value={ins.allowedAmount} onChange={(v) => setIns({ ...ins, allowedAmount: v })} hint={`Sample listing for this provider: ${usd(provider.allowedAmount)}`} />
            <NumberField id="i-ded" label={<>Remaining <Term term="deductible">deductible</Term></>} prefix="$" value={ins.deductibleRemaining} onChange={(v) => setIns({ ...ins, deductibleRemaining: v })} hint="Blank = unknown" />
            <NumberField id="i-co" label={<><Term term="coinsurance">Coinsurance</Term></>} suffix="%" max={100} value={ins.coinsurancePct} onChange={(v) => setIns({ ...ins, coinsurancePct: v })} hint="Blank = unknown" />
            <NumberField id="i-oop" label={<>Remaining <Term term="out-of-pocket maximum">out-of-pocket max</Term></>} prefix="$" value={ins.oopRemaining} onChange={(v) => setIns({ ...ins, oopRemaining: v })} hint="Blank = no cap applied" />
            <NumberField id="i-copay" label={<><Term term="copay">Copay</Term> (if your plan uses one)</>} prefix="$" value={ins.copay} onChange={(v) => setIns({ ...ins, copay: v })} hint="Blank = unknown" />
            <div className="self-end">
              <Segmented<EstimateMethod>
                legend="Which applies to this visit?"
                size="sm"
                value={ins.method}
                onChange={(m) => setIns({ ...ins, method: m })}
                options={[{ value: 'deductible_coinsurance', label: 'Deductible + coins.' }, { value: 'copay', label: 'Copay' }]}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <EstimateCard title="Deductible + coinsurance model" e={dedEst} active={ins.method === 'deductible_coinsurance'} />
            <EstimateCard title="Fixed copay model" e={copayEst} active={ins.method === 'copay'} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={() => setOv('medical', chosen.estimate)}>Use {usd2(chosen.estimate)} as medical cost</button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                const { allowedAmount: _a, ...rest } = ins;
                void _a;
                setProfile((p) => ({ ...p, insurance: rest, planId: p.planId === 'unknown' || p.planId === 'self-pay' ? 'custom' : p.planId }));
              }}
            >
              <Save aria-hidden className="h-4 w-4" /> Save to my profile
            </button>
          </div>
          <p className="mt-4 flex gap-2 text-sm text-ink-600"><Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />Estimates only — not a claim decision or insurer determination. Actual costs depend on how the visit is billed and your plan&rsquo;s rules.</p>
        </section>
      </div>

      {chartRows.length > 0 && (
        <section className="panel mt-6 p-6">
          <CostComparisonChart
            rows={chartRows}
            title="Medical-only vs. true cost, across eligible providers"
            summary={
              cheapestMed && cheapestTotal && cheapestMed.provider.id !== cheapestTotal.provider.id
                ? `${cheapestMed.provider.name} has the lowest medical estimate (${usd(cheapestMed.cost.medical)}), but ${cheapestTotal.provider.name} has the lowest total cost of access (${usd(cheapestTotal.cost.total)}). Excluded providers are not shown.`
                : 'Bars show your medical share plus the costs of getting to care. Providers that fail an essential requirement are not shown.'
            }
          />
        </section>
      )}
    </>
  );
}

function EstimateCard({ title, e, active }: { title: string; e: InsuranceEstimate; active: boolean }) {
  return (
    <div className={cx('rounded-xl border p-4', active ? 'border-pine-600 bg-pine-50/50 ring-1 ring-pine-600' : 'border-line')}>
      <p className="flex items-center justify-between gap-2 text-sm font-bold">
        {title}
        {active && <span className="chip bg-accent text-accent-ink">Selected</span>}
      </p>
      <p className="num mt-2 text-[1.7rem] font-extrabold leading-none">{usd2(e.estimate)}</p>
      {e.high > e.low && <p className="mt-1 text-sm text-ink-600">Range {usd2(e.low)}–{usd2(e.high)}</p>}
      {e.steps.length > 0 && (
        <table className="mt-3 w-full text-sm">
          <caption className="sr-only">{title} calculation steps</caption>
          <tbody>
            {e.steps.map((s) => (
              <tr key={s.label} className="border-t border-line/70">
                <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                  {s.label}
                  {s.formula && <span className="block text-xs text-ink-500">{s.formula}</span>}
                </th>
                <td className="num py-1.5 text-right font-semibold">{usd2(s.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {e.cappedByOop && <p className="mt-2 text-sm font-semibold text-pine-800">Capped by your out-of-pocket maximum.</p>}
      {e.warnings.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-amberx-800">
          {e.warnings.map((w) => <li key={w}>⚠ {w}</li>)}
        </ul>
      )}
    </div>
  );
}
