import { del as blobDel } from '@vercel/blob';
import { Resend } from 'resend';
import { setOnce, del } from '../kv';
import { friendlyError, publishFacebook, publishInstagram } from './meta';
import { cancelJob, scheduleJob } from './qstash';
import { addHistory, getMeta, getPost, listPosts, savePost, updatePost } from './store';
import type { Platform, SocialPost } from './types';

/**
 * The publish pipeline.
 *
 *   approve → schedulePost()  → QStash fires at the minute → publishPost()
 *                                         (daily cron re-checks anything overdue)
 *
 * Rules:
 *  - Only APPROVED posts ever publish (status 'scheduled'). Drafts never do.
 *  - A lock stops QStash retries + the cron from posting the same thing twice.
 *  - Each platform is tracked separately: if Instagram worked and Facebook
 *    failed, Retry only re-sends Facebook.
 *  - Any failure → status 'failed', plain-English reason, email to Tiago.
 *  - Videos are deleted from Blob once every platform has them (keeps storage free).
 */

export async function schedulePost(p: SocialPost): Promise<SocialPost> {
  await cancelJob(p.qstashMessageId);
  p.qstashMessageId = undefined;
  if (p.status === 'scheduled' && p.scheduledAt) {
    const id = await scheduleJob({ type: 'publish', postId: p.id, version: p.scheduledAt }, p.scheduledAt);
    p.qstashMessageId = id ?? undefined;
  }
  return savePost(p);
}

export async function unschedulePost(p: SocialPost): Promise<void> {
  await cancelJob(p.qstashMessageId);
}

async function alert(p: SocialPost, errors: string[]) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const from = process.env.QUOTE_FROM_EMAIL?.trim() || 'Ultra Shine Dashboard <onboarding@resend.dev>';
  const url = `${process.env.SOCIAL_BASE_URL || 'https://ultrashinecleaningfl.com'}/admin#social`;
  await new Resend(key).emails
    .send({
      from,
      to: 'contact@ultrashinecleaningfl.com',
      subject: `⚠ A ${p.kind.toLowerCase()} didn't publish`,
      text: `This post didn't go out:\n\n${p.caption.slice(0, 200)}\n\nWhy:\n- ${errors.join('\n- ')}\n\nOpen it and tap Retry: ${url}`,
    })
    .catch(() => undefined);
}

export async function publishPost(id: string, opts: { force?: boolean; version?: number; only?: Platform[] } = {}) {
  const post = await getPost(id);
  if (!post) return { ok: false, reason: 'not found' };
  // A QStash message for an old time (post was moved) — ignore it.
  if (opts.version && post.scheduledAt && opts.version !== post.scheduledAt && !opts.force) return { ok: false, reason: 'stale job' };
  if (!opts.force && post.status !== 'scheduled') return { ok: false, reason: `status is ${post.status}` };
  if (!(await setOnce(`social:lock:${id}`, '1', 600))) return { ok: false, reason: 'already publishing' };

  try {
    const conn = await getMeta();
    post.status = 'publishing';
    await savePost(post);

    const targets = (opts.only ?? post.platforms).filter((pl) => !post.results[pl]?.ok);
    const errors: string[] = [];
    for (const pl of targets) {
      try {
        if (!conn) throw new Error('Instagram and Facebook are not connected yet. Tap Connect at the top of the Social tab.');
        const r = pl === 'instagram' ? await publishInstagram(post, conn) : await publishFacebook(post, conn);
        post.results[pl] = r;
        addHistory(post, `Published to ${pl === 'instagram' ? 'Instagram' : 'Facebook'}`);
      } catch (e) {
        const msg = friendlyError(e);
        post.results[pl] = { ok: false, error: msg, at: Date.now() };
        errors.push(`${pl === 'instagram' ? 'Instagram' : 'Facebook'}: ${msg}`);
        addHistory(post, `${pl === 'instagram' ? 'Instagram' : 'Facebook'} failed · ${msg}`);
      }
    }

    const allOk = post.platforms.every((pl) => post.results[pl]?.ok);
    post.status = allOk ? 'published' : 'failed';
    if (allOk && !post.scheduledAt) post.scheduledAt = Date.now();
    await savePost(post);

    if (errors.length) await alert(post, errors);
    if (allOk) {
      // Videos are big; photos stay a couple of weeks so the calendar keeps its thumbnails (cron cleans them).
      const videos = post.media.filter((m) => m.type === 'video').map((m) => m.url);
      if (videos.length && process.env.BLOB_READ_WRITE_TOKEN) await blobDel(videos).catch(() => undefined);
    }
    return { ok: allOk, errors };
  } finally {
    await del(`social:lock:${id}`);
  }
}

/** Safety net for the daily cron: publish anything approved whose time passed but didn't go out. */
export async function publishOverdue(): Promise<number> {
  const now = Date.now();
  const due = (await listPosts(now - 3 * 86_400_000, now - 10 * 60_000)).filter((p) => p.status === 'scheduled');
  for (const p of due) await publishPost(p.id);
  return due.length;
}

/** Delete photos from Blob two weeks after publishing (the post lives on Instagram now). */
export async function cleanupOldMedia(): Promise<number> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return 0;
  const now = Date.now();
  const old = (await listPosts(now - 60 * 86_400_000, now - 14 * 86_400_000)).filter(
    (p) => p.status === 'published' && p.media.length,
  );
  for (const p of old) {
    await blobDel(p.media.map((m) => m.url)).catch(() => undefined);
    await updatePost(p.id, (x) => {
      x.media = [];
    });
  }
  return old.length;
}
