import { getJSON, setJSON } from '../kv';
import { getJobberClients, getJobberMetrics, getJobberMoney, jobberQuery, type JobberClient, type JobberMetrics, type JobberMoney } from '../jobberClient';
import { listLeads } from '../leads/store';
import type { LeadRecord } from '../leads/types';
import { alreadyReviewed, listReviewRequests } from '../reviewRequests';
import type { ReviewRequest } from '../social/types';
import { cadenceOf, digitsOf, jobberClientUrl, visitsPerYear, type ClientProfile, type ClientsPayload, type HomeDetails } from './types';

/**
 * Admin → Clients. One profile per Jobber client, joined from:
 *   Jobber clients   — name, contact, address, "client since"
 *   Jobber jobs      — how often (recurrence) + price per visit
 *   Jobber invoices  — paid in the last 12 months, what's owed, last invoice
 *   Jobber visits    — next visit
 *   our quote leads  — home size they typed on the website (matched by email / phone)
 *   our own notes    — home details the owner fills in here (bed / bath / sqft / pets / notes)
 */

export type JobLite = {
  id: string;
  title: string;
  type: 'RECURRING' | 'ONE_OFF' | string;
  status: string;
  total: number | null;
  clientId: string;
  createdAt: string | null;
  recurrence: string | null;
  lineItems: { name: string; unitPrice: number | null }[];
};

