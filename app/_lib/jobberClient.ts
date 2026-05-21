/**
 * Jobber GraphQL client (server-only — imported by server components +
 * route handlers; never bundled into the client).
 *
 * Auth model:
 *   - JOBBER_CLIENT_ID + JOBBER_CLIENT_SECRET come from your Jobber
 *     developer app (https://developer.getjobber.com).
 *   - JOBBER_REFRESH_TOKEN was captured from the OAuth callback and
 *     saved in Vercel env. It's long-lived (months) and is what we use
 *     to mint short-lived access tokens.
 *
 * On each request we:
 *   1. Check the module-level cache for a non-expired access_token
 *   2. If missing/expired, POST to the token endpoint with the refresh_token
 *      to get a new access_token (cached with its expires_in)
 *   3. Use that bearer token to POST a GraphQL query
 *
 * Jobber requires `application/json` content type (per their April 2024
 * change). The `X-JOBBER-GRAPHQL-VERSION` header pins schema version so
 * field renames don't break us silently.
 *
 * Queries below are based on the official Jobber app template
 * (https://github.com/GetJobber/Jobber-AppTemplate-RailsAPI) — basic
 * `clients { nodes { id name } totalCount }` shape with cursor pagination,
 * no exotic filter args that might not exist on every account's schema.
 *
 * If any single query fails, the entry shows null and the dashboard
 * surfaces the actual GraphQL error message instead of silently zeroing
 * — that way Tiago can paste me the error and we tweak schema details.
 */

const JOBBER_GRAPHQL_URL = 'https://api.getjobber.com/api/graphql';
const JOBBER_TOKEN_URL = 'https://api.getjobber.com/api/oauth/token';

/**
 * Vercel KV (Upstash Redis) persistence for the rotated Jobber refresh
 * token. When Vercel KV is linked to the project, Vercel auto-injects
 * `KV_REST_API_URL` + `KV_REST_API_TOKEN` env vars, and we use the
 * Upstash REST API directly — no extra npm package required.
 *
 * If KV isn't set up yet (env vars absent), these helpers degrade
 * gracefully: kvGet returns null, kvSet is a no-op, and the rest of
 * the code falls back to the env var + in-memory cache like before.
 */
const KV_REFRESH_KEY = 'jobber:refresh_token';
const KV_LAST_REFRESH_KEY = 'jobber:last_refresh_at';

async function kvGet(key: string): Promise<string | null> {
  // Accept either Vercel KV's env var names OR Upstash's native names —
  // whichever convention the env happens to be set up with.
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.result === 'string' ? data.result : null;
  } catch (err) {
    console.error('[jobber] kvGet error:', err);
    return null;
  }
}

async function kvSet(key: string, value: string): Promise<boolean> {
  // Accept either Vercel KV's env var names OR Upstash's native names —
  // whichever convention the env happens to be set up with.
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;
  try {
    // Upstash REST: POST /set/<key> with body = value
    const res = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body: value,
      cache: 'no-store',
    });
    return res.ok;
  } catch (err) {
    console.error('[jobber] kvSet error:', err);
    return false;
  }
}

