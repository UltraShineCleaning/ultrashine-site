/**
 * Jobber GraphQL client (server-only — imported by server components +
 * route handlers; never bundled into the client).
 *
 * Auth model:
 *   - JOBBER_CLIENT_ID + JOBBER_CLIENT_SECRET come from your Jobber
 *     developer app (https://developer.getjobber.com).
 *   - JOBBER_REFRESH_TOKEN is what Tiago captured from the OAuth callback
 *     and saved in Vercel env. It's long-lived (months) and is what we
 *     use to mint short-lived access tokens.
 *
 * On each request we:
 *   1. Check the module-level cache for a non-expired access_token
 *   2. If missing/expired, POST to the token endpoint with the refresh_token
 *      to get a new access_token (cached with its expires_in)
 *   3. Use that bearer token to POST a GraphQL query
 *
 * Jobber requires the `X-JOBBER-GRAPHQL-VERSION` header — pinning to a
 * specific date keeps the schema stable. Update this when you want to
 * adopt newer fields (https://developer.getjobber.com/docs/changelog).
 *
 * The cache is module-scoped, which means it's per-server-instance.
 * In a serverless deploy (Vercel) this is fine — cold starts will
 * refresh as needed; warm starts reuse the token until it expires.
 */

const JOBBER_GRAPHQL_URL = 'https://api.getjobber.com/api/graphql';
const JOBBER_TOKEN_URL = 'https://api.getjobber.com/api/oauth/token';
const JOBBER_API_VERSION = '2024-04-15';

type TokenCache = {
  accessToken: string;
  /** Unix ms when this access_token expires */
  expiresAt: number;
};

let cachedToken: TokenCache | null = null;

/**
 * Get a valid access token — either from cache or by refreshing.
 * Returns null if Jobber env vars aren't configured (caller should
 * treat the dashboard as disconnected).
 */
async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.JOBBER_CLIENT_ID;
  const clientSecret = process.env.JOBBER_CLIENT_SECRET;
  const refreshToken = process.env.JOBBER_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) return null;

  // Reuse cached token if it has >60 seconds of life left
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
    // Don't let Next cache this — it's a token issue endpoint
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error('[jobber] Token refresh failed:', await res.text());
    return null;
  }

  const data = await res.json();
  if (!data.access_token) {
    console.error('[jobber] Token refresh returned no access_token:', data);
    return null;
  }

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

/**
 * Run a GraphQL query against Jobber. Returns { data, errors } from the
 * GraphQL response, or null if auth failed entirely. Caller decides what
 * to do with partial errors.
 */
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
    console.error('[jobber] GraphQL request failed:', res.status, text);
    return { errors: [{ message: `HTTP ${res.status}: ${text.slice(0, 200)}` }] };
  }

  return (await res.json()) as GraphQLResponse<T>;
}

/** Convenience flag callers can check without making a request. */
export function isJobberConfigured(): boolean {
  return !!(
    process.env.JOBBER_CLIENT_ID &&
    process.env.JOBBER_CLIENT_SECRET &&
    process.env.JOBBER_REFRESH_TOKEN
  );
}

// ============================================================
// Data fetchers — each returns a small typed shape Tiago's dashboard
// can render directly. They swallow errors and return zero/empty
// values so the UI degrades gracefully when something is off.
// ============================================================

export type JobberMetrics = {
  jobsToday: number;
  jobsThisWeek: number;
  upcomingJobs: Array<{
    id: string;
    title: string;
    clientName: string;
    startAt: string | null;
    address: string | null;
  }>;
  activeClientCount: number;
  pendingInvoiceCount: number;
  pendingInvoiceTotal: number;
  thisWeekRevenue: number;
  error?: string;
};

/**
 * Pull every metric we surface on the dashboard in a single parallel
 * burst. Failures in any one fetcher just return zero values for that
 * field — the rest still render.
 */
