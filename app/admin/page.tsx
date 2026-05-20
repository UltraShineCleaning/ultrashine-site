import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Resend } from 'resend';
import styles from './page.module.css';
import SendReviewRequestCard from './_components/SendReviewRequestCard';
import JobberStatusCard from './_components/JobberStatusCard';
import AdminShell from './_components/AdminShell';

export const metadata: Metadata = {
  title: 'Dashboard · Ultra Shine Cleaning',
  robots: { index: false, follow: false },
};

// Re-fetch every request — we want live data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COOKIE_NAME = 'us_admin';
const VERCEL_PROJECT = 'https://vercel.com/contact-8079s-projects/ultrashine-site';

type LeadKind = 'quote' | 'application' | 'other';

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

export default async function AdminDashboard() {
  // Cookie gate
  const cookie = cookies().get(COOKIE_NAME)?.value;
  const password = process.env.ADMIN_PASSWORD;
  if (!password || cookie !== password) redirect('/admin/login');

  // Live data from Resend
  const { leads, error } = await fetchLeads();

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
          {lead.kind === 'quote' ? '✦ QUOTE REQUEST' : '✦ CLEANER APPLICATION'}
        </div>
        <div className={styles.leadName}>
          {lead.name}
          {lead.city && (
            <span style={{ color: '#6b7280', fontWeight: 400, fontStyle: 'italic', marginLeft: 8, fontSize: 13 }}>
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

      <p className={styles.sectionLabel}>
        Analytics + performance ·{' '}
        <span style={{ opacity: 0.6, fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>
          these open in their own dashboards
        </span>
      </p>
      <div className={styles.tilesGrid}>
        <a href={`${VERCEL_PROJECT}/analytics`} target="_blank" rel="noopener noreferrer" className={styles.tile}>
          <div className={styles.tileIcon}>✦</div>
          <div className={styles.tileLabel}>VERCEL · LIVE</div>
          <div className={styles.tileTitle}>Site Analytics</div>
          <div className={styles.tileBody}>
            Page views, top pages, traffic sources, country + device breakdown.
          </div>
          <div className={styles.tileLink}>Open Vercel Analytics</div>
        </a>

        <a href={`${VERCEL_PROJECT}/speed-insights`} target="_blank" rel="noopener noreferrer" className={styles.tile}>
          <div className={styles.tileIcon}>✦</div>
          <div className={styles.tileLabel}>VERCEL · LIVE</div>
          <div className={styles.tileTitle}>Page Speed</div>
          <div className={styles.tileBody}>
            How fast every page loads. Core Web Vitals scored by Google.
          </div>
          <div className={styles.tileLink}>Open Speed Insights</div>
        </a>

        <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className={styles.tile}>
          <div className={styles.tileIcon}>✦</div>
          <div className={styles.tileLabel}>GOOGLE · ~24-HR DELAY</div>
          <div className={styles.tileTitle}>Search Performance</div>
          <div className={styles.tileBody}>
            What people search to find you on Google. Impressions, clicks, average position.
          </div>
          <div className={styles.tileLink}>Open Search Console</div>
        </a>

        <a href="https://resend.com/emails" target="_blank" rel="noopener noreferrer" className={styles.tile}>
          <div className={styles.tileIcon}>✦</div>
          <div className={styles.tileLabel}>RESEND · LIVE</div>
          <div className={styles.tileTitle}>All Email Activity</div>
          <div className={styles.tileBody}>
            Full email history beyond what&apos;s shown here.
          </div>
          <div className={styles.tileLink}>Open Resend</div>
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

  const jobberPanel = <JobberStatusCard />;

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
          <div className={styles.statLabel}>Google · 18 reviews</div>
          <div className={styles.statValue}>5.0 ★</div>
          <div className={styles.statSub}>
            <a href="https://search.google.com/local/reviews" target="_blank" rel="noopener noreferrer" style={{ color: '#374151', fontWeight: 600 }}>
              Manage on Google →
            </a>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>HomeAdvisor · 25 reviews</div>
          <div className={styles.statValue}>4.9 ★</div>
          <div className={styles.statSub}>
            <a href="https://www.homeadvisor.com/rated.UltraShineCleaning.68124585.html" target="_blank" rel="noopener noreferrer" style={{ color: '#374151', fontWeight: 600 }}>
              Open profile →
            </a>
          </div>
        </div>
      </div>

      <SendReviewRequestCard />

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

  const socialPanel = (
    <div className={styles.emptyState} style={{ padding: 36, textAlign: 'left' }}>
      <h2 style={{ fontFamily: 'var(--font-poppins), sans-serif', fontWeight: 700, fontSize: 22, color: '#111827', marginBottom: 12 }}>
        Social analytics — coming next
      </h2>
      <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 18, maxWidth: 640 }}>
        We&apos;ll wire this tab up to your Instagram + Facebook accounts so you can see per-post performance, follower growth, engagement rate, and what content is driving DMs / quote requests — all without leaving your dashboard.
      </p>
      <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 14 }}>
        <strong>What we&apos;ll show here:</strong>
      </p>
      <ul style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.8, paddingLeft: 20, marginBottom: 22, maxWidth: 640 }}>
        <li>Follower growth graph (7/30/90-day)</li>
        <li>Per-post reach, likes, comments, saves, shares</li>
        <li>Top-performing posts ranked by engagement</li>
        <li>Stories views + completion rate</li>
        <li>Profile visits → website clicks → quote-form submits funnel</li>
        <li>Best time of day / day of week to post (from your actual data)</li>
      </ul>
      <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 14 }}>
        <strong>What I need from you to build it:</strong>
      </p>
      <ul style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.8, paddingLeft: 20, maxWidth: 640 }}>
        <li>Confirm which platforms — Instagram, Facebook, both, plus TikTok / LinkedIn?</li>
        <li>I&apos;ll set up Meta Graph API access (similar OAuth flow to Jobber)</li>
        <li>For each platform, I&apos;ll need you to do a one-time connect (click a button, approve scopes)</li>
      </ul>
      <a href="https://business.facebook.com/insights" target="_blank" rel="noopener noreferrer" className={styles.quickAction} style={{ marginTop: 18, display: 'inline-flex' }}>
        ◐ Open Meta Business Suite →
      </a>
    </div>
  );

  return (
    <AdminShell
      overview={overviewPanel}
      jobber={jobberPanel}
      leads={leadsPanel}
      reviews={reviewsPanel}
      social={socialPanel}
    />
  );
}
