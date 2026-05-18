import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/jobber/callback?code=...&state=...
 *
 * Jobber redirects here after Tiago approves the connection. We:
 * 1. Verify the state cookie matches (CSRF protection)
 * 2. Exchange the authorization `code` for an access_token + refresh_token
 * 3. Redirect to /jobber-connected with the refresh_token so Tiago can
 *    copy it and save it as JOBBER_REFRESH_TOKEN env var on Vercel
 *
 * Once the refresh_token is stored, all future Jobber API calls happen
 * server-side without user interaction — the refresh_token gets a new
 * access_token each time.
 */

const COOKIE_NAME = 'us_admin';
const STATE_COOKIE = 'us_jobber_oauth_state';
const JOBBER_TOKEN_URL = 'https://api.getjobber.com/api/oauth/token';

export async function GET(req: Request) {
  // Admin auth check
  const cookie = cookies().get(COOKIE_NAME)?.value;
  const password = process.env.ADMIN_PASSWORD;
  if (!password || cookie !== password) {
    return NextResponse.redirect(
      new URL('/admin/login', 'https://ultrashinecleaningfl.com'),
    );
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Jobber returned an error (e.g. user denied authorization)
  if (error) {
    return NextResponse.redirect(
      new URL(`/jobber-connected?error=${encodeURIComponent(error)}`, url.origin),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/jobber-connected?error=missing_code_or_state', url.origin),
    );
  }

  // Verify state matches the cookie we set in /connect
  const storedState = cookies().get(STATE_COOKIE)?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL('/jobber-connected?error=state_mismatch', url.origin),
    );
  }
  // Clear the state cookie — single use only
  cookies().delete(STATE_COOKIE);

  const clientId = process.env.JOBBER_CLIENT_ID;
  const clientSecret = process.env.JOBBER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/jobber-connected?error=env_missing', url.origin),
    );
  }

  // Exchange code for tokens
  try {
    const tokenRes = await fetch(JOBBER_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://ultrashinecleaningfl.com/api/jobber/callback',
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[jobber/callback] Token exchange failed:', errText);
      return NextResponse.redirect(
        new URL(
          `/jobber-connected?error=${encodeURIComponent('token_exchange_failed')}`,
          url.origin,
        ),
      );
    }

    const tokens = await tokenRes.json();
    // tokens has: access_token, refresh_token, expires_in, token_type, scope
    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        new URL('/jobber-connected?error=no_refresh_token', url.origin),
      );
    }

    // Redirect to success page WITH the refresh_token so Tiago can copy it.
    // The page is admin-only (also cookie-gated) so the token is only visible
    // to Tiago. He copies it manually to Vercel env vars; that becomes the
    // persistent storage for all future API calls.
    const successUrl = new URL('/jobber-connected', url.origin);
    successUrl.searchParams.set('refresh_token', tokens.refresh_token);
    successUrl.searchParams.set(
      'expires_in',
      String(tokens.expires_in ?? 3600),
    );
    return NextResponse.redirect(successUrl);
  } catch (err: any) {
    console.error('[jobber/callback] Unexpected error:', err);
    return NextResponse.redirect(
      new URL(
        `/jobber-connected?error=${encodeURIComponent(err?.message || 'unknown')}`,
        url.origin,
      ),
    );
  }
}
