import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from '../../_components/SiteHeader';
import SiteFooter from '../../_components/SiteFooter';
import JsonLd from '../../_components/JsonLd';
import ServiceAreaMap from '../../_components/ServiceAreaMap';
import { CITIES, getCity } from '../_data/cities';
import styles from './page.module.css';

type Params = { city: string };

/** Pre-render all 13 city pages at build time (static, zero runtime cost) */
export function generateStaticParams(): Params[] {
  return CITIES.map((c) => ({ city: c.slug }));
}

/** Per-city SEO — title, description, OG */
export function generateMetadata({ params }: { params: Params }): Metadata {
  const city = getCity(params.city);
  if (!city) return { title: 'City Not Found' };

  return {
    title: `${city.name} Cleaning Service · House, Deep, Move-In/Out + More`,
    description: `Professional house cleaning, deep cleaning, move-in/out, commercial, and post-construction cleaning in ${city.name}, FL. Background-checked W2 team, fully insured. Custom quote in 1 hour.`,
    openGraph: {
      title: `Ultra Shine Cleaning · ${city.name}, FL`,
      description: `${city.vibe} ${city.intro.slice(0, 140)}...`,
      type: 'website',
    },
    alternates: {
      canonical: `https://ultrashinecleaningfl.com/areas/${city.slug}`,
    },
  };
}

const SERVICES = [
  { num: '01', slug: 'regular-cleaning',   name: 'Regular Cleaning' },
  { num: '02', slug: 'deep-cleaning',      name: 'Deep Cleaning' },
  { num: '03', slug: 'move-in-out',        name: 'Move-In / Out' },
  { num: '04', slug: 'commercial',         name: 'Commercial' },
  { num: '05', slug: 'post-construction',  name: 'Post-Construction' },
];

export default function CityPage({ params }: { params: Params }) {
  const city = getCity(params.city);
  if (!city) notFound();

  // (Sibling cities list previously rendered as a small same-county footer
  //  section; replaced by <ServiceAreaMap /> below which shows all 13 cities
  //  visually + clickable.)

  // Per-city schema — tells Google this is a service page for THIS city.
  // Combined with the breadcrumbs, this is what makes "boca raton cleaning"
  // searches surface /areas/boca-raton with a service card.
  const citySchema = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: `House Cleaning in ${city.name}, FL`,
      description: city.intro,
      serviceType: 'House Cleaning Service',
      provider: { '@id': 'https://ultrashinecleaningfl.com/#business' },
      areaServed: {
        '@type': 'City',
        name: city.name,
        containedInPlace: { '@type': 'AdministrativeArea', name: `${city.county} County, Florida` },
      },
      url: `https://ultrashinecleaningfl.com/areas/${city.slug}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://ultrashinecleaningfl.com' },
        { '@type': 'ListItem', position: 2, name: 'Service Areas', item: 'https://ultrashinecleaningfl.com/areas' },
        { '@type': 'ListItem', position: 3, name: city.name },
      ],
    },
  ];

  return (
    <main>
      <JsonLd data={citySchema} />
      <SiteHeader inPage={false} />

      {/* ============== HERO ============== */}
      <section className={styles.hero}>
        <div
          className={styles.heroBg}
          style={{ backgroundImage: `url(${city.heroImage})` }}
        />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <p className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span> / </span>
            <Link href="/#areas">Areas</Link>
            <span> / </span>
            <span style={{ opacity: 0.8 }}>{city.name}</span>
          </p>
          <p className={styles.heroEyebrow}>
            {city.county.toUpperCase()} COUNTY · NOW SERVING
          </p>
          <h1 className={styles.heroHeadline}>
            Cleaning service in <em>{city.name}</em>, FL.
          </h1>
          <p className={styles.heroSub}>{city.vibe}</p>
        </div>
      </section>

      {/* ============== TRUST ROW (compact) ============== */}
      <div className={styles.trustRow}>
        <span className={styles.trustItem}>Fully Insured + Bonded</span>
        <span className={styles.trustItem}>Background-Checked Team</span>
        <span className={styles.trustItem}>4.9 ★ Google Verified</span>
        <span className={styles.trustItem}>Custom Quote in 1 Hour</span>
      </div>

      {/* ============== INTRO + WHY HERE ============== */}
      <section className={styles.section}>
        <div className={styles.introWrap}>
          <p className={styles.eyebrow}>Why us in {city.name}</p>
          <h2 className={styles.h2}>
            Local cleaning, <em>done right</em>.
          </h2>
          <p className={styles.introProse}>{city.intro}</p>

          <ul className={styles.whyList}>
            {city.whyHere.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============== SERVICES IN THIS CITY ============== */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div style={{ textAlign: 'center' }}>
          <p className={styles.eyebrow} style={{ justifyContent: 'center' }}>Services in {city.name}</p>
          <h2 className={styles.h2} style={{ margin: '0 auto 0', textAlign: 'center' }}>
            Five ways we can <em>help</em>.
          </h2>
        </div>

        <div className={styles.servicesGrid}>
          {SERVICES.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}`} className={styles.serviceLink}>
              <div className={styles.serviceNum}>{s.num}</div>
              <div className={styles.serviceName}>{s.name}</div>
              <div className={styles.serviceArrow}>→</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============== NEIGHBORHOODS ============== */}
      <section className={styles.section}>
        <div className={styles.areasWrap}>
          <p className={styles.eyebrow}>Neighborhoods we serve</p>
          <h2 className={styles.h2}>
            Across <em>all of</em> {city.name}.
          </h2>
          <div className={styles.areasList}>
            {city.areas.map((a) => (
              <span key={a} className={styles.areaTag}>{a}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ============== CTA ============== */}
      <section className={styles.cta}>
        <p className={styles.eyebrow} style={{ justifyContent: 'center' }}>Ready when you are</p>
        <h2 className={styles.ctaHead}>
          Your {city.name} home, <em>made spotless</em>.
        </h2>
        <p className={styles.ctaSub}>
          Custom quote in one hour. We'll come walk through your home
          before sending the number — every quote is precise, every
          home gets the same standard.
        </p>
        <Link href="/quote" className="btn btn-coral">Request Your Free Quote</Link>
      </section>

      {/* ============== SERVICE AREA MAP ==============
          Replaces the old text-only siblings list with the richer
          ServiceAreaMap (map + chip groups for both counties).
          Visitors on /areas/boca-raton can now see all 13 cities
          we serve visually + jump to any of them in one click. */}
      <ServiceAreaMap />

      <SiteFooter />
    </main>
  );
}
