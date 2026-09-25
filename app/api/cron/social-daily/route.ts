import { NextResponse } from 'next/server';
import { isAdmin } from '../../../_lib/adminAuth';
import { sweepCompletedVisits } from '../../../_lib/reviewRequests';
import { refreshInsights } from '../../../_lib/social/insights';
import { cleanupOldMedia, publishOverdue } from '../../../_lib/social/publisher';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Daily at ~10 AM Florida time (vercel.json). Safety net + chores:
 *  1. Publish any approved post whose time passed but didn't go out
 *  2. Send the Google review requests for jobs completed in Jobber
 *  3. Refresh Instagram numbers for the Insights view
 *  4. Delete old photos from storage (they live on Instagram now)
 *
 * Runs for Vercel's cron (Bearer CRON_SECRET when set) or a signed-in admin.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const bearerOk = !!secret && req.headers.get('authorization') === `Bearer ${secret}`;
  const vercelCron = !secret && (req.headers.get('user-agent') ?? '').startsWith('vercel-cron');
  if (!bearerOk && !vercelCron && !isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const out: Record<string, unknown> = {};
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      out[name] = await fn();
    } catch (e) {
      out[name] = { error: (e as Error).message };
    }
  };
  await step('overduePublished', publishOverdue);
  await step('reviewRequests', () => sweepCompletedVisits());
  await step('insights', async () => {
    const s = await refreshInsights();
    return s.error ? { error: s.error } : { followers: s.followers };
  });
  await step('mediaCleaned', cleanupOldMedia);
  return NextResponse.json({ ok: true, ...out });
}
