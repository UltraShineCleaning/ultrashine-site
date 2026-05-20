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

// Anchored to Boca Raton's coordinates (26.3683°N, 80.1289°W).
// IMPORTANT: we deliberately do NOT search "Ultra Shine Cleaning" here —
// Google's fuzzy search surfaced competitor / unrelated businesses
// (Super Shine Window Cleaning, Ultra Sonic Hand Car Wash, Ultra Shine
// Auto Spa) as pins. We don't want our service-area map promoting other
// businesses, so we search the CITY ("Boca Raton, FL") which drops a
// single city-center pin and shows the surrounding coverage area.
// z=11 shows Boca prominently with Delray, Highland Beach, Deerfield,
// and Coral Springs visible in-frame.
const MAP_EMBED_URL =
  'https://maps.google.com/maps?q=Boca+Raton,+FL&ll=26.3683,-80.1289&z=11&output=embed';

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
