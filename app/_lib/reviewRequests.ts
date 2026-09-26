import { Resend } from 'resend';
import { getJSON, mgetJSON, setJSON, zadd, zrevrange } from './kv';
import { getRecentlyCompletedVisits, type CompletedVisit } from './jobberClient';
import { REVIEWER_NAMES } from './google-reviews';
import { customerFromAddress, reviewEmailHtml, reviewEmailSubject, reviewEmailText } from './reviewEmail';
import { getSettings } from './social/store';
import type { ReviewRequest } from './social/types';

/**
 * Automatic Google review request after a job.
 *
 * Once a day (the social-daily cron, ~10 AM Florida time) we look at Jobber
 * visits marked COMPLETE in the last 3 days, finished at least 3 hours ago,
 * and email each client the review request (button + QR code).
 *
 * Never asks the same person twice:
 *  - one request per client per year (recurring clients get one, not one per visit)
 *  - skips anyone whose name already appears on the Google listing
 *  - skips clients with no email in Jobber
 *
 * Mode 'auto' sends right away; mode 'ask' lines them up in the Reviews tab
 * with Send / Skip buttons. Either way it needs the verified sending domain —
 * Resend's shared address can't email customers.
 */

const reqKey = (id: string) => `review:req:${id}`;
const askedKey = (clientId: string) => `review:asked:${clientId}`;

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '').trim();
export function alreadyReviewed(name: string): boolean {
  const n = norm(name);
  if (!n) return false;
  const [first, ...rest] = n.split(/\s+/);
  const last = rest.at(-1);
  return REVIEWER_NAMES.some((r) => {
    const rn = norm(r);
    if (rn === n) return true;
    const parts = rn.split(/\s+/);
    return !!last && parts[0] === first && parts.at(-1) === last;
  });
}

async function save(r: ReviewRequest) {
  await setJSON(reqKey(r.id), r, 400 * 86_400);
  await zadd('review:reqs', r.completedAt, r.id);
}

export async function listReviewRequests(limit = 40): Promise<ReviewRequest[]> {
  const ids = await zrevrange('review:reqs', 0, limit - 1);
  return (await mgetJSON<ReviewRequest>(ids.map(reqKey))).filter((r): r is ReviewRequest => !!r);
}

export async function sendReviewEmail(name: string, email: string, service?: string) {
  const key = process.env.RESEND_API_KEY;
  const from = customerFromAddress();
  if (!key) throw new Error('Email service not configured (RESEND_API_KEY).');
  if (!from) throw new Error('Verify your domain in Resend and set QUOTE_FROM_EMAIL in Vercel — the shared Resend address can only email you, not customers.');
  const { data, error } = await new Resend(key).emails.send({
    from,
    to: email,
    replyTo: 'contact@ultrashinecleaningfl.com',
    subject: reviewEmailSubject(name),
    html: reviewEmailHtml(name, service),
    text: reviewEmailText(name, service),
    tags: [{ name: 'type', value: 'review-request' }],
  });
  if (error) throw new Error(error.message || 'Send failed');
  return data?.id;
}

export async function sendRequest(id: string): Promise<ReviewRequest> {
  const r = await getJSON<ReviewRequest>(reqKey(id));
  if (!r) throw new Error('Not found');
  if (!r.email) throw new Error('No email for this client in Jobber.');
  try {
    await sendReviewEmail(r.clientName, r.email, r.service);
    r.status = 'sent';
    r.sentAt = Date.now();
    r.reason = undefined;
    await setJSON(askedKey(r.clientId), String(Date.now()), 365 * 86_400);
  } catch (e) {
    r.status = 'failed';
    r.reason = (e as Error).message;
  }
  await save(r);
  return r;
}

export async function skipRequest(id: string): Promise<ReviewRequest | null> {
  const r = await getJSON<ReviewRequest>(reqKey(id));
  if (!r) return null;
  r.status = 'skipped';
  r.reason = 'Skipped by you';
  await save(r);
  return r;
}

export async function sweepCompletedVisits(now = Date.now(), injected?: CompletedVisit[]) {
  const settings = await getSettings();
  if (!settings.reviewRequests.on) return { checked: 0, sent: 0, queued: 0, skipped: 0, note: 'Review requests are switched off' };
  const { visits, error } = injected ? { visits: injected, error: undefined } : await getRecentlyCompletedVisits(3);
  if (error) return { checked: 0, sent: 0, queued: 0, skipped: 0, note: error };

  let sent = 0, queued = 0, skipped = 0, checked = 0;
  const canEmail = !!customerFromAddress() && !!process.env.RESEND_API_KEY;
  for (const v of visits) {
    if (now - v.completedAt < 3 * 3600_000) continue; // give them a few hours first; caught tomorrow
    if (await getJSON(reqKey(v.visitId))) continue; // already handled
    checked++;
    const r: ReviewRequest = {
      id: v.visitId,
      clientId: v.clientId,
      clientName: v.clientName,
      email: v.email,
      service: v.title,
      completedAt: v.completedAt,
      status: 'pending',
    };
    const asked = await getJSON<string>(askedKey(v.clientId));
    if (!v.email) Object.assign(r, { status: 'skipped', reason: 'No email in Jobber' });
    else if (asked) Object.assign(r, { status: 'skipped', reason: `Already asked on ${new Date(Number(asked)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` });
    else if (alreadyReviewed(v.clientName)) Object.assign(r, { status: 'skipped', reason: 'Already left a Google review' });

    if (r.status === 'skipped') {
      skipped++;
      await save(r);
      continue;
    }
    if (settings.reviewRequests.mode === 'auto' && canEmail) {
      await save(r);
      const out = await sendRequest(r.id);
      if (out.status === 'sent') sent++;
      continue;
    }
    if (!canEmail) r.reason = 'Waiting: verify your domain in Resend so emails can reach customers';
    queued++;
    await save(r);
  }
  return { checked, sent, queued, skipped };
}
