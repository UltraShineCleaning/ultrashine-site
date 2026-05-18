import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Resend } from 'resend';
import styles from './page.module.css';
import SendReviewRequestCard from './_components/SendReviewRequestCard';

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

  // Most recent 8 leads across both types (newest first)
  const recent = [...leads]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .filter((l) => l.kind !== 'other')
    .slice(0, 8);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        {/* HEADER */}
        <header className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.brandMark}>✦</div>
            <div className={styles.brandText}>
              <strong>Ultra Shine</strong> Dashboard
            </div>
          </div>
          <div className={styles.headerRight}>
            <Link href="/" className={styles.headerLink}>View site →</Link>
            <form action="/api/admin/logout" method="post" style={{ display: 'inline' }}>
              <button type="submit" className={styles.headerLink} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}>
                Sign out
              </button>
            </form>
          </div>
        </header>

        {/* HERO */}
        <div className={styles.hero}>
          <p className={styles.heroEyebrow}>YOUR BUSINESS · LIVE DATA</p>
          <h1 className={styles.heroTitle}>
            Welcome back, <em>Tiago</em>.
          </h1>
          <p className={styles.heroSub}>
            Real-time view of inbound leads + applications. Refresh
            this page anytime to see the latest.
          </p>
        </div>

        {/* ERROR if Resend fails */}
        {error && (
          <div className={styles.errorState}>
            ⚠️ Couldn't load live data: {error}. Tile links below still work.
          </div>
        )}

        {/* STATS ROW */}
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

        {/* RECENT LEADS */}
        <div className={styles.leadsWrap}>
          <p className={styles.sectionLabel}>Recent leads</p>
          {recent.length === 0 ? (
            <div className={styles.emptyState}>
              No leads yet. As soon as someone submits the quote form or
              cleaner application, they'll appear here.
            </div>
          ) : (
            <div className={styles.leadsList}>
              {recent.map((lead) => (
                <div key={lead.id} className={styles.leadCard}>
                  <div className={styles.leadInfo}>
                    <div className={styles.leadType}>
                      {lead.kind === 'quote' ? '✦ QUOTE REQUEST' : '✦ CLEANER APPLICATION'}
                    </div>
                    <div className={styles.leadName}>
                      {lead.name}
                      {lead.city && (
                        <span style={{ color: 'var(--blush)', fontWeight: 300, fontStyle: 'italic', marginLeft: 8, fontSize: 14 }}>
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
                        href={`/admin?prefill_name=${encodeURIComponent(lead.name)}#review-request`}
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
              ))}
            </div>
          )}
        </div>

        {/* ===== REVIEW REQUEST SENDER =====
            One-click email to ask a customer for a Google review after
            their cleaning. The compounding lever on Tiago's "I can get
            reviews" intent — convert it into actual Google reviews.
            id="review-request" so per-lead "Send Review →" buttons scroll here. */}
        <p className={styles.sectionLabel} id="review-request">Reviews · ask a customer</p>
        <SendReviewRequestCard />

        {/* TILES — external tools */}
        <p className={styles.sectionLabel}>
          Analytics + performance ·{' '}
          <span style={{ opacity: 0.6, fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>
            these open in their own dashboards (their data lives behind Google + Vercel auth, can't be pulled inline yet)
          </span>
        </p>
        <div className={styles.tilesGrid}>
          <a href={`${VERCEL_PROJECT}/analytics`} target="_blank" rel="noopener noreferrer" className={styles.tile}>
            <div className={styles.tileIcon}>✦</div>
            <div className={styles.tileLabel}>VERCEL · LIVE</div>
            <div className={styles.tileTitle}>Site Analytics</div>
            <div className={styles.tileBody}>
              Page views, top pages, traffic sources (Google search,
              Instagram, direct), country + device breakdown.
            </div>
            <div className={styles.tileLink}>Open Vercel Analytics</div>
          </a>

          <a href={`${VERCEL_PROJECT}/speed-insights`} target="_blank" rel="noopener noreferrer" className={styles.tile}>
            <div className={styles.tileIcon}>✦</div>
            <div className={styles.tileLabel}>VERCEL · LIVE</div>
            <div className={styles.tileTitle}>Page Speed</div>
            <div className={styles.tileBody}>
              How fast every page loads on real phones + computers.
              Core Web Vitals scored by Google.
            </div>
            <div className={styles.tileLink}>Open Speed Insights</div>
          </a>

          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className={styles.tile}>
            <div className={styles.tileIcon}>✦</div>
            <div className={styles.tileLabel}>GOOGLE · ~24-HR DELAY</div>
            <div className={styles.tileTitle}>Search Performance</div>
            <div className={styles.tileBody}>
              What people search to find you on Google. Impressions,
              clicks, average position per query + page.
            </div>
            <div className={styles.tileLink}>Open Search Console</div>
          </a>

          <a href="https://resend.com/emails" target="_blank" rel="noopener noreferrer" className={styles.tile}>
            <div className={styles.tileIcon}>✦</div>
            <div className={styles.tileLabel}>RESEND · LIVE</div>
            <div className={styles.tileTitle}>All Email Activity</div>
            <div className={styles.tileBody}>
              Full email history beyond what's shown above. Search,
              filter, and view full email contents.
            </div>
            <div className={styles.tileLink}>Open Resend</div>
          </a>
        </div>

        {/* QUICK ACTIONS */}
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

        <p className={styles.footNote}>
          ULTRA SHINE CLEANING · INTERNAL DASHBOARD · DATA REFRESHED ON EVERY VISIT
        </p>
      </div>
    </main>
  );
}
