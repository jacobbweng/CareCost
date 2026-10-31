import { ArrowLeft, ArrowRight, Bus, Calculator, Check, Clock, ExternalLink, MapPin, Phone, Plus, Video } from 'lucide-react';
import { CostBar } from '../components/CostViz';
import { CATEGORY_ICON } from '../components/ProfileSections';
import { ACC_STATUS_TEXT, AccStatusIcon, Callout, Money, NetworkBadge, PageHeader, SourceTag, StatusBadge, Term, cx } from '../components/ui';
import { ACCOMMODATIONS, ACC_BY_ID, CATEGORY_META } from '../data/accommodations';
import { PLAN_BY_ID } from '../data/plans';
import { SPECIALTY_BY_ID } from '../data/providers';
import { COST_KEYS, COST_LABELS } from '../lib/cost';
import { estimateMedical } from '../lib/insurance';
import { fmtDate, usd, usd2 } from '../lib/format';
import type { AccCategory } from '../lib/types';
import { href, navigate } from '../state/router';
import { MAX_COMPARE, useStore } from '../state/store';

export function ProviderDetail({ id }: { id: string }) {
  const { summary, profile, compareIds, toggleCompare, selectProvider } = useStore();
  const r = summary.results.find((x) => x.provider.id === id);

  if (!r) {
    return (
      <>
        <PageHeader title="Provider not in your current search">
          This provider isn&rsquo;t in the {SPECIALTY_BY_ID[profile.specialty].label.toLowerCase()} results. It may belong to another specialty.
        </PageHeader>
        <a href={href('/find')} className="btn-primary"><ArrowLeft aria-hidden className="h-4 w-4" /> Back to results</a>
      </>
    );
  }
  const p = r.provider;
  const plan = PLAN_BY_ID[profile.planId];
  const med = estimateMedical(p, profile, plan);
  const inCompare = compareIds.includes(p.id);

  return (
    <>
      <a href={href('/find')} className="btn-ghost -ml-3 mb-3"><ArrowLeft aria-hidden className="h-4 w-4" /> All results</a>
      <PageHeader
        eyebrow={SPECIALTY_BY_ID[p.specialty].label}
        title={p.name}
        actions={
          <>
            <button type="button" className="btn-secondary" aria-pressed={inCompare} disabled={!inCompare && compareIds.length >= MAX_COMPARE} onClick={() => toggleCompare(p.id)}>
              {inCompare ? <Check aria-hidden className="h-4 w-4" /> : <Plus aria-hidden className="h-4 w-4" />} {inCompare ? 'In comparison' : 'Add to comparison'}
            </button>
            {r.status !== 'does_not_meet' && (
              <button type="button" className="btn-primary" onClick={() => { selectProvider(p.id); navigate('/plan'); }}>
                Plan this visit <ArrowRight aria-hidden className="h-4 w-4" />
              </button>
            )}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={r.status} />
          {plan.method !== 'self_pay' && plan.method !== 'unknown' && <NetworkBadge network={r.network} planName={plan.name} />}
        </div>
        <p className="mt-3">{p.blurb}</p>
      </PageHeader>

      {r.status === 'does_not_meet' && (
        <div className="mb-6">
          <Callout tone="danger" title="Not recommended for you">
            {r.reasons.join(' ')}
          </Callout>
        </div>
      )}
      {r.status === 'needs_verification' && (
        <div className="mb-6">
          <Callout tone="warn" title="Verify before booking">
            {r.unverified.map((u) => (
              <span key={u.id} className="block">
                <strong>{ACC_BY_ID[u.id].short}:</strong> ask &ldquo;{ACC_BY_ID[u.id].verifyQuestion}&rdquo;
              </span>
            ))}
          </Callout>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel p-6" aria-labelledby="acc-h">
          <h2 id="acc-h" className="text-xl font-bold">Accessibility record</h2>
          <p className="mt-1 text-sm text-ink-600">
            {p.overallVerifiedDate ? `Last on-site review: ${fmtDate(p.overallVerifiedDate)}.` : 'No on-site review on file.'} Items you selected are marked.
          </p>
          <div className="mt-5 space-y-6">
            {(Object.keys(CATEGORY_META) as AccCategory[]).map((cat) => (
              <div key={cat}>
                <h3 className="mb-2 flex items-center gap-2 text-[1rem] font-bold text-pine-900">{CATEGORY_ICON[cat]} {CATEGORY_META[cat].label}</h3>
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {ACCOMMODATIONS.filter((a) => a.category === cat).map((a) => {
                    const rec = p.access[a.id];
                    const status = rec?.status ?? 'unknown';
                    const need = profile.needs[a.id];
                    return (
                      <li key={a.id} className={cx('flex items-start gap-3 px-3.5 py-3', need && 'bg-pine-50/50')}>
                        <AccStatusIcon status={status} />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">
                            {a.label}
                            {need && <span className={cx('chip ml-2 align-middle', need === 'essential' ? 'bg-accent text-accent-ink' : 'bg-pine-100 text-pine-900')}>Your {need}</span>}
                          </p>
                          <p className="text-sm text-ink-700">{ACC_STATUS_TEXT[status]}{rec?.note ? ` — ${rec.note}` : ''}</p>
                          <SourceTag source={rec?.source ?? 'none'} date={rec?.date} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="panel p-6" aria-labelledby="cost-h">
            <h2 id="cost-h" className="text-xl font-bold"><Term term="true cost of access">True cost of access</Term></h2>
            <Money value={r.cost.total} size="xl" className="mt-2 block" />
            {r.cost.totalHigh > r.cost.total + 0.5 && <p className="text-sm text-ink-600">Could be up to {usd(r.cost.totalHigh)} — see assumptions.</p>}
            <div className="mt-4"><CostBar cost={r.cost} showLegend={false} label={p.name} /></div>
            <dl className="mt-4 divide-y divide-line text-[0.95rem]">
              {COST_KEYS.map((k) => (
                <div key={k} className="flex justify-between py-2">
                  <dt className="text-ink-700">{COST_LABELS[k]}</dt>
                  <dd className="num font-semibold">{usd2(r.cost[k])}</dd>
                </div>
              ))}
              <div className="flex justify-between py-2 text-base font-bold">
                <dt>Total</dt>
                <dd className="num">{usd2(r.cost.total)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm font-semibold">{med.basis}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-700">
              {r.cost.notes.map((n) => <li key={n}>{n}</li>)}
              {p.priceSource && <li>Price basis: {p.priceSource}. Medicare rate {usd(p.allowedAmount)} · estimated cash price {usd(p.selfPayPrice)}.</li>}
            </ul>
            <a href={href(`/cost?provider=${p.id}`)} className="btn-secondary mt-4"><Calculator aria-hidden className="h-4 w-4" /> Adjust in Cost Calculator</a>
          </section>

          <section className="panel p-6" aria-labelledby="info-h">
            <h2 id="info-h" className="text-xl font-bold">Practical details</h2>
            <ul className="mt-3 space-y-2.5 text-[0.95rem]">
              <li className="flex gap-2.5"><MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-pine-700" />{p.address || 'Address not listed'} · {r.cost.distanceMiles} mi{p.driveMinutes ? ` · ${p.driveMinutes} min drive` : ''}</li>
              {p.phone && <li className="flex gap-2.5"><Phone aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-pine-700" /><span className="select-all font-semibold">{p.phone}</span></li>}
              {p.hours && <li className="flex gap-2.5"><Clock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-pine-700" />{p.hours}</li>}
              {p.newPatientWaitDays !== undefined && <li className="flex gap-2.5"><Clock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-pine-700" />New-patient wait about {p.newPatientWaitDays} days</li>}
              {p.nearAccessibleTransit !== undefined && <li className="flex gap-2.5"><Bus aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-pine-700" />{p.nearAccessibleTransit ? 'Accessible transit stop nearby' : 'No accessible transit stop listed nearby'}</li>}
              {p.telehealthFollowUps !== undefined && <li className="flex gap-2.5"><Video aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-pine-700" />{p.telehealthFollowUps ? 'Telehealth follow-ups offered' : 'No telehealth follow-ups listed'}</li>}
              {p.website && <li className="flex gap-2.5"><ExternalLink aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-pine-700" /><a className="font-semibold text-pine-800 hover:underline" href={p.website} target="_blank" rel="noreferrer">Website<span className="sr-only"> (opens in new tab)</span></a></li>}
              {p.osmUrl && <li className="flex gap-2.5"><ExternalLink aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-pine-700" /><a className="font-semibold text-pine-800 hover:underline" href={p.osmUrl} target="_blank" rel="noreferrer">View on OpenStreetMap<span className="sr-only"> (opens in new tab)</span></a></li>}
            </ul>
          </section>

          {r.status !== 'does_not_meet' && (
            <section className="panel p-6" aria-labelledby="score-h">
              <h2 id="score-h" className="text-xl font-bold">How it was ranked</h2>
              <p className="mt-1 text-sm text-ink-600">Score {r.score}/100 among providers that are not excluded.</p>
              <ul className="mt-3 space-y-2.5">
                {([
                  ['Total cost of access', r.scoreParts.affordability, '45%'],
                  ['Insurance fit', r.scoreParts.insurance, '20%'],
                  ['Distance', r.scoreParts.distance, '15%'],
                  ['Preferred accommodations', r.scoreParts.preferences, '15%'],
                  ['Information confidence', r.scoreParts.confidence, '5%'],
                ] as const).map(([l, v, w]) => (
                  <li key={l}>
                    <div className="flex justify-between text-sm"><span className="font-semibold">{l} <span className="font-normal text-ink-600">· weight {w}</span></span><span className="num">{Math.round(v * 100)}/100</span></div>
                    <div className="mt-1 h-2 rounded-full bg-paper-200"><div className="h-full rounded-full bg-pine-600" style={{ width: `${v * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
              {(r.overBudget || r.beyondDistance) && <p className="mt-3 text-sm text-amberx-800">Score reduced: {[r.overBudget && 'over budget', r.beyondDistance && 'beyond preferred distance'].filter(Boolean).join(' and ')}.</p>}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
