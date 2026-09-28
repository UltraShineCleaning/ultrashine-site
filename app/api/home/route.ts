import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '../../_lib/social/guard';
import { buildHome, realHomeDeps } from '../../_lib/home/build';
import { demoHomeDeps } from '../../_lib/home/demo';
import { demoEnabled } from '../../_lib/insights/demo';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/home[?refresh=1]
 *   Everything the Home tab shows. refresh=1 skips the Jobber + Resend caches
 *   (Jobber is otherwise cached 5 minutes to stay under its rate limit).
 */
export async function GET(req: Request) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  const force = new URL(req.url).searchParams.get('refresh') === '1';
  const home = await buildHome(demoEnabled() ? demoHomeDeps() : await realHomeDeps(force));
  return NextResponse.json({ home });
}
