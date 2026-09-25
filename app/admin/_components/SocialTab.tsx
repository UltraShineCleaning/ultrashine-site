'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { upload } from '@vercel/blob/client';
import s from './SocialTab.module.css';
import { etParts, etToMs } from '../../_lib/social/time';
import type {
  AutomationSettings,
  Conversation,
  MediaItem,
  Platform,
  PostKind,
  PostStatus,
  SocialPost,
} from '../../_lib/social/types';

/**
 * Admin → Social. The locked dark design (00_STATE/design-social-v2-dark.html),
 * wired to the real API:
 *   /api/social/posts · /posts/:id · /upload · /inbox · /settings · /status · /insights · /ai
 *
 * Nothing publishes or messages anyone without a person pressing a button,
 * except the automations Tiago switches on in the Automations view.
 */

type Status = {
  storage: boolean;
  scheduler: boolean;
  uploads: boolean;
  metaApp: boolean;
  webhook: boolean;
  connected: { page: string; instagram: string | null; since: number } | null;
  customerEmail: boolean;
  ai: boolean;
};
type ConvView = Conversation & { canReply: boolean; windowEndsAt: number | null };
export type RecentJob = { title: string; city: string | null; completedAt: number; clientName: string };
type Insights = {
  at: number;
  followers: number | null;
  history: { day: string; followers: number }[];
  media: { id: string; caption?: string; type: string; permalink?: string; thumb?: string; at: string; reach?: number; likes?: number }[];
  error?: string;
} | null;

const KIND: Record<PostKind, string> = { POST: 'Post', CAROUSEL: 'Carousel', REEL: 'Reel', STORY: 'Story' };
const STATUS_LABEL: Record<PostStatus, string> = { draft: 'Draft', scheduled: 'Scheduled', publishing: 'Publishing…', published: 'Published', failed: 'Failed' };
const STATUS_COLOR: Record<PostStatus, string> = { draft: '#fbbf24', scheduled: '#8aa8ff', publishing: '#c4b5fd', published: '#34d399', failed: '#f87171' };
const DAY = 86_400_000;
const SLOT_HOURS = [9, 12, 18];

/* ---------------- helpers ---------------- */

async function api<T = any>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: init?.json !== undefined ? { 'Content-Type': 'application/json' } : init?.headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
  return data as T;
}

const fmtTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
const fmtDay = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' });
const fmtAgo = (ms: number) => {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
};
function dayStart(ms: number) {
  const p = etParts(ms);
  return etToMs(p.y, p.m, p.d, 0, 0);
}
function weekStart(ms: number) {
  const p = etParts(ms);
  return etToMs(p.y, p.m, p.d - p.dow, 0, 0);
}
const addDays = (ms: number, n: number) => {
  const p = etParts(ms);
  return etToMs(p.y, p.m, p.d + n, p.h, p.min);
};
const toDateInput = (ms: number) => {
  const p = etParts(ms);
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
};
const toTimeInput = (ms: number) => {
  const p = etParts(ms);
  return `${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`;
};
const fromInputs = (d: string, t: string) => {
  const [y, m, dd] = d.split('-').map(Number);
  const [h, mi] = (t || '09:00').split(':').map(Number);
  return y && m && dd ? etToMs(y, m, dd, h || 0, mi || 0) : null;
};
const thumbOf = (p: SocialPost) => p.media.find((m) => m.type === 'image')?.url ?? null;
const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');

function Chip({ status }: { status: PostStatus }) {
  return <span className={cx(s.chip, s[`c_${status}`])}>{STATUS_LABEL[status]}</span>;
}

function Plats({ p }: { p: Platform[] }) {
  return (
    <span className={s.plats}>
      {p.includes('instagram') && <i style={{ background: 'var(--ig)' }} />}
      {p.includes('facebook') && <i style={{ background: 'var(--fb)' }} />}
    </span>
  );
}

function IgPreview({ kind, media, caption }: { kind: PostKind; media: { url: string; type: 'image' | 'video' }[]; caption: string }) {
  const first = media[0];
  const short = caption.length > 140 ? caption.slice(0, 140).trim() + '… more' : caption;
  return (
    <div className={s.ig}>
      <div className={s.igH}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className={s.igAv}><div><img src="/images/logo_white_tight.png" alt="" /></div></div>
        <div>
          <b style={{ fontSize: 12.5 }}>ultrashinecleaning</b>
          <div className={s.small} style={{ color: '#a1a1aa' }}>{kind === 'STORY' ? 'story' : 'Boca Raton, Florida'}</div>
        </div>
      </div>
      <div
        className={cx(s.igM, kind === 'REEL' && s.igReel, kind === 'STORY' && s.igStory)}
        style={first?.type === 'image' ? { backgroundImage: `url(${first.url})` } : undefined}
      >
        {first?.type === 'video' && <video src={first.url} muted playsInline loop autoPlay />}
        {media.length > 1 && (
          <div className={s.igDots}>
            {media.map((_, i) => <i key={i} />)}
          </div>
        )}
      </div>
      {kind !== 'STORY' && <div className={s.igC}><b>ultrashinecleaning</b> {short || <span className={s.mut}>Your caption shows here.</span>}</div>}
    </div>
  );
}

/* Convert any photo to a JPEG Instagram accepts: max 1440 px wide, feed photos cropped into 4:5…1.91:1. */
async function toJpeg(file: File, cropFeed: boolean): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error(`“${file.name}” can't be opened here. Save it as a JPG and try again.`));
      i.src = url;
    });
    let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
    if (cropFeed) {
      const r = sw / sh;
      if (r < 0.8) { const nh = sw / 0.8; sy = (sh - nh) / 2; sh = nh; }
      else if (r > 1.91) { const nw = sh * 1.91; sx = (sw - nw) / 2; sw = nw; }
    }
    const scale = Math.min(1, 1440 / sw);
    const c = document.createElement('canvas');
    c.width = Math.round(sw * scale);
    c.height = Math.round(sh * scale);
    c.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not convert the photo'))), 'image/jpeg', 0.88));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ========================================================================= */

