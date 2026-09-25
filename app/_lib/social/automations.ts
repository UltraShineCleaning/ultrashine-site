import { Resend } from 'resend';
import { setOnce } from '../kv';
import { lookupName, replyToComment, sendMessage } from './meta';
import { scheduleJob, siteBaseUrl } from './qstash';
import { convKey, convKeyForRef, getConv, getMeta, getSettings, refTokenFor, saveConv } from './store';
import { etDayKey, isBusinessHours, politeTime } from './time';
import type { Conversation, MetaConnection, Platform } from './types';

/**
 * DM + comment automations — our own ManyChat.
 *
 * Meta's rules, built in (not optional):
 *  - We can only message someone within 24 hours of THEIR last message.
 *  - One private reply per comment.
 *  - Never message someone who hasn't messaged or commented first.
 *
 * Our rules on top:
 *  - Each automatic reply fires at most once per conversation per window.
 *  - The follow-up is ONE message, never at night, only inside the 24h window,
 *    and it's skipped if they already sent the quote form, wrote back, or a
 *    person already replied.
 */

const WINDOW_MS = 24 * 3600_000;
const SAFETY_MS = 20 * 60_000; // stay 20 min inside the window

const PRICE_WORDS = /\b(price|prices|pricing|cost|costs|quote|how much|rate|rates|estimate|charge|precio|cuanto|cuánto|quanto|valor|orçamento)\b/i;
const BOOKING_WORDS = /\b(book|booking|available|availability|schedule|appointment|this week|next week|tomorrow|disponible|agenda)\b/i;
const CITIES = [
  'boca raton', 'boca', 'delray', 'delray beach', 'boynton', 'boynton beach', 'parkland', 'coral springs', 'deerfield',
  'deerfield beach', 'pompano', 'pompano beach', 'lighthouse point', 'coconut creek', 'lake worth', 'wellington',
  'highland beach', 'fort lauderdale', 'margate', 'palm beach',
];

export function windowOpen(c: Conversation, at = Date.now()): boolean {
  return at < c.lastInboundAt + WINDOW_MS - SAFETY_MS;
}

function fill(text: string, c: Conversation, link: string): string {
  const first = (c.name || '').replace(/^@/, '').split(/[\s._]/)[0];
  const nice = first && /^[A-Za-zÀ-ÿ]{2,}$/.test(first) ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : '';
  return text
    .replace(/\{first name\}/gi, nice)
    .replace(/\{quote link\}/gi, link)
    .replace(/\s+([!,.])/g, '$1')
    .replace(/^Hi\s*!/, 'Hi!')
    .trim();
}

async function quoteLink(c: Conversation): Promise<string> {
  const t = await refTokenFor(c);
  return `${siteBaseUrl()}/quote?ref=${t}`;
}

async function sendAuto(conn: MetaConnection | null, c: Conversation, text: string, by: string): Promise<boolean> {
  if (!windowOpen(c)) return false;
  if (conn) {
    try {
      await sendMessage(conn, { id: c.userId }, text);
    } catch (e) {
      c.messages.push({ dir: 'out', text: `⚠ couldn't send: ${(e as Error).message}`, at: Date.now(), by: 'system' });
      return false;
    }
  }
  c.messages.push({ dir: 'out', text, at: Date.now(), by });
  c.lastActivityAt = Date.now();
  return true;
}

async function notifyLead(c: Conversation, text: string) {
  if (!(await setOnce(`social:leadmail:${c.key}`, '1', 30 * 86_400))) return;
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  await new Resend(key).emails
    .send({
      from: process.env.QUOTE_FROM_EMAIL?.trim() || 'Ultra Shine Dashboard <onboarding@resend.dev>',
      to: 'contact@ultrashinecleaningfl.com',
      subject: `New lead on ${c.platform === 'instagram' ? 'Instagram' : 'Facebook'} · ${c.name ?? 'someone'}`,
      text: `${c.name ?? 'Someone'} wrote:\n\n"${text}"\n\nReply from the dashboard: ${siteBaseUrl()}/admin#social`,
    })
    .catch(() => undefined);
}

/* ================= incoming DM ================= */

