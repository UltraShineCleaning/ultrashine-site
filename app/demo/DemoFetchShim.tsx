'use client';

import { useEffect, useRef, useState } from 'react';
import type { HomeNeed, HomePayload } from '../_lib/home/build';
import type { ClientsPayload, HomeDetails } from '../_lib/clients/types';
import { leadStats, STAGE_LABEL, type LeadRecord, type Stage } from '../_lib/leads/types';
import type { ReviewsOverview } from '../_lib/reviews/overview';
import { scaleGoal, type Goals, type InsightsPayload, type RangeKey } from '../_lib/insights/types';
import { DEFAULT_SETTINGS, type AutomationSettings, type Conversation, type MediaItem, type Platform, type PostKind, type SocialPost } from '../_lib/social/types';
import { etParts } from '../_lib/social/time';
import type { DemoPayload } from './_data/payloads';

/**
 * Makes /demo behave like the real admin with nothing behind it.
 *
 * While mounted it replaces window.fetch: every same-origin request to /api/*
 * is answered here, from the page's fake data, and changes (approve a post,
 * move a lead, save a setting, send a reply…) are kept in memory for the
 * visit. Nothing is emailed, texted or published, and no /api/* request ever
 * reaches the server. Links and forms that would leave for an admin-only
 * endpoint or a third-party dashboard are caught and answered with a short
 * toast instead of a dead page. Everything is put back on unmount.
 */

declare global {
  interface Window {
    __DEMO__?: boolean;
  }
}

const DAY = 86_400_000;
const H = 3600_000;
const clone = <T,>(v: T): T => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

type State = DemoPayload & { pendingReplies: { key: string; at: number; text: string; quote?: boolean }[] };

let state: State | null = null;
let realFetch: typeof window.fetch | null = null;
let toastFn: ((m: string) => void) | null = null;
const toast = (m: string) => toastFn?.(m);

/* ================================================================ helpers */

const canReply = (c: Conversation, now = Date.now()) => c.kind === 'dm' && now < c.lastInboundAt + 24 * H - 20 * 60_000;
const isUnanswered = (c: Conversation, now: number) => {
  const last = c.messages[c.messages.length - 1];
  return !!last && last.dir === 'in' && now - last.at < 7 * DAY;
};

function materializeReplies(S: State) {
  const now = Date.now();
  S.pendingReplies = S.pendingReplies.filter((r) => {
    if (r.at > now) return true;
    const c = S.social.convs.find((x) => x.key === r.key);
    if (c) {
      c.messages.push({ dir: 'in', text: r.text, at: r.at });
      c.lastInboundAt = r.at;
      c.lastActivityAt = r.at;
      if (r.quote) c.quoteSubmittedAt = r.at;
    }
    return false;
  });
}

function reviewsView(S: State): ReviewsOverview {
  const now = Date.now();
  const o = S.reviews;
  const sent = o.requests.filter((r) => r.status === 'sent' && (r.sentAt ?? 0) > now - 30 * DAY);
  const reviewed = sent.filter((r) => r.reviewed).length;
  return clone({
    ...o,
    auto: { on: S.social.settings.reviewRequests.on, mode: S.social.settings.reviewRequests.mode },
    requests: [...o.requests].sort((a, b) => b.completedAt - a.completedAt),
    stats: {
      sent30: sent.length,
      reviewed30: reviewed,
      returnRate: sent.length >= 3 ? Math.round((reviewed / sent.length) * 100) : null,
      waiting: o.requests.filter((r) => r.status === 'pending' || r.status === 'failed').length,
    },
  });
}

