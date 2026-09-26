/**
 * Website visitors — Vercel Web Analytics API (read 2026-09-25):
 *   https://vercel.com/docs/analytics/web-analytics-api
 *   https://vercel.com/docs/rest-api/web-analytics/aggregates-page-views
 *
 *   GET https://api.vercel.com/v1/query/web-analytics/visits/aggregate
 *       ?projectId&by&since&until&limit&filter&teamId|slug
 *   → { data: [{ <dimension>…, pageviews, visitors, timestamp? }] }
 *
 * `by` takes time grains (day, week, month) and dimensions (referrerHostname,
 * deviceType, requestPath, …). There is NO city dimension — only country — so
 * the website section never shows cities. Production traffic only by default.
 *
 * Env (set in Vercel by the owner, never in code):
 *   VERCEL_ANALYTICS_TOKEN   an access token (Vercel → Account Settings → Tokens)
 *   VERCEL_ANALYTICS_PROJECT project id or name (defaults to "ultrashine-site")
 *   VERCEL_ANALYTICS_TEAM    team slug or id the project lives under (optional)
 *
 * Cost: $0. Web Analytics is already on for this project (app/layout.tsx).
 * Hobby includes 50,000 events a month across all projects and keeps a
 * 1-month window — which is why we save each day ourselves (below).
 */

import { getJSON, setJSON } from '../kv';
import { etDayKey, etParts, etToMs } from '../social/time';

const API = 'https://api.vercel.com/v1/query/web-analytics/visits';

export function vercelConfigured(): boolean {
  return !!process.env.VERCEL_ANALYTICS_TOKEN;
}

export type VercelRow = Record<string, string | number | null> & { pageviews?: number; visitors?: number; timestamp?: string };

async function call(path: 'aggregate' | 'count', q: Record<string, string>): Promise<VercelRow[] | VercelRow> {
  const token = process.env.VERCEL_ANALYTICS_TOKEN;
  if (!token) throw new Error('Vercel Web Analytics is not connected (no VERCEL_ANALYTICS_TOKEN).');
  const url = new URL(`${API}/${path}`);
  url.searchParams.set('projectId', process.env.VERCEL_ANALYTICS_PROJECT || 'ultrashine-site');
  const team = process.env.VERCEL_ANALYTICS_TEAM;
  if (team) url.searchParams.set(team.startsWith('team_') ? 'teamId' : 'slug', team);
  for (const [k, v] of Object.entries(q)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error?.message || `HTTP ${res.status}`;
    if (res.status === 401 || res.status === 403) throw new Error(`Vercel refused the token (${msg}). Check VERCEL_ANALYTICS_TOKEN and VERCEL_ANALYTICS_TEAM.`);
    if (res.status === 404) throw new Error(`Vercel can't find the project (${msg}). Check VERCEL_ANALYTICS_PROJECT / VERCEL_ANALYTICS_TEAM.`);
    throw new Error(`Vercel analytics: ${msg}`);
  }
  return body?.data ?? [];
}

export async function aggregate(by: string, since: number, until: number, opts: { limit?: number; filter?: string } = {}): Promise<VercelRow[]> {
  const q: Record<string, string> = { by, since: String(since), until: String(until - 1) };
  if (opts.limit) q.limit = String(opts.limit);
  if (opts.filter) q.filter = opts.filter;
  const d = await call('aggregate', q);
  return Array.isArray(d) ? d : [];
}

export type VercelData = {
  /** One point per Florida day (at noon), from our saved daily numbers. */
  timeline: { at: number; visitors: number; pageviews: number }[];
  prevTimeline: { at: number; visitors: number; pageviews: number }[];
  referrers: { host: string; visitors: number }[];
  devices: { device: string; visitors: number }[];
  pages: { path: string; pageviews: number }[];
  quoteVisitors: number;
  /** Visits = each day's unique visitors, added up over the range. */
  visitors: number;
  /** Null when our saved history doesn't reach back over the whole previous period. */
  prevVisitors: number | null;
};

const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);

/**
 * One Florida day of website numbers. Four questions to Vercel, one dimension
 * each (the docs allow two in one call, but don't show how to pass two, so we
 * don't guess): devices (which also gives the day's totals), referrers, pages,
 * and visitors to /quote.
 */
export type VDay = { v: number; pv: number; q: number; refs: Record<string, number>; dev: Record<string, number>; pages: Record<string, number> };

