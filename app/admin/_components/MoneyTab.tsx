import type { JobberMoney } from '../../_lib/jobberClient';
import styles from './MoneyTab.module.css';

/**
 * Money tab — "who owes me, how much, how late, and am I growing?"
 *
 * Server component: receives already-fetched JobberMoney from the admin
 * page so there's no client-side fetch waterfall. Renders entirely from
 * that payload and degrades to a readable error state when Jobber isn't
 * connected (rather than showing misleading zeros).
 *
 * The weekly/monthly bar charts are hand-rolled CSS — deliberately. They're
 * simple magnitude comparisons and don't justify pulling a charting library
 * into the bundle. The richer analytical charts live in the Insights tab
 * where Recharts earns its weight.
 */

function money(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function pctDelta(current: number, previous: number): { text: string; cls: string } {
  if (previous === 0) {
    return current > 0
      ? { text: 'new', cls: styles.deltaUp }
      : { text: '—', cls: styles.deltaFlat };
  }
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 1) return { text: 'flat', cls: styles.deltaFlat };
  const arrow = pct > 0 ? '▲' : '▼';
  const cls = pct > 0 ? styles.deltaUp : styles.deltaDown;
  return { text: `${arrow} ${Math.abs(pct).toFixed(0)}%`, cls };
}

/** Age bucket styling — makes the worst offenders impossible to miss. */
function ageBadge(days: number | null): { label: string; cls: string } {
  if (days === null) return { label: 'no due date', cls: styles.ageCurrent };
  if (days <= 0) return { label: `due in ${Math.abs(days)}d`, cls: styles.ageCurrent };
  if (days <= 7) return { label: `${days}d late`, cls: styles.ageSoon };
  if (days <= 30) return { label: `${days}d late`, cls: styles.ageLate };
  return { label: `${days}d late`, cls: styles.ageVeryLate };
}

