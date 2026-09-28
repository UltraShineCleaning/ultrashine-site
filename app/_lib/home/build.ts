import { Resend } from 'resend';
import { getJSON, setJSON } from '../kv';
import { getJobberMetrics, getJobberMoney, isJobberConfigured, type JobberMetrics, type JobberMoney } from '../jobberClient';
import { COUNT as REVIEW_COUNT, RATING } from '../google-reviews';
import { alreadyReviewed, listReviewRequests } from '../reviewRequests';
import { customerFromAddress } from '../reviewEmail';
import { getInsights, type InsightsSnapshot } from '../social/insights';
import { getMeta, getSettings, listConvs, listPosts } from '../social/store';
import { qstashConfigured } from '../social/qstash';
import { etDayKey, etParts, etToMs } from '../social/time';
import type { AutomationSettings, Conversation, MetaConnection, ReviewRequest, SocialPost } from '../social/types';
import { backfillFromResend, listQuotes, type QuoteLog } from '../insights/quotes';
import { etMidnight, windowFor } from '../insights/range';
import { fetchDay, referrerLabel, vercelConfigured, vercelFromHistory, type VDay, type VercelData } from '../insights/vercel';
import { parseLeadEmail, type Lead } from './leads';

/**
 * Admin → Home. Design locked 2026-09-28 (00_STATE/design-home-dark.html).
 *
 * One answer to "what do I need to know right now": what needs a person, today's
 * jobs, four numbers, the latest leads, and a small summary of social, reviews,
 * the website and the automations. Every source is optional — a source that
 * isn't connected leaves its card empty instead of breaking the page.
 */

const DAY = 86_400_000;

export type Tone = 'r' | 'a' | 'b' | 'g' | 'v' | 'ig';
export type HomeNeed = { id: string; tone: Tone; icon: string; title: string; detail: string; action: string; tab: string };
export type HomeJob = { id: string; time: string; title: string; client: string; city: string | null; team: string[]; state: 'done' | 'now' | 'next' };
export type LeadSource = 'web' | 'ig' | 'fb' | 'job';
export type HomeLead = { id: string; name: string; detail: string; source: LeadSource; at: number; isNew: boolean };

export type HomePayload = {
  at: number;
  greeting: string;
  dateLabel: string;
  needs: HomeNeed[];
  today: { jobs: HomeJob[]; tomorrowCount: number; tomorrowFirst: string | null } | null;
  kpi: {
    collected: { value: number; prev: number; spark: number[] } | null;
    owed: { total: number; late: number; open: number } | null;
    leads: { value: number; prev: number; web: number; social: number; spark: number[] };
    jobs: { value: number; clients: number; spark: number[] } | null;
  };
  leads: HomeLead[];
  social: {
    connected: boolean;
    igUsername: string | null;
    nextPost: { at: number; kind: string; caption: string; platforms: string[]; approved: boolean; thumb: string | null } | null;
    followers: number | null;
    followersDelta: number | null;
    reach7: number | null;
    unread: number;
  };
  reviews: { rating: number; count: number; newThisMonth: number | null; sent30: number; reviewed30: number; pending: number };
  web: { visitors: number; avg7: number | null; quoteOpens: number; quotesSent: number; topSource: { label: string; pct: number } | null; spark: number[] } | null;
  autos: { reviewRequests: { on: boolean; note: string }; autopost: { on: boolean; note: string }; dms: { on: boolean; note: string } };
  counts: { money: number; leads: number; social: number; reviews: number };
};

/** Everything Home reads, injectable so the logic can be tested without the network. */
export type HomeDeps = {
  metrics: (() => Promise<JobberMetrics>) | null;
  money: (() => Promise<JobberMoney>) | null;
  leads: () => Promise<Lead[]>;
  quotes: (from: number, to: number) => Promise<QuoteLog[]>;
  convs: () => Promise<Conversation[]>;
  posts: (from: number, to: number) => Promise<SocialPost[]>;
  meta: () => Promise<MetaConnection | null>;
  igInsights: () => Promise<InsightsSnapshot | null>;
  settings: () => Promise<AutomationSettings>;
  reviewRequests: () => Promise<ReviewRequest[]>;
  reviewCounts: () => Promise<Record<string, number> | null>;
  web: ((start: number, end: number, prevStart: number) => Promise<{ range: VercelData; today: VDay }>) | null;
  canEmailCustomers: boolean;
  canSchedule: boolean;
};

