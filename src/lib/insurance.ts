// Transparent, simplified patient-responsibility estimator.
// These are ESTIMATES — not claims decisions or insurer determinations.
import type {
  InsuranceEstimate,
  InsuranceInputs,
  InsurancePlan,
  NetworkStatus,
  Profile,
  Provider,
} from './types';

export const round2 = (n: number) => Math.round(n * 100) / 100;

const DEFAULT_COINSURANCE = 20;

/**
 * Estimate in-network patient responsibility for one service.
 *
 * Copay model:          responsibility = min(copay, allowed)
 * Deductible model:     deductiblePortion = min(allowed, remainingDeductible)
 *                       postDeductible    = allowed − deductiblePortion
 *                       beforeCap         = deductiblePortion + postDeductible × coinsurance
 * Both models are then capped at the remaining out-of-pocket maximum.
 *
 * Missing inputs never silently become zero: they widen the low/high range and
 * add a plain-language warning.
 */
export function estimateInsurance(inputs: InsuranceInputs): InsuranceEstimate {
  const assumptions: string[] = [
    'Assumes the provider is in network and the service is covered.',
    'Uses the allowed amount you entered (the price your plan has agreed to), not the provider’s full billed charge.',
  ];
  const warnings: string[] = [];
  const steps: InsuranceEstimate['steps'] = [];
  const allowed = inputs.allowedAmount;

  if (allowed === null || !Number.isFinite(allowed) || allowed < 0) {
    return {
      method: inputs.method,
      estimate: 0,
      low: 0,
      high: 0,
      steps: [],
      assumptions,
      warnings: ['Enter the expected in-network allowed amount to calculate an estimate.'],
      cappedByOop: false,
    };
  }

  const oop = inputs.oopRemaining;
  const applyCap = (v: number) => (oop !== null && oop >= 0 ? Math.min(v, oop) : v);

  if (inputs.method === 'copay') {
    steps.push({ label: 'Allowed amount', value: round2(allowed) });
    if (inputs.copay === null || inputs.copay < 0) {
      warnings.push('Copay is unknown, so the estimate shows up to the full allowed amount. Check your plan card or benefits summary.');
      const high = applyCap(allowed);
      steps.push({ label: 'Estimated responsibility (copay unknown)', value: round2(high), formula: 'up to allowed amount' });
      return finish(inputs.method, high, 0, high, steps, assumptions, warnings, high < allowed);
    }
    const base = Math.min(inputs.copay, allowed);
    steps.push({ label: 'Copay', value: round2(inputs.copay) });
    steps.push({ label: 'Responsibility before out-of-pocket limit', value: round2(base), formula: 'MIN(copay, allowed)' });
    assumptions.push('Assumes the visit is billed as a single copay visit and no deductible applies to it. Some plans apply a deductible to specialist visits.');
    if (oop === null) warnings.push('Remaining out-of-pocket maximum is unknown, so no cap was applied.');
    const final = applyCap(base);
    if (final < base) steps.push({ label: 'Capped at remaining out-of-pocket maximum', value: round2(final), formula: 'MIN(above, OOP remaining)' });
    return finish(inputs.method, final, final, final, steps, assumptions, warnings, final < base);
  }

  // Deductible + coinsurance model
  let coinsPct = inputs.coinsurancePct;
  if (coinsPct === null || coinsPct < 0 || coinsPct > 100) {
    coinsPct = DEFAULT_COINSURANCE;
    warnings.push(`Coinsurance is unknown, so ${DEFAULT_COINSURANCE}% was used as a placeholder. Replace it with your plan’s rate.`);
  }
  const rate = coinsPct / 100;

  const calc = (deductibleRemaining: number) => {
    const deductiblePortion = Math.min(allowed, Math.max(0, deductibleRemaining));
    const post = allowed - deductiblePortion;
    const coins = post * rate;
    const before = deductiblePortion + coins;
    return { deductiblePortion, post, coins, before, final: applyCap(before) };
  };

  let ded = inputs.deductibleRemaining;
  let low: number;
  let high: number;
  if (ded === null || ded < 0) {
    warnings.push('Remaining deductible is unknown. The estimate assumes none of it has been met (worst case); the low end of the range assumes it has been fully met.');
    low = calc(0).final;
    high = calc(allowed).final;
    ded = allowed;
  } else {
    low = high = calc(ded).final;
  }
  const r = calc(ded);

  steps.push({ label: 'Allowed amount', value: round2(allowed) });
  steps.push({ label: 'Deductible portion', value: round2(r.deductiblePortion), formula: 'MIN(allowed, remaining deductible)' });
  steps.push({ label: 'Post-deductible amount', value: round2(r.post), formula: 'allowed − deductible portion' });
  steps.push({ label: `Coinsurance portion (${coinsPct}%)`, value: round2(r.coins), formula: `post-deductible × ${coinsPct}%` });
  steps.push({ label: 'Responsibility before out-of-pocket limit', value: round2(r.before), formula: 'deductible portion + coinsurance portion' });
  if (oop === null) {
    warnings.push('Remaining out-of-pocket maximum is unknown, so no cap was applied.');
  } else if (r.final < r.before) {
    steps.push({ label: 'Capped at remaining out-of-pocket maximum', value: round2(r.final), formula: 'MIN(above, OOP remaining)' });
  }
  return finish(inputs.method, r.final, Math.min(low, high), Math.max(low, high), steps, assumptions, warnings, r.final < r.before);
}