export async function fetchDay(start: number, end: number): Promise<VDay> {
  const [devs, refs, pages, quote] = await Promise.all([
    aggregate('deviceType', start, end, { limit: 10 }),
    aggregate('referrerHostname', start, end, { limit: 25 }),
    aggregate('requestPath', start, end, { limit: 25 }),
    aggregate('requestPath', start, end, { filter: "requestPath eq '/quote'" }),
  ]);
  const map = (rows: VercelRow[], key: string, val: 'visitors' | 'pageviews') => {
    const m: Record<string, number> = {};
    for (const r of rows) m[String(r[key] ?? '')] = (m[String(r[key] ?? '')] ?? 0) + num(r[val]);
    return m;
  };
  return {
    v: devs.reduce((a, r) => a + num(r.visitors), 0),
    pv: devs.reduce((a, r) => a + num(r.pageviews), 0),
    q: quote.reduce((a, r) => a + num(r.visitors), 0),
    refs: map(refs, 'referrerHostname', 'visitors'),
    dev: map(devs, 'deviceType', 'visitors'),
    pages: map(pages, 'requestPath', 'pageviews'),
  };
}

/* ---------- our own daily history ----------
 * Vercel's Hobby plan only keeps a 1-month reporting window
 * (vercel.com/docs/analytics/limits-and-pricing), so the 90-day and 12-month
 * views would be empty past a month. Every morning we save yesterday's numbers
 * here, one Redis key per month, so the history keeps growing. */

const monthKey = (day: string) => `insights:vercel:days:${day.slice(0, 7)}`;

async function loadDays(days: string[]): Promise<Record<string, VDay>> {
  const months = Array.from(new Set(days.map((d) => d.slice(0, 7))));
  const out: Record<string, VDay> = {};
  for (const m of months) Object.assign(out, (await getJSON<Record<string, VDay>>(`insights:vercel:days:${m}`)) ?? {});
  return out;
}

/**
 * Merge days into their month keys. One read + one write per month, done in
 * sequence — parallel read-modify-writes on the same key would lose days.
 */
async function saveDays(days: Record<string, VDay>): Promise<void> {
  const byMonth = new Map<string, Record<string, VDay>>();
  for (const [d, v] of Object.entries(days)) {
    const k = monthKey(d);
    byMonth.set(k, { ...(byMonth.get(k) ?? {}), [d]: v });
  }
  for (const [k, add] of Array.from(byMonth.entries())) {
    const cur = (await getJSON<Record<string, VDay>>(k)) ?? {};
    await setJSON(k, { ...cur, ...add }, 800 * 86_400);
  }
}

const DAY = 86_400_000;

/** Florida-day bounds for a 'YYYY-MM-DD'. */
function bounds(day: string): [number, number] {
  const [y, m, d] = day.split('-').map(Number);
  const start = etToMs(y, m, d, 0);
  const n = etParts(start + DAY + 3 * 3600_000);
  return [start, etToMs(n.y, n.m, n.d, 0)];
}

/**
 * Save finished days we don't have yet. `back` = how many days to look back
 * (the cron uses 31, the whole Hobby window; a page load uses 3). The last two
 * days are always re-read, since late visits can still land.
 */
export async function syncVercelDays(back: number, now = Date.now()): Promise<number> {
  const want: string[] = [];
  for (let i = 1; i <= back; i++) want.push(etDayKey(now - i * DAY));
  const have = await loadDays(want);
  const todo = want.filter((d, i) => i < 2 || !have[d]);
  const got: Record<string, VDay> = {};
  for (let i = 0; i < todo.length; i += 4) {
    await Promise.all(
      todo.slice(i, i + 4).map(async (d) => {
        const [s, e] = bounds(d);
        got[d] = await fetchDay(s, e);
      }),
    );
  }
  await saveDays(got);
  return todo.length;
}

/** Earliest day we have saved (so we know if a "previous period" is really complete). */
async function earliestSaved(now: number): Promise<string | null> {
  const found: string[] = [];
  for (let i = 0; i < 25; i++) {
    const p = etParts(now);
    let y = p.y;
    let m = p.m - i;
    while (m < 1) { m += 12; y -= 1; }
    const keys = Object.keys((await getJSON<Record<string, VDay>>(`insights:vercel:days:${y}-${String(m).padStart(2, '0')}`)) ?? {});
    if (keys.length) found.push(...keys);
    else if (found.length) break;
  }
  return found.sort()[0] ?? null;
}

