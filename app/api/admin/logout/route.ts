import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '../../../_lib/adminAuth';

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
    name: ADMIN_COOKIE,
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
