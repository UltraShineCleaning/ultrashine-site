/**
 * OPTIONAL in-dashboard AI (Claude Haiku 4.5 through Tiago's own API key).
 *
 * Off unless ANTHROPIC_API_KEY is set in Vercel. When it's off, every ✦ button
 * is hidden and nothing here is ever called — Tiago writes captions with Claude
 * in the desktop app instead, which costs nothing extra.
 *
 * Cost when on: $1 per million input tokens, $5 per million output
 * (platform.claude.com pricing, 2026-09-24) — about a cent per caption.
 * The AI only ever DRAFTS. It never publishes or sends anything.
 */

export const AI_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

export function aiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const VOICE = `You write for Ultra Shine Cleaning, a family-owned house cleaning business in Boca Raton, Florida (owners Tiago and Francine; serves Palm Beach and Broward).
Voice: warm, confident, plain English, specific about what was cleaned. No hype words ("amazing", "top-notch"), no made-up facts, no prices, no claims about insurance amounts, no client names or addresses. At most one emoji.
Every caption ends with: "Free quote in under an hour, link in bio."`;

type Block = { type: 'text'; text: string } | { type: 'image'; source: { type: 'url'; url: string } };

async function claude(system: string, content: Block[], maxTokens: number): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('AI is off (no ANTHROPIC_API_KEY).');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content }] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `AI error ${res.status}`);
  return (data.content ?? []).map((c: { text?: string }) => c.text ?? '').join('').trim();
}

function parseJson<T>(s: string): T {
  const m = s.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : s) as T;
}

export async function aiCaptions(input: { imageUrls: string[]; job?: string; city?: string; kind: string }) {
  const content: Block[] = input.imageUrls.slice(0, 3).map((url) => ({ type: 'image', source: { type: 'url', url } }));
  content.push({
    type: 'text',
    text: `Write 3 Instagram captions for this ${input.kind.toLowerCase()}. Job: ${input.job || 'not given'}. City: ${input.city || 'not given'}.
Also check the photos for privacy: house numbers, street signs, license plates, faces, mail with names, family photos.
Reply with JSON only: {"options":[{"style":"Friendly","text":"..."},{"style":"Short","text":"..."},{"style":"Story","text":"..."}],"hashtags":["#..."],"privacy":["plain-English issue", ...]}`,
  });
  return parseJson<{ options: { style: string; text: string }[]; hashtags: string[]; privacy: string[] }>(await claude(VOICE, content, 900));
}

export async function aiRewrite(caption: string, how: string) {
  const text = await claude(VOICE, [{ type: 'text', text: `Rewrite this caption — ${how}. Return only the caption.\n\n${caption}` }], 500);
  return text;
}

export async function aiReply(thread: { dir: 'in' | 'out'; text: string }[]) {
  const convo = thread.slice(-12).map((m) => `${m.dir === 'in' ? 'Customer' : 'Ultra Shine'}: ${m.text}`).join('\n');
  return claude(
    `${VOICE}\nYou draft Instagram/Facebook DM replies. Short (1–3 sentences), friendly, answer the actual question. Never quote a price — point to the quote form ultrashinecleaningfl.com/quote or offer a quick walkthrough. Return only the reply text.`,
    [{ type: 'text', text: convo }],
    300,
  );
}
