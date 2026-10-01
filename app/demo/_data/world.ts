import type { JobberClient, JobberMetrics, JobberMoney, JobberVisit, RevenueBucket } from '../../_lib/jobberClient';
import type { LeadRecord } from '../../_lib/leads/types';
import type { Lead } from '../../_lib/home/leads';
import type { QuoteLog } from '../../_lib/insights/quotes';
import type { VDay, VercelData } from '../../_lib/insights/vercel';
import type { GscData } from '../../_lib/insights/searchConsole';
import type { InsightsSnapshot } from '../../_lib/social/insights';
import type { IgDay, IgMediaStat } from '../../_lib/social/meta';
import type { Goals } from '../../_lib/insights/types';
import { DEFAULT_SETTINGS, type AutomationSettings, type Conversation, type Platform, type PostKind, type ReviewRequest, type SocialPost } from '../../_lib/social/types';
import { etDayKey, etParts, etToMs } from '../../_lib/social/time';

/**
 * The fake cleaning business behind /demo.
 *
 * Every person, phone number, address and number here is invented: names are
 * made up, phones are in the 555-01xx range, emails are @example.com. Nothing
 * is read from Jobber, Redis, Meta, Resend, Vercel or Search Console.
 * Everything is built relative to `now`, so the demo never looks stale.
 */

const H = 3600_000;
const DAY = 86_400_000;

/* --------------------------------------------------------------- helpers */

function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Florida midnight of the day `ms` falls in. */
const midnight = (ms: number) => {
  const p = etParts(ms);
  return etToMs(p.y, p.m, p.d, 0);
};
/** Florida wall-clock time `h` on the day `offset` days from the day of `ms`. */
const at = (ms: number, offset: number, h: number) => {
  const p = etParts(ms);
  const d = new Date(Date.UTC(p.y, p.m - 1, p.d + offset, 12));
  const hh = Math.floor(h);
  return etToMs(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), hh, Math.round((h - hh) * 60));
};
const iso = (ms: number) => new Date(ms).toISOString();
const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');
const b64 = (n: number) => Buffer.from(`gid://Jobber/Client/${4810 + n}`).toString('base64');

/* --------------------------------------------------------------- clients */

type Client = {
  n: number;
  name: string;
  company?: boolean;
  street: string;
  city: string;
  /** 7 / 14 / 28 = recurring every N days; 0 = one-time job. */
  every: 7 | 14 | 28 | 0;
  price: number;
  /** Day of week (0 Sun … 6 Sat) and Florida start hour. */
  dow: number;
  hour: number;
  hours: number;
  team: string;
  title: string;
  /** Months since they became a client. */
  monthsAgo: number;
  /** One-time jobs: the day offset from today the job is/was on. */
  oneOffDay?: number;
  home?: { bedrooms: number; bathrooms: number; sqft: number; pets?: string; notes?: string };
};

const CLIENTS: Client[] = [
  { n: 1, name: 'Jennifer Caldwell', street: '2140 NW 5th Ave', city: 'Boca Raton', every: 7, price: 165, dow: 1, hour: 8.5, hours: 3, team: 'Team A', title: 'Weekly Cleaning', monthsAgo: 26, home: { bedrooms: 3, bathrooms: 2, sqft: 1850, pets: '1 cat', notes: 'Key in the lockbox, code 2468. Fragile vases on the living room shelf.' } },
  { n: 2, name: 'Rebecca Hartman', street: '771 Spanish River Blvd', city: 'Boca Raton', every: 14, price: 185, dow: 1, hour: 13, hours: 3, team: 'Team A', title: 'Bi-Weekly Cleaning', monthsAgo: 22 },
  { n: 3, name: 'Daniel Okafor', street: '318 Seabreeze Ave', city: 'Delray Beach', every: 14, price: 210, dow: 2, hour: 8.5, hours: 3, team: 'Team B', title: 'Bi-Weekly Cleaning', monthsAgo: 19, home: { bedrooms: 4, bathrooms: 3, sqft: 2600, pets: '2 dogs, friendly' } },
  { n: 4, name: 'Lisa Brennan', street: '6021 Heron Bay Way', city: 'Parkland', every: 14, price: 240, dow: 2, hour: 9, hours: 3.5, team: 'Team A', title: 'Bi-Weekly Cleaning', monthsAgo: 17 },
  { n: 5, name: 'Stephanie Russo', street: '4410 Coral Ridge Dr', city: 'Coral Springs', every: 28, price: 225, dow: 3, hour: 13, hours: 3, team: 'Team B', title: 'Monthly Cleaning', monthsAgo: 15 },
  { n: 6, name: 'Michael Goldberg', street: '1905 Boca Club Blvd', city: 'Boca Raton', every: 7, price: 190, dow: 3, hour: 8.5, hours: 3, team: 'Team A', title: 'Weekly Cleaning', monthsAgo: 24, home: { bedrooms: 3, bathrooms: 2.5, sqft: 2100, notes: 'Home office is off limits. Use the unscented products.' } },
  { n: 7, name: 'Karen Whitfield', street: '88 Ocean Pines Ter', city: 'Boynton Beach', every: 14, price: 170, dow: 4, hour: 8.5, hours: 2.5, team: 'Team B', title: 'Bi-Weekly Cleaning', monthsAgo: 12 },
  { n: 8, name: 'Priya Nair', street: '11520 Lakeview Dr', city: 'Parkland', every: 14, price: 255, dow: 4, hour: 13, hours: 3.5, team: 'Team A', title: 'Bi-Weekly Cleaning', monthsAgo: 11, home: { bedrooms: 5, bathrooms: 4, sqft: 3400, pets: '1 dog' } },
  { n: 9, name: 'Diane Keller', street: '240 SE 12th Ave', city: 'Deerfield Beach', every: 28, price: 180, dow: 5, hour: 13, hours: 3, team: 'Team B', title: 'Monthly Cleaning', monthsAgo: 14 },
  { n: 10, name: 'Amanda Pierce', street: '505 NE 7th St', city: 'Delray Beach', every: 7, price: 160, dow: 5, hour: 8.5, hours: 2.5, team: 'Team A', title: 'Weekly Cleaning', monthsAgo: 9 },
  { n: 11, name: 'Carlos Mendez', street: '3320 NW 2nd Ave', city: 'Boca Raton', every: 14, price: 195, dow: 1, hour: 9, hours: 3, team: 'Team B', title: 'Bi-Weekly Cleaning', monthsAgo: 8 },
  { n: 12, name: 'Rachel Levin', street: '17 Via Palmas', city: 'Boca Raton', every: 14, price: 260, dow: 2, hour: 13, hours: 3.5, team: 'Team B', title: 'Bi-Weekly Cleaning', monthsAgo: 7, home: { bedrooms: 4, bathrooms: 3.5, sqft: 3100, notes: 'Gate code 1357. Park in the driveway, not the street.' } },
  { n: 13, name: 'Heather Collins', street: '9870 Wiles Rd', city: 'Coral Springs', every: 14, price: 175, dow: 3, hour: 9, hours: 3, team: 'Team B', title: 'Bi-Weekly Cleaning', monthsAgo: 6 },
  { n: 14, name: 'Nicole Brandt', street: '1402 Gateway Blvd', city: 'Boynton Beach', every: 28, price: 200, dow: 6, hour: 8, hours: 3, team: 'Team A', title: 'Monthly Cleaning', monthsAgo: 5 },
  { n: 15, name: 'Gregory Walsh', street: '66 Hillsboro Blvd', city: 'Deerfield Beach', every: 14, price: 150, dow: 4, hour: 9, hours: 2.5, team: 'Team B', title: 'Bi-Weekly Cleaning', monthsAgo: 4 },
  { n: 16, name: 'Samantha Reyes', street: '7780 Parkside Dr', city: 'Parkland', every: 7, price: 230, dow: 5, hour: 12.5, hours: 3.5, team: 'Team B', title: 'Weekly Cleaning', monthsAgo: 4, home: { bedrooms: 4, bathrooms: 3, sqft: 2900, pets: '1 dog (stays in the yard)' } },
  { n: 17, name: 'Brian Foster', street: '215 Lake Ida Rd', city: 'Delray Beach', every: 14, price: 185, dow: 6, hour: 11.5, hours: 3, team: 'Team A', title: 'Bi-Weekly Cleaning', monthsAgo: 3 },
  { n: 18, name: 'Olivia Grant', street: '930 Glades Rd', city: 'Boca Raton', every: 14, price: 215, dow: 4, hour: 13.5, hours: 3, team: 'Team B', title: 'Bi-Weekly Cleaning', monthsAgo: 2 },
  { n: 19, name: 'Coastal Realty Group', company: true, street: '1 Mizner Park, Suite 210', city: 'Boca Raton', every: 7, price: 245, dow: 1, hour: 17.5, hours: 2.5, team: 'Team B', title: 'Office Cleaning', monthsAgo: 16 },
  { n: 20, name: 'Palm Dental Studio', company: true, street: '4800 Linton Blvd, Suite 102', city: 'Delray Beach', every: 7, price: 220, dow: 6, hour: 14, hours: 2.5, team: 'Team B', title: 'Office Cleaning', monthsAgo: 10 },
  { n: 21, name: 'Kevin Marsh', street: '3150 University Dr', city: 'Coral Springs', every: 0, price: 480, dow: 0, hour: 9, hours: 5, team: 'Team A', title: 'Move-Out Cleaning', monthsAgo: 1, oneOffDay: -18 },
  { n: 22, name: 'Laura Bianchi', street: '2601 NW 29th St', city: 'Boca Raton', every: 0, price: 395, dow: 0, hour: 9, hours: 4.5, team: 'Team A', title: 'Deep Cleaning', monthsAgo: 0, oneOffDay: -4 },
  { n: 23, name: 'Jason Whitaker', street: '410 NE 22nd Ave', city: 'Boynton Beach', every: 0, price: 360, dow: 0, hour: 9, hours: 4, team: '', title: 'Deep Cleaning', monthsAgo: 0, oneOffDay: 3 },
  { n: 25, name: 'Vanessa Cole', street: '6650 Via Regina', city: 'Boca Raton', every: 7, price: 175, dow: 2, hour: 13.5, hours: 3, team: 'Team A', title: 'Weekly Cleaning', monthsAgo: 6 },
  { n: 26, name: 'Hannah Weiss', street: '5905 NW 70th Way', city: 'Parkland', every: 7, price: 205, dow: 4, hour: 8.5, hours: 3, team: 'Team A', title: 'Weekly Cleaning', monthsAgo: 3 },
  { n: 27, name: 'Jessica Tran', street: '3601 Sample Rd', city: 'Coral Springs', every: 14, price: 180, dow: 3, hour: 13.5, hours: 3, team: 'Team A', title: 'Bi-Weekly Cleaning', monthsAgo: 5 },
  { n: 28, name: 'Paul & Erin Novak', street: '1122 SW 8th St', city: 'Boynton Beach', every: 14, price: 195, dow: 5, hour: 13, hours: 3, team: 'Team A', title: 'Bi-Weekly Cleaning', monthsAgo: 9 },
  { n: 29, name: 'Grace Holloway', street: '6140 NW 62nd Ter', city: 'Parkland', every: 0, price: 420, dow: 0, hour: 9, hours: 4.5, team: 'Team B', title: 'Deep Cleaning', monthsAgo: 0, oneOffDay: -2 },
  { n: 24, name: 'Monica Alvarez', street: '1200 SE 3rd Ct', city: 'Deerfield Beach', every: 0, price: 590, dow: 0, hour: 8.5, hours: 6, team: 'Team A', title: 'Post-Construction Cleaning', monthsAgo: 1, oneOffDay: -23 },
];

