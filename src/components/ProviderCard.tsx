import { ArrowRight, Bus, Check, ChevronRight, Clock, MapPin, Plus, Sparkles, TriangleAlert } from 'lucide-react';
import { ACC_BY_ID } from '../data/accommodations';
import { PLAN_BY_ID } from '../data/plans';
import { AREA_BY_ID } from '../data/providers';
import { usd } from '../lib/format';
import type { MatchResult } from '../lib/types';
import { href, navigate } from '../state/router';
import { MAX_COMPARE, useStore } from '../state/store';
import { CostBar } from './CostViz';
import { ACC_STATUS_TEXT, AccStatusIcon, NetworkBadge, SourceTag, StatusBadge, cx } from './ui';

export function RequirementList({ r, showPreferred = true }: { r: MatchResult; showPreferred?: boolean }) {
  const rows = [...r.essentials, ...(showPreferred ? r.preferred : [])];
  if (!rows.length) return <p className="text-sm text-ink-600">No accessibility requirements selected in your profile.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((c) => (
        <li key={c.id} className="flex items-start gap-2.5">
          <AccStatusIcon status={c.status} />
          <div className="min-w-0">
            <p className="text-[0.95rem] font-semibold leading-snug">
              {ACC_BY_ID[c.id].short}
              <span className="ml-1.5 font-normal text-ink-600">
                — {ACC_STATUS_TEXT[c.status]} · <span className={c.level === 'essential' ? 'font-semibold text-ink-700' : ''}>{c.level === 'essential' ? 'Essential' : 'Preferred'}</span>
              </span>
            </p>
            <SourceTag source={c.source} date={c.date} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProviderCard({ r, featured, maxTotal }: { r: MatchResult; featured?: boolean; maxTotal?: number }) {
  const { compareIds, toggleCompare, profile, selectProvider } = useStore();
  const p = r.provider;
  const plan = PLAN_BY_ID[profile.planId];
  const inCompare = compareIds.includes(p.id);
  const compareFull = !inCompare && compareIds.length >= MAX_COMPARE;
  const headingId = `pc-${p.id}`;

  return (
    <article
      aria-labelledby={headingId}
      className={cx(
        'lift rounded-xl2 border bg-surface/85 p-5 shadow-soft backdrop-blur-sm md:p-6',
        featured ? 'border-pine-500/60 shadow-glow' : 'border-line',
        r.status === 'does_not_meet' && 'bg-paper/60',
      )}
    >
      {featured && (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[0.8rem] font-bold text-accent-ink shadow-glow">
          <Sparkles aria-hidden className="h-3.5 w-3.5" /> Recommended for you
        </p>
      )}
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={r.status} />
            {plan && plan.method !== 'self_pay' && plan.method !== 'unknown' && <NetworkBadge network={r.network} planName={plan.name} />}
            {r.rank && !featured && <span className="chip bg-paper-100 text-ink-700 ring-1 ring-line">Rank #{r.rank}</span>}
          </div>
          <h3 id={headingId} className="mt-3 text-[1.3rem] font-bold leading-snug">
            <a href={href(`/provider/${p.id}`)} className="hover:text-pine-700 hover:underline">{p.name}</a>
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.92rem] text-ink-600">
            <span className="inline-flex items-center gap-1"><MapPin aria-hidden className="h-4 w-4" />{AREA_BY_ID[p.areaId]?.name} · {r.cost.distanceMiles} mi</span>
            <span className="inline-flex items-center gap-1"><Clock aria-hidden className="h-4 w-4" />New patients ~{p.newPatientWaitDays} days</span>
            {p.nearAccessibleTransit && <span className="inline-flex items-center gap-1"><Bus aria-hidden className="h-4 w-4" />Accessible transit nearby</span>}
          </p>
        </div>

        <div className="shrink-0 md:w-[260px] md:text-right">
          <p className="text-sm font-semibold text-ink-600">Estimated true cost of access</p>
          <p className="num text-[2rem] font-extrabold leading-tight tracking-tight">
            {usd(r.cost.total)}
          </p>
          <p className="text-sm text-ink-600">
            Medical share <span className="num font-semibold text-ink">{usd(r.cost.medical)}</span>
            {r.cost.totalHigh > r.cost.total + 0.5 && <> · up to <span className="num">{usd(r.cost.totalHigh)}</span></>}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <CostBar cost={r.cost} max={maxTotal} label={p.name} />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-ink-600">Your requirements</h4>
          <RequirementList r={r} />
        </div>
        <div>
          <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-ink-600">
            {r.status === 'does_not_meet' ? 'Why it was excluded' : 'Why this match'}
          </h4>
          <ul className="space-y-1.5 text-[0.93rem] leading-snug">
            {r.reasons.map((t) => (
              <li key={t} className="flex gap-2">
                {r.status === 'does_not_meet' ? <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-rust-700" /> : <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-pine-700" />}
                <span>{t}</span>
              </li>
            ))}
            {r.cautions.map((t) => (
              <li key={t} className="flex gap-2 text-amberx-800">
                <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4 no-print">
        <a href={href(`/provider/${p.id}`)} className="btn-secondary">
          Details <ChevronRight aria-hidden className="h-4 w-4" />
        </a>
        <button
          type="button"
          className={cx('btn-secondary', inCompare && 'border-pine-600 bg-pine-50 text-pine-900')}
          aria-pressed={inCompare}
          disabled={compareFull}
          onClick={() => toggleCompare(p.id)}
          title={compareFull ? `You can compare up to ${MAX_COMPARE} providers` : undefined}
        >
          {inCompare ? <Check aria-hidden className="h-4 w-4" /> : <Plus aria-hidden className="h-4 w-4" />}
          {inCompare ? 'In comparison' : 'Compare'}
          <span className="sr-only"> {p.name}</span>
        </button>
        {r.status !== 'does_not_meet' && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              selectProvider(p.id);
              navigate('/plan');
            }}
          >
            Plan this visit <ArrowRight aria-hidden className="h-4 w-4" />
            <span className="sr-only"> at {p.name}</span>
          </button>
        )}
      </div>
    </article>
  );
}
