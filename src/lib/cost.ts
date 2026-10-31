// True Cost of Access model
//   C_total = C_medical + C_transportation + C_assistance + C_parking + C_other
//
// Principle: accessibility needs never add a "penalty". Assistance and other
// costs are only what the user voluntarily enters. Transportation reflects the
// distance to the provider and the user's chosen mode.
import { AREA_BY_ID } from '../data/providers';
import { estimateMedical, round2 } from './insurance';
import type { CostAssumptions, CostBreakdown, InsurancePlan, Profile, Provider, TransportMode } from './types';

export function distanceMiles(profile: Pick<Profile, 'homeAreaId'>, provider: Provider, a: CostAssumptions): number {
  const home = AREA_BY_ID[profile.homeAreaId] ?? AREA_BY_ID.riverside;
  const straight = Math.hypot(provider.x - home.x, provider.y - home.y);
  return Math.round(straight * a.roadFactor * 10) / 10;
}

export function transportCost(
  mode: TransportMode,
  miles: number,
  provider: Provider,
  a: CostAssumptions,
): { transportation: number; parking: number; notes: string[] } {
  const notes: string[] = [];
  switch (mode) {
    case 'own_vehicle':
    case 'driven_by_someone':
      notes.push(`Round trip ${round2(miles * 2)} mi × $${a.vehiclePerMile.toFixed(2)}/mi vehicle cost.`);
      if (provider.parkingCost > 0) notes.push(`Listed parking: $${provider.parkingCost} per visit (synthetic).`);
      return { transportation: round2(miles * 2 * a.vehiclePerMile), parking: provider.parkingCost, notes };
    case 'accessible_rideshare':
      notes.push(`2 one-way trips × ($${a.rideshareBase} base + ${miles} mi × $${a.ridesharePerMile}/mi) — demo fare assumption.`);
      return { transportation: round2(2 * (a.rideshareBase + a.ridesharePerMile * miles)), parking: 0, notes };
    case 'paratransit':
      notes.push(`2 one-way trips × $${a.paratransitFare} paratransit fare — demo assumption; service areas and booking rules vary.`);
      return { transportation: round2(2 * a.paratransitFare), parking: 0, notes };
    case 'public_transit':
      notes.push(`2 one-way trips × $${a.transitFare} transit fare.`);
      if (!provider.nearAccessibleTransit) notes.push('No accessible transit stop is listed near this provider — you may need another option for part of the trip.');
      return { transportation: round2(2 * a.transitFare), parking: 0, notes };
  }
}

export interface CostOverrides {
  medical?: number;
  transportation?: number;
  parking?: number;
  assistance?: number;
  other?: number;
}

export function computeTrueCost(
  provider: Provider,
  profile: Profile,
  plan: InsurancePlan,
  a: CostAssumptions,
  overrides: CostOverrides = {},
): CostBreakdown {
  const miles = distanceMiles(profile, provider, a);
  const med = estimateMedical(provider, profile, plan);
  const t = transportCost(profile.transport, miles, provider, a);

  const medical = overrides.medical ?? med.amount;
  const transportation = overrides.transportation ?? t.transportation;
  const parking = overrides.parking ?? t.parking;
  const assistance = overrides.assistance ?? profile.extras.assistance ?? 0;
  const other = overrides.other ?? profile.extras.other ?? 0;
  const nonMedical = transportation + parking + assistance + other;

  const medicalLow = overrides.medical !== undefined ? medical : med.low;
  const medicalHigh = overrides.medical !== undefined ? medical : med.high;

  return {
    medical: round2(medical),
    transportation: round2(transportation),
    parking: round2(parking),
    assistance: round2(assistance),
    other: round2(other),
    total: round2(medical + nonMedical),
    medicalLow: round2(medicalLow),
    medicalHigh: round2(medicalHigh),
    totalLow: round2(medicalLow + nonMedical),
    totalHigh: round2(medicalHigh + nonMedical),
    distanceMiles: miles,
    notes: [...med.notes, ...t.notes],
    medicalBasis: med.basis,
  };
}

export const COST_KEYS = ['medical', 'transportation', 'parking', 'assistance', 'other'] as const;
export type CostKey = (typeof COST_KEYS)[number];

export const COST_LABELS: Record<CostKey, string> = {
  medical: 'Medical (your share)',
  transportation: 'Transportation',
  parking: 'Parking',
  assistance: 'Paid assistance',
  other: 'Other',
};