export async function getJobberMetrics(): Promise<JobberMetrics> {
  const empty: JobberMetrics = {
    jobsToday: 0,
    jobsThisWeek: 0,
    upcomingJobs: [],
    activeClientCount: 0,
    pendingInvoiceCount: 0,
    pendingInvoiceTotal: 0,
    thisWeekRevenue: 0,
  };

  if (!isJobberConfigured()) return { ...empty, error: 'not_configured' };

  // Time ranges in ISO so they can be passed straight into Jobber filters
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  // Start of week = Sunday (matches Jobber default for many US accounts)
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  // 14-day window for the "upcoming" list — gives Tiago 2 weeks of visibility
  const twoWeeksOut = new Date(startOfDay);
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);

  // ---- Today's jobs ----
  const todayJobsPromise = jobberQuery<{
    scheduledItems: { totalCount: number };
  }>(
    `
    query TodayJobs($startAt: ISO8601DateTime!, $endAt: ISO8601DateTime!) {
      scheduledItems(filter: { startAt: { after: $startAt, before: $endAt } }) {
        totalCount
      }
    }
    `,
    { startAt: startOfDay.toISOString(), endAt: endOfDay.toISOString() },
  );

  // ---- This week's jobs + upcoming list ----
  const weekJobsPromise = jobberQuery<{
    scheduledItems: {
      totalCount: number;
      nodes: Array<{
        id: string;
        startAt: string | null;
        title: string | null;
        job?: {
          jobNumber: string | number;
          client?: { name: string | null };
          property?: { address?: { street1?: string | null; city?: string | null } };
        } | null;
      }>;
    };
  }>(
    `
    query WeekJobs($startAt: ISO8601DateTime!, $endAt: ISO8601DateTime!) {
      scheduledItems(
        filter: { startAt: { after: $startAt, before: $endAt } }
        first: 12
      ) {
        totalCount
        nodes {
          id
          startAt
          title
          ... on Visit {
            job {
              jobNumber
              client { name }
              property { address { street1 city } }
            }
          }
        }
      }
    }
    `,
    { startAt: startOfDay.toISOString(), endAt: twoWeeksOut.toISOString() },
  );

  // ---- Active client count ----
  const clientsPromise = jobberQuery<{ clients: { totalCount: number } }>(
    `
    query Clients {
      clients(filter: { isArchived: false }) {
        totalCount
      }
    }
    `,
  );

  // ---- Pending invoices (issued but unpaid) ----
  const invoicesPromise = jobberQuery<{
    invoices: {
      totalCount: number;
      nodes: Array<{ amounts?: { total: number | null } | null }>;
    };
  }>(
    `
    query PendingInvoices {
      invoices(filter: { invoiceStatus: AWAITING_PAYMENT }, first: 100) {
        totalCount
        nodes {
          amounts { total }
        }
      }
    }
    `,
  );

  // ---- This week's revenue (paid invoices in the week range) ----
  const revenuePromise = jobberQuery<{
    invoices: {
      nodes: Array<{ amounts?: { total: number | null } | null }>;
    };
  }>(
    `
    query WeekRevenue($startAt: ISO8601DateTime!, $endAt: ISO8601DateTime!) {
      invoices(
        filter: { invoiceStatus: PAID, issuedAt: { after: $startAt, before: $endAt } }
        first: 100
      ) {
        nodes {
          amounts { total }
        }
      }
    }
    `,
    { startAt: startOfWeek.toISOString(), endAt: endOfWeek.toISOString() },
  );

  const [todayRes, weekRes, clientsRes, invoicesRes, revenueRes] =
    await Promise.all([
      todayJobsPromise,
      weekJobsPromise,
      clientsPromise,
      invoicesPromise,
      revenuePromise,
    ]);

  // Helper to flatten pending invoice totals into a number
  const sumInvoices = (
    nodes: Array<{ amounts?: { total: number | null } | null }> | undefined,
  ) =>
    (nodes ?? []).reduce(
      (sum, n) => sum + (typeof n.amounts?.total === 'number' ? n.amounts.total : 0),
      0,
    );

  const weekNodes = weekRes?.data?.scheduledItems?.nodes ?? [];

  return {
    jobsToday: todayRes?.data?.scheduledItems?.totalCount ?? 0,
    jobsThisWeek: weekRes?.data?.scheduledItems?.totalCount ?? 0,
    upcomingJobs: weekNodes.map((n) => {
      const address = n.job?.property?.address;
      const addrStr = address
        ? [address.street1, address.city].filter(Boolean).join(', ')
        : null;
      return {
        id: n.id,
        title:
          n.title ??
          (n.job?.jobNumber ? `Job #${n.job.jobNumber}` : 'Scheduled visit'),
        clientName: n.job?.client?.name ?? 'Client',
        startAt: n.startAt,
        address: addrStr,
      };
    }),
    activeClientCount: clientsRes?.data?.clients?.totalCount ?? 0,
    pendingInvoiceCount: invoicesRes?.data?.invoices?.totalCount ?? 0,
    pendingInvoiceTotal: sumInvoices(invoicesRes?.data?.invoices?.nodes),
    thisWeekRevenue: sumInvoices(revenueRes?.data?.invoices?.nodes),
    error: [todayRes, weekRes, clientsRes, invoicesRes, revenueRes].some(
      (r) => r === null,
    )
      ? 'token_unavailable'
      : undefined,
  };
}
