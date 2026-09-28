/**
 * Home tab — logic checks. Run: npm run test:home
 * No network: every source is the demo fake (app/_lib/home/demo.ts) or an
 * empty stand-in, so this checks OUR maths and wording only.
 */
const P = require('path').resolve(__dirname, '../../app/_lib');
let pass = 0, fail = 0;
const ok = (c: any, name: string) => { if (c) { pass++; } else { fail++; console.log('  ✗', name); } };

(async () => {
  const { buildHome, isUnanswered, shortTime } = require(`${P}/home/build`);
  const { demoHomeDeps } = require(`${P}/home/demo`);
  const { parseLeadEmail } = require(`${P}/home/leads`);
  const { etToMs } = require(`${P}/social/time`);

  // A fixed Florida afternoon: Mon Sep 28 2026, 2:30 PM
  const now = etToMs(2026, 9, 28, 14, 30);
  const h = await buildHome(demoHomeDeps(now), now);

  console.log('header');
  ok(h.greeting === 'Good afternoon.', 'afternoon greeting');
  ok(h.dateLabel === 'Monday · Sep 28', `date label (${h.dateLabel})`);

  console.log('needs you');
  const ids = h.needs.map((n: any) => n.id);
  ok(ids[0] === 'overdue', 'overdue invoices come first');
  ok(ids.join() === 'overdue,quote,dms,drafts,reviews,applicants', `order (${ids.join()})`);
  const od = h.needs.find((n: any) => n.id === 'overdue');
  ok(od.title === '2 invoices overdue · $480', `overdue title (${od.title})`);
  ok(od.detail.startsWith('Oldest is 12 days late'), 'oldest late days');
  const q = h.needs.find((n: any) => n.id === 'quote');
  ok(q.title === 'New quote request · Walter P. · Pompano Beach', `quote title (${q.title})`);
  ok(q.detail.startsWith('Deep clean · came in 1h ago'), `quote detail uses the logged service (${q.detail})`);
  const dm = h.needs.find((n: any) => n.id === 'dms');
  ok(dm.title === '3 unanswered DMs + comments', `dm title (${dm.title})`);
  ok(dm.detail.includes('How much for a move-out'), 'newest message quoted');
  const dr = h.needs.find((n: any) => n.id === 'drafts');
  ok(dr.title === '2 posts waiting for approval', 'drafts');
  const rv = h.needs.find((n: any) => n.id === 'reviews');
  ok(rv.detail.includes('Resend'), 'review needs say they wait on the domain when email is off');

  console.log('today');
  ok(h.today.jobs.length === 2, 'two jobs today');
  ok(h.today.jobs[0].state === 'done' && h.today.jobs[0].time === '9:00a', 'first job done at 9:00a');
  ok(h.today.jobs[1].state === 'now', 'second job in progress');
  ok(h.today.jobs[1].city === 'Boca Raton', 'city from address');
  ok(h.today.tomorrowCount === 2 && h.today.tomorrowFirst === '8:30a', `tomorrow (${h.today.tomorrowCount} ${h.today.tomorrowFirst})`);

  console.log('numbers');
  ok(h.kpi.collected.value === 1240 && h.kpi.collected.prev === 1050, 'collected this week');
  ok(h.kpi.owed.total === 980 && h.kpi.owed.late === 480 && h.kpi.owed.open === 6, 'owed');
  ok(h.kpi.jobs.value === 6, `jobs next 7 days = today + the next 6 days (${h.kpi.jobs.value})`);
  ok(h.kpi.jobs.spark.length === 7, 'jobs spark has 7 days');
  ok(h.kpi.leads.web === 2 && h.kpi.leads.social === 2, `leads split (${h.kpi.leads.web}/${h.kpi.leads.social})`);
  ok(h.kpi.leads.spark.reduce((a: number, b: number) => a + b, 0) === 4, 'lead spark adds up to the week');

  console.log('leads list');
  ok(h.leads[0].name === 'Walter P.' && h.leads[0].isNew && h.leads[0].source === 'web', 'newest first, marked new');
  ok(h.leads[0].detail === 'Deep clean · Pompano Beach', `quote detail (${h.leads[0].detail})`);
  ok(h.leads.find((l: any) => l.id === 's2').source === 'fb', 'facebook lead source');
  ok(h.leads.find((l: any) => l.id === 'a1').detail === 'Wants to join the team · Boynton Beach', 'applicant detail');

  console.log('social / reviews / web / autos');
  ok(h.social.connected && h.social.igUsername === 'ultrashinecleaning', 'connected');
  ok(h.social.nextPost.approved && h.social.nextPost.kind === 'REEL', 'next approved post');
  ok(h.social.followersDelta === 12, 'followers delta over 7 days');
  ok(h.social.unread === 3, 'unread count');
  ok(h.reviews.pending === 1 && h.reviews.sent30 === 1, 'review requests');
  ok(h.reviews.newThisMonth === h.reviews.count - 17, 'new reviews this month from the saved count');
  ok(h.web.visitors === 48 && h.web.quoteOpens === 7 && h.web.quotesSent === 1, 'web today');
  ok(h.web.avg7 === 33, `avg of the 6 finished days (${h.web.avg7})`);
  ok(h.web.topSource.label === 'Google search' && h.web.topSource.pct === 61, `top source (${JSON.stringify(h.web.topSource)})`);
  ok(h.autos.reviewRequests.note.includes('Resend'), 'review automation says what it waits on');
  ok(h.autos.autopost.on, 'autopost on when connected + qstash');
  ok(h.counts.money === 2 && h.counts.social === 5 && h.counts.reviews === 1, `badges (${JSON.stringify(h.counts)})`);

  console.log('nothing connected');
  const empty = {
    metrics: null, money: null, web: null,
    leads: async () => [], quotes: async () => [], convs: async () => [], posts: async () => [],
    meta: async () => null, igInsights: async () => null, settings: async () => { throw new Error('no redis'); },
    reviewRequests: async () => [], reviewCounts: async () => null, canEmailCustomers: false, canSchedule: false,
  };
  const e = await buildHome(empty, now);
  ok(e.needs.length === 0, 'no needs');
  ok(e.today === null && e.kpi.collected === null && e.kpi.jobs === null && e.web === null, 'unconnected cards are null, not zero');
  ok(e.kpi.leads.value === 0, 'zero leads');
  ok(!e.social.connected && e.social.nextPost === null, 'social off');
  ok(e.reviews.newThisMonth === null, 'unknown new reviews stays unknown');
  ok(e.autos.reviewRequests.on === false, 'settings failure does not crash');

  console.log('helpers');
  ok(shortTime(etToMs(2026, 9, 28, 13, 30)) === '1:30p', '1:30p');
  ok(shortTime(etToMs(2026, 9, 28, 0, 5)) === '12:05a', '12:05a');
  ok(isUnanswered({ messages: [{ dir: 'in', at: now - 1000 }] }, now), 'last message theirs = unanswered');
  ok(!isUnanswered({ messages: [{ dir: 'in', at: now - 8 * 86_400_000 }] }, now), 'older than a week drops off');
  const l = parseLeadEmail({ id: 'x', subject: 'New Quote · Ana S. · unspecified city', created_at: '2026-09-28T12:00:00Z' });
  ok(l.kind === 'quote' && l.name === 'Ana S.' && l.city === undefined, 'unspecified city dropped');
  const s = parseLeadEmail({ id: 'y', subject: 'New lead on Facebook · Kevin D.' });
  ok(s.kind === 'social' && s.platform === 'Facebook' && s.name === 'Kevin D.', 'social lead parse');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
