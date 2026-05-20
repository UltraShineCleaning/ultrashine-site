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

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.JOBBER_CLIENT_ID;
  const clientSecret = process.env.JOBBER_CLIENT_SECRET;
  const refreshToken = process.env.JOBBER_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) return null;

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
  title: string;
  clientName: string;
  startAt: string | null;
  address: string | null;
};

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
export async function getJobberMetrics(): Promise<JobberMetrics> {
  if (!isJobberConfigured()) {
    return { ...empty, errorDetail: 'JOBBER env vars missing (CLIENT_ID, CLIENT_SECRET, or REFRESH_TOKEN)' };
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

  // ---- Scheduled items (visits) — fetch a bigger batch (100) so the
  // calendar view has enough data to populate a full month. We don't
  // filter server-side by date because the filter input shape varies by
  // schema version — instead we pull and partition client-side.
  const visitsPromise = jobberQuery<{
    scheduledItems: {
      nodes: Array<{
        id: string;
        startAt: string | null;
        title: string | null;
        __typename?: string;
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
    `query UpcomingVisits {
      scheduledItems(first: 100) {
        nodes {
          id
          startAt
          title
          __typename
          ... on Visit {
            job {
              jobNumber
              client { name }
              property { address { street1 city } }
            }
          }
        }
      }
    }`,
  );

  // ---- Invoices — pull recent 100, partition client-side ----
  // Don't trust enum names like `AWAITING_PAYMENT` or `PAID` — those
  // names vary by schema version. We fetch the `invoiceStatus` field
  // as a string + the amount, then categorize in JS below.
  const invoicesPromise = jobberQuery<{
    invoices: {
      totalCount: number;
      nodes: Array<{
        id: string;
        invoiceStatus?: string | null;
        issuedAt?: string | null;
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
          issuedAt
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
    errorMessages.push('token: access token could not be obtained (check refresh token)');
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
    return {
      id: n.id,
      title:
        n.title ??
        (n.job?.jobNumber ? `Job #${n.job.jobNumber}` : 'Scheduled visit'),
      clientName: n.job?.client?.name ?? 'Client',
      startAt: n.startAt,
      address: addrStr,
    };
  };

  const allVisits = futureVisits.map(normalize);
  const upcomingJobs = allVisits
    .filter((v) => v.startAt && new Date(v.startAt) <= twoWeeksOut)
    .slice(0, 12);

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
    if (isPaid(inv.invoiceStatus) && inv.issuedAt) {
      const issued = new Date(inv.issuedAt);
      if (issued >= startOfWeek && issued < endOfWeek) {
        thisWeekRevenue += total;
      }
    } else if (isOutstanding(inv.invoiceStatus)) {
      pendingInvoiceTotal += total;
      pendingInvoiceCount += 1;
    }
  }

  return {
    jobsToday,
    jobsThisWeek,
    upcomingJobs,
    allVisits,
    activeClientCount: clientsRes?.data?.clients?.totalCount ?? 0,
    pendingInvoiceCount,
    pendingInvoiceTotal,
    thisWeekRevenue,
    errorDetail: errorMessages.length > 0 ? errorMessages.join(' · ') : undefined,
  };
}
