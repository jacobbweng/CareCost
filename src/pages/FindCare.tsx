import { ChevronDown, Map as MapIcon, Scale, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ProviderCard } from '../components/ProviderCard';
import { Callout, PageHeader, cx } from '../components/ui';
import { ACC_BY_ID } from '../data/accommodations';
import { PLAN_BY_ID } from '../data/plans';
import { SPECIALTIES } from '../data/providers';
import type { MatchResult, Profile } from '../lib/types';
import { href } from '../state/router';
import { useStore } from '../state/store';

type Sort = 'best' | 'total' | 'medical' | 'distance';

export function FindCare() {
  const { profile, setProfile, summary, compareIds } = useStore();
  const [sort, setSort] = useState<Sort>('best');
  const [maxCost, setMaxCost] = useState<string>('');
  const [inNetworkOnly, setInNetworkOnly] = useState(false);
  const [withinDistance, setWithinDistance] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const plan = PLAN_BY_ID[profile.planId];
  const hasNetwork = plan && plan.method !== 'self_pay' && plan.method !== 'unknown' && plan.id !== 'custom';

  const apply = (list: MatchResult[]) => {
    let out = list;
    const mc = Number(maxCost);
    if (maxCost && Number.isFinite(mc)) out = out.filter((r) => r.cost.total <= mc);
    if (inNetworkOnly && hasNetwork) out = out.filter((r) => r.network === 'in');
    if (withinDistance) out = out.filter((r) => r.cost.distanceMiles <= profile.maxDistance);
    const s = [...out];
    if (sort === 'total') s.sort((a, b) => a.cost.total - b.cost.total);
    if (sort === 'medical') s.sort((a, b) => a.cost.medical - b.cost.medical);
    if (sort === 'distance') s.sort((a, b) => a.cost.distanceMiles - b.cost.distanceMiles);
    return s;
  };

  const meets = useMemo(() => apply(summary.meets), [summary, sort, maxCost, inNetworkOnly, withinDistance]); // eslint-disable-line
  const verify = useMemo(() => apply(summary.needsVerification), [summary, sort, maxCost, inNetworkOnly, withinDistance]); // eslint-disable-line
  const excluded = useMemo(() => apply(summary.doesNotMeet), [summary, sort, maxCost, inNetworkOnly, withinDistance]); // eslint-disable-line
  const maxTotal = Math.max(1, ...summary.results.map((r) => r.cost.total));
  const total = meets.length + verify.length + excluded.length;
  const rec = summary.recommended;
  const featured = sort === 'best' && rec && meets[0]?.provider.id === rec.provider.id;

  return (
    <>
      <PageHeader
        eyebrow="Find care"
        title="Providers matched to your needs"
        actions={
          <>
            <a href={href('/map')} className="btn-secondary"><MapIcon aria-hidden className="h-4 w-4" /> Map view</a>
            <a href={href('/compare')} className="btn-secondary"><Scale aria-hidden className="h-4 w-4" /> Compare ({compareIds.length})</a>
          </>
        }
      >
        Essential requirements filter first. Only then does CareCost rank by true cost, insurance, distance and your preferences.
      </PageHeader>

      {/* Filters */}
      <section className="panel mb-8" aria-labelledby="filters-h">
        <h2 id="filters-h" className="m-0">
          <button type="button" className="flex w-full items-center gap-2 rounded-xl2 px-5 py-4 text-left text-[1.05rem] font-bold" aria-expanded={filtersOpen} aria-controls="filters-panel" onClick={() => setFiltersOpen((o) => !o)}>
            <SlidersHorizontal aria-hidden className="h-5 w-5 text-pine-700" /> Search &amp; filters
            <ChevronDown aria-hidden className={cx('ml-auto h-5 w-5 transition-transform', filtersOpen && 'rotate-180')} />
          </button>
        </h2>
        <div id="filters-panel" hidden={!filtersOpen} className="grid gap-5 border-t border-line px-5 py-5 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="f-spec" className="field-label">Specialty</label>
            <select id="f-spec" className="input" value={profile.specialty} onChange={(e) => setProfile((p) => ({ ...p, specialty: e.target.value as Profile['specialty'] }))}>
              {SPECIALTIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-sort" className="field-label">Sort by</label>
            <select id="f-sort" className="input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="best">Best overall match</option>
              <option value="total">Lowest true cost of access</option>
              <option value="medical">Lowest medical estimate</option>
              <option value="distance">Shortest distance</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-max" className="field-label">Max total cost</label>
            <div className="relative">
              <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500">$</span>
              <input id="f-max" className="input num pl-7" inputMode="numeric" placeholder="Any" value={maxCost} onChange={(e) => setMaxCost(e.target.value.replace(/[^\d.]/g, ''))} />
            </div>
          </div>
          <fieldset className="space-y-1">
            <legend className="field-label">Show only</legend>
            <label className={cx('flex min-h-[36px] items-center gap-2.5 text-[0.95rem]', !hasNetwork && 'opacity-60')}>
              <input type="checkbox" className="h-5 w-5 accent-pine-700" checked={inNetworkOnly} disabled={!hasNetwork} onChange={(e) => setInNetworkOnly(e.target.checked)} />
              In network{!hasNetwork && ' (needs a sample plan)'}
            </label>
            <label className="flex min-h-[36px] items-center gap-2.5 text-[0.95rem]">
              <input type="checkbox" className="h-5 w-5 accent-pine-700" checked={withinDistance} onChange={(e) => setWithinDistance(e.target.checked)} />
              Within {profile.maxDistance} mi
            </label>
          </fieldset>
          <p className="text-sm text-ink-600 md:col-span-2 lg:col-span-4">
            Accessibility requirements come from <a className="font-semibold text-pine-800 underline" href={href('/profile')}>your profile</a>:{' '}
            {summary.essentialIds.length ? summary.essentialIds.map((id) => ACC_BY_ID[id].short).join(', ') + ' (essential)' : 'no essential requirements set'}.
          </p>
        </div>
      </section>

      <p className="sr-only" role="status" aria-live="polite">
        {meets.length} meet requirements, {verify.length} need verification, {excluded.length} do not meet requirements.
      </p>

      {total === 0 && (
        <Callout tone="warn" title="No providers match these filters">Try removing the cost or distance filter, or choose another specialty.</Callout>
      )}

      {!rec && summary.results.length > 0 && (
        <div className="mb-6">
          <Callout tone="warn" title="No provider confirms all of your essential requirements">
            CareCost won&rsquo;t trade away an essential need for a lower price. The providers below might work but need verification, or meet only some of your needs. Each one lists exactly what&rsquo;s missing.
          </Callout>
        </div>
      )}

      {meets.length > 0 && (
        <section aria-labelledby="g-meets" className="mb-10">
          <h2 id="g-meets" className="mb-4 flex items-center gap-2 text-[1.35rem] font-bold">
            Meets your requirements <span className="chip bg-pine-100 text-pine-900">{meets.length}</span>
          </h2>
          <div className="space-y-5">
            {meets.map((r, i) => <ProviderCard key={r.provider.id} r={r} featured={!!featured && i === 0} maxTotal={maxTotal} />)}
          </div>
        </section>
      )}

      {verify.length > 0 && (
        <section aria-labelledby="g-verify" className="mb-10">
          <h2 id="g-verify" className="flex items-center gap-2 text-[1.35rem] font-bold">
            Needs verification <span className="chip bg-amberx-100 text-amberx-800">{verify.length}</span>
          </h2>
          <p className="mb-4 mt-1 text-ink-700">These providers haven&rsquo;t reported whether they meet one or more essential requirements. Unknown is treated as unknown — not as a yes or a no.</p>
          <div className="space-y-5">
            {verify.map((r) => <ProviderCard key={r.provider.id} r={r} maxTotal={maxTotal} />)}
          </div>
        </section>
      )}

      {excluded.length > 0 && (
        <section aria-labelledby="g-excl">
          <h2 id="g-excl" className="flex items-center gap-2 text-[1.35rem] font-bold">
            Does not meet your requirements <span className="chip bg-rust-50 text-rust-800">{excluded.length}</span>
          </h2>
          <p className="mb-4 mt-1 text-ink-700">
            Confirmed not to provide at least one essential accommodation — so they are never recommended, even when cheaper.
          </p>
          <button type="button" className="btn-secondary mb-4" aria-expanded={showExcluded} aria-controls="excluded-list" onClick={() => setShowExcluded((s) => !s)}>
            {showExcluded ? 'Hide' : 'Show'} excluded providers
          </button>
          <div id="excluded-list" hidden={!showExcluded} className="space-y-5">
            {excluded.map((r) => <ProviderCard key={r.provider.id} r={r} maxTotal={maxTotal} />)}
          </div>
        </section>
      )}
    </>
  );
}
