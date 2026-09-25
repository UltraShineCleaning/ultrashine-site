import { NextResponse } from 'next/server';
import { kvConfigured } from '../../../_lib/kv';
import { customerFromAddress } from '../../../_lib/reviewEmail';
import { aiEnabled } from '../../../_lib/social/ai';
import { denyUnlessAdmin } from '../../../_lib/social/guard';
import { metaAppConfigured } from '../../../_lib/social/meta';
import { qstashConfigured } from '../../../_lib/social/qstash';
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
  return NextResponse.json({
    storage: kvConfigured(),
    scheduler: qstashConfigured() && !!process.env.QSTASH_CURRENT_SIGNING_KEY,
    uploads: !!process.env.BLOB_READ_WRITE_TOKEN,
    metaApp: metaAppConfigured(),
    webhook: !!process.env.META_WEBHOOK_VERIFY_TOKEN,
    connected: meta
      ? { page: meta.pageName, instagram: meta.igUsername ?? null, since: meta.connectedAt }
      : null,
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
