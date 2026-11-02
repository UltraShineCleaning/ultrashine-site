import Link from 'next/link';
import styles from './NavServices.module.css';
import { SERVICE_NAV } from '../_lib/service-nav';

/**
 * "Services" in the top menu (computers). Hover or keyboard-focus opens a panel with all five
 * services and "All services" last (owner, 2026-11-02). Pure CSS (:hover / :focus-within), so it
 * works before any JavaScript loads and every link is a real crawlable <a> for Google.
 */
const ICONS: Record<string, JSX.Element> = {
  regular: (
    <>
      <path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
    </>
  ),
  deep: (
    <>
      <path d="M12 2.7C8 7.5 6 10.9 6 13.8a6 6 0 0 0 12 0c0-2.9-2-6.3-6-11.1z" />
      <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
    </>
  ),
  move: (
    <>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </>
  ),
  post: (
    <>
      <path d="M2 18h20v2H2z" />
      <path d="M5 18v-4a7 7 0 0 1 14 0v4" />
      <path d="M12 7V4M10 4h4" />
    </>
  ),
  commercial: (
    <>
      <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      <path d="M16 9h2a2 2 0 0 1 2 2v10M8 7h4M8 11h4M8 15h4M2 21h20" />
    </>
  ),
};

export default function NavServices({ href = '/services' }: { href?: string }) {
  return (
    <div className={styles.wrap}>
      <Link href={href} className={styles.trigger} aria-haspopup="true">
        Services
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 4l4 4 4-4" />
        </svg>
      </Link>
      <div className={styles.panel} role="menu">
        {SERVICE_NAV.map((s) => (
          <Link key={s.href} href={s.href} className={styles.item} role="menuitem">
            <span className={styles.ico}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {ICONS[s.icon]}
              </svg>
            </span>
            <span>
              <b>{s.name}</b>
              <small>{s.blurb}</small>
            </span>
          </Link>
        ))}
        <Link href="/services" className={styles.all} role="menuitem">
          <span>
            <b>All services</b>
            <small>Compare all five side by side</small>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
