'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './AdminShell.module.css';

/**
 * AdminShell — "Ultra Shine HQ" (redesign 2026-11-18, approved preview:
 * 00_STATE/admin-redesign-preview/index.html, modelled on the CRM video Tiago sent).
 *
 *  - Top bar: lime logo tile · pill tabs in the middle · inbox / alerts / profile on the right
 *  - Floating quick-action rail on the left (computers only)
 *  - Settings sheet (monthly goals, which the Overview goal ring and Money chart read)
 *
 * Each tab's CONTENT is still server-rendered in /admin/page.tsx and passed in;
 * panels stay mounted (display:none) so data isn't thrown away on tab switch.
 * Tab state lives in the URL hash. The old ids are kept so every bookmark and
 * every in-app link (#leads, #insights…) still works; #pipeline / #reports /
 * #home are accepted as aliases.
 */

type TabId = 'overview' | 'leads' | 'clients' | 'schedule' | 'money' | 'insights' | 'reviews' | 'social';

type Tab = { id: TabId; label: string; title: [string, string?]; description: string; ownHeader?: boolean };

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', title: ['Overview'], description: '', ownHeader: true },
  { id: 'leads', label: 'Pipeline', title: ['Leads', 'pipeline'], description: '', ownHeader: true },
  { id: 'clients', label: 'Clients', title: ['Client', 'book'], description: 'Everyone you clean for — how often, what they pay, their home and what’s next.' },
  { id: 'schedule', label: 'Schedule', title: ['Schedule'], description: 'Every visit from Jobber — the month, the day, and who’s cleaning where.' },
  { id: 'money', label: 'Money', title: ['Money'], description: 'What came in, what’s owed and who to nudge — straight from Jobber.' },
  { id: 'insights', label: 'Reports', title: ['Reports'], description: 'How people find you and how the business is growing — website, Google, social, money and reviews.' },
  { id: 'reviews', label: 'Reviews', title: ['Reviews'], description: 'Your rating, the automatic review requests, and the latest reviews to reply to.' },
  { id: 'social', label: 'Social', title: ['Social'], description: 'Instagram + Facebook — plan, approve and post; messages and automations.' },
];

const ALIAS: Record<string, TabId> = { pipeline: 'leads', reports: 'insights', home: 'overview', jobber: 'schedule' };

function toTab(h: string): TabId | null {
  if (TABS.some((t) => t.id === h)) return h as TabId;
  return ALIAS[h] ?? null;
}

type Goals = { quotes: number; jobs: number; revenue: number; reviews: number };

/* ---------------- icons (one stroke family) ---------------- */
const I = {
  search: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  chat: <path d="M4 5h16v11H8l-4 4z" />,
  cal: <path d="M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 3v4M16 3v4M4 10h16" />,
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  out: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
  gear: <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 13.5l1.6 1.2-2 3.5-1.9-.8a7 7 0 0 1-1.9 1.1L15 20.5h-4l-.3-2a7 7 0 0 1-1.9-1.1l-1.9.8-2-3.5 1.6-1.2a7 7 0 0 1 0-3L4.9 9.3l2-3.5 1.9.8a7 7 0 0 1 1.9-1.1L11 3.5h4l.3 2a7 7 0 0 1 1.9 1.1l1.9-.8 2 3.5-1.6 1.2a7 7 0 0 1 0 3z" />,
  inbox: <path d="M4 13h4l2 3h4l2-3h4M4 13l2-7h12l2 7v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />,
  bell: <path d="M6 16v-5a6 6 0 1 1 12 0v5l2 2H4zM10 20h4" />,
};
const Ico = ({ d }: { d: ReactNode }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">{d}</svg>
);

