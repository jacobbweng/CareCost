// Real, public reference numbers used to ESTIMATE costs. Each one cites its source.
// Clinics' actual prices and insurers' networks are not public, so CareCost
// starts from these benchmarks and lets the user replace any number.
import type { SpecialtyId } from '../lib/types';

export const BENCHMARK_YEAR = 2026;

/** Medicare national non-facility payment for a new-patient office visit, 2026. */
export const MEDICARE_VISIT: Record<SpecialtyId, { code: string; amount: number }> = {
  neurology: { code: '99204', amount: 177.36 },
  orthopedics: { code: '99204', amount: 177.36 },
  pmr: { code: '99204', amount: 177.36 },
  primary_care: { code: '99203', amount: 117.57 },
};
export const MEDICARE_VISIT_SOURCE = '2026 Medicare Physician Fee Schedule, national non-facility rate';

/** Private insurers paid ~143% of Medicare for physician services on average (KFF review of 8 studies). */
export const PRIVATE_TO_MEDICARE = 1.43;
export const PRIVATE_SOURCE = 'KFF review: private insurers pay about 143% of Medicare for physician services';

/** Original Medicare Part B, 2026 */
export const MEDICARE_PART_B_DEDUCTIBLE = 283;
export const MEDICARE_PART_B_COINSURANCE = 20;
export const MEDICARE_SOURCE = 'Medicare Part B 2026: $283 deductible, then 20% coinsurance (Federal Register, Nov 19 2025)';

/** IRS standard mileage rate for medical travel, July 1 – Dec 31, 2026 (covers fuel and oil). */
export const IRS_MEDICAL_MILEAGE = 0.235;
export const IRS_SOURCE = 'IRS medical mileage rate, Jul–Dec 2026: 23.5¢ per mile';

export function benchmarkVisit(specialty: SpecialtyId) {
  return MEDICARE_VISIT[specialty];
}
