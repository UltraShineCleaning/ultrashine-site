'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import styles from './AdminShell.module.css';

/**
 * AdminShell — client wrapper that renders a left-sidebar nav + the
 * currently-active tab's content. Each tab's CONTENT is server-rendered
 * upstream in /admin/page.tsx and passed in as a React node prop, which
 * means async server data (Resend leads, Jobber GraphQL) is still fetched
 * at request time — we just defer DISPLAYING the unused tabs until the
 * user clicks them.
 *
 * Tab state is synced with the URL hash (#overview, #jobber, etc.) so:
 *   - Refresh stays on the same tab
 *   - Tabs can be deep-linked + bookmarked
 *   - Browser back/forward switches tabs without full page reload
 *
 * Sidebar collapses to a horizontal scrollable top-bar under 900px.
 */

type TabId = 'overview' | 'jobber' | 'leads' | 'reviews' | 'social';

type Tab = {
  id: TabId;
  label: string;
  /** Single-character glyph used in the sidebar tile */
  glyph: string;
  /** Short description shown under the active tab title */
  description: string;
};

const TABS: Tab[] = [
  {
    id: 'overview',
    label: 'Overview',
    glyph: '✦',
    description: 'Live snapshot of leads, applications, and quick actions',
  },
  {
    id: 'jobber',
    label: 'Jobber',
    glyph: '⚙',
    description: 'Today\'s jobs, weekly revenue, upcoming visits — pulled live from Jobber',
  },
  {
    id: 'leads',
    label: 'Leads',
    glyph: '✉',
    description: 'Every inbound quote request + cleaner application',
  },
  {
    id: 'reviews',
    label: 'Reviews',
    glyph: '★',
    description: 'Send review-request emails + see Google + HomeAdvisor ratings',
  },
  {
    id: 'social',
    label: 'Social Analytics',
    glyph: '◐',
    description: 'Instagram + Facebook performance per post (coming soon)',
  },
];

function isTabId(v: string): v is TabId {
  return TABS.some((t) => t.id === v);
}

export default function AdminShell({
  overview,
  jobber,
  leads,
  reviews,
  social,
}: {
  overview: ReactNode;
  jobber: ReactNode;
  leads: ReactNode;
  reviews: ReactNode;
  social: ReactNode;
}) {
  const [active, setActive] = useState<TabId>('overview');

  // On mount + on hashchange — read tab from URL hash
  useEffect(() => {
    const readHash = () => {
      const h = window.location.hash.replace('#', '');
      if (isTabId(h)) setActive(h);
    };
    readHash();
    window.addEventListener('hashchange', readHash);
    return () => window.removeEventListener('hashchange', readHash);
  }, []);

  const selectTab = (id: TabId) => {
    setActive(id);
    // Update URL without a full reload — keeps the back button working
    if (window.location.hash !== `#${id}`) {
      window.history.pushState(null, '', `#${id}`);
    }
  };

  const activeMeta = TABS.find((t) => t.id === active) ?? TABS[0];

  const panels: Record<TabId, ReactNode> = {
    overview,
    jobber,
    leads,
    reviews,
    social,
  };

  return (
    <div className={styles.shell}>
      {/* ===== SIDEBAR ===== */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>✦</div>
          <div className={styles.brandText}>
            <strong>Ultra Shine</strong>
            <span>Dashboard</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              className={`${styles.navItem} ${active === tab.id ? styles.navItemActive : ''}`}
            >
              <span className={styles.navGlyph}>{tab.glyph}</span>
              <span className={styles.navLabel}>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFoot}>
          <Link href="/" className={styles.footLink}>View site →</Link>
          <form action="/api/admin/logout" method="post" className={styles.signOutForm}>
            <button type="submit" className={styles.footLink}>Sign out</button>
          </form>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className={styles.main}>
        {/* Active-tab header */}
        <header className={styles.pageHeader}>
          <p className={styles.pageEyebrow}>{activeMeta.label.toUpperCase()}</p>
          <h1 className={styles.pageTitle}>
            {active === 'overview'
              ? <>Welcome back, <em>Tiago</em>.</>
              : activeMeta.label}
          </h1>
          <p className={styles.pageSub}>{activeMeta.description}</p>
        </header>

        {/* Active tab panel. We render ALL panels but hide non-active ones
            with display:none so server-fetched data isn't thrown away on
            tab switch — they're already in the DOM, just not visible. */}
        {(Object.keys(panels) as TabId[]).map((id) => (
          <div
            key={id}
            className={styles.panel}
            style={{ display: active === id ? 'block' : 'none' }}
            aria-hidden={active !== id}
          >
            {panels[id]}
          </div>
        ))}
      </main>
    </div>
  );
}
