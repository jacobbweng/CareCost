// ─────────────────────────────────────────────────────────────
// CareCost domain model
// All provider / plan data in this app is synthetic demo data.
// ─────────────────────────────────────────────────────────────

export type AccCategory = 'mobility' | 'hearing' | 'vision' | 'sensory';

export type AccId =
  | 'step_free_entrance'
  | 'accessible_exam_room'
  | 'adjustable_exam_table'
  | 'accessible_restroom'
  | 'elevator'
  | 'accessible_parking'
  | 'equipment_space'
  | 'transfer_assistance'
  | 'asl_interpreter'
  | 'captioning'
  | 'written_communication'
  | 'text_scheduling'
  | 'screen_reader_docs'
  | 'accessible_forms'
  | 'large_print'
  | 'wayfinding'
  | 'quiet_waiting'
  | 'low_sensory_room'
  | 'plain_language'
  | 'extended_appointments';

export interface Accommodation {
  id: AccId;
  category: AccCategory;
  label: string;
  short: string;
  description: string;
  /** Question the patient can ask the clinic to verify this */
  verifyQuestion: string;
  keywords: string[];
}

/** How strongly the patient needs an accommodation */
export type NeedLevel = 'essential' | 'preferred';

/** What we know about a provider's accommodation */
export type AccStatus = 'yes' | 'no' | 'unknown';

/**
 * Where the information came from.
 * - verified:      confirmed by an on-site accessibility review (synthetic in demo)
 * - self_reported: stated by the provider, not independently checked
 * - none:          no information on file
 */
export type InfoSource = 'verified' | 'self_reported' | 'none';

export interface AccRecord {
  status: AccStatus;
  source: InfoSource;
  /** ISO date of last verification / report */
  date?: string;
  note?: string;
}

export type SpecialtyId = 'neurology' | 'orthopedics' | 'primary_care' | 'pmr';

export interface Specialty {
  id: SpecialtyId;
  label: string;
  service: string; // service priced for comparisons
}

export type NetworkStatus = 'in' | 'out' | 'unknown';

export interface Area {
  id: string;
  name: string;
  x: number; // miles on the demo grid
  y: number;
}

export interface Provider {
  id: string;
  name: string;
  clinician: string;
  specialty: SpecialtyId;
  areaId: string;
  address: string;
  x: number;
  y: number;
  /** Estimated in-network allowed amount for the specialty's priced service */
  allowedAmount: number;
  /** Listed self-pay (cash) price for the same service */
  selfPayPrice: number;
  /** Network status per sample plan id. Missing => unknown */
  networks: Partial<Record<string, NetworkStatus>>;
  /** Accessibility records. Missing => unknown / no information */
  access: Partial<Record<AccId, AccRecord>>;
  parkingCost: number; // per visit, for drivers
  nearAccessibleTransit: boolean;
  telehealthFollowUps: boolean;
  newPatientWaitDays: number;
  phone: string;
  overallVerifiedDate?: string;
  blurb: string;
}

// ── Insurance ────────────────────────────────────────────────

export type EstimateMethod = 'copay' | 'deductible_coinsurance';

export interface InsurancePlan {
  id: string;
  name: string;
  kind: 'PPO' | 'HMO' | 'EPO' | 'Low-cost' | 'Self-pay' | 'Unknown' | 'Custom';
  description: string;
  method: EstimateMethod | 'self_pay' | 'unknown';
  copay: number | null;
  deductibleRemaining: number | null;
  coinsurancePct: number | null;
  oopRemaining: number | null;
  referralRequired: boolean;
  priorAuthNote: string;
  outOfNetworkCovered: boolean;
}

/** User-editable insurance parameters (may be partially unknown) */
export interface InsuranceInputs {
  method: EstimateMethod;
  allowedAmount: number | null;
  copay: number | null;
  deductibleRemaining: number | null;
  coinsurancePct: number | null;
  oopRemaining: number | null;
}

export interface InsuranceEstimate {
  method: EstimateMethod;
  estimate: number;
  low: number;
  high: number;
  steps: { label: string; value: number; formula?: string }[];
  assumptions: string[];
  warnings: string[];
  cappedByOop: boolean;
}

// ── Transportation & costs ───────────────────────────────────

export type TransportMode =
  | 'own_vehicle'
  | 'driven_by_someone'
  | 'accessible_rideshare'
  | 'paratransit'
  | 'public_transit';

export interface CostAssumptions {
  vehiclePerMile: number;
  rideshareBase: number;
  ridesharePerMile: number;
  paratransitFare: number; // per one-way trip
  transitFare: number; // per one-way trip
  roadFactor: number; // straight-line → road distance
}

export interface UserExtras {
  /** Paid personal assistance / caregiver cost per visit — voluntarily entered */
  assistance: number;
  /** Other per-visit expenses — voluntarily entered */
  other: number;
}

export interface CostBreakdown {
  medical: number;
  transportation: number;
  assistance: number;
  parking: number;
  other: number;
  total: number;
  medicalLow: number;
  medicalHigh: number;
  totalLow: number;
  totalHigh: number;
  distanceMiles: number;
  notes: string[];
  medicalBasis: string;
}

// ── Profile ─────────────────────────────────────────────────

export interface Profile {
  name: string;
  zip: string;
  homeAreaId: string;
  specialty: SpecialtyId;
  planId: string;
  insurance: Omit<InsuranceInputs, 'allowedAmount'>;
  needs: Partial<Record<AccId, NeedLevel>>;
  budget: number | null; // max per visit, total cost of access
  maxDistance: number; // miles
  transport: TransportMode;
  extras: UserExtras;
  communication: string[];
  questions: string[];
  notes: string;
}

// ── Matching ────────────────────────────────────────────────

export type MatchStatus = 'meets' | 'needs_verification' | 'does_not_meet';

export interface RequirementCheck {
  id: AccId;
  level: NeedLevel;
  status: AccStatus;
  source: InfoSource;
  date?: string;
  note?: string;
}

export interface ScoreParts {
  affordability: number;
  distance: number;
  insurance: number;
  preferences: number;
  confidence: number;
}

export interface MatchResult {
  provider: Provider;
  status: MatchStatus;
  essentials: RequirementCheck[];
  preferred: RequirementCheck[];
  failed: RequirementCheck[];
  unverified: RequirementCheck[];
  network: NetworkStatus;
  cost: CostBreakdown;
  score: number; // 0–100, only meaningful within a status group
  scoreParts: ScoreParts;
  overBudget: boolean;
  beyondDistance: boolean;
  reasons: string[];
  cautions: string[];
  rank: number | null; // rank among "meets"
}

export interface MatchSummary {
  results: MatchResult[];
  meets: MatchResult[];
  needsVerification: MatchResult[];
  doesNotMeet: MatchResult[];
  recommended: MatchResult | null;
  essentialIds: AccId[];
  preferredIds: AccId[];
  barrierInsight: BarrierInsight | null;
}

export interface BarrierInsight {
  nearest: MatchResult; // nearest provider in specialty regardless of access
  recommended: MatchResult;
  extraMiles: number;
  extraTransportCost: number;
  nearestFailedLabels: string[];
}

// ── Checklist ───────────────────────────────────────────────

export type Phase = 'before' | 'during' | 'after';

export interface ChecklistTask {
  id: string;
  phase: Phase;
  title: string;
  detail: string;
  why?: string;
  priority: 'high' | 'normal';
  tag: 'access' | 'insurance' | 'transport' | 'communication' | 'billing' | 'care';
  script?: string; // suggested words to use when calling
}
