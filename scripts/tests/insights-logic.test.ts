/**
 * Insights tab — logic checks. Run: npm run test:insights
 * No network: every outside service is a fake below, so this checks OUR maths
 * and OUR requests (the shapes come from each vendor's own docs, cited in the
 * source files).
 */
import { generateKeyPairSync, createVerify } from 'crypto';
const P = require('path').resolve(__dirname, '../../app/_lib');
let pass = 0, fail = 0;
const ok = (c: any, name: string) => { if (c) { pass++; } else { fail++; console.log('  ✗', name); } };

type Call = { url: string; method: string; body: string; auth: string };
const calls: Call[] = [];
let tokenAssertion = '';
let igCombinedFails = false;
(globalThis as any).fetch = async (input: any, init: any = {}) => {
  const url = String(input);
  const method = init.method || 'GET';
  const body = typeof init.body === 'string' ? init.body : init.body instanceof URLSearchParams ? init.body.toString() : '';
  const auth = init.headers?.Authorization || '';
  calls.push({ url, method, body, auth });
  const J = (o: any, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
  if (url.startsWith('https://oauth2.googleapis.com/token')) {
    tokenAssertion = new URLSearchParams(body).get('assertion') || '';
    return J({ access_token: 'gtok', expires_in: 3600 });
  }
  if (url.includes('webmasters/v3')) return J({ rows: [{ keys: ['2026-09-20'], clicks: 3, impressions: 100, ctr: 0.03, position: 12 }] });
  if (url.includes('api.vercel.com')) {
    if (auth === 'Bearer bad') return J({ error: { message: 'Not authorized' } }, 403);
    return J({ data: [{ deviceType: 'mobile', visitors: 5, pageviews: 9 }] });
  }
  if (url.includes('graph.facebook.com')) {
    const u = new URL(url);
    const metric = u.searchParams.get('metric') || '';
    if (metric.includes(',') && igCombinedFails) return J({ error: { message: 'An unknown error has occurred.' } }, 400);
    if (metric === 'views') return J({ error: { message: 'unsupported' } }, 400);
    return J({ data: metric.split(',').map((m) => ({ name: m, total_value: { value: 10 } })) });
  }
  return J({});
};

(async () => {
  const time = await import(`${P}/social/time.ts`);
  const range = await import(`${P}/insights/range.ts`);
  const build = await import(`${P}/insights/build.ts`);
  const vercel = await import(`${P}/insights/vercel.ts`);
  const gsc = await import(`${P}/insights/searchConsole.ts`);
  const quotes = await import(`${P}/insights/quotes.ts`);
  const meta = await import(`${P}/social/meta.ts`);
  const DAY = 86_400_000;
  const now = time.etToMs(2026, 9, 25, 15, 0); // Fri Sep 25 2026, 3 PM Florida

  // ---------- windows ----------
  const w30 = range.windowFor(30, now);
  ok(w30.buckets.length === 30, '30 days → 30 buckets');
  ok(w30.end === time.etToMs(2026, 9, 26, 0), 'window ends at next Florida midnight');
  ok(w30.buckets.every((b: any, i: number) => i === 0 || b.start === w30.buckets[i - 1].end), 'buckets are back to back');
  ok(w30.buckets[29].label === 'Sep 25' && w30.buckets[0].label === 'Aug 27', '30-day labels run Aug 27 → Sep 25');
  const w7 = range.windowFor(7, now);
  ok(w7.buckets.map((b: any) => b.label).join(',') === 'Sat,Sun,Mon,Tue,Wed,Thu,Fri', '7 days labelled by weekday, ending today');
  ok(range.windowFor(90, now).buckets.length === 13, '90 days → 13 weeks');
  const w365 = range.windowFor(365, now);
  ok(w365.buckets.length === 12 && w365.buckets[11].label === 'Sep' && w365.buckets[0].label === 'Oct', '12 months → Oct…Sep');
  ok(w365.buckets[0].start === time.etToMs(2025, 10, 1, 0), '12 months starts Oct 1 midnight Florida');
  // DST: Nov 1 2026 falls back — daily buckets over it must still be back to back
  const wDst = range.windowFor(7, time.etToMs(2026, 11, 3, 12));
  ok(wDst.buckets.every((b: any, i: number) => i === 0 || b.start === wDst.buckets[i - 1].end), 'no gap across the November clock change');
  ok(wDst.buckets.some((b: any) => b.end - b.start === 25 * 3600_000), 'the fall-back day is 25 hours long');
  const cur = range.bucketize(w7, [{ at: time.etToMs(2026, 9, 25, 9), v: 2 }, { at: time.etToMs(2026, 9, 19, 23, 59), v: 1 }, { at: time.etToMs(2026, 9, 18, 23), v: 99 }]);
  ok(cur[6] === 2 && cur[0] === 1 && cur.reduce((a: number, b: number) => a + b, 0) === 3, 'bucketize: right day, outside window ignored');
  const prev = range.bucketize(w7, [{ at: time.etToMs(2026, 9, 18, 9), v: 4 }], true);
  ok(prev[6] === 4, 'previous period lines up day-for-day');

  // ---------- busiest times ----------
  const t = (d: number, h: number) => time.etToMs(2026, 9, d, h, 10);
  const g = build.whenGrid([t(22, 19), t(22, 19), t(23, 19), t(23, 12), t(24, 20), t(24, 19), t(21, 8), t(26, 10)]);
  ok(g.grid[1][13] === 2, 'Tue 7 PM cell counts both requests');
  ok(g.weekdays === 7 && g.weekend === 1, 'weekday / weekend split');
  ok(g.bestHour === 19, 'busiest hour = 7 PM');
  ok(g.bestDays === 'Tue–Thu', 'busiest days described as a run');
  ok(build.describeBestDays([0, 5, 0, 4, 0, 0, 0]) === 'Tue & Thu', 'non-neighbouring days joined with &');
  ok(build.describeBestDays([1, 9, 1, 1, 1, 0, 0]) === 'Tue', 'one day clearly leads → just that day');
  ok(build.whenGrid([t(22, 19)]).bestDays === null, 'fewer than 5 → no call made');
  ok(build.whenGrid([t(22, 3)]).grid.flat().every((x: number) => x === 0) && build.whenGrid([t(22, 3)]).total === 1, '3 AM counts in the total, not the 6a–9p grid');

  // ---------- labels ----------
  ok(vercel.referrerLabel('l.instagram.com') === 'Instagram' && vercel.referrerLabel('') === 'Direct visit' && vercel.referrerLabel('www.google.com') === 'Google search' && vercel.referrerLabel('maps.google.com') === 'Google Maps', 'referrers read as sources');
  ok(vercel.deviceLabel('mobile') === 'Phone' && vercel.pageLabel('/quote') === 'Get a quote', 'devices + pages in plain English');

  // ---------- almost page 1 ----------
  const r = (q: string, p: string, im: number, pos: number) => ({ keys: [q, p], clicks: 0, impressions: im, ctr: 0, position: pos });
  const wins = gsc.almostPageOne([r('a', '/x', 500, 12), r('a', '/y', 50, 13), r('b', '/', 900, 4), r('c', '/', 5, 15), r('d', '/', 80, 25), r('e', '/z', 700, 19.9)]);
  ok(wins.map((x: any) => x.q).join() === 'e,a' && wins[1].page === '/x', 'page-2 searches only, biggest audience first, best page per search');

  // ---------- Vercel requests + our saved daily history ----------
  process.env.VERCEL_ANALYTICS_TOKEN = 'vt';
  process.env.VERCEL_ANALYTICS_TEAM = 'contact-8079s-projects';
  const dayS = time.etToMs(2026, 9, 24, 0), dayE = time.etToMs(2026, 9, 25, 0);
  const vd = await vercel.fetchDay(dayS, dayE);
  const vc = calls.filter((c) => c.url.includes('api.vercel.com'));
  const vu = new URL(vc[0].url);
  ok(vc.length === 4, 'Vercel: 4 questions per day');
  ok(vu.searchParams.get('projectId') === 'ultrashine-site' && vu.searchParams.get('slug') === 'contact-8079s-projects' && vc[0].auth === 'Bearer vt', 'Vercel: project, team slug, bearer token');
  ok(vu.searchParams.get('since') === String(dayS) && vu.searchParams.get('until') === String(dayE - 1), 'Vercel: one Florida day, until inclusive');
  ok(vc.some((c) => new URL(c.url).searchParams.get('filter') === "requestPath eq '/quote'"), "Vercel: quote-page visitors via OData filter");
  ok(vd.v === 5 && vd.pv === 9 && vd.dev.mobile === 5, 'Vercel: day totals come from the device rows');
  const n0 = calls.length;
  ok((await vercel.syncVercelDays(31, now)) === 31 && calls.length - n0 === 124, 'first save: the whole 31-day Hobby window');
  const n1 = calls.length;
  ok((await vercel.syncVercelDays(31, now)) === 2 && calls.length - n1 === 8, 'after that: only the last 2 days are re-read');
  const hist = await vercel.vercelFromHistory(w30.start, w30.end, w30.prevStart, async () => ({ v: 7, pv: 8, q: 1, refs: { 'l.instagram.com': 7 }, dev: { mobile: 7 }, pages: { '/': 8 } }), now);
  ok(hist.visitors === 30 * 5 + 7 - 5 && hist.timeline.length === 30, 'range = 29 saved days + today live');
  ok(hist.prevVisitors === null && hist.prevTimeline.length === 0, 'history shorter than the previous period → no comparison, not a fake drop');
  const hist7 = await vercel.vercelFromHistory(w7.start, w7.end, w7.prevStart, async () => ({ v: 0, pv: 0, q: 0, refs: {}, dev: {}, pages: {} }), now);
  ok(hist7.prevVisitors === 35, '7 days: previous week fully saved → compared');
  process.env.VERCEL_ANALYTICS_TOKEN = 'bad';
  const verr = await vercel.fetchDay(dayS, dayE).catch((e: Error) => e.message);
  ok(/refused the token/.test(String(verr)), 'Vercel: bad token → plain-English error');

  // ---------- Search Console service account ----------
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  process.env.GSC_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: 'bot@p.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString().replace(/\n/g, '\\n') });
  ok(gsc.gscConfigured(), 'Search Console: key read from env (with \\n escapes)');
  const rows = await gsc.gscQuery('2026-08-27', '2026-09-25', ['date']);
  const [h, c, sig] = tokenAssertion.split('.');
  const claim = JSON.parse(Buffer.from(c, 'base64url').toString());
  ok(createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, Buffer.from(sig, 'base64url')), 'Search Console: JWT signature verifies with the public key');
  ok(claim.scope === 'https://www.googleapis.com/auth/webmasters.readonly' && claim.iss === 'bot@p.iam.gserviceaccount.com' && claim.aud === 'https://oauth2.googleapis.com/token', 'Search Console: read-only scope, right issuer + audience');
  const gq = calls.filter((x) => x.url.includes('webmasters/v3')).at(-1)!;
  ok(gq.url.includes(encodeURIComponent('sc-domain:ultrashinecleaningfl.com')) && gq.auth === 'Bearer gtok' && JSON.parse(gq.body).dimensions[0] === 'date', 'Search Console: domain property, bearer, body shape');
  ok(rows.length === 1, 'Search Console: rows returned');
  const before = calls.filter((x) => x.url.includes('oauth2')).length;
  await gsc.gscQuery('2026-08-27', '2026-09-25', []);
  ok(calls.filter((x) => x.url.includes('oauth2')).length === before, 'Search Console: token reused, not re-signed each call');

  // ---------- Instagram day metrics ----------
  const conn = { pageId: 'PAGE1', pageName: 'P', pageToken: 'pt', igUserId: 'IG1', connectedAt: 0 };
  const day = await meta.fetchIgDay(conn, 100, 200);
  const ic = calls.filter((x) => x.url.includes('/IG1/insights')).at(-1)!;
  const iu = new URL(ic.url);
  ok(iu.searchParams.get('period') === 'day' && iu.searchParams.get('metric_type') === 'total_value' && iu.searchParams.get('since') === '100' && !iu.searchParams.get('metric')!.includes('impressions'), 'IG: day totals, no deprecated impressions');
  ok(day.reach === 10 && day.likes === 10, 'IG: totals read from total_value');
  igCombinedFails = true;
  const day2 = await meta.fetchIgDay(conn, 100, 200);
  ok(day2.reach === 10 && day2.views === undefined, 'IG: one bad metric → the rest still arrive, bad one stays absent (not 0)');
  igCombinedFails = false;

  // ---------- quotes log ----------
  await quotes.logQuote({ id: 'e1', at: now - DAY, city: 'Boca Raton' });
  await quotes.logQuote({ id: 'e1', at: now - DAY, city: 'Boca Raton' });
  ok((await quotes.listQuotes(now - 2 * DAY, now)).length === 1, 'quote logged once even if sent twice');

  // ---------- the whole page ----------
  const inv = (daysAgo: number, total: number, client: string, owed = false) => ({ issued: new Date(now - daysAgo * DAY).toISOString().slice(0, 10), total, paid: owed ? 0 : total, balance: owed ? total : 0, client, owed, overdue: owed && daysAgo > 10 });
  const baseDeps = (): any => ({
    vercel: async () => ({
      timeline: [{ at: time.etToMs(2026, 9, 25, 12), visitors: 40, pageviews: 60 }],
      prevTimeline: [{ at: time.etToMs(2026, 8, 20, 12), visitors: 30, pageviews: 40 }],
      referrers: [{ host: 'www.google.com', visitors: 50 }, { host: 'google.com', visitors: 10 }, { host: 'l.instagram.com', visitors: 20 }, { host: '', visitors: 15 }],
      devices: [{ device: 'mobile', visitors: 70 }, { device: 'desktop', visitors: 30 }],
      pages: [{ path: '/', pageviews: 80 }, { path: '/admin', pageviews: 500 }, { path: '/quote', pageviews: 40 }],
      quoteVisitors: 100,
      visitors: 100,
      prevVisitors: 80,
    }),
    gsc: async () => ({
      daily: [{ date: '2026-09-24', clicks: 4, impressions: 100, position: 10 }, { date: '2026-09-25', clicks: 6, impressions: 300, position: 20 }],
      prev: { clicks: 5, impressions: 200, position: 19 },
      queries: [{ keys: ['house cleaning boca raton'], clicks: 6, impressions: 300, ctr: 0.02, position: 4.14 }],
      queryPages: [{ keys: ['maid delray', '/areas'], clicks: 1, impressions: 90, ctr: 0, position: 12.34 }],
      devices: [{ keys: ['MOBILE'], clicks: 8, impressions: 0, ctr: 0, position: 0 }],
    }),
    meta: async () => ({
      at: now, followers: 120, fbFollowers: 60,
      history: [{ day: '2026-09-01', followers: 100 }, { day: '2026-09-25', followers: 120 }, { day: '2026-07-01', followers: 50 }],
      media: [{ id: 'a', type: 'REELS', at: new Date(now - 2 * DAY).toISOString(), reach: 300, likes: 20, comments: 2 }, { id: 'b', type: 'FEED', at: new Date(now - 3 * DAY).toISOString(), reach: 100, likes: 5, comments: 0 }],
      days: { '2026-09-24': { reach: 50, likes: 4 }, '2026-09-25': { reach: 70, likes: 6, saves: 1 }, '2026-08-20': { reach: 40 } },
      demographics: null,
    }),
    money: async () => ({ invoiceLite: [inv(2, 200, 'Ann'), inv(40, 150, 'Ann'), inv(5, 300, 'Bob'), inv(12, 100, 'Cy', true), inv(45, 400, 'Dee')] }),
    quotes: async () => [{ id: 'q1', at: now - DAY }, { id: 'q2', at: now - 2 * DAY, source: 'Instagram DM (tracked link)' }, { id: 'q3', at: now - 3 * DAY }, { id: 'p1', at: now - 40 * DAY }, { id: 'p2', at: now - 41 * DAY }],
    convs: async () => [{ key: 'instagram:1', platform: 'instagram', userId: '1', kind: 'dm', lastInboundAt: now - DAY, lastActivityAt: now, messages: [{ dir: 'in', text: 'hi', at: now - DAY }], tags: [] }],
    reviewRequests: async () => [{ id: 'r', clientId: 'c', clientName: 'Cindy Finley', email: 'x', service: 's', completedAt: now - DAY, status: 'sent', sentAt: now - DAY }, { id: 'r2', clientId: 'c2', clientName: 'Nobody Yet', email: 'x', service: 's', completedAt: now - DAY, status: 'sent', sentAt: now - DAY }],
    goals: async () => null,
    reviewCounts: async (today: string, count: number) => ({ '2026-08-01': count - 3, [today]: count }),
  });
  const p = await build.buildInsights(30, baseDeps(), now);
  ok(p.progress.quotes === 3 && p.funnel.quoteSent === 3, 'quotes: 3 in the last 30 days');
  ok(p.goals.auto && p.goals.forRange.quotes === 2, 'no goals set → 10% above last period (2 → 2)');
  ok(p.kpi.visitors!.value === 100 && p.kpi.visitors!.prev === 80, 'visitors KPI + previous');
  ok(p.web!.sources[0].label === 'Google search' && p.web!.sources[0].value === 60, 'google.com + www.google.com merged into one source');
  ok(!p.web!.pages.some((x: any) => /admin/i.test(x.label)), 'our own /admin page never counts as a visited page');
  ok(p.web!.traffic.cur[29] === 40 && p.web!.traffic.prev.reduce((a: number, b: number) => a + b, 0) === 30, 'traffic line: today + previous period');
  ok(p.google!.avgPosition === 17.5, 'Google average position weighted by how often we were seen (10×100 + 20×300)/400');
  ok(p.google!.clicks === 10 && p.funnel.seenOnGoogle === 400, 'Google clicks + times seen');
  ok(p.google!.queries[0].ctr === 2 && p.google!.queries[0].position === 4.1, 'click rate as %, position to one decimal');
  ok(p.social!.reach === 120 && p.kpi.socialReach!.prev === 40, 'IG reach summed over the range + previous');
  ok(p.social!.igGain === 20, 'IG follower gain inside the range only');
  ok(p.social!.path.dms === 1 && p.social!.path.quotes === 1 && p.social!.path.websiteVisits === 20, 'IG → website → DM → quote');
  ok(p.social!.topPosts[0].id === 'a' && p.social!.avgReachByType.find((x: any) => x.label === 'Reels')!.value === 300, 'best post + avg reach by type');
  ok(p.social!.demographicsHidden === true, 'under-100-followers demographics shown as hidden, not zeros');
  ok(p.money!.revenue === 500 && p.progress.jobs === 3, 'revenue = paid in range; jobs = invoices in range');
  ok(p.money!.returning === 1 && p.money!.newClients === 2, 'Ann returning, Bob + Cy new');
  ok(p.money!.unpaidTotal === 100 && p.money!.overdueCount === 1, 'unpaid + past due');
  ok(p.reviews.gained === 3 && p.reviews.requests.sent === 2 && p.reviews.requests.reviewed === 1, 'reviews gained + requests that turned into reviews');
  ok(p.standouts[0].tone === 'warn' && /97% leave the quote page/.test(p.standouts[0].title), 'stand-out: 3 of 100 sent → biggest warning first');
  ok(Object.values(p.sources).every((x: any) => x.connected && !x.error), 'all sources connected');

  const d6 = baseDeps();
  d6.reviewCounts = async (today: string, count: number) => ({ '2026-09-20': count - 1, [today]: count });
  ok((await build.buildInsights(30, d6, now)).reviews.gained === null, 'no review count saved before the range → "counting from today", not a made-up number');
  d6.reviewCounts = async (today: string, count: number) => ({ '2026-07-01': count - 7, '2026-08-01': count - 3, [today]: count });
  ok((await build.buildInsights(30, d6, now)).goals.forRange.reviews === 4, 'auto review goal = 10% above last period (4 → 4)');

  // a missing source hides only its own section
  const d2 = baseDeps();
  d2.vercel = null;
  const p2 = await build.buildInsights(30, d2, now);
  ok(p2.web === null && p2.kpi.visitors === null && !p2.sources.vercel.connected && p2.funnel.visited === null, 'Vercel not set up → website section is "connect", not zeros');
  ok(p2.google !== null && p2.money !== null, '…and everything else still shows');
  // a failing source says why
  const d3 = baseDeps();
  d3.gsc = async () => { throw new Error('Search Console said no'); };
  const p3 = await build.buildInsights(30, d3, now);
  ok(p3.google === null && p3.sources.google.error === 'Search Console said no' && p3.web !== null, 'failing source → its error shown, rest fine');
  // saved goals scale to the range
  const d4 = baseDeps();
  d4.goals = async () => ({ quotes: 30, jobs: 40, revenue: 9000, reviews: 3 });
  const p4 = await build.buildInsights(7, d4, now);
  ok(!p4.goals.auto && p4.goals.forRange.quotes === 7 && p4.goals.forRange.revenue === 2100, 'monthly goals scaled to 7 days');
  const p5 = await build.buildInsights(365, d4, now);
  ok(p5.goals.forRange.revenue === 108000 && p5.money!.bars.length === 12, '12 months: goal ×12, one bar per month');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
