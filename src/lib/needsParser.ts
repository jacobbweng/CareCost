// Converts a plain-language description of access needs into structured,
// searchable accommodations. Runs entirely on-device; nothing is sent anywhere.
// Suggestions are always shown to the user to confirm — never applied silently.
import { ACCOMMODATIONS } from '../data/accommodations';
import type { AccId, NeedLevel } from './types';

export interface NeedSuggestion {
  id: AccId;
  level: NeedLevel;
  matched: string[];
  clause: string;
}

const STRONG = /\b(can'?t|cannot|unable|need|must|require|required|have to|only|impossible|won'?t be able)\b/i;
const NEGATION = /\b(don'?t|do not|no longer|not)\s+(?:\w+\s+){0,2}$/i;

/** Extra phrase → accommodation rules for common wording */
const RULES: { re: RegExp; ids: AccId[] }[] = [
  { re: /\b(power|electric|manual)?\s?wheel\s?chair|scooter\b/i, ids: ['step_free_entrance', 'accessible_exam_room'] },
  { re: /\b(stairs|steps)\b/i, ids: ['step_free_entrance', 'elevator'] },
  { re: /\b(power chair|power wheelchair|scooter)\b/i, ids: ['equipment_space'] },
  { re: /\b(transfer|exam table|get onto|climb onto)\b/i, ids: ['adjustable_exam_table'] },
  { re: /\b(hoyer|lift|help (?:with )?transfer)/i, ids: ['transfer_assistance'] },
  { re: /\b(deaf|asl|sign language)\b/i, ids: ['asl_interpreter'] },
  { re: /\b(hard of hearing|hearing loss|hearing aid)/i, ids: ['captioning', 'written_communication'] },
  { re: /\b(phone calls?|on the phone|speech)\b/i, ids: ['text_scheduling'] },
  { re: /\b(blind|screen ?reader)\b/i, ids: ['screen_reader_docs', 'accessible_forms', 'wayfinding'] },
  { re: /\b(low vision|small print|can'?t read)\b/i, ids: ['large_print', 'wayfinding'] },
  { re: /\b(noise|noisy|loud|crowd(?:ed|s)?|busy waiting)/i, ids: ['quiet_waiting'] },
  { re: /\b(bright|fluorescent|lights?|overstimulat\w*|sensory)/i, ids: ['low_sensory_room'] },
  { re: /\b(autis\w*|anxiety|panic)\b/i, ids: ['quiet_waiting', 'low_sensory_room'] },
  { re: /\b(confus\w*|jargon|plain language|simple words|memory|brain fog|cognitive|step by step)/i, ids: ['plain_language'] },
  { re: /\b(extra time|more time|rushed|take longer|slow(?:er)?)\b/i, ids: ['extended_appointments'] },
  { re: /\b(parking|van|drop[- ]?off)\b/i, ids: ['accessible_parking'] },
  { re: /\b(bathroom|restroom|toilet)\b/i, ids: ['accessible_restroom'] },
];

export function parseNeeds(text: string): NeedSuggestion[] {
  const clauses = text
    .split(/[.;!?\n]+|,\s*(?:and|but)\s+|\s+but\s+/i)
    .map((c) => c.trim())
    .filter(Boolean);
  const out = new Map<AccId, NeedSuggestion>();

  for (const clause of clauses) {
    const hits = new Map<AccId, string[]>();
    for (const r of RULES) {
      const m = clause.match(r.re);
      if (!m || m.index === undefined) continue;
      if (NEGATION.test(clause.slice(0, m.index))) continue;
      for (const id of r.ids) hits.set(id, [...(hits.get(id) ?? []), m[0].trim()]);
    }
    for (const a of ACCOMMODATIONS) {
      for (const k of a.keywords) {
        const idx = clause.toLowerCase().indexOf(k);
        if (idx >= 0 && k.length > 4 && !NEGATION.test(clause.slice(0, idx))) {
          // Only accept direct keyword hits for longer, specific keywords
          if (!hits.has(a.id) && ['exam room', 'grab bar', 'elevator', 'captions', 'caption', 'interpreter', 'large print', 'quiet', 'waiting room', 'plain language', 'extra time', 'more time', 'screen reader'].includes(k))
            hits.set(a.id, [k]);
        }
      }
    }
    const level: NeedLevel = STRONG.test(clause) ? 'essential' : 'preferred';
    for (const [id, matched] of hits) {
      const prev = out.get(id);
      if (!prev) out.set(id, { id, level, matched: Array.from(new Set(matched)), clause });
      else if (prev.level === 'preferred' && level === 'essential') out.set(id, { ...prev, level, clause });
    }
  }
  return Array.from(out.values());
}

export const NEEDS_EXAMPLE =
  "I use a power wheelchair and can't do stairs. I need room to turn around in the exam room. Bright fluorescent lights give me headaches, and I'd like a quieter place to wait.";
