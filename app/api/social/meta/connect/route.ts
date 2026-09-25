import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { isAdmin } from '../../../../_lib/adminAuth';
import { metaAppConfigured, oauthUrl } from '../../../../_lib/social/meta';
import { siteBaseUrl } from '../../../../_lib/social/qstash';

/** GET /api/social/meta/connect — the "Connect Instagram + Facebook" button. Sends Tiago to Meta to approve. */
export async function GET() {
  if (!isAdmin()) return NextResponse.redirect(`${siteBaseUrl()}/admin/login`);
  if (!metaAppConfigured())
    return NextResponse.json({ error: 'Add META_APP_ID and META_APP_SECRET in Vercel first (see the setup guide).' }, { status: 500 });
  const state = randomBytes(16).toString('hex');
  const res = NextResponse.redirect(oauthUrl(`${siteBaseUrl()}/api/social/meta/callback`, state));
  res.cookies.set({ name: 'us_meta_state', value: state, httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 });
  return res;
}
