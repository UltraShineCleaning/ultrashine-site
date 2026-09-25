import { NextResponse } from 'next/server';
import { handleIncomingComment, handleIncomingMessage } from '../../../_lib/social/automations';
import { verifyMetaSignature } from '../../../_lib/social/meta';
import { convKey, getConv, getMeta, saveConv } from '../../../_lib/social/store';
import type { Platform } from '../../../_lib/social/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * /api/social/webhook — Meta calls this when someone DMs or comments.
 *
 * GET  = Meta's one-time verification (hub.challenge), using META_WEBHOOK_VERIFY_TOKEN.
 * POST = events. Every POST must carry X-Hub-Signature-256 signed with the app
 *        secret, or it's rejected — nobody else can fake a message into the inbox.
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const ok =
    u.searchParams.get('hub.mode') === 'subscribe' &&
    !!process.env.META_WEBHOOK_VERIFY_TOKEN &&
    u.searchParams.get('hub.verify_token') === process.env.META_WEBHOOK_VERIFY_TOKEN;
  return ok ? new Response(u.searchParams.get('hub.challenge') ?? '', { status: 200 }) : new Response('Forbidden', { status: 403 });
}

type Messaging = {
  sender?: { id: string };
  recipient?: { id: string };
  timestamp?: number;
  message?: { mid?: string; text?: string; is_echo?: boolean; attachments?: unknown[] };
};

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyMetaSignature(raw, req.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 401 });
  }
  const body = JSON.parse(raw) as { object?: string; entry?: any[] };
  const platform: Platform = body.object === 'instagram' ? 'instagram' : 'facebook';
  const conn = await getMeta();
  const ownIds = new Set([conn?.pageId, conn?.igUserId].filter(Boolean) as string[]);

  for (const entry of body.entry ?? []) {
    for (const m of (entry.messaging ?? []) as Messaging[]) {
      if (!m.message || !m.sender?.id) continue;
      const text = m.message.text ?? (m.message.attachments?.length ? '📎 sent a photo or file' : '');
      if (!text) continue;

      if (m.message.is_echo) {
        // A message WE sent. If it came from the Instagram/Facebook app (a person, not our
        // automation) record it — that's a human reply, so the follow-up stands down.
        const userId = m.recipient?.id;
        if (!userId) continue;
        const c = await getConv(convKey(platform, userId));
        if (!c) continue;
        const ours = c.messages.some((x) => x.dir === 'out' && x.text === text && Math.abs(x.at - (m.timestamp ?? Date.now())) < 5 * 60_000);
        if (!ours) {
          c.messages.push({ dir: 'out', text, at: m.timestamp ?? Date.now(), by: 'you (app)' });
          c.lastActivityAt = Date.now();
          if (c.followUp?.scheduledFor && !c.followUp.sentAt) c.followUp = { skipped: 'you already replied' };
          await saveConv(c);
        }
        continue;
      }
      if (ownIds.has(m.sender.id)) continue;
      await handleIncomingMessage(platform, m.sender.id, text, m.timestamp ?? Date.now());
    }

    for (const ch of entry.changes ?? []) {
      const v = ch.value ?? {};
      if (platform === 'instagram' && ch.field === 'comments' && v.id && v.from?.id && !ownIds.has(v.from.id)) {
        await handleIncomingComment('instagram', v.id, v.from.id, v.from.username, v.text ?? '');
      }
      if (platform === 'facebook' && ch.field === 'feed' && v.item === 'comment' && v.verb === 'add' && v.comment_id && v.from?.id && !ownIds.has(v.from.id)) {
        await handleIncomingComment('facebook', v.comment_id, v.from.id, v.from.name, v.message ?? '');
      }
    }
  }
  return NextResponse.json({ ok: true });
}
