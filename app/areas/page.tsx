import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '../_components/SiteHeader';
import SiteFooter from '../_components/SiteFooter';
import { CITIES } from './_data/cities';
import styles from './[city]/page.module.css';

export const metadata: Metadata = {
  title: 'Service Areas · 13 Cities in Palm Beach + Broward · Ultra Shine Cleaning',
  description:
    'Ultra Shine Cleaning serves 13 cities across Palm Beach and Broward County, FL. Find your city for local cleaning service info, neighborhoods served, and a custom quote in 1 hour.',
};

export default function AreasIndexPage() {
  const palmBeach = CITIES.filter((c) => c.county === 'Palm Beach');
  const broward = CITIES.filter((c) => c.county === 'Broward');

  return (
    <main>
      <SiteHeader inPage={false} />

      {/* HERO */}
      <section className={styles.hero}>
        <div
          className={styles.heroBg}
          style={{ backgroundImage: 'url(/images/hero_3d_areas.jpg)' }}
        />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <p className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span> / </span>
            <span style={{ opacity: 0.8 }}>Service Areas</span>
          </p>
          <p className={styles.heroEyebrow}>WHERE WE SERVE · 13 CITIES</p>
          <h1 className={styles.heroHeadline}>
            Across South Florida's <em>finest</em> neighborhoods.
          </h1>
          <p className={styles.heroSub}>
            Professional cleaning across Palm Beach + Broward County.
            Find your city below for service details + a custom quote.
          </p>
        </div>
      </section>

      {/* PALM BEACH COUNTY */}
      <section className={styles.section}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p className={styles.eyebrow} style={{ justifyContent: 'center' }}>Palm Beach County</p>
          <h2 className={styles.h2} style={{ margin: '0 auto', textAlign: 'center' }}>
            <em>{palmBeach.length}</em> cities served.
          </h2>
        </div>
        <div
          className={styles.servicesGrid}
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
        >
          {palmBeach.map((c) => (
            <Link key={c.slug} href={`/areas/${c.slug}`} className={styles.serviceLink}>
              <div className={styles.serviceNum}>{c.county === 'Palm Beach' ? 'PBC' : 'BWD'}</div>
              <div className={styles.serviceName}>{c.name}</div>
              <div className={styles.serviceArrow}>→</div>
            </Link>
          ))}
        </div>
      </section>

      {/* BROWARD COUNTY */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p className={styles.eyebrow} style={{ justifyContent: 'center' }}>Broward County</p>
          <h2 className={styles.h2} style={{ margin: '0 auto', textAlign: 'center' }}>
            <em>{broward.length}</em> cities served.
          </h2>
        </div>
        <div
          className={styles.servicesGrid}
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
        >
          {broward.map((c) => (
            <Link key={c.slug} href={`/areas/${c.slug}`} className={styles.serviceLink}>
              <div className={styles.serviceNum}>BWD</div>
              <div className={styles.serviceName}>{c.name}</div>
              <div className={styles.serviceArrow}>→</div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <p className={styles.eyebrow} style={{ justifyContent: 'center' }}>Not on the list?</p>
        <h2 className={styles.ctaHead}>
          If you're <em>close</em>, ask anyway.
        </h2>
        <p className={styles.ctaSub}>
          We extend coverage based on demand — if your city isn't here yet,
          tell us where you live and we'll see if we can route a crew.
        </p>
        <Link href="/quote" className="btn btn-coral">Request Your Free Quote</Link>
      </section>

      <SiteFooter />
    </main>
  );
}
