/**
 * Clients tab — logic checks. Run: npm run test:clients
 */
export {};
const P = require('path').resolve(__dirname, '../../app/_lib');
let pass = 0, fail = 0;
const ok = (c: any, name: string) => { if (c) { pass++; } else { fail++; console.log('  ✗', name); } };

(async () => {
  const T = require(`${P}/clients/types`);
  const { buildClients } = require(`${P}/clients/profiles`);
  const { demoProfileDeps } = require(`${P}/clients/demo`);

  console.log('how often (cadence)');
  ok(T.cadenceOf('Every 2 weeks', '', 'RECURRING').key === 'biweekly', 'Jobber "Every 2 weeks"');
  ok(T.cadenceOf('Every week', '', 'RECURRING').label === 'Weekly', 'Every week');
  ok(T.cadenceOf('Every 4 weeks', '', 'RECURRING').label === 'Every 4 weeks', 'Every 4 weeks keeps its words');
  ok(T.cadenceOf('Every month', '', 'RECURRING').key === 'monthly', 'monthly');
  ok(T.cadenceOf(null, 'Bi-Weekly Cleaning', 'ONE_OFF').key === 'biweekly', 'name wins over one-off');
  ok(T.cadenceOf(null, 'Weekly Cleaning Service', 'ONE_OFF').key === 'weekly', 'Weekly in the title');
  ok(T.cadenceOf(null, 'Cleaning Service', 'ONE_OFF').key === 'oneoff' && !T.cadenceOf(null, 'Cleaning Service', 'ONE_OFF').recurring, 'one-off');
  ok(T.cadenceOf(null, 'Cleaning Service', 'RECURRING').recurring, 'recurring with no rhythm still recurring');
  ok(T.visitsPerYear('biweekly') === 26 && T.visitsPerYear('oneoff') === 0, 'visits per year');
  ok(T.jobberClientUrl(Buffer.from('gid://Jobber/Client/137848168').toString('base64')) === 'https://secure.getjobber.com/clients/137848168', 'Jobber link from the API id');

  console.log('profiles (demo)');
  const now = Date.now();
  const p = await buildClients(demoProfileDeps(now), now);
  const by = (n: string) => p.clients.find((c: any) => c.name === n);
  const laura = by('Laura Mendes');
  ok(laura.cadenceLabel === 'Bi-weekly' && laura.pricePerVisit === 200 && laura.perYear === 5200, `Laura cadence/price (${laura.cadenceLabel} ${laura.pricePerVisit} ${laura.perYear})`);
  ok(laura.owed === 200 && laura.daysLate === 4, 'Laura owes, 4 days late');
  ok(laura.home.bedrooms === 4 && laura.home.sqft === 2600 && laura.home.source === 'quote form', 'home size from the website quote (matched by phone)');
  ok(laura.review === 'asked', 'review asked');
  const karen = by('Karen Williams');
  ok(karen.home.source === 'you' && karen.home.pets === '1 dog', 'owner notes win');
  ok(karen.cadence === 'weekly' && karen.paid12m === 14 * 160, `Karen weekly, paid (${karen.paid12m})`);
  ok(by('Janet Ross').recurring === false && by('Janet Ross').cadenceLabel === 'One-time', 'one-time client');
  ok(by('Greg Hall').cadenceLabel === 'Every 4 weeks', 'every 4 weeks');
  ok(by('Seaside Brokers LLC').isCompany, 'company');
  ok(laura.nextVisit && laura.nextVisit > now, 'next visit');
  ok(laura.jobberUrl === 'https://secure.getjobber.com/clients/3', 'jobber url');
  ok(p.stats.active === 6 && p.stats.recurring === 5, `stats (${p.stats.active}/${p.stats.recurring})`);
  ok(p.stats.cadenceCounts.weekly === 2 && p.stats.cadenceCounts.biweekly === 2 && p.stats.cadenceCounts.monthly === 1, `cadence counts ${JSON.stringify(p.stats.cadenceCounts)}`);
  const expect = Math.round((160 * 52 + 150 * 26 + 200 * 26 + 180 * 13 + 240 * 52) / 12);
  ok(p.stats.recurringMonthly === expect, `recurring revenue ${p.stats.recurringMonthly} vs ${expect}`);
  ok(p.stats.owingCount === 1 && p.stats.owingTotal === 200, 'owing');
  ok(p.stats.cities[0].city === 'Boca Raton' && p.stats.cities[0].n === 3, 'cities');

  console.log('Jobber down');
  const down = { ...demoProfileDeps(now), clients: async () => { throw new Error('x'); }, jobs: async () => ({ jobs: [], error: 'nope' }) };
  const d = await buildClients(down, now);
  ok(d.clients.length === 0 && d.errors.length === 2, 'errors surfaced, nothing crashes');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
