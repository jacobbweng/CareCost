// Deterministic insurance-language analyzer.
// It identifies terms, explains them in plain language, extracts numbers it can
// find with their source sentence, flags missing information and drafts questions.
// It NEVER decides whether something is covered.
import type { AccId } from './types';

export interface TermDef {
  id: string;
  term: string;
  pattern: RegExp;
  plain: string;
  kind: 'cost' | 'requirement' | 'network' | 'coverage';
}

export const TERMS: TermDef[] = [
  { id: 'deductible', term: 'Deductible', kind: 'cost', pattern: /deductibles?/gi, plain: 'The amount you pay for covered care each year before your plan starts sharing the cost (except for services the plan covers before the deductible).' },
  { id: 'coinsurance', term: 'Coinsurance', kind: 'cost', pattern: /co-?insurance/gi, plain: 'Your percentage share of the allowed amount after you’ve met your deductible. With 20% coinsurance on a $200 allowed amount, you pay $40.' },
  { id: 'copay', term: 'Copay', kind: 'cost', pattern: /co-?pay(?:ments?|s)?\b/gi, plain: 'A fixed dollar amount you pay for a visit or service, like $45 per specialist visit.' },
  { id: 'oop', term: 'Out-of-pocket maximum', kind: 'cost', pattern: /out[- ]of[- ]pocket (?:maximum|max|limit)s?/gi, plain: 'The most you pay for covered, in-network care in a plan year. After you reach it, the plan pays 100% of covered in-network costs.' },
  { id: 'allowed', term: 'Allowed amount', kind: 'cost', pattern: /allowed amounts?|eligible expenses?|negotiated rates?/gi, plain: 'The price your plan has agreed to for a service. Your deductible and coinsurance are calculated from this, not from the clinic’s full charge.' },
  { id: 'prior_auth', term: 'Prior authorization', kind: 'requirement', pattern: /(?:prior|pre-?)\s?(?:authori[sz]ation|approval|certification)|pre-?authori[sz]ed?/gi, plain: 'Approval from your plan before you get a service. Without it, the plan may refuse to pay even if the service is normally covered.' },
  { id: 'referral', term: 'Referral', kind: 'requirement', pattern: /referrals?/gi, plain: 'A written order from your primary care provider allowing you to see a specialist. Common in HMO plans.' },
  { id: 'medical_necessity', term: 'Medically necessary', kind: 'requirement', pattern: /medically necessary|medical necessity/gi, plain: 'The plan only pays for care it considers needed to diagnose or treat a condition. Your clinician may need to document why a service is needed.' },
  { id: 'in_network', term: 'In-network', kind: 'network', pattern: /in[- ]network|participating providers?|preferred providers?/gi, plain: 'Providers that have a contract with your plan. You usually pay much less with them.' },
  { id: 'out_network', term: 'Out-of-network', kind: 'network', pattern: /out[- ]of[- ]network|non-?participating/gi, plain: 'Providers without a contract with your plan. You may pay more, or the plan may not pay at all.' },
  { id: 'balance_billing', term: 'Balance billing', kind: 'network', pattern: /balance[- ]bill(?:ing|ed)?/gi, plain: 'When an out-of-network provider bills you for the difference between their charge and what your plan paid.' },
  { id: 'dme', term: 'Durable medical equipment (DME)', kind: 'coverage', pattern: /durable medical equipment|\bDME\b|mobility devices?|wheelchairs?/gi, plain: 'Equipment like wheelchairs, walkers and hospital beds. Often covered separately, sometimes with prior authorization or rental-versus-purchase rules.' },
  { id: 'exclusion', term: 'Exclusion / not covered', kind: 'coverage', pattern: /not covered|exclusions?|excluded/gi, plain: 'Services the plan does not pay for. Read these carefully — they can apply even with a referral.' },
  { id: 'visit_limit', term: 'Visit limit', kind: 'coverage', pattern: /\d+\s+visits?\s+per\s+(?:calendar\s+|plan\s+|benefit\s+)?(?:year|period)/gi, plain: 'The plan covers only a set number of visits of this type per year.' },
  { id: 'telehealth', term: 'Telehealth', kind: 'coverage', pattern: /telehealth|telemedicine|virtual visits?/gi, plain: 'Visits by video or phone. Can save travel costs; check whether cost-sharing differs.' },
  { id: 'interpreter', term: 'Interpreter / language services', kind: 'coverage', pattern: /interpreters?|language (?:assistance|services)|sign language/gi, plain: 'Communication help, including sign-language interpreters. Ask who arranges and pays for it.' },
  { id: 'nemt', term: 'Transportation benefit', kind: 'coverage', pattern: /non-emergency (?:medical )?transportation|\bNEMT\b|transportation benefits?/gi, plain: 'Some plans help pay for rides to medical appointments. Check eligibility and how far ahead to book.' },
  { id: 'eob', term: 'Explanation of Benefits (EOB)', kind: 'cost', pattern: /explanation of benefits|\bEOB\b/gi, plain: 'A statement from your insurer showing what was billed, what the plan paid and what you may owe. It is not a bill.' },
  { id: 'specialist', term: 'Specialist', kind: 'coverage', pattern: /specialists?/gi, plain: 'A doctor focused on one area, such as neurology. Specialist visits often have different cost-sharing than primary care.' },
];

