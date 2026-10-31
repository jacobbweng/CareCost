// ─────────────────────────────────────────────────────────────
// Accessibility-constrained provider optimization
//
// 1. Essential requirements are HARD constraints:
//      any essential confirmed "no"  → Does not meet (excluded from recommendations)
//      any essential unknown          → Needs verification (never assumed yes OR no)
//      all essentials confirmed "yes" → Meets requirements
// 2. Only "Meets" providers can be recommended. Price can never buy back a
//    failed essential requirement.
// 3. Eligible providers are scored on true cost, distance, insurance fit,
//    preferred accommodations and information confidence, and every score is
//    explained in plain language.
// ─────────────────────────────────────────────────────────────
import { ACC_BY_ID } from '../data/accommodations';
import { PLAN_BY_ID } from '../data/plans';
import { computeTrueCost } from './cost';
import { networkStatus } from './insurance';
import { fmtDate, isStale, listJoin, usd } from './format';
import type {
  AccId,
  BarrierInsight,
  CostAssumptions,
  MatchResult,
  MatchStatus,
  MatchSummary,
  NeedLevel,
  Profile,
  Provider,
  RequirementCheck,
  ScoreParts,
} from './types';

export const WEIGHTS = {
  affordability: 0.45,
  insurance: 0.2,
  distance: 0.15,
  preferences: 0.15,
  confidence: 0.05,
} as const;

export const PENALTY_OVER_BUDGET = 8;
export const PENALTY_BEYOND_DISTANCE = 8;

export function checkRequirement(provider: Provider, id: AccId, level: NeedLevel): RequirementCheck {
  const rec = provider.access[id];
  return {
    id,
    level,
    status: rec?.status ?? 'unknown',
    source: rec?.source ?? 'none',
    date: rec?.date,
    note: rec?.note,
  };
}

export function classify(essentials: RequirementCheck[]): MatchStatus {
  if (essentials.some((c) => c.status === 'no')) return 'does_not_meet';
  if (essentials.some((c) => c.status === 'unknown')) return 'needs_verification';
  return 'meets';
}

const label = (id: AccId) => ACC_BY_ID[id]?.short ?? id;

/** Normalize so the best (lowest) value scores 1 and the worst scores 0. */
function normLowIsBetter(value: number, min: number, max: number) {
  if (max - min < 0.0001) return 1;
  return 1 - (value - min) / (max - min);
}

