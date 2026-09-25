import { NextResponse } from 'next/server';
import { del as blobDel } from '@vercel/blob';
import { ACTOR, denyUnlessAdmin } from '../../../../_lib/social/guard';
import { publishPost, schedulePost, unschedulePost } from '../../../../_lib/social/publisher';
import { addHistory, deletePost, getPost, savePost } from '../../../../_lib/social/store';
import type { Platform } from '../../../../_lib/social/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type Params = { params: { id: string } };

/**
 * PATCH /api/social/posts/:id
 * body: {
 *   action?: 'approve' | 'to-draft' | 'request-changes' | 'publish-now' | 'retry',
 *   caption?, platforms?, scheduledAt?, note?
 * }
 * Every edit to a scheduled post re-queues its timer, so moving a post (drag
 * in the calendar) can never leave a stale one behind.
 */
export async function PATCH(req: Request, { params }: Params) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  const b = (await req.json().catch(() => ({}))) as Record<string, any>;
  const p = await getPost(params.id);
  if (!p) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  if (p.status === 'publishing') return NextResponse.json({ error: 'It is publishing right now — try again in a minute.' }, { status: 409 });

  const editable = p.status !== 'published';
  if (editable && typeof b.caption === 'string') p.caption = b.caption.slice(0, 2200);
  if (editable && Array.isArray(b.platforms)) {
    const pl = b.platforms.filter((x: any) => x === 'instagram' || x === 'facebook') as Platform[];
    if (pl.length) p.platforms = pl;
  }
  if (editable && (typeof b.scheduledAt === 'number' || b.scheduledAt === null)) {
    if (b.scheduledAt && b.scheduledAt < Date.now() - 60_000 && p.status === 'scheduled')
      return NextResponse.json({ error: 'That time has passed. Pick a later time or use Post now.' }, { status: 400 });
    p.scheduledAt = b.scheduledAt;
    addHistory(p, 'Moved to a new time');
  }

  switch (b.action) {
    case 'approve':
      if (!p.scheduledAt || p.scheduledAt < Date.now()) return NextResponse.json({ error: 'Give it a time first (or Post now).' }, { status: 400 });
      p.status = 'scheduled';
      p.approvedBy = ACTOR;
      p.approvedAt = Date.now();
      p.changeNote = undefined;
      addHistory(p, `Approved by ${ACTOR}`);
      break;
    case 'to-draft':
      await unschedulePost(p);
      p.status = 'draft';
      addHistory(p, 'Moved back to draft');
      break;
    case 'request-changes':
      await unschedulePost(p);
      p.status = 'draft';
      p.changeNote = typeof b.note === 'string' ? b.note.slice(0, 600) : '';
      addHistory(p, `Changes requested: ${p.changeNote || '(no note)'}`);
      break;
    case 'publish-now':
    case 'retry': {
      if (b.action === 'publish-now') {
        await unschedulePost(p);
        p.scheduledAt = Date.now();
        p.approvedBy = p.approvedBy ?? ACTOR;
        p.approvedAt = p.approvedAt ?? Date.now();
      }
      p.status = 'scheduled';
      addHistory(p, b.action === 'retry' ? 'Retry requested' : 'Post now');
      await unschedulePost(p);
      p.qstashMessageId = undefined;
      await savePost(p); // no timer — publish right here
      const r = await publishPost(p.id, { force: true });
      return NextResponse.json({ post: await getPost(p.id), result: r });
    }
  }

  const saved = await schedulePost(p); // re-queues (or cancels) the timer to match the status + time
  return NextResponse.json({ post: saved });
}

export async function DELETE(_req: Request, { params }: Params) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  const p = await getPost(params.id);
  if (!p) return NextResponse.json({ ok: true });
  if (p.status === 'publishing') return NextResponse.json({ error: 'It is publishing right now.' }, { status: 409 });
  await unschedulePost(p);
  if (process.env.BLOB_READ_WRITE_TOKEN && p.media.length) await blobDel(p.media.map((m) => m.url)).catch(() => undefined);
  await deletePost(p.id);
  // Deleting here never deletes a post that's already live on Instagram/Facebook — that stays up.
  return NextResponse.json({ ok: true, wasPublished: p.status === 'published' });
}
