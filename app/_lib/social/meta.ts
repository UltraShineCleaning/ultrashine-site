import { createHmac, timingSafeEqual } from 'crypto';
import type { MediaItem, MetaConnection, PlatformResult, SocialPost } from './types';

/**
 * Meta Graph API — Instagram + Facebook Page, through Facebook Login for Business.
 *
 * Everything here is Meta's official API. Nothing logs in with a password,
 * nothing scrapes. Costs: $0 (Meta doesn't charge for any call used here).
 *
 * Docs this follows (checked 2026-09-24):
 *  - Instagram content publishing: containers → media_publish, media_type REELS / STORIES / CAROUSEL,
 *    100 API posts per 24h per account, JPEG only for images, media must be on a public URL.
 *    https://developers.facebook.com/docs/instagram-platform/content-publishing/
 *  - Facebook Page stories: /{page}/photo_stories, /{page}/video_stories (start → upload → finish)
 *    https://developers.facebook.com/docs/page-stories-api/
 *  - Messaging (Instagram + Messenger): POST /{page-id}/messages with a Page token,
 *    only within 24h of the person's last message. Private reply to a comment: recipient { comment_id }.
 */

export const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v25.0';
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

export const META_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'pages_manage_engagement',
  'pages_messaging',
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_insights',
  'instagram_manage_comments',
  'instagram_manage_messages',
  'business_management',
];

export function metaAppConfigured(): boolean {
  return !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

export class MetaError extends Error {
  code?: number;
  constructor(msg: string, code?: number) {
    super(msg);
    this.code = code;
  }
}

/** Turn Meta's error into one plain-English sentence for the dashboard + the failure email. */
export function friendlyError(e: unknown): string {
  const err = e as MetaError;
  const msg = err?.message || String(e);
  if (err?.code === 190 || /access token|session has expired|OAuthException/i.test(msg))
    return "The connection to Meta expired. Tap Reconnect, then Retry.";
  if (err?.code === 4 || err?.code === 32 || /limit/i.test(msg))
    return 'Meta says we hit a posting limit. It resets within 24 hours — tap Retry later.';
  if (/aspect ratio/i.test(msg)) return "Meta rejected the shape of the photo/video. Instagram accepts 4:5 to 1.91:1 for posts and 9:16 for reels and stories.";
  if (/image format|jpeg|JPG/i.test(msg)) return 'Instagram only accepts JPEG photos. Re-upload it as a JPG.';
  if (/duration|too long|too short/i.test(msg)) return 'Meta rejected the video length.';
  return msg.length > 220 ? msg.slice(0, 220) + '…' : msg;
}

type GraphInit = { method?: 'GET' | 'POST' | 'DELETE'; params?: Record<string, unknown>; token: string };

async function graph<T = any>(path: string, { method = 'GET', params = {}, token }: GraphInit): Promise<T> {
  const url = new URL(path.startsWith('http') ? path : `${GRAPH}/${path.replace(/^\//, '')}`);
  let body: string | undefined;
  if (method === 'GET' || method === 'DELETE') {
    for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, typeof v === 'string' ? v : JSON.stringify(v));
    if (token) url.searchParams.set('access_token', token);
  } else {
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined) form.set(k, typeof v === 'string' ? v : JSON.stringify(v));
    if (token) form.set('access_token', token);
    body = form.toString();
  }
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
    body,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    const e = data?.error ?? {};
    throw new MetaError(e.error_user_msg || e.message || `Meta HTTP ${res.status}`, e.code);
  }
  return data as T;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ================= OAuth (Connect Instagram + Facebook) ================= */

export function oauthUrl(redirectUri: string, state: string): string {
  const u = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  u.searchParams.set('client_id', process.env.META_APP_ID || '');
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('state', state);
  u.searchParams.set('scope', META_SCOPES.join(','));
  u.searchParams.set('response_type', 'code');
  return u.toString();
}

/**
 * code → short user token → long-lived user token → Page token.
 * A Page token derived from a long-lived user token doesn't expire unless the
 * password changes or permissions are removed.
 */
export async function exchangeCodeForConnection(code: string, redirectUri: string): Promise<MetaConnection> {
  const appId = process.env.META_APP_ID || '';
  const secret = process.env.META_APP_SECRET || '';
  const short = await graph<{ access_token: string }>('oauth/access_token', {
    token: '',
    params: { client_id: appId, client_secret: secret, redirect_uri: redirectUri, code },
  });
  const long = await graph<{ access_token: string }>('oauth/access_token', {
    token: '',
    params: { grant_type: 'fb_exchange_token', client_id: appId, client_secret: secret, fb_exchange_token: short.access_token },
  });
  const pages = await graph<{
    data: { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } }[];
  }>('me/accounts', { token: long.access_token, params: { fields: 'id,name,access_token,instagram_business_account{id,username}' } });

  const wanted = process.env.META_PAGE_ID;
  const page =
    pages.data.find((p) => wanted && p.id === wanted) ??
    pages.data.find((p) => p.instagram_business_account) ??
    pages.data[0];
  if (!page) throw new MetaError('No Facebook Page came back. Make sure you ticked the Ultra Shine Page when connecting.');

  // Subscribe the Page to webhooks so DMs/comments reach /api/social/webhook.
  await graph(`${page.id}/subscribed_apps`, {
    method: 'POST',
    token: page.access_token,
    params: { subscribed_fields: 'messages,messaging_postbacks,feed' },
  }).catch(() => undefined); // not fatal: posting still works without it

  return {
    pageId: page.id,
    pageName: page.name,
    pageToken: page.access_token,
    igUserId: page.instagram_business_account?.id,
    igUsername: page.instagram_business_account?.username,
    connectedAt: Date.now(),
  };
}

