import { createHash, createHmac, timingSafeEqual } from 'crypto';

/**
 * Upstash QStash — fires an HTTP call to our site at an exact minute.
 *
 * Why: Vercel Hobby crons run once a day. Posting at 9:00 / 12:00 / 6:00 and
 * sending a follow-up 3 hours after a DM need minute-level timing.
 * Free tier: 1,000 messages/day — we use a handful.
 *
 * Env (Tiago adds in Vercel from the Upstash console → QStash):
 *   QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY
 *   QSTASH_URL (optional — only if Upstash shows a regional URL)
 *
 * Every job lands on ONE route, /api/social/jobs, which verifies the
 * Upstash-Signature before doing anything.
 */

export type Job =
  | { type: 'publish'; postId: string; version: number }
  | { type: 'followup'; convKey: string };

export function qstashConfigured(): boolean {
  return !!process.env.QSTASH_TOKEN;
}

export function siteBaseUrl(): string {
  if (process.env.SOCIAL_BASE_URL) return process.env.SOCIAL_BASE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

const QSTASH = () => (process.env.QSTASH_URL || 'https://qstash.upstash.io').replace(/\/$/, '');

/** Queue a job for `atMs`. Returns the QStash message id (to cancel it later), or null when QStash isn't set up. */
export async function scheduleJob(job: Job, atMs: number): Promise<string | null> {
  const token = process.env.QSTASH_TOKEN;
  if (!token) return null;
  const dest = `${siteBaseUrl()}/api/social/jobs`;
  const notBefore = Math.max(Math.floor(atMs / 1000), Math.floor(Date.now() / 1000));
  const res = await fetch(`${QSTASH()}/v2/publish/${dest}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Upstash-Not-Before': String(notBefore),
      'Upstash-Retries': '2',
    },
    body: JSON.stringify(job),
  });
  const data = (await res.json().catch(() => ({}))) as { messageId?: string; error?: string };
  if (!res.ok) throw new Error(`QStash: ${data.error ?? res.status}`);
  return data.messageId ?? null;
}

export async function cancelJob(messageId?: string | null): Promise<void> {
  const token = process.env.QSTASH_TOKEN;
  if (!token || !messageId) return;
  await fetch(`${QSTASH()}/v2/messages/${messageId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => undefined); // already delivered / gone — fine
}

/* ---------------- signature check ---------------- */

const b64url = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unpad = (s: string) => s.replace(/=+$/, '');

function verifyWith(jwt: string, key: string, rawBody: string): boolean {
  const parts = jwt.split('.');
  if (parts.length !== 3) return false;
  const [h, p, sig] = parts;
  const expected = b64url(createHmac('sha256', key).update(`${h}.${p}`).digest());
  const a = Buffer.from(expected);
  const b = Buffer.from(unpad(sig));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  let claims: { iss?: string; exp?: number; nbf?: number; body?: string };
  try {
    claims = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  } catch {
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== 'Upstash') return false;
  if (claims.exp && now > claims.exp + 60) return false;
  if (claims.nbf && now < claims.nbf - 60) return false;
  const bodyHash = b64url(createHash('sha256').update(rawBody, 'utf8').digest());
  return unpad(claims.body ?? '') === bodyHash;
}

/** True only for a genuine QStash delivery of exactly this body. Tries the current key, then the next (key rotation). */
export function verifyQstash(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const keys = [process.env.QSTASH_CURRENT_SIGNING_KEY, process.env.QSTASH_NEXT_SIGNING_KEY].filter(Boolean) as string[];
  return keys.some((k) => verifyWith(signature, k, rawBody));
}