export default function AdminShell(panelsIn: {
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
  // Little counters beside tabs. The Overview computes them (it reads every source) and announces them here.
  const [badges, setBadges] = useState<Partial<Record<string, number>>>({});
  const [menu, setMenu] = useState<null | 'alerts' | 'me'>(null);
  const [settings, setSettings] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = (e: Event) => setBadges((e as CustomEvent).detail ?? {});
    window.addEventListener('admin:badges', on);
    return () => window.removeEventListener('admin:badges', on);
  }, []);

  useEffect(() => {
    const read = () => {
      const t = toTab(window.location.hash.replace('#', ''));
      if (t) setActive(t);
    };
    read();
    window.addEventListener('hashchange', read);
    // Any tab can ask to open another one (e.g. a lead card → Pipeline).
    const go = (e: Event) => {
      const t = toTab(String((e as CustomEvent).detail ?? ''));
      if (t) select(t);
    };
    const openSettings = () => setSettings(true);
    window.addEventListener('admin:go', go);
    window.addEventListener('admin:settings', openSettings);
    return () => {
      window.removeEventListener('hashchange', read);
      window.removeEventListener('admin:go', go);
      window.removeEventListener('admin:settings', openSettings);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close menus on outside click / Escape
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !topRef.current?.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menu]);

  function select(id: TabId) {
    setActive(id);
    setMenu(null);
    if (window.location.hash !== `#${id}`) window.history.pushState(null, '', `#${id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Switch tab, then tell it to do something (the tab listens for the event). */
  function act(tab: TabId, event?: string) {
    select(tab);
    if (event) setTimeout(() => window.dispatchEvent(new Event(event)), 60);
  }

  const meta = TABS.find((t) => t.id === active) ?? TABS[0];
  const alerts = [
    { tab: 'leads' as TabId, n: badges.leads ?? 0, text: 'new leads waiting for a reply' },
    { tab: 'money' as TabId, n: badges.money ?? 0, text: 'invoices to follow up' },
    { tab: 'social' as TabId, n: badges.social ?? 0, text: 'messages not answered' },
    { tab: 'reviews' as TabId, n: badges.reviews ?? 0, text: 'review requests to send' },
  ].filter((a) => a.n > 0);
  const alertTotal = alerts.reduce((a, b) => a + b.n, 0);

  return (
    <div className={styles.shell}>
      {/* ===== TOP BAR ===== */}
      <div className={styles.top} ref={topRef}>
        <button type="button" className={styles.brand} onClick={() => select('overview')} aria-label="Overview">
          <span className={styles.logo}>✦</span>
          <span>Ultra Shine <em>HQ</em></span>
        </button>

        <nav className={styles.tabs} aria-label="Dashboard sections">
          {TABS.map((t) => {
            const n = badges[t.id] ?? 0;
            return (
              <button key={t.id} type="button" className={`${styles.tab} ${active === t.id ? styles.tabOn : ''}`} onClick={() => select(t.id)} aria-current={active === t.id ? 'page' : undefined}>
                {t.label}
                {n > 0 && <span className={`${styles.dot} ${t.id === 'money' ? styles.dotRed : ''}`}>{n > 9 ? '9+' : n}</span>}
              </button>
            );
          })}
        </nav>

        <div className={styles.icons}>
          <button type="button" className={styles.ib} title="Messages" aria-label="Messages" onClick={() => select('social')}>
            <Ico d={I.inbox} />
            {(badges.social ?? 0) > 0 && <span className={styles.ibBadge}>{badges.social}</span>}
          </button>
          <div className={styles.menuWrap}>
            <button type="button" className={styles.ib} title="What needs you" aria-label="Alerts" aria-expanded={menu === 'alerts'} onClick={() => setMenu(menu === 'alerts' ? null : 'alerts')}>
              <Ico d={I.bell} />
              {alertTotal > 0 && <span className={styles.ibBadge}>{alertTotal > 9 ? '9+' : alertTotal}</span>}
            </button>
            {menu === 'alerts' && (
              <div className={styles.menu} role="menu">
                <b className={styles.menuTitle}>What needs you</b>
                {alerts.length === 0 && <p className={styles.menuEmpty}>All caught up.</p>}
                {alerts.map((a) => (
                  <button key={a.tab} type="button" role="menuitem" className={styles.menuItem} onClick={() => select(a.tab)}>
                    <span className={styles.menuN}>{a.n}</span>
                    {a.text}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={styles.menuWrap}>
            <button type="button" className={styles.av} aria-label="Account" aria-expanded={menu === 'me'} onClick={() => setMenu(menu === 'me' ? null : 'me')}>US</button>
            {menu === 'me' && (
              <div className={styles.menu} role="menu">
                <button type="button" role="menuitem" className={styles.menuItem} onClick={() => { setMenu(null); setSettings(true); }}>Settings &amp; goals</button>
                <a role="menuitem" className={styles.menuItem} href="/" target="_blank" rel="noreferrer">View website ↗</a>
                <a role="menuitem" className={styles.menuItem} href="https://secure.getjobber.com/" target="_blank" rel="noreferrer">Open Jobber ↗</a>
                <form action="/api/admin/logout" method="post">
                  <button type="submit" role="menuitem" className={styles.menuItem}>Sign out</button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== QUICK-ACTION RAIL (computers) ===== */}
      <aside className={styles.rail} aria-label="Quick actions">
        <button type="button" title="Search leads" aria-label="Search leads" onClick={() => act('leads', 'admin:search')}><Ico d={I.search} /></button>
        <button type="button" title="New lead" aria-label="New lead" onClick={() => act('leads', 'admin:new-lead')}><Ico d={I.plus} /></button>
        <button type="button" title="Messages" aria-label="Messages" onClick={() => select('social')}><Ico d={I.chat} /></button>
        <button type="button" title="Schedule" aria-label="Schedule" onClick={() => select('schedule')}><Ico d={I.cal} /></button>
        <button type="button" title="Ask for a review" aria-label="Ask for a review" onClick={() => select('reviews')}><Ico d={I.star} /></button>
        <a title="Open Jobber" aria-label="Open Jobber" href="https://secure.getjobber.com/" target="_blank" rel="noreferrer"><Ico d={I.out} /></a>
        <span className={styles.sep} />
        <button type="button" title="Settings & goals" aria-label="Settings" onClick={() => setSettings(true)}><Ico d={I.gear} /></button>
      </aside>

      {/* ===== CONTENT ===== */}
      <main className={styles.main}>
        {!meta.ownHeader && (
          <header className={styles.pageHead}>
            <h1 className={styles.h1}>
              {meta.title[0]}
              {meta.title[1] && <><br />{meta.title[1]}</>}
            </h1>
            {meta.description && <p className={styles.pageSub}>{meta.description}</p>}
          </header>
        )}
        {(Object.keys(panelsIn) as TabId[]).map((id) => (
          <div key={id} className={styles.panel} style={{ display: active === id ? 'block' : 'none' }} aria-hidden={active !== id}>
            {panelsIn[id]}
          </div>
        ))}
      </main>

      {settings && <SettingsSheet onClose={() => setSettings(false)} />}
    </div>
  );
}

/* =================================================================
   Settings — monthly goals (the Overview ring, Money chart line and
   Reports rings all read the same saved goals).
   ================================================================= */
function SettingsSheet({ onClose }: { onClose: () => void }) {
  const [g, setG] = useState<Goals | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/home')
      .then((r) => r.json())
      .then((d) => setG(d.goals ?? { quotes: 0, jobs: 0, revenue: 0, reviews: 0 }))
      .catch(() => setG({ quotes: 0, jobs: 0, revenue: 0, reviews: 0 }));
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const save = async () => {
    if (!g) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch('/api/insights', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ goals: g }) });
      if (!r.ok) throw new Error();
      setMsg('Saved. The Overview updates on its next refresh.');
      window.dispatchEvent(new Event('admin:goals-saved'));
    } catch {
      setMsg('Could not save — try again.');
    } finally {
      setSaving(false);
    }
  };

  const field = (k: keyof Goals, label: string, prefix = '') => (
    <label className={styles.sf}>
      <span>{label}</span>
      <div className={styles.sfIn}>
        {prefix && <i>{prefix}</i>}
        <input
          inputMode="numeric"
          value={g ? String(g[k] || '') : ''}
          placeholder="not set"
          onChange={(e) => setG((cur) => (cur ? { ...cur, [k]: Number(e.target.value.replace(/[^\d]/g, '')) || 0 } : cur))}
        />
      </div>
    </label>
  );

  // Rendered straight into <body> so no parent box can push it off-centre (owner, 2026-11-18:
  // "the popup is too far down, it needs to be in the center").
  return createPortal(
    <div className={styles.sheetWrap} role="dialog" aria-modal="true" aria-label="Settings and goals">
      <button type="button" className={styles.scrim} aria-label="Close" onClick={onClose} />
      <div className={styles.sheet}>
        <div className={styles.sheetHead}>
          <b>Settings &amp; goals</b>
          <button type="button" className={styles.x} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className={styles.sheetSub}>Monthly goals. The Overview goal ring, the Money chart line and the Reports rings all use these.</p>
        {!g ? (
          <p className={styles.sheetSub}>Loading…</p>
        ) : (
          <>
            {field('revenue', 'Revenue goal per month', '$')}
            {field('jobs', 'Jobs per month')}
            {field('quotes', 'Quote requests per month')}
            {field('reviews', 'New Google reviews per month')}
            <button type="button" className={styles.saveBtn} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save goals'}</button>
            {msg && <p className={styles.sheetSub}>{msg}</p>}
          </>
        )}
        <div className={styles.sheetLinks}>
          <a href="https://secure.getjobber.com/" target="_blank" rel="noreferrer">Jobber ↗</a>
          <a href="https://business.google.com/" target="_blank" rel="noreferrer">Google Business ↗</a>
          <a href="https://business.facebook.com/" target="_blank" rel="noreferrer">Meta Business Suite ↗</a>
          <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer">Search Console ↗</a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
