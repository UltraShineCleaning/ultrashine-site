/**
 * Reviews tab — logic checks. Run: npm run test:reviews
 */
export {};
const P = require('path').resolve(__dirname, '../../app/_lib');
let pass = 0, fail = 0;
const ok = (c: any, name: string) => { if (c) { pass++; } else { fail++; console.log('  ✗', name); } };

(async () => {
  const { buildReviewsOverview, newThisMonth } = require(`${P}/reviews/overview`);
  const { demoOverviewDeps } = require(`${P}/reviews/demo`);
  const { etToMs } = require(`${P}/social/time`);
  const now = etToMs(2026, 9, 28, 15, 0);

  console.log('new reviews this month');
  ok(newThisMonth({ '2026-08-30': 15, '2026-08-31': 17, '2026-09-10': 20 }, 22, now) === 5, 'counts from the last day of last month');
  ok(newThisMonth({ '2026-09-05': 20 }, 22, now) === 2, 'first saved day this month when there is no earlier one');
  ok(newThisMonth(null, 22, now) === null, 'unknown stays unknown');
  ok(newThisMonth({ '2026-08-31': 30 }, 22, now) === 0, 'never negative');

  console.log('overview (demo)');
  const o = await buildReviewsOverview(demoOverviewDeps(now), now);
  ok(o.stats.waiting === 2 && o.stats.sent30 === 2, `waiting + sent (${o.stats.waiting}/${o.stats.sent30})`);
  ok(o.stats.returnRate === null, 'no percentage from fewer than 3 requests');
  ok(o.requests[0].completedAt >= o.requests[1].completedAt, 'newest job first');
  ok(o.requests.every((r: any) => typeof r.reviewed === 'boolean'), 'each request says if they reviewed');
  ok(o.latest[0].author === 'Jane Doe', 'latest review first');
  ok(o.reviewLink.endsWith('/r'), 'review link is the /r redirect');
  ok(o.canEmailCustomers === false && o.auto.mode === 'auto', 'email off + mode');

  console.log('sources failing');
  const bad = { requests: async () => { throw new Error('x'); }, reviewCounts: async () => { throw new Error('x'); }, reviews: async () => { throw new Error('x'); }, settings: async () => { throw new Error('x'); }, canEmail: true };
  const b = await buildReviewsOverview(bad, now);
  ok(b.requests.length === 0 && b.latest.length === 0 && b.newThisMonth === null && b.auto.on === false, 'nothing crashes');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