/* ================= Publishing ================= */

async function waitForContainer(id: string, token: string, maxMs = 240_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const s = await graph<{ status_code?: string; status?: string }>(id, { token, params: { fields: 'status_code,status' } });
    if (s.status_code === 'FINISHED' || s.status_code === 'PUBLISHED') return;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED')
      throw new MetaError(`Instagram couldn't process the media (${s.status || s.status_code}).`);
    await sleep(5_000);
  }
  throw new MetaError('Instagram is still processing the video. Tap Retry in a minute.');
}

function imgOrVideo(m: MediaItem) {
  return m.type === 'video' ? { video_url: m.url } : { image_url: m.url };
}

export async function publishInstagram(p: SocialPost, conn: MetaConnection): Promise<PlatformResult> {
  const ig = conn.igUserId;
  if (!ig) throw new MetaError('No Instagram business account is linked to the Facebook Page.');
  const token = conn.pageToken;
  const first = p.media[0];
  if (!first) throw new MetaError('This post has no photo or video.');

  let containerId: string;
  if (p.kind === 'STORY') {
    const c = await graph<{ id: string }>(`${ig}/media`, { method: 'POST', token, params: { media_type: 'STORIES', ...imgOrVideo(first) } });
    containerId = c.id;
    if (first.type === 'video') await waitForContainer(containerId, token);
  } else if (p.kind === 'REEL') {
    const video = p.media.find((m) => m.type === 'video');
    if (!video) throw new MetaError('A reel needs a video.');
    const c = await graph<{ id: string }>(`${ig}/media`, {
      method: 'POST',
      token,
      params: { media_type: 'REELS', video_url: video.url, caption: p.caption, share_to_feed: 'true' },
    });
    containerId = c.id;
    await waitForContainer(containerId, token);
  } else if (p.kind === 'CAROUSEL' && p.media.length > 1) {
    const children: string[] = [];
    for (const m of p.media.slice(0, 10)) {
      const c = await graph<{ id: string }>(`${ig}/media`, {
        method: 'POST',
        token,
        params: { is_carousel_item: 'true', ...(m.type === 'video' ? { media_type: 'VIDEO', video_url: m.url } : { image_url: m.url }) },
      });
      if (m.type === 'video') await waitForContainer(c.id, token);
      children.push(c.id);
    }
    const c = await graph<{ id: string }>(`${ig}/media`, {
      method: 'POST',
      token,
      params: { media_type: 'CAROUSEL', children: children.join(','), caption: p.caption },
    });
    containerId = c.id;
  } else {
    const c = await graph<{ id: string }>(`${ig}/media`, {
      method: 'POST',
      token,
      params: first.type === 'video' ? { media_type: 'REELS', video_url: first.url, caption: p.caption } : { image_url: first.url, caption: p.caption },
    });
    containerId = c.id;
    if (first.type === 'video') await waitForContainer(containerId, token);
  }

  const pub = await graph<{ id: string }>(`${ig}/media_publish`, { method: 'POST', token, params: { creation_id: containerId } });
  const info = await graph<{ permalink?: string }>(pub.id, { token, params: { fields: 'permalink' } }).catch(() => ({ permalink: undefined }));
  return { ok: true, id: pub.id, permalink: info.permalink, at: Date.now() };
}

