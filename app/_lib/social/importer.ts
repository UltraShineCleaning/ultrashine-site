import { getJSON, kvConfigured, setJSON } from '../kv';
import { schedulePost } from './publisher';
import { addHistory, getPost, savePost } from './store';
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

export async function importPlannedPosts(): Promise<{ created: number; skipped: number }> {
  if (!kvConfigured()) return { created: 0, skipped: 0 };
  let created = 0;
  let skipped = 0;
  const now = Date.now();
  for (const plan of PLANS) {
    if (await getJSON<string>(planKey(plan.name))) continue; // whole plan already handled
    const todo: PlanItem[] = [];
    for (const it of plan.items) {
      if (await getJSON<string>(doneKey(it.id))) continue;
      if (await getPost(it.id)) {
        await setJSON(doneKey(it.id), '1', 60 * 60 * 24 * 120);
        continue;
      }
      if (it.status === 'scheduled' && it.at < now + 60_000) {
        skipped++;
        await setJSON(doneKey(it.id), 'skipped', 60 * 60 * 24 * 120);
        continue;
      }
      todo.push(it);
    }
    // a few at a time: each scheduled post books its own timer
    for (let i = 0; i < todo.length; i += 6) {
      await Promise.all(
        todo.slice(i, i + 6).map(async (it) => {
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
            await schedulePost(post);
          } else {
            addHistory(post, 'Loaded from the October plan as a draft: add music and post it from the Instagram app');
            await savePost(post);
          }
          await setJSON(doneKey(it.id), '1', 60 * 60 * 24 * 120);
          created++;
        }),
      );
    }
    const allDone = (await Promise.all(plan.items.map((it) => getJSON<string>(doneKey(it.id))))).every(Boolean);
    if (allDone) await setJSON(planKey(plan.name), '1', 60 * 60 * 24 * 120);
  }
  return { created, skipped };
}
