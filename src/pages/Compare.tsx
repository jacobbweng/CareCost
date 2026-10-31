import { Award, Plus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { CostComparisonChart } from '../components/CostViz';
import { ACC_STATUS_TEXT, AccStatusIcon, Callout, NetworkBadge, PageHeader, SourceTag, StatusBadge, cx } from '../components/ui';
import { ACC_BY_ID } from '../data/accommodations';
import { PLAN_BY_ID } from '../data/plans';
import { compareProviders } from '../lib/compare';
import { COST_LABELS } from '../lib/cost';
import { usd } from '../lib/format';
import type { MatchResult } from '../lib/types';
import { href } from '../state/router';
import { MAX_COMPARE, useStore } from '../state/store';

export function Compare() {
  const { summary, compareIds, toggleCompare, profile } = useStore();
  const plan = PLAN_BY_ID[profile.planId];
  const selected = compareIds.map((id) => summary.results.find((r) => r.provider.id === id)).filter(Boolean) as MatchResult[];
  const available = summary.results.filter((r) => !compareIds.includes(r.provider.id));
  const verdict = compareProviders(selected);

  const best = (ids: string | null, id: string, text: string) =>
    ids === id ? <span className="chip mt-1 bg-pine-100 text-pine-900"><Award aria-hidden className="h-3.5 w-3.5" />{text}</span> : null;

  const row = (label: ReactNode, cell: (r: MatchResult) => ReactNode, opts: { strong?: boolean } = {}) => (
    <tr className="border-b border-line align-top">
      <th scope="row" className={cx('sticky left-0 z-10 w-48 bg-surface py-3 pr-4 text-left text-sm', opts.strong ? 'font-bold' : 'font-semibold text-ink-700')}>{label}</th>
      {selected.map((r) => (
        <td key={r.provider.id} className={cx('min-w-[200px] px-3 py-3', r.provider.id === verdict.bestValueId && 'bg-pine-50/60')}>{cell(r)}</td>
      ))}
    </tr>
  );

  const needIds = [...summary.essentialIds, ...summary.preferredIds];

  return (
    <>
      <PageHeader eyebrow="Provider comparison" title="Compare side by side">
        See accessibility and cost trade-offs together. Select up to {MAX_COMPARE} providers.
      </PageHeader>

      {selected.length < 2 && (
        <div className="mb-6">
          <Callout tone="info" title="Add at least two providers">Choose providers below, or use “Compare” on any result in Find Care.</Callout>
        </div>
      )}

      {selected.length >= 2 && (
        <section className="panel mb-6 p-6" aria-labelledby="verdict-h">
          <h2 id="verdict-h" className="text-[1.3rem] font-bold">{verdict.headline}</h2>
          <ul className="mt-3 space-y-2 text-[0.98rem] leading-relaxed">
            {verdict.points.map((p) => <li key={p} className="flex gap-2"><span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pine-600" />{p}</li>)}
          </ul>
        </section>
      )}

      {selected.length > 0 && (
        <section className="panel mb-6 overflow-hidden" aria-labelledby="table-h">
          <h2 id="table-h" className="sr-only">Comparison table</h2>
          <div className="overflow-x-auto px-5 pb-2">
            <table className="w-full border-collapse text-[0.95rem]">
              <caption className="sr-only">Comparison of {selected.length} providers. Columns are providers; rows are attributes.</caption>
              <thead>
                <tr className="border-b-2 border-line">
                  <td className="sticky left-0 z-10 bg-surface" />
                  {selected.map((r) => (
                    <th key={r.provider.id} scope="col" className={cx('px-3 pb-3 pt-5 text-left align-bottom', r.provider.id === verdict.bestValueId && 'bg-pine-50/60')}>
                      <div className="flex items-start justify-between gap-2">
                        <a href={href(`/provider/${r.provider.id}`)} className="text-[1.05rem] font-bold leading-snug hover:underline">{r.provider.name}</a>
                        <button type="button" className="rounded-lg p-1.5 text-ink-500 hover:bg-paper-100 hover:text-rust-700" aria-label={`Remove ${r.provider.name} from comparison`} onClick={() => toggleCompare(r.provider.id)}>
                          <X aria-hidden className="h-4 w-4" />
                        </button>
                      </div>
                      {r.provider.id === verdict.bestValueId && <span className="chip mt-2 bg-accent text-accent-ink"><Award aria-hidden className="h-3.5 w-3.5" /> Best value</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {row('Status', (r) => <StatusBadge status={r.status} compact />)}
                {row('True cost of access', (r) => (
                  <div>
                    <span className="num text-[1.4rem] font-extrabold">{usd(r.cost.total)}</span>
                    {r.cost.totalHigh > r.cost.total + 0.5 && <span className="block text-xs text-ink-600">up to {usd(r.cost.totalHigh)}</span>}
                    <div>{best(verdict.lowestTotalId, r.provider.id, 'Lowest total')}</div>
                    {r.overBudget && <span className="block text-sm text-amberx-800">Over your budget</span>}
                  </div>
                ), { strong: true })}
                {row(COST_LABELS.medical, (r) => <div><span className="num font-semibold">{usd(r.cost.medical)}</span><div>{best(verdict.lowestMedicalId, r.provider.id, 'Lowest medical')}</div></div>)}
                {row(COST_LABELS.transportation, (r) => <span className="num">{usd(r.cost.transportation)}</span>)}
                {row(COST_LABELS.parking, (r) => <span className="num">{usd(r.cost.parking)}</span>)}
                {(profile.extras.assistance > 0 || profile.extras.other > 0) && row('Assistance + other', (r) => <span className="num">{usd(r.cost.assistance + r.cost.other)}</span>)}
                {row('Distance', (r) => <div><span className="num">{r.cost.distanceMiles} mi</span><div>{best(verdict.closestId, r.provider.id, 'Closest')}</div></div>)}
                {row('Insurance', (r) => (plan.method === 'self_pay' || plan.method === 'unknown') ? <span className="text-sm text-ink-600">{plan.name}</span> : <NetworkBadge network={r.network} />)}
                {needIds.map((id) =>
                  row(
                    <span>{ACC_BY_ID[id].short} <span className="block text-xs font-normal text-ink-600">{profile.needs[id] === 'essential' ? 'Essential' : 'Preferred'}</span></span>,
                    (r) => {
                      const c = [...r.essentials, ...r.preferred].find((x) => x.id === id)!;
                      return (
                        <div className="flex items-start gap-2">
                          <AccStatusIcon status={c.status} />
                          <div><span className="font-semibold">{ACC_STATUS_TEXT[c.status]}</span><br /><SourceTag source={c.source} date={c.date} /></div>
                        </div>
                      );
                    },
                  ),
                )}
                {row('Needs verification', (r) => {
                  const items = [...r.unverified, ...r.preferred.filter((c) => c.status === 'unknown')];
                  return items.length ? <span className="text-sm text-amberx-800">{items.map((c) => ACC_BY_ID[c.id].short).join(', ')}</span> : <span className="text-sm text-ink-600">Nothing outstanding</span>;
                })}
                {row('New-patient wait', (r) => <span>~{r.provider.newPatientWaitDays} days</span>)}
                {row('Telehealth follow-ups', (r) => <span>{r.provider.telehealthFollowUps ? 'Yes' : 'No'}</span>)}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selected.length >= 2 && (
        <section className="panel mb-6 p-6">
          <CostComparisonChart
            rows={selected.map((r) => ({ name: r.provider.name.replace(/ (Associates|Center|Clinic|Group|Institute)$/, ''), cost: r.cost }))}
            title="Where the money goes"
            summary="Dark green is your estimated medical share; lighter segments are the costs of getting there. Compare the full bar, not just the first segment."
          />
        </section>
      )}

      {available.length > 0 && (
        <section aria-labelledby="add-h">
          <h2 id="add-h" className="mb-3 text-lg font-bold">Add providers</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {available.map((r) => (
              <li key={r.provider.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.provider.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm"><StatusBadge status={r.status} compact /><span className="num text-ink-700">{usd(r.cost.total)}</span></div>
                </div>
                <button type="button" className="btn-secondary shrink-0" disabled={compareIds.length >= MAX_COMPARE} onClick={() => toggleCompare(r.provider.id)}>
                  <Plus aria-hidden className="h-4 w-4" /> Add<span className="sr-only"> {r.provider.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
