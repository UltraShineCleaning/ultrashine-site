import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

/**
 * GET /api/jobber/connect
 *
 * First step of the Jobber OAuth flow. Admin-only.
 *
 * 1. Verifies the admin cookie (only Tiago can connect Jobber to the site)
 * 2. Generates a random `state` value to prevent CSRF on the callback
 * 3. Stores state in a temporary cookie (5-min expiry)
 * 4. Redirects the browser to Jobber's authorization screen
 *
 * After Tiago approves the connection in Jobber, Jobber redirects back to
 * /api/jobber/callback with `code` + `state` query params, which exchanges
 * the code for an access_token + refresh_token.
 */

const COOKIE_NAME = 'us_admin';
const STATE_COOKIE = 'us_jobber_oauth_state';
const JOBBER_AUTH_URL = 'https://api.getjobber.com/api/oauth/authorize';

// Scopes match what Tiago toggled on in the Jobber developer app
const JOBBER_SCOPES = [
  'read_clients',
  'read_requests',
  'read_quotes',
  'read_jobs',
  'read_scheduled_items',
  'read_invoices',
  'read_users',
  'read_jobber_payments',
].join(' ');

export async function GET() {
  // Admin auth check
  const cookie = cookies().get(COOKIE_NAME)?.value;
  const password = process.env.ADMIN_PASSWORD;
  if (!password || cookie !== password) {
    return NextResponse.redirect(
      new URL('/admin/login', 'https://ultrashinecleaningfl.com'),
    );
  }

  const clientId = process.env.JOBBER_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'JOBBER_CLIENT_ID env var missing on Vercel' },
      { status: 500 },
    );
  }

  // Generate CSRF state token
  const state = randomBytes(32).toString('hex');
  cookies().set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 5, // 5 minutes
    path: '/',
  });

  // Construct Jobber authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: 'https://ultrashinecleaningfl.com/api/jobber/callback',
    response_type: 'code',
    state,
    scope: JOBBER_SCOPES,
  });

  return NextResponse.redirect(`${JOBBER_AUTH_URL}?${params.toString()}`);
}
