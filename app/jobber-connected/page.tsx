import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import CopyButton from './CopyButton';

/**
 * /jobber-connected — Server-rendered success page after the OAuth callback.
 *
 * Reads the refresh_token from the URL query and displays it in a
 * copyable code box with step-by-step instructions for adding it to
 * Vercel as JOBBER_REFRESH_TOKEN.
 *
 * Admin-only (cookie gated). Set to noindex so search engines never see it.
 *
 * Once Tiago saves the token to Vercel + redeploys, the integration is
 * fully wired and can pull live Jobber data on every /admin page load.
 */

const COOKIE_NAME = 'us_admin';

export const dynamic = 'force-dynamic';

export default function JobberConnectedPage({
  searchParams,
}: {
  searchParams: { refresh_token?: string; error?: string; expires_in?: string };
}) {
  // Admin gate
  const cookie = cookies().get(COOKIE_NAME)?.value;
  const password = process.env.ADMIN_PASSWORD;
  if (!password || cookie !== password) redirect('/admin/login');

  const error = searchParams.error;
  const refreshToken = searchParams.refresh_token;

  // Error state. The most common error is `state_mismatch` — happens when
  // the CSRF cookie expires (now 15min, was 5min) or the user landed here
  // via a stale bookmark/refresh. In that case we don't need a generic
  // "check your env vars" message; we need a clear "click to retry" path.
  if (error || !refreshToken) {
    const isStateError = error === 'state_mismatch' || error === 'missing_code_or_state';
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <div className={styles.iconError}>⚠️</div>
          <h1 className={styles.title}>
            {isStateError ? 'Jobber session expired' : 'Jobber connection failed'}
          </h1>
          <p className={styles.body}>
            {isStateError
              ? "Your OAuth session timed out before Jobber redirected you back. This usually happens if you took longer than 15 minutes on the approve screen, or if you arrived here via a stale browser tab."
              : error
              ? `Error: ${error.replace(/_/g, ' ')}`
              : 'No refresh token was returned by Jobber.'}
          </p>
          {!isStateError && (
            <p className={styles.bodyDim}>
              Check that the
              <code className={styles.inline}>JOBBER_CLIENT_ID</code> and
              <code className={styles.inline}>JOBBER_CLIENT_SECRET</code>
              env vars are set correctly on Vercel.
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
            <a href="/api/jobber/connect" className={styles.btnSecondary}>
              Try again →
            </a>
            <Link href="/admin" className={styles.btnSecondary} style={{ background: 'transparent' }}>
              ← Back to Admin
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Success state — show the refresh_token + setup instructions
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconSuccess}>✓</div>
        <h1 className={styles.title}>Jobber connected. One more step.</h1>
        <p className={styles.body}>
          We got your refresh token from Jobber. Save it as
          a Vercel environment variable and the integration goes live on
          your next deploy.
        </p>

        <div className={styles.tokenBox}>
          <div className={styles.tokenLabel}>Your refresh token</div>
          <code className={styles.tokenValue}>{refreshToken}</code>
          <CopyButton text={refreshToken} />
        </div>

        <div className={styles.steps}>
          <p className={styles.stepsTitle}>Save it to Vercel:</p>
          <ol className={styles.stepsList}>
            <li>
              Open{' '}
              <a
                href="https://vercel.com/contact-8079s-projects/ultrashine-site/settings/environment-variables"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                Vercel env vars settings
              </a>
            </li>
            <li>Click <strong>Add New</strong></li>
            <li>
              <strong>Key</strong>: <code className={styles.inline}>JOBBER_REFRESH_TOKEN</code>
            </li>
            <li>
              <strong>Value</strong>: paste the token from above
            </li>
            <li>
              <strong>Environments</strong>: check all 3 boxes (Production, Preview, Development)
            </li>
            <li>Click <strong>Save</strong></li>
            <li>
              Click <strong>Redeploy</strong> on your latest deployment
              (top right of the Vercel project page) — this loads the new env var
            </li>
            <li>
              Come back to <Link href="/admin" className={styles.link}>/admin</Link> — the
              Jobber widget will show your live data
            </li>
          </ol>
        </div>

        <div className={styles.warning}>
          <strong>⚠ Don&apos;t paste this token anywhere else.</strong>{' '}
          It grants ongoing access to your entire Jobber account. Vercel
          encrypts it. Anywhere else — including chat, email, screenshots —
          treat as compromised.
        </div>
      </div>
    </main>
  );
}
