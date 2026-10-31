import { describe, expect, it } from 'vitest';
import { DEFAULT_ASSUMPTIONS, DEMO_PROFILE, PLAN_BY_ID } from '../data/plans';
import { PROVIDERS, PROVIDER_BY_ID } from '../data/providers';
import { generateChecklist } from './checklist';
import { computeTrueCost } from './cost';
import { estimateInsurance } from './insurance';
import { matchProviders } from './matching';
import { needsFromParser } from './testHelpers';
import { SAMPLE_POLICY, analyzePolicy } from './policy';
import type { Profile } from './types';

const NOW = new Date('2026-10-31T12:00:00');
const run = (p: Profile) => matchProviders(p, PROVIDERS, DEFAULT_ASSUMPTIONS, NOW);

describe('insurance estimator', () => {
  it('deductible + coinsurance follows the spec formula', () => {
    const e = estimateInsurance({ method: 'deductible_coinsurance', allowedAmount: 1000, deductibleRemaining: 300, coinsurancePct: 20, oopRemaining: 5000, copay: null });
    // 300 + (700 × 0.2) = 440
    expect(e.estimate).toBe(440);
    expect(e.cappedByOop).toBe(false);
  });
  it('caps at remaining out-of-pocket maximum', () => {
    const e = estimateInsurance({ method: 'deductible_coinsurance', allowedAmount: 1000, deductibleRemaining: 300, coinsurancePct: 20, oopRemaining: 400, copay: null });
    expect(e.estimate).toBe(400);
    expect(e.cappedByOop).toBe(true);
  });
  it('service fully under deductible', () => {
    const e = estimateInsurance({ method: 'deductible_coinsurance', allowedAmount: 245, deductibleRemaining: 350, coinsurancePct: 20, oopRemaining: 2800, copay: null });
    expect(e.estimate).toBe(245);
  });
  it('unknown deductible produces a range and a warning, never silently zero', () => {
    const e = estimateInsurance({ method: 'deductible_coinsurance', allowedAmount: 200, deductibleRemaining: null, coinsurancePct: 20, oopRemaining: null, copay: null });
    expect(e.low).toBe(40);
    expect(e.high).toBe(200);
    expect(e.estimate).toBe(200);
    expect(e.warnings.length).toBeGreaterThan(0);
  });
  it('copay model', () => {
    expect(estimateInsurance({ method: 'copay', allowedAmount: 245, copay: 45, deductibleRemaining: 0, coinsurancePct: 0, oopRemaining: 1900 }).estimate).toBe(45);
    expect(estimateInsurance({ method: 'copay', allowedAmount: 30, copay: 45, deductibleRemaining: 0, coinsurancePct: 0, oopRemaining: 1900 }).estimate).toBe(30);
    expect(estimateInsurance({ method: 'copay', allowedAmount: 245, copay: 45, deductibleRemaining: 0, coinsurancePct: 0, oopRemaining: 10 }).estimate).toBe(10);
  });
});

describe('true cost of access', () => {
  it('sums components', () => {
    const c = computeTrueCost(PROVIDER_BY_ID['eastbrook-neuro'], { ...DEMO_PROFILE, extras: { assistance: 40, other: 5 } }, PLAN_BY_ID['sample-ppo'], DEFAULT_ASSUMPTIONS);
    expect(c.total).toBeCloseTo(c.medical + c.transportation + c.parking + c.assistance + c.other, 2);
    expect(c.assistance).toBe(40);
  });
  it('accessibility needs never change the predicted price', () => {
    const p = PROVIDER_BY_ID['eastbrook-neuro'];
    const a = computeTrueCost(p, { ...DEMO_PROFILE, needs: {} }, PLAN_BY_ID['sample-ppo'], DEFAULT_ASSUMPTIONS);
    const b = computeTrueCost(p, DEMO_PROFILE, PLAN_BY_ID['sample-ppo'], DEFAULT_ASSUMPTIONS);
    expect(a.total).toBe(b.total);
  });
});

