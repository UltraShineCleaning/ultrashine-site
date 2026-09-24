import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

/**
 * Admin session — the ONE place admin auth is decided.
 *
 * WHY THIS EXISTS (2026-09-24)
 * ----------------------------
 * Until today the login route stored THE ACTUAL ADMIN PASSWORD as the cookie
 * value, and six separate files each checked `cookie === ADMIN_PASSWORD`.
 * Anything that ever saw that cookie — a shared computer, a browser extension,
 * a synced profile, a debugging screenshot — had the password itself, not
 * just a session. That was tolerable while the admin only READ data. The
 * admin is about to publish to Instagram and Facebook and message customers,
 * so it's now a real target.
 *
 * What the cookie holds now: `v1.<issuedAtMs>.<random>.<signature>`
 *   - the signature is an HMAC-SHA256 keyed by ADMIN_PASSWORD
 *   - it proves the server issued the token, and it expires after 30 days
 *   - it reveals nothing about the password
 *   - changing ADMIN_PASSWORD in Vercel instantly logs out every session,
 *     which is exactly what you want if a device is lost
 *
 * No new env vars and no database: the password already in Vercel is the key.
 *
 * NEVER check the cookie by hand anywhere else. Import `isAdmin()`. Six
 * copies of one check is how this was wrong in six places at once.
 */

export const ADMIN_COOKIE = 'us_admin';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secret(): string | null {
  const s = process.env.ADMIN_PASSWORD;
  return s && s.length > 0 ? s : null;
}

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Constant-time password check for the login route. */
export function passwordMatches(candidate: string | undefined | null): boolean {
  const key = secret();
  if (!key || !candidate) return false;
  // Compare HMACs rather than raw strings so lengths never leak.
  return safeEqual(sign(candidate, 'pw'), sign(key, 'pw'));
}

/** Issue a new signed session token. Call only after passwordMatches(). */
export function createSessionToken(): string {
  const key = secret();
  if (!key) throw new Error('ADMIN_PASSWORD not set');
  const payload = `v1.${Date.now()}.${randomBytes(16).toString('hex')}`;
  return `${payload}.${sign(payload, key)}`;
}

/** True only for an unexpired token this server signed. */
export function verifySessionToken(token: string | undefined | null): boolean {
  const key = secret();
  if (!key || !token) return false;
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return false;
  const [v, issuedAt, nonce, sig] = parts;
  const payload = `${v}.${issuedAt}.${nonce}`;
  if (!safeEqual(sig, sign(payload, key))) return false;
  const issued = Number(issuedAt);
  if (!Number.isFinite(issued)) return false;
  const age = Date.now() - issued;
  return age >= 0 && age < SESSION_MAX_AGE_SECONDS * 1000;
}

/** Use in server components and route handlers. */
export function isAdmin(): boolean {
  return verifySessionToken(cookies().get(ADMIN_COOKIE)?.value);
}
