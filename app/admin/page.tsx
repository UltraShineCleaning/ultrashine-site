import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Resend } from 'resend';
import styles from './page.module.css';
import SendReviewRequestCard from './_components/SendReviewRequestCard';
import JobberStatusCard from './_components/JobberStatusCard';
import AdminShell from './_components/AdminShell';
import ClientsTab from './_components/ClientsTab';
import MoneyTab from './_components/MoneyTab';
import SocialTab from './_components/SocialTab';
import InsightsTab from './_components/InsightsTab';
import ReviewRequestsCard from './_components/ReviewRequestsCard';
import { getJobberClients, getJobberMoney, getRecentlyCompletedVisits } from '../_lib/jobberClient';
import { COUNT as GOOGLE_REVIEW_COUNT, RATING as GOOGLE_RATING } from '../_lib/google-reviews';
import { isAdmin } from '../_lib/adminAuth';

export const metadata: Metadata = {
  title: 'Dashboard · Ultra Shine Cleaning',
  robots: { index: false, follow: false },
};

// Re-fetch every request — we want live data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VERCEL_PROJECT = 'https://vercel.com/contact-8079s-projects/ultrashine-site';

type LeadKind = 'quote' | 'application' | 'social' | 'other';

type Lead = {
  id: string;
  kind: LeadKind;
  subject: string;
  /** Human display name extracted from subject — e.g. "Sandra P." */
  name: string;
  /** City extracted from subject when present */
  city?: string;
  createdAt: Date;
  to: string;
  /** Resend delivery status */
  lastEvent?: string;
};

function parseLead(email: any): Lead {
  const subject: string = email.subject ?? '';
  const createdAt = email.created_at ? new Date(email.created_at) : new Date();
  const to = Array.isArray(email.to) ? email.to[0] : email.to ?? '';

  // Subject format from our routes:
  //   "New Quote · {name} · {city}"
  //   "New Cleaner Application · {name} · {city}"
  let kind: LeadKind = 'other';
  let name = 'Unknown';
  let city: string | undefined;

  if (/^New Quote/i.test(subject)) {
    kind = 'quote';
    const parts = subject.replace(/^New Quote\s*·\s*/i, '').split(/\s*·\s*/);
    name = parts[0] || 'Unknown';
    city = parts[1];
  } else if (/^New lead on (Instagram|Facebook)/i.test(subject)) {
    // Sent by the Social automations (app/_lib/social/automations.ts → notifyLead)
    kind = 'social';
    const m = subject.match(/^New lead on (Instagram|Facebook)\s*·\s*(.*)$/i);
    name = m?.[2] || 'Someone';
    city = m?.[1];
  } else if (/^New Cleaner Application/i.test(subject)) {
    kind = 'application';
    const parts = subject.replace(/^New Cleaner Application\s*·\s*/i, '').split(/\s*·\s*/);
    name = parts[0] || 'Unknown';
    city = parts[1];
  }

  return {
    id: email.id,
    kind,
    subject,
    name,
    city,
    createdAt,
    to,
    lastEvent: email.last_event,
  };
}

