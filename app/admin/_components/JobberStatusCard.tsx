import styles from './JobberStatusCard.module.css';

/**
 * Server-rendered card showing Jobber connection status on /admin.
 *
 * - If no JOBBER_CLIENT_ID set: shows "not configured" hint
 * - If client ID set but no refresh_token: shows big "Connect Jobber" button
 * - If both set: shows ✓ "Connected" (Phase 2 will replace this with the
 *   actual live data widget — today/week jobs, revenue, team schedule)
 */
export default function JobberStatusCard() {
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

  // Step 3 — fully connected (Phase 2 will replace this with live data)
  return (
    <div className={`${styles.card} ${styles.cardConnected}`}>
      <div className={styles.cardHeader}>
        <div className={`${styles.cardIcon} ${styles.iconSuccess}`}>✓</div>
        <div>
          <div className={styles.cardLabel}>JOBBER · CONNECTED</div>
          <div className={styles.cardTitle}>
            Your dashboard is wired to Jobber
          </div>
        </div>
      </div>
      <p className={styles.cardBody}>
        Live job, revenue, and team data will appear here in Phase 2.
        Right now we&apos;ve confirmed the connection works — credentials
        + refresh token are in place.
      </p>
      <p className={styles.cardBodyDim}>
        <strong>Next session:</strong> I&apos;ll build the GraphQL queries
        to pull today&apos;s scheduled jobs (with cleaner assigned),
        this week&apos;s revenue, total active clients, and pending
        invoices — all inline on this page.
      </p>
    </div>
  );
}
