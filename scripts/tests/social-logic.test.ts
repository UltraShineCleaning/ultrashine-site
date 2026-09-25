import { createHash, createHmac } from 'crypto';
const P = require('path').resolve(__dirname, '../../app/_lib');
let pass = 0, fail = 0;
const ok = (c: any, name: string) => { if (c) { pass++; } else { fail++; console.log('  ✗', name); } };

// ---------- fake network ----------
type Call = { url: string; method: string; body: string };
const calls: Call[] = [];
let fbFail: number | null = null;
(globalThis as any).fetch = async (input: any, init: any = {}) => {
  const url = String(input); const method = init.method || 'GET'; const body = typeof init.body === 'string' ? init.body : '';
  calls.push({ url, method, body });
  const J = (o: any, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
  if (url.includes('api.resend.com')) return J({ id: 'em_' + calls.length });
  if (url.includes('graph.facebook.com')) {
    const u = new URL(url);
    const path = u.pathname.split('/').slice(2).join('/');
    if (path.startsWith('PAGE1/') && fbFail) return J({ error: { message: 'Error validating access token: Session has expired', code: fbFail } }, 400);
    if (path === 'IG1/media') return J({ id: 'C' + calls.length });
    if (/^C\d+$/.test(path) && method === 'GET') return J({ status_code: 'FINISHED' });
    if (path === 'IG1/media_publish') return J({ id: 'M' + calls.length });
    if (/^M\d+$/.test(path)) return J({ permalink: 'https://instagram.com/p/x' });
    if (path === 'PAGE1/photos') return J({ id: 'PH' + calls.length, post_id: 'PAGE1_' + calls.length });
    if (path === 'PAGE1/feed') return J({ id: 'PAGE1_feed' });
    if (path === 'PAGE1/videos') return J({ id: 'V1' });
    if (path === 'PAGE1/photo_stories') return J({ post_id: 'ST1' });
    if (path === 'PAGE1/video_stories') return J(u.search.includes('finish') || body.includes('finish') ? { post_id: 'VST' } : { video_id: 'VS1', upload_url: 'https://rupload.facebook.com/x' });
    if (path === 'PAGE1/messages') return J({ message_id: 'mid' + calls.length });
    if (path.endsWith('/replies') || path.endsWith('/comments')) return J({ id: 'r' });
    return J({ name: 'Jessica M', username: 'jessica.m', permalink_url: 'https://facebook.com/x' });
  }
  if (url.includes('rupload.facebook.com')) return J({ success: true });
  return J({});
};

(async () => {
  const time = await import(`${P}/social/time.ts`);
  const q = await import(`${P}/social/qstash.ts`);
  const meta = await import(`${P}/social/meta.ts`);
  const store = await import(`${P}/social/store.ts`);
  const auto = await import(`${P}/social/automations.ts`);
  const pub = await import(`${P}/social/publisher.ts`);
  const rr = await import(`${P}/reviewRequests.ts`);

  console.log('time');
  const t = time.etToMs(2026, 9, 24, 9, 0);
  ok(new Date(t).toISOString() === '2026-09-24T13:00:00.000Z', '9 AM EDT = 13:00Z');
  ok(new Date(time.etToMs(2026, 12, 24, 9, 0)).toISOString() === '2026-12-24T14:00:00.000Z', '9 AM EST = 14:00Z (DST)');
  ok(time.isBusinessHours(time.etToMs(2026, 9, 24, 10)) === true, 'Thu 10am open');
  ok(time.isBusinessHours(time.etToMs(2026, 9, 24, 18)) === false, 'Thu 6pm closed');
  ok(time.isBusinessHours(time.etToMs(2026, 9, 26, 11)) === true, 'Sat 11am open');
  ok(time.isBusinessHours(time.etToMs(2026, 9, 27, 11)) === false, 'Sun closed');
  ok(time.politeTime(time.etToMs(2026, 9, 24, 22)) === time.etToMs(2026, 9, 25, 8), '10pm → next day 8am');
  ok(time.politeTime(time.etToMs(2026, 9, 24, 6)) === time.etToMs(2026, 9, 24, 8), '6am → 8am');

  console.log('qstash signature');
  process.env.QSTASH_CURRENT_SIGNING_KEY = 'sig_current'; process.env.QSTASH_NEXT_SIGNING_KEY = 'sig_next';
  const b64u = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const mk = (key: string, body: string, exp = Math.floor(Date.now() / 1000) + 300) => {
    const h = b64u(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
    const p = b64u(Buffer.from(JSON.stringify({ iss: 'Upstash', sub: 'x', exp, nbf: Math.floor(Date.now() / 1000), body: b64u(createHash('sha256').update(body).digest()) })));
    return `${h}.${p}.${b64u(createHmac('sha256', key).update(`${h}.${p}`).digest())}`;
  };
  const body = JSON.stringify({ type: 'publish', postId: 'a', version: 1 });
  ok(q.verifyQstash(body, mk('sig_current', body)), 'valid current key');
  ok(q.verifyQstash(body, mk('sig_next', body)), 'valid next key');
  ok(!q.verifyQstash(body + ' ', mk('sig_current', body)), 'tampered body rejected');
  ok(!q.verifyQstash(body, mk('wrong', body)), 'wrong key rejected');
  ok(!q.verifyQstash(body, mk('sig_current', body, Math.floor(Date.now() / 1000) - 3600)), 'expired rejected');
  ok(!q.verifyQstash(body, null), 'missing rejected');

  console.log('meta webhook signature');
  process.env.META_APP_SECRET = 'appsecret';
  const raw = '{"object":"instagram"}';
  ok(meta.verifyMetaSignature(raw, 'sha256=' + createHmac('sha256', 'appsecret').update(raw).digest('hex')), 'valid');
  ok(!meta.verifyMetaSignature(raw, 'sha256=' + createHmac('sha256', 'nope').update(raw).digest('hex')), 'forged rejected');

  console.log('publishing (fake Meta)');
  await store.saveMeta({ pageId: 'PAGE1', pageName: 'Ultra Shine', pageToken: 'tok', igUserId: 'IG1', igUsername: 'ultrashinecleaning', connectedAt: Date.now() });
  const mkPost = async (kind: any, media: any[], extra: any = {}) => store.savePost({ id: store.newId(), kind, media, caption: 'Hi', platforms: ['instagram', 'facebook'], scheduledAt: Date.now() - 1000, status: 'scheduled', createdAt: Date.now(), createdBy: 't', results: {}, history: [], ...extra });
  const img = { url: 'https://x/a.jpg', type: 'image' }, vid = { url: 'https://x/v.mp4', type: 'video' };
  for (const [kind, media] of [['POST', [img]], ['CAROUSEL', [img, img, img]], ['REEL', [vid]], ['STORY', [img]], ['STORY', [vid]]] as any) {
    const p = await mkPost(kind, media);
    const r = await pub.publishPost(p.id);
    const after = await store.getPost(p.id);
    ok(r.ok && after!.status === 'published' && after!.results.instagram?.ok && after!.results.facebook?.ok, `${kind} ${media[0].type} → published on both`);
  }
  const reel = calls.find((c) => c.url.includes('IG1/media') && c.body.includes('REELS'));
  ok(!!reel && reel.body.includes('video_url'), 'reel container uses media_type=REELS + video_url');
  ok(calls.some((c) => c.body.includes('STORIES')), 'story container uses media_type=STORIES');
  ok(calls.some((c) => c.url.includes('PAGE1/photo_stories')), 'Facebook photo story endpoint used');
  ok(calls.some((c) => c.url.includes('rupload.facebook.com')), 'Facebook video story upload phase used');
  ok(calls.some((c) => c.url.includes('PAGE1/feed') && c.body.includes('attached_media')), 'Facebook multi-photo post uses attached_media');

  const draft = await mkPost('POST', [img], { status: 'draft' });
  ok((await pub.publishPost(draft.id)).ok === false && (await store.getPost(draft.id))!.status === 'draft', 'drafts never publish');

  fbFail = 190;
  const p2 = await mkPost('POST', [img]);
  await pub.publishPost(p2.id);
  let a2 = (await store.getPost(p2.id))!;
  ok(a2.status === 'failed' && a2.results.instagram?.ok && !a2.results.facebook?.ok, 'IG ok + FB fail → failed');
  ok(/Reconnect/.test(a2.results.facebook?.error ?? ''), 'plain-English reconnect message: ' + a2.results.facebook?.error);
  fbFail = null;
  const igCallsBefore = calls.filter((c) => c.url.includes('IG1/media_publish')).length;
  await pub.publishPost(p2.id, { force: true });
  a2 = (await store.getPost(p2.id))!;
  ok(a2.status === 'published', 'retry fixes it');
  ok(calls.filter((c) => c.url.includes('IG1/media_publish')).length === igCallsBefore, 'retry did NOT re-post to Instagram');

  const moved = await mkPost('POST', [img], { scheduledAt: Date.now() + 3600e3 });
  ok((await pub.publishPost(moved.id, { version: 12345 })).reason === 'stale job', 'stale QStash job (post was moved) ignored');

  console.log('DM automations');
  const sent = () => calls.filter((c) => c.url.includes('PAGE1/messages')).map((c) => JSON.parse(new URLSearchParams(c.body).get('message')!).text);
  const n0 = sent().length;
  const thu10 = time.etToMs(2026, 9, 24, 10);
  let c = await auto.handleIncomingMessage('instagram', 'U1', 'Hi! how much for a deep clean in Parkland?', Date.now());
  ok(sent().length === n0 + 1 && /quote\?ref=/.test(sent().at(-1)!), 'price question → 1 reply with tracked quote link');
  ok(c.tags.includes('lead') && c.city === 'Parkland', 'tagged lead + city');
  ok(!!c.followUp?.scheduledFor || !!c.followUp?.skipped, 'follow-up scheduled (or explained)');
  c = await auto.handleIncomingMessage('instagram', 'U1', 'what is the price again', Date.now());
  ok(sent().length === n0 + 1, 'no second price reply within 12h');

  // follow-up runs
  const cv = await store.getConv('instagram:U1');
  cv!.followUp = { scheduledFor: Date.now() }; cv!.messages = cv!.messages.filter((m: any) => m.text !== 'what is the price again'); await store.saveConv(cv!);
  let res = await auto.runFollowUp('instagram:U1');
  ok(res === 'sent' && /checking you got the link/.test(sent().at(-1)!), 'follow-up sends when nothing happened: ' + res);
  res = await auto.runFollowUp('instagram:U1');
  ok(res === 'already sent', 'never sends twice');

  await auto.handleIncomingMessage('instagram', 'U2', 'price for move out cleaning?', Date.now());
  const c2 = await store.getConv('instagram:U2'); c2!.followUp = { scheduledFor: Date.now() }; await store.saveConv(c2!);
  ok(await auto.markQuoteSubmitted(c2!.refToken!) === 'instagram', 'quote form with ?ref= matched back to the DM');
  ok((await auto.runFollowUp('instagram:U2')).includes('quote form'), 'follow-up skipped after they sent the form');

  await auto.handleIncomingMessage('instagram', 'U3', 'how much?', Date.now());
  const c3 = await store.getConv('instagram:U3'); c3!.followUp = { scheduledFor: Date.now() };
  c3!.messages.push({ dir: 'out', text: 'Hi, Francine here', at: Date.now() + 1, by: 'Tiago or Francine' }); await store.saveConv(c3!);
  ok((await auto.runFollowUp('instagram:U3')).includes('you already replied'), 'follow-up skipped when a person replied');

  await auto.handleIncomingMessage('instagram', 'U4', 'how much?', Date.now() - 23.9 * 3600e3);
  const c4 = await store.getConv('instagram:U4'); c4!.followUp = { scheduledFor: Date.now() }; await store.saveConv(c4!);
  ok((await auto.runFollowUp('instagram:U4')).includes('window closed'), 'follow-up skipped when 24h window closed');

  const nA = sent().length;
  const c5 = await auto.handleIncomingMessage('facebook', 'U5', 'hello are you there', time.etToMs(2026, 9, 24, 20));
  ok(sent().length === nA || sent().length === nA + 1, 'after-hours handled');
  ok(c5.messages.some((m: any) => m.by === 'auto:afterhours') || !auto.windowOpen(c5), 'after-hours reply recorded');

  console.log('comments');
  const nB = sent().length;
  await auto.handleIncomingComment('instagram', 'CM1', 'U6', 'rob_builds', 'QUOTE');
  await auto.handleIncomingComment('instagram', 'CM1', 'U6', 'rob_builds', 'QUOTE');
  ok(sent().length === nB + 1, 'QUOTE comment → exactly one private reply');
  ok(calls.some((c) => c.body.includes('comment_id')), 'private reply uses recipient.comment_id');
  const nC = sent().length;
  await auto.handleIncomingComment('instagram', 'CM2', 'U7', 'ana', 'That grout!! 😍');
  ok(sent().length === nC, 'normal comment → no DM');

  console.log('manual reply');
  try { await auto.sendManualReply('instagram:U4', 'hi', 'T'); ok(false, 'should block outside window'); } catch (e: any) { ok(/24 hours/.test(e.message), 'manual reply blocked outside 24h'); }
  await auto.sendManualReply('instagram:U1', 'Thanks Jessica!', 'T');
  ok(sent().at(-1) === 'Thanks Jessica!', 'manual reply sent');

  console.log('review requests');
  const now = Date.now();
  const V = (id: string, name: string, email: string | null, hrsAgo: number, clientId = 'cl_' + id) => ({ visitId: id, title: 'Deep Clean', completedAt: now - hrsAgo * 3600e3, clientId, clientName: name, email, city: 'Boca Raton' });
  let r = await rr.sweepCompletedVisits(now, [V('v1', 'John Smith', 'john@x.com', 20)]);
  ok(r.queued === 1 && r.sent === 0, 'no verified sender → queued, not sent');
  process.env.RESEND_API_KEY = 're_test'; process.env.QUOTE_FROM_EMAIL = 'Ultra Shine <hello@mail.ultrashinecleaningfl.com>';
  r = await rr.sweepCompletedVisits(now, [
    V('v2', 'Mary Jones', 'mary@x.com', 20),
    V('v3', 'Mary Jones', 'mary@x.com', 30, 'cl_v2'),
    V('v4', 'Cindy Finley', 'cindy@x.com', 20),
    V('v5', 'No Email', null, 20),
    V('v6', 'Too Soon', 'soon@x.com', 1),
  ]);
  const list = await rr.listReviewRequests();
  const st = (id: string) => list.find((x: any) => x.id === id);
  ok(st('v2')?.status === 'sent', 'completed job → review email sent');
  ok(st('v3')?.status === 'skipped' && /Already asked/.test(st('v3')!.reason!), 'same client second visit → skipped (asked once)');
  ok(st('v4')?.status === 'skipped' && /Google review/.test(st('v4')!.reason!), 'already a Google reviewer → skipped');
  ok(st('v5')?.status === 'skipped', 'no email → skipped');
  ok(!st('v6'), 'finished < 3h ago → waits for tomorrow');
  const em = calls.filter((c) => c.url.includes('api.resend.com')).at(-1)!;
  ok(em.body.includes('qrserver.com') && em.body.includes('maps.app.goo.gl'), 'email has the Google link + QR code');
  r = await rr.sweepCompletedVisits(now, [V('v2', 'Mary Jones', 'mary@x.com', 20)]);
  ok(r.checked === 0, 'running again never re-sends');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