export function matchProviders(
  profile: Profile,
  providers: Provider[],
  assumptions: CostAssumptions,
  now = new Date(),
): MatchSummary {
  const plan = PLAN_BY_ID[profile.planId] ?? PLAN_BY_ID.unknown;
  const essentialIds = (Object.keys(profile.needs) as AccId[]).filter((k) => profile.needs[k] === 'essential');
  const preferredIds = (Object.keys(profile.needs) as AccId[]).filter((k) => profile.needs[k] === 'preferred');

  const pool = providers.filter((p) => p.specialty === profile.specialty);

  const base = pool.map((provider) => {
    const essentials = essentialIds.map((id) => checkRequirement(provider, id, 'essential'));
    const preferred = preferredIds.map((id) => checkRequirement(provider, id, 'preferred'));
    const status = classify(essentials);
    const cost = computeTrueCost(provider, profile, plan, assumptions);
    const network = networkStatus(provider, plan.id);
    return { provider, essentials, preferred, status, cost, network };
  });

  const eligible = base.filter((b) => b.status !== 'does_not_meet');
  const totals = eligible.map((b) => b.cost.total);
  const dists = eligible.map((b) => b.cost.distanceMiles);
  const [minT, maxT] = [Math.min(...totals), Math.max(...totals)];
  const [minD, maxD] = [Math.min(...dists), Math.max(...dists)];

  const results: MatchResult[] = base.map((b) => {
    const failed = b.essentials.filter((c) => c.status === 'no');
    const unverified = b.essentials.filter((c) => c.status === 'unknown');

    // ── Score parts (0–1) ──
    const affordability = b.status === 'does_not_meet' ? 0 : normLowIsBetter(b.cost.total, minT, maxT);
    const distance = b.status === 'does_not_meet' ? 0 : normLowIsBetter(b.cost.distanceMiles, minD, maxD);
    const insurance =
      plan.method === 'self_pay' ? 1 : plan.method === 'unknown' ? 0.5 : b.network === 'in' ? 1 : b.network === 'unknown' ? 0.4 : 0;
    const preferences = b.preferred.length
      ? b.preferred.reduce((s, c) => s + (c.status === 'yes' ? 1 : c.status === 'unknown' ? 0.25 : 0), 0) / b.preferred.length
      : 1;
    const confirmedEss = b.essentials.filter((c) => c.status === 'yes');
    const confidence = b.essentials.length
      ? b.essentials.reduce(
          (s, c) => s + (c.status === 'yes' ? (c.source === 'verified' && !isStale(c.date, now) ? 1 : 0.5) : 0),
          0,
        ) / b.essentials.length
      : 1;
    const scoreParts: ScoreParts = { affordability, distance, insurance, preferences, confidence };

    const overBudget = profile.budget !== null && b.cost.total > profile.budget;
    const beyondDistance = b.cost.distanceMiles > profile.maxDistance;

    let score =
      100 *
      (WEIGHTS.affordability * affordability +
        WEIGHTS.distance * distance +
        WEIGHTS.insurance * insurance +
        WEIGHTS.preferences * preferences +
        WEIGHTS.confidence * confidence);
    if (overBudget) score -= PENALTY_OVER_BUDGET;
    if (beyondDistance) score -= PENALTY_BEYOND_DISTANCE;
    score = b.status === 'does_not_meet' ? 0 : Math.max(0, Math.min(100, Math.round(score)));

    // ── Explanations ──
    const reasons: string[] = [];
    const cautions: string[] = [];

    if (b.status === 'does_not_meet') {
      for (const f of failed) {
        reasons.push(
          `${label(f.id)}: confirmed not available${f.source === 'verified' ? ` (verified ${fmtDate(f.date)})` : ' (reported by provider)'}${f.note ? ` — ${f.note}` : ''}`,
        );
      }
    } else {
      if (b.essentials.length) {
        if (b.status === 'meets') {
          const allVerified = confirmedEss.every((c) => c.source === 'verified');
          reasons.push(
            `Meets all ${b.essentials.length} essential requirement${b.essentials.length > 1 ? 's' : ''}${allVerified ? ' — each verified on site' : ''}.`,
          );
        } else {
          reasons.push(
            `Meets ${confirmedEss.length} of ${b.essentials.length} essential requirements; ${listJoin(unverified.map((u) => label(u.id)))} not yet reported.`,
          );
        }
      }
      if (plan.method !== 'self_pay' && plan.method !== 'unknown') {
        if (b.network === 'in') reasons.push(`In network with ${plan.name}.`);
        else if (b.network === 'out') cautions.push(`Out of network with ${plan.name} — medical estimate uses the self-pay price.`);
        else cautions.push(`Network status with ${plan.name} is unknown — confirm before booking.`);
      }
      if (b.preferred.length) {
        const met = b.preferred.filter((c) => c.status === 'yes').map((c) => label(c.id));
        const unk = b.preferred.filter((c) => c.status === 'unknown').map((c) => label(c.id));
        if (met.length) reasons.push(`Preferred accommodations available: ${listJoin(met)}.`);
        if (unk.length) cautions.push(`Not yet reported: ${listJoin(unk)} (preferred).`);
      }
      const selfReported = b.essentials.filter((c) => c.status === 'yes' && c.source === 'self_reported');
      if (selfReported.length)
        cautions.push(`${listJoin(selfReported.map((c) => label(c.id)))} reported by the provider, not independently verified.`);
      const stale = b.essentials.filter((c) => c.status === 'yes' && isStale(c.date, now));
      if (stale.length) cautions.push(`Accessibility information last updated over a year ago (${fmtDate(stale[0].date)}).`);
      if (overBudget) cautions.push(`Estimated total ${usd(b.cost.total)} is above your ${usd(profile.budget ?? 0)} budget.`);
      if (beyondDistance) cautions.push(`${b.cost.distanceMiles} mi away — beyond your ${profile.maxDistance} mi preference.`);
      if (plan.referralRequired) cautions.push(`${plan.name} requires a referral for specialist visits.`);
      if (profile.transport === 'public_transit' && !b.provider.nearAccessibleTransit)
        cautions.push('No accessible transit stop listed nearby.');
    }

    return {
      provider: b.provider,
      status: b.status,
      essentials: b.essentials,
      preferred: b.preferred,
      failed,
      unverified,
      network: b.network,
      cost: b.cost,
      score,
      scoreParts,
      overBudget,
      beyondDistance,
      reasons,
      cautions,
      rank: null,
    };
  });

  const byScore = (x: MatchResult, y: MatchResult) => y.score - x.score || x.cost.total - y.cost.total;
  const meets = results.filter((r) => r.status === 'meets').sort(byScore);
  const needsVerification = results.filter((r) => r.status === 'needs_verification').sort(byScore);
  const doesNotMeet = results
    .filter((r) => r.status === 'does_not_meet')
    .sort((x, y) => x.cost.total - y.cost.total);

  meets.forEach((m, i) => (m.rank = i + 1));

  // Relative cost reasons among eligible providers
  const meetTotals = meets.map((m) => m.cost.total);
  const lowestMeet = Math.min(...meetTotals);
  meets.forEach((m) => {
    if (m.cost.total === lowestMeet && meets.length > 1)
      m.reasons.splice(1, 0, `Lowest estimated total cost of access among matching providers (${usd(m.cost.total)}).`);
    else if (meets.length > 1)
      m.reasons.splice(1, 0, `${usd(m.cost.total - lowestMeet)} more than the lowest-cost matching option.`);
  });

  const recommended = meets[0] ?? null;
  if (recommended) recommended.reasons.unshift('Top match: best balance of total cost, insurance, distance and preferences among providers that meet every essential requirement.');

  return {
    results,
    meets,
    needsVerification,
    doesNotMeet,
    recommended,
    essentialIds,
    preferredIds,
    barrierInsight: barrierInsight(results, recommended),
  };
}