function BarChart({
  title,
  buckets,
}: {
  title: string;
  buckets: { key: string; label: string; amount: number }[];
}) {
  const max = Math.max(...buckets.map((b) => b.amount), 1);
  return (
    <div className={styles.barChart}>
      <div className={styles.kpiLabel} style={{ marginBottom: 14 }}>{title}</div>
      <div className={styles.barRow}>
        {buckets.map((b) => (
          <div key={b.key} className={styles.barCol} title={`${b.label}: ${money(b.amount)}`}>
            <span className={styles.barValue}>
              {b.amount > 0 ? `${Math.round(b.amount / 100) / 10}k` : ''}
            </span>
            <div
              className={styles.bar}
              style={{ height: `${Math.max(2, (b.amount / max) * 100)}%` }}
            />
            <span className={styles.barLabel}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MoneyTab({ money: m }: { money: JobberMoney }) {
  // Not connected / hard failure — say so plainly instead of rendering zeros
  // that look like "you have no money".
  if (m.errorDetail && m.invoiceCount === 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.error}>
          <div className={styles.errorTitle}>Can&apos;t load invoices from Jobber</div>
          {m.errorDetail}
        </div>
        <div className={styles.empty}>
          Once Jobber is connected, this tab shows outstanding invoices ranked by how
          late they are, what you collected this week/month/quarter versus the period
          before, your revenue trend, and your top clients by lifetime value.
        </div>
      </div>
    );
  }

  const weekDelta = pctDelta(m.paidThisWeek, m.paidLastWeek);
  const monthDelta = pctDelta(m.paidThisMonth, m.paidLastMonth);

  return (
    <div className={styles.wrap}>
      {/* Soft error (partial data) — show the data AND the warning */}
      {m.errorDetail && (
        <div className={styles.error}>
          <div className={styles.errorTitle}>Heads up</div>
          {m.errorDetail}
        </div>
      )}

      {/* ---- KPI ROW ---- */}
      <div className={styles.kpiRow}>
        <div className={`${styles.kpi} ${m.overdueTotal > 0 ? styles.kpiAlert : ''}`}>
          <div className={styles.kpiLabel}>Outstanding</div>
          <div className={`${styles.kpiValue} ${m.overdueTotal > 0 ? styles.kpiValueAlert : ''}`}>
            {money(m.outstandingTotal)}
          </div>
          <div className={styles.kpiSub}>
            {m.outstanding.length} unpaid
            {m.overdueCount > 0 && ` · ${m.overdueCount} past due (${money(m.overdueTotal)})`}
          </div>
        </div>

        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Collected this week</div>
          <div className={styles.kpiValue}>{money(m.paidThisWeek)}</div>
          <div className={`${styles.delta} ${weekDelta.cls}`}>
            {weekDelta.text} <span style={{ color: '#9ca3af', fontWeight: 400 }}>vs last week</span>
          </div>
        </div>

        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Collected this month</div>
          <div className={styles.kpiValue}>{money(m.paidThisMonth)}</div>
          <div className={`${styles.delta} ${monthDelta.cls}`}>
            {monthDelta.text} <span style={{ color: '#9ca3af', fontWeight: 400 }}>vs last month</span>
          </div>
        </div>

        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Average invoice</div>
          <div className={styles.kpiValue}>{money(m.averageInvoice)}</div>
          <div className={styles.kpiSub}>
            across {m.invoiceCount} invoice{m.invoiceCount === 1 ? '' : 's'}
            {m.paidThisQuarter > 0 && ` · ${money(m.paidThisQuarter)} this quarter`}
          </div>
        </div>
      </div>

      {/* ---- OUTSTANDING ---- */}
      <p className={styles.sectionLabel}>
        Outstanding · most overdue first
      </p>
      {m.outstanding.length === 0 ? (
        <div className={styles.empty}>
          Nothing outstanding — every invoice is paid. 🎉
        </div>
      ) : (
        <div className={styles.invoiceList}>
          {m.outstanding.slice(0, 15).map((inv) => {
            const badge = ageBadge(inv.daysOverdue);
            const isLate = (inv.daysOverdue ?? 0) > 0;
            return (
              <div
                key={inv.id}
                className={`${styles.invoiceRow} ${isLate ? styles.invoiceRowOverdue : ''}`}
              >
                <div>
                  <div className={styles.invoiceClient}>{inv.clientName}</div>
                  <div className={styles.invoiceMeta}>
                    {inv.invoiceNumber ? `Invoice #${inv.invoiceNumber}` : 'Invoice'}
                    {inv.issuedDate &&
                      ` · issued ${new Date(inv.issuedDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}`}
                    {inv.paid > 0 && inv.paid < inv.total && ` · ${money(inv.paid)} paid so far`}
                  </div>
                </div>
                <div className={`${styles.agePill} ${badge.cls}`}>{badge.label}</div>
                <div className={styles.invoiceAmount}>{money(inv.balance)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- TRENDS + TOP CLIENTS ---- */}
      <p className={styles.sectionLabel}>Revenue trend</p>
      <div className={styles.twoCol}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <BarChart title="Collected — last 8 weeks" buckets={m.weeklyRevenue} />
          <BarChart title="Collected — last 12 months" buckets={m.monthlyRevenue} />
        </div>

        <div>
          <div className={styles.kpiLabel} style={{ marginBottom: 12 }}>
            Top clients by invoiced value
          </div>
          {m.topClients.length === 0 ? (
            <div className={styles.empty}>No client revenue data yet.</div>
          ) : (
            <div className={styles.clientList}>
              {m.topClients.map((c, i) => (
                <div key={c.name} className={styles.clientRow}>
                  <span className={styles.clientRank}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={styles.clientName}>
                    {c.name}{' '}
                    <span className={styles.clientJobs}>
                      · {c.invoiceCount} invoice{c.invoiceCount === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className={styles.clientTotal}>{money(c.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---- DIAGNOSTICS ----
          Same pattern as the Schedule tab's visitDebug: if Jobber returns
          a shape we didn't expect, show it rather than silently rendering
          zeros. Only appears when something actually looks off. */}
      {m.fieldDebug && m.fieldDebug.rawNodeCount === 0 && (
        <>
          <p className={styles.sectionLabel}>Diagnostics</p>
          <div className={styles.debug}>
            {`Jobber returned 0 invoice nodes.
totalCount reported: ${m.invoiceCount}
invoice keys seen:   ${m.fieldDebug.sampleKeys.join(', ') || '(none)'}
amount keys seen:    ${m.fieldDebug.sampleAmountKeys.join(', ') || '(none)'}
statuses:            ${JSON.stringify(m.fieldDebug.statusCounts)}`}
          </div>
        </>
      )}
    </div>
  );
}