export function isJobberKvEnabled(): boolean {
  return !!(
    (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
    (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)
  );
}

/** Last successful access-token refresh timestamp (ms since epoch). */
export async function getLastRefreshAt(): Promise<number | null> {
  const v = await kvGet(KV_LAST_REFRESH_KEY);
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
// Pin to Jobber's LATEST STABLE schema version. Each active version is
// listed in their changelog — using something not in that list returns
// "GraphQL API version 'X' does not exist". The full active list as of
// this writing: 2025-04-16, 2025-01-20, 2024-12-05, 2024-11-12,
// 2024-11-07, 2024-09-23, 2024-09-12, 2024-08-30, 2024-06-10,
// 2024-04-17, 2023-11-15, 2023-08-18, 2023-05-05, 2023-03-29,
// 2022-12-07, 2022-09-15, 2022-05-23.
// See: https://developer.getjobber.com/docs/changelog
const JOBBER_API_VERSION = '2025-04-16';

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

let cachedToken: TokenCache | null = null;
/**
 * In-memory store of the LATEST refresh token Jobber issued us.
 *
 * IMPORTANT — Jobber rotates refresh tokens. Every successful refresh
 * returns a NEW refresh_token + invalidates the one we just used. If we
 * keep using the env-var token forever it dies on the second refresh.
 *
 * We capture the rotated token in this module-level variable and prefer
 * it over the env var on subsequent refreshes. This survives ONLY for
 * the lifetime of a warm serverless instance — on cold starts we fall
 * back to the env var. Combined with Jobber's typical multi-day refresh
 * token lifetime, this keeps the integration alive in practice.
 *
 * Proper fix (future): write rotated tokens to Vercel KV or Postgres so
 * they persist across cold starts. For a single-admin tool the in-memory
 * approach is usually enough.
 */
let rotatedRefreshToken: string | null = null;
/**
 * Last token-refresh error message captured for UI surfacing. Module-level
 * so the dashboard can read it after the queries fail and tell Tiago WHAT
 * went wrong (e.g. "invalid_grant") instead of just "token isn't working".
 */
let lastTokenError: string | null = null;

export function getLastTokenError(): string | null {
  return lastTokenError;
}

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.JOBBER_CLIENT_ID;
  const clientSecret = process.env.JOBBER_CLIENT_SECRET;
  const envRefreshToken = process.env.JOBBER_REFRESH_TOKEN;

  if (!clientId) {
    lastTokenError = 'JOBBER_CLIENT_ID env var not set on Vercel';
    return null;
  }
  if (!clientSecret) {
    lastTokenError = 'JOBBER_CLIENT_SECRET env var not set on Vercel';
    return null;
  }

  // Refresh-token preference order:
  //   1. In-memory rotated token from this warm instance
  //   2. Persistent KV-stored token (survives cold starts + deploys)
  //   3. Env var (the original token user pasted when first connecting)
  // KV is the linchpin that makes the integration truly permanent —
  // every time Jobber rotates, we write the new one to KV, so the next
  // request (even from a fresh serverless instance) sees the live token.
  let refreshToken = rotatedRefreshToken;
  if (!refreshToken) {
    const kvToken = await kvGet(KV_REFRESH_KEY);
    if (kvToken) {
      refreshToken = kvToken;
      rotatedRefreshToken = kvToken; // warm the in-memory cache too
    }
  }
  if (!refreshToken) refreshToken = envRefreshToken ?? null;

  if (!refreshToken) {
    lastTokenError = 'No Jobber refresh token available (KV empty + env var unset)';
    return null;
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - now > 60_000) {
    return cachedToken.accessToken;
  }

  const res = await fetch(JOBBER_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    // Try to extract the OAuth error field for a cleaner UI message
    let detail = text.slice(0, 300);
    try {
      const j = JSON.parse(text);
      if (j.error || j.error_description) {
        detail = `${j.error ?? 'error'}${j.error_description ? ': ' + j.error_description : ''}`;
      }
    } catch {
      /* not JSON, use raw */
    }
    lastTokenError = `HTTP ${res.status} from Jobber token endpoint — ${detail}`;
    console.error('[jobber] Token refresh failed:', lastTokenError);
    // The token we tried is dead. If it was the rotated in-memory one
    // (possibly stale across a cold start), clear it so the next attempt
    // falls back to the env var token. We don't auto-reconnect because
    // that requires a browser session.
    if (rotatedRefreshToken) {
      console.warn('[jobber] Clearing stale rotated refresh token, falling back to env on next call');
      rotatedRefreshToken = null;
    }
    return null;
  }

  const data = await res.json();
  if (!data.access_token) {
    lastTokenError = `Jobber returned no access_token. Response: ${JSON.stringify(data).slice(0, 300)}`;
    console.error('[jobber] Token refresh returned no access_token:', data);
    return null;
  }

  // KEY: capture the rotated refresh_token Jobber gave us. Without this
  // step the next refresh dies because Jobber invalidates the previous
  // refresh token whenever it issues a new access_token. We:
  //   1. Save it in memory (fast lookup for next request in warm instance)
  //   2. Persist to Vercel KV (survives cold starts + redeploys)
  if (data.refresh_token && data.refresh_token !== refreshToken) {
    console.log('[jobber] Captured rotated refresh token from Jobber');
    rotatedRefreshToken = data.refresh_token;
    const persisted = await kvSet(KV_REFRESH_KEY, data.refresh_token);
    if (persisted) {
      console.log('[jobber] Persisted rotated refresh token to Vercel KV');
    }
  }

  // Record successful refresh timestamp so the dashboard can show
  // "Token last refreshed: X min ago" — gives Tiago confidence the
  // integration is alive without manually testing it.
  await kvSet(KV_LAST_REFRESH_KEY, String(now));

  // Success — clear any previous error
  lastTokenError = null;
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.accessToken;
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
};

export async function jobberQuery<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<GraphQLResponse<T> | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const res = await fetch(JOBBER_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-JOBBER-GRAPHQL-VERSION': JOBBER_API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[jobber] HTTP error:', res.status, text);
    return { errors: [{ message: `HTTP ${res.status}: ${text.slice(0, 300)}` }] };
  }

  return (await res.json()) as GraphQLResponse<T>;
}

