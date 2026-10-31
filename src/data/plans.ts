// SYNTHETIC SAMPLE INSURANCE PLANS — fictional, for demonstration only.
import type { CostAssumptions, InsurancePlan, Profile } from '../lib/types';

export const PLANS: InsurancePlan[] = [
  {
    id: 'sample-ppo',
    name: 'Sample Silver PPO',
    kind: 'PPO',
    description: 'Deductible + coinsurance plan. Specialist visits apply to the deductible.',
    method: 'deductible_coinsurance',
    copay: null,
    deductibleRemaining: 150,
    coinsurancePct: 20,
    oopRemaining: 2800,
    referralRequired: false,
    priorAuthNote: 'Office visits: no prior authorization in the sample plan. Imaging such as MRI: prior authorization required.',
    outOfNetworkCovered: true,
  },
  {
    id: 'sample-hmo',
    name: 'Sample Gold HMO',
    kind: 'HMO',
    description: 'Fixed specialist copay. Specialist visits need a referral from your primary care provider.',
    method: 'copay',
    copay: 45,
    deductibleRemaining: 0,
    coinsurancePct: 0,
    oopRemaining: 1900,
    referralRequired: true,
    priorAuthNote: 'Specialist visits require a PCP referral in the sample plan. Out-of-network care is not covered except emergencies.',
    outOfNetworkCovered: false,
  },
  {
    id: 'sample-lowcost',
    name: 'Sample Low-Cost Plan',
    kind: 'Low-cost',
    description: 'Very low fixed copays, narrower network.',
    method: 'copay',
    copay: 4,
    deductibleRemaining: 0,
    coinsurancePct: 0,
    oopRemaining: 150,
    referralRequired: true,
    priorAuthNote: 'Specialist visits may require a referral; check with the plan.',
    outOfNetworkCovered: false,
  },
  {
    id: 'self-pay',
    name: 'No insurance / self-pay',
    kind: 'Self-pay',
    description: "Estimates use each provider's listed self-pay price. Ask about financial assistance and payment plans.",
    method: 'self_pay',
    copay: null,
    deductibleRemaining: null,
    coinsurancePct: null,
    oopRemaining: null,
    referralRequired: false,
    priorAuthNote: 'Not applicable.',
    outOfNetworkCovered: false,
  },
  {
    id: 'unknown',
    name: "I'm not sure / prefer not to say",
    kind: 'Unknown',
    description: 'CareCost will show a cost range instead of a single estimate.',
    method: 'unknown',
    copay: null,
    deductibleRemaining: null,
    coinsurancePct: null,
    oopRemaining: null,
    referralRequired: false,
    priorAuthNote: 'Unknown — ask your insurer.',
    outOfNetworkCovered: false,
  },
  {
    id: 'custom',
    name: 'My own plan (enter details)',
    kind: 'Custom',
    description: 'Enter your own copay or deductible and coinsurance. Network status for real plans cannot be checked in the demo.',
    method: 'deductible_coinsurance',
    copay: null,
    deductibleRemaining: null,
    coinsurancePct: null,
    oopRemaining: null,
    referralRequired: false,
    priorAuthNote: 'Ask your insurer whether a referral or prior authorization is required.',
    outOfNetworkCovered: false,
  },
];

export const PLAN_BY_ID = Object.fromEntries(PLANS.map((p) => [p.id, p])) as Record<string, InsurancePlan>;

/** Transparent, editable cost assumptions. Demo values — not quotes. */
export const DEFAULT_ASSUMPTIONS: CostAssumptions = {
  vehiclePerMile: 0.7,
  rideshareBase: 7,
  ridesharePerMile: 2.5,
  paratransitFare: 4,
  transitFare: 2.5,
  roadFactor: 1.2,
};

export const TRANSPORT_LABELS: Record<Profile['transport'], { label: string; hint: string }> = {
  accessible_rideshare: {
    label: 'Wheelchair-accessible taxi or rideshare',
    hint: 'Base fare + per-mile, each way',
  },
  own_vehicle: { label: 'I drive (including adapted vehicle)', hint: 'Per-mile vehicle cost + parking' },
  driven_by_someone: { label: 'Someone drives me', hint: 'Per-mile vehicle cost + parking' },
  paratransit: { label: 'Paratransit', hint: 'Flat fare per trip; usually booked in advance' },
  public_transit: { label: 'Accessible public transit', hint: 'Flat fare per trip' },
};

/** Default demo patient: a wheelchair user looking for an affordable neurologist. */
export const DEMO_PROFILE: Profile = {
  name: 'Jordan',
  zip: '30301',
  homeAreaId: 'riverside',
  specialty: 'neurology',
  planId: 'sample-ppo',
  insurance: {
    method: 'deductible_coinsurance',
    copay: null,
    deductibleRemaining: 150,
    coinsurancePct: 20,
    oopRemaining: 2800,
  },
  needs: {
    step_free_entrance: 'essential',
    accessible_exam_room: 'essential',
    adjustable_exam_table: 'preferred',
    accessible_parking: 'preferred',
    accessible_restroom: 'preferred',
  },
  budget: 300,
  maxDistance: 20,
  transport: 'accessible_rideshare',
  extras: { assistance: 0, other: 0 },
  communication: [
    'I use a manual wheelchair and transfer independently with a level surface.',
    'Please speak to me directly, not to my companion.',
  ],
  questions: [
    'What are the next steps after today, and what will each one cost?',
    'Can follow-up visits be done by telehealth?',
  ],
  notes: '',
};

/** An empty profile used when the user starts from scratch. */
export const BLANK_PROFILE: Profile = {
  name: '',
  zip: '',
  homeAreaId: 'riverside',
  specialty: 'neurology',
  planId: 'unknown',
  insurance: { method: 'deductible_coinsurance', copay: null, deductibleRemaining: null, coinsurancePct: null, oopRemaining: null },
  needs: {},
  budget: null,
  maxDistance: 20,
  transport: 'accessible_rideshare',
  extras: { assistance: 0, other: 0 },
  communication: [],
  questions: [],
  notes: '',
};