export default function SocialTab({ recentJobs, flash }: { recentJobs: RecentJob[]; flash?: string }) {
  const [view, setView] = useState<'over' | 'cal' | 'inbox' | 'auto' | 'ins'>('over');
  const [status, setStatus] = useState<Status | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [convs, setConvs] = useState<ConvView[]>([]);
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [insights, setInsights] = useState<Insights>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [composer, setComposer] = useState<null | { day?: number; job?: RecentJob }>(null);
  const [pal, setPal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(flash ?? null);
  const toastT = useRef<ReturnType<typeof setTimeout>>();

  const toast = useCallback((m: string) => {
    setToastMsg(m);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToastMsg(null), 3200);
  }, []);
  useEffect(() => {
    if (flash) toast(flash);
  }, [flash, toast]);

  const loadPosts = useCallback(async () => {
    const from = weekStart(Date.now()) - 21 * DAY;
    const to = weekStart(Date.now()) + 63 * DAY;
    const r = await api<{ posts: SocialPost[] }>(`/api/social/posts?from=${from}&to=${to}`);
    setPosts(r.posts);
  }, []);
  const loadConvs = useCallback(async () => {
    const r = await api<{ convs: ConvView[] }>('/api/social/inbox');
    setConvs(r.convs);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [st] = await Promise.all([
        api<Status>('/api/social/status'),
        loadPosts(),
        loadConvs(),
        api<{ settings: AutomationSettings }>('/api/social/settings').then((r) => setSettings(r.settings)),
        api<{ insights: Insights }>('/api/social/insights').then((r) => setInsights(r.insights)),
      ]);
      setStatus(st);
      setLoadErr(null);
    } catch (e) {
      setLoadErr((e as Error).message);
    }
  }, [loadPosts, loadConvs]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ⌘K / Ctrl+K opens the command bar while the Social tab is visible
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && window.location.hash === '#social') {
        e.preventDefault();
        setPal(true);
      }
      if (e.key === 'Escape') {
        setPal(false);
        setOpenId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const replacePost = (p: SocialPost) => setPosts((all) => [...all.filter((x) => x.id !== p.id), p]);
  const openPost = posts.find((p) => p.id === openId) ?? null;
  const drafts = posts.filter((p) => p.status === 'draft').sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0));
  const failed = posts.filter((p) => p.status === 'failed');

  async function patch(id: string, body: Record<string, unknown>, msg?: string) {
    try {
      const r = await api<{ post: SocialPost; result?: { ok: boolean; errors?: string[] } }>(`/api/social/posts/${id}`, { method: 'PATCH', json: body });
      replacePost(r.post);
      if (r.result && !r.result.ok) toast(r.result.errors?.[0] ?? 'It did not publish — see the post for why.');
      else if (msg) toast(msg);
      return r.post;
    } catch (e) {
      toast((e as Error).message);
      return null;
    }
  }
  async function remove(p: SocialPost) {
    const warn = p.status === 'published'
      ? 'Remove this from the dashboard? (It stays live on Instagram/Facebook — delete it there if you want it gone.)'
      : 'Delete this post?';
    if (!window.confirm(warn)) return;
    try {
      await api(`/api/social/posts/${p.id}`, { method: 'DELETE' });
      setPosts((all) => all.filter((x) => x.id !== p.id));
      setOpenId(null);
      toast('Deleted');
    } catch (e) {
      toast((e as Error).message);
    }
  }
  async function approveAll() {
    const ready = drafts.filter((d) => d.scheduledAt && d.scheduledAt > Date.now());
    if (!ready.length) return toast('No drafts with a future time to approve.');
    for (const d of ready) await patch(d.id, { action: 'approve' });
    toast(`Approved ${ready.length}`);
  }

  const leadCount = convs.filter((c) => c.tags.includes('lead') && !c.quoteSubmittedAt).length;

  return (
    <div className={s.root}>
      {/* ============ TOP ============ */}
      <div className={s.top}>
        {status?.connected ? (
          <>
            {status.connected.instagram && (
              <span className={s.acct}>
                <span className={s.ico} style={{ background: 'var(--ig)' }}>◎</span>@{status.connected.instagram}
                <span className={s.dot} />
              </span>
            )}
            <span className={s.acct}>
              <span className={s.ico} style={{ background: 'var(--fb)' }}>f</span>{status.connected.page}
              <span className={cx(s.dot, failed.some((f) => /Reconnect/.test(Object.values(f.results).map((r) => r?.error).join(' '))) && s.dotBad)} />
              {failed.some((f) => /Reconnect/.test(Object.values(f.results).map((r) => r?.error).join(' '))) && (
                <a className={cx(s.btn, s.sm, s.danger)} href="/api/social/meta/connect">Reconnect</a>
              )}
            </span>
          </>
        ) : (
          status?.metaApp && (
            <a className={cx(s.btn, s.primary)} href="/api/social/meta/connect">Connect Instagram + Facebook</a>
          )
        )}
        <button type="button" className={s.cmd} onClick={() => setPal(true)}>
          <span>⌕</span> <span>Search or do anything…</span> <span className={s.kbd}>⌘K</span>
        </button>
        <button type="button" className={cx(s.btn, s.primary)} onClick={() => setComposer({})}>+ Create</button>
      </div>

      <div className={s.bar}>
        <div className={s.seg}>
          {([
            ['over', 'Overview'],
            ['cal', 'Calendar'],
            ['inbox', 'Inbox'],
            ['auto', 'Automations'],
            ['ins', 'Insights'],
          ] as const).map(([k, l]) => (
            <button type="button" key={k} className={cx(view === k && s.segOn)} onClick={() => setView(k)}>
              {l}
              {k === 'inbox' && leadCount > 0 && <span className={s.n}>{leadCount}</span>}
              {k === 'over' && drafts.length > 0 && <span className={s.n}>{drafts.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {loadErr && <div className={s.alertRed} style={{ marginBottom: 12 }}>Couldn&apos;t load: {loadErr}</div>}

      {view === 'over' && (
        <Overview
          status={status}
          posts={posts}
          drafts={drafts}
          failed={failed}
          recentJobs={recentJobs}
          insights={insights}
          onOpen={setOpenId}
          onCreate={(o) => setComposer(o)}
          onApprove={(id) => patch(id, { action: 'approve' }, 'Approved · scheduled')}
          onApproveAll={approveAll}
          onPostNow={(id) => patch(id, { action: 'publish-now' }, 'Published')}
          onGo={setView}
          onDisconnect={async () => {
            if (!window.confirm('Disconnect Instagram + Facebook? Scheduled posts will fail until you connect again.')) return;
            await api('/api/social/status', { method: 'POST', json: { action: 'disconnect' } });
            loadAll();
          }}
        />
      )}
      {view === 'cal' && (
        <Calendar
          posts={posts}
          onOpen={setOpenId}
          onAdd={(day) => setComposer({ day })}
          onMove={async (p, dayMs) => {
            const old = p.scheduledAt ?? etToMs(etParts(dayMs).y, etParts(dayMs).m, etParts(dayMs).d, 9);
            const op = etParts(old);
            const dp = etParts(dayMs);
            const t = etToMs(dp.y, dp.m, dp.d, op.h, op.min);
            await patch(p.id, { scheduledAt: t }, `Moved to ${fmtDay(t)} · ${fmtTime(t)}`);
          }}
        />
      )}
      {view === 'inbox' && <Inbox convs={convs} ai={!!status?.ai} reload={loadConvs} toast={toast} />}
      {view === 'auto' && settings && (
        <Automations
          settings={settings}
          customerEmail={!!status?.customerEmail}
          onSave={async (next) => {
            try {
              const r = await api<{ settings: AutomationSettings }>('/api/social/settings', { method: 'PUT', json: next });
              setSettings(r.settings);
              toast('Saved');
            } catch (e) {
              toast((e as Error).message);
            }
          }}
        />
      )}
      {view === 'ins' && (
        <InsightsView
          insights={insights}
          posts={posts}
          onRefresh={async () => {
            const r = await api<{ insights: Insights }>('/api/social/insights?refresh=1');
            setInsights(r.insights);
            toast(r.insights?.error ? r.insights.error : 'Updated');
          }}
        />
      )}

      {openPost && (
        <PostDrawer
          key={openPost.id + openPost.status}
          post={openPost}
          ai={!!status?.ai}
          onClose={() => setOpenId(null)}
          onPatch={(body, msg) => patch(openPost.id, body, msg)}
          onDelete={() => remove(openPost)}
          toast={toast}
        />
      )}
      {composer && (
        <Composer
          init={composer}
          posts={posts}
          status={status}
          recentJobs={recentJobs}
          onClose={() => setComposer(null)}
          onSaved={(p, msg) => {
            replacePost(p);
            setComposer(null);
            toast(msg);
          }}
          toast={toast}
        />
      )}
      {pal && (
        <Palette
          onClose={() => setPal(false)}
          actions={[
            { label: 'Create a post, reel or story', run: () => setComposer({}) },
            { label: `Approve all drafts${drafts.length ? ` (${drafts.length})` : ''}`, run: approveAll },
            ...(failed.length ? [{ label: `Open the failed post (${failed.length})`, run: () => setOpenId(failed[0].id) }] : []),
            { label: 'Open Calendar', run: () => setView('cal') },
            { label: 'Open Inbox', run: () => setView('inbox') },
            { label: 'Open Automations', run: () => setView('auto') },
            { label: 'Open Insights', run: () => setView('ins') },
            { label: 'Refresh everything', run: loadAll },
            ...(status?.metaApp ? [{ label: status.connected ? 'Reconnect Instagram + Facebook' : 'Connect Instagram + Facebook', run: () => (window.location.href = '/api/social/meta/connect') }] : []),
          ]}
        />
      )}
      {toastMsg && <div className={s.toast}>{toastMsg}</div>}
    </div>
  );
}

/* ================================ OVERVIEW ================================ */

function Overview(props: {
  status: Status | null;
  posts: SocialPost[];
  drafts: SocialPost[];
  failed: SocialPost[];
  recentJobs: RecentJob[];
  insights: Insights;
  onOpen: (id: string) => void;
  onCreate: (o: { day?: number; job?: RecentJob }) => void;
  onApprove: (id: string) => void;
  onApproveAll: () => void;
  onPostNow: (id: string) => void;
  onGo: (v: 'cal' | 'inbox' | 'auto' | 'ins') => void;
  onDisconnect: () => void;
}) {
  const { status, posts, drafts, failed, recentJobs, insights } = props;
  const [howTo, setHowTo] = useState(false);
  const now = Date.now();
  const next = posts
    .filter((p) => p.status === 'scheduled' && (p.scheduledAt ?? 0) > now)
    .sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0))[0];
  const ws = weekStart(now);
  const week = posts.filter((p) => (p.scheduledAt ?? 0) >= ws && (p.scheduledAt ?? 0) < ws + 7 * DAY);
  const out = week.filter((p) => p.status === 'published').length;
  const pct = week.length ? out / week.length : 0;

  // Rule-based coach (free — no AI needed)
  const tips: { icon: string; title: string; body: string; action?: { label: string; run: () => void } }[] = [];
  if (status && !status.connected) tips.push({ icon: '⚑', title: 'Not connected yet.', body: 'Connect Instagram + Facebook so approved posts can go out.' });
  if (failed.length) tips.push({ icon: '!', title: `${failed.length} post${failed.length > 1 ? 's' : ''} didn't go out.`, body: 'Open it to see why, then Retry.', action: { label: 'Open', run: () => props.onOpen(failed[0].id) } });
  for (let i = 0; i < 7 && tips.length < 3; i++) {
    const d = dayStart(addDays(now, i));
    const has = posts.some((p) => p.kind !== 'STORY' && p.status !== 'failed' && (p.scheduledAt ?? 0) >= d && (p.scheduledAt ?? 0) < d + DAY);
    if (!has) {
      tips.push({ icon: '◷', title: `${i === 0 ? 'Today' : fmtDay(d).split(',')[0]} has nothing scheduled.`, body: 'One post keeps the account active.', action: { label: 'Create for that day', run: () => props.onCreate({ day: d }) } });
      break;
    }
  }
  if (recentJobs.length && tips.length < 3)
    tips.push({ icon: '★', title: `${recentJobs.length} job${recentJobs.length > 1 ? 's' : ''} finished this week.`, body: 'Before/afters from real jobs are the posts that do best.', action: { label: 'Add photos', run: () => props.onCreate({ job: recentJobs[0] }) } });

  const setupItems: [boolean, string, string][] = status
    ? [
        [status.storage, 'Storage (Upstash Redis)', 'Already used by Jobber — add the KV vars if this is red'],
        [status.uploads, 'Photo + video uploads (Vercel Blob)', 'Vercel → Storage → create a Blob store → connect to this project'],
        [status.scheduler, 'Exact-minute scheduling (QStash)', 'Upstash console → QStash → copy the 3 keys into Vercel'],
        [status.metaApp, 'Meta app', 'META_APP_ID + META_APP_SECRET in Vercel'],
        [!!status.connected, 'Instagram + Facebook connected', 'Tap Connect at the top'],
        [status.webhook, 'DMs + comments feed (webhook)', 'META_WEBHOOK_VERIFY_TOKEN in Vercel + webhook added in the Meta app'],
        [status.customerEmail, 'Emails to customers (review requests)', 'Verify your domain in Resend + set QUOTE_FROM_EMAIL'],
      ]
    : [];
  const setupDone = setupItems.every(([ok]) => ok);

  return (
    <div className={s.bento}>
      {status && !setupDone && (
        <div className={cx(s.card, s.setup, s.s12)}>
          <div className={s.ch}>
            <h3>Setup · {setupItems.filter(([ok]) => ok).length} of {setupItems.length} done</h3>
            <span className={s.small + ' ' + s.mut}>Everything works as each piece turns green</span>
          </div>
          {setupItems.map(([ok, what, how]) => (
            <div key={what} className={s.checkRow}>
              <span className={cx(s.dot, !ok && s.dotOff)} />
              <div className={s.what}>
                {what}
                {!ok && <span>{how}</span>}
              </div>
              {what.startsWith('Instagram') && !ok && status.metaApp && (
                <a className={cx(s.btn, s.sm, s.primary)} href="/api/social/meta/connect">Connect</a>
              )}
            </div>
          ))}
          <div className={s.small + ' ' + s.soft} style={{ marginTop: 8 }}>
            ✦ AI buttons are {status.ai ? 'on' : 'off'} — {status.ai ? 'using your Anthropic key' : 'captions come from your Claude sessions instead (no extra cost)'}.
          </div>
        </div>
      )}

      <div className={cx(s.card, s.s12)}>
        <div className={s.ch}><h3>Connected accounts</h3>{status?.connected && <span className={s.small + ' ' + s.mut}>since {fmtDay(status.connected.since)}</span>}</div>
        <div className={s.conns}>
          <div className={s.conn}>
            <span className={s.connIco} style={{ background: 'var(--ig)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
            </span>
            <span className={s.connT}>
              <b>Instagram</b>
              <span>{status?.connected?.instagram ? `@${status.connected.instagram} · connected` : status?.connected ? 'No Instagram business account on the Page yet' : 'Not connected'}</span>
            </span>
            <span className={cx(s.dot, !status?.connected?.instagram && s.dotOff)} />
          </div>
          <div className={s.conn}>
            <span className={s.connIco} style={{ background: 'var(--fb)' }}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21z" /></svg>
            </span>
            <span className={s.connT}>
              <b>Facebook Page</b>
              <span>{status?.connected ? `${status.connected.page} · connected` : 'Not connected'}</span>
            </span>
            <span className={cx(s.dot, !status?.connected && s.dotOff)} />
          </div>
        </div>
        <div className={s.row} style={{ marginTop: 12 }}>
          {status?.metaApp ? (
            <a className={cx(s.btn, status.connected ? '' : s.primary)} href="/api/social/meta/connect">{status.connected ? 'Reconnect' : 'Connect Instagram + Facebook'}</a>
          ) : (
            /* Not a dead button: until the Meta app exists there is nothing to
               log in to, so the click opens the checklist that unlocks it. */
            <button type="button" className={cx(s.btn, s.primary)} onClick={() => setHowTo((v) => !v)} aria-expanded={howTo}>
              {howTo ? 'Hide steps' : 'Connect Instagram + Facebook'}
            </button>
          )}
          {status?.connected && <button type="button" className={cx(s.btn, s.ghost)} onClick={props.onDisconnect}>Disconnect</button>}
        </div>
        {!status?.metaApp && howTo && (
          <div className={s.howTo}>
            <div className={s.small + ' ' + s.mut}>Connecting opens a Facebook log-in, which needs our Meta app to exist first. Four steps, once:</div>
            <ol>
              <li><b>Instagram → Professional account</b><span>Instagram app → Settings → Account type → switch to Business, then link it to the Ultra Shine Facebook Page.</span></li>
              <li><b>Create the Meta app</b><span><a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">developers.facebook.com/apps</a> → Create app → Business type.</span></li>
              <li><b>Add the two keys in Vercel</b><span>App settings → Basic → copy App ID + App Secret into Vercel as META_APP_ID and META_APP_SECRET, then redeploy.</span></li>
              <li><b>Come back and click Connect</b><span>This button turns into the real log-in. Log in once — it stays connected.</span></li>
            </ol>
          </div>
        )}
      </div>

      <div className={cx(s.card, s.s5)}>
        <div className={s.ch}><h3>Next up</h3>{next && <Chip status="scheduled" />}</div>
        {next ? (
          <div className={s.next}>
            <div className={s.nextMedia} style={thumbOf(next) ? { backgroundImage: `url(${thumbOf(next)})` } : undefined}>
              <span className={s.tag}>{KIND[next.kind].toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
              <div>
                <div className={s.small + ' ' + s.mut}>Goes live</div>
                <div className={s.big} style={{ fontSize: 26 }}>{fmtTime(next.scheduledAt!)}</div>
                <div className={s.small + ' ' + s.mut}>{fmtDay(next.scheduledAt!)}</div>
              </div>
              <Plats p={next.platforms} />
              <div className={cx(s.mut, s.clamp3)}>{next.caption || '(no caption)'}</div>
              <div className={s.row}>
                <button type="button" className={cx(s.btn, s.sm)} onClick={() => props.onOpen(next.id)}>Open</button>
                <button type="button" className={cx(s.btn, s.sm)} onClick={() => window.confirm('Publish it now?') && props.onPostNow(next.id)}>Post now</button>
              </div>
            </div>
          </div>
        ) : (
          <div className={s.empty}>Nothing scheduled yet.<br /><button type="button" className={cx(s.btn, s.sm)} style={{ marginTop: 10 }} onClick={() => props.onCreate({})}>+ Create</button></div>
        )}
      </div>

      <div className={cx(s.card, s.s4)}>
        <div className={s.ch}><h3>Needs your OK</h3><span className={s.small + ' ' + s.mut}>{drafts.length} draft{drafts.length === 1 ? '' : 's'}</span></div>
        <div className={s.list}>
          {drafts.slice(0, 4).map((d) => (
            <div key={d.id} className={s.okRow} role="button" tabIndex={0} onClick={() => props.onOpen(d.id)} onKeyDown={(e) => e.key === 'Enter' && props.onOpen(d.id)}>
              <div className={s.okThumb} style={thumbOf(d) ? { backgroundImage: `url(${thumbOf(d)})` } : undefined} />
              <div className={s.okText}>
                <b>{KIND[d.kind]} · {d.scheduledAt ? `${fmtDay(d.scheduledAt).split(',')[0]} ${fmtTime(d.scheduledAt)}` : 'no time yet'}</b>
                <span>{d.changeNote ? `✎ ${d.changeNote}` : d.caption || '(no caption)'}</span>
              </div>
              <button
                type="button"
                className={s.tick}
                title="Approve"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onApprove(d.id);
                }}
              >✓</button>
            </div>
          ))}
          {!drafts.length && <div className={s.empty}>All caught up ✓</div>}
        </div>
        {drafts.length > 1 && (
          <div className={s.row} style={{ marginTop: 12 }}>
            <button type="button" className={cx(s.btn, s.sm, s.primary)} style={{ flex: 1, justifyContent: 'center' }} onClick={props.onApproveAll}>Approve all</button>
            <button type="button" className={cx(s.btn, s.sm)} style={{ flex: 1, justifyContent: 'center' }} onClick={() => props.onOpen(drafts[0].id)}>One by one</button>
          </div>
        )}
      </div>

      <div className={cx(s.card, s.s3)}>
        <div className={s.ch}><h3>This week</h3></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div className={s.ring}>
            <svg width="104" height="104" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r="46" stroke="#1b1c22" strokeWidth="10" fill="none" />
              <circle cx="55" cy="55" r="46" stroke="#fff" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray="289" strokeDashoffset={289 - 289 * pct} />
            </svg>
            <div className={s.ringIn}><div><div className={s.big} style={{ fontSize: 24 }}>{out}</div><div className={s.small + ' ' + s.mut}>of {week.length} out</div></div></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button type="button" className={cx(s.chip, s.c_scheduled)} onClick={() => props.onGo('cal')}>{week.filter((p) => p.status === 'scheduled').length} scheduled</button>
            <button type="button" className={cx(s.chip, s.c_draft)} onClick={() => drafts[0] && props.onOpen(drafts[0].id)}>{drafts.length} drafts</button>
            {failed.length > 0 && <button type="button" className={cx(s.chip, s.c_failed)} onClick={() => props.onOpen(failed[0].id)}>{failed.length} failed</button>}
          </div>
        </div>
      </div>

      <div className={cx(s.card, s.coach, s.s5)}>
        <div className={s.ch}><h3 style={{ color: '#ddd6fe' }}>Coach</h3><span className={s.small + ' ' + s.mut}>from your calendar + jobs</span></div>
        {tips.length ? tips.map((t, i) => (
          <div key={i} className={s.tip}>
            <div className={s.tipIco}>{t.icon}</div>
            <div>
              <b>{t.title}</b> <span className={s.mut}>{t.body}</span>
              {t.action && <div style={{ marginTop: 8 }}><button type="button" className={cx(s.btn, s.sm)} onClick={t.action.run}>{t.action.label}</button></div>}
            </div>
          </div>
        )) : <div className={s.mut}>All good this week ✓</div>}
      </div>

      <div className={cx(s.card, s.s4)}>
        <div className={s.ch}><h3>From your jobs</h3><span className={s.small + ' ' + s.mut}>Jobber · last 7 days</span></div>
        {recentJobs.slice(0, 5).map((j, i) => {
          const d = etParts(j.completedAt);
          return (
            <div key={i} className={s.job}>
              <div className={s.jd}><b>{d.d}</b><span>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.dow]}</span></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 13 }}>{j.title}{j.city ? ` · ${j.city}` : ''}</b>
                <div className={s.small + ' ' + s.mut}>{j.clientName.split(' ')[0]}</div>
              </div>
              <button type="button" className={cx(s.btn, s.sm)} onClick={() => props.onCreate({ job: j })}>Add photos</button>
            </div>
          );
        })}
        {!recentJobs.length && <div className={s.empty}>No completed jobs in Jobber this week.</div>}
      </div>

      <div className={cx(s.card, s.s3)} role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => props.onGo('ins')} onKeyDown={(e) => e.key === 'Enter' && props.onGo('ins')}>
        <div className={s.ch}><h3>Followers</h3><span className={s.small + ' ' + s.mut}>→</span></div>
        <div className={s.big}>{insights?.followers ?? '—'}</div>
        <div className={s.small + ' ' + s.mut} style={{ marginTop: 6 }}>{insights?.at ? `updated ${fmtAgo(insights.at)} ago` : 'fills in once connected'}</div>
      </div>
    </div>
  );
}

