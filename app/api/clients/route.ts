import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '../../_lib/social/guard';
import { buildClients, realProfileDeps, saveHomeDetails } from '../../_lib/clients/profiles';
import { demoEnabled } from '../../_lib/insights/demo';
import { demoProfileDeps } from '../../_lib/clients/demo';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET   /api/clients[?refresh=1] → every client with how often they're cleaned,
 *       price per visit, what they paid / owe, next visit and home size.
 * PATCH /api/clients { id, home: { bedrooms, bathrooms, sqft, pets, notes } }
 *       → saves the owner's own home details for that client (private to the dashboard).
 */
export async function GET(req: Request) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  const force = new URL(req.url).searchParams.get('refresh') === '1';
  const payload = await buildClients(demoEnabled() ? demoProfileDeps() : realProfileDeps(force));
  return NextResponse.json(payload);
}

export async function PATCH(req: Request) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  const b = await req.json().catch(() => null);
  if (!b || typeof b.id !== 'string' || b.id.length > 120 || typeof b.home !== 'object' || !b.home) {
    return NextResponse.json({ error: 'Send { id, home: { bedrooms, bathrooms, sqft, pets, notes } }' }, { status: 400 });
  }
  const home = await saveHomeDetails(b.id, b.home);
  return NextResponse.json({ home });
}
