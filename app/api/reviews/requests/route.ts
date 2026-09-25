import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '../../../_lib/social/guard';
import { listReviewRequests, sendRequest, skipRequest, sweepCompletedVisits } from '../../../_lib/reviewRequests';
import { customerFromAddress } from '../../../_lib/reviewEmail';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET — the automatic review requests (sent, waiting, skipped + why). */
export async function GET() {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  return NextResponse.json({ requests: await listReviewRequests(), canEmailCustomers: !!customerFromAddress() });
}

/** POST — { id, action: 'send' | 'skip' } or { action: 'check-now' } (runs the Jobber check immediately). */
export async function POST(req: Request) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  const b = (await req.json().catch(() => ({}))) as { id?: string; action?: string };
  if (b.action === 'check-now') return NextResponse.json({ result: await sweepCompletedVisits(), requests: await listReviewRequests() });
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const r = b.action === 'skip' ? await skipRequest(b.id) : await sendRequest(b.id);
  return NextResponse.json({ request: r });
}