function formatRelative(date: Date): string {
  const now = Date.now();
  const diff = Math.max(0, now - date.getTime());
  const min = Math.floor(diff / 60_000);
  const hr = Math.floor(diff / 3_600_000);
  const day = Math.floor(diff / 86_400_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function countInLastDays(leads: Lead[], days: number): number {
  const cutoff = Date.now() - days * 86_400_000;
  return leads.filter((l) => l.createdAt.getTime() >= cutoff).length;
}

async function fetchLeads(): Promise<{ leads: Lead[]; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { leads: [], error: 'RESEND_API_KEY not set in Vercel env' };

  try {
    const resend = new Resend(apiKey);
    const res: any = await resend.emails.list({ limit: 100 });

    if (res?.error) return { leads: [], error: res.error.message ?? 'Resend API error' };

    const data: any[] = res?.data?.data ?? res?.data ?? [];
    const leads = data.map(parseLead);
    return { leads };
  } catch (err: any) {
    return { leads: [], error: err?.message ?? 'Failed to fetch leads' };
  }
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams?: { t?: string; refresh?: string; social?: string };
}) {
  // Cookie gate
  if (!isAdmin()) redirect('/admin/login');

  // The "↻ Refresh now" button on the Jobber tab links to /admin?t=<timestamp>
  // — when that param is present we bypass the 60s/5min server cache and
  // pull truly-live data from Jobber. Same effect if ?refresh=1 is passed.
  const force = !!(searchParams?.t || searchParams?.refresh);

  // Live data from Resend + Jobber (clients + money) in parallel
  const [{ leads, error }, jobberClientsRes, moneyRes, recentVisits] = await Promise.all([
    fetchLeads(),
    getJobberClients({ force }),
    getJobberMoney({ force }),
    getRecentlyCompletedVisits(7).catch(() => ({ visits: [] })),
  ]);

  const quoteLeads = leads.filter((l) => l.kind === 'quote');
  const applicationLeads = leads.filter((l) => l.kind === 'application');

  const stats = {
    quotesToday: countInLastDays(quoteLeads, 1),
    quotesThisWeek: countInLastDays(quoteLeads, 7),
    quotesThisMonth: countInLastDays(quoteLeads, 30),
    applicationsThisWeek: countInLastDays(applicationLeads, 7),
    applicationsThisMonth: countInLastDays(applicationLeads, 30),
  };

  // Recent 8 leads for Overview tab
  const recent = [...leads]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .filter((l) => l.kind !== 'other')
    .slice(0, 8);

  // Full leads list for the Leads tab
  const allLeads = [...leads]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .filter((l) => l.kind !== 'other');

  // Reusable lead-card renderer (used by Overview + Leads tabs)
  const LeadCard = ({ lead }: { lead: Lead }) => (
    <div className={styles.leadCard}>
      <div className={styles.leadInfo}>
        <div className={styles.leadType}>
          {lead.kind === 'quote' ? '✦ QUOTE REQUEST' : lead.kind === 'social' ? `✦ ${(lead.city ?? 'SOCIAL').toUpperCase()} LEAD` : '✦ CLEANER APPLICATION'}
        </div>
        <div className={styles.leadName}>
          {lead.name}
          {lead.city && lead.kind !== 'social' && (
            <span style={{ color: '#8b8d98', fontWeight: 400, fontStyle: 'italic', marginLeft: 8, fontSize: 13 }}>
              · {lead.city}
            </span>
          )}
        </div>
        <div className={styles.leadMeta}>
          {formatRelative(lead.createdAt)}
          {' · '}
          <span
            className={`${styles.leadStatus} ${
              lead.lastEvent === 'delivered'
                ? styles.statusDelivered
                : lead.lastEvent === 'bounced'
                ? styles.statusBounced
                : styles.statusOther
            }`}
          >
            {lead.lastEvent ?? 'sent'}
          </span>
        </div>
      </div>
      <div className={styles.leadActions}>
        {lead.kind === 'social' && (
          <Link href="/admin#social" className={styles.actBtnReview} title="Open the conversation in Social → Inbox">
            ✉ Inbox →
          </Link>
        )}
        {lead.kind === 'quote' && (
          <Link
            href={`/admin#reviews`}
            className={styles.actBtnReview}
            title="Send this customer a review request"
          >
            ★ Review →
          </Link>
        )}
        <a
          href={`https://resend.com/emails/${lead.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.actBtn}
          title="Open in Resend"
        >
          ✉
        </a>
      </div>
    </div>
  );

  // ============================================================
  // TAB PANELS — each is server-rendered JSX passed to AdminShell
  // ============================================================

  const overviewPanel = (
    <>
      {error && (
        <div className={styles.errorState}>
          ⚠️ Couldn&apos;t load live data: {error}. Tile links below still work.
        </div>
      )}

      <p className={styles.sectionLabel}>Today · this week · this month</p>
      <div className={styles.statsRow}>
        <div className={`${styles.statCard} ${styles.statCardHi}`}>
          <div className={styles.statLabel}>Quotes · today</div>
          <div className={styles.statValue}>
            {stats.quotesToday > 0 ? stats.quotesToday : <em>—</em>}
          </div>
          <div className={styles.statSub}>
            {stats.quotesToday === 0 ? 'No new quotes yet today' : `${stats.quotesToday === 1 ? '1 lead' : `${stats.quotesToday} leads`} today`}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Quotes · 7 days</div>
          <div className={styles.statValue}>
            {stats.quotesThisWeek > 0 ? stats.quotesThisWeek : <em>—</em>}
          </div>
          <div className={styles.statSub}>
            {stats.quotesThisWeek === 0 ? 'No new quotes yet' : `${stats.quotesThisWeek === 1 ? '1 lead' : `${stats.quotesThisWeek} leads`} this week`}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Quotes · 30 days</div>
          <div className={styles.statValue}>
            {stats.quotesThisMonth > 0 ? stats.quotesThisMonth : <em>—</em>}
          </div>
          <div className={styles.statSub}>Quote requests this month</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Applicants · 7 days</div>
          <div className={styles.statValue}>
            {stats.applicationsThisWeek > 0 ? stats.applicationsThisWeek : <em>—</em>}
          </div>
          <div className={styles.statSub}>
            {stats.applicationsThisWeek === 0 ? 'No new applicants' : `${stats.applicationsThisWeek} this week`}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total · all time</div>
          <div className={styles.statValue}>
            <em>{quoteLeads.length + applicationLeads.length}</em>
          </div>
          <div className={styles.statSub}>
            {quoteLeads.length} quotes · {applicationLeads.length} applicants
          </div>
        </div>
      </div>

      <div className={styles.leadsWrap}>
        <p className={styles.sectionLabel}>Recent leads</p>
        {recent.length === 0 ? (
          <div className={styles.emptyState}>
            No leads yet. As soon as someone submits the quote form or cleaner application, they&apos;ll appear here.
          </div>
        ) : (
          <div className={styles.leadsList}>
            {recent.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
          </div>
        )}
      </div>

      <p className={styles.sectionLabel}>Analytics</p>
      <a href="#insights" className={styles.tile} style={{ display: 'block', marginBottom: 8, minHeight: 0 }}>
        <div className={styles.tileLabel}>INSIGHTS · ON THIS DASHBOARD</div>
        <div className={styles.tileTitle}>How the business is growing</div>
        <div className={styles.tileBody}>
          Website visitors, Google searches, Instagram + Facebook, revenue and reviews — all in the Insights tab, nothing opens in a new tab.
        </div>
        <div className={styles.tileLink}>Open Insights</div>
      </a>

      <p className={styles.sectionLabel}>Daily automation</p>
      <div style={{
        background: '#0d0e11',
        border: '1px solid #25262d',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginBottom: 8,
      }}>
        <span style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: '#34d399',
          boxShadow: '0 0 0 4px rgba(27, 127, 58, 0.15)',
          flexShrink: 0,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-poppins), sans-serif', fontWeight: 700, fontSize: 14, color: '#f4f4f5' }}>
            Morning digest: ON
          </div>
          <div style={{ fontFamily: 'var(--font-poppins), sans-serif', fontSize: 12, color: '#8b8d98', marginTop: 2 }}>
            Emailed every morning at 7am ET to contact@ultrashinecleaningfl.com — yesterday&apos;s leads, today&apos;s Jobber jobs, this week&apos;s revenue, unpaid invoices.
          </div>
        </div>
        <a
          href="/api/cron/daily-summary"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '8px 14px',
            borderRadius: 999,
            background: '#f4f4f5',
            color: '#0d0e11',
            textDecoration: 'none',
            fontFamily: 'var(--font-poppins), sans-serif',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}
        >
          Send test now →
        </a>
      </div>

      <p className={styles.sectionLabel}>Quick links</p>
      <div className={styles.quickActions}>
        <a href={VERCEL_PROJECT} target="_blank" rel="noopener noreferrer" className={styles.quickAction}>
          ⚡ Vercel project
        </a>
        <a href="https://github.com/UltraShineCleaning/ultrashine-site" target="_blank" rel="noopener noreferrer" className={styles.quickAction}>
          ⚙ GitHub repo
        </a>
        <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className={styles.quickAction}>
          ✉ Resend keys
        </a>
        <Link href="/quote" className={styles.quickAction}>
          ✦ Test quote form
        </Link>
        <Link href="/review-card" target="_blank" className={styles.quickAction}>
          🖨 Print review cards
        </Link>
      </div>
    </>
  );

  // The Jobber tab merged into Schedule (calendar focus) + Money (invoices).
  // JobberStatusCard renders the full live dashboard when connected, OR the
  // setup/reconnect flow when not — so we use it in BOTH the Schedule and
  // Home tabs in different contexts. Schedule wants the full thing
  // (calendar + upcoming list). Home wants compact stats only.
  const schedulePanel = <JobberStatusCard force={force} />;

  const clientsPanel = (
    <ClientsTab clients={jobberClientsRes.clients} error={jobberClientsRes.error} />
  );

  const moneyPanel = <MoneyTab money={moneyRes} />;

  const insightsPanel = <InsightsTab />;

  const leadsPanel = (
    <div className={styles.leadsWrap} style={{ marginTop: 0 }}>
      {allLeads.length === 0 ? (
        <div className={styles.emptyState}>
          No leads yet. As soon as someone submits the quote form or cleaner application, they&apos;ll appear here.
        </div>
      ) : (
        <>
          <p className={styles.sectionLabel}>
            {allLeads.length} {allLeads.length === 1 ? 'lead' : 'leads'} total ·{' '}
            <span style={{ opacity: 0.6, fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>
              click ✉ to open in Resend
            </span>
          </p>
          <div className={styles.leadsList}>
            {allLeads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
          </div>
        </>
      )}
    </div>
  );

  const reviewsPanel = (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Google · {GOOGLE_REVIEW_COUNT} reviews</div>
          <div className={styles.statValue}>{GOOGLE_RATING.toFixed(1)} ★</div>
          <div className={styles.statSub}>
            <a href="https://search.google.com/local/reviews" target="_blank" rel="noopener noreferrer" style={{ color: '#d4d4d8', fontWeight: 600 }}>
              Manage on Google →
            </a>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>HomeAdvisor · 25 reviews</div>
          <div className={styles.statValue}>4.9 ★</div>
          <div className={styles.statSub}>
            <a href="https://www.homeadvisor.com/rated.UltraShineCleaning.68124585.html" target="_blank" rel="noopener noreferrer" style={{ color: '#d4d4d8', fontWeight: 600 }}>
              Open profile →
            </a>
          </div>
        </div>
      </div>

      <SendReviewRequestCard />

      <ReviewRequestsCard />

      <p className={styles.sectionLabel} style={{ marginTop: 28 }}>Print materials</p>
      <div className={styles.quickActions}>
        <Link href="/review-card" target="_blank" className={styles.quickAction}>
          🖨 Print review cards
        </Link>
        <Link href="/leave-a-review" target="_blank" className={styles.quickAction}>
          ★ View leave-a-review page
        </Link>
      </div>
    </>
  );

  // Social tab — the dark Instagram/Facebook workspace. Recent finished jobs
  // feed its "From your jobs" card; ?social=… carries the result of the Meta
  // connect flow back as a toast.
  const socialPanel = (
    <SocialTab
      flash={searchParams?.social}
      recentJobs={recentVisits.visits
        .sort((a, b) => b.completedAt - a.completedAt)
        .map((v) => ({ title: v.title, city: v.city, completedAt: v.completedAt, clientName: v.clientName }))}
    />
  );

  return (
    <AdminShell
      overview={overviewPanel}
      schedule={schedulePanel}
      clients={clientsPanel}
      money={moneyPanel}
      leads={leadsPanel}
      reviews={reviewsPanel}
      social={socialPanel}
      insights={insightsPanel}
    />
  );
}
