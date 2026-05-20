import { getJobberMetrics } from '../../_lib/jobberClient';
import styles from './JobberDashboard.module.css';
import JobberCalendar from './JobberCalendar';

/**
 * Live Jobber dashboard widget — renders when JOBBER_REFRESH_TOKEN is set.
 * Pulls today/week stats + upcoming visits + revenue in one parallel
 * GraphQL burst.
 *
 * If the token is somehow rejected (revoked, scopes changed, etc.), the
 * fetcher returns zero values + an `error` field; the UI shows a banner
 * inviting Tiago to re-connect.
 */
export default async function JobberDashboard() {
  const m = await getJobberMetrics();

  // If the token couldn't be obtained at all, the queries returned null.
  // That's almost always a "refresh_token revoked / expired" situation —
  // show a dedicated reconnect panel.
  const tokenBroken = m.errorDetail?.includes('token: access token could not be obtained');
  if (tokenBroken) {
    return (
      <div className={styles.errorPanel}>
        <div className={styles.errorTitle}>Jobber token isn&apos;t working</div>
        <p className={styles.errorBody}>
          Your refresh token may have been revoked, or the Jobber app scopes
          changed. Reconnect to fix it.
        </p>
        <a href="/api/jobber/connect" className={styles.reconnectBtn}>
          Reconnect Jobber →
        </a>
      </div>
    );
  }

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n);

  const fmtTime = (iso: string | null) => {
    if (!iso) return 'Time TBD';
    const d = new Date(iso);
    const dayLabel =
      d.toDateString() === new Date().toDateString()
        ? 'Today'
        : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeLabel = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `${dayLabel} · ${timeLabel}`;
  };

  return (
    <div className={styles.wrap}>
      {/* CONNECTION CONFIRMATION BANNER */}
      <div className={styles.statusBar}>
        <span className={styles.statusDot} />
        <span className={styles.statusText}>
          <strong>Connected to Jobber</strong> · live data refreshed on every visit
        </span>
      </div>

      {/* GRAPHQL ERROR DETAIL — only shows when one or more queries returned
          errors, even though we got an access token. Surfaces the actual
          Jobber message so we can tweak the query shapes. */}
      {m.errorDetail && !tokenBroken && (
        <div className={styles.errorPanel}>
          <div className={styles.errorTitle}>Some Jobber queries returned errors</div>
          <p className={styles.errorBody}>
            The connection is working but Jobber rejected one or more queries.
            Stats below may show partial / zero values. The exact errors:
          </p>
          <pre style={{
            background: '#fff',
            border: '1px solid #fde68a',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 11,
            color: '#92400e',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}>
            {m.errorDetail}
          </pre>
        </div>
      )}

      {/* TOP STAT ROW */}
      <div className={styles.statRow}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Jobs · today</div>
          <div className={styles.statValue}>
            {m.jobsToday > 0 ? m.jobsToday : <em className={styles.dim}>—</em>}
          </div>
          <div className={styles.statSub}>
            {m.jobsToday === 0
              ? 'No jobs scheduled today'
              : m.jobsToday === 1
              ? '1 visit on the calendar'
              : `${m.jobsToday} visits on the calendar`}
          </div>
        </div>

        <div className={styles.stat}>
          <div className={styles.statLabel}>Jobs · next 14 days</div>
          <div className={styles.statValue}>{m.jobsThisWeek}</div>
          <div className={styles.statSub}>Scheduled visits ahead</div>
        </div>

        <div className={styles.stat}>
          <div className={styles.statLabel}>Revenue · this week</div>
          <div className={styles.statValue}>{fmtMoney(m.thisWeekRevenue)}</div>
          <div className={styles.statSub}>Invoices paid in current week</div>
        </div>

        <div className={styles.stat}>
          <div className={styles.statLabel}>Active clients</div>
          <div className={styles.statValue}>{m.activeClientCount}</div>
          <div className={styles.statSub}>Not archived in Jobber</div>
        </div>

        <div className={`${styles.stat} ${m.pendingInvoiceCount > 0 ? styles.statAlert : ''}`}>
          <div className={styles.statLabel}>Awaiting payment</div>
          <div className={styles.statValue}>{fmtMoney(m.pendingInvoiceTotal)}</div>
          <div className={styles.statSub}>
            {m.pendingInvoiceCount === 0
              ? 'No open invoices'
              : `${m.pendingInvoiceCount} invoice${m.pendingInvoiceCount === 1 ? '' : 's'} unpaid`}
          </div>
        </div>
      </div>

      {/* CALENDAR VIEW — month grid with clickable day cells.
          Client component (interactive); data passed in from server. */}
      <JobberCalendar allVisits={m.allVisits} />

      {/* COMPACT UPCOMING LIST (next 14 days, flat list — complements the
          calendar view above which is a calendar visualization). */}
      <div className={styles.upcomingBlock}>
        <div className={styles.upcomingHeader}>
          <div>
            <div className={styles.upcomingEyebrow}>NEXT TWO WEEKS</div>
            <div className={styles.upcomingTitle}>Upcoming visits</div>
          </div>
          <a
            href="https://secure.getjobber.com/work_orders"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.openInJobber}
          >
            Open in Jobber →
          </a>
        </div>

        {m.upcomingJobs.length === 0 ? (
          <div className={styles.empty}>
            No visits scheduled in the next 14 days. Once a job is on your
            Jobber calendar it&apos;ll appear here.
          </div>
        ) : (
          <div className={styles.upcomingList}>
            {m.upcomingJobs.map((j) => (
              <div key={j.id} className={styles.visit}>
                <div className={styles.visitLeft}>
                  <div className={styles.visitClient}>{j.clientName}</div>
                  <div className={styles.visitTitle}>{j.title}</div>
                  {j.address && <div className={styles.visitAddr}>{j.address}</div>}
                </div>
                <div className={styles.visitTime}>{fmtTime(j.startAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
