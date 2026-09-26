import type { Deps } from './build';
import type { VercelData } from './vercel';
import type { GscData } from './searchConsole';
import type { InsightsSnapshot } from '../social/insights';
import type { JobberMoney } from '../jobberClient';
import type { QuoteLog } from './quotes';
import type { Conversation } from '../social/types';
import { etDayKey } from '../social/time';

/**
 * FAKE sources for local testing only — so the Insights tab can be clicked
 * through before any account is connected. Used ONLY when INSIGHTS_DEMO=1 AND
 * NODE_ENV is not "production"; the API route refuses it on the live site.
 * The numbers still run through the real maths in build.ts.
 */
export function demoEnabled(): boolean {
  return process.env.INSIGHTS_DEMO === '1' && process.env.NODE_ENV !== 'production';
}

const DAY = 86_400_000;
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const wave = (i: number, base: number, amp: number) => Math.max(0, Math.round(base + Math.sin(i * 1.3) * amp + Math.cos(i * 0.7) * amp * 0.5 + i * 0.05));

export function demoDeps(): Deps {
  seed = 7;
  const now = Date.now();
  return {
    vercel: async (start, end, prevStart, monthly) => {
      const rows = (from: number, to: number, base: number) => {
        const out: VercelData['timeline'] = [];
        const step = monthly ? 30 * DAY : DAY;
        for (let t = from, i = 0; t < to; t += step, i++) {
          const v = wave(i, monthly ? base * 30 : base, monthly ? base * 4 : 6);
          out.push({ at: t + 12 * 3600_000, visitors: v, pageviews: Math.round(v * 1.6) });
        }
        return out;
      };
      const timeline = rows(start, end, 40);
      const prevTimeline = rows(prevStart, start, 34);
      const f = (end - start) / (30 * DAY);
      return {
        timeline,
        prevTimeline,
        referrers: [
          { host: 'www.google.com', visitors: Math.round(542 * f) },
          { host: '', visitors: Math.round(301 * f) },
          { host: 'l.instagram.com', visitors: Math.round(188 * f) },
          { host: 'm.facebook.com', visitors: Math.round(121 * f) },
          { host: 'maps.google.com', visitors: Math.round(86 * f) },
          { host: 'Others', visitors: Math.round(20 * f) },
        ],
        devices: [
          { device: 'mobile', visitors: Math.round(879 * f) },
          { device: 'desktop', visitors: Math.round(322 * f) },
          { device: 'tablet', visitors: Math.round(37 * f) },
        ],
        pages: [
          { path: '/', pageviews: Math.round(610 * f) },
          { path: '/quote', pageviews: Math.round(134 * f) },
          { path: '/services/deep-cleaning', pageviews: Math.round(118 * f) },
          { path: '/services/move-out-cleaning', pageviews: Math.round(96 * f) },
          { path: '/reviews', pageviews: Math.round(71 * f) },
          { path: '/admin', pageviews: 50 },
        ],
        quoteVisitors: Math.round(134 * f),
        visitors: Math.round(1238 * f),
        prevVisitors: Math.round(1049 * f) as number | null,
      };
    },
    gsc: async (start, end) => {
      const daily: GscData['daily'] = [];
      const s = Date.parse(start + 'T12:00:00Z');
      const e = Date.parse(end + 'T12:00:00Z');
      for (let t = s, i = 0; t <= e; t += DAY, i++) daily.push({ date: new Date(t).toISOString().slice(0, 10), clicks: wave(i, 6, 2), impressions: wave(i, 310, 40), position: 14 + Math.sin(i) });
      const row = (k: string[], c: number, im: number, p: number) => ({ keys: k, clicks: c, impressions: im, ctr: c / im, position: p });
      return {
        daily,
        prev: { clicks: 160, impressions: 8100, position: 16.5 },
        queries: [
          row(['house cleaning boca raton'], 48, 2210, 4.1),
          row(['ultra shine cleaning'], 41, 212, 1),
          row(['cleaning service boca raton'], 29, 1840, 6.3),
          row(['deep cleaning boca raton'], 21, 960, 5.2),
          row(['move out cleaning boca raton'], 17, 640, 7.8),
          row(['maid service delray beach'], 9, 810, 11.4),
        ],
        queryPages: [
          row(['maid service delray beach', 'https://www.ultrashinecleaningfl.com/areas/delray-beach'], 9, 810, 11.4),
          row(['airbnb cleaning boca raton', 'https://www.ultrashinecleaningfl.com/services/airbnb-cleaning'], 3, 520, 13.2),
          row(['house cleaners near me', 'https://www.ultrashinecleaningfl.com/'], 4, 1430, 16.8),
          row(['recurring cleaning boca', 'https://www.ultrashinecleaningfl.com/services/recurring-cleaning'], 1, 300, 18.1),
          row(['house cleaning boca raton', 'https://www.ultrashinecleaningfl.com/'], 48, 2210, 4.1),
        ],
        devices: [row(['MOBILE'], 141, 7000, 14), row(['DESKTOP'], 40, 2200, 13), row(['TABLET'], 5, 220, 15)],
      };
    },
    meta: async (): Promise<InsightsSnapshot> => {
      const days: NonNullable<InsightsSnapshot['days']> = {};
      const history: InsightsSnapshot['history'] = [];
      for (let i = 400; i >= 1; i--) {
        const k = etDayKey(now - i * DAY);
        days[k] = { reach: wave(i, 120, 40), likes: wave(i, 45, 15), comments: wave(i, 3, 2), saves: wave(i, 6, 3), shares: wave(i, 3, 2) };
        history.push({ day: k, followers: 1300 + Math.round((400 - i) * 0.55) });
      }
      const types = ['REELS', 'FEED', 'REELS', 'STORY', 'FEED', 'REELS', 'FEED', 'STORY'];
      return {
        at: now,
        followers: history[history.length - 1].followers,
        history,
        fbFollowers: 684,
        days,
        demographics: {
          gender: [{ key: 'F', value: 780 }, { key: 'M', value: 200 }, { key: 'U', value: 20 }],
          age: [{ key: '18-24', value: 60 }, { key: '25-34', value: 270 }, { key: '35-44', value: 310 }, { key: '45-54', value: 210 }, { key: '55-64', value: 100 }, { key: '65+', value: 50 }],
          city: [{ key: 'Boca Raton, Florida', value: 380 }, { key: 'Delray Beach, Florida', value: 140 }, { key: 'Fort Lauderdale, Florida', value: 90 }, { key: 'Boynton Beach, Florida', value: 80 }, { key: 'Miami, Florida', value: 60 }],
        },
        media: types.map((t, i) => ({
          id: `m${i}`,
          type: t,
          at: new Date(now - (i * 3 + 1) * DAY).toISOString(),
          reach: [1904, 640, 1122, 402, 580, 990, 450, 300][i],
          likes: [142, 51, 97, 18, 40, 88, 30, 9][i],
          comments: [9, 3, 7, 0, 2, 5, 1, 0][i],
        })),
      };
    },
    money: async (): Promise<JobberMoney> => {
      const clients = ['Maria T.', 'Cindy F.', 'Will B.', 'Ana S.', 'Connor R.', 'Michele C.', 'Dana K.', 'Rob L.', 'Nina P.', 'Sam W.', 'Joy M.', 'Paul R.'];
      const invoiceLite: NonNullable<JobberMoney['invoiceLite']> = [];
      for (let i = 0; i < 420; i++) {
        const at = now - Math.floor(rnd() * 400) * DAY;
        const total = [160, 180, 200, 240, 320, 420][Math.floor(rnd() * 6)];
        const recent = now - at < 12 * DAY;
        const owed = recent && rnd() < 0.35;
        invoiceLite.push({ issued: new Date(at).toISOString().slice(0, 10), total, paid: owed ? 0 : total, balance: owed ? total : 0, client: clients[Math.floor(rnd() * clients.length)], owed, overdue: owed && now - at > 8 * DAY });
      }
      return {
        outstanding: [], outstandingTotal: 0, overdueTotal: 0, overdueCount: 0, paidThisWeek: 0, paidLastWeek: 0, paidThisMonth: 0, paidLastMonth: 0,
        paidThisQuarter: 0, averageInvoice: 0, avgCollectionDays: null, weeklyRevenue: [], monthlyRevenue: [], topClients: [], invoiceCount: invoiceLite.length, invoiceLite,
      };
    },
    quotes: async (from, to): Promise<QuoteLog[]> => {
      const out: QuoteLog[] = [];
      for (let t = from, i = 0; t < to; t += DAY, i++) {
        const n = Math.floor(rnd() * 2.2);
        for (let k = 0; k < n; k++) {
          const hour = rnd() < 0.6 ? 18 + Math.floor(rnd() * 4) : 8 + Math.floor(rnd() * 9);
          out.push({ id: `q${i}-${k}`, at: t + hour * 3600_000 + 4 * 3600_000, city: 'Boca Raton', source: rnd() < 0.2 ? 'Instagram' : 'Google Search' });
        }
      }
      return out;
    },
    convs: async (): Promise<Conversation[]> =>
      Array.from({ length: 14 }, (_, i) => ({
        key: `instagram:${i}`,
        platform: 'instagram' as const,
        userId: String(i),
        kind: 'dm' as const,
        lastInboundAt: now - i * 2 * DAY,
        lastActivityAt: now - i * 2 * DAY,
        messages: [{ dir: 'in' as const, text: 'price?', at: now - i * 2 * DAY - 3 * 3600_000 }],
        tags: [],
      })),
    reviewRequests: async () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: `r${i}`,
        clientId: `c${i}`,
        clientName: i < 3 ? ['Cindy Finley', 'Maria Torbica', 'Michele Cavalieri'][i] : `Client ${i}`,
        email: 'x@example.com',
        service: 'cleaning',
        completedAt: now - i * 2 * DAY,
        status: i === 11 ? ('pending' as const) : ('sent' as const),
        sentAt: now - i * 2 * DAY,
      })),
    goals: async () => null,
    reviewCounts: async (today, count) => ({ [etDayKey(now - 40 * DAY)]: count - 5, [etDayKey(now - 10 * DAY)]: count - 2, [today]: count }),
  };
}
