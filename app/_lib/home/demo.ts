import type { HomeDeps } from './build';
import type { JobberMetrics, JobberMoney } from '../jobberClient';
import type { Lead } from './leads';
import { etMidnight } from '../insights/range';

/**
 * Fake sources for local screenshots + tests. Only used when INSIGHTS_DEMO=1
 * outside production (same switch as the Insights demo) — never on the live site.
 */
const DAY = 86_400_000;
const H = 3600_000;

export function demoHomeDeps(now = Date.now()): HomeDeps {
  const t0 = etMidnight(now);
  const iso = (ms: number) => new Date(ms).toISOString();
  const visit = (id: string, start: number, title: string, client: string, city: string, team: string[], completed = false) => ({
    id, title, clientName: client, startAt: iso(start), endAt: iso(start + 3 * H), address: `1 Main St, ${city}`, team, completed,
  });
  const metrics: JobberMetrics = {
    jobsToday: 2, jobsThisWeek: 11, upcomingJobs: [], activeClientCount: 42,
    pendingInvoiceCount: 6, pendingInvoiceTotal: 980, thisWeekRevenue: 1240,
    allVisits: [
      visit('v1', t0 + 9 * H, 'Deep Cleaning', 'Megan T.', 'Lighthouse Point', ['Team A'], true),
      visit('v2', now - H, 'Regular Cleaning', 'Sandra P.', 'Boca Raton', ['Team B']),
      visit('v3', t0 + DAY + 8.5 * H, 'Move-Out Cleaning', 'Laura M.', 'Delray Beach', ['Team A']),
      visit('v4', t0 + DAY + 13 * H, 'Regular Cleaning', 'Nina R.', 'Parkland', []),
      visit('v5', t0 + 2 * DAY + 9 * H, 'Regular Cleaning', 'Greg H.', 'Boca Raton', []),
      visit('v6', t0 + 4 * DAY + 9 * H, 'Deep Cleaning', 'Ana S.', 'Coral Springs', []),
    ],
  };
  const inv = (n: number, total: number, daysOverdue: number | null) => ({
    id: `i${n}`, invoiceNumber: String(n), clientName: 'Client', status: 'awaiting_payment', issuedDate: null, dueDate: null,
    total, balance: total, paid: 0, daysOverdue,
  });
  const money: JobberMoney = {
    outstanding: [inv(1, 280, 12), inv(2, 200, 4), inv(3, 180, null), inv(4, 120, null), inv(5, 100, null), inv(6, 100, null)],
    outstandingTotal: 980, overdueTotal: 480, overdueCount: 2,
    paidThisWeek: 1240, paidLastWeek: 1050, paidThisMonth: 4200, paidLastMonth: 3900, paidThisQuarter: 11000,
    averageInvoice: 190, avgCollectionDays: 4,
    weeklyRevenue: [700, 820, 760, 980, 900, 1100, 1050, 1240].map((amount, i) => ({ key: `w${i}`, label: `W${i}`, amount, invoiceCount: 5 })),
    monthlyRevenue: [], topClients: [], invoiceCount: 40,
  };
  const leads: Lead[] = [
    { id: 'q1', kind: 'quote', subject: '', name: 'Walter P.', city: 'Pompano Beach', at: now - H, to: '' },
    { id: 's1', kind: 'social', subject: '', name: '@jess.boca', platform: 'Instagram', at: now - 3 * H, to: '' },
    { id: 'q2', kind: 'quote', subject: '', name: 'Laura M.', city: 'Delray Beach', at: now - 3 * DAY, to: '' },
    { id: 'a1', kind: 'application', subject: '', name: 'Rosa C.', city: 'Boynton Beach', at: now - 4 * DAY, to: '' },
    { id: 's2', kind: 'social', subject: '', name: 'Kevin D.', platform: 'Facebook', at: now - 5 * DAY, to: '' },
  ];
  return {
    metrics: async () => metrics,
    money: async () => money,
    leads: async () => leads,
    quotes: async () => [
      { id: 'q1', at: now - H, city: 'Pompano Beach', service: 'Deep clean' },
      { id: 'q2', at: now - 3 * DAY, city: 'Delray Beach', service: 'Regular · bi-weekly' },
      { id: 'q3', at: now - 9 * DAY, city: 'Boca Raton', service: 'Move-out' },
    ],
    convs: async () => [
      { key: 'instagram:1', platform: 'instagram', userId: '1', kind: 'dm', name: 'jess.boca', lastInboundAt: now - 3 * H, lastActivityAt: now - 3 * H, messages: [{ dir: 'in', text: 'How much for a move-out clean in Boca?', at: now - 3 * H }], tags: ['lead'] },
      { key: 'instagram:2', platform: 'instagram', userId: '2', kind: 'dm', lastInboundAt: now - 20 * H, lastActivityAt: now - 20 * H, messages: [{ dir: 'in', text: 'Do you clean offices?', at: now - 20 * H }], tags: [] },
      { key: 'facebook:3', platform: 'facebook', userId: '3', kind: 'comment', lastInboundAt: now - 2 * DAY, lastActivityAt: now - 2 * DAY, messages: [{ dir: 'in', text: 'price for 2 bed?', at: now - 2 * DAY }], tags: ['lead'] },
      { key: 'instagram:4', platform: 'instagram', userId: '4', kind: 'dm', lastInboundAt: now - DAY, lastActivityAt: now - DAY + H, messages: [{ dir: 'in', text: 'hi', at: now - DAY }, { dir: 'out', text: 'Hi!', at: now - DAY + H }], tags: [] },
    ],
    posts: async () => [
      { id: 'p1', kind: 'REEL', media: [], caption: "Before → after on a Boca kitchen that hadn't been deep cleaned in 3 years. Swipe to see the stovetop.", platforms: ['instagram', 'facebook'], scheduledAt: now + 2 * DAY, status: 'scheduled', createdAt: now - DAY, createdBy: 'demo', results: {}, history: [] },
      { id: 'p2', kind: 'POST', media: [], caption: 'Draft one', platforms: ['instagram'], scheduledAt: now + 3 * DAY, status: 'draft', createdAt: now - DAY, createdBy: 'demo', results: {}, history: [] },
      { id: 'p3', kind: 'POST', media: [], caption: 'Draft two', platforms: ['instagram'], scheduledAt: now + 5 * DAY, status: 'draft', createdAt: now - DAY, createdBy: 'demo', results: {}, history: [] },
    ],
    meta: async () => ({ pageId: '1', pageName: 'Ultra Shine Cleaning', pageToken: 'x', igUsername: 'ultrashinecleaning', connectedAt: now - DAY }),
    igInsights: async () => ({
      at: now, followers: 1284, history: [{ day: '2020-01-01', followers: 1272 }], media: [],
      days: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [new Date(now - i * DAY).toISOString().slice(0, 10), { reach: 480 }])),
    }),
    settings: async () => ({
      priceReply: { on: true, text: '' }, quoteComment: { on: true, keyword: 'QUOTE', dmText: '', publicReply: '' },
      afterHours: { on: true, text: '' }, leadTag: { on: true }, followUp: { on: true, afterHours: 3, text: '' },
      reviewRequests: { on: true, mode: 'auto' },
    }),
    reviewRequests: async () => [
      { id: 'r1', clientId: 'c1', clientName: 'Someone New', email: 'a@b.c', service: 'Deep', completedAt: now - 2 * DAY, status: 'pending' },
      { id: 'r2', clientId: 'c2', clientName: 'Someone Else', email: 'a@b.c', service: 'Deep', completedAt: now - 5 * DAY, status: 'sent', sentAt: now - 5 * DAY },
    ],
    reviewCounts: async () => ({ '2000-01-31': 17 }),
    web: async () => ({
      today: { v: 48, pv: 90, q: 7, refs: { 'google.com': 30, '': 12, 'instagram.com': 7 }, dev: {}, pages: {} },
      range: {
        timeline: [22, 30, 26, 41, 35, 44, 48].map((v, i) => ({ at: t0 - (6 - i) * DAY + 12 * H, visitors: v, pageviews: v * 2 })),
        prevTimeline: [], referrers: [], devices: [], pages: [], quoteVisitors: 20, visitors: 246, prevVisitors: null,
      },
    }),
    canEmailCustomers: false,
    canSchedule: true,
  };
}
