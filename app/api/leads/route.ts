import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '../../_lib/social/guard';
import { createManualLead, listLeads, markDoneFromVisits, syncLeads, updateLead, type LeadPatch } from '../../_lib/leads/store';
import { getRecentlyCompletedVisits, isJobberConfigured } from '../../_lib/jobberClient';
import { getJSON, setJSON } from '../../_lib/kv';
import { leadStats } from '../../_lib/leads/types';
import { demoEnabled } from '../../_lib/insights/demo';
import { demoLeads } from '../../_lib/leads/demo';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET   /api/leads[?refresh=1]  → { leads, stats }  (admin only)
 *   Reads older requests back from Resend at most every 5 minutes (refresh=1 forces it)
 *   and picks up Instagram / Facebook conversations tagged as leads.
 * PATCH /api/leads  { id, stage?, ownerNotes?, quotedPrice?, walkthroughAt?, lostReason?, archived?, name?, phone?, email?, service?, city? }
 *   → { lead }  Moves a lead on the Pipeline board and/or saves its details. Nothing is ever deleted.
 * POST  /api/leads  { name, phone?, email?, service?, city?, source?, notes?, estimate? }  → { lead }
 *   Adds a lead by hand ("+ New lead"). Never emails anyone.
 */
export async function GET(req: Request) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  if (demoEnabled()) {
    const leads = demoLeads();
    return NextResponse.json({ leads, stats: leadStats(leads) });
  }
  const refresh = new URL(req.url).searchParams.get('refresh') === '1';
  await syncLeads(refresh);
  // Booked → "Cleaning done" when Jobber shows the first visit completed. At most every 10 minutes
  // (Jobber rate limit), or right away on Refresh. Never blocks the board if Jobber is down.
  if (isJobberConfigured()) {
    try {
      const last = await getJSON<number>('leads:jobber-done-check');
      if (refresh || !last || Date.now() - last > 600_000) {
        await setJSON('leads:jobber-done-check', Date.now(), 3600);
        const { visits } = await getRecentlyCompletedVisits(45);
        await markDoneFromVisits(visits);
      }
    } catch {
      /* Jobber unavailable — the board still loads */
    }
  }
  const leads = await listLeads(300);
  return NextResponse.json({ leads, stats: leadStats(leads) });
}

const PATCH_KEYS = ['stage', 'ownerNotes', 'quotedPrice', 'walkthroughAt', 'lostReason', 'archived', 'name', 'phone', 'email', 'service', 'city'] as const;

export async function PATCH(req: Request) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== 'string' || body.id.length > 120) {
    return NextResponse.json({ error: 'Send { id, stage?, ownerNotes?, … }' }, { status: 400 });
  }
  if (body.ownerNotes != null && typeof body.ownerNotes !== 'string') {
    return NextResponse.json({ error: 'ownerNotes must be text' }, { status: 400 });
  }
  const patch: LeadPatch = {};
  for (const k of PATCH_KEYS) if (k in body) (patch as Record<string, unknown>)[k] = body[k];
  if (demoEnabled()) return NextResponse.json({ lead: { ...demoLeads().find((l) => l.id === body.id), ...patch } });
  const lead = await updateLead(body.id, patch);
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  return NextResponse.json({ lead });
}

export async function POST(req: Request) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'A name is needed' }, { status: 400 });
  }
  if (demoEnabled()) {
    const now = Date.now();
    return NextResponse.json({
      lead: { id: `man_demo_${now}`, kind: 'quote', at: now, origin: 'manual', stage: 'new', stageAt: now, history: [{ at: now, text: 'Added by hand' }], ...body },
    });
  }
  const lead = await createManualLead(body);
  if (!lead) return NextResponse.json({ error: 'A name is needed' }, { status: 400 });
  return NextResponse.json({ lead });
}