/* ================================ CALENDAR (month) ================================ */

function monthStartOf(ms: number) {
  const p = etParts(ms);
  return etToMs(p.y, p.m, 1, 0, 0);
}

function Calendar(props: { posts: SocialPost[]; onOpen: (id: string) => void; onAdd: (day: number) => void; onMove: (p: SocialPost, dayMs: number) => void }) {
  const [ms, setMs] = useState(() => monthStartOf(Date.now()));
  const [over, setOver] = useState<number | null>(null);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const today = dayStart(Date.now());
  const mp = etParts(ms);
  const gridStart = weekStart(ms + 12 * 3600_000);
  const daysInMonth = new Date(Date.UTC(mp.y, mp.m, 0)).getUTCDate();
  const weeks = Math.ceil((etParts(ms).dow + daysInMonth) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => dayStart(addDays(gridStart + 12 * 3600_000, i)));
  const postsOn = (d: number) =>
    props.posts.filter((p) => p.scheduledAt && p.scheduledAt >= d && p.scheduledAt < d + DAY).sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0));
  const monthName = new Date(ms + 12 * 3600_000).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'long', year: 'numeric' });
  const shift = (n: number) => setMs(monthStartOf(etToMs(mp.y, mp.m + n, 15, 12)));
  const dayList = openDay !== null ? postsOn(openDay) : [];

  return (
    <>
      <div className={s.weekHead}>
        <button type="button" className={cx(s.btn, s.sm)} onClick={() => shift(-1)} aria-label="Previous month">‹</button>
        <b style={{ fontSize: 15, minWidth: 150, textAlign: 'center' }}>{monthName}</b>
        <button type="button" className={cx(s.btn, s.sm)} onClick={() => shift(1)} aria-label="Next month">›</button>
        <button type="button" className={cx(s.btn, s.sm)} onClick={() => setMs(monthStartOf(Date.now()))}>Today</button>
        <span className={s.legend}>
          <span><i style={{ background: 'var(--amber)' }} />Draft</span>
          <span><i style={{ background: '#8aa8ff' }} />Scheduled</span>
          <span><i style={{ background: 'var(--green)' }} />Published</span>
          <span><i style={{ background: 'var(--red)' }} />Failed</span>
        </span>
      </div>
      <div className={s.month}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className={s.dow}>{d}</div>)}
        {cells.map((d) => {
          const list = postsOn(d);
          const p = etParts(d);
          const inMonth = p.m === mp.m;
          return (
            <div
              role="button"
              tabIndex={0}
              key={d}
              aria-label={`${fmtDay(d)}, ${list.length} item${list.length === 1 ? '' : 's'}`}
              className={cx(s.mCell, !inMonth && s.mOut, d === today && s.mToday, over === d && s.mDrop, openDay === d && s.mSel)}
              onClick={() => setOpenDay(d)}
              onKeyDown={(e) => e.key === 'Enter' && setOpenDay(d)}
              onDragOver={(e) => { e.preventDefault(); setOver(d); }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const post = props.posts.find((x) => x.id === e.dataTransfer.getData('text/plain'));
                if (post) props.onMove(post, d);
              }}
            >
              <span className={s.mNum}>{p.d}</span>
              <span className={s.mThumbs}>
                {list.slice(0, 3).map((x) => (
                  <span
                    key={x.id}
                    className={s.mThumb}
                    draggable={x.status === 'draft' || x.status === 'scheduled'}
                    onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData('text/plain', x.id); }}
                    style={{ backgroundImage: thumbOf(x) ? `url(${thumbOf(x)})` : undefined, borderColor: STATUS_COLOR[x.status] }}
                    title={`${fmtTime(x.scheduledAt!)} · ${KIND[x.kind]} · ${STATUS_LABEL[x.status]}`}
                  />
                ))}
                {list.length > 3 && <span className={s.mMore}>+{list.length - 3}</span>}
              </span>
              {list.length > 0 && (
                <span className={s.mDots}>
                  {list.map((x) => <i key={x.id} style={{ background: STATUS_COLOR[x.status] }} />)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className={s.small + ' ' + s.soft} style={{ margin: '10px 6px 0' }}>Tap a day to see everything on it. Drag a thumbnail onto another day to move it.</div>

      {openDay !== null && (
        <>
          <div className={s.scrim} onClick={() => setOpenDay(null)} />
          <aside className={s.drawer}>
            <div className={s.dH}>
              <b style={{ fontSize: 14 }}>{fmtDay(openDay)}</b>
              <span className={s.small + ' ' + s.mut}>{dayList.length} item{dayList.length === 1 ? '' : 's'}</span>
              <button type="button" className={cx(s.btn, s.sm, s.ghost)} style={{ marginLeft: 'auto' }} onClick={() => setOpenDay(null)}>✕</button>
            </div>
            <div className={s.dB}>
              {dayList.map((x) => (
                <button type="button" key={x.id} className={s.dayRow} onClick={() => { setOpenDay(null); props.onOpen(x.id); }}>
                  <span className={s.dayImg} style={thumbOf(x) ? { backgroundImage: `url(${thumbOf(x)})` } : undefined}>
                    <span className={s.tag}>{KIND[x.kind].toUpperCase()}</span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span className={s.row} style={{ justifyContent: 'space-between' }}>
                      <b>{fmtTime(x.scheduledAt!)}</b>
                      <Plats p={x.platforms} />
                    </span>
                    <Chip status={x.status} />
                    <span className={s.cp}>{x.kind === 'STORY' ? 'Story · shows for 24 hours' : x.caption || '(no caption)'}</span>
                  </span>
                </button>
              ))}
              {!dayList.length && <div className={s.empty}>Nothing on this day yet.</div>}
            </div>
            <div className={s.dF}>
              {openDay >= today ? (
                <button type="button" className={cx(s.btn, s.primary, s.push)} onClick={() => { const d = openDay; setOpenDay(null); props.onAdd(d); }}>+ Add to this day</button>
              ) : (
                <span className={s.small + ' ' + s.mut}>This day has passed.</span>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}

/* ================================ POST DRAWER ================================ */

function PostDrawer(props: {
  post: SocialPost;
  ai: boolean;
  onClose: () => void;
  onPatch: (body: Record<string, unknown>, msg?: string) => Promise<SocialPost | null>;
  onDelete: () => void;
  toast: (m: string) => void;
}) {
  const p = props.post;
  const [caption, setCaption] = useState(p.caption);
  const [platforms, setPlatforms] = useState<Platform[]>(p.platforms);
  const [date, setDate] = useState(p.scheduledAt ? toDateInput(p.scheduledAt) : toDateInput(Date.now() + DAY));
  const [time, setTime] = useState(p.scheduledAt ? toTimeInput(p.scheduledAt) : '09:00');
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = p.status === 'published' || p.status === 'publishing';
  const when = fromInputs(date, time);
  const changed = caption !== p.caption || platforms.join() !== p.platforms.join() || (when ?? null) !== (p.scheduledAt ?? null);

  const run = async (body: Record<string, unknown>, msg?: string) => {
    setBusy(true);
    const r = await props.onPatch(body, msg);
    setBusy(false);
    return r;
  };
  const edits = () => ({ caption, platforms, scheduledAt: when });
  const togglePl = (pl: Platform) => setPlatforms((cur) => (cur.includes(pl) ? cur.filter((x) => x !== pl) : [...cur, pl]));

  async function rewrite(how: string) {
    try {
      const r = await api<{ caption: string }>('/api/social/ai', { method: 'POST', json: { task: 'rewrite', caption, how } });
      setCaption(r.caption);
    } catch (e) {
      props.toast((e as Error).message);
    }
  }

  const errs = (Object.entries(p.results) as [Platform, { ok: boolean; error?: string }][]).filter(([, r]) => r && !r.ok);
  const links = (Object.entries(p.results) as [Platform, { ok: boolean; permalink?: string }][]).filter(([, r]) => r?.ok && r.permalink);

  return (
    <>
      <div className={s.scrim} onClick={props.onClose} />
      <aside className={s.drawer}>
        <div className={s.dH}>
          <b style={{ fontSize: 14 }}>{KIND[p.kind]}{p.scheduledAt ? ` · ${fmtDay(p.scheduledAt)}` : ''}</b>
          <Chip status={p.status} />
          <button type="button" className={cx(s.btn, s.sm, s.ghost)} style={{ marginLeft: 'auto' }} onClick={props.onClose}>✕</button>
        </div>
        <div className={s.dB}>
          <IgPreview kind={p.kind} media={p.media} caption={caption} />
          {!p.media.length && <div className={s.small + ' ' + s.mut} style={{ textAlign: 'center' }}>Media was cleared from storage after publishing — the post lives on Instagram/Facebook.</div>}

          {errs.length > 0 && (
            <div className={s.alertRed}>
              {errs.map(([pl, r]) => (
                <div key={pl}><b>{pl === 'instagram' ? 'Instagram' : 'Facebook'}:</b> {r.error}</div>
              ))}
            </div>
          )}
          {p.changeNote && <div className={s.alertViolet}>✎ Changes requested: {p.changeNote}</div>}

          {p.kind !== 'STORY' && (
            <div>
              <div className={s.lbl}><span>Caption</span><span>{caption.length.toLocaleString()} / 2,200</span></div>
              <textarea className={s.field} value={caption} readOnly={locked} onChange={(e) => setCaption(e.target.value)} maxLength={2200} />
              {props.ai && !locked && (
                <div className={s.pills} style={{ marginTop: 8 }}>
                  {[['short', 'Shorter'], ['warm', 'Warmer'], ['pro', 'More professional'], ['es', '+ Spanish line'], ['tags', 'Hashtags for the city']].map(([k, l]) => (
                    <button type="button" key={k} className={cx(s.pill, s.pillAi)} onClick={() => rewrite(k)}>✦ {l}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          {p.kind === 'STORY' && (
            <div className={s.alertBlue}>Stories show for 24 hours. Instagram doesn&apos;t let apps add link, poll or location stickers — if this story needs a link sticker, post it from your phone.</div>
          )}

          <div>
            <div className={s.lbl}><span>Publish to</span></div>
            <div className={s.row}>
              {(['instagram', 'facebook'] as Platform[]).map((pl) => (
                <button type="button" key={pl} disabled={locked} className={cx(s.tog, platforms.includes(pl) && s.togOn)} onClick={() => togglePl(pl)}>
                  <i style={{ background: pl === 'instagram' ? 'var(--ig)' : 'var(--fb)' }} />{pl === 'instagram' ? 'Instagram' : 'Facebook'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className={s.lbl}><span>When (Florida time)</span></div>
            <div className={s.row}>
              <input type="date" className={s.field} style={{ width: 170 }} value={date} disabled={locked} onChange={(e) => setDate(e.target.value)} />
              <input type="time" className={s.field} style={{ width: 130 }} value={time} disabled={locked} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          {links.length > 0 && (
            <div className={s.row}>
              {links.map(([pl, r]) => (
                <a key={pl} className={cx(s.btn, s.sm)} href={r.permalink} target="_blank" rel="noopener noreferrer">Open on {pl === 'instagram' ? 'Instagram' : 'Facebook'} ↗</a>
              ))}
            </div>
          )}
          <div>
            <div className={s.lbl}><span>History</span></div>
            <div className={s.trail}>
              {[{ at: p.createdAt, text: `Created by ${p.createdBy}${p.jobRef ? ` · ${p.jobRef}` : ''}` }, ...p.history].map((h, i) => (
                <div key={i}><i style={/fail/i.test(h.text) ? { background: 'var(--red)' } : undefined} /><div>{h.text}<span>{fmtDay(h.at)} · {fmtTime(h.at)}</span></div></div>
              ))}
            </div>
          </div>
        </div>

        <div className={s.dF}>
          {note !== null ? (
            <>
              <input className={s.field} style={{ flex: 1 }} autoFocus placeholder="What should change? e.g. use the after photo first" value={note} onChange={(e) => setNote(e.target.value)} />
              <button type="button" className={cx(s.btn, s.sm)} onClick={() => setNote(null)}>Cancel</button>
              <button type="button" className={cx(s.btn, s.primary)} disabled={busy} onClick={async () => { await run({ action: 'request-changes', note }, 'Sent back to draft with your note'); props.onClose(); }}>Send</button>
            </>
          ) : p.status === 'draft' ? (
            <>
              <button type="button" className={cx(s.btn, s.sm, s.danger)} onClick={props.onDelete}>Delete</button>
              <button type="button" className={cx(s.btn, s.sm)} onClick={() => setNote('')}>Request changes</button>
              {changed && <button type="button" className={cx(s.btn, s.sm)} disabled={busy} onClick={() => run(edits(), 'Saved')}>Save</button>}
              <button type="button" className={cx(s.btn, s.primary, s.push)} disabled={busy || !platforms.length} onClick={async () => { if (await run({ ...edits(), action: 'approve' }, 'Approved · scheduled')) props.onClose(); }}>Approve &amp; schedule</button>
            </>
          ) : p.status === 'scheduled' ? (
            <>
              <button type="button" className={cx(s.btn, s.sm, s.danger)} onClick={props.onDelete}>Delete</button>
              <button type="button" className={cx(s.btn, s.sm)} disabled={busy} onClick={() => run({ action: 'to-draft' }, 'Moved back to draft')}>Back to draft</button>
              <button type="button" className={cx(s.btn, s.sm, s.push)} disabled={busy} onClick={() => window.confirm('Publish it now?') && run({ ...edits(), action: 'publish-now' }, 'Published')}>Post now</button>
              <button type="button" className={cx(s.btn, s.primary)} disabled={busy || !changed} onClick={() => run(edits(), 'Saved')}>Save</button>
            </>
          ) : p.status === 'failed' ? (
            <>
              <button type="button" className={cx(s.btn, s.sm, s.danger)} onClick={props.onDelete}>Delete</button>
              {changed && <button type="button" className={cx(s.btn, s.sm)} disabled={busy} onClick={() => run(edits(), 'Saved')}>Save</button>}
              <button type="button" className={cx(s.btn, s.primary, s.push)} disabled={busy} onClick={() => run({ ...edits(), action: 'retry' }, 'Published')}>{busy ? 'Posting…' : `Retry ${errs.map(([pl]) => (pl === 'instagram' ? 'Instagram' : 'Facebook')).join(' + ')}`}</button>
            </>
          ) : (
            <>
              <button type="button" className={cx(s.btn, s.sm, s.ghost)} onClick={props.onDelete}>Remove from dashboard</button>
              <button type="button" className={cx(s.btn, s.primary, s.push)} onClick={props.onClose}>Done</button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

/* ================================ COMPOSER ================================ */

type Up = { key: string; name: string; type: 'image' | 'video'; preview: string; url?: string; pathname?: string; progress: number; error?: string };

function Composer(props: {
  init: { day?: number; job?: RecentJob };
  posts: SocialPost[];
  status: Status | null;
  recentJobs: RecentJob[];
  onClose: () => void;
  onSaved: (p: SocialPost, msg: string) => void;
  toast: (m: string) => void;
}) {
  const [kind, setKind] = useState<PostKind>('POST');
  const [items, setItems] = useState<Up[]>([]);
  const [caption, setCaption] = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>(['instagram', 'facebook']);
  const [job, setJob] = useState(props.init.job ? `${props.init.job.title}${props.init.job.city ? ` · ${props.init.job.city}` : ''}` : '');
  const [city, setCity] = useState(props.init.job?.city ?? '');
  const [busy, setBusy] = useState(false);
  const [aiOpts, setAiOpts] = useState<null | 'loading' | { options: { style: string; text: string }[]; hashtags: string[]; privacy: string[] }>(null);
  const kindPicked = useRef(false);

  // Open slots: 9 AM post, 12 PM + 6 PM reels (3 PM for stories), next 7 days
  const slots = useMemo(() => {
    const out: number[] = [];
    const start = props.init.day ?? dayStart(Date.now());
    for (let i = 0; i < 7 && out.length < 3; i++) {
      const d = etParts(addDays(start + 12 * 3600_000, i));
      for (const h of kind === 'STORY' ? [15] : SLOT_HOURS) {
        const t = etToMs(d.y, d.m, d.d, h);
        if (t < Date.now() + 15 * 60_000) continue;
        const taken = props.posts.some((p) => p.scheduledAt === t && p.kind !== 'STORY' && kind !== 'STORY');
        if (!taken) out.push(t);
        if (out.length >= 3) break;
      }
    }
    return out;
  }, [props.posts, props.init.day, kind]);
  const [when, setWhen] = useState<number | 'now'>(slots[0] ?? Date.now() + DAY);
  useEffect(() => {
    if (typeof when === 'number' && !slots.includes(when) && slots[0]) setWhen(slots[0]);
    // only re-pick when the kind changes the slot list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const uploading = items.some((i) => !i.url && !i.error);
  const ready = items.filter((i) => i.url);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    if (!props.status?.uploads) return props.toast('Uploads are not set up yet — connect a Blob store in Vercel → Storage.');
    const list = Array.from(files).slice(0, 10);
    const hasVideo = list.some((f) => f.type.startsWith('video/'));
    if (!kindPicked.current) {
      const total = items.length + list.length;
      setKind(hasVideo ? 'REEL' : total > 1 ? 'CAROUSEL' : 'POST');
    }
    for (const f of list) {
      const isVideo = f.type.startsWith('video/');
      if (isVideo && !/mp4|quicktime/.test(f.type)) {
        props.toast(`“${f.name}”: videos must be MP4 or MOV.`);
        continue;
      }
      const key = Math.random().toString(36).slice(2);
      const item: Up = { key, name: f.name, type: isVideo ? 'video' : 'image', preview: URL.createObjectURL(f), progress: 0 };
      setItems((cur) => [...cur, item]);
      (async () => {
        try {
          const body: Blob = isVideo ? f : await toJpeg(f, kind !== 'STORY');
          const safe = f.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9-]+/gi, '-').slice(0, 40) || 'media';
          const res = await upload(`social/${Date.now()}-${safe}.${isVideo ? (f.type.includes('quicktime') ? 'mov' : 'mp4') : 'jpg'}`, body, {
            access: 'public',
            handleUploadUrl: '/api/social/upload',
            contentType: isVideo ? f.type : 'image/jpeg',
            multipart: body.size > 20 * 1024 * 1024,
            onUploadProgress: ({ percentage }) => setItems((cur) => cur.map((x) => (x.key === key ? { ...x, progress: percentage } : x))),
          });
          setItems((cur) => cur.map((x) => (x.key === key ? { ...x, url: res.url, pathname: res.pathname, progress: 100 } : x)));
        } catch (e) {
          setItems((cur) => cur.map((x) => (x.key === key ? { ...x, error: (e as Error).message } : x)));
          props.toast((e as Error).message);
        }
      })();
    }
  }

  async function writeCaptions() {
    const imgs = ready.filter((i) => i.type === 'image').map((i) => i.url!);
    if (!imgs.length) return props.toast('Add at least one photo first.');
    setAiOpts('loading');
    try {
      const r = await api('/api/social/ai', { method: 'POST', json: { task: 'captions', imageUrls: imgs, job, city, kind } });
      setAiOpts(r);
      if (r.options?.[0]) setCaption(r.options[0].text);
    } catch (e) {
      setAiOpts(null);
      props.toast((e as Error).message);
    }
  }

  async function save(mode: 'draft' | 'schedule' | 'now') {
    if (uploading) return props.toast('Wait for the uploads to finish.');
    if (!ready.length) return props.toast('Add a photo or video first.');
    if (!platforms.length) return props.toast('Pick Instagram, Facebook or both.');
    if (mode === 'now' && !window.confirm('Publish it now?')) return;
    setBusy(true);
    try {
      const media: MediaItem[] = ready.map((i) => ({ url: i.url!, type: i.type, pathname: i.pathname }));
      const r = await api<{ post: SocialPost; result?: { ok: boolean; errors?: string[] } }>('/api/social/posts', {
        method: 'POST',
        json: { kind, media, caption, platforms, scheduledAt: typeof when === 'number' ? when : null, mode: when === 'now' && mode !== 'draft' ? 'now' : mode, jobRef: job || undefined, city: city || undefined },
      });
      const msg =
        r.result && !r.result.ok ? r.result.errors?.[0] ?? "It didn't publish — open it to see why." :
        mode === 'draft' ? 'Saved as draft' :
        when === 'now' ? 'Published' :
        `Approved · goes live ${fmtDay(when as number)} ${fmtTime(when as number)}`;
      props.onSaved(r.post, msg);
    } catch (e) {
      props.toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const cityTag = (city || '').toLowerCase().replace(/[^a-z]/g, '');
  const snippets = [
    ['+ Quote line', '\n\nFree quote in under an hour, link in bio.'],
    ['+ Same team line', '\n\nSame team every visit — they learn your home.'],
    ...(cityTag ? [[`+ #${cityTag}`, ` #${cityTag} #${cityTag}fl`]] : []),
    ['+ Service hashtags', ' #housecleaning #deepcleaning #southflorida'],
  ];

  return (
    <>
      <div className={s.scrim} onClick={() => !busy && props.onClose()} />
      <div className={s.modal}>
        <div className={s.dH}>
          <b style={{ fontSize: 14 }}>Create</b>
          <span className={s.small + ' ' + s.mut}>post · carousel · reel · story</span>
          <button type="button" className={cx(s.btn, s.sm, s.ghost)} style={{ marginLeft: 'auto' }} onClick={props.onClose} disabled={busy}>✕</button>
        </div>
        <div className={s.mBody}>
          <div className={s.mLeft}>
            <div className={s.step}>
              <div className={s.stepH}><span className={s.stepN}>1</span>Photos or video</div>
              <div className={s.seg}>
                {(['POST', 'CAROUSEL', 'REEL', 'STORY'] as PostKind[]).map((k) => (
                  <button type="button" key={k} className={cx(kind === k && s.segOn)} onClick={() => { kindPicked.current = true; setKind(k); }}>{KIND[k]}</button>
                ))}
              </div>
              {kind === 'STORY' && <div className={s.alertBlue}>Stories show for 24 hours on Instagram and Facebook. Apps can&apos;t add link, poll or location stickers — post that kind from your phone.</div>}
              <label className={s.dropZone}>
                <b>Add photos or a video</b>
                Tap to pick from your phone · photos are converted to JPG and fitted to Instagram&apos;s shape
                <input type="file" multiple accept="image/*,video/mp4,video/quicktime" style={{ display: 'none' }} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
              </label>
              {items.length > 0 && (
                <div className={s.thumbs}>
                  {items.map((i, n) => (
                    <div key={i.key} className={s.th} style={i.type === 'image' ? { backgroundImage: `url(${i.preview})` } : undefined} title={i.error || i.name}>
                      {i.type === 'video' && <video src={i.preview} muted />}
                      <span className={s.tag}>{i.error ? '!' : n + 1}</span>
                      <button type="button" className={s.thX} onClick={() => setItems((cur) => cur.filter((x) => x.key !== i.key))}>✕</button>
                      {!i.url && !i.error && <div className={s.thBar} style={{ width: `${i.progress}%` }} />}
                    </div>
                  ))}
                </div>
              )}
              <div className={s.row}>
                <input className={s.field} style={{ flex: 2, minWidth: 180 }} placeholder="Job (e.g. Deep clean · Parkland)" value={job} onChange={(e) => setJob(e.target.value)} list="us-jobs" />
                <datalist id="us-jobs">
                  {props.recentJobs.map((j, i) => <option key={i} value={`${j.title}${j.city ? ` · ${j.city}` : ''}`} />)}
                </datalist>
                <input className={s.field} style={{ flex: 1, minWidth: 120 }} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
            </div>

            {kind !== 'STORY' && (
              <div className={s.step}>
                <div className={s.stepH}><span className={s.stepN}>2</span>Caption</div>
                {props.status?.ai && (
                  <div className={s.row}>
                    <button type="button" className={cx(s.btn, s.aiBtn)} onClick={writeCaptions} disabled={aiOpts === 'loading'}>✦ Write it for me</button>
                    <span className={s.small + ' ' + s.mut}>uses the photos + job · about 1¢</span>
                  </div>
                )}
                {aiOpts === 'loading' && <div className={s.opts}><div className={s.shimmer} /><div className={s.shimmer} /><div className={s.shimmer} /></div>}
                {aiOpts && aiOpts !== 'loading' && (
                  <>
                    <div className={s.opts}>
                      {aiOpts.options.map((o, i) => (
                        <button type="button" key={i} className={cx(s.opt, caption === o.text && s.optOn)} onClick={() => setCaption(o.text)}>
                          <b>✦ {o.style}</b>{o.text}
                        </button>
                      ))}
                    </div>
                    {aiOpts.privacy?.length > 0 && <div className={s.alertRed}>⚠ Check before posting: {aiOpts.privacy.join(' · ')}</div>}
                  </>
                )}
                <textarea className={s.field} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={2200} placeholder="What did you clean, where, and what's the one thing people should notice?" />
                <div className={s.pills}>
                  {snippets.map(([l, add]) => (
                    <button type="button" key={l} className={s.pill} onClick={() => !caption.includes(add.trim()) && setCaption((c) => (c.trimEnd() + add).slice(0, 2200))}>{l}</button>
                  ))}
                  {aiOpts && aiOpts !== 'loading' && aiOpts.hashtags?.length > 0 && (
                    <button type="button" className={cx(s.pill, s.pillAi)} onClick={() => setCaption((c) => `${c.trimEnd()}\n\n${aiOpts.hashtags.join(' ')}`)}>✦ + suggested hashtags</button>
                  )}
                </div>
              </div>
            )}

            <div className={s.step}>
              <div className={s.stepH}><span className={s.stepN}>{kind === 'STORY' ? 2 : 3}</span>Where and when</div>
              <div className={s.row}>
                {(['instagram', 'facebook'] as Platform[]).map((pl) => (
                  <button type="button" key={pl} className={cx(s.tog, platforms.includes(pl) && s.togOn)} onClick={() => setPlatforms((cur) => (cur.includes(pl) ? cur.filter((x) => x !== pl) : [...cur, pl]))}>
                    <i style={{ background: pl === 'instagram' ? 'var(--ig)' : 'var(--fb)' }} />{pl === 'instagram' ? 'Instagram' : 'Facebook'}
                  </button>
                ))}
              </div>
              <div className={s.pills}>
                {slots.map((t, i) => (
                  <button type="button" key={t} className={cx(s.pill, when === t && s.pillOn)} onClick={() => setWhen(t)}>
                    {i === 0 ? 'Next open slot · ' : ''}{fmtDay(t).split(',')[0]} {fmtTime(t)}
                  </button>
                ))}
                <button type="button" className={cx(s.pill, when === 'now' && s.pillOn)} onClick={() => setWhen('now')}>Post now</button>
              </div>
              {when !== 'now' && (
                <div className={s.row}>
                  <input type="date" className={s.field} style={{ width: 170 }} value={toDateInput(when)} onChange={(e) => { const t = fromInputs(e.target.value, toTimeInput(when)); if (t) setWhen(t); }} />
                  <input type="time" className={s.field} style={{ width: 130 }} value={toTimeInput(when)} onChange={(e) => { const t = fromInputs(toDateInput(when), e.target.value); if (t) setWhen(t); }} />
                  <span className={s.small + ' ' + s.soft}>Florida time</span>
                </div>
              )}
            </div>
          </div>
          <div className={s.mRight}>
            <div className={s.small + ' ' + s.mut}>Live preview</div>
            {items.length ? (
              <IgPreview kind={kind} media={items.map((i) => ({ url: i.url ?? i.preview, type: i.type }))} caption={caption} />
            ) : (
              <div className={s.ig} style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>Add photos or a video to see it</div>
            )}
          </div>
        </div>
        <div className={s.dF}>
          <button type="button" className={cx(s.btn)} onClick={props.onClose} disabled={busy}>Cancel</button>
          <button type="button" className={cx(s.btn, s.push)} onClick={() => save('draft')} disabled={busy || uploading}>Save draft</button>
          <button type="button" className={cx(s.btn, s.primary)} onClick={() => save(when === 'now' ? 'now' : 'schedule')} disabled={busy || uploading}>
            {busy ? 'Working…' : uploading ? 'Uploading…' : when === 'now' ? 'Approve & post now' : 'Approve & schedule'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ================================ INBOX ================================ */

function Inbox(props: { convs: ConvView[]; ai: boolean; reload: () => Promise<void>; toast: (m: string) => void }) {
  const { reload } = props;
  const [filter, setFilter] = useState<'all' | 'dm' | 'comment' | 'lead'>('all');
  const [sel, setSel] = useState<string | null>(props.convs[0]?.key ?? null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const list = props.convs.filter((c) => filter === 'all' || (filter === 'lead' ? c.tags.includes('lead') : c.kind === filter));
  const c = props.convs.find((x) => x.key === sel) ?? null;

  useEffect(() => {
    const t = setInterval(() => reload().catch(() => undefined), 30_000);
    return () => clearInterval(t);
  }, [reload]);

  async function send(body: Record<string, unknown>) {
    if (!c) return;
    setSending(true);
    try {
      await api('/api/social/inbox', { method: 'POST', json: { key: c.key, ...body } });
      setText('');
      await props.reload();
      props.toast('Sent');
    } catch (e) {
      props.toast((e as Error).message);
    } finally {
      setSending(false);
    }
  }
  async function suggest() {
    if (!c) return;
    try {
      const r = await api<{ reply: string }>('/api/social/ai', { method: 'POST', json: { task: 'reply', key: c.key } });
      setText(r.reply);
    } catch (e) {
      props.toast((e as Error).message);
    }
  }
  const followTxt = (x: ConvView) =>
    x.followUp?.sentAt ? `Sent ${fmtAgo(x.followUp.sentAt)} ago` :
    x.followUp?.scheduledFor ? `Scheduled ${fmtDay(x.followUp.scheduledFor)} ${fmtTime(x.followUp.scheduledFor)}` :
    x.followUp?.skipped ? `Not needed — ${x.followUp.skipped}` : '—';

  return (
    <>
      <div className={s.alertBlue} style={{ marginBottom: 12 }}>
        <b>Messages arrive here once Meta approves messaging for the app</b> (Business Verification + App Review). Replies are only allowed within 24 hours of the person&apos;s last message — after that, reply from the Instagram app.
      </div>
      <div className={s.inbox}>
        <div className={s.col}>
          <div className={s.pad}>
            {(['all', 'dm', 'comment', 'lead'] as const).map((f) => (
              <button type="button" key={f} className={cx(s.pill, filter === f && s.pillOn)} onClick={() => setFilter(f)}>{{ all: 'All', dm: 'DMs', comment: 'Comments', lead: 'Leads' }[f]}</button>
            ))}
          </div>
          {list.map((x) => {
            const last = x.messages.at(-1);
            return (
              <button type="button" key={x.key} className={cx(s.cv, sel === x.key && s.cvOn)} onClick={() => setSel(x.key)}>
                <div className={s.av}>{(x.name ?? '?').replace(/^@/, '').slice(0, 2)}</div>
                <div className={s.cvT}>
                  <b><span>{x.name ?? 'Someone'}</span><span className={s.soft} style={{ fontWeight: 400, fontSize: 11.5 }}>{fmtAgo(x.lastActivityAt)}</span></b>
                  <p>{last?.text ?? ''}</p>
                  <div className={s.tags}>
                    <span className={s.tg}>{x.platform === 'instagram' ? 'IG' : 'FB'} · {x.kind === 'dm' ? 'DM' : 'Comment'}</span>
                    {x.tags.includes('lead') && <span className={cx(s.tg, s.tgLead)}>Lead</span>}
                    {x.quoteSubmittedAt && <span className={cx(s.tg, s.tgLead)}>Quote sent ✓</span>}
                    {x.messages.some((m) => m.by?.startsWith('auto:')) && <span className={cx(s.tg, s.tgBot)}>Auto-replied</span>}
                  </div>
                </div>
              </button>
            );
          })}
          {!list.length && <div className={s.empty}>Nothing here yet.</div>}
        </div>

        <div className={s.col}>
          {c ? (
            <>
              <div className={s.pad}>
                <div className={s.av}>{(c.name ?? '?').replace(/^@/, '').slice(0, 2)}</div>
                <div><b>{c.name ?? 'Someone'}</b><div className={s.small + ' ' + s.mut}>{c.platform === 'instagram' ? 'Instagram' : 'Facebook'} · {c.kind === 'dm' ? 'message' : 'comment'}</div></div>
                <span className={cx(s.chip, c.canReply ? s.c_draft : s.c_failed)} style={{ marginLeft: 'auto' }}>
                  {c.canReply && c.windowEndsAt ? `Reply window · ${Math.max(0, Math.round((c.windowEndsAt - Date.now()) / 3600_000))}h left` : 'Reply window closed'}
                </span>
              </div>
              <div className={s.msgs}>
                {c.messages.map((m, i) =>
                  m.by === 'system' ? (
                    <div key={i} className={cx(s.msg, s.msgSys)}>{m.text}</div>
                  ) : (
                    <div key={i} className={cx(s.msg, m.dir === 'in' ? s.msgIn : s.msgOut)}>
                      {m.dir === 'out' && m.by && <div className={s.by}>{m.by.startsWith('auto:') ? `Auto · ${m.by.slice(5)}` : m.by}</div>}
                      {m.text}
                      <small>{fmtDay(m.at)} · {fmtTime(m.at)}</small>
                    </div>
                  ),
                )}
              </div>
              <div className={s.compose}>
                <input className={s.field} value={text} disabled={!c.canReply || sending} placeholder={c.canReply ? 'Reply as Ultra Shine…' : 'Reply from the Instagram app (24h window closed)'} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && text.trim() && send({ text })} />
                {props.ai && c.canReply && <button type="button" className={cx(s.btn, s.aiBtn)} onClick={suggest}>✦</button>}
                <button type="button" className={cx(s.btn, s.primary)} disabled={!c.canReply || sending || !text.trim()} onClick={() => send({ text })}>Send</button>
              </div>
            </>
          ) : (
            <div className={s.empty}>Pick a conversation</div>
          )}
        </div>

        <div className={cx(s.col, s.ctxCol)}>
          {c && (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className={s.kv}><span>City</span><b>{c.city ?? '—'}</b></div>
              <div className={s.kv}><span>Quote form</span><b style={c.quoteSubmittedAt ? { color: 'var(--green)' } : undefined}>{c.quoteSubmittedAt ? `Sent ${fmtAgo(c.quoteSubmittedAt)} ago ✓` : 'Not yet'}</b></div>
              <div className={s.kv}><span>Follow-up</span><b>{followTxt(c)}</b></div>
              <div className={s.kv}><span>Tags</span><b>{c.tags.length ? c.tags.join(', ') : '—'}</b></div>
              <button type="button" className={cx(s.btn, s.sm)} disabled={!c.canReply || sending} onClick={() => send({ action: 'review' })}>★ Ask for a Google review</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ================================ AUTOMATIONS ================================ */

// Defined at module level (not inside Automations) so typing in a textarea never remounts it.
function Card({ title, on, toggle, children, foot }: { title: string; on: boolean; toggle: () => void; children: ReactNode; foot: string }) {
  return (
    <div className={s.card} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className={s.row} style={{ justifyContent: 'space-between' }}>
        <b style={{ fontSize: 14 }}>{title}</b>
        <button type="button" className={cx(s.sw, on && s.swOn)} onClick={toggle} aria-pressed={on} aria-label={`${title}: ${on ? 'on' : 'off'}`} />
      </div>
      {children}
      <div className={s.small + ' ' + s.soft}>{foot}</div>
    </div>
  );
}

function Automations(props: { settings: AutomationSettings; customerEmail: boolean; onSave: (s: AutomationSettings) => Promise<void> }) {
  const [st, setSt] = useState<AutomationSettings>(() => structuredClone(props.settings));
  const dirty = JSON.stringify(st) !== JSON.stringify(props.settings);
  const set = <K extends keyof AutomationSettings>(k: K, patch: Partial<AutomationSettings[K]>) =>
    setSt((cur) => ({ ...cur, [k]: { ...cur[k], ...patch } }));
  return (
    <>
      <div className={s.alertBlue} style={{ marginBottom: 12 }}>
        <b>These run on your own site, not ManyChat.</b> {'{first name}'} and {'{quote link}'} are filled in for each person — the link is tracked, so when they send the quote form the follow-up cancels itself.
      </div>
      <div className={s.autos}>
        <Card title="Price questions" on={st.priceReply.on} toggle={() => set('priceReply', { on: !st.priceReply.on })} foot="Fires once per person per 12 hours. Words like price, cost, quote, how much (also Spanish + Portuguese).">
          <textarea className={s.field} style={{ minHeight: 90 }} value={st.priceReply.text} onChange={(e) => set('priceReply', { text: e.target.value })} />
        </Card>
        <Card title="Follow-up if they don't send the form" on={st.followUp.on} toggle={() => set('followUp', { on: !st.followUp.on })} foot="Once only, never at night, only inside Meta's 24-hour window. Skipped if they send the form, write back, or you reply.">
          <div className={s.row}>
            <span className={s.mut}>Send after</span>
            <select className={s.field} style={{ width: 110 }} value={st.followUp.afterHours} onChange={(e) => set('followUp', { afterHours: Number(e.target.value) })}>
              {[1, 2, 3, 4, 6, 8, 12].map((h) => <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <textarea className={s.field} style={{ minHeight: 90 }} value={st.followUp.text} onChange={(e) => set('followUp', { text: e.target.value })} />
        </Card>
        <Card title={`Comment “${st.quoteComment.keyword || 'QUOTE'}” → DM`} on={st.quoteComment.on} toggle={() => set('quoteComment', { on: !st.quoteComment.on })} foot="Meta allows one private reply per comment.">
          <div className={s.row}><span className={s.mut}>Keyword</span><input className={s.field} style={{ width: 140 }} value={st.quoteComment.keyword} onChange={(e) => set('quoteComment', { keyword: e.target.value })} /></div>
          <textarea className={s.field} style={{ minHeight: 80 }} value={st.quoteComment.dmText} onChange={(e) => set('quoteComment', { dmText: e.target.value })} />
          <input className={s.field} placeholder="Public reply under the comment" value={st.quoteComment.publicReply} onChange={(e) => set('quoteComment', { publicReply: e.target.value })} />
        </Card>
        <Card title="After hours" on={st.afterHours.on} toggle={() => set('afterHours', { on: !st.afterHours.on })} foot="Mon–Fri after 5 PM, Sat after 12 PM, Sundays. Once per person per day.">
          <textarea className={s.field} style={{ minHeight: 90 }} value={st.afterHours.text} onChange={(e) => set('afterHours', { text: e.target.value })} />
        </Card>
        <Card title="Tag new leads + email you" on={st.leadTag.on} toggle={() => set('leadTag', { on: !st.leadTag.on })} foot="No message goes to the customer.">
          <div className={s.mut} style={{ lineHeight: 1.5 }}>Mentions a city we serve, asks about price or booking → marked Lead, and you get one email per person.</div>
        </Card>
        <Card title="Google review request after each job" on={st.reviewRequests.on} toggle={() => set('reviewRequests', { on: !st.reviewRequests.on })} foot="Checks Jobber every morning. One request per client per year; skips anyone already on your Google listing.">
          <div className={s.row}>
            <select className={s.field} style={{ width: 'auto' }} value={st.reviewRequests.mode} onChange={(e) => set('reviewRequests', { mode: e.target.value as 'auto' | 'ask' })}>
              <option value="auto">Send automatically</option>
              <option value="ask">Ask me first (Reviews tab)</option>
            </select>
          </div>
          <div className={s.mut} style={{ lineHeight: 1.5 }}>Email with a Google review button + QR code, the morning after a job is marked complete.</div>
          {!props.customerEmail && <div className={s.alertRed}>Waiting on one thing: verify your domain in Resend and set QUOTE_FROM_EMAIL — until then emails can only reach you, not customers.</div>}
        </Card>
      </div>
      <div className={s.row} style={{ marginTop: 12, justifyContent: 'flex-end' }}>
        {dirty && <button type="button" className={s.btn} onClick={() => setSt(structuredClone(props.settings))}>Undo changes</button>}
        <button type="button" className={cx(s.btn, s.primary)} disabled={!dirty} onClick={() => props.onSave(st)}>Save</button>
      </div>
    </>
  );
}

/* ================================ INSIGHTS ================================ */

function InsightsView(props: { insights: Insights; posts: SocialPost[]; onRefresh: () => Promise<void> }) {
  const i = props.insights;
  const [busy, setBusy] = useState(false);
  const hist = i?.history ?? [];
  const path = useMemo(() => {
    if (hist.length < 2) return '';
    const vals = hist.map((h) => h.followers);
    const min = Math.min(...vals), max = Math.max(...vals), span = Math.max(1, max - min);
    return hist.map((h, n) => `${n ? 'L' : 'M'}${((n / (hist.length - 1)) * 600).toFixed(1)},${(170 - ((h.followers - min) / span) * 140).toFixed(1)}`).join(' ');
  }, [hist]);
  const top = [...(i?.media ?? [])].sort((a, b) => (b.reach ?? 0) - (a.reach ?? 0)).slice(0, 5);
  const month = Date.now() - 30 * DAY;
  const published30 = props.posts.filter((p) => p.status === 'published' && (p.scheduledAt ?? 0) > month).length;
  return (
    <div className={s.bento}>
      <div className={cx(s.card, s.s3)}><div className={s.ch}><h3>Followers</h3></div><div className={s.big}>{i?.followers ?? '—'}</div><div className={s.small + ' ' + s.mut} style={{ marginTop: 6 }}>{i?.at ? `updated ${fmtAgo(i.at)} ago` : 'fills in once connected'}</div></div>
      <div className={cx(s.card, s.s3)}><div className={s.ch}><h3>Reach · last 30 posts</h3></div><div className={s.big}>{i?.media?.length ? i.media.reduce((a, m) => a + (m.reach ?? 0), 0).toLocaleString() : '—'}</div><div className={s.small + ' ' + s.mut} style={{ marginTop: 6 }}>people who saw them</div></div>
      <div className={cx(s.card, s.s3)}><div className={s.ch}><h3>Published · 30 days</h3></div><div className={s.big}>{published30}</div><div className={s.small + ' ' + s.mut} style={{ marginTop: 6 }}>from this dashboard</div></div>
      <div className={cx(s.card, s.s3)}><div className={s.ch}><h3>Numbers</h3></div><button type="button" className={cx(s.btn, s.sm)} disabled={busy} onClick={async () => { setBusy(true); await props.onRefresh().catch(() => undefined); setBusy(false); }}>{busy ? 'Refreshing…' : 'Refresh now'}</button><div className={s.small + ' ' + s.mut} style={{ marginTop: 8 }}>Also refreshes by itself every morning.</div>{i?.error && <div className={s.small} style={{ color: 'var(--red)', marginTop: 8 }}>{i.error}</div>}</div>
      <div className={cx(s.card, s.s7)}>
        <div className={s.ch}><h3>Followers over time</h3><span className={s.small + ' ' + s.mut}>one point per day</span></div>
        {path ? (
          <svg viewBox="0 0 600 180" width="100%" height="180" preserveAspectRatio="none">
            <path d={path} fill="none" stroke="#c4b5fd" strokeWidth="2.2" />
          </svg>
        ) : (
          <div className={s.empty}>The line starts once there are two days of numbers.</div>
        )}
      </div>
      <div className={cx(s.card, s.s5)}>
        <div className={s.ch}><h3>What&apos;s working</h3><span className={s.small + ' ' + s.mut}>by reach</span></div>
        {top.map((m) => (
          <a key={m.id} className={s.tp} href={m.permalink} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
            <div className={s.tpImg} style={m.thumb ? { backgroundImage: `url(${m.thumb})` } : undefined} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.caption?.split('\n')[0] || m.type}</div>
              <div className={s.small + ' ' + s.mut}>{m.type} · {new Date(m.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            </div>
            <b>{m.reach?.toLocaleString() ?? '—'}</b>
          </a>
        ))}
        {!top.length && <div className={s.empty}>Shows your top posts once connected.</div>}
      </div>
    </div>
  );
}

/* ================================ COMMAND BAR ================================ */

function Palette(props: { onClose: () => void; actions: { label: string; run: () => void }[] }) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const list = props.actions.filter((a) => a.label.toLowerCase().includes(q.toLowerCase()));
  const go = (a?: { run: () => void }) => {
    if (!a) return;
    props.onClose();
    a.run();
  };
  return (
    <>
      <div className={s.scrim} onClick={props.onClose} />
      <div className={s.pal}>
        <input
          autoFocus
          placeholder="Type a command…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setIdx(0); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setIdx((i) => Math.min(list.length - 1, i + 1));
            if (e.key === 'ArrowUp') setIdx((i) => Math.max(0, i - 1));
            if (e.key === 'Enter') go(list[idx]);
            if (e.key === 'Escape') props.onClose();
          }}
        />
        <div className={s.palL}>
          {list.map((a, i) => (
            <button type="button" key={a.label} className={cx(s.pi, i === idx && s.piSel)} onMouseEnter={() => setIdx(i)} onClick={() => go(a)}>{a.label}</button>
          ))}
          {!list.length && <div className={s.empty}>No match</div>}
        </div>
      </div>
    </>
  );
}
