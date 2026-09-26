import { createSign } from 'crypto';
import { getJSON, setJSON } from '../kv';

/**
 * Google search — Search Console API (read 2026-09-25):
 *   https://developers.google.com/webmaster-tools/v1/searchanalytics/query
 *   POST https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query
 *   body { startDate, endDate (YYYY-MM-DD, Pacific time), dimensions[], rowLimit }
 *   → { rows: [{ keys[], clicks, impressions, ctr (0–1), position }] }
 *   scope https://www.googleapis.com/auth/webmasters.readonly
 *
 * WHY A SERVICE ACCOUNT, NOT "SIGN IN WITH GOOGLE": a normal Google sign-in
 * for an unpublished app hands out a refresh token that dies after 7 days, so
 * the tab would ask to reconnect every week. A service account is a robot
 * Google user; the owner adds its email in Search Console → Settings → Users
 * (Restricted is enough to read), and it keeps working until someone removes it.
 *
 * Env (owner sets in Vercel; never in chat, never in code):
 *   GSC_SERVICE_ACCOUNT_JSON  the whole key file downloaded from Google Cloud
 *   GSC_SITE                  optional; defaults to the domain property
 *                             "sc-domain:ultrashinecleaningfl.com"
 *
 * Cost: $0. Data runs about 2 days behind (Google's own delay).
 */

type Key = { client_email: string; private_key: string };

function keyFromEnv(): Key | null {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const k = JSON.parse(raw) as Partial<Key>;
    if (!k.client_email || !k.private_key) return null;
    return { client_email: k.client_email, private_key: k.private_key.replace(/\\n/g, '\n') };
  } catch {
    return null;
  }
}

export function gscConfigured(): boolean {
  return !!keyFromEnv();
}

export function gscSite(): string {
  return process.env.GSC_SITE || 'sc-domain:ultrashinecleaningfl.com';
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** RS256-signed JWT → 1-hour access token. Cached in Redis so each view doesn't re-sign. */
async function accessToken(): Promise<string> {
  const key = keyFromEnv();
  if (!key) throw new Error('Google Search Console is not connected (no GSC_SERVICE_ACCOUNT_JSON).');
  const cached = await getJSON<{ token: string; exp: number }>('insights:gsc:token');
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(
    JSON.stringify({
      iss: key.client_email,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const sig = b64url(createSign('RSA-SHA256').update(`${header}.${claim}`).sign(key.private_key));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claim}.${sig}` }),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(`Google refused the service account key (${data.error_description || data.error || res.status}).`);
  await setJSON('insights:gsc:token', { token: data.access_token, exp: Date.now() + (data.expires_in ?? 3600) * 1000 }, 3500);
  return data.access_token;
}

export type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

export async function gscQuery(startDate: string, endDate: string, dimensions: string[], rowLimit = 1000): Promise<GscRow[]> {
  const token = await accessToken();
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(gscSite())}/searchAnalytics/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate, endDate, dimensions, rowLimit }),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    if (res.status === 403) {
      throw new Error(`Search Console said no (${msg}). Add the service account's email as a user on the ${gscSite()} property.`);
    }
    throw new Error(`Search Console: ${msg}`);
  }
  return (data.rows ?? []) as GscRow[];
}

export type GscData = {
  daily: { date: string; clicks: number; impressions: number; position: number }[];
  prev: { clicks: number; impressions: number; position: number | null };
  queries: GscRow[];
  queryPages: GscRow[];
  devices: GscRow[];
};

export async function fetchGsc(start: string, end: string, prevStart: string, prevEnd: string): Promise<GscData> {
  const [daily, prev, queries, queryPages, devices] = await Promise.all([
    gscQuery(start, end, ['date']),
    gscQuery(prevStart, prevEnd, []),
    gscQuery(start, end, ['query'], 50),
    gscQuery(start, end, ['query', 'page'], 250),
    gscQuery(start, end, ['device'], 5),
  ]);
  const p = prev[0];
  return {
    daily: daily.map((r) => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions, position: r.position })),
    prev: { clicks: p?.clicks ?? 0, impressions: p?.impressions ?? 0, position: p ? p.position : null },
    queries,
    queryPages,
    devices,
  };
}

/**
 * "Almost on page 1": searches where we average position 10.5–20.5 (page 2)
 * and people actually see us (≥ 10 impressions). Biggest audience first.
 */
export function almostPageOne(rows: GscRow[], limit = 5): { q: string; impressions: number; position: number; page: string | null }[] {
  const best = new Map<string, GscRow>();
  for (const r of rows) {
    if (r.position < 10.5 || r.position > 20.5 || r.impressions < 10) continue;
    const cur = best.get(r.keys[0]);
    if (!cur || r.impressions > cur.impressions) best.set(r.keys[0], r);
  }
  return Array.from(best.values())
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, limit)
    .map((r) => ({ q: r.keys[0], impressions: Math.round(r.impressions), position: Math.round(r.position * 10) / 10, page: r.keys[1] ?? null }));
}
