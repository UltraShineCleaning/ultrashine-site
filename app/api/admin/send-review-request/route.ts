import { NextResponse } from 'next/server';
import { isAdmin } from '../../../_lib/adminAuth';
import { sendReviewEmail } from '../../../_lib/reviewRequests';

/**
 * POST /api/admin/send-review-request — the manual "send a review request"
 * button in the Reviews tab.
 *
 * Uses the same email as the automatic after-job request (button + QR code),
 * from app/_lib/reviewEmail.ts. Before 2026-09-24 this route sent from
 * Resend's shared onboarding@resend.dev address, which Resend only delivers
 * to the account owner — so customers never actually received it. It now
 * uses the verified domain (QUOTE_FROM_EMAIL / REVIEW_FROM_EMAIL) and says
 * so plainly when that isn't set up yet.
 *
 * Body: { name: string, email: string, service?: string }
 */
export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { name?: string; email?: string; service?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const service = (body.service || '').trim() || undefined;
  if (!name || !email) return NextResponse.json({ error: 'Name + email required' }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });

  try {
    const id = await sendReviewEmail(name, email, service);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || 'Send failed' }, { status: 500 });
  }
}
