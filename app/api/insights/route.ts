import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '../../_lib/social/guard';
import { buildInsights, realDeps } from '../../_lib/insights/build';
import { demoDeps, demoEnabled } from '../../_lib/insights/demo';
import { saveGoals } from '../../_lib/insights/goals';
import { RANGES, type RangeKey } from '../../_lib/insights/types';

export const dynamic = 'force-dynamic';
// The first load after connecting Vercel saves the last 31 days (124 small calls).
export const maxDuration = 300;

/**
 * GET /api/insights?range=30[&refresh=1]
 *   Everything the Insights tab shows for 7 / 30 / 90 / 365 days.
 *   refresh=1 skips the 30-minute cache of Vercel + Search Console answers.
 *
 * POST /api/insights  { goals: { quotes, jobs, revenue, reviews } }
 *   Saves the monthly goals behind the rings. Admin only, like every route here.
 */
export async function GET(req: Request) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  const url = new URL(req.url);
  const r = Number(url.searchParams.get('range'));
  const range: RangeKey = (RANGES as number[]).includes(r) ? (r as RangeKey) : 30;
  const force = url.searchParams.get('refresh') === '1';
  const deps = demoEnabled() ? demoDeps() : await realDeps(range, force);
  const payload = await buildInsights(range, deps);
  return NextResponse.json({ insights: payload, demo: demoEnabled() });
}

export async function POST(req: Request) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  const body = await req.json().catch(() => ({}));
  if (!body?.goals || typeof body.goals !== 'object') return NextResponse.json({ error: 'Send { goals: { quotes, jobs, revenue, reviews } }' }, { status: 400 });
  const goals = await saveGoals(body.goals);
  return NextResponse.json({ goals });
}