/** Home is built once on the server; these parts follow what the visitor changes. */
function homeView(S: State): HomePayload {
  const now = Date.now();
  const h = clone(S.home);
  const p = etParts(now);
  h.at = now;
  h.greeting = p.h < 12 ? 'Good morning.' : p.h < 17 ? 'Good afternoon.' : 'Good evening.';
  h.dateLabel = `${WD_LONG[p.dow]} · ${MON[p.m - 1]} ${p.d}`;

  const posts = S.social.posts;
  const convs = S.social.convs;
  const connected = S.social.status.connected;
  const drafts = posts.filter((x) => x.status === 'draft').sort((a, b) => (a.scheduledAt ?? Infinity) - (b.scheduledAt ?? Infinity));
  const failed = posts.filter((x) => x.status === 'failed' && (x.scheduledAt ?? x.createdAt) > now - 7 * DAY);
  const unanswered = convs.filter((c) => isUnanswered(c, now)).sort((a, b) => b.lastInboundAt - a.lastInboundAt);
  const pending = S.reviews.requests.filter((r) => r.status === 'pending');

  const dyn: Record<string, HomeNeed | null> = { dms: null, failed: null, drafts: null, reviews: null };
  if (unanswered.length) {
    const dms = unanswered.filter((c) => c.kind === 'dm').length;
    const first = unanswered[0];
    const lastIn = [...first.messages].reverse().find((m) => m.dir === 'in')?.text ?? '';
    const what = dms === unanswered.length ? (dms === 1 ? 'DM' : 'DMs') : dms === 0 ? (unanswered.length === 1 ? 'comment' : 'comments') : 'DMs + comments';
    dyn.dms = {
      id: 'dms', tone: 'ig', icon: '◈', title: `${unanswered.length} unanswered ${what}`,
      detail: `${lastIn ? `“${lastIn.slice(0, 70)}${lastIn.length > 70 ? '…' : ''}”` : first.name ?? 'Someone'}${unanswered.length > 1 ? ` + ${unanswered.length - 1} more` : ''}`,
      action: 'Open Inbox →', tab: 'social',
    };
  }
  if (failed.length) dyn.failed = { id: 'failed', tone: 'r', icon: '!', title: `${plural(failed.length, 'post')} failed to publish`, detail: 'Open it to see what Meta said, then tap Retry', action: 'Open Social →', tab: 'social' };
  if (drafts.length) {
    const days = Array.from(new Set(drafts.filter((d) => d.scheduledAt).map((d) => WD[etParts(d.scheduledAt!).dow])));
    dyn.drafts = {
      id: 'drafts', tone: 'a', icon: '▣', title: `${plural(drafts.length, 'post')} waiting for approval`,
      detail: days.length ? `Planned for ${days.slice(0, 3).join(' + ')} — nothing goes out until it's approved` : "Nothing goes out until it's approved",
      action: 'Review posts →', tab: 'social',
    };
  }
  if (pending.length) dyn.reviews = { id: 'reviews', tone: 'g', icon: '★', title: `${plural(pending.length, 'client')} ready to be asked for a review`, detail: 'Sending while the clean is fresh gets the most 5-stars', action: 'Open Reviews →', tab: 'reviews' };
  const order = ['overdue', 'quote', 'dms', 'failed', 'drafts', 'reviews', 'applicants'];
  h.needs = order.flatMap((id) => (id in dyn ? (dyn[id] ? [dyn[id]!] : []) : S.home.needs.filter((n) => n.id === id)));

  const upcoming = posts.filter((x) => x.scheduledAt && x.scheduledAt > now && (x.status === 'scheduled' || x.status === 'draft')).sort((a, b) => a.scheduledAt! - b.scheduledAt!);
  const next = upcoming.find((x) => x.status === 'scheduled') ?? upcoming[0] ?? null;
  h.social = {
    ...h.social,
    connected: !!connected,
    igUsername: connected?.instagram ?? null,
    unread: unanswered.length,
    nextPost: next
      ? { at: next.scheduledAt!, kind: next.kind, caption: next.caption, platforms: next.platforms, approved: next.status === 'scheduled', thumb: next.cover?.url ?? (next.media[0]?.type === 'image' ? next.media[0].url : null) }
      : null,
  };
  const rv = reviewsView(S);
  h.reviews = { ...h.reviews, pending: pending.length, sent30: rv.stats.sent30, reviewed30: rv.stats.reviewed30 };
  const st = S.social.settings;
  h.autos = {
    reviewRequests: { on: st.reviewRequests.on, note: !st.reviewRequests.on ? 'Switched off' : st.reviewRequests.mode === 'auto' ? 'Emailed automatically a few hours after a job is done' : 'Lined up in Reviews for you to send' },
    autopost: { on: !!connected, note: connected ? 'Instagram + Facebook at the scheduled minute' : 'Connect Instagram + Facebook in Social' },
    dms: { on: st.priceReply.on || st.quoteComment.on || st.afterHours.on, note: h.autos.dms.note },
  };
  h.counts = { ...h.counts, social: unanswered.length + drafts.length + failed.length, reviews: pending.length };
  return h;
}

