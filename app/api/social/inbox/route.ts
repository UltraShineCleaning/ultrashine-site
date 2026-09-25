import { NextResponse } from 'next/server';
import { sendManualReply, windowOpen } from '../../../_lib/social/automations';
import { ACTOR, denyUnlessAdmin } from '../../../_lib/social/guard';
import { listConvs } from '../../../_lib/social/store';
import { GOOGLE_REVIEW_URL } from '../../../_lib/reviewEmail';

export const dynamic = 'force-dynamic';

/** GET — conversations for the Inbox, newest first, each with whether a reply is still allowed. */
export async function GET() {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  const convs = await listConvs(60);
  return NextResponse.json({
    convs: convs.map((c) => ({
      ...c,
      canReply: c.kind === 'dm' && windowOpen(c),
      windowEndsAt: c.kind === 'dm' ? c.lastInboundAt + 24 * 3600_000 : null,
    })),
  });
}

/**
 * POST — { key, text } sends a reply as Ultra Shine.
 *        { key, action: 'review' } sends the Google review link in the thread.
 */
export async function POST(req: Request) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  const b = (await req.json().catch(() => ({}))) as { key?: string; text?: string; action?: string };
  if (!b.key) return NextResponse.json({ error: 'Missing conversation' }, { status: 400 });
  const text =
    b.action === 'review'
      ? `Thank you so much for choosing Ultra Shine! If you have 60 seconds, a Google review helps our small family business a lot: ${GOOGLE_REVIEW_URL}`
      : (b.text ?? '').trim().slice(0, 1000);
  if (!text) return NextResponse.json({ error: 'Type a message first' }, { status: 400 });
  try {
    const conv = await sendManualReply(b.key, text, ACTOR);
    return NextResponse.json({ conv });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
