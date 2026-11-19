import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '../../_lib/social/guard';
import { buildHome, realHomeDeps } from '../../_lib/home/build';
import { demoHomeDeps } from '../../_lib/home/demo';
import { demoEnabled } from '../../_lib/insights/demo';
import { getGoals } from '../../_lib/insights/goals';

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
  const [home, goals] = await Promise.all([
    buildHome(demoEnabled() ? demoHomeDeps() : await realHomeDeps(force)),
    // Monthly goals (set from Settings or the Insights rings) — the Overview goal ring reads these.
    demoEnabled() ? Promise.resolve({ quotes: 25, jobs: 70, revenue: 15000, reviews: 6 }) : getGoals().catch(() => null),
  ]);
  return NextResponse.json({ home, goals });
}
