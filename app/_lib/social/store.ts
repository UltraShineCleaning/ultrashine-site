import { randomBytes } from 'crypto';
import { del, getJSON, mgetJSON, setJSON, zadd, zrangeByScore, zrem, zrevrange } from '../kv';
import {
  DEFAULT_SETTINGS,
  type AutomationSettings,
  type Conversation,
  type MetaConnection,
  type SocialPost,
} from './types';

/**
 * Redis layout (all under the `social:` prefix):
 *   social:post:<id>          JSON SocialPost
 *   social:posts              ZSET  member=id  score=scheduledAt ?? createdAt
 *   social:conv:<plat>:<uid>  JSON Conversation
 *   social:convs              ZSET  member=conv key  score=lastActivityAt
 *   social:ref:<token>        conv key (30 days) — ties a quote-form submit to a DM
 *   social:settings           JSON AutomationSettings
 *   social:meta               JSON MetaConnection (Page token lives here, like the Jobber token)
 */

export const newId = (n = 8) => randomBytes(n).toString('base64url').replace(/[-_]/g, '').slice(0, n + 2);

const postKey = (id: string) => `social:post:${id}`;
const indexScore = (p: SocialPost) => p.scheduledAt ?? p.createdAt;

export async function getPost(id: string): Promise<SocialPost | null> {
  return getJSON<SocialPost>(postKey(id));
}

export async function savePost(p: SocialPost): Promise<SocialPost> {
  await setJSON(postKey(p.id), p);
  await zadd('social:posts', indexScore(p), p.id);
  return p;
}

export async function listPosts(fromMs: number, toMs: number): Promise<SocialPost[]> {
  const ids = await zrangeByScore('social:posts', fromMs, toMs);
  const posts = await mgetJSON<SocialPost>(ids.map(postKey));
  return posts.filter((p): p is SocialPost => !!p);
}

export async function deletePost(id: string): Promise<void> {
  await del(postKey(id));
  await zrem('social:posts', id);
}

/** Read-modify-write helper. Returns the updated post, or null if it doesn't exist. */
export async function updatePost(
  id: string,
  fn: (p: SocialPost) => SocialPost | void,
): Promise<SocialPost | null> {
  const p = await getPost(id);
  if (!p) return null;
  const next = fn(p) ?? p;
  return savePost(next);
}

export function addHistory(p: SocialPost, text: string): void {
  p.history = [...(p.history ?? []), { at: Date.now(), text }].slice(-30);
}

/* ---------------- settings ---------------- */

export async function getSettings(): Promise<AutomationSettings> {
  const s = await getJSON<Partial<AutomationSettings>>('social:settings');
  // Deep-merge so a setting added later gets its default instead of undefined.
  const out = structuredClone(DEFAULT_SETTINGS) as AutomationSettings;
  if (s) {
    for (const k of Object.keys(out) as (keyof AutomationSettings)[]) {
      if (s[k]) Object.assign(out[k], s[k]);
    }
  }
  return out;
}

export async function saveSettings(s: AutomationSettings): Promise<void> {
  await setJSON('social:settings', s);
}

/* ---------------- Meta connection ---------------- */

export async function getMeta(): Promise<MetaConnection | null> {
  return getJSON<MetaConnection>('social:meta');
}
export async function saveMeta(m: MetaConnection): Promise<void> {
  await setJSON('social:meta', m);
}
export async function clearMeta(): Promise<void> {
  await del('social:meta');
}

/* ---------------- conversations ---------------- */

export const convKey = (platform: string, userId: string) => `${platform}:${userId}`;

export async function getConv(key: string): Promise<Conversation | null> {
  return getJSON<Conversation>(`social:conv:${key}`);
}

export async function saveConv(c: Conversation): Promise<void> {
  c.messages = c.messages.slice(-60);
  await setJSON(`social:conv:${c.key}`, c, 60 * 60 * 24 * 180); // keep 6 months
  await zadd('social:convs', c.lastActivityAt, c.key);
}

export async function listConvs(limit = 50): Promise<Conversation[]> {
  const keys = await zrevrange('social:convs', 0, limit - 1);
  const convs = await mgetJSON<Conversation>(keys.map((k) => `social:conv:${k}`));
  return convs.filter((c): c is Conversation => !!c);
}

/** A tracked quote link for this conversation, so a quote-form submit can be matched back to the DM. */
export async function refTokenFor(c: Conversation): Promise<string> {
  if (!c.refToken) c.refToken = newId(6);
  await setJSON(`social:ref:${c.refToken}`, c.key, 60 * 60 * 24 * 30);
  return c.refToken;
}

export async function convKeyForRef(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9]{4,16}$/.test(token)) return null;
  return getJSON<string>(`social:ref:${token}`);
}
