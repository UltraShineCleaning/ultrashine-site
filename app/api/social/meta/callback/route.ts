import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isAdmin } from '../../../../_lib/adminAuth';
import { exchangeCodeForConnection, friendlyError } from '../../../../_lib/social/meta';
import { siteBaseUrl } from '../../../../_lib/social/qstash';
import { saveMeta } from '../../../../_lib/social/store';

/** GET /api/social/meta/callback — Meta sends Tiago back here after he approves. Stores the Page token in Redis. */
export async function GET(req: Request) {
  const base = siteBaseUrl();
  if (!isAdmin()) return NextResponse.redirect(`${base}/admin/login`);
  const u = new URL(req.url);
  const state = u.searchParams.get('state');
  const expected = cookies().get('us_meta_state')?.value;
  const back = (msg: string) => NextResponse.redirect(`${base}/admin?social=${encodeURIComponent(msg)}#social`);
  if (u.searchParams.get('error')) return back(u.searchParams.get('error_description') || 'Connection was cancelled');
  if (!state || !expected || state !== expected) return back('Connection expired — tap Connect again');
  const code = u.searchParams.get('code');
  if (!code) return back('Meta did not return a code');
  try {
    const conn = await exchangeCodeForConnection(code, `${base}/api/social/meta/callback`);
    await saveMeta(conn);
    const res = back(conn.igUserId ? `Connected @${conn.igUsername ?? 'instagram'} + ${conn.pageName}` : `Connected ${conn.pageName} — no Instagram business account is linked to it yet`);
    res.cookies.delete('us_meta_state');
    return res;
  } catch (e) {
    return back(friendlyError(e));
  }
}