/**
 * Website numbers for [start, end) plus the previous period, from our saved
 * days. Today isn't finished, so today is asked live (cached 30 min upstream).
 */
export async function vercelFromHistory(start: number, end: number, prevStart: number, today: () => Promise<VDay>, now = Date.now()): Promise<VercelData> {
  const days: string[] = [];
  for (let t = prevStart + 12 * 3600_000; t < end; t += DAY) days.push(etDayKey(t));
  const saved = await loadDays(days);
  const todayKey = etDayKey(now);
  if (todayKey >= etDayKey(start) && todayKey < etDayKey(end + 1)) saved[todayKey] = await today();
  const noon = (d: string) => bounds(d)[0] + 12 * 3600_000;
  const inCur = Object.entries(saved).filter(([d]) => noon(d) >= start && noon(d) < end);
  const inPrev = Object.entries(saved).filter(([d]) => noon(d) >= prevStart && noon(d) < start);
  const add = (list: [string, VDay][], pick: (v: VDay) => Record<string, number>) => {
    const m: Record<string, number> = {};
    for (const [, v] of list) for (const [k, n] of Object.entries(pick(v))) m[k] = (m[k] ?? 0) + n;
    return m;
  };
  const earliest = await earliestSaved(now);
  const prevComplete = !!earliest && earliest <= etDayKey(prevStart + 12 * 3600_000);
  return {
    timeline: inCur.map(([d, v]) => ({ at: noon(d), visitors: v.v, pageviews: v.pv })),
    prevTimeline: prevComplete ? inPrev.map(([d, v]) => ({ at: noon(d), visitors: v.v, pageviews: v.pv })) : [],
    referrers: Object.entries(add(inCur, (v) => v.refs)).map(([host, visitors]) => ({ host, visitors })),
    devices: Object.entries(add(inCur, (v) => v.dev)).map(([device, visitors]) => ({ device, visitors })),
    pages: Object.entries(add(inCur, (v) => v.pages))
      .map(([path, pageviews]) => ({ path, pageviews }))
      .sort((a, b) => b.pageviews - a.pageviews),
    quoteVisitors: inCur.reduce((a, [, v]) => a + v.q, 0),
    visitors: inCur.reduce((a, [, v]) => a + v.v, 0),
    prevVisitors: prevComplete ? inPrev.reduce((a, [, v]) => a + v.v, 0) : null,
  };
}

/** Turn a referrer host into something a person reads. Empty = typed the address / bookmark / app. */
export function referrerLabel(host: string): string {
  const h = host.toLowerCase().replace(/^www\./, '');
  if (!h || h === 'others' || h === '(direct)' || h === 'null') return h === 'others' ? 'Everything else' : 'Direct visit';
  if (h.includes('instagram')) return 'Instagram';
  if (h.includes('facebook') || h === 'fb.com' || h === 'm.facebook.com' || h === 'l.facebook.com') return 'Facebook';
  if (h.startsWith('maps.google') || h.includes('google.com/maps')) return 'Google Maps';
  if (h.includes('google')) return 'Google search';
  if (h.includes('bing')) return 'Bing';
  if (h.includes('yelp')) return 'Yelp';
  if (h.includes('homeadvisor') || h.includes('angi')) return 'HomeAdvisor / Angi';
  if (h.includes('chatgpt') || h.includes('openai') || h.includes('perplexity') || h.includes('claude')) return 'AI assistants';
  if (h.includes('ultrashinecleaningfl')) return 'Our own site';
  return h;
}

export function deviceLabel(d: string): string {
  const x = d.toLowerCase();
  if (x.includes('mobile') || x === 'phone') return 'Phone';
  if (x.includes('desktop')) return 'Computer';
  if (x.includes('tablet')) return 'Tablet';
  return d || 'Other';
}

export function pageLabel(path: string): string {
  const map: Record<string, string> = {
    '/': 'Home',
    '/quote': 'Get a quote',
    '/reviews': 'Reviews',
    '/about': 'About us',
    '/areas': 'Areas we serve',
    '/work-for-us': 'Work for us',
    '/leave-a-review': 'Leave a review',
  };
  if (map[path]) return map[path];
  const last = path.split('/').filter(Boolean).pop() ?? path;
  return last.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
