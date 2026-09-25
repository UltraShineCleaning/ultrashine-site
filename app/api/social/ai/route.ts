import { NextResponse } from 'next/server';
import { aiCaptions, aiEnabled, aiReply, aiRewrite } from '../../../_lib/social/ai';
import { denyUnlessAdmin } from '../../../_lib/social/guard';
import { getConv } from '../../../_lib/social/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/social/ai — only works when ANTHROPIC_API_KEY is set (the ✦ buttons are hidden otherwise).
 * { task: 'captions', imageUrls, job?, city?, kind } | { task: 'rewrite', caption, how } | { task: 'reply', key }
 */
export async function POST(req: Request) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  if (!aiEnabled()) return NextResponse.json({ error: 'AI is off — add ANTHROPIC_API_KEY in Vercel to turn it on.' }, { status: 400 });
  const b = (await req.json().catch(() => ({}))) as Record<string, any>;
  try {
    if (b.task === 'captions') {
      const urls = (Array.isArray(b.imageUrls) ? b.imageUrls : []).filter((u: unknown) => typeof u === 'string' && /^https:\/\//.test(u as string));
      return NextResponse.json(await aiCaptions({ imageUrls: urls, job: b.job, city: b.city, kind: String(b.kind || 'POST') }));
    }
    if (b.task === 'rewrite') {
      const HOW: Record<string, string> = {
        short: 'much shorter, one or two sentences',
        warm: 'warmer and more personal',
        pro: 'more professional and trustworthy',
        es: 'keep it as is and add one Spanish line at the end',
        tags: 'keep it as is and add 4 hashtags for the city and service at the end',
      };
      return NextResponse.json({ caption: await aiRewrite(String(b.caption || ''), HOW[b.how] ?? 'clearer') });
    }
    if (b.task === 'reply') {
      const c = await getConv(String(b.key || ''));
      if (!c) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      return NextResponse.json({ reply: await aiReply(c.messages.filter((m) => m.by !== 'system')) });
    }
    return NextResponse.json({ error: 'Unknown task' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