const phoneOf = (c: Client) => {
  const broward = ['Parkland', 'Coral Springs', 'Deerfield Beach', 'Pompano Beach'].includes(c.city);
  return `(${broward ? '954' : '561'}) 555-01${String(c.n).padStart(2, '0')}`;
};
const emailOf = (c: Client) => (c.company ? `office@${slug(c.name).replace(/\./g, '')}.example.com` : `${slug(c.name)}@example.com`);

/** People who have left a Google review (all invented) — drives the "Reviewed" marks. */
export const DEMO_REVIEWERS = ['Rebecca Hartman', 'Daniel Okafor', 'Priya Nair', 'Amanda Pierce', 'Olivia Grant', 'Michael Goldberg', 'Stephanie Russo', 'Monica Alvarez', 'Kevin Marsh'];
export const demoReviewed = (name: string) => DEMO_REVIEWERS.includes(name.trim());
export const DEMO_RATING = 5.0;
export const DEMO_REVIEW_COUNT = 64;

export const DEMO_GOALS: Goals = { quotes: 40, jobs: 60, revenue: 12000, reviews: 6 };

/* ---------------------------------------------------------------- world */

export type DemoWorld = ReturnType<typeof buildWorld>;

export function buildWorld(now = Date.now()) {
  const today0 = midnight(now);
  const tp = etParts(now);
  const monthStart = etToMs(tp.y, tp.m, 1, 0);

  /* ---------- visits (13 months back → 92 days ahead) ---------- */
  type V = JobberVisit & { price: number; client: Client; start: number };
  const all: V[] = [];
  const EPOCH = Date.UTC(2020, 0, 5, 12); // a Sunday
  // Bi-weekly clients on the same weekday alternate weeks, so every day has a steady load.
  const phaseOf = new Map<number, number>();
  const perDow: Record<number, number> = {};
  for (const c of CLIENTS) {
    if (c.every === 14) phaseOf.set(c.n, (perDow[c.dow] = (perDow[c.dow] ?? -1) + 1) % 2);
    else if (c.every === 28) phaseOf.set(c.n, c.n % 4);
  }
  // Florida calendar days from 400 back to 92 ahead (plain date maths on noon UTC, no time zone lookups).
  const noon0 = Date.UTC(tp.y, tp.m - 1, tp.d, 12);
  const calendar = Array.from({ length: 493 }, (_, i) => {
    const off = i - 400;
    const dt = new Date(noon0 + off * DAY);
    return { off, y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), dow: dt.getUTCDay(), week: Math.floor((noon0 + off * DAY - EPOCH) / (7 * DAY)) };
  });
  for (const c of CLIENTS) {
    if (c.every === 0) {
      const start = at(now, c.oneOffDay!, c.hour);
      all.push(mk(c, start));
      continue;
    }
    const since = now - c.monthsAgo * 30.4 * DAY;
    const from = Math.max(since, now - 400 * DAY);
    const phase = phaseOf.get(c.n) ?? 0;
    const fromOff = Math.floor((from - now) / DAY);
    for (const x of calendar) {
      if (x.off < fromOff || x.dow !== c.dow || x.week % (c.every / 7) !== phase) continue;
      const hh = Math.floor(c.hour);
      all.push(mk(c, etToMs(x.y, x.m, x.d, hh, Math.round((c.hour - hh) * 60))));
    }
  }
  function mk(c: Client, start: number): V {
    const end = start + c.hours * H;
    return {
      id: `v${c.n}-${start}`,
      title: c.title,
      clientName: c.name,
      startAt: iso(start),
      endAt: iso(end),
      address: `${c.street}, ${c.city}`,
      team: c.team ? [c.team] : [],
      completed: end < now,
      price: c.price,
      client: c,
      start,
    };
  }
  all.sort((a, b) => a.start - b.start);

  // A flag for the Schedule tab: one more upcoming visit with nobody on it yet.
  const heatherNext = all.find((v) => v.client.n === 13 && v.start > now + 5 * DAY && v.start < now + 14 * DAY);
  if (heatherNext) heatherNext.team = [];

  const strip = (v: V): JobberVisit => ({ id: v.id, title: v.title, clientName: v.clientName, startAt: v.startAt, endAt: v.endAt, address: v.address, team: v.team, completed: v.completed });
  const visits: JobberVisit[] = all.filter((v) => v.start >= monthStart - 7 * DAY).map(strip);

  /* ---------- invoices ---------- */
  const r = rng(4242);
  type Inv = { id: string; num: number; client: string; issued: number; total: number; paid: number; balance: number; due: number };
  const invoices: Inv[] = [];
  let num = 1180;
  for (const v of all) {
    if (v.start > now) continue;
    const total = v.price + (r() < 0.07 ? 35 : 0);
    invoices.push({ id: `inv${num}`, num: num++, client: v.clientName, issued: v.start, total, paid: total, balance: 0, due: v.start + 7 * DAY });
  }
  // Some recent invoices are still open — most are not due yet, two are late.
  const owe = (client: string, daysAgo: number) => {
    const inv = invoices
      .filter((i) => i.client === client)
      .sort((a, b) => Math.abs(now - a.issued - daysAgo * DAY) - Math.abs(now - b.issued - daysAgo * DAY))[0];
    if (inv) {
      inv.paid = 0;
      inv.balance = inv.total;
    }
  };
  owe('Carlos Mendez', 19);
  owe('Karen Whitfield', 12);
  owe('Laura Bianchi', 4);
  owe('Coastal Realty Group', 1);
  invoices.sort((a, b) => a.issued - b.issued);

  const daysOverdue = (i: Inv) => Math.round((today0 - midnight(i.due)) / DAY);
  const owed = invoices.filter((i) => i.balance > 0);
  const outstanding = owed
    .map((i) => ({
      id: i.id,
      invoiceNumber: String(i.num),
      clientName: i.client,
      status: daysOverdue(i) > 0 ? 'past_due' : 'awaiting_payment',
      issuedDate: iso(i.issued),
      dueDate: iso(i.due),
      total: i.total,
      balance: i.balance,
      paid: i.paid,
      daysOverdue: daysOverdue(i),
    }))
    .sort((a, b) => (b.daysOverdue ?? -9999) - (a.daysOverdue ?? -9999));

  const paidBetween = (a: number, b: number) => invoices.reduce((s, i) => (i.issued >= a && i.issued < b ? s + i.paid : s), 0);
  const weekStart = at(now, -tp.dow, 0);
  // "This week" = the last 7 days, so a Monday morning never reads as a collapse.
  const weeklyRevenue: RevenueBucket[] = [];
  for (let w = 7; w >= 0; w--) {
    const from = now - (w + 1) * 7 * DAY;
    const to = from + 7 * DAY;
    const b = invoices.filter((i) => i.issued >= from && i.issued < to && i.paid > 0);
    weeklyRevenue.push({
      key: iso(from).slice(0, 10),
      label: new Date(from + 12 * H).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' }),
      amount: b.reduce((s, i) => s + i.paid, 0),
      invoiceCount: b.length,
    });
  }
  const monthlyRevenue: RevenueBucket[] = [];
  for (let m = 11; m >= 0; m--) {
    let y = tp.y;
    let mo = tp.m - m;
    while (mo < 1) {
      mo += 12;
      y -= 1;
    }
    const from = etToMs(y, mo, 1, 0);
    const to = mo === 12 ? etToMs(y + 1, 1, 1, 0) : etToMs(y, mo + 1, 1, 0);
    const b = invoices.filter((i) => i.issued >= from && i.issued < to && i.paid > 0);
    monthlyRevenue.push({
      key: `${y}-${String(mo).padStart(2, '0')}`,
      label: new Date(Date.UTC(y, mo - 1, 15)).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      amount: b.reduce((s, i) => s + i.paid, 0),
      invoiceCount: b.length,
    });
  }
  const yearAgo = now - 365 * DAY;
  const byClient = new Map<string, { total: number; invoiceCount: number }>();
  for (const i of invoices) {
    if (i.issued < yearAgo) continue;
    const cur = byClient.get(i.client) ?? { total: 0, invoiceCount: 0 };
    cur.total += i.total;
    cur.invoiceCount += 1;
    byClient.set(i.client, cur);
  }
  const inYear = invoices.filter((i) => i.issued >= yearAgo);
  const qStart = etToMs(tp.y, Math.floor((tp.m - 1) / 3) * 3 + 1, 1, 0);
  const nextMonth = tp.m === 12 ? etToMs(tp.y + 1, 1, 1, 0) : etToMs(tp.y, tp.m + 1, 1, 0);
  const lastMonth = tp.m === 1 ? etToMs(tp.y - 1, 12, 1, 0) : etToMs(tp.y, tp.m - 1, 1, 0);
  const money: JobberMoney = {
    outstanding,
    outstandingTotal: owed.reduce((s, i) => s + i.balance, 0),
    overdueTotal: outstanding.filter((i) => (i.daysOverdue ?? 0) > 0).reduce((s, i) => s + i.balance, 0),
    overdueCount: outstanding.filter((i) => (i.daysOverdue ?? 0) > 0).length,
    paidThisWeek: paidBetween(now - 7 * DAY, now + 1),
    paidLastWeek: paidBetween(now - 14 * DAY, now - 7 * DAY),
    paidThisMonth: paidBetween(monthStart, nextMonth),
    // Same point last month, so early in a month the comparison stays fair.
    paidLastMonth: paidBetween(lastMonth, Math.min(monthStart, lastMonth + (now - monthStart))),
    paidThisQuarter: paidBetween(qStart, nextMonth),
    averageInvoice: Math.round(inYear.reduce((s, i) => s + i.total, 0) / Math.max(1, inYear.length)),
    avgCollectionDays: 3,
    weeklyRevenue,
    monthlyRevenue,
    topClients: Array.from(byClient.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
    invoiceCount: inYear.length,
    invoiceLite: invoices.map((i) => ({
      issued: iso(i.issued),
      total: i.total,
      paid: i.paid,
      balance: i.balance,
      client: i.client,
      owed: i.balance > 0,
      overdue: i.balance > 0 && daysOverdue(i) > 0,
    })),
  };

  /* ---------- Jobber metrics (Home / Clients) ---------- */
  const future = all.filter((v) => v.start >= today0);
  const metrics: JobberMetrics = {
    jobsToday: all.filter((v) => v.start >= today0 && v.start < today0 + DAY).length,
    jobsThisWeek: all.filter((v) => v.start >= weekStart && v.start < at(weekStart, 7, 0)).length,
    upcomingJobs: future.slice(0, 12).map(strip),
    allVisits: visits,
    activeClientCount: CLIENTS.length,
    pendingInvoiceCount: owed.length,
    pendingInvoiceTotal: money.outstandingTotal,
    thisWeekRevenue: money.paidThisWeek,
  };

  const recentJobs = all
    .filter((v) => v.completed && v.start > now - 7 * DAY)
    .sort((a, b) => b.start - a.start)
    .map((v) => ({ title: v.title, city: v.client.city, completedAt: v.start + v.client.hours * H, clientName: v.clientName }));

  /* ---------- Jobber clients + jobs (Clients tab) ---------- */
  const jobberClients: JobberClient[] = CLIENTS.map((c) => ({
    id: b64(c.n),
    name: c.name,
    companyName: c.company ? c.name : null,
    isCompany: !!c.company,
    email: emailOf(c),
    phone: phoneOf(c),
    address: c.street,
    city: c.city,
    createdAt: iso(c.every === 0 ? now + (c.oneOffDay! - 9) * DAY : now - c.monthsAgo * 30.4 * DAY - c.n * DAY),
  }));
  const jobs = CLIENTS.map((c) => ({
    id: `j${c.n}`,
    title: c.title,
    type: c.every ? 'RECURRING' : 'ONE_OFF',
    status: c.every || (c.oneOffDay ?? 0) > 0 ? 'upcoming' : 'archived',
    total: c.price,
    clientId: b64(c.n),
    createdAt: iso(now - c.monthsAgo * 30.4 * DAY),
    recurrence: c.every === 7 ? 'Every week' : c.every === 14 ? 'Every 2 weeks' : c.every === 28 ? 'Every 4 weeks' : null,
    lineItems: [{ name: c.title, unitPrice: c.price }],
  }));
  const homes: Record<string, { bedrooms: number | null; bathrooms: number | null; sqft: number | null; pets: string | null; notes: string | null } | null> = {};
  for (const c of CLIENTS) {
    if (c.home) homes[b64(c.n)] = { bedrooms: c.home.bedrooms, bathrooms: c.home.bathrooms, sqft: c.home.sqft, pets: c.home.pets ?? null, notes: c.home.notes ?? null };
  }

  /* ---------- leads ---------- */
  const M = 60_000;
  const hist = (t: number, ...rest: [number, string][]) => [{ at: t, text: 'Quote request received' }, { at: t + 5000, text: 'Office email sent' }, ...rest.map(([a, text]) => ({ at: a, text }))];
  const L = (x: Partial<LeadRecord> & { id: string; at: number; name: string }): LeadRecord => ({
    kind: 'quote',
    stage: 'new',
    stageAt: x.at,
    origin: 'form',
    history: hist(x.at),
    ...x,
  });
  const leads: LeadRecord[] = [
    L({
      id: 'q101', at: now - 42 * M, name: 'Ashley Donovan', phone: '5615550142', email: 'ashley.donovan@example.com', service: 'Deep Cleaning', frequency: 'One-time',
      estimate: '$340 – $410', bedrooms: 3, bathrooms: 2.5, sqft: 2100, floors: 2, street: '2217 NW 35th St', city: 'Boca Raton', zip: '33431',
      addOns: ['Inside oven', 'Inside fridge'], notes: 'Hosting family for the holidays — would love it spotless before the 20th. We have a friendly golden retriever.', heardFrom: 'Google Search',
    }),
    { id: 'soc_ig_101', kind: 'social', at: now - 2 * H - 10 * M, name: '@boca.mama.of3', platform: 'instagram', convKey: 'instagram:101', city: 'Boca Raton',
      lastMessage: 'Hi! How much for a biweekly clean? 4 bed 3 bath in Boca', stage: 'new', stageAt: now - 2 * H - 10 * M, origin: 'social',
      history: [{ at: now - 2 * H - 10 * M, text: 'Messaged on Instagram' }, { at: now - 2 * H - 9 * M, text: 'Auto-reply sent with the quote link' }] },
    L({
      id: 'q102', at: now - 5 * H - 20 * M, name: 'Robert Klein', phone: '5615550157', email: 'robert.klein@example.com', service: 'Regular Cleaning', frequency: 'Bi-weekly',
      estimate: '$190 – $230', bedrooms: 3, bathrooms: 2, sqft: 1850, street: '1030 Palm Trail', city: 'Delray Beach', zip: '33483', heardFrom: 'Google Maps',
      notes: 'Tuesdays or Wednesdays work best.',
    }),
    { id: 'soc_ig_105', kind: 'social', at: now - 20 * H, name: '@coral.springs.realtor', platform: 'instagram', convKey: 'instagram:105', city: 'Coral Springs',
      lastMessage: 'Do you do move-out cleans for listings? I have 3 closings this month', stage: 'new', stageAt: now - 20 * H, origin: 'social',
      history: [{ at: now - 20 * H, text: 'Messaged on Instagram' }] },
    L({
      id: 'q103', at: now - 1 * DAY - 3 * H, name: 'Melissa Ortiz', phone: '9545550163', email: 'melissa.ortiz@example.com', service: 'Move-Out Cleaning', frequency: 'One-time',
      estimate: '$420 – $520', bedrooms: 4, bathrooms: 3, sqft: 2700, street: '8120 Lake Cypress Cir', city: 'Parkland', zip: '33076', heardFrom: 'Referral',
      stage: 'contacted', stageAt: now - 1 * DAY - 3 * H + 22 * M, contactedAt: now - 1 * DAY - 3 * H + 22 * M,
      history: hist(now - 1 * DAY - 3 * H, [now - 1 * DAY - 3 * H + 22 * M, 'Moved to Contacted']), ownerNotes: 'Called — walkthrough Thursday 4pm. Closing is on the 28th.',
    }),
    { id: 'soc_fb_201', kind: 'social', at: now - 2 * DAY - 4 * H, name: 'Denise Carter', platform: 'facebook', convKey: 'facebook:201', city: 'Coconut Creek',
      lastMessage: 'Do you do move-in cleans? Closing on the 15th', stage: 'quoted', stageAt: now - 2 * DAY, contactedAt: now - 2 * DAY - 3 * H, origin: 'social',
      history: [{ at: now - 2 * DAY - 4 * H, text: 'Commented on Facebook' }, { at: now - 2 * DAY - 3 * H, text: 'Moved to Contacted' }, { at: now - 2 * DAY, text: 'Moved to Quoted' }] },
    L({
      id: 'q104', at: now - 3 * DAY - 2 * H, name: 'Steven Park', phone: '9545550171', email: 'steven.park@example.com', service: 'Regular Cleaning', frequency: 'Weekly',
      estimate: '$160 – $190', bedrooms: 2, bathrooms: 2, sqft: 1400, street: '2905 Riverside Dr', city: 'Coral Springs', zip: '33065', heardFrom: 'Instagram',
      stage: 'quoted', stageAt: now - 3 * DAY + 2 * H, contactedAt: now - 3 * DAY - 2 * H + 35 * M,
      history: hist(now - 3 * DAY - 2 * H, [now - 3 * DAY - 2 * H + 35 * M, 'Moved to Contacted'], [now - 3 * DAY + 2 * H, 'Moved to Quoted']), ownerNotes: 'Sent $175/visit. Follow up Friday.',
    }),
    L({
      id: 'q105', at: now - 6 * DAY - 5 * H, name: 'Laura Bianchi', phone: '5615550122', email: 'laura.bianchi@example.com', service: 'Deep Cleaning', frequency: 'One-time',
      estimate: '$360 – $420', bedrooms: 3, bathrooms: 2, sqft: 1950, street: '2601 NW 29th St', city: 'Boca Raton', zip: '33434', heardFrom: 'Google Search',
      stage: 'booked', stageAt: now - 6 * DAY + 1 * H, contactedAt: now - 6 * DAY - 5 * H + 18 * M,
      history: hist(now - 6 * DAY - 5 * H, [now - 6 * DAY - 5 * H + 18 * M, 'Moved to Contacted'], [now - 6 * DAY + 1 * H, 'Moved to Booked']),
    }),
    L({
      id: 'q106', at: now - 8 * DAY - 2 * H, name: 'Jason Whitaker', phone: '5615550123', email: 'jason.whitaker@example.com', service: 'Deep Cleaning', frequency: 'One-time',
      estimate: '$330 – $390', bedrooms: 3, bathrooms: 2, sqft: 1700, street: '410 NE 22nd Ave', city: 'Boynton Beach', zip: '33435', heardFrom: 'Facebook',
      stage: 'booked', stageAt: now - 7 * DAY, contactedAt: now - 8 * DAY - 2 * H + 41 * M,
      history: hist(now - 8 * DAY - 2 * H, [now - 8 * DAY - 2 * H + 41 * M, 'Moved to Contacted'], [now - 7 * DAY, 'Moved to Booked']),
    }),
    L({
      id: 'q107', at: now - 9 * DAY - 6 * H, name: 'Natalie Brooks', phone: '9545550184', service: 'Regular Cleaning', frequency: 'Monthly',
      estimate: '$170 – $210', bedrooms: 2, bathrooms: 2, sqft: 1300, city: 'Deerfield Beach', heardFrom: 'Nextdoor',
      stage: 'contacted', stageAt: now - 9 * DAY - 5 * H, contactedAt: now - 9 * DAY - 5 * H,
      history: hist(now - 9 * DAY - 6 * H, [now - 9 * DAY - 5 * H, 'Moved to Contacted']), ownerNotes: 'Left a voicemail. Try again after 5pm.',
    }),
    L({
      id: 'q108', at: now - 12 * DAY - 1 * H, name: 'Frank Dillon', phone: '5615550191', service: 'Post-Construction Cleaning', frequency: 'One-time',
      estimate: '$600 – $750', sqft: 2400, city: 'Boynton Beach', heardFrom: 'Google Search',
      stage: 'lost', stageAt: now - 10 * DAY, contactedAt: now - 12 * DAY - 1 * H + 50 * M,
      history: hist(now - 12 * DAY - 1 * H, [now - 12 * DAY - 1 * H + 50 * M, 'Moved to Contacted'], [now - 10 * DAY, 'Moved to Lost']), ownerNotes: 'Went with the builder’s crew.',
    }),
    { id: 'soc_ig_109', kind: 'social', at: now - 14 * DAY, name: '@parkland.home', platform: 'instagram', convKey: 'instagram:109', city: 'Parkland',
      lastMessage: 'Need a deep clean before we list the house — next week possible?', stage: 'booked', stageAt: now - 13 * DAY, contactedAt: now - 14 * DAY + 14 * M, origin: 'social',
      history: [{ at: now - 14 * DAY, text: 'Messaged on Instagram' }, { at: now - 13 * DAY, text: 'Moved to Booked' }] },
    L({
      id: 'q110', at: now - 16 * DAY - 3 * H, name: 'Tiffany Hughes', phone: '5615550195', email: 'tiffany.hughes@example.com', service: 'Regular Cleaning', frequency: 'Bi-weekly',
      estimate: '$200 – $240', bedrooms: 4, bathrooms: 2.5, sqft: 2400, city: 'Boca Raton', heardFrom: 'Instagram',
      stage: 'quoted', stageAt: now - 15 * DAY, contactedAt: now - 16 * DAY - 3 * H + 26 * M,
      history: hist(now - 16 * DAY - 3 * H, [now - 16 * DAY - 3 * H + 26 * M, 'Moved to Contacted'], [now - 15 * DAY, 'Moved to Quoted']),
    }),
    L({
      id: 'q111', at: now - 19 * DAY - 2 * H, name: 'Kevin Marsh', phone: '9545550121', email: 'kevin.marsh@example.com', service: 'Move-Out Cleaning', frequency: 'One-time',
      estimate: '$450 – $540', bedrooms: 4, bathrooms: 3, sqft: 2500, street: '3150 University Dr', city: 'Coral Springs', zip: '33065', heardFrom: 'Google Search',
      stage: 'booked', stageAt: now - 19 * DAY + 3 * H, contactedAt: now - 19 * DAY - 2 * H + 12 * M,
      history: hist(now - 19 * DAY - 2 * H, [now - 19 * DAY - 2 * H + 12 * M, 'Moved to Contacted'], [now - 19 * DAY + 3 * H, 'Moved to Booked']),
    }),
    L({
      id: 'q112', at: now - 24 * DAY - 4 * H, name: 'Mark Sullivan', phone: '5615550198', service: 'Deep Cleaning', frequency: 'One-time',
      estimate: '$300 – $360', bedrooms: 3, bathrooms: 2, city: 'Delray Beach', heardFrom: 'Yelp',
      stage: 'lost', stageAt: now - 23 * DAY, contactedAt: now - 24 * DAY - 4 * H + 30 * M,
      history: hist(now - 24 * DAY - 4 * H, [now - 24 * DAY - 4 * H + 30 * M, 'Moved to Contacted'], [now - 23 * DAY, 'Moved to Lost']), ownerNotes: 'Needed it same-day — we were fully booked.',
    }),
    { id: 'a101', kind: 'application', at: now - 2 * DAY - 7 * H, name: 'Rosa Delgado', phone: '5615550131', email: 'rosa.delgado@example.com', city: 'Boynton Beach',
      language: 'English, Spanish', experience: '4 years', ownTransport: true, usAuthorized: true, availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      stage: 'new', stageAt: now - 2 * DAY - 7 * H, origin: 'form', history: [{ at: now - 2 * DAY - 7 * H, text: 'Application received' }] },
    { id: 'a102', kind: 'application', at: now - 6 * DAY - 2 * H, name: 'Luciana Ferreira', phone: '9545550136', city: 'Deerfield Beach',
      language: 'Portuguese, English', experience: '2 years', ownTransport: true, usAuthorized: true, availableDays: ['Mon', 'Wed', 'Fri', 'Sat'],
      stage: 'contacted', stageAt: now - 5 * DAY, origin: 'form', history: [{ at: now - 6 * DAY - 2 * H, text: 'Application received' }, { at: now - 5 * DAY, text: 'Moved to Contacted' }] },
    { id: 'a103', kind: 'application', at: now - 10 * DAY - 4 * H, name: 'Tamika Johnson', email: 'tamika.johnson@example.com', city: 'Pompano Beach',
      language: 'English', experience: '5+ years', ownTransport: false, usAuthorized: true, availableDays: ['Tue', 'Thu', 'Sat'],
      stage: 'new', stageAt: now - 10 * DAY - 4 * H, origin: 'email', history: [{ at: now - 10 * DAY - 4 * H, text: 'Application received' }] },
  ];

  /* ---------- conversations (Instagram + Facebook) ---------- */
  const conv = (c: Omit<Conversation, 'lastInboundAt' | 'lastActivityAt' | 'userId'>): Conversation => {
    const ins = c.messages.filter((m) => m.dir === 'in');
    return {
      ...c,
      userId: c.key.split(':')[1],
      lastInboundAt: ins.length ? ins[ins.length - 1].at : c.messages[0].at,
      lastActivityAt: c.messages[c.messages.length - 1].at,
    };
  };
  const link = 'ultrashinecleaningfl.com/quote?r=';
  const convs: Conversation[] = [
    conv({ key: 'instagram:102', platform: 'instagram', kind: 'dm', name: 'mike_delray', tags: [], city: 'Delray Beach',
      messages: [{ dir: 'in', text: 'Do you guys clean after a party? Saturday night thing, need it done Sunday morning 🙏', at: now - 35 * M }] }),
    conv({ key: 'instagram:101', platform: 'instagram', kind: 'dm', name: 'boca.mama.of3', tags: ['lead'], city: 'Boca Raton', refToken: 'b3m4',
      followUp: { scheduledFor: now + 50 * M },
      auto: { priceAt: now - 2 * H - 9 * M },
      messages: [
        { dir: 'in', text: 'Hi! How much for a biweekly clean? 4 bed 3 bath in Boca', at: now - 2 * H - 10 * M },
        { dir: 'out', text: `Hi! Every home gets its own quote after a quick look. The fastest way is here and we reply within the hour: ${link}b3m4`, at: now - 2 * H - 9 * M, by: 'auto:price' },
      ] }),
    conv({ key: 'instagram:104', platform: 'instagram', kind: 'comment', name: 'lauren.boca.home', tags: ['lead'], city: 'Boca Raton',
      messages: [
        { dir: 'in', text: 'QUOTE 🙋‍♀️', at: now - 5 * H },
        { dir: 'out', text: `Here's your link Lauren, takes a minute: ${link}l7x2 Any questions, just reply here.`, at: now - 5 * H + 20_000, by: 'auto:quote' },
        { dir: 'out', text: 'Sent you a DM! 💙', at: now - 5 * H + 25_000, by: 'auto:quote' },
      ] }),
    conv({ key: 'instagram:107', platform: 'instagram', kind: 'dm', name: 'nora.boynton', tags: ['lead'], city: 'Boynton Beach', quoteSubmittedAt: now - 9 * H,
      followUp: { skipped: 'they sent the form' },
      messages: [
        { dir: 'in', text: 'Hi, price for a 2 bedroom condo?', at: now - 11 * H },
        { dir: 'out', text: `Thanks for reaching out! We're off for the day and back at 7 AM. Want a quote sooner? ${link}n9b1`, at: now - 11 * H + 15_000, by: 'auto:afterhours' },
        { dir: 'in', text: 'Just filled it out, thank you!', at: now - 9 * H },
      ] }),
    conv({ key: 'instagram:105', platform: 'instagram', kind: 'dm', name: 'coral.springs.realtor', tags: ['lead'], city: 'Coral Springs',
      messages: [{ dir: 'in', text: 'Do you do move-out cleans for listings? I have 3 closings this month', at: now - 20 * H }] }),
    conv({ key: 'instagram:103', platform: 'instagram', kind: 'dm', name: 'sunshine.stephanie', tags: [], city: 'Coral Springs',
      messages: [
        { dir: 'in', text: 'Thank you ladies!! The house smells amazing 😍', at: now - 1 * DAY - 6 * H },
        { dir: 'out', text: 'Thank you so much Stephanie! See you next month 💙', at: now - 1 * DAY - 5 * H, by: 'Admin' },
      ] }),
    conv({ key: 'facebook:201', platform: 'facebook', kind: 'comment', name: 'Denise Carter', tags: ['lead'], city: 'Coconut Creek', quoteSubmittedAt: now - 2 * DAY - 2 * H,
      messages: [
        { dir: 'in', text: 'Do you do move-in cleans? Closing on the 15th', at: now - 2 * DAY - 4 * H },
        { dir: 'out', text: `Here's your link Denise, takes a minute: ${link}d2c8 Any questions, just reply here.`, at: now - 2 * DAY - 4 * H + 30_000, by: 'auto:quote' },
      ] }),
    conv({ key: 'facebook:202', platform: 'facebook', kind: 'dm', name: 'Brian Foster', tags: [], city: 'Delray Beach',
      messages: [
        { dir: 'in', text: 'Hi! Can we move this week’s clean from Saturday to Friday?', at: now - 3 * DAY - 2 * H },
        { dir: 'out', text: 'Of course! Friday at 11:30 works — see you then 😊', at: now - 3 * DAY - 1 * H, by: 'Admin' },
        { dir: 'in', text: 'Perfect, thanks!', at: now - 3 * DAY - 50 * M },
        { dir: 'out', text: '💙', at: now - 3 * DAY - 45 * M, by: 'Admin' },
      ] }),
    conv({ key: 'instagram:106', platform: 'instagram', kind: 'dm', name: 'palmbeach.jess', tags: [], city: 'Boca Raton',
      messages: [
        { dir: 'in', text: 'Are you hiring? My sister is looking for cleaning work', at: now - 4 * DAY },
        { dir: 'out', text: 'Yes we are! She can apply here: ultrashinecleaningfl.com/work-for-us 😊', at: now - 4 * DAY + 2 * H, by: 'Admin' },
      ] }),
    conv({ key: 'instagram:109', platform: 'instagram', kind: 'dm', name: 'parkland.home', tags: ['lead'], city: 'Parkland', quoteSubmittedAt: now - 14 * DAY + 40 * M,
      messages: [
        { dir: 'in', text: 'Need a deep clean before we list the house — next week possible?', at: now - 14 * DAY },
        { dir: 'out', text: `Hi! Every home gets its own quote after a quick look. The fastest way is here and we reply within the hour: ${link}p5h3`, at: now - 14 * DAY + 10_000, by: 'auto:price' },
        { dir: 'in', text: 'Done! Sent the form', at: now - 14 * DAY + 40 * M },
        { dir: 'out', text: 'Got it! We have Tuesday at 9am open — want it?', at: now - 14 * DAY + 55 * M, by: 'Admin' },
      ] }),
  ];

  /* ---------- social posts ---------- */
  const P = '/demo-assets/social/';
  type Plan = { kind: PostKind; imgs: string[]; caption: string; cover?: string };
  const POSTS: Plan[] = [
    { kind: 'POST', imgs: ['room88.jpg'], caption: 'Come home to this. ✨ Fresh sheets, folded throws and not a speck of dust — this Boca bedroom got the full reset today.\n\nFree quote in under an hour, link in bio.' },
    { kind: 'CAROUSEL', imgs: ['car2_1.jpg', 'car2_2.jpg', 'car2_3.jpg', 'car2_4.jpg', 'car2_5.jpg'], caption: 'What a deep clean actually covers — room by room. Save this for your next one 📌\n\n#deepcleaning #bocaraton #southflorida' },
    { kind: 'POST', imgs: ['B_64_67.jpg'], caption: 'Same wall, same day. Hard-water stains gone from this shower in Delray Beach 🚿\n\nSwipe-worthy results, every visit.' },
    { kind: 'CAROUSEL', imgs: ['car3_1.jpg', 'car2_2.jpg', 'car2_3.jpg'], caption: 'Moving out? Here’s the full checklist we use to get your deposit back. 🏡' },
    { kind: 'POST', imgs: ['van_post.jpg'], caption: 'Your home, in good hands. Background-checked, insured and the same team every visit. 💙' },
    { kind: 'POST', imgs: ['review_marcela.jpg'], caption: '“They always leave everything spotless and pay great attention to detail.” Thank you for the kind words! ⭐⭐⭐⭐⭐' },
    { kind: 'POST', imgs: ['tip2.jpg'], caption: 'Every 90 days your home needs a full reset — even with regular cleans. Baseboards, vents, grout and ceiling fans. 🧽' },
    { kind: 'CAROUSEL', imgs: ['car4_1.jpg', 'B_64_67.jpg', 'B_70_76.jpg'], caption: 'Regular or deep? Swipe for the difference and which one your home needs right now.' },
    { kind: 'POST', imgs: ['fan.jpg'], caption: 'The ceiling fan: the dust you only see when the light hits it. Before → after. 🌀' },
    { kind: 'POST', imgs: ['sign.jpg'], caption: 'Spotted our yard sign in Parkland? Scan it for a free quote — or just call or text. 📲' },
    { kind: 'POST', imgs: ['season.jpg'], caption: 'Hosting this holiday season? Book your deep clean 2–3 weeks before — the calendar is filling up. 🍂' },
    { kind: 'POST', imgs: ['review_v2.jpg'], caption: '“Ultra Shine Cleaning is the BEST cleaning service that I’ve had.” We love our clients! 💙' },
    { kind: 'POST', imgs: ['B_70_76.jpg'], caption: 'Stainless, streak-free. The side of the stove nobody cleans — we do. ✨' },
  ];
  const REELS: Plan[] = [
    { kind: 'REEL', imgs: ['cover_oven.jpg'], caption: 'Inside the oven 👀 Wait for the after. #satisfying #deepcleaning', cover: 'cover_oven.jpg' },
    { kind: 'REEL', imgs: ['cover_stove.jpg'], caption: 'The side nobody cleans. Before → after on a Boca kitchen. 🔥', cover: 'cover_stove.jpg' },
    { kind: 'REEL', imgs: ['cover_grates.jpg'], caption: 'Grates, degreased. Sound on for the scrub. 🎧', cover: 'cover_grates.jpg' },
    { kind: 'REEL', imgs: ['cover_shower.jpg'], caption: 'The shower drain nobody checks. 4 steps to clean it — save this. 👀', cover: 'cover_shower.jpg' },
    { kind: 'REEL', imgs: ['cover_bed.jpg'], caption: 'Hotel corners, every bed. How we make a bed in 60 seconds. 🛏️', cover: 'cover_bed.jpg' },
    { kind: 'REEL', imgs: ['cover_bedroom.jpg'], caption: 'Bedroom reset, sped up. Delray Beach, Tuesday morning. ⏩', cover: 'cover_bedroom.jpg' },
    { kind: 'REEL', imgs: ['cover_floors.jpg'], caption: 'Every inch, every corner. Hardwood floors done right. 🪵', cover: 'cover_floors.jpg' },
    { kind: 'REEL', imgs: ['cover_fridge.jpg'], caption: '4 steps to a fresh fridge — save this for cleaning day. 🧊', cover: 'cover_fridge.jpg' },
  ];
  const STORIES: Plan[] = [
    { kind: 'STORY', imgs: ['oct01_am_room.jpg'], caption: '' },
    { kind: 'STORY', imgs: ['oct03_pm_ba.jpg'], caption: '' },
    { kind: 'STORY', imgs: ['oct04_pm_review.jpg'], caption: '' },
    { kind: 'STORY', imgs: ['oct08_am_bts.jpg'], caption: '' },
  ];
  // Weekly rhythm: Mon post · Tue reel · Wed carousel/post · Thu story · Fri reel · Sat post · Sun story
  const RHYTHM: Record<number, { kind: 'POST' | 'REEL' | 'STORY'; h: number } | null> = {
    0: { kind: 'STORY', h: 15 },
    1: { kind: 'POST', h: 9 },
    2: { kind: 'REEL', h: 18 },
    3: { kind: 'POST', h: 9 },
    4: { kind: 'STORY', h: 15 },
    5: { kind: 'REEL', h: 12 },
    6: { kind: 'POST', h: 9 },
  };
  const posts: SocialPost[] = [];
  const counters = { POST: 0, REEL: 0, STORY: 0 };
  const pr = rng(777);
  let draftBudget = 3;
  for (let off = -24; off <= 38; off++) {
    const day = at(now, off, 12);
    const slot = RHYTHM[etParts(day).dow];
    if (!slot) continue;
    const pool = slot.kind === 'POST' ? POSTS : slot.kind === 'REEL' ? REELS : STORIES;
    const plan = pool[counters[slot.kind]++ % pool.length];
    const when = at(now, off, slot.h);
    const past = when < now;
    const id = `p${String(off + 100).padStart(3, '0')}`;
    const platforms: Platform[] = plan.kind === 'STORY' || pr() < 0.3 ? ['instagram'] : ['instagram', 'facebook'];
    const created = when - (5 + Math.floor(pr() * 6)) * DAY;
    let status: SocialPost['status'] = past ? 'published' : 'scheduled';
    if (!past && off >= 2 && off <= 7 && draftBudget > 0 && plan.kind !== 'STORY') {
      status = 'draft';
      draftBudget--;
    }
    const history: SocialPost['history'] = [{ at: created + H, text: 'Saved as a draft' }];
    if (status !== 'draft') history.push({ at: created + 26 * H, text: 'Approved by Admin' });
    const results: SocialPost['results'] = {};
    if (past) {
      for (const pl of platforms) {
        const code = `${id}${pl === 'instagram' ? 'IG' : 'FB'}x${Math.floor(pr() * 1e6).toString(36)}`;
        results[pl] = { ok: true, id: code, permalink: pl === 'instagram' ? `https://www.instagram.com/p/${code}/` : `https://www.facebook.com/ultrashinecleaning/posts/${code}`, at: when + 40_000 };
        history.push({ at: when + 40_000, text: `Published to ${pl === 'instagram' ? 'Instagram' : 'Facebook'}` });
      }
    }
    const kind: PostKind = plan.kind;
    posts.push({
      id,
      kind,
      media: plan.imgs.map((f) => ({ url: P + f, type: 'image' as const })),
      cover: plan.cover ? { url: P + plan.cover, type: 'image' } : undefined,
      caption: plan.caption,
      platforms,
      scheduledAt: when,
      status,
      createdAt: created,
      createdBy: 'Admin',
      approvedBy: status === 'draft' ? undefined : 'Admin',
      approvedAt: status === 'draft' ? undefined : created + 26 * H,
      changeNote: status === 'draft' && draftBudget === 1 ? 'Use the after photo first' : undefined,
      jobRef: kind === 'REEL' ? ['Deep clean · Boca Raton', 'Move-out · Coral Springs', 'Deep clean · Delray Beach'][Math.floor(pr() * 3)] : undefined,
      results,
      history,
    });
  }

  /* ---------- Instagram numbers ---------- */
  const ir = rng(99);
  const TYPE: Record<PostKind, string> = { POST: 'FEED', CAROUSEL: 'CAROUSEL_ALBUM', REEL: 'REELS', STORY: 'STORY' };
  const media: IgMediaStat[] = posts
    .filter((p) => p.status === 'published')
    .map((p) => {
      const base = p.kind === 'REEL' ? 1400 : p.kind === 'CAROUSEL' ? 820 : p.kind === 'STORY' ? 240 : 520;
      const reach = Math.round(base * (0.65 + ir() * 0.9));
      return {
        id: `m_${p.id}`,
        caption: p.caption || undefined,
        type: TYPE[p.kind],
        permalink: p.results.instagram?.permalink,
        thumb: p.cover?.url ?? p.media[0]?.url,
        at: iso(p.scheduledAt!),
        reach,
        likes: Math.round(reach * (0.06 + ir() * 0.05)),
        comments: Math.round(reach * (0.004 + ir() * 0.008)),
      };
    })
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 30);
  const days: Record<string, IgDay> = {};
  const followerHistory: { day: string; followers: number }[] = [];
  const wave = (i: number, base: number, amp: number) => Math.max(0, Math.round(base + Math.sin(i * 1.3) * amp + Math.cos(i * 0.7) * amp * 0.5));
  for (let i = 400; i >= 1; i--) {
    const k = etDayKey(now - i * DAY);
    const g = 1 + (400 - i) / 500; // the account grows over the year
    const reach = Math.round(wave(i, 210, 70) * g);
    days[k] = {
      reach,
      views: Math.round(reach * 2.4),
      likes: Math.round(wave(i + 3, 38, 14) * g),
      comments: wave(i + 5, 3, 2),
      saves: wave(i + 7, 7, 4),
      shares: wave(i + 9, 4, 3),
      total_interactions: Math.round(wave(i + 3, 52, 16) * g),
      accounts_engaged: Math.round(wave(i + 2, 44, 12) * g),
    };
    followerHistory.push({ day: k, followers: Math.round(1180 + (400 - i) * 1.72 + Math.sin(i / 9) * 6) });
  }
  const igSnapshot: InsightsSnapshot = {
    at: now - 3 * H,
    followers: followerHistory[followerHistory.length - 1].followers,
    history: followerHistory,
    media,
    days,
    fbFollowers: 742,
    demographics: {
      gender: [{ key: 'F', value: 1210 }, { key: 'M', value: 318 }, { key: 'U', value: 24 }],
      age: [{ key: '18-24', value: 70 }, { key: '25-34', value: 390 }, { key: '35-44', value: 480 }, { key: '45-54', value: 330 }, { key: '55-64', value: 170 }, { key: '65+', value: 80 }],
      city: [{ key: 'Boca Raton, Florida', value: 560 }, { key: 'Delray Beach, Florida', value: 210 }, { key: 'Parkland, Florida', value: 150 }, { key: 'Coral Springs, Florida', value: 130 }, { key: 'Boynton Beach, Florida', value: 110 }],
    },
  };

  /* ---------- automation settings ---------- */
  const settings: AutomationSettings = structuredClone(DEFAULT_SETTINGS);
  settings.reviewRequests = { on: true, mode: 'ask' };

  /* ---------- review requests ---------- */
  const reviewRequests: ReviewRequest[] = [];
  const seen = new Set<string>();
  for (const v of [...all].reverse()) {
    if (!v.completed || v.start < now - 34 * DAY || seen.has(v.clientName)) continue;
    seen.add(v.clientName);
    const c = v.client;
    const base: ReviewRequest = { id: `rr_${v.id}`, clientId: b64(c.n), clientName: c.name, email: emailOf(c), service: c.title, completedAt: v.start + c.hours * H, status: 'sent' };
    const age = now - base.completedAt;
    if (c.company) Object.assign(base, { status: 'skipped', reason: 'Business client' });
    else if (age < 2.5 * DAY && reviewRequests.filter((x) => x.status === 'pending').length < 3) base.status = 'pending';
    else if (demoReviewed(c.name) && !['Monica Alvarez', 'Kevin Marsh', 'Olivia Grant', 'Priya Nair'].includes(c.name)) Object.assign(base, { status: 'skipped', reason: 'Already left a Google review' });
    else base.sentAt = base.completedAt + 18 * H;
    reviewRequests.push(base);
  }
  // Laura's deep clean was a few days ago — she's waiting to be asked.
  const laura = reviewRequests.find((x) => x.clientName === 'Laura Bianchi');
  if (laura) {
    laura.status = 'pending';
    delete laura.sentAt;
  }

  /* ---------- website (Vercel) + Google (Search Console) ---------- */
  const vercel = async (start: number, end: number, prevStart: number, monthly: boolean): Promise<VercelData> => {
    const rows = (from: number, to: number, base: number) => {
      const out: VercelData['timeline'] = [];
      const step = monthly ? 30 * DAY : DAY;
      for (let t = from, i = 0; t < to; t += step, i++) {
        const growth = 1 + (t - (now - 365 * DAY)) / (365 * DAY) * 0.45;
        const v = Math.round(wave(i, monthly ? base * 30 : base, monthly ? base * 4 : 7) * growth);
        out.push({ at: t + 12 * H, visitors: v, pageviews: Math.round(v * 1.7) });
      }
      return out;
    };
    const timeline = rows(start, end, 44);
    const prevTimeline = rows(prevStart, start, 37);
    const f = (end - start) / (30 * DAY);
    return {
      timeline,
      prevTimeline,
      referrers: [
        { host: 'www.google.com', visitors: Math.round(612 * f) },
        { host: '', visitors: Math.round(318 * f) },
        { host: 'l.instagram.com', visitors: Math.round(204 * f) },
        { host: 'm.facebook.com', visitors: Math.round(97 * f) },
        { host: 'maps.google.com', visitors: Math.round(141 * f) },
        { host: 'nextdoor.com', visitors: Math.round(38 * f) },
      ],
      devices: [
        { device: 'mobile', visitors: Math.round(981 * f) },
        { device: 'desktop', visitors: Math.round(356 * f) },
        { device: 'tablet', visitors: Math.round(41 * f) },
      ],
      pages: [
        { path: '/', pageviews: Math.round(702 * f) },
        { path: '/quote', pageviews: Math.round(168 * f) },
        { path: '/services/deep-cleaning', pageviews: Math.round(131 * f) },
        { path: '/services/move-in-out', pageviews: Math.round(104 * f) },
        { path: '/areas/boca-raton', pageviews: Math.round(88 * f) },
        { path: '/reviews', pageviews: Math.round(76 * f) },
      ],
      quoteVisitors: Math.round(151 * f),
      visitors: timeline.reduce((a, x) => a + x.visitors, 0),
      prevVisitors: prevTimeline.reduce((a, x) => a + x.visitors, 0),
    };
  };
  const gsc = async (start: string, end: string): Promise<GscData> => {
    const daily: GscData['daily'] = [];
    const s = Date.parse(start + 'T12:00:00Z');
    const e = Date.parse(end + 'T12:00:00Z');
    for (let t = s, i = 0; t <= e; t += DAY, i++) daily.push({ date: new Date(t).toISOString().slice(0, 10), clicks: wave(i, 8, 3), impressions: wave(i, 360, 45), position: 11 + Math.sin(i) * 1.5 });
    const row = (k: string[], c: number, im: number, p: number) => ({ keys: k, clicks: c, impressions: im, ctr: c / im, position: p });
    const site = 'https://www.ultrashinecleaningfl.com';
    return {
      daily,
      prev: { clicks: 190, impressions: 9200, position: 13.8 },
      queries: [
        row(['house cleaning boca raton'], 61, 2480, 3.6),
        row(['ultra shine cleaning'], 44, 230, 1),
        row(['cleaning service boca raton'], 33, 1920, 5.4),
        row(['deep cleaning boca raton'], 26, 1010, 4.8),
        row(['move out cleaning boca raton'], 19, 690, 6.9),
        row(['maid service delray beach'], 11, 860, 10.2),
        row(['house cleaners parkland fl'], 8, 540, 9.1),
      ],
      queryPages: [
        row(['maid service delray beach', `${site}/areas/delray-beach`], 11, 860, 10.2),
        row(['airbnb cleaning boca raton', `${site}/services/regular-cleaning`], 3, 540, 12.6),
        row(['house cleaners near me', `${site}/`], 5, 1510, 15.3),
        row(['recurring cleaning boca', `${site}/services/regular-cleaning`], 2, 330, 17.4),
        row(['house cleaning boca raton', `${site}/`], 61, 2480, 3.6),
      ],
      devices: [row(['MOBILE'], 166, 7400, 11), row(['DESKTOP'], 47, 2350, 12), row(['TABLET'], 6, 240, 13)],
    };
  };
  const vercelToday: VDay = {
    v: Math.round(38 + (etParts(now).h / 24) * 30),
    pv: Math.round((38 + (etParts(now).h / 24) * 30) * 1.8),
    q: 6,
    refs: { 'www.google.com': 27, '': 11, 'l.instagram.com': 8, 'maps.google.com': 5 },
    dev: { mobile: 38, desktop: 13 },
    pages: { '/': 40, '/quote': 9 },
  };

  /* ---------- quote requests over the year (for Insights) ---------- */
  const qr = rng(31337);
  const CITIES = ['Boca Raton', 'Boca Raton', 'Boca Raton', 'Delray Beach', 'Parkland', 'Coral Springs', 'Boynton Beach', 'Deerfield Beach'];
  const SERVICES = ['Regular · bi-weekly', 'Deep clean', 'Move-out', 'Regular · weekly', 'Deep clean', 'Move-in'];
  const quoteLog: QuoteLog[] = [];
  for (let t = midnight(now - 400 * DAY), i = 0; t < now - 30 * DAY; t += DAY, i++) {
    const growth = 0.5 + (t - (now - 400 * DAY)) / (400 * DAY) * 0.9;
    const n = Math.floor(qr() * 2.2 * growth);
    for (let k = 0; k < n; k++) {
      const hour = qr() < 0.55 ? 18 + Math.floor(qr() * 4) : 8 + Math.floor(qr() * 9);
      quoteLog.push({ id: `ql${i}-${k}`, at: t + hour * H + Math.floor(qr() * 50) * M, city: CITIES[Math.floor(qr() * CITIES.length)], service: SERVICES[Math.floor(qr() * SERVICES.length)], source: qr() < 0.22 ? 'Instagram' : 'Google Search' });
    }
  }
  // The last 30 days: the real leads above plus a few more that never became a lead record.
  for (const l of leads) if (l.kind === 'quote') quoteLog.push({ id: l.id, at: l.at, city: l.city, service: l.service, source: l.heardFrom });
  for (let d = 1; d < 30; d += 3) quoteLog.push({ id: `qx${d}`, at: at(now, -d, 19.5), city: CITIES[d % CITIES.length], service: SERVICES[d % SERVICES.length], source: d % 4 ? 'Google Search' : 'Instagram' });
  quoteLog.sort((a, b) => a.at - b.at);

  // Older DM threads so the "when people reach out" heatmap has a year of history.
  const hr = rng(555);
  const oldConvs: Conversation[] = Array.from({ length: 70 }, (_, i) => {
    const t = now - (5 + i * 5 + Math.floor(hr() * 4)) * DAY + (hr() < 0.6 ? 19 : 11) * H;
    return { key: `instagram:9${i}`, platform: 'instagram', userId: `9${i}`, kind: 'dm', lastInboundAt: t, lastActivityAt: t + H, messages: [{ dir: 'in', text: 'price?', at: t }, { dir: 'out', text: 'Link sent', at: t + H, by: 'auto:price' }], tags: i % 3 ? [] : ['lead'] };
  });

  /* ---------- the Home tab reads leads as notification emails ---------- */
  const homeLeads: Lead[] = leads.map((l) => ({
    id: l.id,
    kind: l.kind,
    subject: '',
    name: l.name,
    city: l.city,
    platform: l.kind === 'social' ? (l.platform === 'facebook' ? 'Facebook' : 'Instagram') : undefined,
    at: l.at,
    to: '',
  }));

  /* ---------- Google reviews (invented) ---------- */
  const googleReviews = [
    { author_name: 'Monica Alvarez', rating: 5, text: 'They came in after our renovation and I honestly could not believe it was the same house. Drywall dust gone from every vent and baseboard. Worth every penny.', relative_time_description: '3 days ago', time: Math.floor((now - 3 * DAY) / 1000) },
    { author_name: 'Priya Nair', rating: 5, text: 'Same two ladies every other Thursday and they know exactly how we like things. Always on time, always friendly, and the kitchen shines.', relative_time_description: 'a week ago', time: Math.floor((now - 8 * DAY) / 1000) },
    { author_name: 'Kevin Marsh', rating: 5, text: 'Booked a move-out clean on short notice and got my full deposit back. The landlord asked who we used!', relative_time_description: '2 weeks ago', time: Math.floor((now - 15 * DAY) / 1000) },
    { author_name: 'Olivia Grant', rating: 5, text: 'Best cleaning service we have had in Boca. Easy to book, great communication, and they even organized the pantry.', relative_time_description: '3 weeks ago', time: Math.floor((now - 22 * DAY) / 1000) },
    { author_name: 'Daniel Okafor', rating: 5, text: 'Two dogs and three kids — they still leave the house spotless every time. Highly recommend.', relative_time_description: 'a month ago', time: Math.floor((now - 34 * DAY) / 1000) },
  ];

  return {
    now,
    visits,
    money,
    metrics,
    recentJobs,
    jobberClients,
    jobs,
    homes,
    leads,
    homeLeads,
    convs,
    oldConvs,
    posts,
    igSnapshot,
    settings,
    reviewRequests,
    googleReviews,
    vercel,
    gsc,
    vercelToday,
    quoteLog,
  };
}
