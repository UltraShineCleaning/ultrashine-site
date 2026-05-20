import styles from './JobberStatusCard.module.css';
import JobberDashboard from './JobberDashboard';

/**
 * Server-rendered card showing Jobber connection status on /admin.
 *
 * - If no JOBBER_CLIENT_ID set: shows "not configured" hint
 * - If client ID set but no refresh_token: shows big "Connect Jobber" button
 * - If both set: renders the live <JobberDashboard /> with today/week
 *   jobs, revenue, active clients, pending invoices, and the next 14
 *   days of upcoming visits — pulled fresh from Jobber on every page load
 */
export default function JobberStatusCard({ force = false }: { force?: boolean } = {}) {
  const hasCredentials = !!process.env.JOBBER_CLIENT_ID;
  const hasRefreshToken = !!process.env.JOBBER_REFRESH_TOKEN;

  // Step 1 — credentials missing entirely
  if (!hasCredentials) {
    return (
      <div className={`${styles.card} ${styles.cardSetup}`}>
        <div className={styles.cardHeader}>
          <div className={`${styles.cardIcon} ${styles.iconNeutral}`}>○</div>
          <div>
            <div className={styles.cardLabel}>JOBBER · NOT CONFIGURED</div>
            <div className={styles.cardTitle}>Add Jobber API credentials</div>
          </div>
        </div>
        <p className={styles.cardBody}>
          The <code className={styles.inline}>JOBBER_CLIENT_ID</code> +{' '}
          <code className={styles.inline}>JOBBER_CLIENT_SECRET</code> env vars
          aren&apos;t set on Vercel yet. Add them in your Vercel project
          settings, redeploy, then come back here.
        </p>
      </div>
    );
  }

  // Step 2 — credentials there but no refresh_token (needs OAuth)
  if (!hasRefreshToken) {
    return (
      <div className={`${styles.card} ${styles.cardConnect}`}>
        <div className={styles.cardHeader}>
          <div className={`${styles.cardIcon} ${styles.iconPending}`}>!</div>
          <div>
            <div className={styles.cardLabel}>JOBBER · AUTHORIZE</div>
            <div className={styles.cardTitle}>One click to connect your Jobber account</div>
          </div>
        </div>
        <p className={styles.cardBody}>
          Click below to authorize Ultra Shine Dashboard to read your Jobber
          data. You&apos;ll see a Jobber screen asking you to approve — accept it,
          and we&apos;ll bring you back here with your refresh token to save.
        </p>
        <a href="/api/jobber/connect" className={styles.connectBtn}>
          ✦ Connect Jobber →
        </a>
      </div>
    );
  }

  // Step 3 — fully connected. Hand off to the live data dashboard
  // (server-renders Jobber GraphQL data on every page load).
  return <JobberDashboard force={force} />;
}