function finish(
  method: InsuranceInputs['method'],
  estimate: number,
  low: number,
  high: number,
  steps: InsuranceEstimate['steps'],
  assumptions: string[],
  warnings: string[],
  cappedByOop: boolean,
): InsuranceEstimate {
  return {
    method,
    estimate: round2(estimate),
    low: round2(low),
    high: round2(high),
    steps,
    assumptions,
    warnings,
    cappedByOop,
  };
}

export interface MedicalEstimate {
  amount: number;
  low: number;
  high: number;
  basis: string;
  notes: string[];
  network: NetworkStatus;
  inNetwork?: InsuranceEstimate;
}

export function networkStatus(provider: Provider, planId: string): NetworkStatus {
  if (planId === 'self-pay') return 'out';
  if (planId === 'unknown' || planId === 'custom') return 'unknown';
  return provider.networks[planId] ?? 'unknown';
}

/** Medical cost estimate for a provider under the user's plan. */
export function estimateMedical(provider: Provider, profile: Profile, plan: InsurancePlan): MedicalEstimate {
  const notes: string[] = [];

  if (plan.method === 'self_pay') {
    return {
      amount: provider.selfPayPrice,
      low: provider.selfPayPrice,
      high: provider.selfPayPrice,
      basis: 'Listed self-pay price (synthetic)',
      notes: ['Ask whether the clinic offers a prompt-pay discount, sliding-scale fees or a payment plan.'],
      network: 'out',
    };
  }

  if (plan.method === 'unknown') {
    return {
      amount: provider.selfPayPrice,
      low: 0,
      high: provider.selfPayPrice,
      basis: 'Insurance not provided — range runs from fully covered to the listed self-pay price; the estimate uses the upper end.',
      notes: ['Add insurance details in your profile for a narrower estimate.'],
      network: 'unknown',
    };
  }

  const network = networkStatus(provider, plan.id);
  const inNet = estimateInsurance({ ...profile.insurance, allowedAmount: provider.allowedAmount });

  if (network === 'in') {
    return {
      amount: inNet.estimate,
      low: inNet.low,
      high: inNet.high,
      basis: inNet.method === 'copay' ? 'In-network copay estimate' : 'In-network deductible + coinsurance estimate',
      notes: inNet.warnings,
      network,
      inNetwork: inNet,
    };
  }

  if (network === 'out') {
    if (plan.outOfNetworkCovered) {
      notes.push('Out of network: your plan may reimburse part of this, and the clinic may bill you the difference (balance billing). The estimate uses the listed self-pay price as a conservative upper bound.');
      return { amount: provider.selfPayPrice, low: inNet.estimate, high: provider.selfPayPrice, basis: 'Out-of-network — conservative estimate', notes, network, inNetwork: inNet };
    }
    notes.push('Out of network: this sample plan does not cover out-of-network visits, so the full self-pay price is used.');
    return { amount: provider.selfPayPrice, low: provider.selfPayPrice, high: provider.selfPayPrice, basis: 'Out-of-network — not covered by plan', notes, network, inNetwork: inNet };
  }

  notes.push(
    plan.id === 'custom'
      ? 'CareCost cannot check real network status. The estimate assumes in-network; the high end assumes out-of-network self-pay.'
      : 'Network status is unknown. The estimate assumes in-network; the high end assumes out-of-network self-pay.',
  );
  return {
    amount: inNet.estimate,
    low: inNet.low,
    high: Math.max(inNet.high, provider.selfPayPrice),
    basis: 'Network unknown — in-network estimate shown',
    notes: [...notes, ...inNet.warnings],
    network,
    inNetwork: inNet,
  };
}
