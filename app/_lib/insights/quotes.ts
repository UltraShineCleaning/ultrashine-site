import { Resend } from 'resend';
import { setOnce, zadd, zrangeByScore } from '../kv';

/**
 * Our own record of every quote request — the one source for "quote requests"
 * on the Insights tab (the funnel, the goal ring, and the busiest-times grid).
 *
 * Why not just read Resend like the Leads tab does: Resend's list is the last
 * 100 emails of ANY kind, so history falls off the end. From now on /api/quote
 * logs each request here the moment it arrives. Older quotes are filled in once
 * from Resend's list, keyed by the same email id, so nothing is counted twice.
 */
export type QuoteLog = {
  id: string;
  at: number;
  city?: string;
  service?: string;
  /** "Google Search", "Instagram DM (tracked link)", … — what the form captured. */
  source?: string;
};

const KEY = 'insights:quotes';

export async function logQuote(q: QuoteLog): Promise<void> {
  // setOnce guards against a double submit logging twice.
  if (!(await setOnce(`insights:quote:${q.id}`, '1', 400 * 86_400))) return;
  await zadd(KEY, q.at, JSON.stringify(q));
}

/** Fill in older quotes from Resend's recent-email list (at most every 10 minutes). */
export async function backfillFromResend(): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  if (!(await setOnce('insights:quotes:synced', '1', 600))) return;
  try {
    const res: any = await new Resend(apiKey).emails.list({ limit: 100 });
    const rows: any[] = res?.data?.data ?? res?.data ?? [];
    for (const e of rows) {
      const subject: string = e.subject ?? '';
      if (!/^New Quote/i.test(subject) || !e.id || !e.created_at) continue;
      const parts = subject.replace(/^New Quote\s*·\s*/i, '').split(/\s*·\s*/);
      const city = parts[1] && parts[1] !== 'unspecified city' ? parts[1] : undefined;
      await logQuote({ id: String(e.id), at: new Date(e.created_at).getTime(), city });
    }
  } catch {
    /* Resend down — we'll try again in 10 minutes */
  }
}

export async function listQuotes(from: number, to: number): Promise<QuoteLog[]> {
  const raw = await zrangeByScore(KEY, from, to);
  const out: QuoteLog[] = [];
  for (const r of raw) {
    try {
      out.push(JSON.parse(r) as QuoteLog);
    } catch {
      /* ignore a malformed row */
    }
  }
  return out;
}

/** Did this quote come from Instagram (tracked DM link or "heard from Instagram")? */
export function fromInstagram(q: QuoteLog): boolean {
  return /instagram/i.test(q.source ?? '');
}