export interface ExtractedValue {
  key: 'deductible' | 'coinsurancePct' | 'specialistCopay' | 'otherCopay' | 'oopMax';
  label: string;
  value: number;
  display: string;
  sentence: string;
}

export interface PolicyAnalysis {
  found: { def: TermDef; count: number; sentences: string[] }[];
  values: ExtractedValue[];
  requirements: string[];
  missing: string[];
  questions: string[];
  highlights: { start: number; end: number; termId: string }[];
  wordCount: number;
}

const money = /\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{2}))?/;
const pct = /(\d{1,3})\s?%/;

function sentencesOf(text: string) {
  return text
    .split(/(?<=[.;!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const parseMoney = (m: RegExpMatchArray) => Number(m[1].replace(/,/g, '')) + (m[2] ? Number(m[2]) / 100 : 0);

export function analyzePolicy(text: string, context: { needs?: AccId[]; providerName?: string } = {}): PolicyAnalysis {
  const sentences = sentencesOf(text);
  const found: PolicyAnalysis['found'] = [];
  const highlights: PolicyAnalysis['highlights'] = [];

  for (const def of TERMS) {
    const re = new RegExp(def.pattern.source, def.pattern.flags);
    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = re.exec(text))) {
      count++;
      highlights.push({ start: m.index, end: m.index + m[0].length, termId: def.id });
    }
    if (count) {
      const sre = new RegExp(def.pattern.source, def.pattern.flags.replace('g', ''));
      found.push({ def, count, sentences: sentences.filter((s) => sre.test(s)).slice(0, 3) });
    }
  }

  // Merge overlapping highlights (keep the first / longest)
  highlights.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: PolicyAnalysis['highlights'] = [];
  for (const h of highlights) {
    const last = merged[merged.length - 1];
    if (last && h.start < last.end) continue;
    merged.push(h);
  }

  // ── Value extraction (prefer in-network, individual figures) ──
  const values: ExtractedValue[] = [];
  const isOON = (s: string) => /out[- ]of[- ]network|non-?participating/i.test(s);
  const isFamily = (s: string) => /family/i.test(s) && !/individual/i.test(s);
  const pick = (test: (s: string) => boolean) =>
    sentences.find((s) => test(s) && !isOON(s) && !isFamily(s)) ?? sentences.find((s) => test(s) && !isOON(s)) ?? sentences.find(test);

  const dedS = pick((s) => /deductible/i.test(s) && money.test(s) && !/out[- ]of[- ]pocket/i.test(s));
  if (dedS) {
    const m = dedS.match(money)!;
    values.push({ key: 'deductible', label: 'Annual deductible', value: parseMoney(m), display: m[0].replace(/\s/g, ''), sentence: dedS });
  }
  const coS = pick((s) => /co-?insurance/i.test(s) && pct.test(s));
  if (coS) {
    const m = coS.match(pct)!;
    values.push({ key: 'coinsurancePct', label: 'Coinsurance', value: Number(m[1]), display: `${m[1]}%`, sentence: coS });
  }
  const cpS = pick((s) => /co-?pay/i.test(s) && /specialist/i.test(s) && money.test(s)) ?? pick((s) => /co-?pay/i.test(s) && money.test(s));
  if (cpS) {
    const m = cpS.match(money)!;
    const spec = /specialist/i.test(cpS);
    values.push({
      key: spec ? 'specialistCopay' : 'otherCopay',
      label: spec ? 'Specialist copay' : /primary care/i.test(cpS) ? 'Primary care copay (not used for specialist estimates)' : 'Copay (service not specified)',
      value: parseMoney(m),
      display: m[0].replace(/\s/g, ''),
      sentence: cpS,
    });
  }
  const oopS = pick((s) => /out[- ]of[- ]pocket/i.test(s) && money.test(s));
  if (oopS) {
    const m = oopS.match(money)!;
    values.push({ key: 'oopMax', label: 'Out-of-pocket maximum', value: parseMoney(m), display: m[0].replace(/\s/g, ''), sentence: oopS });
  }

  const has = (id: string) => found.some((f) => f.def.id === id);
  const hasVal = (k: ExtractedValue['key']) => values.some((v) => v.key === k);

  // ── Requirements ──
  const requirements: string[] = [];
  if (has('prior_auth')) requirements.push('Some services require prior authorization — approval before you receive them.');
  if (has('referral')) requirements.push('A referral may be required before seeing a specialist.');
  if (has('medical_necessity')) requirements.push('Coverage depends on the service being considered medically necessary.');
  if (has('out_network')) requirements.push('Out-of-network rules apply — costs may be higher or not covered.');
  if (has('visit_limit')) requirements.push('There is a limit on the number of covered visits.');
  if (has('exclusion')) requirements.push('The text lists exclusions — services that are not covered.');

  // ── Missing information ──
  const missing: string[] = [];
  if (!hasVal('deductible')) missing.push('Deductible amount');
  if (!hasVal('coinsurancePct') && !hasVal('specialistCopay')) missing.push('Your share for a specialist visit (copay or coinsurance)');
  if (!hasVal('oopMax')) missing.push('Out-of-pocket maximum');
  if (!has('in_network') && !has('out_network')) missing.push('Network rules (in-network vs. out-of-network)');
  if (!has('prior_auth') && !has('referral')) missing.push('Whether referrals or prior authorization are required');
  missing.push('How much of your deductible and out-of-pocket maximum you have already met this year (never in a policy document)');

  // ── Questions to ask the insurer ──
  const q: string[] = [];
  const provider = context.providerName ?? 'the provider I plan to see';
  q.push(`Is ${provider} in network for my plan for a specialist visit?`);
  q.push('How much of my deductible and out-of-pocket maximum have I met so far this year?');
  if (!hasVal('coinsurancePct') && !hasVal('specialistCopay')) q.push('What will I pay for an in-network specialist visit — a copay or coinsurance?');
  if (has('prior_auth')) q.push('Which services in my care plan need prior authorization, and who submits the request — me or the clinic?');
  if (has('referral') || !has('prior_auth')) q.push('Do I need a referral from my primary care provider to see a specialist?');
  if (has('medical_necessity')) q.push('What documentation does my clinician need to show medical necessity?');
  if (has('dme') || (context.needs ?? []).some((n) => ['step_free_entrance', 'accessible_exam_room', 'transfer_assistance'].includes(n)))
    q.push('How is mobility equipment (for example, a wheelchair or its repairs) covered, and does it need prior authorization?');
  if ((context.needs ?? []).includes('asl_interpreter') || has('interpreter')) q.push('Does my plan or the provider arrange sign-language interpreters, and is there any cost to me?');
  q.push('Does my plan include any transportation benefit for medical appointments?');
  if (has('out_network')) q.push('If I see an out-of-network provider, how much will the plan pay and could I be balance-billed?');
  q.push('If a claim is denied, how do I appeal and what is the deadline?');

  return {
    found,
    values,
    requirements,
    missing,
    questions: Array.from(new Set(q)),
    highlights: merged,
    wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,
  };
}

export const SAMPLE_POLICY = `SAMPLE BENEFITS SUMMARY — fictional "Riverbend Silver PPO" (demonstration text, not a real plan)

Annual deductible: $1,500 individual / $3,000 family for in-network services. Out-of-network deductible: $3,000 individual.
After you meet your deductible, you pay 20% coinsurance for in-network specialist visits and 40% coinsurance out-of-network.
Primary care visits: $30 copay, deductible does not apply. Specialist visits are subject to the deductible and coinsurance.
Out-of-pocket maximum: $6,000 individual per calendar year for in-network services. Out-of-network providers may balance bill you for amounts above the allowed amount.
Prior authorization is required for MRI, CT and PET imaging, nerve conduction studies, and durable medical equipment over $500, including power wheelchairs.
Physical therapy is limited to 30 visits per calendar year. Services must be medically necessary.
Telehealth visits with in-network providers are covered at the same cost-sharing as office visits.
Non-emergency medical transportation is not covered under this plan.`;
