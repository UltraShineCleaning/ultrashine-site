import { getJSON, setJSON, setOnce } from '../kv';
import { getJobberMoney, isJobberConfigured, type JobberMoney } from '../jobberClient';
import { COUNT as REVIEW_COUNT, RATING, fetchGoogleReviews } from '../google-reviews';
import { alreadyReviewed, listReviewRequests } from '../reviewRequests';
import { getInsights, type InsightsSnapshot } from '../social/insights';
import type { IgDay } from '../social/meta';
import { getMeta, listConvs } from '../social/store';
import { etDayKey, etParts, etToMs } from '../social/time';
import type { Conversation, ReviewRequest } from '../social/types';
import { getGoals } from './goals';
import { backfillFromResend, fromInstagram, listQuotes, type QuoteLog } from './quotes';
import { bucketOf, bucketize, windowFor, type Window } from './range';
import { almostPageOne, fetchGsc, gscConfigured, type GscData } from './searchConsole';
import { scaleGoal, type Goals, type InsightsPayload, type Kpi, type RangeKey, type Slice, type SourceState, type Standout } from './types';
import { deviceLabel, fetchDay, pageLabel, referrerLabel, syncVercelDays, vercelConfigured, vercelFromHistory, type VercelData } from './vercel';

/**
 * Builds everything the Insights tab shows for one range, from each source.
 *
 * Each outside source (Vercel, Search Console, Meta, Jobber) is fetched on its
 * own; if one is missing or failing, ITS section is null and its card says what
 * to fix — the rest of the page still works. Outside answers are cached 30
 * minutes so flipping between ranges doesn't re-ask anyone.
 *
 * `deps` exists so tests (and the local demo) can hand in fake sources and
 * exercise the real maths below.
 */
export type Deps = {
  vercel: ((start: number, end: number, prevStart: number, monthly: boolean) => Promise<VercelData>) | null;
  gsc: ((start: string, end: string, prevStart: string, prevEnd: string) => Promise<GscData>) | null;
  meta: (() => Promise<InsightsSnapshot | null>) | null;
  money: (() => Promise<JobberMoney>) | null;
  quotes: (from: number, to: number) => Promise<QuoteLog[]>;
  convs: () => Promise<Conversation[]>;
  reviewRequests: () => Promise<ReviewRequest[]>;
  goals: () => Promise<Goals | null>;
  reviewCounts: (today: string, count: number) => Promise<Record<string, number>>;
};

async function cached<T>(key: string, force: boolean, fn: () => Promise<T>): Promise<T> {
  if (!force) {
    const hit = await getJSON<T>(key);
    if (hit) return hit;
  }
  const v = await fn();
  await setJSON(key, v, 1800);
  return v;
}

async function reviewCountHistory(today: string, count: number): Promise<Record<string, number>> {
  const h = (await getJSON<Record<string, number>>('insights:reviewCounts')) ?? {};
  if (h[today] !== count) {
    h[today] = count;
    await setJSON('insights:reviewCounts', h);
  }
  return h;
}

/** Daily cron: remember today's Google review count so "new reviews" can be counted per range. */
export async function snapshotReviewCount(now = Date.now()): Promise<number> {
  await reviewCountHistory(etDayKey(now), REVIEW_COUNT);
  return REVIEW_COUNT;
}

export async function realDeps(range: RangeKey, force = false): Promise<Deps> {
  const conn = await getMeta();
  return {
    vercel: vercelConfigured()
      ? async (s, e, p) => {
          // Save any finished days we don't have yet (a no-op most loads: the
          // morning cron already did it). At most once per 30 minutes.
          if (force || (await setOnce('insights:vercel:synced', '1', 1800))) await syncVercelDays(31);
          const today = windowFor(7).buckets[6];
          return vercelFromHistory(s, e, p, () => cached('insights:cache:vercel:today', force, () => fetchDay(today.start, today.end)));
        }
      : null,
    gsc: gscConfigured() ? (s, e, ps, pe) => cached(`insights:cache:gsc:${range}`, force, () => fetchGsc(s, e, ps, pe)) : null,
    meta: conn ? () => getInsights() : null,
    money: isJobberConfigured() ? () => getJobberMoney({ force }) : null,
    quotes: async (from, to) => {
      await backfillFromResend();
      return listQuotes(from, to);
    },
    convs: () => listConvs(200),
    reviewRequests: () => listReviewRequests(200),
    goals: getGoals,
    reviewCounts: reviewCountHistory,
  };
}

