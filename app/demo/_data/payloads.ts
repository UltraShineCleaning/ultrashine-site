import { buildHome, type HomePayload } from '../../_lib/home/build';
import { buildClients } from '../../_lib/clients/profiles';
import type { ClientsPayload } from '../../_lib/clients/types';
import { buildReviewsOverview, type ReviewsOverview } from '../../_lib/reviews/overview';
import { buildInsights } from '../../_lib/insights/build';
import { RANGES, type InsightsPayload, type RangeKey } from '../../_lib/insights/types';
import { COUNT as SITE_REVIEW_COUNT } from '../../_lib/google-reviews';
import { etDayKey, etParts, etToMs } from '../../_lib/social/time';
import type { LeadRecord } from '../../_lib/leads/types';
import type { JobberMoney, JobberVisit } from '../../_lib/jobberClient';
import type { AutomationSettings, Conversation, SocialPost } from '../../_lib/social/types';
import type { InsightsSnapshot } from '../../_lib/social/insights';
import { buildWorld, demoReviewed, DEMO_GOALS, DEMO_RATING, DEMO_REVIEW_COUNT } from './world';

/**
 * Everything /demo shows, computed on the server from the fake world by the
 * SAME builders the real API routes use — so every number follows the real
 * maths. Nothing here reaches Jobber, Redis, Meta, Resend, Vercel or Google.
 */

export type DemoStatus = {
  storage: boolean;
  scheduler: boolean;
  uploads: boolean;
  metaApp: boolean;
  webhook: boolean;
  connected: { page: string; instagram: string | null; since: number } | null;
  customerEmail: boolean;
  ai: boolean;
};

export type DemoPayload = {
  builtAt: number;
  home: HomePayload;
  clients: ClientsPayload;
  leads: LeadRecord[];
  reviews: ReviewsOverview;
  insights: Record<string, InsightsPayload>;
  goals: typeof DEMO_GOALS;
  social: {
    status: DemoStatus;
    posts: SocialPost[];
    convs: Conversation[];
    settings: AutomationSettings;
    insights: InsightsSnapshot;
  };
};

const DAY = 86_400_000;