async function cached<T>(key: string, force: boolean, fn: () => Promise<T>, ttl = 1800): Promise<T> {
  if (!force) {
    const hit = await getJSON<T>(key);
    if (hit) return hit;
  }
  const v = await fn();
  await setJSON(key, v, ttl);
  return v;
}

async function resendLeads(): Promise<Lead[]> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return [];
  try {
    const res: any = await new Resend(apiKey).emails.list({ limit: 100 });
    const rows: any[] = res?.data?.data ?? res?.data ?? [];
    return rows.map(parseLeadEmail).filter((l) => l.kind !== 'other');
  } catch {
    return [];
  }
}

export async function realHomeDeps(force = false): Promise<HomeDeps> {
  return {
    metrics: isJobberConfigured() ? () => getJobberMetrics({ force }) : null,
    money: isJobberConfigured() ? () => getJobberMoney({ force }) : null,
    leads: () => cached('home:cache:leads', force, resendLeads, 120),
    quotes: async (from, to) => {
      await backfillFromResend();
      return listQuotes(from, to);
    },
    convs: () => listConvs(200),
    posts: listPosts,
    meta: getMeta,
    igInsights: getInsights,
    settings: getSettings,
    reviewRequests: () => listReviewRequests(200),
    reviewCounts: () => getJSON<Record<string, number>>('insights:reviewCounts'),
    web: vercelConfigured()
      ? async (start, end, prevStart) => {
          // Same 30-minute cache the Insights tab uses for today's numbers.
          const now = Date.now();
          const tStart = etMidnight(now);
          const tEnd = windowFor(7, now).end;
          const today = await cached('insights:cache:vercel:today', force, () => fetchDay(tStart, tEnd));
          const range = await vercelFromHistory(start, end, prevStart, async () => today);
          return { range, today };
        }
      : null,
    canEmailCustomers: !!customerFromAddress() && !!process.env.RESEND_API_KEY,
    canSchedule: qstashConfigured(),
  };
}

/* ------------------------------------------------------------------ helpers */

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.round(n));

/** "9:00a" / "1:30p" in Florida time. */
export function shortTime(ms: number): string {
  const p = etParts(ms);
  const h = p.h % 12 === 0 ? 12 : p.h % 12;
  return `${h}:${String(p.min).padStart(2, '0')}${p.h < 12 ? 'a' : 'p'}`;
}

/** "1h ago", "3d ago", then "Sep 12". */
export function ago(ms: number, now: number): string {
  const d = Math.max(0, now - ms);
  if (d < 60_000) return 'just now';
  if (d < 3600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < DAY) return `${Math.floor(d / 3600_000)}h ago`;
  if (d < 7 * DAY) return WD[etParts(ms).dow];
  const p = etParts(ms);
  return `${MON[p.m - 1]} ${p.d}`;
}

