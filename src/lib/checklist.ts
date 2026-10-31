// Personalized appointment navigation plan, generated from the user's
// accessibility needs, the chosen provider's known/unknown accommodations,
// insurance situation and transportation choice. Deterministic.
import { ACC_BY_ID } from '../data/accommodations';
import { PLAN_BY_ID, TRANSPORT_LABELS } from '../data/plans';
import { SPECIALTY_BY_ID } from '../data/providers';
import { fmtDate, listJoin, usd } from './format';
import type { AccId, ChecklistTask, MatchResult, Profile } from './types';

export function generateChecklist(profile: Profile, match: MatchResult): ChecklistTask[] {
  const p = match.provider;
  const plan = PLAN_BY_ID[profile.planId] ?? PLAN_BY_ID.unknown;
  const spec = SPECIALTY_BY_ID[p.specialty];
  const tasks: ChecklistTask[] = [];
  const needIds = Object.keys(profile.needs) as AccId[];

  // ── BEFORE ──────────────────────────────────────────────
  const checks = [...match.essentials, ...match.preferred];
  const unknownEss = match.essentials.filter((c) => c.status === 'unknown');
  const selfReportedEss = match.essentials.filter((c) => c.status === 'yes' && c.source !== 'verified');
  const verifiedEss = match.essentials.filter((c) => c.status === 'yes' && c.source === 'verified');

  for (const c of unknownEss) {
    const a = ACC_BY_ID[c.id];
    tasks.push({
      id: `verify-${c.id}`,
      phase: 'before',
      priority: 'high',
      tag: 'access',
      title: `Confirm: ${a.short}`,
      detail: `${p.name} has not reported whether this is available. It is one of your essential requirements, so confirm it before booking.`,
      why: 'Essential requirement with no information on file.',
      script: a.verifyQuestion,
    });
  }
  for (const c of selfReportedEss) {
    const a = ACC_BY_ID[c.id];
    tasks.push({
      id: `reconfirm-${c.id}`,
      phase: 'before',
      priority: 'high',
      tag: 'access',
      title: `Double-check: ${a.short}`,
      detail: `The clinic reported this themselves${c.date ? ` (${fmtDate(c.date)})` : ''}; it hasn't been independently verified.`,
      script: a.verifyQuestion,
    });
  }
  if (verifiedEss.length) {
    tasks.push({
      id: 'request-room',
      phase: 'before',
      priority: 'high',
      tag: 'access',
      title: 'Ask them to note your access needs on the booking',
      detail: `When you book, ask the scheduler to record: ${listJoin(verifiedEss.map((c) => ACC_BY_ID[c.id].short.toLowerCase()))}. Verified rooms or equipment are often limited and must be reserved.`,
      script: `I need ${listJoin(verifiedEss.map((c) => ACC_BY_ID[c.id].short.toLowerCase()))}. Can you add that to my appointment so the right room is ready?`,
    });
  }
  const unknownPref = match.preferred.filter((c) => c.status === 'unknown');
  if (unknownPref.length) {
    tasks.push({
      id: 'ask-preferred',
      phase: 'before',
      priority: 'normal',
      tag: 'access',
      title: 'Ask about your preferred accommodations',
      detail: `Not on file: ${listJoin(unknownPref.map((c) => ACC_BY_ID[c.id].short))}.`,
      script: unknownPref.map((c) => ACC_BY_ID[c.id].verifyQuestion).join(' '),
    });
  }

  // Communication accommodations need lead time
  if (needIds.includes('asl_interpreter')) {
    tasks.push({
      id: 'book-interpreter',
      phase: 'before',
      priority: 'high',
      tag: 'communication',
      title: 'Request a sign-language interpreter',
      detail: 'Ask the clinic to arrange a qualified interpreter and confirm the booking in writing. Ask how much notice they need.',
      why: 'Interpreters are typically booked days in advance.',
      script: ACC_BY_ID.asl_interpreter.verifyQuestion,
    });
  }
  if (needIds.includes('captioning')) {
    tasks.push({ id: 'book-captions', phase: 'before', priority: 'normal', tag: 'communication', title: 'Request captioning', detail: 'Ask for real-time captioning in person, or a captioned telehealth link.' });
  }
  if (needIds.includes('accessible_forms') || needIds.includes('screen_reader_docs') || needIds.includes('large_print')) {
    tasks.push({ id: 'forms-format', phase: 'before', priority: 'normal', tag: 'communication', title: 'Get intake forms in your format', detail: 'Ask for forms ahead of time in an accessible digital format or large print so you can complete them independently.' });
  }
  if (needIds.includes('extended_appointments')) {
    tasks.push({ id: 'book-long', phase: 'before', priority: 'normal', tag: 'access', title: 'Book a longer appointment slot', detail: 'Ask for a double-length or first-of-the-day slot so the visit isn’t rushed.' });
  }
  if (needIds.includes('quiet_waiting') || needIds.includes('low_sensory_room')) {
    tasks.push({ id: 'sensory-plan', phase: 'before', priority: 'normal', tag: 'access', title: 'Plan for a calmer visit', detail: 'Ask whether you can wait outside or in a quiet room and be texted when the exam room is ready.' });
  }

  // Insurance
  if (plan.method === 'unknown') {
    tasks.push({ id: 'ins-find', phase: 'before', priority: 'high', tag: 'insurance', title: 'Check your coverage', detail: 'Call the member-services number on your insurance card and ask the questions below, or use the Insurance Navigator.', script: `Is ${p.name} in network for my plan? What will I owe for a ${spec.service.toLowerCase()}?` });
  } else if (plan.method !== 'self_pay') {
    tasks.push({
      id: 'ins-network',
      phase: 'before',
      priority: match.network === 'in' ? 'normal' : 'high',
      tag: 'insurance',
      title: match.network === 'in' ? 'Confirm in-network status with your insurer' : 'Find out whether this provider is in network',
      detail:
        match.network === 'in'
          ? `CareCost's sample data lists ${p.name} as in network with ${plan.name}. Networks change — confirm with both the clinic and your insurer.`
          : `Network status is ${match.network === 'out' ? 'listed as out of network' : 'unknown'}. Ask both the clinic and your insurer before booking.`,
      script: `Is ${p.clinician.replace(' (fictional)', '')} at ${p.name} in network for my plan, for a ${spec.service.toLowerCase()}?`,
    });
    if (plan.referralRequired) {
      tasks.push({ id: 'ins-referral', phase: 'before', priority: 'high', tag: 'insurance', title: 'Get a referral from your primary care provider', detail: `${plan.name} requires a referral for specialist visits. Without it, the visit may not be covered.` });
    }
    tasks.push({ id: 'ins-prior-auth', phase: 'before', priority: 'normal', tag: 'insurance', title: 'Ask about prior authorization', detail: `${plan.priorAuthNote} Ask whether any tests the specialist may order (imaging, nerve studies) need approval first.`, script: 'Does this visit, or any tests that might be ordered, need prior authorization?' });
  } else {
    tasks.push({ id: 'selfpay-price', phase: 'before', priority: 'high', tag: 'billing', title: 'Ask for a written price estimate', detail: 'As a self-pay patient, ask for a written good-faith estimate before the visit, and whether a prompt-pay discount or sliding-scale fee is available.' });
  }

  // Transportation
  const tLabel = TRANSPORT_LABELS[profile.transport].label;
  const tTask: ChecklistTask = {
    id: 'transport',
    phase: 'before',
    priority: 'high',
    tag: 'transport',
    title: `Arrange transportation (${tLabel.toLowerCase()})`,
    detail: `${match.cost.distanceMiles} mi each way. Estimated ${usd(match.cost.transportation + match.cost.parking)} round trip.`,
  };
  if (profile.transport === 'paratransit') tTask.detail += ' Book your paratransit trip as early as your service allows and plan for pickup windows.';
  if (profile.transport === 'accessible_rideshare') tTask.detail += ' Wheelchair-accessible vehicles can have longer wait times — schedule the ride in advance if possible.';
  if (profile.transport === 'own_vehicle' || profile.transport === 'driven_by_someone') {
    const parking = needIds.includes('accessible_parking') ? ' Ask where the van-accessible spaces or drop-off zone are.' : '';
    tTask.detail += (p.parkingCost ? ` Parking is listed at ${usd(p.parkingCost)}.` : ' Parking is listed as free.') + parking;
  }
  if (profile.transport === 'public_transit' && !p.nearAccessibleTransit) tTask.detail += ' No accessible stop is listed nearby — plan the last part of the trip.';
  tasks.push(tTask);

  if (profile.extras.assistance > 0) {
    tasks.push({ id: 'assistance', phase: 'before', priority: 'normal', tag: 'care', title: 'Confirm your personal assistant’s availability', detail: `You entered ${usd(profile.extras.assistance)} per visit for paid assistance. Confirm timing, including travel and wait time.` });
  }

  // ── DURING ──────────────────────────────────────────────
  tasks.push({
    id: 'access-card',
    phase: 'during',
    priority: 'high',
    tag: 'communication',
    title: 'Show your Access Card at check-in',
    detail: 'Your Access Card summarizes your accommodations and communication preferences so you don’t have to explain them again.',
  });
  if (checks.some((c) => c.id === 'adjustable_exam_table' || c.id === 'transfer_assistance')) {
    tasks.push({ id: 'during-transfer', phase: 'during', priority: 'normal', tag: 'access', title: 'Ask for the adjustable table before the exam starts', detail: 'If an accessible table or lift was promised, ask for it before the clinician arrives. You can decline an exam position that isn’t safe for you.' });
  }
  tasks.push({ id: 'during-questions', phase: 'during', priority: 'normal', tag: 'care', title: 'Ask your prepared questions', detail: profile.questions.length ? `You have ${profile.questions.length} question${profile.questions.length > 1 ? 's' : ''} saved below.` : 'Add questions below so you don’t forget them.' });
  tasks.push({ id: 'during-costs', phase: 'during', priority: 'normal', tag: 'billing', title: 'Ask what any new tests or referrals will cost', detail: 'If the clinician orders tests or another visit, ask whether they need prior authorization and whether the lab or imaging site is in network and accessible.' });
  if (p.telehealthFollowUps) {
    tasks.push({ id: 'during-telehealth', phase: 'during', priority: 'normal', tag: 'transport', title: 'Ask if follow-ups can be telehealth', detail: `${p.name} lists telehealth follow-ups. Each avoided trip saves about ${usd(match.cost.transportation + match.cost.parking)} in transportation.` });
  }

  // ── AFTER ───────────────────────────────────────────────
  tasks.push({ id: 'after-eob', phase: 'after', priority: 'high', tag: 'billing', title: 'Compare the bill with your Explanation of Benefits', detail: `Your estimate was ${usd(match.cost.medical)} for the medical portion. When the insurer's Explanation of Benefits arrives, make sure the bill matches what it says you owe before paying.` });
  tasks.push({ id: 'after-errors', phase: 'after', priority: 'normal', tag: 'billing', title: 'Question anything unexpected', detail: 'Ask for an itemized bill. Billing errors are common; you can ask the clinic and insurer to review charges you don’t understand.' });
  tasks.push({ id: 'after-assist', phase: 'after', priority: 'normal', tag: 'billing', title: 'Ask about financial assistance or payment plans', detail: 'Many clinics and hospitals have financial-assistance policies or interest-free payment plans. Ask the billing office what is available.' });
  tasks.push({ id: 'after-followup', phase: 'after', priority: 'normal', tag: 'care', title: 'Book follow-up with the same accommodations', detail: 'When scheduling the next visit, ask them to reuse the same room, equipment and communication arrangements.' });
  tasks.push({ id: 'after-feedback', phase: 'after', priority: 'normal', tag: 'access', title: 'Note what worked and what didn’t', detail: 'Record whether the promised accommodations were in place. Accurate reports help you — and future patients — next time.' });

  return tasks;
}

export const PHASE_META = {
  before: { label: 'Before the appointment', short: 'Before' },
  during: { label: 'During the appointment', short: 'During' },
  after: { label: 'After the appointment', short: 'After' },
} as const;
