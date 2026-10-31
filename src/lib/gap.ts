// Access gap analysis: which neighborhoods have an option that meets the user's
// essential requirements within a reasonable distance?
import { AREAS } from '../data/providers';
import type { Area, CostAssumptions, MatchResult } from './types';

export const COVERAGE_RADIUS_MI = 10;

export interface AreaCoverage {
  area: Area;
  nearestMeets: { result: MatchResult; miles: number } | null;
  nearestAny: { result: MatchResult; miles: number } | null;
  covered: boolean;
}

export function areaCoverage(results: MatchResult[], a: CostAssumptions, radius = COVERAGE_RADIUS_MI): AreaCoverage[] {
  return AREAS.map((area) => {
    const withDist = results
      .map((r) => ({ result: r, miles: Math.round(Math.hypot(r.provider.x - area.x, r.provider.y - area.y) * a.roadFactor * 10) / 10 }))
      .sort((x, y) => x.miles - y.miles);
    const nearestMeets = withDist.find((d) => d.result.status === 'meets') ?? null;
    return { area, nearestMeets, nearestAny: withDist[0] ?? null, covered: !!nearestMeets && nearestMeets.miles <= radius };
  });
}
