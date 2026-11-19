import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '../../../_lib/social/guard';
import { getLead, saveLead, updateLead } from '../../../_lib/leads/store';
import { homeLine } from '../../../_lib/leads/types';
import { addLeadToJobber } from '../../../_lib/jobberClient';
import { demoEnabled } from '../../../_lib/insights/demo';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/leads/jobber  { id }  → { lead, note? } | { error }
 * "Add to Jobber" on a Pipeline lead (2026-11-18): finds the client in Jobber by email/phone
 * (or creates one), then creates a Request for this job, and saves the Jobber ids on the lead
 * so the first completed visit can move it to "Cleaning done" by itself. Admin only.
 */
export async function POST(req: Request) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== 'string') return NextResponse.json({ error: 'Send { id }' }, { status: 400 });
  if (demoEnabled()) return NextResponse.json({ error: 'Demo mode — nothing is sent to Jobber.' }, { status: 400 });

  const lead = await getLead(body.id);
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  if (lead.jobberClientId && lead.jobberRequestId) return NextResponse.json({ lead, note: 'Already in Jobber.' });

  const where = [lead.street, lead.city, lead.zip].filter(Boolean).join(', ');
  const title = [lead.service || 'Cleaning', lead.frequency && !/one/i.test(lead.frequency) ? lead.frequency : null, lead.city].filter(Boolean).join(' · ');
  const details = [homeLine(lead), where, lead.estimate ? `Website estimate ${lead.estimate}` : null, lead.notes].filter(Boolean).join('\n');

  const r = await addLeadToJobber({ name: lead.name, phone: lead.phone, email: lead.email, title, details });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });

  const saved = await updateLead(lead.id, { jobberClientId: r.clientId, jobberRequestId: r.requestId ?? undefined, jobberUrl: r.url ?? undefined });
  if (saved) {
    saved.history = [
      ...(saved.history ?? []),
      { at: Date.now(), text: r.reusedClient ? `Matched to an existing Jobber client${r.requestId ? ' + request created' : ''}` : `Added to Jobber${r.requestId ? ' (client + request)' : ' (client)'}` },
    ].slice(-40);
    await saveLead(saved);
  }
  return NextResponse.json({ lead: saved, note: r.note ?? null });
}
