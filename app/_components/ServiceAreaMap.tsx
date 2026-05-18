import Link from 'next/link';
import { CITIES } from '../areas/_data/cities';
import styles from './ServiceAreaMap.module.css';

/**
 * Service Area Map — Google Maps embed centered on the Palm Beach + Broward
 * coverage area, with a clickable row of all 13 cities below it.
 *
 * Why this exists:
 *  - Visual answer to "do they cover my city?" without scrolling a list
 *  - Real local SEO signal (explicit geographic coverage visible to crawlers)
 *  - Trust signal (real business + real coverage area)
 *
 * The iframe URL uses Google's public embed-by-search format which doesn't
 * require an API key. It searches for the business + city + state, which
 * surfaces our Google Business Profile pin if linked.
 *
 * Server-component compatible. No interactive state.
 */

// Centered on Boca Raton at a zoom level that captures Palm Beach + Broward.
// The "z=10" parameter shows ~25mi radius, which covers all 13 cities.
const MAP_EMBED_URL =
  'https://maps.google.com/maps?q=Ultra+Shine+Cleaning+Boca+Raton+FL&z=10&output=embed';

export default function ServiceAreaMap() {
  // Show Palm Beach county cities first, then Broward
  const palmBeach = CITIES.filter((c) => c.county === 'Palm Beach');
  const broward = CITIES.filter((c) => c.county === 'Broward');

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>WHERE WE CLEAN</p>
        <h2 className={`fraunces ${styles.head}`}>
          13 cities across <em>Palm Beach + Broward</em>.
        </h2>
        <p className={styles.sub}>
          Based in Boca Raton, serving the surrounding South Florida coast +
          inland communities. Click your city to see neighborhoods we cover.
        </p>

        <div className={styles.mapWrap}>
          <iframe
            title="Ultra Shine Cleaning service area — Palm Beach + Broward County, Florida"
            src={MAP_EMBED_URL}
            className={styles.mapIframe}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>

        <div className={styles.citiesGroups}>
          <div className={styles.citiesGroup}>
            <p className={styles.groupLabel}>PALM BEACH COUNTY</p>
            <div className={styles.cityChips}>
              {palmBeach.map((c) => (
                <Link
                  key={c.slug}
                  href={`/areas/${c.slug}`}
                  className={styles.chip}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
          <div className={styles.citiesGroup}>
            <p className={styles.groupLabel}>BROWARD COUNTY</p>
            <div className={styles.cityChips}>
              {broward.map((c) => (
                <Link
                  key={c.slug}
                  href={`/areas/${c.slug}`}
                  className={styles.chip}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <p className={styles.note}>
          Not on the list?{' '}
          <Link href="/quote">Tell us where you are</Link> — we&apos;ll let you
          know if we can route a team your way.
        </p>
      </div>
    </section>
  );
}