export async function publishFacebook(p: SocialPost, conn: MetaConnection): Promise<PlatformResult> {
  const page = conn.pageId;
  const token = conn.pageToken;
  const first = p.media[0];
  if (!first) throw new MetaError('This post has no photo or video.');
  let postId: string;

  if (p.kind === 'STORY') {
    if (first.type === 'image') {
      const photo = await graph<{ id: string }>(`${page}/photos`, { method: 'POST', token, params: { url: first.url, published: 'false' } });
      const s = await graph<{ post_id?: string; id?: string }>(`${page}/photo_stories`, { method: 'POST', token, params: { photo_id: photo.id } });
      postId = s.post_id || s.id || photo.id;
    } else {
      const start = await graph<{ video_id: string; upload_url: string }>(`${page}/video_stories`, { method: 'POST', token, params: { upload_phase: 'start' } });
      const up = await fetch(start.upload_url, { method: 'POST', headers: { Authorization: `OAuth ${token}`, file_url: first.url } });
      if (!up.ok) throw new MetaError(`Facebook story upload failed (${up.status}).`);
      const fin = await graph<{ post_id?: string }>(`${page}/video_stories`, {
        method: 'POST',
        token,
        params: { upload_phase: 'finish', video_id: start.video_id },
      });
      postId = fin.post_id || start.video_id;
    }
    return { ok: true, id: postId, at: Date.now() };
  }

  const video = p.media.find((m) => m.type === 'video');
  if (p.kind === 'REEL' || (video && p.media.length === 1)) {
    const v = await graph<{ id: string }>(`${page}/videos`, {
      method: 'POST',
      token,
      params: { file_url: (video ?? first).url, description: p.caption },
    });
    postId = v.id;
  } else if (p.media.length > 1) {
    // Facebook multi-photo post: upload each unpublished, then one feed post that attaches them.
    const ids: string[] = [];
    for (const m of p.media.filter((x) => x.type === 'image').slice(0, 10)) {
      const ph = await graph<{ id: string }>(`${page}/photos`, { method: 'POST', token, params: { url: m.url, published: 'false' } });
      ids.push(ph.id);
    }
    const post = await graph<{ id: string }>(`${page}/feed`, {
      method: 'POST',
      token,
      params: { message: p.caption, attached_media: ids.map((id) => ({ media_fbid: id })) },
    });
    postId = post.id;
  } else {
    const ph = await graph<{ id: string; post_id?: string }>(`${page}/photos`, {
      method: 'POST',
      token,
      params: { url: first.url, caption: p.caption, published: 'true' },
    });
    postId = ph.post_id || ph.id;
  }
  const info = await graph<{ permalink_url?: string }>(postId, { token, params: { fields: 'permalink_url' } }).catch(() => ({ permalink_url: undefined }));
  return { ok: true, id: postId, permalink: info.permalink_url, at: Date.now() };
}

/* ================= Messaging ================= */

export async function sendMessage(
  conn: MetaConnection,
  recipient: { id: string } | { comment_id: string },
  text: string,
): Promise<string | undefined> {
  const r = await graph<{ message_id?: string }>(`${conn.pageId}/messages`, {
    method: 'POST',
    token: conn.pageToken,
    params: { recipient, message: { text }, messaging_type: 'RESPONSE' },
  });
  return r.message_id;
}

/** Public reply under a comment. Instagram: /{comment}/replies · Facebook: /{comment}/comments */
export async function replyToComment(conn: MetaConnection, platform: 'instagram' | 'facebook', commentId: string, text: string) {
  await graph(`${commentId}/${platform === 'instagram' ? 'replies' : 'comments'}`, {
    method: 'POST',
    token: conn.pageToken,
    params: { message: text },
  });
}

/** Display name for someone who messaged us (best effort — not every profile shares it). */
export async function lookupName(conn: MetaConnection, platform: 'instagram' | 'facebook', userId: string): Promise<string | undefined> {
  try {
    const r = await graph<{ name?: string; username?: string; first_name?: string }>(userId, {
      token: conn.pageToken,
      params: { fields: platform === 'instagram' ? 'name,username' : 'first_name,name' },
    });
    return r.username || r.name || r.first_name;
  } catch {
    return undefined;
  }
}

/* ================= Insights ================= */

export type IgMediaStat = { id: string; caption?: string; type: string; permalink?: string; thumb?: string; at: string; likes?: number; comments?: number; reach?: number };

export async function fetchInsights(conn: MetaConnection): Promise<{ followers: number | null; media: IgMediaStat[] }> {
  if (!conn.igUserId) return { followers: null, media: [] };
  const acct = await graph<{ followers_count?: number }>(conn.igUserId, { token: conn.pageToken, params: { fields: 'followers_count' } });
  const list = await graph<{ data: any[] }>(`${conn.igUserId}/media`, {
    token: conn.pageToken,
    params: { fields: 'id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count', limit: '30' },
  });
  const media: IgMediaStat[] = [];
  for (const m of list.data ?? []) {
    let reach: number | undefined;
    try {
      const ins = await graph<{ data: { name: string; values?: { value: number }[]; total_value?: { value: number } }[] }>(`${m.id}/insights`, {
        token: conn.pageToken,
        params: { metric: 'reach' },
      });
      const r = ins.data?.[0];
      reach = r?.values?.[0]?.value ?? r?.total_value?.value;
    } catch {
      /* stories older than 24h and some types have no insights — fine */
    }
    media.push({
      id: m.id,
      caption: m.caption,
      type: m.media_product_type || m.media_type,
      permalink: m.permalink,
      thumb: m.thumbnail_url || m.media_url,
      at: m.timestamp,
      likes: m.like_count,
      comments: m.comments_count,
      reach,
    });
  }
  return { followers: acct.followers_count ?? null, media };
}

/* ================= Webhook security ================= */

/** Meta signs every webhook: X-Hub-Signature-256 = "sha256=" + HMAC_SHA256(appSecret, rawBody). */
export function verifyMetaSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !header?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const got = header.slice(7);
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}
