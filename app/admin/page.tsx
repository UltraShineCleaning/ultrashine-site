import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Dashboard · Ultra Shine Cleaning',
  robots: { index: false, follow: false }, // never index this page
};

const COOKIE_NAME = 'us_admin';

/**
 * Vercel project URL — used to deep-link to Analytics/Speed/Logs.
 * Vercel personalizes URLs per team, so this constant should be edited
 * once after your first deploy if it changes.
 */
const VERCEL_PROJECT = 'https://vercel.com/contact-8079s-projects/ultrashine-site';

export default function AdminDashboard() {
  // Cookie gate — if missing or wrong, redirect to login
  const cookie = cookies().get(COOKIE_NAME)?.value;
  const password = process.env.ADMIN_PASSWORD;
  if (!password || cookie !== password) {
    redirect('/admin/login');
  }

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
          <p className={styles.heroEyebrow}>YOUR BUSINESS · ALL IN ONE PLACE</p>
          <h1 className={styles.heroTitle}>
            Welcome back, <em>Tiago</em>.
          </h1>
          <p className={styles.heroSub}>
            Every stat for the site lives here. Click any tile to open
            the full report in a new tab. Updated in real-time by Vercel
            + Google.
          </p>
        </div>

        {/* TILES */}
        <p className={styles.sectionLabel}>Analytics + Performance</p>
        <div className={styles.tilesGrid}>

          <a href={`${VERCEL_PROJECT}/analytics`} target="_blank" rel="noopener noreferrer" className={styles.tile}>
            <div className={styles.tileIcon}>✦</div>
            <div className={styles.tileLabel}>VERCEL · LIVE</div>
            <div className={styles.tileTitle}>Site Analytics</div>
            <div className={styles.tileBody}>
              Page views, top pages, traffic sources (Google search,
              Instagram, direct), country + device breakdown.
              Refreshed every few minutes.
            </div>
            <div className={styles.tileLink}>Open Vercel Analytics</div>
          </a>

          <a href={`${VERCEL_PROJECT}/speed-insights`} target="_blank" rel="noopener noreferrer" className={styles.tile}>
            <div className={styles.tileIcon}>✦</div>
            <div className={styles.tileLabel}>VERCEL · LIVE</div>
            <div className={styles.tileTitle}>Page Speed</div>
            <div className={styles.tileBody}>
              How fast every page loads on real phones + computers.
              See Core Web Vitals (Google's official speed scores)
              and which pages might be slow on mobile.
            </div>
            <div className={styles.tileLink}>Open Speed Insights</div>
          </a>

          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className={styles.tile}>
            <div className={styles.tileIcon}>✦</div>
            <div className={styles.tileLabel}>GOOGLE · ~24-HOUR DELAY</div>
            <div className={styles.tileTitle}>Search Performance</div>
            <div className={styles.tileBody}>
              What people search to find you on Google. Total
              impressions, clicks, average position. Which city
              pages rank best for which queries.
            </div>
            <div className={styles.tileLink}>Open Search Console</div>
          </a>

          <a href="https://resend.com/emails" target="_blank" rel="noopener noreferrer" className={styles.tile}>
            <div className={styles.tileIcon}>✦</div>
            <div className={styles.tileLabel}>RESEND · LIVE</div>
            <div className={styles.tileTitle}>Email Activity</div>
            <div className={styles.tileBody}>
              Every quote request + cleaner application sent from
              the site. Status (delivered, bounced, spam), open
              rates, recipient info.
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
        </div>

        {/* HELP CARD */}
        <p className={styles.sectionLabel}>What each one tells you</p>
        <div className={styles.helpCard}>
          <div className={styles.helpTitle}>Site Analytics (Vercel)</div>
          <div className={styles.helpBody}>
            Use this to answer: "How many people visited my Boca Raton city page this week?" Look at Top Pages → /areas/boca-raton.
          </div>
        </div>
        <div className={styles.helpCard}>
          <div className={styles.helpTitle}>Search Performance (Google)</div>
          <div className={styles.helpBody}>
            Use this to answer: "Am I ranking for 'boca raton cleaning service'?" Look at Performance → Queries. Takes 1-2 weeks of data before useful.
          </div>
        </div>
        <div className={styles.helpCard}>
          <div className={styles.helpTitle}>Page Speed (Vercel)</div>
          <div className={styles.helpBody}>
            Use this to answer: "Is any page slow on mobile?" Look at LCP (Largest Contentful Paint) scores — green = fast, red = needs work.
          </div>
        </div>
        <div className={styles.helpCard}>
          <div className={styles.helpTitle}>Email Activity (Resend)</div>
          <div className={styles.helpBody}>
            Use this to answer: "Did Sandra's quote email actually deliver?" Search by recipient or date. Status will say Delivered / Bounced / Spam.
          </div>
        </div>

        <p className={styles.footNote}>
          ULTRA SHINE CLEANING · INTERNAL DASHBOARD · NOT INDEXED BY GOOGLE
        </p>
      </div>
    </main>
  );
}
