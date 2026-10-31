import { ArrowRight, CircleCheck, CircleQuestionMark, CircleX, ClipboardList, Pencil, Route, Sparkles } from 'lucide-react';
import { CostBar, CostComparisonChart } from '../components/CostViz';
import { CountUp } from '../components/Motion';
import { Callout, Money, NetworkBadge, PageHeader, StatusBadge, Term } from '../components/ui';
import { ACC_BY_ID } from '../data/accommodations';
import { PLAN_BY_ID, TRANSPORT_LABELS } from '../data/plans';
import { SPECIALTY_BY_ID } from '../data/providers';
import { generateChecklist } from '../lib/checklist';
import { usd } from '../lib/format';
import { href, navigate } from '../state/router';
import { useStore } from '../state/store';

export function Dashboard() {
  const { profile, summary, done, selectedId, selectProvider } = useStore();
  const { recommended: rec, meets, needsVerification, doesNotMeet, essentialIds, preferredIds, barrierInsight } = summary;
  const plan = PLAN_BY_ID[profile.planId];
  const spec = SPECIALTY_BY_ID[profile.specialty];

  const planTarget = summary.results.find((r) => r.provider.id === selectedId) ?? rec;
  const tasks = planTarget ? generateChecklist(profile, planTarget) : [];
  const completed = planTarget ? tasks.filter((t) => done[`${planTarget.provider.id}:${t.id}`]).length : 0;

  const cheaperUnverified = rec ? needsVerification.filter((n) => n.cost.total < rec.cost.total) : [];
  const eligible = [...meets, ...needsVerification];
  const chartRows = [
    ...eligible.map((r) => ({ name: r.provider.name.replace(/ (Associates|Center|Clinic|Group|Institute)$/, ''), cost: r.cost })),
  ].slice(0, 5);
  const lowestMedical = [...eligible].sort((a, b) => a.cost.medical - b.cost.medical)[0];

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={profile.name ? `Welcome back, ${profile.name}` : 'Your care overview'}
        actions={
          <a href={href('/profile')} className="btn-secondary"><Pencil aria-hidden className="h-4 w-4" /> Edit profile</a>
        }
      >
        Searching for <strong>{spec.label.toLowerCase()}</strong> near ZIP {profile.zip || '—'} with {plan?.name ?? 'no insurance details'}, travelling by {TRANSPORT_LABELS[profile.transport].label.toLowerCase()}.
      </PageHeader>

      {/* Profile summary strip */}
      <section aria-labelledby="needs-h" className="mb-8 rounded-xl2 border border-line bg-surface px-5 py-4">
        <h2 id="needs-h" className="sr-only">Your accessibility requirements</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-bold text-ink-600">Essential:</span>
          {essentialIds.length ? essentialIds.map((id) => (
            <span key={id} className="chip bg-accent text-accent-ink">{ACC_BY_ID[id].short}</span>
          )) : <span className="text-sm text-ink-600">None set</span>}
          <span className="ml-3 mr-1 text-sm font-bold text-ink-600">Preferred:</span>
          {preferredIds.length ? preferredIds.map((id) => (
            <span key={id} className="chip bg-pine-50 text-pine-900 ring-1 ring-pine-200">{ACC_BY_ID[id].short}</span>
          )) : <span className="text-sm text-ink-600">None set</span>}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        {/* Recommendation */}
        <section aria-labelledby="rec-h" className="panel p-6 md:p-7">
          <p className="eyebrow flex items-center gap-1.5"><Sparkles aria-hidden className="h-3.5 w-3.5" /> Top recommendation</p>
          {rec ? (
            <>
              <h2 id="rec-h" className="mt-2 text-[1.6rem] font-extrabold leading-tight">
                <a href={href(`/provider/${rec.provider.id}`)} className="hover:underline">{rec.provider.name}</a>
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge status={rec.status} />
                {plan && plan.method !== 'self_pay' && plan.method !== 'unknown' && <NetworkBadge network={rec.network} />}
                <span className="chip bg-paper-100 text-ink-700 ring-1 ring-line">{rec.cost.distanceMiles} mi away</span>
              </div>
              <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-4">
                <div>
                  <p className="text-sm font-semibold text-ink-600"><Term term="true cost of access">True cost of access</Term></p>
                  <CountUp value={rec.cost.total} className="block text-[2.6rem] font-bold tracking-tight text-white" duration={1100} />
                </div>
                <div className="pb-1.5">
                  <p className="text-sm font-semibold text-ink-600">Medical share</p>
                  <Money value={rec.cost.medical} size="md" />
                </div>
                <div className="pb-1.5">
                  <p className="text-sm font-semibold text-ink-600">Getting there</p>
                  <Money value={rec.cost.transportation + rec.cost.parking} size="md" />
                </div>
              </div>
              <div className="mt-4"><CostBar cost={rec.cost} label={rec.provider.name} /></div>
              <ul className="mt-5 space-y-1.5 text-[0.95rem]">
                {rec.reasons.slice(1, 4).map((r) => (
                  <li key={r} className="flex gap-2"><CircleCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-pine-700" />{r}</li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={() => { selectProvider(rec.provider.id); navigate('/plan'); }}>
                  Plan this visit <ArrowRight aria-hidden className="h-4 w-4" />
                </button>
                <a href={href('/find')} className="btn-secondary">See all matches</a>
              </div>
            </>
          ) : (
            <>
              <h2 id="rec-h" className="mt-2 text-[1.5rem] font-extrabold">No provider confirms every essential requirement</h2>
              <p className="mt-2 text-ink-700">
                {needsVerification.length
                  ? `${needsVerification.length} provider${needsVerification.length > 1 ? 's' : ''} might — their information is incomplete. Calling to verify is the next step.`
                  : 'Try adjusting your search: a different specialty, a wider travel distance, or reviewing which needs are essential.'}
              </p>
              <a href={href('/find')} className="btn-primary mt-5">Review alternatives <ArrowRight aria-hidden className="h-4 w-4" /></a>
            </>
          )}
        </section>

        {/* Match counts */}
        <section aria-labelledby="counts-h" className="panel p-6 md:p-7">
          <h2 id="counts-h" className="text-lg font-bold">{spec.label} providers in the demo region</h2>
          <ul className="mt-5 space-y-4">
            {[
              { n: meets.length, label: 'Meet your essential requirements', icon: <CircleCheck aria-hidden className="h-6 w-6 text-pine-700" /> },
              { n: needsVerification.length, label: 'Need verification (information missing)', icon: <CircleQuestionMark aria-hidden className="h-6 w-6 text-amberx-700" /> },
              { n: doesNotMeet.length, label: 'Confirmed not to meet a requirement', icon: <CircleX aria-hidden className="h-6 w-6 text-rust-700" /> },
            ].map((c) => (
              <li key={c.label} className="flex items-center gap-4">
                {c.icon}
                <span className="num w-8 text-[1.8rem] font-extrabold leading-none">{c.n}</span>
                <span className="text-ink-700">{c.label}</span>
              </li>
            ))}
          </ul>
          {planTarget && (
            <div className="mt-6 border-t border-line pt-5">
              <p className="flex items-center gap-2 font-bold"><ClipboardList aria-hidden className="h-5 w-5 text-pine-700" /> Appointment plan</p>
              <p className="mt-1 text-sm text-ink-600">{planTarget.provider.name}</p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-paper-200" role="progressbar" aria-label="Checklist progress" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={tasks.length}>
                <div className="h-full rounded-full bg-pine-600" style={{ width: `${tasks.length ? (completed / tasks.length) * 100 : 0}%` }} />
              </div>
              <p className="mt-2 text-sm"><span className="num font-bold">{completed}</span> of {tasks.length} steps done</p>
              <a href={href('/plan')} className="btn-secondary mt-3">Open plan</a>
            </div>
          )}
        </section>
      </div>

      {/* Insights */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {barrierInsight && barrierInsight.extraTransportCost > 0 && (
          <Callout tone="info" icon={<Route aria-hidden className="h-5 w-5" />} title={`Barrier cost: about ${usd(barrierInsight.extraTransportCost)} extra per visit`}>
            The nearest {spec.label.toLowerCase()} clinic, {barrierInsight.nearest.provider.name} ({barrierInsight.nearest.cost.distanceMiles} mi), is ruled out: {barrierInsight.nearestFailedLabels.join(' and ').toLowerCase()} {barrierInsight.nearest.status === 'does_not_meet' ? 'confirmed not available' : 'not yet verified'}. Reaching accessible care means {barrierInsight.extraMiles} more miles each way. This is a cost of inaccessible facilities — <Term term="barrier cost">not of your disability</Term>.
          </Callout>
        )}
        {rec && cheaperUnverified.length > 0 && (
          <Callout tone="warn" title={`Worth a phone call: ${cheaperUnverified[0].provider.name} could save ${usd(rec.cost.total - cheaperUnverified[0].cost.total)}`}>
            It may be your lowest-cost option, but {cheaperUnverified[0].unverified.map((u) => ACC_BY_ID[u.id].short.toLowerCase()).join(' and ')} {cheaperUnverified[0].unverified.length > 1 ? 'have' : 'has'} not been reported. CareCost won&rsquo;t recommend it until that&rsquo;s confirmed.{' '}
            <a className="font-semibold underline" href={href(`/provider/${cheaperUnverified[0].provider.id}`)}>See what to ask</a>
          </Callout>
        )}
      </div>

      {chartRows.length > 0 && (
        <section className="panel mt-6 p-6 md:p-7" aria-label="Cost comparison">
          <CostComparisonChart
            rows={chartRows}
            title="Medical bill vs. true cost of access"
            summary={
              lowestMedical && rec && lowestMedical.provider.id !== rec.provider.id
                ? `${lowestMedical.provider.name} has the lowest medical estimate (${usd(lowestMedical.cost.medical)}), but once travel is included ${rec.provider.name} is the best-value provider that meets every essential requirement.`
                : 'Each bar adds transportation and other costs of getting to care on top of your estimated medical share. Providers that fail an essential requirement are not shown.'
            }
          />
        </section>
      )}
    </>
  );
}
