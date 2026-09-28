'use client';

import { Fragment, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

type TabId =
  | 'overview' // a.k.a. "Home" in the UI — kept as 'overview' for URL-hash backward compat
  | 'schedule'
  | 'clients'
  | 'money'
  | 'leads'
  | 'reviews'
  | 'social'
  | 'insights';

type Tab = {
  id: TabId;
  label: string;
  /** Single-character glyph used in the sidebar tile */
  glyph: string;
  /** Short description shown under the active tab title */
  description: string;
  /** Sidebar section heading this tab sits under (none = top of the list). */
  group?: 'Run the business' | 'Grow';
};

const TABS: Tab[] = [
  {
    id: 'overview',
    label: 'Home',
    glyph: '✦',
    description: 'What needs you, today\'s jobs, the key numbers and the latest leads',
  },
  {
    id: 'schedule',
    group: 'Run the business',
    label: 'Schedule',
    glyph: '◷',
    description: 'Month-view calendar of every scheduled visit — pulled live from Jobber',
  },
  {
    id: 'clients',
    group: 'Run the business',
    label: 'Clients',
    glyph: '◉',
    description: 'Searchable directory of every active Jobber client + their details',
  },
  {
    id: 'money',
    group: 'Run the business',
    label: 'Money',
    glyph: '$',
    description: 'What came in, what\'s owed, and who to nudge — straight from Jobber',
  },
  {
    id: 'leads',
    group: 'Grow',
    label: 'Leads',
    glyph: '✉',
    description: 'Every quote request and message that could become a job — and where each one stands',
  },
  {
    id: 'reviews',
    group: 'Grow',
    label: 'Reviews',
    glyph: '★',
    description: 'Your rating, the automatic review requests, and the latest reviews to reply to',
  },
  {
    id: 'social',
    group: 'Grow',
    label: 'Social',
    glyph: '◈',
    description: 'Instagram + Facebook — plan, approve and auto-post; DM inbox + automations',
  },
  {
    id: 'insights',
    group: 'Grow',
    label: 'Insights',
    glyph: '◐',
    description: 'How people find us and how the business is growing — website, Google, Instagram + Facebook, money and reviews',
  },
];

function isTabId(v: string): v is TabId {
  return TABS.some((t) => t.id === v);
}

export default function AdminShell({
  overview,
  schedule,
  clients,
  money,
  leads,
  reviews,
  social,
  insights,
}: {
  overview: ReactNode;
  schedule: ReactNode;
  clients: ReactNode;
  money: ReactNode;
  leads: ReactNode;
  reviews: ReactNode;
  social: ReactNode;
  insights: ReactNode;
}) {
  const [active, setActive] = useState<TabId>('overview');
  // Little counters beside Money / Leads / Social / Reviews. The Home tab
  // computes them (it already reads every source) and announces them here.
  const [badges, setBadges] = useState<Partial<Record<TabId, number>>>({});
  useEffect(() => {
    const on = (e: Event) => setBadges((e as CustomEvent).detail ?? {});
    window.addEventListener('admin:badges', on);
    return () => window.removeEventListener('admin:badges', on);
  }, []);

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
    schedule,
    clients,
    money,
    leads,
    reviews,
    social,
    insights,
  };

  return (
    <div className={styles.shell}>
      {/* ===== SIDEBAR ===== */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Image
            src="/images/logo_white_tight.png"
            alt="Ultra Shine"
            width={294}
            height={149}
            priority
            className={styles.brandLogo}
          />
          <span className={styles.brandTag}>Dashboard</span>
        </div>

        <nav className={styles.nav}>
          {TABS.map((tab, i) => {
            const n = badges[tab.id] ?? 0;
            const showGroup = tab.group && tab.group !== TABS[i - 1]?.group;
            return (
              <Fragment key={tab.id}>
                {showGroup && <div className={styles.navGroup}>{tab.group}</div>}
                <button
                  type="button"
                  onClick={() => selectTab(tab.id)}
                  className={`${styles.navItem} ${active === tab.id ? styles.navItemActive : ''}`}
                >
                  <span className={styles.navGlyph}>{tab.glyph}</span>
                  <span className={styles.navLabel}>{tab.label}</span>
                  {n > 0 && (
                    <span className={`${styles.navBadge} ${tab.id === 'money' ? styles.navBadgeRed : ''}`} aria-label={`${n} waiting`}>
                      {n > 9 ? '9+' : n}
                    </span>
                  )}
                </button>
              </Fragment>
            );
          })}
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
        {/* Active-tab header. Home draws its own (greeting + date), so it only
            keeps the phone sign-out button from this one. */}
        <header className={`${styles.pageHeader} ${active === 'overview' ? styles.pageHeaderBare : ''}`}>
          <p className={styles.pageEyebrow}>{activeMeta.label.toUpperCase()}</p>
          <h1 className={styles.pageTitle}>
            {active === 'overview'
              ? <>Welcome <em>back</em>.</>
              : activeMeta.label}
          </h1>
          <p className={styles.pageSub}>{activeMeta.description}</p>
          {/* Phones: the sidebar is a bottom tab bar, so sign-out lives here */}
          <form action="/api/admin/logout" method="post" className={styles.mobileOut}>
            <button type="submit">Sign out</button>
          </form>
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
