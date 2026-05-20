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

    // Persist the fresh refresh token straight to Vercel KV so subsequent
    // dashboard loads don't need the user to copy/paste anything to env
    // vars. If KV isn't configured yet we still show the token on the
    // success page so Tiago can paste it manually as a fallback.
    let persisted = false;
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    if (kvUrl && kvToken) {
      try {
        const kvRes = await fetch(`${kvUrl}/set/${encodeURIComponent('jobber:refresh_token')}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${kvToken}`,
            'Content-Type': 'text/plain',
          },
          body: tokens.refresh_token,
        });
        persisted = kvRes.ok;
        if (persisted) {
          await fetch(`${kvUrl}/set/${encodeURIComponent('jobber:last_refresh_at')}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${kvToken}`,
              'Content-Type': 'text/plain',
            },
            body: String(Date.now()),
          });
        }
      } catch (err) {
        console.error('[jobber/callback] KV write failed:', err);
      }
    }

    // Redirect to success page. When KV persisted the token, we don't
    // expose the token in the URL (no manual copy needed). When KV
    // wasn't configured, we still show the token for fallback copy/paste.
    const successUrl = new URL('/jobber-connected', url.origin);
    if (!persisted) {
      successUrl.searchParams.set('refresh_token', tokens.refresh_token);
      successUrl.searchParams.set('expires_in', String(tokens.expires_in ?? 3600));
    } else {
      successUrl.searchParams.set('auto_saved', '1');
    }
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
