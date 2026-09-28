import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '../../_lib/social/guard';
import { listLeads, syncLeads, updateLead } from '../../_lib/leads/store';
import { leadStats } from '../../_lib/leads/types';
import { demoEnabled } from '../../_lib/insights/demo';
import { demoLeads } from '../../_lib/leads/demo';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET   /api/leads[?refresh=1]  → { leads, stats }  (admin only)
 *   Reads older requests back from Resend at most every 5 minutes (refresh=1 forces it)
 *   and picks up Instagram / Facebook conversations tagged as leads.
 * PATCH /api/leads  { id, stage?, ownerNotes? }  → { lead }
 *   Moves a lead to another stage and/or saves the private notes.
 */
export async function GET(req: Request) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  if (demoEnabled()) {
    const leads = demoLeads();
    return NextResponse.json({ leads, stats: leadStats(leads) });
  }
  await syncLeads(new URL(req.url).searchParams.get('refresh') === '1');
  const leads = await listLeads(300);
  return NextResponse.json({ leads, stats: leadStats(leads) });
}

export async function PATCH(req: Request) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== 'string' || body.id.length > 120) {
    return NextResponse.json({ error: 'Send { id, stage?, ownerNotes? }' }, { status: 400 });
  }
  if (body.ownerNotes != null && typeof body.ownerNotes !== 'string') {
    return NextResponse.json({ error: 'ownerNotes must be text' }, { status: 400 });
  }
  if (demoEnabled()) return NextResponse.json({ lead: { ...demoLeads().find((l) => l.id === body.id), ...body } });
  const lead = await updateLead(body.id, { stage: body.stage, ownerNotes: body.ownerNotes });
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  return NextResponse.json({ lead });
}
