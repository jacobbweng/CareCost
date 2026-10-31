// Optional AI layer — DeepSeek (OpenAI-compatible Chat Completions API).
//
// The DeepSeek API key never reaches the browser. It lives in `.env.local`
// (DEEPSEEK_API_KEY), which Git ignores. The Vite dev/preview server proxies
// `/api/ai` to https://api.deepseek.com/chat/completions and adds the key there
// (see vite.config.ts).
// The browser only learns a true/false flag: __AI_ENABLED__.
//
// AI is never used for arithmetic, matching or accessibility decisions — those
// stay deterministic. It only explains text and suggests accommodations the
// user must confirm. Nothing is sent unless the user presses an AI button.
import { ACCOMMODATIONS } from '../data/accommodations';
import type { AccId, NeedLevel } from './types';

export const aiAvailable = () => (typeof __AI_ENABLED__ !== 'undefined' ? __AI_ENABLED__ : false);

export async function askAI(system: string, user: string, opts: { maxTokens?: number; signal?: AbortSignal } = {}): Promise<string> {
  if (!aiAvailable()) throw new Error('AI isn’t set up. Add your DeepSeek key to .env.local and restart the app.');
  const res = await fetch('/api/ai', {
    method: 'POST',
    signal: opts.signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: __AI_MODEL__,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: opts.maxTokens ?? 700,
      temperature: 0.2,
      stream: false,
    }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      const e = (await res.json()) as { error?: { message?: string }; message?: string };
      detail = e.error?.message ?? e.message ?? '';
    } catch {
      /* not JSON */
    }
    const hint =
      res.status === 401 || res.status === 403
        ? 'The DeepSeek key was rejected.'
        : res.status === 402
          ? 'The DeepSeek account is out of credit.'
          : res.status === 404 || res.status === 400 || res.status === 422
            ? 'That model isn’t available — check DEEPSEEK_MODEL in .env.local.'
            : res.status === 429
              ? 'Too many requests — wait a moment and try again.'
              : 'The AI service had a problem.';
    throw new Error(`${hint}${detail ? ` (${detail})` : ''} Everything else in CareCost still works.`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return (data.choices?.[0]?.message?.content ?? '').trim();
}

// ── Insurance text explainer ──────────────────────────────

const POLICY_SYSTEM = `You help people with disabilities understand health insurance documents.
Explain the pasted benefits text in plain language at about a 6th-grade reading level.
Rules: Do not decide or predict whether anything is covered. Do not give medical advice.
Point out anything relevant to accessibility (equipment, interpreters, transportation, referrals, prior authorization).
End with 3 short questions the person should ask their insurer. Keep it under 200 words. Use short paragraphs and simple bullet points.`;

export const explainPolicyWithAI = (text: string, signal?: AbortSignal) =>
  askAI(POLICY_SYSTEM, `Benefits text:\n"""\n${text.slice(0, 8000)}\n"""`, { signal });

// ── Needs → accommodations (suggestions only) ─────────────

const NEEDS_SYSTEM = `You map a person's own description of their access needs to a fixed list of healthcare accommodations.
Return ONLY JSON: {"needs":[{"id":"<id from the list>","level":"essential"|"preferred","reason":"<5-10 words quoting or paraphrasing the person>"}]}
Use "essential" only when the person says they cannot manage without it (can't, need, must, unable). Never guess a diagnosis. Use only ids from this list:
${ACCOMMODATIONS.map((a) => `${a.id}: ${a.label}`).join('\n')}`;

export interface AINeed {
  id: AccId;
  level: NeedLevel;
  reason: string;
}

export function parseAINeeds(raw: string): AINeed[] {
  const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
  const valid = new Set(ACCOMMODATIONS.map((a) => a.id));
  try {
    const parsed = JSON.parse(json) as { needs?: { id?: string; level?: string; reason?: string }[] };
    const out: AINeed[] = [];
    for (const n of parsed.needs ?? []) {
      if (!n.id || !valid.has(n.id as AccId) || out.some((o) => o.id === n.id)) continue;
      out.push({ id: n.id as AccId, level: n.level === 'essential' ? 'essential' : 'preferred', reason: (n.reason ?? '').slice(0, 120) });
    }
    return out;
  } catch {
    return [];
  }
}

export async function suggestNeedsWithAI(text: string, signal?: AbortSignal): Promise<AINeed[]> {
  return parseAINeeds(await askAI(NEEDS_SYSTEM, text.slice(0, 2000), { maxTokens: 500, signal }));
}
