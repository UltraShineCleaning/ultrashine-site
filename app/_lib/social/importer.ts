import { getJSON, kvConfigured, setJSON } from '../kv';
import { schedulePost } from './publisher';
import { addHistory, getPost, listPosts, savePost } from './store';
import type { MediaItem, PostKind, SocialPost } from './types';
import oct2026 from '../../_data/social-schedule/2026-10.json';
import oct2026Reels from '../../_data/social-schedule/2026-10-reels.json';

/**
 * Month plans made in a Claude session land in the Social calendar by themselves.
 *
 * Each plan is a JSON file in app/_data/social-schedule/ whose images live in
 * public/social/<month>/ (so Instagram can fetch them at posting time). On the
 * next visit to the Social tab, or the daily cron, every item that isn't in the
 * calendar yet is created:
 *   - status 'scheduled' → approved and queued exactly like the Schedule button
 *     (Tiago approved the October plan in chat on 2026-10-01).
 *   - status 'draft'     → shows on the calendar but never publishes by itself
 *     (the Reels: Tiago adds Instagram music and posts those from the app).
 *
 * Safe to run any number of times:
 *   - each item has a fixed id, and a "done" marker per item, so nothing is ever
 *     created twice, and a post someone DELETES from the calendar stays deleted;
 *   - items whose time already passed are skipped (no flood of late posts).
 */

type PlanItem = {
  id: string;
  kind: PostKind;
  media: MediaItem[];
  cover?: MediaItem;
  caption: string;
  at: number;
  status: 'scheduled' | 'draft';
  note?: string;
};

const PLANS: { name: string; items: PlanItem[] }[] = [
  { name: '2026-10', items: oct2026 as PlanItem[] },
  { name: '2026-10-reels', items: oct2026Reels as PlanItem[] },
];

const doneKey = (id: string) => `social:import:${id}`;
const planKey = (name: string) => `social:import:plan:${name}`;

export type ImportResult = { created: number; skipped: number; failed: number; rebooked: number; errors: string[]; at: number };

/**
 * Saving a post and booking its timer are separate steps on purpose: the post is
 * ALWAYS saved first (so it shows on the calendar), then the QStash timer is
 * booked. QStash may refuse timers too far ahead (plan limits), so posts more
 * than ~6 days out get their timer later from rebookUpcoming(), which runs on
 * every Social-tab visit and in the daily cron. Nothing here can make the whole
 * month disappear because one item failed.
 */
export async function importPlannedPosts(): Promise<ImportResult> {
  const res: ImportResult = { created: 0, skipped: 0, failed: 0, rebooked: 0, errors: [], at: Date.now() };
  if (!kvConfigured()) {
    res.errors.push('Storage (KV) is not configured on this deployment.');
    return res;
  }
  const now = Date.now();
  for (const plan of PLANS) {
    if (await getJSON<string>(planKey(plan.name))) continue; // whole plan already handled
    for (const it of plan.items) {
      try {
        if (await getJSON<string>(doneKey(it.id))) continue;
        if (await getPost(it.id)) {
          await setJSON(doneKey(it.id), '1', 60 * 60 * 24 * 120);
          continue;
        }
        if (it.status === 'scheduled' && it.at < now + 60_000) {
          res.skipped++;
          await setJSON(doneKey(it.id), 'skipped', 60 * 60 * 24 * 120);
          continue;
        }
        const post: SocialPost = {
          id: it.id,
          kind: it.kind,
          media: it.media.map((m) => ({ url: m.url, type: m.type === 'video' ? 'video' : 'image' })),
          cover: it.cover ? { url: it.cover.url, type: 'image' } : undefined,
          caption: it.caption,
          platforms: ['instagram'],
          scheduledAt: it.at,
          status: it.status,
          createdAt: now,
          createdBy: 'Claude (month plan)',
          results: {},
          history: [],
        };
        if (it.status === 'scheduled') {
          post.approvedBy = 'Tiago (approved the month plan)';
          post.approvedAt = now;
          addHistory(post, `Loaded from the October plan and scheduled${it.note ? ` · ${it.note}` : ''}`);
        } else {
          addHistory(post, `Loaded from the October plan as a draft: add music and post it from the Instagram app${it.note ? ` · ${it.note}` : ''}`);
        }
        await savePost(post); // on the calendar no matter what happens next
        await setJSON(doneKey(it.id), '1', 60 * 60 * 24 * 120);
        res.created++;
      } catch (e) {
        res.failed++;
        if (res.errors.length < 8) res.errors.push(`${it.id}: ${(e as Error).message}`);
      }
    }
    const allDone = (await Promise.all(plan.items.map((it) => getJSON<string>(doneKey(it.id))))).every(Boolean);
    if (allDone) await setJSON(planKey(plan.name), '1', 60 * 60 * 24 * 120);
  }
  res.rebooked = await rebookUpcoming(res.errors);
  await setJSON('social:import:last', res, 60 * 60 * 24 * 30).catch(() => undefined);
  return res;
}

/** Book the publish timer for approved posts in the next 6 days that don't have one yet. */
export async function rebookUpcoming(errors: string[] = []): Promise<number> {
  const now = Date.now();
  const soon = (await listPosts(now + 60_000, now + 6 * 86_400_000)).filter((p) => p.status === 'scheduled' && !p.qstashMessageId);
  let n = 0;
  for (const p of soon) {
    try {
      const saved = await schedulePost(p);
      if (saved.qstashMessageId) n++;
    } catch (e) {
      if (errors.length < 8) errors.push(`timer ${p.id}: ${(e as Error).message}`);
    }
  }
  return n;
}
