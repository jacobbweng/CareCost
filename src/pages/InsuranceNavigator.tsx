import { Check, Copy, FileSearch, ListChecks, Sparkles, TriangleAlert } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { InsuranceSection } from '../components/ProfileSections';
import { Callout, PageHeader, cx } from '../components/ui';
import { PLAN_BY_ID } from '../data/plans';
import { aiAvailable, explainPolicyWithAI } from '../lib/ai';
import { SAMPLE_POLICY, TERMS, analyzePolicy, type PolicyAnalysis } from '../lib/policy';
import type { Profile } from '../lib/types';
import { useStore } from '../state/store';

const KIND_STYLE: Record<string, string> = {
  cost: 'bg-pine-100 text-pine-900 decoration-pine-600',
  requirement: 'bg-amberx-100 text-amberx-800 decoration-amberx-700',
  network: 'bg-[#0c1a2e] text-[#bcd7ff] decoration-[#5b8ed6]',
  coverage: 'bg-paper-200 text-ink decoration-ink-500',
};
const KIND_LABEL: Record<string, string> = { cost: 'Cost term', requirement: 'Requirement', network: 'Network term', coverage: 'Coverage term' };

export function InsuranceNavigator() {
  const { profile, setProfile, summary } = useStore();
  const plan = PLAN_BY_ID[profile.planId];
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<PolicyAnalysis | null>(null);
  const [analyzedText, setAnalyzedText] = useState('');
  const [applied, setApplied] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ai, setAi] = useState<{ state: 'idle' | 'loading' | 'done' | 'error'; text: string }>({ state: 'idle', text: '' });

  const patch = (p: Partial<Profile>) => setProfile((x) => ({ ...x, ...p }));
  const hasPlan = plan.method !== 'self_pay' && plan.method !== 'unknown';

  const run = () => {
    setAnalysis(analyzePolicy(text, { needs: summary.essentialIds, providerName: summary.recommended?.provider.name }));
    setAnalyzedText(text);
    setApplied(false);
    setAi({ state: 'idle', text: '' });
  };

  const applyValues = () => {
    if (!analysis) return;
    const v = Object.fromEntries(analysis.values.map((x) => [x.key, x.value])) as Record<string, number>;
    setProfile((p) => ({
      ...p,
      planId: 'custom',
      insurance: {
        method: v.coinsurancePct !== undefined || v.deductible !== undefined ? 'deductible_coinsurance' : v.specialistCopay !== undefined ? 'copay' : p.insurance.method,
        copay: v.specialistCopay ?? p.insurance.copay,
        // A policy lists the full deductible; until the user knows how much is met, treat it all as remaining (conservative).
        deductibleRemaining: v.deductible ?? p.insurance.deductibleRemaining,
        coinsurancePct: v.coinsurancePct ?? p.insurance.coinsurancePct,
        oopRemaining: v.oopMax ?? p.insurance.oopRemaining,
      },
    }));
    setApplied(true);
  };

  return (
    <>
      <PageHeader eyebrow="Insurance navigator" title="Understand your coverage">
        Check which providers appear to accept your plan, estimate your share, and turn dense benefits language into plain words and clear questions.
      </PageHeader>

      <section className="panel mb-6 p-6" aria-labelledby="net-h">
        <h2 id="net-h" className="text-xl font-bold">Does the clinic take my insurance?</h2>
        <p className="mt-2 max-w-2xl text-ink-700">Insurers don’t publish their networks in a way we can check, so ask when you call. Your visit plan includes the exact words to use.</p>
        <p className="mt-3 text-sm text-ink-600">{plan.priorAuthNote}</p>
      </section>

      <details className="panel group mb-6" open={!hasPlan}>
        <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 rounded-xl2 px-6 py-4 text-xl font-bold">
          Your plan details
          <span className="text-sm font-semibold text-pine-800 group-open:hidden">Edit</span>
        </summary>
        <div className="border-t border-line px-6 py-6">
          <InsuranceSection value={profile} onChange={patch} />
        </div>
      </details>

      {/* Policy analyzer */}
      <section className="panel p-6 md:p-7" aria-labelledby="pol-h">
        <h2 id="pol-h" className="flex items-center gap-2 text-xl font-bold"><FileSearch aria-hidden className="h-5 w-5 text-pine-700" /> Benefits language explainer</h2>
        <p className="mt-1 max-w-3xl text-ink-700">
          Paste part of your Summary of Benefits, policy or a denial letter. The analysis runs on this device — your text is not uploaded. It explains terms and finds numbers; it can&rsquo;t tell you whether something will be covered.
        </p>
        <label htmlFor="policy" className="field-label mt-5">Benefits or policy text</label>
        <textarea id="policy" className="input min-h-[180px] font-mono text-[0.9rem] leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste text here, or load the fictional sample." />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" disabled={!text.trim()} onClick={run}><ListChecks aria-hidden className="h-4 w-4" /> Analyze text</button>
          <button type="button" className="btn-secondary" onClick={() => setText(SAMPLE_POLICY)}>Try an example</button>
          {text && <button type="button" className="btn-ghost" onClick={() => { setText(''); setAnalysis(null); }}>Clear</button>}
        </div>

        <div aria-live="polite">
          {analysis && (
            <div className="mt-8 space-y-8">
              <p className="sr-only">Analysis complete: {analysis.found.length} terms found, {analysis.values.length} values extracted.</p>

              <div>
                <h3 className="text-lg font-bold">Your text, with insurance terms highlighted</h3>
                <ul className="mt-2 flex flex-wrap gap-3 text-sm" aria-label="Highlight key">
                  {Object.entries(KIND_LABEL).map(([k, l]) => (
                    <li key={k} className={cx('rounded px-2 py-0.5 underline decoration-2 underline-offset-2', KIND_STYLE[k])}>{l}</li>
                  ))}
                </ul>
                <div className="mt-3 max-h-[360px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-paper/60 p-4 text-[0.95rem] leading-relaxed">
                  <Highlighted text={analyzedText} a={analysis} />
                </div>
              </div>

              {analysis.values.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold">Numbers found</h3>
                  <ul className="mt-3 grid gap-3 md:grid-cols-2">
                    {analysis.values.map((v) => (
                      <li key={v.key} className="rounded-xl border border-line bg-surface p-4">
                        <p className="text-sm font-semibold text-ink-600">{v.label}</p>
                        <p className="num text-2xl font-extrabold">{v.display}</p>
                        <p className="mt-1 text-sm text-ink-600">From: &ldquo;{v.sentence}&rdquo;</p>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="button" className="btn-primary" onClick={applyValues}>Use these numbers in my estimates</button>
                    {applied && <p role="status" className="flex items-center gap-1.5 font-semibold text-pine-800"><Check aria-hidden className="h-4 w-4" /> Saved as “My own plan”. Cost estimates updated.</p>}
                  </div>
                  <p className="mt-2 text-sm text-ink-600">The full deductible is used as “remaining” until you tell CareCost how much you&rsquo;ve already met (the conservative assumption). Network status can&rsquo;t be checked for your own plan.</p>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-lg font-bold">Terms, in plain language</h3>
                  {analysis.found.length === 0 ? <p className="mt-2 text-ink-700">No common insurance terms found.</p> : (
                    <dl className="mt-3 space-y-3">
                      {analysis.found.map((f) => (
                        <div key={f.def.id} className="rounded-xl border border-line bg-surface p-4">
                          <dt className="flex items-center justify-between gap-2 font-bold">{f.def.term}<span className="text-xs font-semibold text-ink-500">{KIND_LABEL[f.def.kind]} · {f.count}×</span></dt>
                          <dd className="mt-1 text-[0.95rem] text-ink-700">{f.def.plain}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
                <div className="space-y-6">
                  {analysis.requirements.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold">Possible coverage requirements</h3>
                      <ul className="mt-3 space-y-2">
                        {analysis.requirements.map((r) => <li key={r} className="flex gap-2"><TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amberx-700" />{r}</li>)}
                      </ul>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold">Missing information</h3>
                    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-700">
                      {analysis.missing.map((m) => <li key={m}>{m}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-bold">Questions to ask your insurer</h3>
                      <button
                        type="button"
                        className="btn-ghost min-h-[40px] px-3 text-sm"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(analysis.questions.map((q, i) => `${i + 1}. ${q}`).join('\n'));
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          } catch { /* clipboard unavailable */ }
                        }}
                      >
                        {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />} {copied ? 'Copied' : 'Copy all'}
                      </button>
                    </div>
                    <ol className="mt-3 list-decimal space-y-1.5 pl-5">
                      {analysis.questions.map((q) => <li key={q}>{q}</li>)}
                    </ol>
                  </div>
                </div>
              </div>

              {aiAvailable() && (
                <div className="rounded-xl2 border border-pine-200 bg-pine-50/60 p-5">
                  <h3 className="flex items-center gap-2 font-bold"><Sparkles aria-hidden className="h-5 w-5 text-pine-700" /> Optional: AI plain-language summary</h3>
                  <p className="mt-1 text-sm text-ink-700">Sends only the text above to DeepSeek — not your profile. Remove anything personal first.</p>
                  <button type="button" className="btn-secondary mt-3" disabled={ai.state === 'loading'} onClick={async () => {
                    setAi({ state: 'loading', text: '' });
                    try { setAi({ state: 'done', text: await explainPolicyWithAI(analyzedText) }); } catch (e) { setAi({ state: 'error', text: (e as Error).message }); }
                  }}>
                    {ai.state === 'loading' ? 'Asking AI…' : 'Explain with AI'}
                  </button>
                  {ai.state === 'done' && <div className="mt-4 whitespace-pre-wrap rounded-xl bg-surface p-4 text-[0.95rem] leading-relaxed ring-1 ring-line">{ai.text}<p className="mt-3 text-xs text-ink-500">AI-generated summary — may contain errors. Not a coverage decision.</p></div>}
                  {ai.state === 'error' && <p className="mt-3 text-sm font-semibold text-rust-700">{ai.text}</p>}
                </div>
              )}

              <Callout tone="info">CareCost identifies language and drafts questions. Only your insurer can say what is covered and what you&rsquo;ll owe.</Callout>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Highlighted({ text, a }: { text: string; a: PolicyAnalysis }) {
  const termById = useMemo(() => Object.fromEntries(TERMS.map((t) => [t.id, t])), []);
  const out: ReactNode[] = [];
  let pos = 0;
  a.highlights.forEach((h, i) => {
    if (h.start > pos) out.push(text.slice(pos, h.start));
    const t = termById[h.termId];
    out.push(
      <mark key={i} className={cx('rounded px-0.5 underline decoration-2 underline-offset-2', KIND_STYLE[t.kind])} title={t.plain}>
        {text.slice(h.start, h.end)}
        <span className="sr-only"> ({KIND_LABEL[t.kind]})</span>
      </mark>,
    );
    pos = h.end;
  });
  out.push(text.slice(pos));
  return <>{out}</>;
}