export async function buildDemo(now = Date.now()) {
  const w = buildWorld(now);
  const lastMonthEnd = (() => {
    const p = etParts(now);
    return etDayKey(etToMs(p.y, p.m, 1, 0) - DAY / 2);
  })();

  /* ---------- Home ---------- */
  const home = await buildHome(
    {
      metrics: async () => w.metrics,
      money: async () => w.money,
      leads: async () => w.homeLeads,
      quotes: async (from, to) => w.quoteLog.filter((q) => q.at >= from && q.at < to),
      convs: async () => w.convs,
      posts: async (from, to) => w.posts.filter((p) => (p.scheduledAt ?? p.createdAt) >= from && (p.scheduledAt ?? p.createdAt) < to),
      meta: async () => ({ pageId: '1', pageName: 'Ultra Shine Cleaning', pageToken: 'demo', igUsername: 'ultrashinecleaning', connectedAt: now - 140 * DAY }),
      igInsights: async () => w.igSnapshot,
      settings: async () => w.settings,
      reviewRequests: async () => w.reviewRequests,
      reviewCounts: async () => ({ [lastMonthEnd]: SITE_REVIEW_COUNT - 5, [etDayKey(now)]: SITE_REVIEW_COUNT }),
      web: async (start, end, prevStart) => ({ range: await w.vercel(start, end, prevStart, false), today: w.vercelToday }),
      canEmailCustomers: true,
      canSchedule: true,
    },
    now,
  );
  const sent30 = w.reviewRequests.filter((r) => r.status === 'sent' && (r.sentAt ?? 0) > now - 30 * DAY);
  home.reviews = { ...home.reviews, rating: DEMO_RATING, count: DEMO_REVIEW_COUNT, reviewed30: sent30.filter((r) => demoReviewed(r.clientName)).length };
  home.autos.dms.note = 'Price questions, “QUOTE” comments + after-hours, answered in seconds';

  /* ---------- Clients ---------- */
  const clients = await buildClients(
    {
      clients: async () => ({ clients: w.jobberClients }),
      jobs: async () => ({ jobs: w.jobs }),
      money: async () => w.money,
      metrics: async () => w.metrics,
      leads: async () => w.leads,
      reviewRequests: async () => w.reviewRequests,
      homes: async () => w.homes,
    },
    now,
  );
  clients.clients = clients.clients.map((c) => ({ ...c, review: demoReviewed(c.name) ? 'reviewed' : c.review }));

  /* ---------- Reviews ---------- */
  const reviews = await buildReviewsOverview(
    {
      requests: async () => w.reviewRequests,
      reviewCounts: async () => ({ [lastMonthEnd]: SITE_REVIEW_COUNT - 5, [etDayKey(now)]: SITE_REVIEW_COUNT }),
      reviews: async () => w.googleReviews,
      settings: async () => w.settings.reviewRequests,
      canEmail: true,
    },
    now,
  );
  reviews.rating = DEMO_RATING;
  reviews.count = DEMO_REVIEW_COUNT;
  reviews.requests = reviews.requests.map((r) => ({ ...r, reviewed: demoReviewed(r.clientName) }));
  const rev30 = reviews.requests.filter((r) => r.status === 'sent' && (r.sentAt ?? 0) > now - 30 * DAY);
  reviews.stats = {
    ...reviews.stats,
    reviewed30: rev30.filter((r) => r.reviewed).length,
    returnRate: rev30.length >= 3 ? Math.round((rev30.filter((r) => r.reviewed).length / rev30.length) * 100) : null,
  };

  /* ---------- Insights (all four ranges) ---------- */
  const insights: Record<string, InsightsPayload> = {};
  for (const range of RANGES as RangeKey[]) {
    const p = await buildInsights(
      range,
      {
        vercel: w.vercel,
        gsc: w.gsc,
        meta: async () => w.igSnapshot,
        money: async () => w.money,
        quotes: async (from, to) => w.quoteLog.filter((q) => q.at >= from && q.at < to),
        convs: async () => [...w.convs, ...w.oldConvs],
        reviewRequests: async () => w.reviewRequests,
        goals: async () => DEMO_GOALS,
        reviewCounts: async (today, count) => ({
          [etDayKey(now - 400 * DAY)]: count - 38,
          [etDayKey(now - 200 * DAY)]: count - 21,
          [etDayKey(now - 95 * DAY)]: count - 13,
          [etDayKey(now - 40 * DAY)]: count - 7,
          [etDayKey(now - 10 * DAY)]: count - 2,
          [today]: count,
        }),
      },
      now,
    );
    p.reviews = {
      ...p.reviews,
      rating: DEMO_RATING,
      count: DEMO_REVIEW_COUNT,
      latest: w.googleReviews.slice(0, 3).map((r) => ({ name: r.author_name, rating: r.rating, when: r.relative_time_description, text: r.text })),
      requests: { ...p.reviews.requests, reviewed: w.reviewRequests.filter((r) => r.status === 'sent' && r.sentAt && r.sentAt >= now - range * DAY && demoReviewed(r.clientName)).length },
    };
    insights[String(range)] = p;
  }

  const payload: DemoPayload = {
    builtAt: now,
    home,
    clients,
    leads: w.leads,
    reviews,
    insights,
    goals: DEMO_GOALS,
    social: {
      status: {
        storage: true,
        scheduler: true,
        uploads: true,
        metaApp: true,
        webhook: true,
        connected: { page: 'Ultra Shine Cleaning', instagram: 'ultrashinecleaning', since: now - 140 * DAY },
        customerEmail: true,
        ai: true,
      },
      posts: w.posts,
      convs: w.convs,
      settings: w.settings,
      // The Social tab reads followers, history and media — the daily numbers stay on the server.
      insights: { ...w.igSnapshot, days: undefined, demographics: undefined },
    },
  };

  return {
    payload,
    // Money reads the totals + open invoices; the per-invoice list is only for Clients/Insights.
    money: { ...w.money, invoiceLite: undefined } as JobberMoney,
    visits: w.visits as JobberVisit[],
    recentJobs: w.recentJobs,
  };
}
