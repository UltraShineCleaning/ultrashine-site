/**
 * Leads tab — logic checks. Run: npm run test:leads
 * Reading older office emails back, the stage maths, and the Text / Email
 * openers (no owner names, nothing we can't stand behind).
 */
export {};
const P = require('path').resolve(__dirname, '../../app/_lib');
let pass = 0, fail = 0;
const ok = (c: any, name: string) => { if (c) { pass++; } else { fail++; console.log('  ✗', name); } };

const { parseQuoteText, parseApplicationText, leadFromQuote, leadFromApplication, updateLead, saveLead, listLeads, syncSocial } = require(`${P}/leads/store`);
const T = require(`${P}/leads/types`);
const { demoLeads } = require(`${P}/leads/demo`);

(async () => {
  console.log('read back a quote email (same layout as app/api/quote renderText)');
  const quoteText = [
    'NEW QUOTE LEAD — Walter Pasache',
    'Deep Cleaning · Pompano Beach, 33060',
    '',
    'Phone:     (954) 555-0142',
    'Email:     walter@example.com',
    '',
    'Service:   Deep Cleaning',
    'Frequency: One-time',
    'Ballpark:  $320 – $390   ← what the customer saw',
    '',
    'Add-Ons (2):',
    '  · Inside oven           $30–$45',
    '  · Inside fridge         $30–$45',
    '  Subtotal: $60–$90',
    '',
    'Home:      3 BR / 2 BA / 1,800 sqft / 1 floor(s)',
    'Address:   1234 NE 5th St',
    'Location:  Pompano Beach, FL 33060',
    '',
    'Notes:     We have a dog.',
    'Heard via: Google Search',
    '',
    'Submitted: 2026-09-28T18:31:00.000Z',
  ].join('\n');
  const q = parseQuoteText(quoteText);
  ok(q.phone === '(954) 555-0142' && q.email === 'walter@example.com', 'contact');
  ok(q.service === 'Deep Cleaning' && q.frequency === 'One-time', 'service');
  ok(q.estimate === '$320 – $390', `estimate (${q.estimate})`);
  ok(q.bedrooms === 3 && q.bathrooms === 2 && q.sqft === 1800 && q.floors === 1, `home (${q.bedrooms}/${q.bathrooms}/${q.sqft}/${q.floors})`);
  ok(q.street === '1234 NE 5th St' && q.city === 'Pompano Beach' && q.zip === '33060', `address (${q.city} ${q.zip})`);
  ok(JSON.stringify(q.addOns) === '["Inside oven","Inside fridge"]', `add-ons (${JSON.stringify(q.addOns)})`);
  ok(q.notes === 'We have a dog.' && q.heardFrom === 'Google Search', 'notes + source');
  const blank = parseQuoteText(quoteText.replace('We have a dog.', '—').replace('Google Search', '— not provided —').replace('$320 – $390   ← what the customer saw', '— (commercial / walkthrough)   ← what the customer saw'));
  ok(blank.notes === undefined && blank.heardFrom === undefined && blank.estimate === undefined, 'dashes become empty, not text');

  console.log('read back an application email');
  const a = parseApplicationText(['Phone:       (561) 555-0170', 'Email:       rosa@example.com', 'City:        Boynton Beach', 'Languages:   English, Spanish', 'Experience:  3 years', 'Own transport:  Yes', 'US authorized: No', 'Available:   Mon, Tue, Wed', 'Notes:       —'].join('\n'));
  ok(a.city === 'Boynton Beach' && a.language === 'English, Spanish' && a.experience === '3 years', 'applicant basics');
  ok(a.ownTransport === true && a.usAuthorized === false, 'yes / no');
  ok(a.availableDays.join() === 'Mon,Tue,Wed' && a.notes === undefined, 'days + empty notes');

  console.log('from the forms');
  const l = leadFromQuote('x1', { service: 'Deep Cleaning', bedrooms: 3, contact: { first: 'Walter', last: 'P', phone: '954-555-0142' }, addOns: ['Inside oven'] }, '$320 – $390', true, 1000);
  ok(l.name === 'Walter P' && l.stage === 'new' && l.estimate === '$320 – $390' && l.history.length === 2, 'quote lead');
  const ap = leadFromApplication('a1', { contact: { first: 'Rosa' }, ownTransport: true }, 1000);
  ok(ap.kind === 'application' && ap.ownTransport === true && ap.usAuthorized === null, 'application lead');

  console.log('stages (in-memory Redis)');
  await saveLead(leadFromQuote('s1', { contact: { first: 'Ana' } }, null, true, Date.now() - 3 * 3600_000));
  const moved = await updateLead('s1', { stage: 'contacted', ownerNotes: 'left voicemail' });
  ok(moved.stage === 'contacted' && moved.contactedAt && moved.ownerNotes === 'left voicemail', 'move + notes');
  ok(moved.history.at(-1).text === 'Moved to Contacted', 'history line');
  const again = await updateLead('s1', { stage: 'bogus' });
  ok(again.stage === 'contacted', 'unknown stage ignored');
  const back = await updateLead('s1', { stage: 'new' });
  ok(back.stage === 'new' && back.contactedAt === moved.contactedAt, 'back to New keeps the first reply time');
  ok((await updateLead('nope', { stage: 'booked' })) === null, 'missing lead → null');
  await syncSocial([{ key: 'instagram:9', platform: 'instagram', userId: '9', kind: 'dm', name: 'jess.boca', lastInboundAt: 5, lastActivityAt: 5, messages: [{ dir: 'in', text: 'price?', at: 5 }], tags: ['lead'] },
    { key: 'instagram:8', platform: 'instagram', userId: '8', kind: 'dm', lastInboundAt: 5, lastActivityAt: 5, messages: [], tags: [] }]);
  const all = await listLeads();
  const soc = all.find((x: any) => x.id === 'soc_instagram_9');
  ok(soc && soc.name === '@jess.boca' && soc.lastMessage === 'price?', 'social lead from a tagged conversation');
  ok(!all.find((x: any) => x.id === 'soc_instagram_8'), 'untagged conversation skipped');

  console.log('stats (demo leads)');
  const now = Date.now();
  const st = T.leadStats(demoLeads(now), now);
  ok(st.counts.new === 2 && st.counts.contacted === 1 && st.counts.quoted === 1 && st.counts.booked === 1 && st.counts.lost === 1, `counts (${JSON.stringify(st.counts)})`);
  ok(st.newWaiting === 2, 'both new leads waiting over an hour');
  ok(st.bookedValue === 300, 'booked value from the low end of the estimate');
  ok(st.bookedRate === 17, `booked rate (${st.bookedRate})`);
  ok(st.medianReplyMin === 40, `median reply (${st.medianReplyMin})`);
  ok(st.bestSource === 'Google search', `best source (${st.bestSource})`);
  const old = T.leadStats([{ ...demoLeads(now)[2], stageAt: now - 90 * 86_400_000 }], now);
  ok(old.counts.contacted === 0, 'untouched for 60+ days drops out of the counts');

  console.log('Text / Email openers');
  const w = demoLeads(now)[0];
  ok(T.hello(w) === 'Hi Walter, this is Ultra Shine Cleaning. Thank you for your quote request for deep cleaning!', T.hello(w));
  ok(T.smsHref(w).startsWith('sms:+19545550142?&body=Hi%20Walter'), 'sms link');
  ok(T.mailHref(w).startsWith('mailto:walter@example.com?subject=Your%20quote'), 'mail link');
  ok(!/tiago|francine/i.test(T.hello(w) + T.hello(demoLeads(now)[6])), 'no owner names');
  ok(T.smsHref({ ...w, phone: '123' }) === null, 'no text link for a bad number');
  ok(T.hello({ ...w, name: 'New lead' }).startsWith('Hi, this is'), 'no fake first name');
  ok(T.homeLine(w) === '3 bed · 2 bath · ~1,800 sqft · 1 floor', T.homeLine(w));
  ok(T.mapHref(w).includes('1234%20NE%205th%20St'), 'map link');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