function insightsView(S: State, range: RangeKey): InsightsPayload {
  const base = S.insights[String(range)] ?? S.insights['30'];
  const d = clone(base);
  d.generatedAt = Date.now();
  const g = S.goals;
  d.goals = {
    monthly: g,
    forRange: { quotes: scaleGoal(g.quotes, range), jobs: scaleGoal(g.jobs, range), revenue: scaleGoal(g.revenue, range), reviews: scaleGoal(g.reviews, range) },
    auto: false,
  };
  return d;
}

/* ============================================================ AI canned */

function aiCaptions(job: string, city: string, kind: string) {
  const where = city || (job.split('·')[1] ?? '').trim() || 'Boca Raton';
  const what = (job.split('·')[0] ?? '').trim() || (kind === 'REEL' ? 'Deep clean' : 'Fresh clean');
  const tag = where.toLowerCase().replace(/[^a-z]/g, '');
  return {
    options: [
      { style: 'Friendly', text: `${what} in ${where} today ✨ Same team every visit, and they left this one sparkling. Want your home to feel like this? Free quote in under an hour, link in bio. 💙` },
      { style: 'Before → after', text: `Before → after 👀 ${what.toLowerCase()} in ${where}. Every corner, every surface, every time.\n\nSave this for your next reset 📌` },
      { style: 'Short + punchy', text: `${where} just got a little shinier. ✨ Book yours — link in bio.` },
    ],
    hashtags: [`#${tag}`, `#${tag}fl`, '#housecleaning', '#deepcleaning', '#southflorida', '#cleanhome'],
    privacy: [],
  };
}

function aiRewrite(caption: string, how: string) {
  const c = caption.trim() || 'A fresh, spotless home — done by the same trusted team every visit.';
  switch (how) {
    case 'short': {
      const first = c.match(/^[^\n]*?[.!?](?=\s|$)|^[^\n]+/)?.[0] ?? c;
      return first.length > 90 ? `${first.slice(0, 87).trim()}…` : first;
    }
    case 'warm':
      return `We loved this one! 💙 ${c}\n\nThank you for trusting us with your home.`;
    case 'pro':
      return `${c.replace(/[✨]|\uD83D[\uDC99\uDE0D\uDD25\uDC40\uDCCC]/g, '').replace(/\s+/g, ' ').trim()}\n\nInsured, background-checked and detail-obsessed. Request a free quote today.`;
    case 'es':
      return `${c}\n\n¡Pide tu cotización gratis hoy! 🇪🇸`;
    case 'tags':
      return `${c}\n\n#bocaraton #housecleaning #deepcleaning #southflorida`;
    default:
      return c;
  }
}

function aiReply(c: Conversation | undefined) {
  const last = [...(c?.messages ?? [])].reverse().find((m) => m.dir === 'in')?.text.toLowerCase() ?? '';
  const first = (c?.name ?? '').replace(/^@/, '').split(/[\s._]/)[0];
  const hi = first && /^[a-z]{2,}$/i.test(first) ? `Hi ${first[0].toUpperCase()}${first.slice(1)}!` : 'Hi!';
  if (/move.?out|listing|closing/.test(last)) return `${hi} Yes — move-out cleans are one of our specialties, and we work with a lot of realtors. Send me the addresses and closing dates and I'll hold the slots for you. Quote here: ultrashinecleaningfl.com/quote`;
  if (/party|sunday|tomorrow|today/.test(last)) return `${hi} We can help with that! Weekends fill up fast, so the quickest way to lock it in is here: ultrashinecleaningfl.com/quote — we reply within the hour.`;
  if (/price|cost|how much|quote|\$/.test(last)) return `${hi} Every home gets its own quote after a quick look — here's the fastest way, and we reply within the hour: ultrashinecleaningfl.com/quote`;
  return `${hi} Thank you so much for reaching out. How can we help? 💙`;
}