/**
 * Quantifies the cost of system barriers: how much extra the patient pays to
 * travel past the nearest provider because that provider is inaccessible to them.
 */
export function barrierInsight(results: MatchResult[], recommended: MatchResult | null): BarrierInsight | null {
  if (!recommended || results.length < 2) return null;
  const nearest = [...results].sort((a, b) => a.cost.distanceMiles - b.cost.distanceMiles)[0];
  if (nearest.provider.id === recommended.provider.id || nearest.status === 'meets') return null;
  const extraMiles = Math.round((recommended.cost.distanceMiles - nearest.cost.distanceMiles) * 10) / 10;
  const travel = (r: MatchResult) => r.cost.transportation + r.cost.parking;
  const extraTransportCost = Math.round((travel(recommended) - travel(nearest)) * 100) / 100;
  if (extraMiles <= 0) return null;
  return {
    nearest,
    recommended,
    extraMiles,
    extraTransportCost,
    nearestFailedLabels: (nearest.status === 'does_not_meet' ? nearest.failed : nearest.unverified).map((c) => label(c.id)),
  };
}

export const STATUS_META: Record<MatchStatus, { label: string; short: string }> = {
  meets: { label: 'Meets requirements', short: 'Meets' },
  needs_verification: { label: 'Needs verification', short: 'Verify' },
  does_not_meet: { label: 'Does not meet requirements', short: 'Does not meet' },
};
