// Turns a set of match results into a plain-language trade-off explanation.
import { ACC_BY_ID } from '../data/accommodations';
import { usd } from './format';
import type { MatchResult } from './types';

export interface CompareVerdict {
  headline: string;
  points: string[];
  bestValueId: string | null;
  lowestMedicalId: string | null;
  lowestTotalId: string | null;
  closestId: string | null;
}

export function compareProviders(rs: MatchResult[]): CompareVerdict {
  const points: string[] = [];
  if (rs.length < 2) return { headline: 'Select at least two providers to compare.', points, bestValueId: null, lowestMedicalId: null, lowestTotalId: null, closestId: null };

  const by = (f: (r: MatchResult) => number) => [...rs].sort((a, b) => f(a) - f(b))[0];
  const lowMed = by((r) => r.cost.medical);
  const lowTot = by((r) => r.cost.total);
  const closest = by((r) => r.cost.distanceMiles);
  const eligible = rs.filter((r) => r.status === 'meets');
  const best = eligible.length ? [...eligible].sort((a, b) => b.score - a.score)[0] : null;

  if (lowMed.status === 'does_not_meet') {
    points.push(
      `${lowMed.provider.name} has the lowest medical estimate (${usd(lowMed.cost.medical)}) but is ruled out: ${lowMed.failed.map((f) => ACC_BY_ID[f.id].short.toLowerCase()).join(' and ')} confirmed not available.`,
    );
  }
  if (lowMed.provider.id !== lowTot.provider.id) {
    const diff = lowMed.cost.total - lowTot.cost.total;
    points.push(
      `${lowMed.provider.name} has the lowest medical bill, but ${lowTot.provider.name} costs ${usd(diff)} less overall once transportation and parking are included.`,
    );
  }
  if (best) {
    for (const r of eligible) {
      if (r.provider.id === best.provider.id) continue;
      if (r.cost.medical < best.cost.medical && r.cost.total > best.cost.total) {
        points.push(
          `${r.provider.name} has a lower medical estimate than ${best.provider.name} (${usd(r.cost.medical)} vs ${usd(best.cost.medical)}), but costs ${usd(r.cost.total - best.cost.total)} more overall once you count getting there (${r.cost.distanceMiles} mi vs ${best.cost.distanceMiles} mi).`,
        );
      }
    }
  }
  const unverified = rs.filter((r) => r.status === 'needs_verification');
  for (const u of unverified) {
    points.push(`${u.provider.name} still needs verification for ${u.unverified.map((x) => ACC_BY_ID[x.id].short.toLowerCase()).join(' and ')}.`);
  }
  const outNet = rs.filter((r) => r.network === 'out' && r.status !== 'does_not_meet');
  for (const o of outNet) points.push(`${o.provider.name} is out of network, which raises its medical estimate to the self-pay price.`);
  if (best) {
    const travel = best.cost.transportation + best.cost.parking;
    points.push(`${best.provider.name} is the best overall value that meets every essential requirement: ${usd(best.cost.total)} total, including ${usd(travel)} to get there.`);
  }

  const headline = best
    ? `Best choice among these: ${best.provider.name}`
    : unverified.length
      ? 'None of these confirm all your essential requirements yet — verification needed'
      : 'None of these meet all your essential requirements';

  return { headline, points, bestValueId: best?.provider.id ?? null, lowestMedicalId: lowMed.provider.id, lowestTotalId: lowTot.provider.id, closestId: closest.provider.id };
}