/* ================================================================= router */

async function handle(S: State, method: string, url: URL, body: any): Promise<Response> {
  const path = url.pathname.replace(/\/+$/, '');
  const q = url.searchParams;
  const now = Date.now();

  /* ---- Home ---- */
  if (path === '/api/home') return json({ home: homeView(S) });

  /* ---- Clients ---- */
  if (path === '/api/clients') {
    if (method === 'PATCH') {
      if (!body || typeof body.id !== 'string' || typeof body.home !== 'object' || !body.home) return json({ error: 'Send { id, home: { bedrooms, bathrooms, sqft, pets, notes } }' }, 400);
      const num = (v: unknown, max: number) => {
        const n = Number(v);
        return Number.isFinite(n) && n > 0 && n <= max ? Math.round(n * 2) / 2 : null;
      };
      const h = body.home as HomeDetails;
      const home: HomeDetails = {
        bedrooms: num(h.bedrooms, 20),
        bathrooms: num(h.bathrooms, 20),
        sqft: num(h.sqft, 30000),
        pets: typeof h.pets === 'string' ? h.pets.slice(0, 120) : null,
        notes: typeof h.notes === 'string' ? h.notes.slice(0, 1000) : null,
      };
      S.clients.clients = S.clients.clients.map((c) => (c.id === body.id ? { ...c, home: { ...home, source: 'you' } } : c));
      return json({ home });
    }
    const out: ClientsPayload = clone({ ...S.clients, at: now });
    return json(out);
  }

  /* ---- Leads ---- */
  if (path === '/api/leads') {
    if (method === 'PATCH') {
      if (!body || typeof body.id !== 'string') return json({ error: 'Send { id, stage?, ownerNotes? }' }, 400);
      const l = S.leads.find((x) => x.id === body.id);
      if (!l) return json({ error: 'Lead not found' }, 404);
      const stage = body.stage as Stage | undefined;
      if (stage && stage !== l.stage && stage in STAGE_LABEL) {
        l.stage = stage;
        l.stageAt = now;
        if (stage !== 'new' && !l.contactedAt) l.contactedAt = now;
        l.history = [...(l.history ?? []), { at: now, text: `Moved to ${STAGE_LABEL[stage]}` }];
      }
      if (typeof body.ownerNotes === 'string') l.ownerNotes = body.ownerNotes.slice(0, 2000);
      return json({ lead: clone(l) });
    }
    const leads: LeadRecord[] = clone(S.leads);
    return json({ leads, stats: leadStats(leads) });
  }

  /* ---- Reviews ---- */
  if (path === '/api/reviews/overview') return json({ overview: reviewsView(S) });
  if (path === '/api/reviews/requests') {
    if (method === 'POST') {
      if (body?.action === 'check-now') {
        await sleep(700);
        const done = S.reviews.requests.filter((r) => now - r.completedAt < 2 * DAY).length;
        return json({
          result: { checked: done, sent: 0, queued: 0, skipped: 0, note: `Checked Jobber — ${plural(done, 'job')} finished in the last 2 days, all already in the list.` },
          requests: reviewsView(S).requests,
        });
      }
      const r = S.reviews.requests.find((x) => x.id === body?.id);
      if (!r) return json({ error: 'Missing id' }, 400);
      if (body.action === 'skip') Object.assign(r, { status: 'skipped', reason: 'Skipped by you' });
      else {
        await sleep(500);
        Object.assign(r, { status: 'sent', sentAt: now, reason: undefined });
      }
      return json({ request: clone(r) });
    }
    return json({ requests: reviewsView(S).requests, canEmailCustomers: true });
  }
  if (path === '/api/admin/send-review-request') {
    const name = String(body?.name ?? '').trim();
    const email = String(body?.email ?? '').trim();
    if (!name || !email) return json({ error: 'Name + email required' }, 400);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Invalid email address' }, 400);
    await sleep(600);
    return json({ ok: true, id: `em_${now.toString(36)}` });
  }

  /* ---- Insights ---- */
  if (path === '/api/insights') {
    if (method === 'POST') {
      const g = body?.goals;
      if (!g || typeof g !== 'object') return json({ error: 'Send { goals: { quotes, jobs, revenue, reviews } }' }, 400);
      const clean = (v: unknown) => {
        const n = Math.round(Number(v));
        return Number.isFinite(n) && n > 0 && n < 10_000_000 ? n : null;
      };
      const next: Goals = {
        quotes: clean(g.quotes) ?? S.goals.quotes,
        jobs: clean(g.jobs) ?? S.goals.jobs,
        revenue: clean(g.revenue) ?? S.goals.revenue,
        reviews: clean(g.reviews) ?? S.goals.reviews,
      };
      S.goals = next;
      return json({ goals: next });
    }
    const r = Number(q.get('range'));
    const range = ([7, 30, 90, 365].includes(r) ? r : 30) as RangeKey;
    if (q.get('refresh') === '1') await sleep(500);
    return json({ insights: insightsView(S, range), demo: false });
  }

  /* ---- Social: status + settings ---- */
  if (path === '/api/social/status') {
    if (method === 'POST' && body?.action === 'disconnect') S.social.status.connected = null;
    return method === 'POST' ? json({ ok: true }) : json(clone(S.social.status));
  }
  if (path === '/api/social/settings') {
    if (method === 'PUT') {
      const s = S.social.settings as any;
      const b = (body ?? {}) as Partial<AutomationSettings>;
      for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AutomationSettings)[]) {
        const patch = (b as any)[key];
        if (!patch || typeof patch !== 'object') continue;
        for (const [k, v] of Object.entries(patch)) {
          if (v === undefined) continue;
          if (typeof v === 'string') s[key][k] = k === 'keyword' ? v.slice(0, 30).trim() : v.slice(0, 600);
          else if (typeof v === 'boolean' || typeof v === 'number') s[key][k] = v;
        }
      }
      return json({ settings: clone(S.social.settings) });
    }
    return json({ settings: clone(S.social.settings), defaults: DEFAULT_SETTINGS });
  }

  /* ---- Social: posts ---- */
  if (path === '/api/social/posts') {
    if (method === 'POST') {
      const b = body ?? {};
      const KINDS: PostKind[] = ['POST', 'CAROUSEL', 'REEL', 'STORY'];
      const kind: PostKind = KINDS.includes(b.kind) ? b.kind : 'POST';
      const media: MediaItem[] = Array.isArray(b.media)
        ? b.media.filter((m: any) => typeof m?.url === 'string').slice(0, 10).map((m: any) => ({ url: m.url, type: m.type === 'video' ? 'video' : 'image' }))
        : [];
      if (!media.length) return json({ error: 'Add a photo or video first.' }, 400);
      if (kind === 'REEL' && !media.some((m) => m.type === 'video')) return json({ error: 'A reel needs a video.' }, 400);
      const platforms: Platform[] = Array.isArray(b.platforms) ? b.platforms.filter((p: any) => p === 'instagram' || p === 'facebook') : ['instagram', 'facebook'];
      if (!platforms.length) return json({ error: 'Pick Instagram, Facebook or both.' }, 400);
      const mode = b.mode === 'now' ? 'now' : b.mode === 'schedule' ? 'schedule' : 'draft';
      const scheduledAt = typeof b.scheduledAt === 'number' && b.scheduledAt > 0 ? b.scheduledAt : null;
      if (mode === 'schedule' && (!scheduledAt || scheduledAt < now - 60_000)) return json({ error: 'Pick a time in the future (or Post now).' }, 400);
      const post: SocialPost = {
        id: `p_${now.toString(36)}`,
        kind,
        media,
        cover: kind === 'REEL' && typeof b.cover?.url === 'string' ? { url: b.cover.url, type: 'image' } : undefined,
        caption: typeof b.caption === 'string' ? b.caption.slice(0, 2200) : '',
        platforms,
        scheduledAt: mode === 'now' ? now : scheduledAt,
        status: mode === 'draft' ? 'draft' : 'scheduled',
        createdAt: now,
        createdBy: 'Admin',
        jobRef: typeof b.jobRef === 'string' ? b.jobRef.slice(0, 120) : undefined,
        city: typeof b.city === 'string' ? b.city.slice(0, 60) : undefined,
        results: {},
        history: [{ at: now, text: mode === 'draft' ? 'Saved as a draft' : 'Created and approved' }],
      };
      if (mode !== 'draft') {
        post.approvedBy = 'Admin';
        post.approvedAt = now;
      }
      if (mode === 'now') {
        await sleep(1200);
        publish(post, now);
      }
      S.social.posts.push(post);
      return json(mode === 'now' ? { post: clone(post), result: { ok: true } } : { post: clone(post) });
    }
    const from = Number(q.get('from')) || now - 14 * DAY;
    const to = Number(q.get('to')) || now + 28 * DAY;
    return json({ posts: clone(S.social.posts.filter((p) => p.scheduledAt == null || (p.scheduledAt >= from && p.scheduledAt < to))) });
  }
  const postMatch = path.match(/^\/api\/social\/posts\/([^/]+)$/);
  if (postMatch) {
    const id = decodeURIComponent(postMatch[1]);
    const p = S.social.posts.find((x) => x.id === id);
    if (method === 'DELETE') {
      if (!p) return json({ ok: true });
      S.social.posts = S.social.posts.filter((x) => x.id !== id);
      return json({ ok: true, wasPublished: p.status === 'published' });
    }
    if (!p) return json({ error: 'Post not found' }, 404);
    const b = body ?? {};
    const editable = p.status !== 'published';
    if (editable && typeof b.caption === 'string') p.caption = b.caption.slice(0, 2200);
    if (editable && Array.isArray(b.platforms)) {
      const pl = b.platforms.filter((x: any) => x === 'instagram' || x === 'facebook') as Platform[];
      if (pl.length) p.platforms = pl;
    }
    if (editable && p.kind === 'REEL' && b.cover !== undefined) {
      p.cover = b.cover === null ? undefined : typeof b.cover?.url === 'string' ? { url: b.cover.url, type: 'image' } : p.cover;
      p.history.push({ at: now, text: p.cover ? 'Cover image set' : 'Cover image removed' });
    }
    if (editable && (typeof b.scheduledAt === 'number' || b.scheduledAt === null) && b.scheduledAt !== p.scheduledAt) {
      if (b.scheduledAt && b.scheduledAt < now - 60_000 && p.status === 'scheduled') return json({ error: 'That time has passed. Pick a later time or use Post now.' }, 400);
      p.scheduledAt = b.scheduledAt;
      p.history.push({ at: now, text: 'Moved to a new time' });
    }
    switch (b.action) {
      case 'approve':
        if (!p.scheduledAt || p.scheduledAt < now) return json({ error: 'Give it a time first (or Post now).' }, 400);
        p.status = 'scheduled';
        p.approvedBy = 'Admin';
        p.approvedAt = now;
        p.changeNote = undefined;
        p.history.push({ at: now, text: 'Approved by Admin' });
        break;
      case 'to-draft':
        p.status = 'draft';
        p.history.push({ at: now, text: 'Moved back to draft' });
        break;
      case 'request-changes':
        p.status = 'draft';
        p.changeNote = typeof b.note === 'string' ? b.note.slice(0, 600) : '';
        p.history.push({ at: now, text: `Changes requested: ${p.changeNote || '(no note)'}` });
        break;
      case 'publish-now':
      case 'retry':
        if (b.action === 'publish-now') {
          p.scheduledAt = now;
          p.approvedBy = p.approvedBy ?? 'Admin';
          p.approvedAt = p.approvedAt ?? now;
        }
        p.history.push({ at: now, text: b.action === 'retry' ? 'Retry requested' : 'Post now' });
        await sleep(1200);
        publish(p, now);
        return json({ post: clone(p), result: { ok: true } });
    }
    return json({ post: clone(p) });
  }
  if (path === '/api/social/upload') return json({ error: 'Uploads stay on this device here.' }, 400);

  /* ---- Social: inbox ---- */
  if (path === '/api/social/inbox') {
    materializeReplies(S);
    if (method === 'POST') {
      const c = S.social.convs.find((x) => x.key === body?.key);
      if (!c) return json({ error: 'Conversation not found' }, 400);
      const text =
        body?.action === 'review'
          ? 'Thank you so much for choosing Ultra Shine! If you have 60 seconds, a Google review helps our small family business a lot: ultrashinecleaningfl.com/r'
          : String(body?.text ?? '').trim().slice(0, 1000);
      if (!text) return json({ error: 'Type a message first' }, 400);
      if (!canReply(c, now)) return json({ error: 'Meta only allows replies within 24 hours of their last message. Reply from the Instagram app instead.' }, 400);
      await sleep(400);
      c.messages.push({ dir: 'out', text, at: now, by: 'Admin' });
      c.lastActivityAt = now;
      if (c.followUp?.scheduledFor) c.followUp = { skipped: 'you replied' };
      if (body?.action !== 'review') {
        const quote = !c.quoteSubmittedAt && /quote/i.test(text);
        S.pendingReplies.push({
          key: c.key,
          at: now + 6000,
          quote,
          text: quote ? 'Perfect, just filled it out! 🙌' : /move.?out|listing/i.test(c.messages[0]?.text ?? '') ? 'Amazing, sending you the addresses now 🙏' : 'Thank you!! 💙',
        });
      }
      return json({ conv: clone(c) });
    }
    const convs = [...S.social.convs]
      .sort((a, b) => b.lastActivityAt - a.lastActivityAt)
      .map((c) => ({ ...clone(c), canReply: canReply(c, now), windowEndsAt: c.kind === 'dm' ? c.lastInboundAt + 24 * H : null }));
    return json({ convs });
  }

  /* ---- Social: insights + AI ---- */
  if (path === '/api/social/insights') {
    if (q.get('refresh') === '1') {
      await sleep(900);
      S.social.insights.at = now;
    }
    return json({ insights: clone(S.social.insights) });
  }
  if (path === '/api/social/ai') {
    await sleep(1100);
    if (body?.task === 'captions') return json(aiCaptions(String(body.job ?? ''), String(body.city ?? ''), String(body.kind ?? 'POST')));
    if (body?.task === 'rewrite') return json({ caption: aiRewrite(String(body.caption ?? ''), String(body.how ?? '')) });
    if (body?.task === 'reply') return json({ reply: aiReply(S.social.convs.find((c) => c.key === body.key)) });
    return json({ error: 'Unknown task' }, 400);
  }

  // Anything else the admin might call: a quiet success.
  return json({ ok: true });
}

