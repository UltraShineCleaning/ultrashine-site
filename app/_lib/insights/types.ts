/**
 * Shared shape of the Insights tab (admin → Insights). Safe to import from
 * client components — no server code here.
 *
 * Every section is `null` when its source is not connected, so the UI can show
 * the "connect this" card instead of zeros. A zero is a real number; a null is
 * "we don't know yet". Never mix the two.
 */

export type RangeKey = 7 | 30 | 90 | 365;
export const RANGES: RangeKey[] = [7, 30, 90, 365];

export type SourceId = 'vercel' | 'google' | 'meta' | 'jobber';

export type SourceState = {
  connected: boolean;
  /** Plain-English problem when it is set up but failing. */
  error?: string;
};

export type Slice = { label: string; value: number };

export type Kpi = {
  value: number;
  /** Same-length previous period, or null when we have no history for it. */
  prev: number | null;
  spark: number[];
};

export type Series = { labels: string[]; cur: number[]; prev: number[] };

export type Goals = { quotes: number; jobs: number; revenue: number; reviews: number };

export type Standout = { tone: 'up' | 'warn' | 'info'; title: string; body: string };

export type InsightsPayload = {
  range: RangeKey;
  generatedAt: number;
  sources: Record<SourceId, SourceState>;

  /**
   * Goals for THIS range. `monthly` is what was saved (per month); `forRange`
   * is scaled to the range. `auto` = nobody has set goals yet, so each one is
   * "10% more than the previous period" — never a made-up number.
   */
  goals: { monthly: Goals | null; forRange: Goals; auto: boolean };
  progress: { quotes: number; jobs: number | null; revenue: number | null; reviews: number | null };

  kpi: {
    visitors: Kpi | null;
    googleClicks: Kpi | null;
    socialReach: Kpi | null;
    revenue: Kpi | null;
  };

  funnel: {
    seenOnGoogle: number | null;
    visited: number | null;
    quoteOpened: number | null;
    quoteSent: number;
  };

  web: null | {
    traffic: Series;
    sources: Slice[];
    devices: Slice[];
    pages: Slice[];
    quoteOpened: number | null;
  };

  /** Quote requests + first DMs by weekday (Mon..Sun) × hour (6 AM..9 PM), Florida time. */
  when: {
    grid: number[][];
    total: number;
    weekdays: number;
    weekend: number;
    bestDays: string | null;
    bestHour: number | null;
  };

  google: null | {
    clicks: number;
    impressions: number;
    avgPosition: number | null;
    prevAvgPosition: number | null;
    devices: Slice[];
    queries: { q: string; clicks: number; impressions: number; ctr: number; position: number }[];
    wins: { q: string; impressions: number; position: number; page: string | null }[];
  };

  social: null | {
    igFollowers: number | null;
    igGain: number | null;
    fbFollowers: number | null;
    followerHistory: { day: string; ig: number }[];
    reach: number | null;
    interactions: Slice[];
    avgReachByType: Slice[];
    topPosts: { id: string; type: string; thumb?: string; permalink?: string; reach: number | null; likes: number; comments: number; at: string }[];
    gender: Slice[];
    ages: Slice[];
    cities: Slice[];
    path: { reach: number | null; websiteVisits: number | null; dms: number; quotes: number };
    /** True while the account has under 100 followers — Meta hides demographics until then. */
    demographicsHidden: boolean;
  };

  money: null | {
    revenue: number;
    bars: { label: string; paid: number; unpaid: number }[];
    topClients: Slice[];
    returning: number;
    newClients: number;
    avgJob: number | null;
    avgJobPrev: number | null;
    avgJobSeries: number[];
    unpaidTotal: number;
    unpaidCount: number;
    overdueCount: number;
  };

  reviews: {
    rating: number;
    count: number;
    gained: number | null;
    latest: { name: string; rating: number; when: string; text: string }[];
    requests: { sent: number; reviewed: number; waiting: number };
  };

  standouts: Standout[];
};

/** Monthly goal → goal for the chosen range. */
export function scaleGoal(monthly: number, range: RangeKey): number {
  return Math.round(monthly * (range === 7 ? 7 / 30 : range === 30 ? 1 : range === 90 ? 3 : 12));
}
