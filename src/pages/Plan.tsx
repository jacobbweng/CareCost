import { Accessibility, MessageSquare, Phone, Printer } from 'lucide-react';
import { useState } from 'react';
import { CommunicationSection } from '../components/ProfileSections';
import { Callout, Money, PageHeader, Segmented, StatusBadge, cx } from '../components/ui';
import { ACC_BY_ID } from '../data/accommodations';
import { PLAN_BY_ID, TRANSPORT_LABELS } from '../data/plans';
import { SPECIALTY_BY_ID } from '../data/providers';
import { PHASE_META, generateChecklist } from '../lib/checklist';
import { usd } from '../lib/format';
import type { ChecklistTask, Phase, Profile } from '../lib/types';
import { href } from '../state/router';
import { useStore } from '../state/store';

// Hosted (sandboxed) builds can't open the print dialog, so the button is only shown when running locally.
const CAN_PRINT = import.meta.env.VITE_HOSTED !== '1';

const TAG_LABEL: Record<ChecklistTask['tag'], string> = {
  access: 'Access', insurance: 'Insurance', transport: 'Transport', communication: 'Communication', billing: 'Billing', care: 'Care',
};

export function Plan() {
  const { summary, selectedId, selectProvider, profile, setProfile, done, toggleDone } = useStore();
  const target = summary.results.find((r) => r.provider.id === selectedId && r.status !== 'does_not_meet') ?? summary.recommended ?? summary.needsVerification[0];
  const [phase, setPhase] = useState<Phase | 'all'>('all');

  if (!target) {
    return (
      <>
        <PageHeader eyebrow="Appointment plan" title="Choose a provider first" />
        <Callout tone="info">No provider currently matches your requirements. <a className="font-semibold underline" href={href('/find')}>Review alternatives in Find Care</a>.</Callout>
      </>
    );
  }

  const p = target.provider;
  const tasks = generateChecklist(profile, target);
  const key = (t: ChecklistTask) => `${p.id}:${t.id}`;
  const completed = tasks.filter((t) => done[key(t)]).length;
  const plan = PLAN_BY_ID[profile.planId];
  const eligible = summary.results.filter((r) => r.status !== 'does_not_meet');
  const patch = (x: Partial<Profile>) => setProfile((pr) => ({ ...pr, ...x }));
  const essentials = summary.essentialIds;
  const preferred = summary.preferredIds;

  return (
    <>
      <PageHeader
        eyebrow="Appointment plan"
        title={`Your visit to ${p.name}`}
        actions={CAN_PRINT ? <button type="button" className="btn-secondary" onClick={() => window.print()}><Printer aria-hidden className="h-4 w-4" /> Print plan</button> : undefined}
      >
        A step-by-step plan built from your access needs, this clinic&rsquo;s accessibility record, your insurance and how you&rsquo;ll travel.
      </PageHeader>

      <section className="panel mb-6 flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between no-print" aria-label="Selected provider">
        <div className="min-w-0">
          <label htmlFor="plan-provider" className="field-label">Planning for</label>
          <select id="plan-provider" className="input max-w-md" value={p.id} onChange={(e) => selectProvider(e.target.value)}>
            {eligible.map((r) => <option key={r.provider.id} value={r.provider.id}>{r.provider.name}{r.status === 'needs_verification' ? ' (needs verification)' : ''}</option>)}
          </select>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-700">
            <StatusBadge status={target.status} compact />
            <span>{SPECIALTY_BY_ID[p.specialty].service} · {target.cost.distanceMiles} mi · <Phone aria-hidden className="inline h-3.5 w-3.5" /> {p.phone} (fictional)</span>
          </div>
        </div>
        <div className="flex gap-8">
          <div>
            <p className="text-sm font-semibold text-ink-600">True cost estimate</p>
            <Money value={target.cost.total} size="lg" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-600">Progress</p>
            <p className="num text-3xl font-bold">{completed}<span className="text-lg text-ink-500">/{tasks.length}</span></p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
        <section aria-labelledby="checklist-h">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="checklist-h" className="text-[1.35rem] font-bold">Checklist</h2>
            <div className="no-print">
              <Segmented<Phase | 'all'>
                legend="Show phase"
                hideLegend
                size="sm"
                value={phase}
                onChange={setPhase}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'before', label: 'Before' },
                  { value: 'during', label: 'During' },
                  { value: 'after', label: 'After' },
                ]}
              />
            </div>
          </div>
          <div className="space-y-8">
            {(['before', 'during', 'after'] as Phase[]).filter((ph) => phase === 'all' || phase === ph).map((ph) => {
              const list = tasks.filter((t) => t.phase === ph);
              const n = list.filter((t) => done[key(t)]).length;
              return (
                <div key={ph}>
                  <h3 className="mb-3 flex items-center justify-between text-lg font-bold">
                    {PHASE_META[ph].label}
                    <span className="text-sm font-semibold text-ink-600">{n} of {list.length} done</span>
                  </h3>
                  <ul className="space-y-3">
                    {list.map((t) => {
                      const checked = !!done[key(t)];
                      const id = `task-${t.id}`;
                      return (
                        <li key={t.id} className={cx('rounded-xl2 border bg-surface p-4 transition-colors', checked ? 'border-pine-200 bg-pine-50/40' : 'border-line')}>
                          <div className="flex gap-3">
                            <input id={id} type="checkbox" className="mt-1 h-6 w-6 shrink-0 cursor-pointer accent-pine-700" checked={checked} onChange={() => toggleDone(key(t))} aria-describedby={`${id}-d`} />
                            <div className="min-w-0 flex-1">
                              <label htmlFor={id} className={cx('cursor-pointer text-[1.02rem] font-semibold', checked && 'text-ink-600 line-through decoration-pine-600')}>
                                {t.title}
                              </label>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                <span className="chip bg-paper-100 text-ink-700 ring-1 ring-line">{TAG_LABEL[t.tag]}</span>
                                {t.priority === 'high' && <span className="chip bg-amberx-100 text-amberx-800">Important</span>}
                              </div>
                              <p id={`${id}-d`} className="mt-2 text-[0.95rem] text-ink-700">{t.detail}</p>
                              {t.script && (
                                <p className="mt-2 flex gap-2 rounded-lg bg-paper-100 px-3 py-2 text-[0.92rem]">
                                  <MessageSquare aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-pine-700" />
                                  <span><span className="font-semibold">What to say: </span>&ldquo;{t.script}&rdquo;</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-6" aria-label="Access card and preferences">
          {/* Access card */}
          <section className="overflow-hidden rounded-xl2 border border-pine-300 bg-surface shadow-glow" aria-labelledby="card-h">
            <div className="on-dark flex items-center gap-2 bg-accent px-5 py-3 text-accent-ink">
              <Accessibility aria-hidden className="h-5 w-5" />
              <h2 id="card-h" className="text-lg font-bold text-accent-ink">My Access Card</h2>
            </div>
            <div className="space-y-4 px-5 py-5 text-[1.02rem]">
              <p className="text-sm text-ink-600">Show this at check-in so you don&rsquo;t have to explain again.</p>
              {profile.name && <p><span className="font-semibold">Name:</span> {profile.name}</p>}
              <div>
                <p className="font-bold">I need</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {essentials.length ? essentials.map((id) => <li key={id}>{ACC_BY_ID[id].label}</li>) : <li>No essential accommodations listed</li>}
                </ul>
              </div>
              {preferred.length > 0 && (
                <div>
                  <p className="font-bold">It helps if I can have</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">{preferred.map((id) => <li key={id}>{ACC_BY_ID[id].label}</li>)}</ul>
                </div>
              )}
              {profile.communication.length > 0 && (
                <div>
                  <p className="font-bold">How to communicate with me</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">{profile.communication.map((c) => <li key={c}>{c}</li>)}</ul>
                </div>
              )}
              {profile.questions.length > 0 && (
                <div>
                  <p className="font-bold">My questions</p>
                  <ol className="mt-1 list-decimal space-y-0.5 pl-5">{profile.questions.map((q) => <li key={q}>{q}</li>)}</ol>
                </div>
              )}
              <p className="border-t border-line pt-3 text-sm text-ink-600">
                Coverage: {plan.name} · Travel: {TRANSPORT_LABELS[profile.transport].label} · Est. medical share {usd(target.cost.medical)}
              </p>
            </div>
          </section>

          <section className="panel p-5 no-print" aria-labelledby="prefs-h">
            <h2 id="prefs-h" className="mb-4 text-lg font-bold">Edit card details</h2>
            <div className="[&>div]:grid-cols-1 [&>div]:lg:grid-cols-1">
              <CommunicationSection value={profile} onChange={patch} />
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