function publish(p: SocialPost, now: number) {
  p.status = 'published';
  for (const pl of p.platforms) {
    const code = `${p.id}${pl === 'instagram' ? 'IG' : 'FB'}${now.toString(36)}`;
    p.results[pl] = {
      ok: true,
      id: code,
      permalink: pl === 'instagram' ? `https://www.instagram.com/p/${code}/` : `https://www.facebook.com/ultrashinecleaning/posts/${code}`,
      at: now,
    };
    p.history.push({ at: now, text: `Published to ${pl === 'instagram' ? 'Instagram' : 'Facebook'}` });
  }
}

/* ============================================================== install */

function install(data: DemoPayload) {
  if (typeof window === 'undefined' || realFetch) return;
  if (!state) state = { ...clone(data), pendingReplies: [] };
  const S = state;
  realFetch = window.fetch.bind(window);
  window.__DEMO__ = true;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    let url: URL;
    try {
      url = new URL(raw, window.location.href);
    } catch {
      return realFetch!(input, init);
    }
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) return realFetch!(input, init);
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    let body: any = null;
    try {
      const text = typeof init?.body === 'string' ? init.body : input instanceof Request ? await input.clone().text() : '';
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    await sleep(120 + Math.random() * 220);
    return handle(S, method, url, body);
  };
}

