import { NextResponse } from 'next/server';
import { kvConfigured } from '../../../_lib/kv';
import { customerFromAddress } from '../../../_lib/reviewEmail';
import { aiEnabled } from '../../../_lib/social/ai';
import { denyUnlessAdmin } from '../../../_lib/social/guard';
import { checkConnection, metaAppConfigured } from '../../../_lib/social/meta';
import { qstashConfigured, siteBaseUrl } from '../../../_lib/social/qstash';
import { clearMeta, getMeta } from '../../../_lib/social/store';

export const dynamic = 'force-dynamic';

/**
 * GET — what's set up and what isn't, so the Social tab can show a plain
 * checklist instead of failing mysteriously. Never returns any secret.
 */
export async function GET() {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  const meta = await getMeta().catch(() => null);
  // Ask Meta whether the saved token still works (cheap: two tiny Graph reads).
  const health = meta ? await checkConnection(meta).catch(() => ({ ok: false, instagramOk: null, problem: 'Could not reach Meta to check the connection.' })) : null;
  // The address Meta and the scheduler call back to. Since 2026-11-02 the site lives on
  // ultrashinecleaningfl.com (www 308-redirects there) — Meta webhooks and scheduled-post
  // callbacks do NOT follow redirects, so a www base URL silently breaks DMs and auto-posting.
  const base = siteBaseUrl();
  const baseWarning = /\/\/www\./.test(base)
    ? `Callbacks point to ${base}, which now redirects. Set SOCIAL_BASE_URL to https://ultrashinecleaningfl.com in Vercel and update the Meta app's webhook + redirect URLs.`
    : null;
  return NextResponse.json({
    storage: kvConfigured(),
    scheduler: qstashConfigured() && !!process.env.QSTASH_CURRENT_SIGNING_KEY,
    uploads: !!process.env.BLOB_READ_WRITE_TOKEN,
    metaApp: metaAppConfigured(),
    webhook: !!process.env.META_WEBHOOK_VERIFY_TOKEN,
    connected: meta
      ? { page: meta.pageName, instagram: meta.igUsername ?? null, since: meta.connectedAt }
      : null,
    health,
    callbackBase: base,
    baseWarning,
    customerEmail: !!customerFromAddress(),
    ai: aiEnabled(),
  });
}

/** POST { action: 'disconnect' } — forgets the Meta token (then Connect again). */
export async function POST(req: Request) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  const b = (await req.json().catch(() => ({}))) as { action?: string };
  if (b.action === 'disconnect') await clearMeta();
  return NextResponse.json({ ok: true });
}