/* ---------------------------------------------------------------- helpers */

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Group into top N slices + "Everything else", biggest first. */
function topSlices(pairs: [string, number][], n: number): Slice[] {
  const m = new Map<string, number>();
  for (const [k, v] of pairs) if (v > 0) m.set(k, (m.get(k) ?? 0) + v);
  const all = Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  const top = all.slice(0, n).map(([label, value]) => ({ label, value }));
  const rest = sum(all.slice(n).map((x) => x[1]));
  if (rest > 0) top.push({ label: 'Everything else', value: rest });
  return top;
}

/** Noon, Florida time, of a 'YYYY-MM-DD' — safely inside that day's bucket. */
function noonOf(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return etToMs(y, m, d, 12);
}

/** First message a person sent us — when a DM conversation "started". */
function firstInbound(c: Conversation): number | null {
  const m = c.messages.find((x) => x.dir === 'in');
  return m ? m.at : c.kind === 'dm' ? c.lastInboundAt : null;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * The busiest days, in words. Days within 60% of the busiest one count (at most
 * three): "Tue–Thu" when they sit next to each other, "Tue & Thu" when not,
 * "Tue" when one day clearly leads. Null under 5 events — too few to call.
 */
export function describeBestDays(byDay: number[]): string | null {
  if (sum(byDay) < 5) return null;
  const max = Math.max(...byDay);
  const top = byDay
    .map((v, i) => [v, i] as const)
    .filter(([v]) => v >= max * 0.6)
    .sort((a, b) => b[0] - a[0])
    .slice(0, 3)
    .map(([, i]) => i)
    .sort((a, b) => a - b);
  if (top.length === 1) return WEEKDAYS[top[0]];
  const run = top.every((d, i) => i === 0 || d === top[i - 1] + 1);
  if (run) return `${WEEKDAYS[top[0]]}–${WEEKDAYS[top[top.length - 1]]}`;
  const two = top.slice().sort((a, b) => byDay[b] - byDay[a]).slice(0, 2).sort((a, b) => a - b);
  return `${WEEKDAYS[two[0]]} & ${WEEKDAYS[two[1]]}`;
}

export function whenGrid(times: number[]) {
  const grid = WEEKDAYS.map(() => Array.from({ length: 16 }, () => 0));
  const byDay = WEEKDAYS.map(() => 0);
  const byHour = Array.from({ length: 24 }, () => 0);
  let weekdays = 0;
  let weekend = 0;
  for (const t of times) {
    const p = etParts(t);
    const d = (p.dow + 6) % 7; // Mon = 0
    byDay[d]++;
    byHour[p.h]++;
    if (d >= 5) weekend++;
    else weekdays++;
    if (p.h >= 6 && p.h <= 21) grid[d][p.h - 6]++;
  }
  const bestHourVal = Math.max(...byHour);
  return {
    grid,
    total: times.length,
    weekdays,
    weekend,
    bestDays: describeBestDays(byDay),
    bestHour: times.length >= 5 && bestHourVal > 0 ? byHour.indexOf(bestHourVal) : null,
  };
}

function kpi(cur: number[], prevTotal: number | null, value?: number): Kpi {
  return { value: value ?? sum(cur), prev: prevTotal, spark: cur };
}

/* ---------------------------------------------------------------- build */

export async function buildInsights(range: RangeKey, deps: Deps, now = Date.now()): Promise<InsightsPayload> {
  const w: Window = windowFor(range, now);
  const sources: InsightsPayload['sources'] = {
    vercel: { connected: !!deps.vercel },
    google: { connected: !!deps.gsc },
    meta: { connected: !!deps.meta },
    jobber: { connected: !!deps.money },
  };
  const fail = (id: keyof typeof sources, e: unknown): null => {
    (sources[id] as SourceState).error = (e as Error)?.message || String(e);
    return null;
  };

  const [vercel, gsc, meta, money, quotesAll, convs, reqs, savedGoals] = await Promise.all([
    deps.vercel ? deps.vercel(w.start, w.end, w.prevStart, range === 365).catch((e) => fail('vercel', e)) : null,
    deps.gsc
      ? deps.gsc(etDayKey(w.start), etDayKey(w.end - 1), etDayKey(w.prevStart), etDayKey(w.start - 1)).catch((e) => fail('google', e))
      : null,
    deps.meta ? deps.meta().catch((e) => fail('meta', e)) : null,
    deps.money ? deps.money().catch((e) => fail('jobber', e)) : null,
    deps.quotes(w.prevStart, w.end).catch(() => [] as QuoteLog[]),
    deps.convs().catch(() => [] as Conversation[]),
    deps.reviewRequests().catch(() => [] as ReviewRequest[]),
    deps.goals().catch(() => null),
  ]);
  if (meta?.error && meta.error !== 'Not connected yet') sources.meta.error = meta.error;
  if (money?.errorDetail) sources.jobber.error = money.errorDetail;
  const moneyOk = money && !money.errorDetail ? money : null;

  const inWin = (t: number) => t >= w.start && t < w.end;
  const inPrev = (t: number) => t >= w.prevStart && t < w.start;

  /* ---------- quotes + DMs (our own data) ---------- */
  const quotes = quotesAll.filter((q) => inWin(q.at));
  const quotesPrev = quotesAll.filter((q) => inPrev(q.at));
  const dmStarts = convs.filter((c) => c.kind === 'dm').map((c) => ({ c, at: firstInbound(c) })).filter((x): x is { c: Conversation; at: number } => x.at != null);
  const when = whenGrid([...quotes.map((q) => q.at), ...dmStarts.filter((x) => inWin(x.at)).map((x) => x.at)]);

  /* ---------- website (Vercel) ---------- */
  let web: InsightsPayload['web'] = null;
  let visitorsKpi: Kpi | null = null;
  let igWebsiteVisits: number | null = null;
  if (vercel) {
    const cur = bucketize(w, vercel.timeline.map((r) => ({ at: r.at, v: r.visitors })));
    // No previous line when our saved history doesn't cover the whole previous period.
    const prev = vercel.prevVisitors == null ? [] : bucketize(w, vercel.prevTimeline.map((r) => ({ at: r.at, v: r.visitors })), true);
    const refs = vercel.referrers.map((r) => [referrerLabel(r.host), r.visitors] as [string, number]);
    igWebsiteVisits = sum(refs.filter(([l]) => l === 'Instagram').map(([, v]) => v));
    web = {
      traffic: { labels: w.buckets.map((b) => b.label), cur, prev },
      sources: topSlices(refs.filter(([l]) => l !== 'Our own site'), 5),
      devices: topSlices(vercel.devices.map((d) => [deviceLabel(d.device), d.visitors]), 3),
      pages: topSlices(
        vercel.pages.filter((p) => p.path && !/^\/(admin|api)(\/|$)/.test(p.path) && p.path !== 'Others').map((p) => [pageLabel(p.path), p.pageviews]),
        5,
      ).filter((s) => s.label !== 'Everything else'),
      quoteOpened: vercel.quoteVisitors,
    };
    visitorsKpi = kpi(cur, vercel.prevVisitors, vercel.visitors);
  }

  /* ---------- Google search ---------- */
  let google: InsightsPayload['google'] = null;
  let googleKpi: Kpi | null = null;
  if (gsc) {
    const clicksSeries = bucketize(w, gsc.daily.map((d) => ({ at: noonOf(d.date), v: d.clicks })));
    const impressions = sum(gsc.daily.map((d) => d.impressions));
    const clicks = sum(gsc.daily.map((d) => d.clicks));
    const posW = sum(gsc.daily.map((d) => d.position * d.impressions));
    google = {
      clicks,
      impressions,
      avgPosition: impressions ? round1(posW / impressions) : null,
      prevAvgPosition: gsc.prev.position != null ? round1(gsc.prev.position) : null,
      devices: topSlices(
        gsc.devices.map((r) => [r.keys[0] === 'MOBILE' ? 'Phone' : r.keys[0] === 'DESKTOP' ? 'Computer' : 'Tablet', r.clicks]),
        3,
      ),
      queries: gsc.queries.slice(0, 8).map((r) => ({
        q: r.keys[0],
        clicks: Math.round(r.clicks),
        impressions: Math.round(r.impressions),
        ctr: Math.round(r.ctr * 1000) / 10,
        position: round1(r.position),
      })),
      wins: almostPageOne(gsc.queryPages),
    };
    googleKpi = kpi(clicksSeries, gsc.prev.clicks, clicks);
  }

  /* ---------- Instagram + Facebook ---------- */
  let social: InsightsPayload['social'] = null;
  let reachKpi: Kpi | null = null;
  if (meta && deps.meta) {
    const days = Object.entries(meta.days ?? {});
    const dayIn = (pred: (t: number) => boolean) => days.filter(([k]) => pred(noonOf(k)));
    const cur = dayIn(inWin);
    const prevDays = dayIn(inPrev);
    const reachSeries = bucketize(w, cur.map(([k, v]) => ({ at: noonOf(k), v: v.reach ?? 0 })));
    const has = (m: keyof IgDay) => cur.some(([, v]) => typeof v[m] === 'number');
    const total = (m: keyof IgDay, list = cur) => sum(list.map(([, v]) => v[m] ?? 0));
    const reach = has('reach') ? total('reach') : null;
    const hist = meta.history.filter((h) => inWin(noonOf(h.day)));
    const media = meta.media ?? [];
    const mediaIn = media.filter((m) => inWin(Date.parse(m.at)));
    const byType = new Map<string, { sum: number; n: number }>();
    for (const m of media) {
      if (m.reach == null) continue;
      const t = /REEL/i.test(m.type) ? 'Reels' : /STORY/i.test(m.type) ? 'Stories' : 'Posts';
      const cur2 = byType.get(t) ?? { sum: 0, n: 0 };
      cur2.sum += m.reach;
      cur2.n += 1;
      byType.set(t, cur2);
    }
    const demo = meta.demographics ?? null;
    const demoTotal = (xs: { value: number }[]) => sum(xs.map((x) => x.value)) || 1;
    const igQuotes = quotes.filter(fromInstagram).length;
    social = {
      igFollowers: meta.followers,
      igGain: hist.length >= 2 ? hist[hist.length - 1].followers - hist[0].followers : null,
      fbFollowers: meta.fbFollowers ?? null,
      followerHistory: hist.map((h) => ({ day: h.day, ig: h.followers })),
      reach,
      interactions: [
        { label: 'Likes', value: total('likes') },
        { label: 'Saves', value: total('saves') },
        { label: 'Shares', value: total('shares') },
        { label: 'Comments', value: total('comments') },
      ].filter((s) => s.value > 0),
      avgReachByType: ['Reels', 'Posts', 'Stories']
        .map((t) => ({ label: t, value: byType.get(t) ? Math.round(byType.get(t)!.sum / byType.get(t)!.n) : 0 }))
        .filter((s) => s.value > 0),
      topPosts: mediaIn
        .slice()
        .sort((a, b) => (b.reach ?? -1) - (a.reach ?? -1))
        .slice(0, 4)
        .map((m) => ({ id: m.id, type: m.type, thumb: m.thumb, permalink: m.permalink, reach: m.reach ?? null, likes: m.likes ?? 0, comments: m.comments ?? 0, at: m.at })),
      gender: demo
        ? demo.gender.map((g) => ({ label: g.key === 'F' ? 'Women' : g.key === 'M' ? 'Men' : 'Not shared', value: Math.round((g.value / demoTotal(demo.gender)) * 100) }))
        : [],
      ages: demo ? demo.age.slice().sort((a, b) => a.key.localeCompare(b.key)).map((a) => ({ label: a.key, value: Math.round((a.value / demoTotal(demo.age)) * 100) })) : [],
      cities: demo
        ? demo.city
            .slice()
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
            .map((c) => ({ label: c.key.split(',')[0], value: Math.round((c.value / demoTotal(demo.city)) * 100) }))
        : [],
      path: {
        reach,
        websiteVisits: igWebsiteVisits,
        dms: dmStarts.filter((x) => x.c.platform === 'instagram' && inWin(x.at)).length,
        quotes: igQuotes,
      },
      demographicsHidden: !demo,
    };
    reachKpi = reach != null ? kpi(reachSeries, prevDays.length ? total('reach', prevDays) : null, reach) : null;
  }

  /* ---------- money (Jobber) ---------- */
  let moneyOut: InsightsPayload['money'] = null;
  let revenueKpi: Kpi | null = null;
  let jobs: number | null = null;
  let jobsPrev: number | null = null;
  let revenue: number | null = null;
  let revenuePrev: number | null = null;
  if (moneyOk) {
    const inv = (moneyOk.invoiceLite ?? []).filter((i) => i.issued && i.total > 0).map((i) => ({ ...i, at: noonOf(i.issued!.slice(0, 10)) }));
    const cur = inv.filter((i) => inWin(i.at));
    const prev = inv.filter((i) => inPrev(i.at));
    const paid = bucketize(w, cur.map((i) => ({ at: i.at, v: i.paid })));
    const unpaid = bucketize(w, cur.filter((i) => i.owed).map((i) => ({ at: i.at, v: i.balance })));
    const firstSeen = new Map<string, number>();
    for (const i of inv) firstSeen.set(i.client, Math.min(firstSeen.get(i.client) ?? Infinity, i.at));
    const clientsNow = new Set(cur.map((i) => i.client));
    let returning = 0;
    for (const c of Array.from(clientsNow)) if ((firstSeen.get(c) ?? Infinity) < w.start) returning++;
    const avg = (xs: typeof inv) => (xs.length ? Math.round(sum(xs.map((i) => i.total)) / xs.length) : null);
    const avgSeries: number[] = [];
    let last = 0;
    for (let b = 0; b < w.buckets.length; b++) {
      const xs = cur.filter((i) => bucketOf(w, i.at) === b);
      last = xs.length ? Math.round(sum(xs.map((i) => i.total)) / xs.length) : last;
      avgSeries.push(last);
    }
    const owed = (moneyOk.invoiceLite ?? []).filter((i) => i.owed);
    revenue = sum(cur.map((i) => i.paid));
    revenuePrev = sum(prev.map((i) => i.paid));
    jobs = cur.length;
    jobsPrev = prev.length;
    moneyOut = {
      revenue,
      bars: w.buckets.map((b, i) => ({ label: b.label, paid: Math.round(paid[i]), unpaid: Math.round(unpaid[i]) })),
      topClients: topSlices(cur.map((i) => [i.client, i.paid] as [string, number]), 4),
      returning,
      newClients: clientsNow.size - returning,
      avgJob: avg(cur),
      avgJobPrev: avg(prev),
      avgJobSeries: avgSeries,
      unpaidTotal: Math.round(sum(owed.map((i) => i.balance))),
      unpaidCount: owed.length,
      overdueCount: owed.filter((i) => i.overdue).length,
    };
    revenueKpi = kpi(paid, prev.length ? revenuePrev : null, revenue);
  }

  /* ---------- reviews ---------- */
  const today = etDayKey(now);
  const counts = await deps.reviewCounts(today, REVIEW_COUNT).catch(() => ({}) as Record<string, number>);
  // Review count on a given moment = the last daily snapshot at or before it.
  const days = Object.keys(counts).sort();
  const countAt = (ms: number) => {
    const d = days.filter((k) => noonOf(k) <= ms).pop();
    return d ? counts[d] : null;
  };
  const atStart = countAt(w.start);
  const atPrevStart = countAt(w.prevStart);
  const gained = atStart != null ? REVIEW_COUNT - atStart : null;
  const gainedPrev = atStart != null && atPrevStart != null ? atStart - atPrevStart : null;
  const g = await fetchGoogleReviews();
  const sentIn = reqs.filter((r) => r.status === 'sent' && r.sentAt && inWin(r.sentAt));
  const reviews: InsightsPayload['reviews'] = {
    rating: RATING,
    count: REVIEW_COUNT,
    gained,
    latest: g.reviews
      .slice()
      .sort((a, b) => b.time - a.time)
      .slice(0, 3)
      .map((r) => ({ name: r.author_name, rating: r.rating, when: r.relative_time_description, text: r.text })),
    requests: {
      sent: sentIn.length,
      reviewed: sentIn.filter((r) => alreadyReviewed(r.clientName)).length,
      waiting: reqs.filter((r) => r.status === 'pending').length,
    },
  };

  /* ---------- goals ---------- */
  const auto = !savedGoals;
  const bump = (n: number | null) => Math.max(1, Math.round((n ?? 0) * 1.1));
  const forRange: Goals = savedGoals
    ? {
        quotes: scaleGoal(savedGoals.quotes, range),
        jobs: scaleGoal(savedGoals.jobs, range),
        revenue: scaleGoal(savedGoals.revenue, range),
        reviews: scaleGoal(savedGoals.reviews, range),
      }
    : { quotes: bump(quotesPrev.length), jobs: bump(jobsPrev), revenue: bump(revenuePrev), reviews: bump(gainedPrev) };

  const payload: InsightsPayload = {
    range,
    generatedAt: now,
    sources,
    goals: { monthly: savedGoals, forRange, auto },
    progress: { quotes: quotes.length, jobs, revenue, reviews: gained },
    kpi: { visitors: visitorsKpi, googleClicks: googleKpi, socialReach: reachKpi, revenue: revenueKpi },
    funnel: {
      seenOnGoogle: google ? google.impressions : null,
      visited: visitorsKpi ? visitorsKpi.value : null,
      quoteOpened: web ? web.quoteOpened : null,
      quoteSent: quotes.length,
    },
    web,
    when,
    google,
    social,
    money: moneyOut,
    reviews,
    standouts: [],
  };
  payload.standouts = standoutsFor(payload);
  return payload;
}

/* ---------------------------------------------------------------- stand-outs */

/**
 * Plain rules over the numbers — no AI, so they cost nothing and never invent
 * anything. Each rule only fires when its data exists. Best three win.
 */
export function standoutsFor(p: InsightsPayload): Standout[] {
  const out: (Standout & { score: number })[] = [];
  const f = p.funnel;
  if (f.quoteOpened && f.quoteOpened >= 10) {
    const rate = f.quoteSent / f.quoteOpened;
    if (rate < 0.3)
      out.push({
        score: 90,
        tone: 'warn',
        title: `${Math.round((1 - rate) * 100)}% leave the quote page without sending it.`,
        body: `${f.quoteOpened} opened it, ${f.quoteSent} sent it. It's the biggest place we lose customers.`,
      });
  }
  const win = p.google?.wins[0];
  if (win)
    out.push({
      score: 70,
      tone: 'info',
      title: `"${win.q}" is at position ${win.position}.`,
      body: `Seen ${win.impressions} times — one push from Google's first page.`,
    });
  const v = p.kpi.visitors;
  if (v && v.prev && v.prev >= 20) {
    const ch = Math.round(((v.value - v.prev) / v.prev) * 100);
    if (ch >= 15) out.push({ score: 60 + Math.min(ch, 30), tone: 'up', title: `Website visitors are up ${ch}%.`, body: `${v.value.toLocaleString('en-US')} vs ${v.prev.toLocaleString('en-US')} the period before.` });
    if (ch <= -15) out.push({ score: 80, tone: 'warn', title: `Website visitors are down ${Math.abs(ch)}%.`, body: `${v.value.toLocaleString('en-US')} vs ${v.prev.toLocaleString('en-US')} the period before.` });
  }
  const ig = p.web?.sources.findIndex((s) => s.label === 'Instagram') ?? -1;
  if (ig >= 0 && ig <= 2) out.push({ score: 55, tone: 'up', title: `Instagram is the #${ig + 1} way people reach the site.`, body: `${p.web!.sources[ig].value.toLocaleString('en-US')} visitors came from Instagram.` });
  if (p.money && p.money.overdueCount > 0)
    out.push({
      score: 75,
      tone: 'warn',
      title: `${p.money.overdueCount} invoice${p.money.overdueCount === 1 ? ' is' : 's are'} past due.`,
      body: `$${p.money.unpaidTotal.toLocaleString('en-US')} still owed in total — see the Money tab.`,
    });
  if (p.progress.revenue != null && p.goals.forRange.revenue > 0 && p.progress.revenue >= p.goals.forRange.revenue)
    out.push({ score: 85, tone: 'up', title: 'Revenue goal reached.', body: `$${Math.round(p.progress.revenue).toLocaleString('en-US')} against a goal of $${p.goals.forRange.revenue.toLocaleString('en-US')}.` });
  if (p.when.bestDays && p.when.bestHour != null) {
    const h = p.when.bestHour;
    out.push({ score: 40, tone: 'info', title: `Most requests come ${p.when.bestDays}.`, body: `Busiest hour is around ${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'} — post an hour before.` });
  }
  return out
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ score: _s, ...s }) => s);
}