export async function handleIncomingMessage(platform: Platform, userId: string, text: string, at = Date.now()) {
  const settings = await getSettings();
  const conn = await getMeta();
  const key = convKey(platform, userId);
  const c: Conversation =
    (await getConv(key)) ?? { key, platform, userId, kind: 'dm', lastInboundAt: at, lastActivityAt: at, messages: [], tags: [], auto: {} };
  if (!c.name && conn) c.name = await lookupName(conn, platform, userId);
  c.kind = 'dm';
  c.lastInboundAt = at;
  c.lastActivityAt = at;
  c.messages.push({ dir: 'in', text, at });
  c.auto = c.auto ?? {};

  // They wrote back → any pending follow-up is no longer needed.
  if (c.followUp?.scheduledFor && !c.followUp.sentAt) {
    c.followUp = { skipped: 'they wrote back' };
  }

  const lower = text.toLowerCase();
  const asksPrice = PRICE_WORDS.test(text);
  const city = CITIES.find((ct) => lower.includes(ct));
  if (city) c.city = city.replace(/\b\w/g, (m) => m.toUpperCase());

  // Lead tag + email (no message to the customer)
  if (settings.leadTag.on && (city || asksPrice || BOOKING_WORDS.test(text)) && !c.tags.includes('lead')) {
    c.tags.push('lead');
    await notifyLead(c, text);
  }

  let sentLink = false;
  // Price question → quote link (once per 12h per person)
  if (settings.priceReply.on && asksPrice && (!c.auto.priceAt || at - c.auto.priceAt > 12 * 3600_000)) {
    const ok = await sendAuto(conn, c, fill(settings.priceReply.text, c, await quoteLink(c)), 'auto:price');
    if (ok) {
      c.auto.priceAt = at;
      sentLink = true;
    }
  }
  // After hours → one reply per day, and never on top of an automatic reply from the last 12 hours
  const recentAuto = !!c.auto.priceAt && at - c.auto.priceAt < 12 * 3600_000;
  if (!sentLink && !recentAuto && settings.afterHours.on && !isBusinessHours(at) && c.auto.afterHoursDay !== etDayKey(at)) {
    const ok = await sendAuto(conn, c, fill(settings.afterHours.text, c, await quoteLink(c)), 'auto:afterhours');
    if (ok) {
      c.auto.afterHoursDay = etDayKey(at);
      sentLink = true;
    }
  }

  // Follow-up: only once, only if we sent them the link and they haven't filled the form
  if (sentLink && settings.followUp.on && !c.followUp?.sentAt && !c.quoteSubmittedAt) {
    await scheduleFollowUp(c, settings.followUp.afterHours);
  }

  await saveConv(c);
  return c;
}

export async function scheduleFollowUp(c: Conversation, afterHours: number) {
  let when = politeTime(Date.now() + afterHours * 3600_000);
  const deadline = c.lastInboundAt + WINDOW_MS - SAFETY_MS;
  if (when > deadline) {
    // The polite time falls outside Meta's 24h window: try the last polite moment before it closes.
    const lastChance = deadline - 5 * 60_000;
    if (politeTime(lastChance) === lastChance && lastChance > Date.now() + 60 * 60_000) when = lastChance;
    else {
      c.followUp = { skipped: 'would land after the 24-hour window' };
      return;
    }
  }
  const id = await scheduleJob({ type: 'followup', convKey: c.key }, when);
  c.followUp = id ? { scheduledFor: when } : { skipped: 'the scheduler (QStash) is not set up yet' };
}

/** Called by the QStash job at the follow-up time. Re-checks everything before sending. */
export async function runFollowUp(key: string): Promise<string> {
  const c = await getConv(key);
  if (!c) return 'no conversation';
  const settings = await getSettings();
  const skip = async (why: string) => {
    c.followUp = { ...c.followUp, skipped: why };
    await saveConv(c);
    return `skipped: ${why}`;
  };
  if (!settings.followUp.on) return skip('follow-ups are switched off');
  if (c.followUp?.sentAt) return 'already sent';
  if (c.followUp?.skipped) return `skipped: ${c.followUp.skipped}`;
  if (c.quoteSubmittedAt) return skip('they sent the quote form ✓');
  const lastAuto = [...c.messages].reverse().find((m) => m.dir === 'out' && m.by?.startsWith('auto:'));
  const lastIn = [...c.messages].reverse().find((m) => m.dir === 'in');
  const humanAfter = c.messages.some((m) => m.dir === 'out' && !m.by?.startsWith('auto:') && m.by !== 'system' && lastAuto && m.at > lastAuto.at);
  if (humanAfter) return skip('you already replied');
  if (lastIn && lastAuto && lastIn.at > lastAuto.at) return skip('they wrote back');
  if (!windowOpen(c)) return skip('24-hour window closed');
  const ok = await sendAuto(await getMeta(), c, fill(settings.followUp.text, c, await quoteLink(c)), 'auto:followup');
  c.followUp = ok ? { sentAt: Date.now() } : { skipped: 'send failed' };
  await saveConv(c);
  return ok ? 'sent' : 'failed';
}

