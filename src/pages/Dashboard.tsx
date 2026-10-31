import { ArrowRight, CircleCheck, CircleQuestionMark, CircleX, ClipboardList, LoaderCircle, Map as MapIcon, Pencil, Route } from 'lucide-react';
import { CostBar, CostComparisonChart } from '../components/CostViz';
import { CountUp } from '../components/Motion';
import { TRANSPORT_CHOICES } from '../components/ProfileSections';
import { Callout, Money, PageHeader, StatusBadge, Term } from '../components/ui';
import { ACC_BY_ID } from '../data/accommodations';
import { PLAN_BY_ID } from '../data/plans';
import { SPECIALTY_BY_ID } from '../data/providers';
import { generateChecklist } from '../lib/checklist';
import { usd } from '../lib/format';
import { href, navigate } from '../state/router';
import { useStore } from '../state/store';

export function Dashboard() {
  const { profile, summary, done, selectedId, selectProvider, search } = useStore();
  const { recommended, meets, needsVerification, doesNotMeet, essentialIds, preferredIds, barrierInsight } = summary;
  const plan = PLAN_BY_ID[profile.planId];
  const spec = SPECIALTY_BY_ID[profile.specialty];
  const travel = TRANSPORT_CHOICES.find((t) => t.value === profile.transport)?.label ?? '';

  // Best option: a clinic that confirms every must-have — otherwise the best one to call first
  const best = recommended ?? needsVerification[0] ?? null;
  const planTarget = summary.results.find((r) => r.provider.id === selectedId) ?? best;
  const tasks = planTarget ? generateChecklist(profile, planTarget) : [];
  const completed = planTarget ? tasks.filter((t) => done[`${planTarget.provider.id}:${t.id}`]).length : 0;
  const chartRows = [...meets, ...needsVerification].slice(0, 5).map((r) => ({ name: r.provider.name.length > 26 ? r.provider.name.slice(0, 25) + '…' : r.provider.name, cost: r.cost }));

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={profile.name ? `Hi, ${profile.name}` : 'Your care overview'}
        actions={<a href={href('/profile')} className="btn-secondary"><Pencil aria-hidden className="h-4 w-4" /> Edit</a>}
      >
        {spec.label} near {profile.location?.label} · {plan?.name} · {travel}
      </PageHeader>

      {(essentialIds.length > 0 || preferredIds.length > 0) && (
        <section aria-label="Your needs" className="mb-6 flex flex-wrap items-center gap-2">
          {essentialIds.map((id) => <span key={id} className="chip bg-accent text-accent-ink">Must: {ACC_BY_ID[id].short}</span>)}
          {preferredIds.map((id) => <span key={id} className="chip bg-pine-50 text-pine-900 ring-1 ring-pine-200">Nice: {ACC_BY_ID[id].short}</span>)}
        </section>
      )}

      {search.status === 'loading' && !summary.results.length ? (
        <div className="panel flex items-center gap-3 p-8 text-lg font-semibold" role="status"><LoaderCircle aria-hidden className="h-6 w-6 animate-spin text-pine-700" /> Finding clinics near you…</div>
      ) : search.status === 'error' ? (
        <Callout tone="danger" title="Couldn’t load clinics">{search.error} <button type="button" className="ml-1 font-bold underline" onClick={search.refresh}>Try again</button></Callout>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
            <section aria-labelledby="best-h" className="panel p-6 md:p-7">
              <p className="eyebrow">{recommended ? 'Best match' : 'Best to call first'}</p>
              {best ? (
                <>
                  <h2 id="best-h" className="mt-2 text-[1.7rem] font-extrabold leading-tight">
                    <a href={href(`/provider/${best.provider.id}`)} className="hover:underline">{best.provider.name}</a>
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge status={best.status} />
                    <span className="chip bg-paper-100 text-ink-700 ring-1 ring-line">{best.cost.distanceMiles} mi{best.provider.driveMinutes ? ` · ${best.provider.driveMinutes} min` : ''}</span>
                  </div>
                  <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-4">
                    <div>
                      <p className="text-sm font-semibold text-ink-600"><Term term="true cost of access">Estimated total</Term></p>
                      <CountUp value={best.cost.total} className="block text-[2.6rem] font-bold tracking-tight text-white" duration={1100} />
                    </div>
                    <div className="pb-1.5">
                      <p className="text-sm font-semibold text-ink-600">Visit</p>
                      <Money value={best.cost.medical} />
                    </div>
                    <div className="pb-1.5">
                      <p className="text-sm font-semibold text-ink-600">Getting there</p>
                      <Money value={best.cost.transportation + best.cost.parking} />
                    </div>
                  </div>
                  <div className="mt-4"><CostBar cost={best.cost} label={best.provider.name} /></div>
                  {best.status === 'needs_verification' && best.unverified.length > 0 && (
                    <p className="mt-4 rounded-xl border border-[#5c4512] bg-amberx-50 px-3 py-2 text-amberx-800">
                      <strong>Ask when you call:</strong> {best.unverified.map((u) => ACC_BY_ID[u.id].short.toLowerCase()).join(', ')}.
                    </p>
                  )}
                  <div className="mt-6 flex flex-wrap gap-2">
                    <button type="button" className="btn-primary" onClick={() => { selectProvider(best.provider.id); navigate('/plan'); }}>
                      Plan this visit <ArrowRight aria-hidden className="h-4 w-4" />
                    </button>
                    <a href={href('/map')} className="btn-secondary"><MapIcon aria-hidden className="h-4 w-4" /> See on map</a>
                  </div>
                </>
              ) : (
                <>
                  <h2 id="best-h" className="mt-2 text-[1.5rem] font-extrabold">No clinics found yet</h2>
                  <p className="mt-2 text-ink-700">Try a wider distance on the map.</p>
                  <a href={href('/map')} className="btn-primary mt-5">Open the map</a>
                </>
              )}
            </section>

            <section aria-labelledby="counts-h" className="panel p-6 md:p-7">
              <h2 id="counts-h" className="text-lg font-bold">Within {profile.maxDistance} miles</h2>
              <ul className="mt-5 space-y-4">
                {[
                  { n: meets.length, label: 'Have your must-haves', icon: <CircleCheck aria-hidden className="h-6 w-6 text-pine-700" /> },
                  { n: needsVerification.length, label: 'Call to check', icon: <CircleQuestionMark aria-hidden className="h-6 w-6 text-amberx-700" /> },
                  { n: doesNotMeet.length, label: 'Missing a must-have', icon: <CircleX aria-hidden className="h-6 w-6 text-rust-700" /> },
                ].map((c) => (
                  <li key={c.label} className="flex items-center gap-4">
                    {c.icon}
                    <span className="num w-10 text-[1.8rem] font-extrabold leading-none">{c.n}</span>
                    <span className="text-ink-700">{c.label}</span>
                  </li>
                ))}
              </ul>
              {planTarget && (
                <div className="mt-6 border-t border-line pt-5">
                  <p className="flex items-center gap-2 font-bold"><ClipboardList aria-hidden className="h-5 w-5 text-pine-700" /> Visit plan</p>
                  <p className="mt-1 text-sm text-ink-600">{planTarget.provider.name}</p>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-paper-200" role="progressbar" aria-label="Checklist progress" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={tasks.length}>
                    <div className="h-full rounded-full bg-pine-600" style={{ width: `${tasks.length ? (completed / tasks.length) * 100 : 0}%` }} />
                  </div>
                  <p className="mt-2 text-sm"><span className="num font-bold">{completed}</span> of {tasks.length} done</p>
                  <a href={href('/plan')} className="btn-secondary mt-3">Open plan</a>
                </div>
              )}
            </section>
          </div>

          {barrierInsight && barrierInsight.extraTransportCost > 0 && (
            <div className="mt-6">
              <Callout tone="info" icon={<Route aria-hidden className="h-5 w-5" />} title={`Barrier cost: about ${usd(barrierInsight.extraTransportCost)} more per visit`}>
                The closest clinic, {barrierInsight.nearest.provider.name} ({barrierInsight.nearest.cost.distanceMiles} mi), {barrierInsight.nearest.status === 'does_not_meet' ? 'is missing' : 'hasn’t confirmed'} {barrierInsight.nearestFailedLabels.join(' and ').toLowerCase()}. That’s a cost of <Term term="barrier cost">inaccessible clinics</Term>, not of you.
              </Callout>
            </div>
          )}

          {chartRows.length > 1 && (
            <section className="panel mt-6 p-6 md:p-7" aria-label="Cost comparison">
              <CostComparisonChart rows={chartRows} title="Visit price vs. total cost" summary="Each bar is the visit plus the cost of getting there. Clinics missing a must-have aren’t shown." />
            </section>
          )}
        </>
      )}
    </>
  );
}
