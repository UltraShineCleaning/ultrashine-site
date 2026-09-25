import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '../../../_lib/social/guard';
import { getInsights, refreshInsights } from '../../../_lib/social/insights';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET — last snapshot (the daily cron refreshes it). ?refresh=1 pulls live numbers now. */
export async function GET(req: Request) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  const refresh = new URL(req.url).searchParams.get('refresh') === '1';
  const snap = refresh ? await refreshInsights() : await getInsights();
  return NextResponse.json({ insights: snap });
}
