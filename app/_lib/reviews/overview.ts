import { COUNT, RATING, fetchGoogleReviews, GOOGLE_WRITE_REVIEW_URL, type GoogleReview } from '../google-reviews';
import { getJSON } from '../kv';
import { alreadyReviewed, listReviewRequests } from '../reviewRequests';
import { customerFromAddress } from '../reviewEmail';
import { getSettings } from '../social/store';
import { etParts } from '../social/time';
import type { ReviewRequest } from '../social/types';

/**
 * Admin → Reviews, in one answer: the rating, the automatic review requests
 * (with the numbers behind them) and the latest reviews to reply to.
 */

export type ReviewsOverview = {
  rating: number;
  count: number;
  newThisMonth: number | null;
  reviewLink: string;
  latest: { author: string; rating: number; text: string; time: number; when: string }[];
  requests: (ReviewRequest & { reviewed: boolean })[];
  stats: { sent30: number; reviewed30: number; returnRate: number | null; waiting: number };
  auto: { on: boolean; mode: 'auto' | 'ask' };
  canEmailCustomers: boolean;
};

export type OverviewDeps = {
  requests: () => Promise<ReviewRequest[]>;
  reviewCounts: () => Promise<Record<string, number> | null>;
  reviews: () => Promise<GoogleReview[]>;
  settings: () => Promise<{ on: boolean; mode: 'auto' | 'ask' }>;
  canEmail: boolean;
};

export const realOverviewDeps = (): OverviewDeps => ({
  requests: () => listReviewRequests(200),
  reviewCounts: () => getJSON<Record<string, number>>('insights:reviewCounts'),
  reviews: async () => (await fetchGoogleReviews()).reviews,
  settings: async () => (await getSettings()).reviewRequests,
  canEmail: !!customerFromAddress() && !!process.env.RESEND_API_KEY,
});

/** Reviews gained since the end of last month, from the count saved each morning. Null until there's history. */
export function newThisMonth(counts: Record<string, number> | null, count: number, now = Date.now()): number | null {
  if (!counts) return null;
  const p = etParts(now);
  const month = `${p.y}-${String(p.m).padStart(2, '0')}`;
  const days = Object.keys(counts).sort();
  const before = days.filter((d) => d < `${month}-01`);
  const base = before[before.length - 1] ?? days.find((d) => d.startsWith(month));
  return base == null ? null : Math.max(0, count - counts[base]);
}

export async function buildReviewsOverview(deps: OverviewDeps, now = Date.now()): Promise<ReviewsOverview> {
  const [requests, counts, reviews, auto] = await Promise.all([
    deps.requests().catch(() => [] as ReviewRequest[]),
    deps.reviewCounts().catch(() => null),
    deps.reviews().catch(() => [] as GoogleReview[]),
    deps.settings().catch(() => ({ on: false, mode: 'auto' as const })),
  ]);
  const sent = requests.filter((r) => r.status === 'sent' && (r.sentAt ?? 0) > now - 30 * 86_400_000);
  const reviewed = sent.filter((r) => alreadyReviewed(r.clientName)).length;
  return {
    rating: RATING,
    count: COUNT,
    newThisMonth: newThisMonth(counts, COUNT, now),
    reviewLink: GOOGLE_WRITE_REVIEW_URL,
    latest: [...reviews]
      .sort((a, b) => b.time - a.time)
      .slice(0, 5)
      .map((r) => ({ author: r.author_name, rating: r.rating, text: r.text, time: r.time, when: r.relative_time_description })),
    requests: [...requests].sort((a, b) => b.completedAt - a.completedAt).map((r) => ({ ...r, reviewed: alreadyReviewed(r.clientName) })),
    stats: {
      sent30: sent.length,
      reviewed30: reviewed,
      returnRate: sent.length >= 3 ? Math.round((reviewed / sent.length) * 100) : null,
      waiting: requests.filter((r) => r.status === 'pending' || r.status === 'failed').length,
    },
    auto: { on: auto.on, mode: auto.mode },
    canEmailCustomers: deps.canEmail,
  };
}
