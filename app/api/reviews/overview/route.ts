import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '../../../_lib/social/guard';
import { buildReviewsOverview, realOverviewDeps } from '../../../_lib/reviews/overview';
import { demoEnabled } from '../../../_lib/insights/demo';
import { demoOverviewDeps } from '../../../_lib/reviews/demo';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reviews/overview → everything the Reviews tab shows (admin only).
 * Actions stay on their own routes: /api/reviews/requests (send / skip / check now),
 * /api/admin/send-review-request (ask someone now), /api/social/settings (auto on/off + mode).
 */
export async function GET() {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  return NextResponse.json({ overview: await buildReviewsOverview(demoEnabled() ? demoOverviewDeps() : realOverviewDeps()) });
}
