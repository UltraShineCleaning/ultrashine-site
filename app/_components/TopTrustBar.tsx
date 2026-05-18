import styles from './TopTrustBar.module.css';

/**
 * TopTrustBar — thin strip at the very top of every page, above the nav.
 *
 * Why this exists:
 *  - Visitors landing on inner pages (via Google search to a blog post,
 *    a city page, a service page) currently see no trust signals until
 *    they scroll. This bar puts proof in their face on every page.
 *  - On the homepage it reinforces the existing trust strip without
 *    competing — they show different signals.
 *
 * Renders in the root layout BEFORE the page content so it pushes the
 * absolute-positioned nav (top: 0) down naturally without breaking
 * heroes that use position: relative.
 *
 * Mobile: the row becomes horizontally scrollable so all six signals
 * stay readable even on narrow viewports.
 */
export default function TopTrustBar() {
  const items: { icon: string; text: string }[] = [
    { icon: '✓', text: 'Fully Insured + Bonded' },
    { icon: '✓', text: 'W2 Employees · Background-Checked' },
    { icon: '✓', text: 'EPA-Safe · Pet + Kid Friendly' },
    { icon: '★', text: '5.0 Google · 25+ Verified Reviews' },
    { icon: '✦', text: 'Family-Owned · Since 2018' },
  ];

  // Render TWO copies of the items in the marquee track so the animation
  // can translate by -50% and loop seamlessly with no visible reset.
  return (
    <div className={styles.bar} aria-label="Ultra Shine Cleaning trust signals">
      <div className={styles.viewport}>
        <div className={styles.track}>
          {[0, 1].map((copy) => (
            <div key={copy} className={styles.group} aria-hidden={copy === 1}>
              {items.map((item, i) => (
                <span key={`${copy}-${i}`} className={styles.item}>
                  <span className={styles.icon}>{item.icon}</span>
                  <span className={styles.text}>{item.text}</span>
                  <span className={styles.divider} aria-hidden>·</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
