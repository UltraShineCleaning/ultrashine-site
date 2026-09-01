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

/**
 * Ultra Shine operates in Florida; Vercel's servers run in UTC. Any date
 * math done with the raw server clock silently shifts by 4-5 hours, which
 * after ~8pm Eastern rolls the server into "tomorrow" while the person
 * reading the dashboard is still on today. That made the Schedule calendar
 * render the current month empty every evening.
 *
 * `businessNow()` returns a Date whose local-time fields (getFullYear,
 * getMonth, getDate, getHours...) read as America/New_York wall-clock time,
 * so all the setHours(0,0,0,0) / getDay() logic below behaves the way a
 * person in Boca Raton would expect.
 */
const BUSINESS_TZ = 'America/New_York';

function businessNow(): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  // Note: hour can come back as 24 for midnight in some ICU versions.
  const hour = get('hour') % 24;
  return new Date(
    get('year'), get('month') - 1, get('day'),
    hour, get('minute'), get('second'),
  );
}

/** Shape of the paginated scheduledItems (visits) query response. */
type VisitsQueryData = {
  scheduledItems: {
    totalCount?: number;
    pageInfo?: { hasNextPage?: boolean; endCursor?: string | null } | null;
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
        property?: { address?: { street1?: string | null; city?: string | null } };
      } | null;
    }>;
  };
};

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
  //
  // TIMEZONE: Vercel runs in UTC, but the business (and everyone reading
  // this dashboard) is in Florida. Using the server's raw local day meant
  // that every evening after 8pm EDT the server had already rolled over to
  // "tomorrow" in UTC — so the visit window started a day ahead and the
  // calendar rendered the current month empty. Anchor every date
  // calculation to America/New_York instead.
  const now = businessNow();
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
  // `DateRange!`. CRITICAL learnings from diagnostic surfacing:
  //   - Jobber returns OLDEST-FIRST within the filter window
  //   - At 339 visits in a -30/+90 window, fetching first:50 only reaches
  //     ~3 weeks into the past — all upcoming visits get cut off
  // Fix: start the window AT TODAY so Jobber's oldest-first ordering
  // returns the soonest upcoming visits. Also bump first:100 for headroom.
  // Range cap of 1.5 years still applies — 90 days is well under that.
  // Window now starts at the FIRST OF THE CURRENT MONTH, not today.
  // The Schedule tab renders a month-view calendar that opens on the
  // current month — starting the fetch at "today" meant days 1..N of the
  // month were never fetched and the calendar looked empty for anyone
  // checking mid-month. Pagination below (not a bigger `first:`) is what
  // makes the wider window safe: Jobber returns oldest-first, so without
  // paging the extra past days would push upcoming visits off the end.
  const farPast = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
  const farFuture = new Date(startOfDay);
  farFuture.setDate(farFuture.getDate() + 90);

  // Visit field name is `isComplete` (boolean), NOT `completed`. Jobber's
  // schema error told us this directly:
  //   "Field 'completed' doesn't exist on type 'Visit'
  //    (Did you mean 'completedBy', 'completedAt' or 'isComplete'?)"
  const visitsQueryText = `query UpcomingVisits($start: ISO8601DateTime!, $end: ISO8601DateTime!, $after: String) {
      scheduledItems(filter: { occursWithin: { startAt: $start, endAt: $end } }, first: 100, after: $after) {
        totalCount
        pageInfo { hasNextPage endCursor }
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
    }`;

  const visitsPromise = jobberQuery<VisitsQueryData>(
    visitsQueryText,
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

  // Page through ALL visits in the window. Jobber returns oldest-first and
  // caps a page at 100, so a single call would truncate the upcoming visits
  // now that the window reaches back to the 1st of the month. Cap at 6 pages
  // (600 visits) as a runaway guard — far more than this business schedules
  // in a ~4 month window.
  const visitsRes = await (async () => {
    const first = await visitsPromise;
    if (!first?.data?.scheduledItems?.nodes) return first;
    let cursor = first.data.scheduledItems.pageInfo?.endCursor ?? null;
    let hasNext = !!first.data.scheduledItems.pageInfo?.hasNextPage;
    let pages = 1;
    while (hasNext && cursor && pages < 6) {
      const next = await jobberQuery<VisitsQueryData>(visitsQueryText, {
        start: farPast.toISOString(),
        end: farFuture.toISOString(),
        after: cursor,
      });
      const si = next?.data?.scheduledItems;
      if (!si?.nodes?.length) break;
      first.data.scheduledItems.nodes.push(...si.nodes);
      cursor = si.pageInfo?.endCursor ?? null;
      hasNext = !!si.pageInfo?.hasNextPage;
      pages += 1;
    }
    return first;
  })();

  const [clientsRes, invoicesRes] = await Promise.all([
    clientsPromise,
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

/* ============================================================
   MONEY — invoices, payments, revenue trends
   ============================================================
   Powers the /admin Money tab. Fetches a wider invoice window than
   getJobberMetrics (which only needs pending totals for the Home
   snapshot) and joins in client names so the outstanding list is
   actionable — "who owes me, how much, how late".

   Defensive by design: Jobber's InvoiceAmounts fields vary by API
   version, so every field is optional-chained and we surface a
   `fieldDebug` blob when something comes back empty. That way a
   schema mismatch shows up as a readable message in the UI instead
   of silent zeros.
   ============================================================ */

export type JobberInvoice = {
  id: string;
  invoiceNumber: string | null;
  clientName: string;
  status: string;
  issuedDate: string | null;
  dueDate: string | null;
  total: number;
  balance: number;
  paid: number;
  /** Days past due. Negative = not yet due. null = no due date. */
  daysOverdue: number | null;
};

export type RevenueBucket = {
  /** ISO date of the bucket start (week start or month start) */
  key: string;
  /** Human label e.g. "Aug 4" or "Aug 2026" */
  label: string;
  amount: number;
  invoiceCount: number;
};

export type JobberMoney = {
  /** Unpaid invoices, most overdue first */
  outstanding: JobberInvoice[];
  outstandingTotal: number;
  /** How much of the outstanding total is actually past its due date */
  overdueTotal: number;
  overdueCount: number;

  paidThisWeek: number;
  paidLastWeek: number;
  paidThisMonth: number;
  paidLastMonth: number;
  paidThisQuarter: number;

  averageInvoice: number;
  /** Median days from issue to paid, across invoices we can measure */
  avgCollectionDays: number | null;

  /** Last 8 weeks of collected revenue, oldest first */
  weeklyRevenue: RevenueBucket[];
  /** Last 12 months of collected revenue, oldest first */
  monthlyRevenue: RevenueBucket[];

  /** Top clients by total invoiced value */
  topClients: { name: string; total: number; invoiceCount: number }[];

  invoiceCount: number;
  errorDetail?: string;
  fieldDebug?: {
    rawNodeCount: number;
    sampleKeys: string[];
    sampleAmountKeys: string[];
    statusCounts: Record<string, number>;
  };
};

const EMPTY_MONEY: JobberMoney = {
  outstanding: [], outstandingTotal: 0, overdueTotal: 0, overdueCount: 0,
  paidThisWeek: 0, paidLastWeek: 0, paidThisMonth: 0, paidLastMonth: 0,
  paidThisQuarter: 0, averageInvoice: 0, avgCollectionDays: null,
  weeklyRevenue: [], monthlyRevenue: [], topClients: [], invoiceCount: 0,
};

/** Jobber invoice statuses that mean "money already collected". */
const PAID_STATUSES = new Set(['PAID', 'paid']);
/** Statuses that mean "still owed to us". */
const UNPAID_STATUSES = new Set([
  'AWAITING_PAYMENT', 'awaiting_payment', 'PAST_DUE', 'past_due',
  'PARTIAL', 'partial', 'SENT', 'sent',
]);

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay()); // Sunday start
  return x;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export async function getJobberMoney(
  opts: { force?: boolean } = {},
): Promise<JobberMoney> {
  if (!isJobberConfigured()) {
    return { ...EMPTY_MONEY, errorDetail: 'JOBBER env vars missing (CLIENT_ID, CLIENT_SECRET, or REFRESH_TOKEN)' };
  }

  const cacheKey = 'money';
  if (!opts.force) {
    const cached = getCached<JobberMoney>(cacheKey);
    if (cached) return cached;
  }

  // Pull a wide window — 200 invoices covers well over a year for a
  // business at this volume, and lets us build 12-month trends.
  const res = await jobberQuery<{
    invoices: {
      totalCount: number;
      nodes: Array<{
        id: string;
        invoiceNumber?: string | null;
        invoiceStatus?: string | null;
        issuedDate?: string | null;
        dueDate?: string | null;
        client?: { name?: string | null } | null;
        amounts?: {
          total?: number | null;
          invoiceBalance?: number | null;
          paymentsTotal?: number | null;
        } | null;
      }>;
    };
  }>(
    `query MoneyInvoices {
      invoices(first: 200) {
        totalCount
        nodes {
          id
          invoiceNumber
          invoiceStatus
          issuedDate
          dueDate
          client { name }
          amounts { total invoiceBalance paymentsTotal }
        }
      }
    }`,
  );

  if (res?.errors?.length) {
    const msg = res.errors.map((e) => e.message).join('; ');
    // Throttled? Serve the last good snapshot rather than zeros.
    if (/throttled/i.test(msg)) {
      const stale = responseCache.get(cacheKey)?.data as JobberMoney | undefined;
      if (stale) {
        return { ...stale, errorDetail: 'Jobber rate-limited; showing last successful fetch. Wait 30s and refresh.' };
      }
    }
    return { ...EMPTY_MONEY, errorDetail: `invoices: ${msg}` };
  }

  const nodes = res?.data?.invoices?.nodes ?? [];
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

  // ---- Normalize ----
  const invoices: JobberInvoice[] = nodes.map((n) => {
    const total = Number(n.amounts?.total ?? 0);
    const balance = Number(n.amounts?.invoiceBalance ?? 0);
    const paidRaw = n.amounts?.paymentsTotal;
    // paymentsTotal isn't present on every API version — derive it.
    const paid = paidRaw != null ? Number(paidRaw) : Math.max(0, total - balance);
    const due = n.dueDate ? new Date(n.dueDate) : null;
    return {
      id: n.id,
      invoiceNumber: n.invoiceNumber ?? null,
      clientName: n.client?.name ?? 'Client',
      status: n.invoiceStatus ?? 'UNKNOWN',
      issuedDate: n.issuedDate ?? null,
      dueDate: n.dueDate ?? null,
      total, balance, paid,
      daysOverdue: due ? daysBetween(todayStart, due) : null,
    };
  });

  const isPaid = (i: JobberInvoice) =>
    PAID_STATUSES.has(i.status) || (i.total > 0 && i.balance <= 0.005);
  const isOwed = (i: JobberInvoice) =>
    !isPaid(i) && (i.balance > 0.005 || UNPAID_STATUSES.has(i.status));

  // ---- Outstanding ----
  const outstanding = invoices
    .filter(isOwed)
    .sort((a, b) => (b.daysOverdue ?? -9999) - (a.daysOverdue ?? -9999));
  const outstandingTotal = outstanding.reduce((s, i) => s + i.balance, 0);
  const overdue = outstanding.filter((i) => (i.daysOverdue ?? -1) > 0);
  const overdueTotal = overdue.reduce((s, i) => s + i.balance, 0);

  // ---- Collected revenue by period ----
  // Attribute collected money to the invoice's issued date. Jobber
  // doesn't expose a per-payment date on this query, so issuedDate is
  // the best available proxy and is stable for trend purposes.
  const paidInvoices = invoices.filter((i) => i.paid > 0 && i.issuedDate);
  const sumPaidBetween = (from: Date, to: Date) =>
    paidInvoices.reduce((s, i) => {
      const d = new Date(i.issuedDate as string);
      return d >= from && d < to ? s + i.paid : s;
    }, 0);

  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const nextWeekStart = new Date(thisWeekStart); nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  // ---- 8-week trend ----
  const weeklyRevenue: RevenueBucket[] = [];
  for (let w = 7; w >= 0; w--) {
    const from = new Date(thisWeekStart); from.setDate(from.getDate() - w * 7);
    const to = new Date(from); to.setDate(to.getDate() + 7);
    const bucket = paidInvoices.filter((i) => {
      const d = new Date(i.issuedDate as string);
      return d >= from && d < to;
    });
    weeklyRevenue.push({
      key: from.toISOString().slice(0, 10),
      label: from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount: bucket.reduce((s, i) => s + i.paid, 0),
      invoiceCount: bucket.length,
    });
  }

  // ---- 12-month trend ----
  const monthlyRevenue: RevenueBucket[] = [];
  for (let m = 11; m >= 0; m--) {
    const from = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const to = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
    const bucket = paidInvoices.filter((i) => {
      const d = new Date(i.issuedDate as string);
      return d >= from && d < to;
    });
    monthlyRevenue.push({
      key: from.toISOString().slice(0, 7),
      label: from.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      amount: bucket.reduce((s, i) => s + i.paid, 0),
      invoiceCount: bucket.length,
    });
  }

  // ---- Top clients by invoiced value ----
  const byClient = new Map<string, { total: number; invoiceCount: number }>();
  for (const i of invoices) {
    if (i.total <= 0) continue;
    const cur = byClient.get(i.clientName) ?? { total: 0, invoiceCount: 0 };
    cur.total += i.total; cur.invoiceCount += 1;
    byClient.set(i.clientName, cur);
  }
  const topClients = Array.from(byClient.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const withTotals = invoices.filter((i) => i.total > 0);
  const averageInvoice = withTotals.length
    ? withTotals.reduce((s, i) => s + i.total, 0) / withTotals.length
    : 0;

  // ---- Diagnostics (mirrors visitDebug pattern) ----
  const statusCounts: Record<string, number> = {};
  for (const i of invoices) statusCounts[i.status] = (statusCounts[i.status] ?? 0) + 1;

  const result: JobberMoney = {
    outstanding: outstanding.slice(0, 50),
    outstandingTotal,
    overdueTotal,
    overdueCount: overdue.length,
    paidThisWeek: sumPaidBetween(thisWeekStart, nextWeekStart),
    paidLastWeek: sumPaidBetween(lastWeekStart, thisWeekStart),
    paidThisMonth: sumPaidBetween(thisMonthStart, new Date(now.getFullYear(), now.getMonth() + 1, 1)),
    paidLastMonth: sumPaidBetween(lastMonthStart, thisMonthStart),
    paidThisQuarter: sumPaidBetween(quarterStart, new Date(now.getFullYear(), now.getMonth() + 1, 1)),
    averageInvoice,
    avgCollectionDays: null,
    weeklyRevenue,
    monthlyRevenue,
    topClients,
    invoiceCount: res?.data?.invoices?.totalCount ?? invoices.length,
    fieldDebug: {
      rawNodeCount: nodes.length,
      sampleKeys: nodes[0] ? Object.keys(nodes[0]) : [],
      sampleAmountKeys: nodes[0]?.amounts ? Object.keys(nodes[0].amounts) : [],
      statusCounts,
    },
  };

  setCached(cacheKey, result);
  return result;
}
