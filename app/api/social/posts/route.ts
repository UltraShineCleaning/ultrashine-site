import { NextResponse } from 'next/server';
import { ACTOR, denyUnlessAdmin } from '../../../_lib/social/guard';
import { publishPost, schedulePost } from '../../../_lib/social/publisher';
import { addHistory, getPost, listPosts, newId, savePost } from '../../../_lib/social/store';
import type { MediaItem, Platform, PostKind, SocialPost } from '../../../_lib/social/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // "Post now" can wait on Instagram video processing

const KINDS: PostKind[] = ['POST', 'CAROUSEL', 'REEL', 'STORY'];
const PLATFORMS: Platform[] = ['instagram', 'facebook'];

/** GET /api/social/posts?from=ms&to=ms — the calendar. Defaults to 2 weeks back → 4 weeks ahead. */
export async function GET(req: Request) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  const u = new URL(req.url);
  const now = Date.now();
  const from = Number(u.searchParams.get('from')) || now - 14 * 86_400_000;
  const to = Number(u.searchParams.get('to')) || now + 28 * 86_400_000;
  const posts = await listPosts(from, to);
  return NextResponse.json({ posts });
}

/**
 * POST /api/social/posts — create a post.
 * body: { kind, media[], caption, platforms[], scheduledAt|null, mode: 'draft' | 'schedule' | 'now', jobRef?, city?, overlay? }
 */
export async function POST(req: Request) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  const b = (await req.json().catch(() => ({}))) as Record<string, any>;

  const kind: PostKind = KINDS.includes(b.kind) ? b.kind : 'POST';
  const media: MediaItem[] = Array.isArray(b.media)
    ? b.media
        .filter((m: any) => typeof m?.url === 'string' && /^https:\/\//.test(m.url))
        .slice(0, 10)
        .map((m: any) => ({ url: m.url, type: m.type === 'video' ? 'video' : 'image', pathname: typeof m.pathname === 'string' ? m.pathname : undefined }))
    : [];
  if (!media.length) return NextResponse.json({ error: 'Add a photo or video first.' }, { status: 400 });
  if (kind === 'REEL' && !media.some((m) => m.type === 'video')) return NextResponse.json({ error: 'A reel needs a video.' }, { status: 400 });

  const platforms: Platform[] = Array.isArray(b.platforms) ? b.platforms.filter((p: any) => PLATFORMS.includes(p)) : PLATFORMS;
  if (!platforms.length) return NextResponse.json({ error: 'Pick Instagram, Facebook or both.' }, { status: 400 });
  const caption = typeof b.caption === 'string' ? b.caption.slice(0, 2200) : '';
  const mode = b.mode === 'now' ? 'now' : b.mode === 'schedule' ? 'schedule' : 'draft';
  const scheduledAt = typeof b.scheduledAt === 'number' && b.scheduledAt > 0 ? b.scheduledAt : null;
  if (mode === 'schedule' && (!scheduledAt || scheduledAt < Date.now() - 60_000))
    return NextResponse.json({ error: 'Pick a time in the future (or Post now).' }, { status: 400 });

  const post: SocialPost = {
    id: newId(),
    kind,
    media,
    caption,
    platforms,
    scheduledAt: mode === 'now' ? Date.now() : scheduledAt,
    status: mode === 'draft' ? 'draft' : 'scheduled',
    createdAt: Date.now(),
    createdBy: ACTOR,
    jobRef: typeof b.jobRef === 'string' ? b.jobRef.slice(0, 120) : undefined,
    city: typeof b.city === 'string' ? b.city.slice(0, 60) : undefined,
    overlay: typeof b.overlay === 'string' ? b.overlay.slice(0, 80) : undefined,
    results: {},
    history: [],
  };
  addHistory(post, mode === 'draft' ? 'Saved as a draft' : 'Created and approved');
  if (mode !== 'draft') {
    post.approvedBy = ACTOR;
    post.approvedAt = Date.now();
  }

  if (mode === 'now') {
    await savePost(post); // no timer — publish right here
    const r = await publishPost(post.id, { force: true });
    return NextResponse.json({ post: await getPost(post.id), result: r });
  }
  const saved = await schedulePost(post);
  return NextResponse.json({ post: saved });
}
