import { NextResponse } from 'next/server';

const COOKIE_NAME = 'us_admin';
const ONE_MONTH = 60 * 60 * 24 * 30;

/**
 * POST /api/admin/login
 * Validates against ADMIN_PASSWORD env var, sets httpOnly cookie.
 */
export async function POST(req: Request) {
  const { password } = (await req.json()) as { password?: string };
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return NextResponse.json(
      { ok: false, error: 'ADMIN_PASSWORD env var not set. Add it in Vercel.' },
      { status: 500 }
    );
  }

  if (!password || password !== expected) {
    return NextResponse.json({ ok: false, error: 'Wrong password.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: password,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_MONTH,
  });
  return res;
}