function cityOf(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Florida day buckets: [start, end) for `count` days starting at `from` (a midnight). */
function dayBuckets(from: number, count: number): [number, number][] {
  const out: [number, number][] = [];
  let s = from;
  for (let i = 0; i < count; i++) {
    const e = etMidnight(s + DAY + 3 * 3600_000);
    out.push([s, e]);
    s = e;
  }
  return out;
}

const countIn = (times: number[], [s, e]: [number, number]) => times.filter((t) => t >= s && t < e).length;

/** A DM or comment where the last word is theirs — nobody has answered yet. */
export function isUnanswered(c: Conversation, now: number): boolean {
  const last = c.messages[c.messages.length - 1];
  return !!last && last.dir === 'in' && now - last.at < 7 * DAY;
}

/* ------------------------------------------------------------------- build */

export async function buildHome(deps: HomeDeps, now = Date.now()): Promise<HomePayload> {
  const p = etParts(now);
  const todayStart = etMidnight(now);
  const tomorrowStart = etMidnight(todayStart + DAY + 3 * 3600_000);
  const week = windowFor(7, now);

  const safe = <T,>(fn: (() => Promise<T>) | null, fallback: T) => (fn ? fn().catch(() => fallback) : Promise.resolve(fallback));

  const [metrics, moneyRes, leads, quotes14, convs, posts, meta, ig, settings, reqs, reviewCounts, web] = await Promise.all([
    safe(deps.metrics, null as JobberMetrics | null),
    safe(deps.money, null as JobberMoney | null),
    safe(deps.leads, [] as Lead[]),
    safe(() => deps.quotes(week.prevStart, week.end), [] as QuoteLog[]),
    safe(deps.convs, [] as Conversation[]),
    safe(() => deps.posts(now - 30 * DAY, now + 90 * DAY), [] as SocialPost[]),
    safe(deps.meta, null as MetaConnection | null),
    safe(deps.igInsights, null as InsightsSnapshot | null),
    safe(deps.settings, null as AutomationSettings | null),
    safe(deps.reviewRequests, [] as ReviewRequest[]),
    safe(deps.reviewCounts, null as Record<string, number> | null),
    safe(deps.web ? () => deps.web!(week.start, week.end, week.prevStart) : null, null as { range: VercelData; today: VDay } | null),
  ]);

  const jobberOk = !!metrics && !metrics.errorDetail?.includes('token');
  const moneyOk = !!moneyRes && !moneyRes.errorDetail?.includes('token');

  /* ---- today's jobs ---- */
  let today: HomePayload['today'] = null;
  if (jobberOk && metrics) {
    const visits = metrics.allVisits.filter((v) => v.startAt);
    const todays = visits.filter((v) => {
      const t = Date.parse(v.startAt!);
      return t >= todayStart && t < tomorrowStart;
    });
    const tomorrowEnd = etMidnight(tomorrowStart + DAY + 3 * 3600_000);
    const tomorrow = visits.filter((v) => {
      const t = Date.parse(v.startAt!);
      return t >= tomorrowStart && t < tomorrowEnd;
    });
    today = {
      jobs: todays.map((v) => {
        const start = Date.parse(v.startAt!);
        const end = v.endAt ? Date.parse(v.endAt) : start + 3 * 3600_000;
        const state: HomeJob['state'] = v.completed || end < now ? 'done' : start <= now ? 'now' : 'next';
        return { id: v.id, time: shortTime(start), title: v.title, client: v.clientName, city: cityOf(v.address), team: v.team, state };
      }),
      tomorrowCount: tomorrow.length,
      tomorrowFirst: tomorrow[0]?.startAt ? shortTime(Date.parse(tomorrow[0].startAt)) : null,
    };
  }

  /* ---- leads ---- */
  const sorted = [...leads].sort((a, b) => b.at - a.at);
  const quoteById = new Map(quotes14.map((q) => [q.id, q]));
  const homeLeads: HomeLead[] = sorted.slice(0, 8).map((l) => {
    const q = quoteById.get(l.id);
    const source: LeadSource = l.kind === 'quote' ? 'web' : l.kind === 'application' ? 'job' : /facebook/i.test(l.platform ?? '') ? 'fb' : 'ig';
    const detail =
      l.kind === 'quote'
        ? [q?.service, l.city].filter(Boolean).join(' · ') || 'Quote request'
        : l.kind === 'application'
          ? `Wants to join the team${l.city ? ` · ${l.city}` : ''}`
          : `Asked about a quote on ${l.platform ?? 'social'}`;
    return { id: l.id, name: l.name, detail, source, at: l.at, isNew: now - l.at < DAY };
  });

  const weekStart = week.start;
  const lastWeekStart = week.prevStart;
  const socialLeadTimes = convs
    .filter((c) => c.tags?.includes('lead'))
    .map((c) => c.messages.find((m) => m.dir === 'in')?.at ?? c.lastInboundAt);
  const quoteTimes = quotes14.map((q) => q.at);
  const webThis = quoteTimes.filter((t) => t >= weekStart).length;
  const webPrev = quoteTimes.filter((t) => t >= lastWeekStart && t < weekStart).length;
  const socialThis = socialLeadTimes.filter((t) => t >= weekStart).length;
  const socialPrev = socialLeadTimes.filter((t) => t >= lastWeekStart && t < weekStart).length;
  const leadSpark = week.buckets.map((b) => countIn([...quoteTimes, ...socialLeadTimes], [b.start, b.end]));

  /* ---- social ---- */
  const unanswered = convs.filter((c) => isUnanswered(c, now)).sort((a, b) => b.lastInboundAt - a.lastInboundAt);
  const drafts = posts.filter((x) => x.status === 'draft').sort((a, b) => (a.scheduledAt ?? Infinity) - (b.scheduledAt ?? Infinity));
  const failed = posts.filter((x) => x.status === 'failed' && (x.scheduledAt ?? x.createdAt) > now - 7 * DAY);
  const upcoming = posts
    .filter((x) => x.scheduledAt && x.scheduledAt > now && (x.status === 'scheduled' || x.status === 'draft'))
    .sort((a, b) => a.scheduledAt! - b.scheduledAt!);
  const next = upcoming.find((x) => x.status === 'scheduled') ?? upcoming[0] ?? null;
  const igDays = ig?.days ?? {};
  const reach7 = ig
    ? week.buckets.reduce((a, b) => a + (igDays[etDayKey(b.start + 12 * 3600_000)]?.reach ?? 0), 0)
    : null;
  const hist = ig?.history ?? [];
  const weekAgoKey = etDayKey(now - 7 * DAY);
  const then = [...hist].reverse().find((h) => h.day <= weekAgoKey);
  const followersDelta = ig?.followers != null && then ? ig.followers - then.followers : null;

  /* ---- reviews ---- */
  const monthKey = `${p.y}-${String(p.m).padStart(2, '0')}`;
  const monthDays = Object.keys(reviewCounts ?? {}).filter((d) => d.startsWith(monthKey)).sort();
  const lastMonthDays = Object.keys(reviewCounts ?? {}).filter((d) => d < `${monthKey}-01`).sort();
  const baseDay = lastMonthDays[lastMonthDays.length - 1] ?? monthDays[0];
  const newThisMonth = reviewCounts && baseDay != null ? Math.max(0, REVIEW_COUNT - reviewCounts[baseDay]) : null;
  const sent30 = reqs.filter((r) => r.status === 'sent' && (r.sentAt ?? 0) > now - 30 * DAY);
  const reviewed30 = sent30.filter((r) => alreadyReviewed(r.clientName)).length;
  const pendingReqs = reqs.filter((r) => r.status === 'pending');

  /* ---- money ---- */
  const outstanding = moneyOk ? moneyRes!.outstanding : [];
  const oldestLate = outstanding.reduce((m, i) => Math.max(m, i.daysOverdue ?? 0), 0);

  /* ---- needs you (most urgent first) ---- */
  const needs: HomeNeed[] = [];
  if (moneyOk && moneyRes!.overdueCount > 0) {
    needs.push({
      id: 'overdue',
      tone: 'r',
      icon: '$',
      title: `${plural(moneyRes!.overdueCount, 'invoice')} overdue · ${money(moneyRes!.overdueTotal)}`,
      detail: oldestLate > 0 ? `Oldest is ${plural(oldestLate, 'day')} late — a friendly reminder usually gets it paid` : 'Past the due date in Jobber',
      action: 'Open Money →',
      tab: 'money',
    });
  }
  const freshQuotes = sorted.filter((l) => l.kind === 'quote' && now - l.at < DAY);
  if (freshQuotes.length === 1) {
    const l = freshQuotes[0];
    const q = quoteById.get(l.id);
    needs.push({
      id: 'quote',
      tone: 'b',
      icon: '✦',
      title: `New quote request · ${l.name}${l.city ? ` · ${l.city}` : ''}`,
      detail: `${q?.service ? `${q.service} · ` : ''}came in ${ago(l.at, now)} — quick replies win the job`,
      action: 'Open Leads →',
      tab: 'leads',
    });
  } else if (freshQuotes.length > 1) {
    needs.push({
      id: 'quote',
      tone: 'b',
      icon: '✦',
      title: `${freshQuotes.length} new quote requests today`,
      detail: `${freshQuotes.slice(0, 3).map((l) => l.name).join(', ')} — quick replies win the job`,
      action: 'Open Leads →',
      tab: 'leads',
    });
  }
  if (unanswered.length) {
    const dms = unanswered.filter((c) => c.kind === 'dm').length;
    const first = unanswered[0];
    const lastIn = [...first.messages].reverse().find((m) => m.dir === 'in')?.text ?? '';
    const what = dms === unanswered.length ? (dms === 1 ? 'DM' : 'DMs') : dms === 0 ? (unanswered.length === 1 ? 'comment' : 'comments') : 'DMs + comments';
    needs.push({
      id: 'dms',
      tone: 'ig',
      icon: '◈',
      title: `${unanswered.length} unanswered ${what}`,
      detail: `${lastIn ? `“${lastIn.slice(0, 70)}${lastIn.length > 70 ? '…' : ''}”` : first.name ?? 'Someone'}${unanswered.length > 1 ? ` + ${unanswered.length - 1} more` : ''}`,
      action: 'Open Inbox →',
      tab: 'social',
    });
  }
  if (failed.length) {
    needs.push({
      id: 'failed',
      tone: 'r',
      icon: '!',
      title: `${plural(failed.length, 'post')} failed to publish`,
      detail: 'Open it to see what Meta said, then tap Retry',
      action: 'Open Social →',
      tab: 'social',
    });
  }
  if (drafts.length) {
    const days = Array.from(new Set(drafts.filter((d) => d.scheduledAt).map((d) => WD[etParts(d.scheduledAt!).dow])));
    needs.push({
      id: 'drafts',
      tone: 'a',
      icon: '▣',
      title: `${plural(drafts.length, 'post')} waiting for approval`,
      detail: days.length ? `Planned for ${days.slice(0, 3).join(' + ')} — nothing goes out until it's approved` : "Nothing goes out until it's approved",
      action: 'Review posts →',
      tab: 'social',
    });
  }
  if (pendingReqs.length) {
    needs.push({
      id: 'reviews',
      tone: 'g',
      icon: '★',
      title: `${plural(pendingReqs.length, 'client')} ready to be asked for a review`,
      detail: deps.canEmailCustomers ? 'Sending while the clean is fresh gets the most 5-stars' : 'Waiting on your email domain in Resend — then they send',
      action: 'Open Reviews →',
      tab: 'reviews',
    });
  }
  const applicants = sorted.filter((l) => l.kind === 'application' && now - l.at < 7 * DAY);
  if (applicants.length) {
    needs.push({
      id: 'applicants',
      tone: 'v',
      icon: '◉',
      title: `${plural(applicants.length, 'new cleaner applicant')}`,
      detail: applicants.slice(0, 3).map((l) => `${l.name}${l.city ? ` (${l.city})` : ''}`).join(', '),
      action: 'Open Leads →',
      tab: 'leads',
    });
  }

  /* ---- website ---- */
  let webOut: HomePayload['web'] = null;
  if (web) {
    const t = web.today;
    const past = web.range.timeline.filter((x) => x.at < todayStart);
    const avg7 = past.length ? Math.round(past.reduce((a, x) => a + x.visitors, 0) / past.length) : null;
    const refs = Object.entries(t.refs).map(([h, n]) => [referrerLabel(h), n] as const);
    const byLabel = new Map<string, number>();
    for (const [l, n] of refs) byLabel.set(l, (byLabel.get(l) ?? 0) + n);
    const top = Array.from(byLabel.entries()).sort((a, b) => b[1] - a[1])[0];
    const refTotal = Array.from(byLabel.values()).reduce((a, n) => a + n, 0);
    webOut = {
      visitors: t.v,
      avg7,
      quoteOpens: t.q,
      quotesSent: quoteTimes.filter((x) => x >= todayStart).length,
      topSource: top && refTotal ? { label: top[0], pct: Math.round((top[1] / refTotal) * 100) } : null,
      spark: web.range.timeline.map((x) => x.visitors),
    };
  }

  /* ---- jobs next 7 days ---- */
  let jobsKpi: HomePayload['kpi']['jobs'] = null;
  if (jobberOk && metrics) {
    const b = dayBuckets(todayStart, 7);
    const times = metrics.allVisits.filter((v) => v.startAt).map((v) => Date.parse(v.startAt!));
    jobsKpi = { value: times.filter((t) => t >= b[0][0] && t < b[6][1]).length, clients: metrics.activeClientCount, spark: b.map((x) => countIn(times, x)) };
  }

  const hour = p.h;
  const greeting = hour < 12 ? 'Good morning.' : hour < 17 ? 'Good afternoon.' : 'Good evening.';

  const unreadSocial = unanswered.length;
  return {
    at: now,
    greeting,
    dateLabel: `${WD_LONG[p.dow]} · ${MON[p.m - 1]} ${p.d}`,
    needs,
    today,
    kpi: {
      collected: moneyOk
        ? { value: moneyRes!.paidThisWeek, prev: moneyRes!.paidLastWeek, spark: moneyRes!.weeklyRevenue.slice(-8).map((w) => w.amount) }
        : null,
      owed: moneyOk ? { total: moneyRes!.outstandingTotal, late: moneyRes!.overdueTotal, open: outstanding.length } : null,
      leads: { value: webThis + socialThis, prev: webPrev + socialPrev, web: webThis, social: socialThis, spark: leadSpark },
      jobs: jobsKpi,
    },
    leads: homeLeads,
    social: {
      connected: !!meta,
      igUsername: meta?.igUsername ?? null,
      nextPost: next
        ? {
            at: next.scheduledAt!,
            kind: next.kind,
            caption: next.caption,
            platforms: next.platforms,
            approved: next.status === 'scheduled',
            thumb: next.media[0]?.type === 'image' ? next.media[0].url : null,
          }
        : null,
      followers: ig?.followers ?? null,
      followersDelta,
      reach7,
      unread: unreadSocial,
    },
    reviews: { rating: RATING, count: REVIEW_COUNT, newThisMonth, sent30: sent30.length, reviewed30, pending: pendingReqs.length },
    web: webOut,
    autos: {
      reviewRequests: settings
        ? {
            on: settings.reviewRequests.on,
            note: !settings.reviewRequests.on
              ? 'Switched off'
              : !deps.canEmailCustomers
                ? 'Waiting on your email domain in Resend'
                : settings.reviewRequests.mode === 'auto'
                  ? 'Emailed automatically a few hours after a job is done'
                  : 'Lined up in Reviews for you to send',
          }
        : { on: false, note: 'Needs Upstash storage' },
      autopost: {
        on: !!meta && deps.canSchedule,
        note: !meta ? 'Connect Instagram + Facebook in Social' : !deps.canSchedule ? 'Needs QStash' : 'Instagram + Facebook at the scheduled minute',
      },
      dms: {
        on: !!settings && (settings.priceReply.on || settings.quoteComment.on || settings.afterHours.on),
        note: 'Customers only once Meta approves the app — until then, your own test messages',
      },
    },
    counts: {
      money: moneyOk ? moneyRes!.overdueCount : 0,
      leads: freshQuotes.length + applicants.filter((l) => now - l.at < DAY).length,
      social: unreadSocial + drafts.length + failed.length,
      reviews: pendingReqs.length,
    },
  };
}