export function isJobberConfigured(): boolean {
  return !!(
    process.env.JOBBER_CLIENT_ID &&
    process.env.JOBBER_CLIENT_SECRET &&
    process.env.JOBBER_REFRESH_TOKEN
  );
}

// ============================================================
// RESPONSE CACHE — prevents Jobber rate-limit throttling.
//
// Jobber's API enforces a per-account rate limit (~50 points/sec restore
// rate). Each GraphQL query consumes points proportional to its complexity.
// Rapid page refreshes during testing burn the budget and we get
// "Throttled" errors from Jobber. We cache the heavy fetcher results for
// 60 seconds so repeated visits within that window serve from memory.
//
// Cache is module-scoped: shared across requests within a warm serverless
// instance, reset on cold starts. That's fine — cold starts are uncommon
// enough that the budget regenerates between them.
//
// Call sites can opt out with `force: true` to bypass the cache (used by
// the "Refresh now" button so the user can always pull truly-live data).
// ============================================================

// 5 minute cache — much friendlier to Jobber's rate limit. The data is
// "live" enough for a single-admin dashboard (you'd never look at it
// 50 times in 5 min normally). The "Refresh now" button bypasses cache
// for genuine live data.
const CACHE_TTL_MS = 300_000; // 5 minutes

type Cached<T> = { data: T; expiresAt: number };
const responseCache = new Map<string, Cached<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    responseCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T): void {
  responseCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ============================================================
// Data fetchers — kept INTENTIONALLY MINIMAL using only fields
// confirmed present in Jobber's official app template:
//   - clients { nodes { id name } totalCount }
//   - users / requests / quotes / jobs / scheduledItems / invoices
//
// We deliberately avoid exotic filter args (date ranges, status enums)
// in the initial queries — we just pull totalCount + recent nodes and
// derive metrics in JS. If/when we want server-side filtering we can
// add it once we've confirmed the schema shapes against a real account.
// ============================================================

export type JobberVisit = {
  id: string;
  /** Visit title — typically the service name (e.g. "Cleaning Services") */
  title: string;
  clientName: string;
  startAt: string | null;
  endAt: string | null;
  address: string | null;
  /** Names of the assigned crew members. Empty if unassigned. */
  team: string[];
  /** Whether Jobber marks the visit completed. Drives strikethrough. */
  completed: boolean;
};

export type JobberClient = {
  id: string;
  name: string;
  companyName: string | null;
  isCompany: boolean;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
};

/**
 * Fetch the full client directory from Jobber for the Clients tab.
 * Used independently from the dashboard metrics so a tab-specific call
 * keeps the home page light. Returns a flat sorted list.
 */
export async function getJobberClients(opts: { force?: boolean } = {}): Promise<{ clients: JobberClient[]; error?: string }> {
  if (!isJobberConfigured()) {
    return { clients: [], error: 'JOBBER env vars missing' };
  }

  // Serve from cache unless caller asked for fresh data
  const cacheKey = 'clients';
  if (!opts.force) {
    const cached = getCached<{ clients: JobberClient[]; error?: string }>(cacheKey);
    if (cached) return cached;
  }

  const res = await jobberQuery<{
    clients: {
      totalCount: number;
      nodes: Array<{
        id: string;
        name?: string | null;
        companyName?: string | null;
        isCompany?: boolean | null;
        emails?: Array<{ primary?: boolean | null; address?: string | null }> | null;
        phoneNumbers?: Array<{ primary?: boolean | null; number?: string | null }> | null;
        billingAddress?: {
          street1?: string | null;
          street2?: string | null;
          city?: string | null;
          province?: string | null;
        } | null;
      }>;
    };
  }>(
    `query AllClients {
      clients(first: 200, filter: { isArchived: false }) {
        totalCount
        nodes {
          id
          name
          companyName
          isCompany
          emails { primary address }
          phoneNumbers: phones { primary number }
          billingAddress { street1 street2 city province }
        }
      }
    }`,
  );

  if (!res) return { clients: [], error: 'No Jobber access (token issue)' };
  if (res.errors?.length) {
    const msg = res.errors.map((e) => e.message).join(' · ');
    // If Jobber rate-limited us, serve the last cached snapshot instead of
    // showing zeros. The cache may be slightly older than 60s — that's
    // still much better than an empty list during throttling.
    if (/throttled/i.test(msg)) {
      const stale = responseCache.get(cacheKey)?.data as
        | { clients: JobberClient[]; error?: string }
        | undefined;
      if (stale) return { ...stale, error: 'Jobber rate-limited; showing recent cache' };
    }
    return { clients: [], error: msg };
  }

  // Normalize a city name to canonical Title Case so "Boca raton" + "boca
  // RATON" + "Boca Raton" all bucket together instead of creating 3
  // separate filter chips. Returns null for empty/whitespace.
  const titleCaseCity = (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return trimmed
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const nodes = res.data?.clients?.nodes ?? [];
  const clients: JobberClient[] = nodes.map((n) => {
    // Pick the primary email/phone, fall back to first available
    const primaryEmail = n.emails?.find((e) => e.primary) ?? n.emails?.[0];
    const primaryPhone = n.phoneNumbers?.find((p) => p.primary) ?? n.phoneNumbers?.[0];
    const addr = n.billingAddress;
    // A client is a company if EITHER Jobber's isCompany flag is true,
    // OR a companyName is set — the flag is unreliable in practice
    // (Jobber returns false even for accounts that are clearly businesses
    // like "Boca family & general medicine"). Fallback catches those.
    const hasCompanyName = !!(n.companyName && n.companyName.trim());
    return {
      id: n.id,
      name: n.name ?? n.companyName ?? 'Unnamed client',
      companyName: n.companyName ?? null,
      isCompany: !!n.isCompany || hasCompanyName,
      email: primaryEmail?.address ?? null,
      phone: primaryPhone?.number ?? null,
      address: addr ? [addr.street1, addr.street2].filter(Boolean).join(', ') || null : null,
      city: titleCaseCity(addr?.city),
    };
  });

  // Sort alphabetically for predictable list ordering
  clients.sort((a, b) => a.name.localeCompare(b.name));
  const result = { clients };
  setCached(cacheKey, result);
  return result;
}

export type JobberMetrics = {
  jobsToday: number;
  jobsThisWeek: number;
  /** Top 12 visits in the next 14 days — for the compact dashboard list. */
  upcomingJobs: JobberVisit[];
  /** EVERY visit we fetched in chronological order (used by the calendar view). */
  allVisits: JobberVisit[];
  activeClientCount: number;
  pendingInvoiceCount: number;
  pendingInvoiceTotal: number;
  thisWeekRevenue: number;
  /** Verbose error string surfaced on the dashboard so Tiago can paste it back. */
  errorDetail?: string;
  /** Diagnostic data about what Jobber actually returned for visits.
   *  Surfaced on the dashboard so we can see WHY the calendar is empty. */
  visitDebug?: {
    totalCount: number;
    rawNodeCount: number;
    typenameCounts: Record<string, number>;
    earliestStartAt: string | null;
    latestStartAt: string | null;
    futureCount: number;
    dateRangeRequested: { start: string; end: string };
  };
};

const empty: JobberMetrics = {
  jobsToday: 0,
  jobsThisWeek: 0,
  upcomingJobs: [],
  allVisits: [],
  activeClientCount: 0,
  pendingInvoiceCount: 0,
  pendingInvoiceTotal: 0,
  thisWeekRevenue: 0,
};

/**
 * Pulls the full set of dashboard metrics in parallel. If a query fails,
 * its value stays at zero, and any GraphQL error messages are concatenated
 * into `errorDetail` so the UI can show them inline.
 */
export async function getJobberMetrics(opts: { force?: boolean } = {}): Promise<JobberMetrics> {
  if (!isJobberConfigured()) {
    return { ...empty, errorDetail: 'JOBBER env vars missing (CLIENT_ID, CLIENT_SECRET, or REFRESH_TOKEN)' };
  }

  // 60-second cache — see CACHE_TTL_MS comment above. Bypassable via
  // `{ force: true }` from the "Refresh now" button.
  const cacheKey = 'metrics';
  if (!opts.force) {
    const cached = getCached<JobberMetrics>(cacheKey);
    if (cached) return cached;
  }

  // Calendar windows in ISO so client-side filtering of fetched nodes
  // can determine which are "today" vs "this week" without trusting
  // Jobber server-side date filters (which vary by schema version).
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday-start
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  const twoWeeksOut = new Date(startOfDay);
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);

  // ---- Clients ----
  // Stable schema: paginated `clients` with `totalCount`. No filters,
  // just the count — Jobber's docs show this exact shape works.
  const clientsPromise = jobberQuery<{ clients: { totalCount: number } }>(
    `query Clients { clients(first: 1) { totalCount } }`,
  );

  // ---- Scheduled items (visits) ----
  // Jobber's ScheduledItemsFilterAttributes requires `occursWithin` as a
  // `DateRange!`. Constraints we've discovered the hard way:
  //   - Range must be < 1.5 years total (or Jobber rejects with error)
  //   - Symmetric past/future ranges have returned 0 visits in testing
  //     (unclear why — maybe Jobber's filter prefers future-leaning)
  // Sticking with the asymmetric -30 / +90 day window that originally
  // worked + populated the calendar with real visits.
  const farPast = new Date(startOfDay);
  farPast.setDate(farPast.getDate() - 30);
  const farFuture = new Date(startOfDay);
  farFuture.setDate(farFuture.getDate() + 90);

  // Visit field name is `isComplete` (boolean), NOT `completed`. Jobber's
  // schema error told us this directly:
  //   "Field 'completed' doesn't exist on type 'Visit'
  //    (Did you mean 'completedBy', 'completedAt' or 'isComplete'?)"
  const visitsPromise = jobberQuery<{
    scheduledItems: {
      totalCount?: number;
      nodes: Array<{
        id: string;
        startAt: string | null;
        endAt?: string | null;
        title: string | null;
        isComplete?: boolean | null;
        __typename?: string;
        assignedUsers?: { nodes?: Array<{ id?: string; name?: { full?: string | null } | null }> | null } | null;
        job?: {
          jobNumber?: number | string;
          client?: { name?: string | null };
          property?: {
            address?: { street1?: string | null; city?: string | null };
          };
        } | null;
      }>;
    };
  }>(
    `query UpcomingVisits($start: ISO8601DateTime!, $end: ISO8601DateTime!) {
      scheduledItems(filter: { occursWithin: { startAt: $start, endAt: $end } }, first: 50) {
        totalCount
        nodes {
          id
          startAt
          title
          __typename
          ... on Visit {
            endAt
            isComplete
            job {
              jobNumber
              client { name }
              property { address { street1 city } }
            }
          }
        }
      }
    }`,
    { start: farPast.toISOString(), end: farFuture.toISOString() },
  );

  // ---- Invoices — pull recent 100, partition client-side ----
  // Field name is `issuedDate` (NOT `issuedAt` — Jobber rejected the
  // latter with a "did you mean issuedDate" hint when surfaced via the
  // dashboard error panel). invoiceStatus comes back as a string; we
  // forgive variations like `paid` vs `PAID` via regex below.
  const invoicesPromise = jobberQuery<{
    invoices: {
      totalCount: number;
      nodes: Array<{
        id: string;
        invoiceStatus?: string | null;
        issuedDate?: string | null;
        amounts?: { total?: number | null } | null;
      }>;
    };
  }>(
    `query RecentInvoices {
      invoices(first: 100) {
        totalCount
        nodes {
          id
          invoiceStatus
          issuedDate
          amounts { total }
        }
      }
    }`,
  );

  const [clientsRes, visitsRes, invoicesRes] = await Promise.all([
    clientsPromise,
    visitsPromise,
    invoicesPromise,
  ]);

  // Collect any GraphQL errors so the UI can surface them
  const errorMessages: string[] = [];
  if (clientsRes?.errors?.length) {
    errorMessages.push(`clients: ${clientsRes.errors.map((e) => e.message).join('; ')}`);
  }
  if (visitsRes?.errors?.length) {
    errorMessages.push(`visits: ${visitsRes.errors.map((e) => e.message).join('; ')}`);
  }
  if (invoicesRes?.errors?.length) {
    errorMessages.push(`invoices: ${invoicesRes.errors.map((e) => e.message).join('; ')}`);
  }
  if ([clientsRes, visitsRes, invoicesRes].some((r) => r === null)) {
    // Pull the specific reason from the captured last-error so the UI
    // can show "invalid_grant" / "expired refresh token" / etc. rather
    // than the generic "could not obtain access token" message.
    const detail = getLastTokenError() ?? 'unknown reason';
    errorMessages.push(`token: ${detail}`);
  }

  // If Jobber rate-limited ANY of the queries, fall back to the most
  // recent successful cache snapshot instead of returning zeros. This
  // is what makes the dashboard resilient to bursty refreshes.
  const wasThrottled = errorMessages.some((m) => /throttled/i.test(m));
  if (wasThrottled) {
    const stale = responseCache.get(cacheKey)?.data as JobberMetrics | undefined;
    if (stale) {
      return {
        ...stale,
        errorDetail: 'Jobber rate-limited; showing data from the last successful fetch. Wait 30s and refresh to retry.',
      };
    }
  }

  // ---- Partition visits into today / week / upcoming ----
  const rawVisits = visitsRes?.data?.scheduledItems?.nodes ?? [];
  const futureVisits = rawVisits
    .filter((v) => v.startAt && new Date(v.startAt) >= startOfDay)
    .sort((a, b) =>
      (a.startAt ?? '').localeCompare(b.startAt ?? ''),
    );

  const jobsToday = rawVisits.filter((v) => {
    if (!v.startAt) return false;
    const d = new Date(v.startAt);
    return d >= startOfDay && d < endOfDay;
  }).length;

  const jobsThisWeek = rawVisits.filter((v) => {
    if (!v.startAt) return false;
    const d = new Date(v.startAt);
    return d >= startOfDay && d <= twoWeeksOut;
  }).length;

  // Normalize every visit into our compact JobberVisit shape. Used by
  // both the calendar view (allVisits, full list) and the compact
  // upcoming list (upcomingJobs, top 12 in the next 14 days).
  const normalize = (n: (typeof rawVisits)[number]): JobberVisit => {
    const address = n.job?.property?.address;
    const addrStr = address
      ? [address.street1, address.city].filter(Boolean).join(', ')
      : null;
    const team = (n.assignedUsers?.nodes ?? [])
      .map((u) => u?.name?.full ?? '')
      .filter(Boolean);
    return {
      id: n.id,
      title:
        n.title ??
        (n.job?.jobNumber ? `Job #${n.job.jobNumber}` : 'Cleaning Service'),
      clientName: n.job?.client?.name ?? 'Client',
      startAt: n.startAt,
      endAt: n.endAt ?? null,
      address: addrStr,
      team,
      completed: !!n.isComplete,
    };
  };

  const allVisits = futureVisits.map(normalize);
  const upcomingJobs = allVisits
    .filter((v) => v.startAt && new Date(v.startAt) <= twoWeeksOut)
    .slice(0, 12);

  // Diagnostics — surface what Jobber actually returned so we can see
  // root cause of empty calendar without guessing.
  const typenameCounts: Record<string, number> = {};
  let earliestStartAt: string | null = null;
  let latestStartAt: string | null = null;
  for (const n of rawVisits) {
    const t = n.__typename ?? 'Unknown';
    typenameCounts[t] = (typenameCounts[t] ?? 0) + 1;
    if (n.startAt) {
      if (!earliestStartAt || n.startAt < earliestStartAt) earliestStartAt = n.startAt;
      if (!latestStartAt || n.startAt > latestStartAt) latestStartAt = n.startAt;
    }
  }
  const visitDebug = {
    totalCount: visitsRes?.data?.scheduledItems?.totalCount ?? 0,
    rawNodeCount: rawVisits.length,
    typenameCounts,
    earliestStartAt,
    latestStartAt,
    futureCount: futureVisits.length,
    dateRangeRequested: { start: farPast.toISOString(), end: farFuture.toISOString() },
  };

  // ---- Partition invoices: paid this week (revenue) vs awaiting payment ----
  // Jobber's invoiceStatus string varies. Treat anything containing "paid"
  // as paid; anything containing "awaiting", "draft", "sent" without "paid"
  // as outstanding. This is forgiving across schema variants.
  const invoices = invoicesRes?.data?.invoices?.nodes ?? [];
  const isPaid = (s?: string | null) => !!s && /paid/i.test(s);
  const isOutstanding = (s?: string | null) =>
    !!s && !isPaid(s) && /(awaiting|outstanding|sent|past_due|overdue|approved)/i.test(s);

  let thisWeekRevenue = 0;
  let pendingInvoiceTotal = 0;
  let pendingInvoiceCount = 0;

  for (const inv of invoices) {
    const total = typeof inv.amounts?.total === 'number' ? inv.amounts.total : 0;
    if (isPaid(inv.invoiceStatus) && inv.issuedDate) {
      const issued = new Date(inv.issuedDate);
      if (issued >= startOfWeek && issued < endOfWeek) {
        thisWeekRevenue += total;
      }
    } else if (isOutstanding(inv.invoiceStatus)) {
      pendingInvoiceTotal += total;
      pendingInvoiceCount += 1;
    }
  }

  const result: JobberMetrics = {
    jobsToday,
    jobsThisWeek,
    upcomingJobs,
    allVisits,
    activeClientCount: clientsRes?.data?.clients?.totalCount ?? 0,
    pendingInvoiceCount,
    pendingInvoiceTotal,
    thisWeekRevenue,
    errorDetail: errorMessages.length > 0 ? errorMessages.join(' · ') : undefined,
    visitDebug,
  };

  // Only cache responses that succeeded fully — caching partial-error
  // results would mean returning stale errors for 60s if the next
  // refresh would have succeeded.
  if (!result.errorDetail) {
    setCached(cacheKey, result);
  }

  return result;
}