/* ================= comments ================= */

export async function handleIncomingComment(
  platform: Platform,
  commentId: string,
  fromId: string,
  fromName: string | undefined,
  text: string,
) {
  const settings = await getSettings();
  const conn = await getMeta();
  const key = convKey(platform, fromId);
  const c: Conversation =
    (await getConv(key)) ?? { key, platform, userId: fromId, kind: 'comment', lastInboundAt: 0, lastActivityAt: Date.now(), messages: [], tags: [], auto: {} };
  c.name = c.name ?? fromName;
  c.lastActivityAt = Date.now();
  c.messages.push({ dir: 'in', text: `💬 ${text}`, at: Date.now(), by: 'comment' });

  const kw = settings.quoteComment.keyword.trim().toLowerCase();
  const matches = kw && text.trim().toLowerCase().replace(/[^a-z0-9\u00c0-\u024f ]/g, '').split(/\s+/).includes(kw);
  if (settings.quoteComment.on && matches && (await setOnce(`social:comment:${commentId}`, '1', 90 * 86_400))) {
    const dm = fill(settings.quoteComment.dmText, c, await quoteLink(c));
    if (conn) {
      try {
        await sendMessage(conn, { comment_id: commentId }, dm); // Meta: one private reply per comment
        if (settings.quoteComment.publicReply) await replyToComment(conn, platform, commentId, settings.quoteComment.publicReply);
        c.messages.push({ dir: 'out', text: dm, at: Date.now(), by: 'auto:comment' });
      } catch (e) {
        c.messages.push({ dir: 'out', text: `⚠ couldn't send: ${(e as Error).message}`, at: Date.now(), by: 'system' });
      }
    } else {
      c.messages.push({ dir: 'out', text: dm, at: Date.now(), by: 'auto:comment' });
    }
    if (!c.tags.includes('lead')) c.tags.push('lead');
  }
  await saveConv(c);
  return c;
}

/* ================= manual reply from the dashboard ================= */

export async function sendManualReply(key: string, text: string, by: string) {
  const c = await getConv(key);
  if (!c) throw new Error('Conversation not found');
  if (c.kind !== 'dm' || !windowOpen(c)) throw new Error("Meta only allows replies within 24 hours of their last message. Reply from the Instagram app instead.");
  const conn = await getMeta();
  if (!conn) throw new Error('Instagram and Facebook are not connected yet.');
  await sendMessage(conn, { id: c.userId }, text);
  c.messages.push({ dir: 'out', text, at: Date.now(), by });
  c.lastActivityAt = Date.now();
  if (c.followUp?.scheduledFor && !c.followUp.sentAt) c.followUp = { skipped: 'you already replied' };
  await saveConv(c);
  return c;
}

/* ================= quote form tie-in ================= */

/** /api/quote calls this when the form came from a tracked link: the follow-up is cancelled and the lead is marked. */
export async function markQuoteSubmitted(refToken: string): Promise<Platform | null> {
  const key = await convKeyForRef(refToken);
  if (!key) return null;
  const c = await getConv(key);
  if (!c) return null;
  c.quoteSubmittedAt = Date.now();
  if (!c.tags.includes('lead')) c.tags.push('lead');
  if (c.followUp?.scheduledFor && !c.followUp.sentAt) c.followUp = { skipped: 'they sent the quote form ✓' };
  c.messages.push({ dir: 'in', text: '✓ Sent the quote form', at: Date.now(), by: 'system' });
  await saveConv(c);
  return c.platform;
}
