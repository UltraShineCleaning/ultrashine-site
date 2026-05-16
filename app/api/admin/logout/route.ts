import { NextResponse } from 'next/server';

const COOKIE_NAME = 'us_admin';

/**
 * POST /api/admin/logout
 * Clears the admin session cookie + redirects to /admin/login.
 */
export async function POST() {
  const res = NextResponse.redirect(
    new URL('/admin/login', process.env.NEXT_PUBLIC_SITE_URL || 'https://ultrashinecleaningfl.com'),
    303
  );
  res.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