describe('accessibility-constrained matching (demo scenario)', () => {
  const s = run(DEMO_PROFILE);
  const status = (id: string) => s.results.find((r) => r.provider.id === id)!.status;

  it('excludes the cheap clinic with a confirmed inaccessible exam room', () => {
    expect(status('northgate-neuro')).toBe('does_not_meet');
    expect(status('westmere-neuro')).toBe('does_not_meet');
  });
  it('treats missing information as needs verification, not pass or fail', () => {
    expect(status('midtown-neuro')).toBe('needs_verification');
  });
  it('never recommends a provider that fails an essential requirement', () => {
    expect(s.recommended).not.toBeNull();
    expect(s.recommended!.status).toBe('meets');
    expect(s.recommended!.provider.id).toBe('eastbrook-neuro');
  });
  it('lower medical price is not always lower total cost', () => {
    const lake = s.results.find((r) => r.provider.id === 'lakeshore-neuro')!;
    const east = s.results.find((r) => r.provider.id === 'eastbrook-neuro')!;
    expect(lake.cost.medical).toBeLessThan(east.cost.medical);
    expect(lake.cost.total).toBeGreaterThan(east.cost.total);
  });
  it('quantifies the barrier cost of skipping the nearest inaccessible clinic', () => {
    expect(s.barrierInsight?.nearest.provider.id).toBe('northgate-neuro');
    expect(s.barrierInsight!.extraTransportCost).toBeGreaterThan(0);
  });
  it('generates a checklist with insurance and transport tasks', () => {
    const tasks = generateChecklist(DEMO_PROFILE, s.recommended!);
    expect(tasks.some((t) => t.tag === 'insurance')).toBe(true);
    expect(tasks.some((t) => t.id === 'transport')).toBe(true);
    expect(tasks.filter((t) => t.phase === 'after').length).toBeGreaterThan(2);
  });
  it('a needs-verification provider produces a verification task', () => {
    const mid = s.results.find((r) => r.provider.id === 'midtown-neuro')!;
    expect(generateChecklist(DEMO_PROFILE, mid).some((t) => t.id === 'verify-accessible_exam_room')).toBe(true);
  });
});

describe('different profiles produce different recommendations', () => {
  it('ASL interpreter as the only essential need favors Westmere', () => {
    const s = run({ ...DEMO_PROFILE, needs: { asl_interpreter: 'essential' } });
    expect(s.recommended?.provider.id).toBe('westmere-neuro');
    expect(s.results.find((r) => r.provider.id === 'northgate-neuro')!.status).toBe('does_not_meet');
  });
  it('no provider meets every requirement → no recommendation, alternatives listed', () => {
    const s = run({ ...DEMO_PROFILE, needs: { accessible_exam_room: 'essential', low_sensory_room: 'essential' } });
    expect(s.meets.length).toBe(0);
    expect(s.recommended).toBeNull();
    expect(s.needsVerification.length + s.doesNotMeet.length).toBe(6);
  });
  it('switching to driving changes costs', () => {
    const a = run(DEMO_PROFILE);
    const b = run({ ...DEMO_PROFILE, transport: 'own_vehicle' });
    expect(a.recommended!.cost.total).not.toBe(b.recommended!.cost.total);
  });
});

describe('policy analyzer', () => {
  const a = analyzePolicy(SAMPLE_POLICY);
  it('extracts in-network individual values', () => {
    const v = Object.fromEntries(a.values.map((x) => [x.key, x.value]));
    expect(v.deductible).toBe(1500);
    expect(v.coinsurancePct).toBe(20);
    expect(v.oopMax).toBe(6000);
  });
  it('finds requirements and questions', () => {
    expect(a.requirements.some((r) => /prior authorization/i.test(r))).toBe(true);
    expect(a.questions.length).toBeGreaterThan(3);
  });
  it('flags missing information on sparse text', () => {
    const b = analyzePolicy('Specialist visits are covered.');
    expect(b.missing.length).toBeGreaterThan(3);
  });
});

describe('needs parser', () => {
  it('maps plain language to accommodations', () => {
    const ids = needsFromParser("I use a power wheelchair and can't do stairs. Bright lights bother me.");
    expect(ids.step_free_entrance).toBe('essential');
    expect(ids.low_sensory_room).toBe('preferred');
  });
  it('respects simple negation', () => {
    const ids = needsFromParser("I don't need an interpreter.");
    expect(ids.asl_interpreter).toBeUndefined();
  });
});

import { compareProviders } from './compare';
import { areaCoverage } from './gap';

describe('comparison and gap analysis', () => {
  const s = run(DEMO_PROFILE);
  it('explains the lower-medical-but-higher-total trade-off', () => {
    const pick = ['eastbrook-neuro', 'lakeshore-neuro', 'northgate-neuro'].map((id) => s.results.find((r) => r.provider.id === id)!);
    const v = compareProviders(pick);
    expect(v.bestValueId).toBe('eastbrook-neuro');
    expect(v.points.some((p) => p.startsWith('Lakeshore Neuro Center has a lower medical estimate'))).toBe(true);
    expect(v.points.some((p) => p.includes('ruled out'))).toBe(true);
  });
  it('finds neighborhoods without nearby accessible care', () => {
    const cov = areaCoverage(s.results, DEFAULT_ASSUMPTIONS);
    expect(cov.some((c) => !c.covered)).toBe(true);
    expect(cov.find((c) => c.area.id === 'riverside')!.covered).toBe(true);
  });
});