const JOBS_FULL = `query ClientJobs($after: String) {
  jobs(first: 100, after: $after) {
    nodes {
      id title jobType jobStatus total createdAt
      client { id }
      visitSchedule { recurrenceSchedule { friendly } }
      lineItems(first: 3) { nodes { name unitPrice } }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

// Same question without the recurrence block, in case Jobber's API version
// doesn't expose it — frequency then comes from the job / line-item names.
const JOBS_BASIC = `query ClientJobsBasic($after: String) {
  jobs(first: 100, after: $after) {
    nodes {
      id title jobType jobStatus total createdAt
      client { id }
      lineItems(first: 3) { nodes { name unitPrice } }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

type JobsResp = {
  jobs: {
    nodes: Array<{
      id: string;
      title?: string | null;
      jobType?: string | null;
      jobStatus?: string | null;
      total?: number | null;
      createdAt?: string | null;
      client?: { id: string } | null;
      visitSchedule?: { recurrenceSchedule?: { friendly?: string | null } | null } | null;
      lineItems?: { nodes?: Array<{ name?: string | null; unitPrice?: number | null }> | null } | null;
    }>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
};

export async function fetchJobs(): Promise<{ jobs: JobLite[]; error?: string }> {
  const run = async (query: string) => {
    const out: JobLite[] = [];
    let after: string | null = null;
    for (let page = 0; page < 5; page++) {
      const res: { data?: JobsResp; errors?: { message: string }[] } | null = await jobberQuery<JobsResp>(query, { after });
      if (!res) return { jobs: out, error: 'No Jobber access (token issue)' };
      if (res.errors?.length) return { jobs: out, error: res.errors.map((e) => e.message).join(' · ') };
      for (const n of res.data?.jobs?.nodes ?? []) {
        if (!n.client?.id) continue;
        out.push({
          id: n.id,
          title: n.title ?? '',
          type: n.jobType ?? '',
          status: n.jobStatus ?? '',
          total: typeof n.total === 'number' ? n.total : null,
          clientId: n.client.id,
          createdAt: n.createdAt ?? null,
          recurrence: n.visitSchedule?.recurrenceSchedule?.friendly ?? null,
          lineItems: (n.lineItems?.nodes ?? []).map((l) => ({ name: l.name ?? '', unitPrice: typeof l.unitPrice === 'number' ? l.unitPrice : null })),
        });
      }
      const pi: { hasNextPage: boolean; endCursor: string | null } | undefined = res.data?.jobs?.pageInfo;
      if (!pi?.hasNextPage || !pi.endCursor) break;
      after = pi.endCursor;
    }
    return { jobs: out };
  };
  const full = await run(JOBS_FULL);
  if (full.error && /visitSchedule|recurrenceSchedule|doesn't exist|not exist/i.test(full.error)) return run(JOBS_BASIC);
  return full;
}

const HOME_KEY = (id: string) => `client:home:${id}`;

export async function saveHomeDetails(clientId: string, h: HomeDetails): Promise<HomeDetails> {
  const num = (v: unknown, max: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 && n <= max ? Math.round(n * 2) / 2 : null;
  };
  const clean: HomeDetails = {
    bedrooms: num(h.bedrooms, 20),
    bathrooms: num(h.bathrooms, 20),
    sqft: num(h.sqft, 30000),
    pets: typeof h.pets === 'string' ? h.pets.slice(0, 120) : null,
    notes: typeof h.notes === 'string' ? h.notes.slice(0, 1000) : null,
  };
  await setJSON(HOME_KEY(clientId), clean);
  return clean;
}

export type ProfileDeps = {
  clients: () => Promise<{ clients: JobberClient[]; error?: string }>;
  jobs: () => Promise<{ jobs: JobLite[]; error?: string }>;
  money: () => Promise<JobberMoney>;
  metrics: () => Promise<JobberMetrics>;
  leads: () => Promise<LeadRecord[]>;
  reviewRequests: () => Promise<ReviewRequest[]>;
  homes: (ids: string[]) => Promise<Record<string, HomeDetails | null>>;
};

export const realProfileDeps = (force = false): ProfileDeps => ({
  clients: () => getJobberClients({ force }),
  jobs: async () => {
    // Jobs change slowly and Jobber rate-limits — keep them 10 minutes.
    if (!force) {
      const hit = await getJSON<{ jobs: JobLite[] }>('clients:jobs:cache');
      if (hit) return hit;
    }
    const r = await fetchJobs();
    if (!r.error) await setJSON('clients:jobs:cache', { jobs: r.jobs }, 600);
    return r;
  },
  money: () => getJobberMoney({ force }),
  metrics: () => getJobberMetrics({ force }),
  leads: () => listLeads(300),
  reviewRequests: () => listReviewRequests(300),
  homes: async (ids) => {
    const out: Record<string, HomeDetails | null> = {};
    await Promise.all(ids.map(async (id) => (out[id] = await getJSON<HomeDetails>(HOME_KEY(id)))));
    return out;
  },
});

const norm = (s?: string | null) => (s ?? '').toLowerCase().replace(/[^a-z]/g, '');

/** The job that best describes the client now: an active recurring one, else their newest. */
function mainJob(jobs: JobLite[]): JobLite | null {
  const live = (j: JobLite) => !/archived|cancel/i.test(j.status);
  const rec = jobs.filter((j) => j.type === 'RECURRING' && live(j));
  const pick = (rec.length ? rec : jobs).slice().sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  return pick[0] ?? null;
}

export async function buildClients(deps: ProfileDeps, now = Date.now()): Promise<ClientsPayload> {
  const safe = <T,>(p: Promise<T>, fb: T) => p.catch(() => fb);
  const [cl, jb, money, metrics, leads, reqs] = await Promise.all([
    safe(deps.clients(), { clients: [] as JobberClient[], error: 'Could not reach Jobber' }),
    safe(deps.jobs(), { jobs: [] as JobLite[], error: 'Could not load jobs' }),
    safe(deps.money(), null as JobberMoney | null),
    safe(deps.metrics(), null as JobberMetrics | null),
    safe(deps.leads(), [] as LeadRecord[]),
    safe(deps.reviewRequests(), [] as ReviewRequest[]),
  ]);
  const homes = await safe(deps.homes(cl.clients.map((c) => c.id)), {} as Record<string, HomeDetails | null>);

  const jobsBy = new Map<string, JobLite[]>();
  for (const j of jb.jobs) jobsBy.set(j.clientId, [...(jobsBy.get(j.clientId) ?? []), j]);

  const yearAgo = now - 365 * 86_400_000;
  const invBy = new Map<string, NonNullable<JobberMoney['invoiceLite']>>();
  for (const i of money?.invoiceLite ?? []) invBy.set(norm(i.client), [...(invBy.get(norm(i.client)) ?? []), i]);
  const lateBy = new Map<string, number>();
  for (const o of money?.outstanding ?? []) if ((o.daysOverdue ?? 0) > 0) lateBy.set(norm(o.clientName), Math.max(lateBy.get(norm(o.clientName)) ?? 0, o.daysOverdue ?? 0));

  const nextBy = new Map<string, number>();
  for (const v of metrics?.allVisits ?? []) {
    if (!v.startAt || v.completed) continue;
    const t = Date.parse(v.startAt);
    if (t < now - 3 * 3600_000) continue;
    const k = norm(v.clientName);
    if (!nextBy.has(k) || t < nextBy.get(k)!) nextBy.set(k, t);
  }

  const quoteLeads = leads.filter((l) => l.kind === 'quote');
  const reqBy = new Map<string, ReviewRequest>();
  for (const r of reqs) if (r.status === 'sent' && (!reqBy.has(r.clientId) || (r.sentAt ?? 0) > (reqBy.get(r.clientId)!.sentAt ?? 0))) reqBy.set(r.clientId, r);

  const profiles: ClientProfile[] = cl.clients.map((c) => {
    const jobs = jobsBy.get(c.id) ?? [];
    const job = mainJob(jobs);
    const cadence = cadenceOf(job?.recurrence ?? null, [job?.title ?? '', ...(job?.lineItems.map((l) => l.name) ?? [])].join(' '), job?.type ?? null);
    const price = job ? (job.lineItems.length === 1 && job.lineItems[0].unitPrice ? job.lineItems[0].unitPrice : job.total) : null;
    const inv = invBy.get(norm(c.name)) ?? [];
    const inYear = inv.filter((i) => i.issued && Date.parse(i.issued) >= yearAgo);
    const lastInvoice = inv.map((i) => (i.issued ? Date.parse(i.issued) : 0)).reduce((a, b) => Math.max(a, b), 0) || null;
    const owed = inv.reduce((a, i) => a + (i.balance > 0 ? i.balance : 0), 0);
    // Home size: the owner's own notes first, then what they typed on our quote form.
    const e = (c.email ?? '').toLowerCase();
    const ph = digitsOf(c.phone);
    const lead = quoteLeads
      .filter((l) => (e && l.email?.toLowerCase() === e) || (ph.length >= 10 && digitsOf(l.phone).endsWith(ph.slice(-10))))
      .sort((a, b) => b.at - a.at)[0];
    const mine = homes[c.id] ?? null;
    const home: ClientProfile['home'] = {
      bedrooms: mine?.bedrooms ?? lead?.bedrooms ?? null,
      bathrooms: mine?.bathrooms ?? lead?.bathrooms ?? null,
      sqft: mine?.sqft ?? lead?.sqft ?? null,
      pets: mine?.pets ?? null,
      notes: mine?.notes ?? null,
      source: mine && (mine.bedrooms || mine.bathrooms || mine.sqft) ? 'you' : lead && (lead.bedrooms || lead.sqft) ? 'quote form' : null,
    };
    // "Every 4 weeks" is 13 visits a year, not 12.
    const perYear = cadence.recurring && price ? price * (cadence.label === 'Every 4 weeks' ? 13 : visitsPerYear(cadence.key)) : null;
    const req = reqBy.get(c.id);
    return {
      id: c.id,
      name: c.name,
      company: c.companyName,
      isCompany: c.isCompany,
      email: c.email,
      phone: c.phone,
      address: c.address,
      city: c.city,
      since: c.createdAt ? Date.parse(c.createdAt) : null,
      cadence: cadence.key,
      cadenceLabel: cadence.label,
      recurring: cadence.recurring,
      service: job?.lineItems[0]?.name || job?.title || null,
      pricePerVisit: price,
      perYear,
      nextVisit: nextBy.get(norm(c.name)) ?? null,
      lastInvoice,
      paid12m: inYear.reduce((a, i) => a + i.paid, 0),
      invoices12m: inYear.length,
      owed,
      daysLate: lateBy.get(norm(c.name)) ?? 0,
      home,
      review: alreadyReviewed(c.name) ? 'reviewed' : req ? 'asked' : null,
      reviewAskedAt: req?.sentAt ?? null,
      jobberUrl: jobberClientUrl(c.id),
    };
  });

  const recurring = profiles.filter((p) => p.recurring);
  const monthly = recurring.reduce((a, p) => a + (p.perYear ?? 0) / 12, 0);
  const counts = { weekly: 0, biweekly: 0, every3: 0, monthly: 0 } as Record<string, number>;
  for (const p of recurring) counts[p.cadence] = (counts[p.cadence] ?? 0) + 1;
  const cities = new Map<string, number>();
  for (const p of profiles) if (p.city) cities.set(p.city, (cities.get(p.city) ?? 0) + 1);
  const owing = profiles.filter((p) => p.owed > 0);

  return {
    at: now,
    clients: profiles,
    stats: {
      active: profiles.length,
      homes: profiles.filter((p) => !p.isCompany).length,
      companies: profiles.filter((p) => p.isCompany).length,
      recurring: recurring.length,
      cadenceCounts: { weekly: counts.weekly ?? 0, biweekly: counts.biweekly ?? 0, every3: counts.every3 ?? 0, monthly: counts.monthly ?? 0 },
      recurringMonthly: Math.round(monthly),
      owingCount: owing.length,
      owingTotal: owing.reduce((a, p) => a + p.owed, 0),
      cities: Array.from(cities.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([city, n]) => ({ city, n })),
    },
    errors: [cl.error, jb.error].filter(Boolean) as string[],
  };
}
