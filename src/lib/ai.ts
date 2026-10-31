// Optional AI enhancement layer.
//
// CareCost's core features are deterministic and run entirely in the browser.
// If a developer configures VITE_ANTHROPIC_API_KEY (local development only),
// the Insurance Navigator offers an opt-in "Ask Claude for a plain-language
// summary" button. Nothing is sent unless the user presses it, and the user
// is told exactly what will be sent first.
//
// Never ship a real API key in a public build — browser code is visible to users.

const KEY = (import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined) ?? '';
const MODEL = (import.meta.env.VITE_ANTHROPIC_MODEL as string | undefined) ?? 'claude-sonnet-5-5';

export const aiAvailable = () => KEY.length > 0;

const SYSTEM = `You help people with disabilities understand health insurance documents.
Explain the pasted benefits text in plain language at about a 6th-grade reading level.
Rules: Do not decide or predict whether anything is covered. Do not give medical advice.
Point out anything relevant to accessibility (equipment, interpreters, transportation, referrals, prior authorization).
End with 3 short questions the person should ask their insurer. Keep it under 220 words. Use short paragraphs and simple bullet points.`;

export async function explainPolicyWithAI(text: string, signal?: AbortSignal): Promise<string> {
  if (!aiAvailable()) throw new Error('AI is not configured.');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 700,
      system: SYSTEM,
      messages: [{ role: 'user', content: `Benefits text:\n"""\n${text.slice(0, 8000)}\n"""` }],
    }),
  });
  if (!res.ok) throw new Error(`The AI service returned an error (${res.status}). The on-device analysis above is unaffected.`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n').trim();
}