function uninstall() {
  if (typeof window === 'undefined' || !realFetch) return;
  window.fetch = realFetch;
  realFetch = null;
  delete window.__DEMO__;
}

const EXTERNAL: [RegExp, string][] = [
  [/(^|\.)getjobber\.com$/, 'Opens in Jobber'],
  [/(^|\.)vercel\.com$/, 'Opens your Vercel dashboard'],
  [/(^|\.)github\.com$/, 'Opens your GitHub repo'],
  [/(^|\.)resend\.com$/, 'Opens your Resend dashboard'],
  [/^business\.google\.com$/, 'Opens your Google Business Profile'],
  [/^developers\.facebook\.com$/, 'Opens Meta for Developers'],
  [/(^|\.)instagram\.com$/, 'Opens the post on Instagram'],
  [/(^|\.)facebook\.com$/, 'Opens the post on Facebook'],
];

/* ============================================================ component */

export default function DemoFetchShim({ data }: { data: DemoPayload }) {
  // Installed during the first client render, before any tab's effect can fetch.
  if (typeof window !== 'undefined') install(data);

  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    install(data);
    toastFn = (m: string) => {
      setMsg(m);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setMsg(null), 2800);
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute('href') ?? '';
      if (/^(tel:|sms:|mailto:|#)/i.test(href)) return;
      let u: URL;
      try {
        u = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (u.origin === window.location.origin) {
        if (u.pathname.startsWith('/api/')) {
          e.preventDefault();
          if (u.pathname.startsWith('/api/social/meta/connect')) {
            if (state) state.social.status.connected = { page: 'Ultra Shine Cleaning', instagram: 'ultrashinecleaning', since: Date.now() };
            window.location.assign(`/demo?social=${encodeURIComponent('Connected @ultrashinecleaning + Ultra Shine Cleaning')}#social`);
          } else if (u.pathname.startsWith('/api/cron/daily-summary')) toast('Test email sent — check your inbox');
          else if (u.pathname.startsWith('/api/jobber/connect')) toast('Jobber is connected');
          else toast('Done');
          return;
        }
        if (u.pathname === '/admin' || u.pathname.startsWith('/admin/')) {
          e.preventDefault();
          toast('Up to date · refreshed just now');
        }
        return;
      }
      const hit = EXTERNAL.find(([re]) => re.test(u.hostname));
      if (hit) {
        e.preventDefault();
        toast(hit[1]);
      }
    };
    const onSubmit = (e: SubmitEvent) => {
      const f = e.target as HTMLFormElement | null;
      const action = f?.getAttribute('action') ?? '';
      if (!action.startsWith('/api/')) return;
      e.preventDefault();
      if (action.startsWith('/api/admin/logout')) window.location.assign('/');
      else toast('Done');
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
      toastFn = null;
      clearTimeout(timer.current);
      uninstall();
    };
  }, [data]);

  // The post drawer's Instagram preview shrinks to a sliver when the drawer's
  // content is taller than the screen (the same happens in /admin). Kept to /demo.
  const css = <style dangerouslySetInnerHTML={{ __html: '[class^="SocialTab_ig__"],[class*=" SocialTab_ig__"]{flex-shrink:0}' }} />;
  if (!msg) return css;
  return (
    <>
    {css}
    <div
      role="status"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 24,
        transform: 'translateX(-50%)',
        background: '#fff',
        color: '#000',
        borderRadius: 14,
        padding: '10px 16px',
        fontWeight: 600,
        fontSize: 13,
        zIndex: 300,
        boxShadow: '0 10px 30px rgba(0,0,0,.3)',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      {msg}
    </div>
    </>
  );
}
