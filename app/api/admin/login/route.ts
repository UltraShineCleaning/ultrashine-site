import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  passwordMatches,
} from '../../../_lib/adminAuth';

/**
 * POST /api/admin/login
 *
 * Checks the password in constant time and, on success, sets a SIGNED
 * SESSION TOKEN as the cookie. Before 2026-09-24 this route set the cookie's
 * value to the password itself. See app/_lib/adminAuth.ts for why that
 * changed. Existing sessions stop working after this deploys; everyone signs
 * in once more.
 */
export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { ok: false, error: 'ADMIN_PASSWORD env var not set. Add it in Vercel.' },
      { status: 500 },
    );
  }

  if (!passwordMatches(password)) {
    // Small fixed delay blunts rapid-fire guessing without a database.
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ ok: false, error: 'Wrong password.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: createSessionToken(),
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
