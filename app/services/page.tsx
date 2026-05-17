import Link from 'next/link';
import SiteHeader from '../_components/SiteHeader';
import SiteFooter from '../_components/SiteFooter';
import JsonLd from '../_components/JsonLd';
import styles from './page.module.css';

/**
 * /services — Hub page indexing all five services.
 *
 * Until now, /services/regular-cleaning etc. worked but /services itself
 * 404'd. Users who hand-type or guess that URL now land here.
 *
 * Server component (no client interactivity needed) → better SEO + faster
 * first paint than the homepage's animated TiltCard variant.
 */

type ServiceItem = {
  slug: string;
  number: string;
  name: string;
  tagline: string;
  description: string;
  image: string;
  bestFor: string;
};

const SERVICES: ServiceItem[] = [
  {
    slug: 'regular-cleaning',
    number: '01',
    name: 'Regular Cleaning',
    tagline: 'Weekly · Bi-Weekly · Monthly',
    description:
      "The weekly reset that keeps it pristine. Maintenance cadence so your home stays clean instead of spiraling into 'I need a deep clean' again.",
    image: '/images/flow_living_room_navy.jpg',
    bestFor: 'Active households who want consistency',
  },
  {
    slug: 'deep-cleaning',
    number: '02',
    name: 'Deep Cleaning',
    tagline: 'Quarterly Reset',
    description:
      'Baseboards, inside oven + fridge, grout, light fixtures, ceiling fans, vents. The full reset every ~90 days — pairs with Regular to keep the bar high.',
    image: '/images/flow_hand_marble.jpg',
    bestFor: 'First-time clients + quarterly resets',
  },
  {
    slug: 'move-in-out',
    number: '03',
    name: 'Move-In / Move-Out',
    tagline: 'Landlord-Grade Detail',
    description:
      'Empty-home detail clean — inside every cabinet, drawer, oven, fridge. Documented before/after. The clean that gets your deposit back.',
    image: '/images/service_movein_boxes.jpg',
    bestFor: 'Renters + sellers + property managers',
  },
  {
    slug: 'commercial',
    number: '04',
    name: 'Commercial',
    tagline: 'Offices · Suites · Retail',
    description:
      'After-hours or weekend cleans on a recurring schedule built around your business. Offices that close more clients because they look the part.',
    image: '/images/service_commercial_office.jpg',
    bestFor: 'Small + mid-size offices in Palm Beach + Broward',
  },
  {
    slug: 'post-construction',
    number: '05',
    name: 'Post-Construction',
    tagline: 'HEPA-Filtered, Wall-to-Wall',
    description:
      'Drywall dust gets everywhere. We bring HEPA vacuums + the right cloths to leave a remodel actually move-in ready, not just construction-clean.',
    image: '/images/service_postconstruction.jpg',
    bestFor: 'Renovations, remodels, new builds',
  },
];

export default function ServicesIndexPage() {
  const servicesSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: SERVICES.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: s.name,
      url: `https://ultrashinecleaningfl.com/services/${s.slug}`,
      description: s.description,
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://ultrashinecleaningfl.com/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Services',
        item: 'https://ultrashinecleaningfl.com/services',
      },
    ],
  };

  return (
    <main>
      <JsonLd data={servicesSchema} />
      <JsonLd data={breadcrumbSchema} />

      <SiteHeader inPage={false} />

      {/* ============ HERO ============ */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroOverlay} />

        <div className={styles.heroContent}>
          <p className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span> / </span>
            <span style={{ opacity: 0.8 }}>Services</span>
          </p>

          <p className={styles.heroEyebrow}>WHAT WE OFFER · FIVE SERVICES</p>

          <h1 className={`fraunces ${styles.heroHeadline}`}>
            Five services. One <em>standard</em>.
          </h1>

          <p className={styles.heroSub}>
            Every home is different. Every clean is custom. But the bar never moves —
            background-checked W2 crews, color-coded cloths, EPA-safe products,
            and a 100% satisfaction guarantee on every single visit.
          </p>
        </div>

        {/* Live-feel trust band — anchors the funnel page with proof */}
        <div className={styles.trustBand}>
          <div className={styles.trustBandInner}>
            <div className={styles.trustItem}>
              <span className={styles.trustValue}>7+</span>
              <span className={styles.trustLabel}>Years in Business</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustValue}>13</span>
              <span className={styles.trustLabel}>Cities Served</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustValue}>4.9★</span>
              <span className={styles.trustLabel}>Verified Avg Rating</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustValue}>100%</span>
              <span className={styles.trustLabel}>Satisfaction Guarantee</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustValue}>~1 hr</span>
              <span className={styles.trustLabel}>Quote Turnaround</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ SERVICES GRID ============ */}
      <section className={styles.gridSection}>
        <div className={styles.gridInner}>
          {SERVICES.map((service, i) => (
            <Link
              key={service.slug}
              href={`/services/${service.slug}`}
              className={`${styles.card} ${i === 0 ? styles.cardWide : ''} card-lift`}
            >
              <div
                className={styles.cardImage}
                style={{ backgroundImage: `url(${service.image})` }}
              />
              <div className={styles.cardOverlay} />

              <div className={styles.cardContent}>
                <div className={styles.cardTop}>
                  <span className={`mono ${styles.cardNumber}`}>{service.number}</span>
                  <span className={styles.cardTagline}>{service.tagline}</span>
                </div>

                <div className={styles.cardBody}>
                  <h2 className={`fraunces ${styles.cardName}`}>{service.name}</h2>
                  <p className={styles.cardDescription}>{service.description}</p>

                  <div className={styles.cardFooter}>
                    <span className={styles.cardBestFor}>
                      <span className={styles.cardBestForLabel}>BEST FOR</span>
                      <span className={styles.cardBestForValue}>{service.bestFor}</span>
                    </span>
                    <span className={styles.cardArrow} aria-hidden>
                      Explore →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ COMPARISON MATRIX ============ */}
      <section className={styles.compareSection}>
        <div className={styles.compareInner}>
          <p className="eyebrow">SIDE BY SIDE</p>
          <h2 className={`fraunces ${styles.compareHead}`}>
            What&apos;s included in <em>each</em> service.
          </h2>
          <p className={styles.compareSub}>
            A quick glance so you can pick what fits — not every clean needs everything.
          </p>

          {/* Desktop / tablet: real table */}
          <div className={styles.compareTableWrap}>
            <table className={styles.compareTable}>
              <thead>
                <tr>
                  <th className={styles.compareLabelCol}>What you get</th>
                  <th>Regular</th>
                  <th>Deep</th>
                  <th>Move-In / Out</th>
                  <th>Commercial</th>
                  <th>Post-Construction</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Dust + wipe all surfaces',           true,  true,  true,  true,  true],
                  ['Floors vacuumed + mopped',           true,  true,  true,  true,  true],
                  ['Bathrooms fully sanitized',          true,  true,  true,  true,  true],
                  ['Kitchen counters + appliances ext.', true,  true,  true,  true,  true],
                  ['Trash emptied + replaced',           true,  true,  true,  true,  true],
                  ['Baseboards hand-wiped',              false, true,  true,  false, true],
                  ['Inside oven + fridge',               false, true,  true,  false, false],
                  ['Inside cabinets + drawers',          false, false, true,  false, false],
                  ['Grout scrubbed + tile reset',        false, true,  true,  false, true],
                  ['Light fixtures + ceiling fans',      false, true,  true,  false, true],
                  ['Vents + air returns',                false, true,  true,  false, true],
                  ['HEPA vacuum for fine dust',          false, false, false, false, true],
                  ['Drywall + construction dust',        false, false, false, false, true],
                  ['After-hours scheduling',             false, false, false, true,  true],
                  ['Recurring schedule available',       true,  false, false, true,  false],
                ].map((row, idx) => (
                  <tr key={idx}>
                    <td className={styles.compareLabelCol}>{row[0] as string}</td>
                    {(row.slice(1) as boolean[]).map((cell, i) => (
                      <td key={i} className={cell ? styles.cellYes : styles.cellNo}>
                        {cell ? '✓' : '·'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className={styles.compareNote}>
            All services include background-checked W2 cleaners, color-coded cloths
            (no cross-contamination), EPA-safe products, and our 100% satisfaction guarantee.
          </p>
        </div>
      </section>

      {/* ============ NOT SURE WHICH ============ */}
      <section className={styles.helpSection}>
        <div className={styles.helpInner}>
          <p className="eyebrow">NOT SURE WHICH ONE?</p>
          <h2 className={`fraunces ${styles.helpHead}`}>
            Most clients start with a <em>Deep Clean</em>, then keep it that way.
          </h2>
          <p className={styles.helpBody}>
            The simplest path: get a one-time Deep Cleaning to reset everything to
            baseline, then set up Regular Cleaning at the cadence that fits your home —
            weekly for active households, bi-weekly for most, monthly for tidier ones.
            We&apos;ll recommend the right rhythm based on your walk-through.
          </p>

          <div className={styles.helpRow}>
            <Link href="/quote" className="btn btn-coral">
              Request Your Free Quote
            </Link>
            <Link href="/pricing-philosophy" className={styles.helpSecondary}>
              Why we don&apos;t list prices →
            </Link>
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className={styles.finalCta}>
        <div className={styles.finalInner}>
          <p className="eyebrow" style={{ color: 'var(--white)', opacity: 0.7 }}>
            ULTRA SHINE CLEANING
          </p>
          <h2 className={`fraunces ${styles.finalHead}`}>
            A custom quote in your inbox <em>within an hour</em>.
          </h2>
          <p className={styles.finalSub}>
            Tell us about your home. We&apos;ll send back a precise estimate —
            no surprises, no upsells, no hidden fees.
          </p>
          <div className={styles.finalRow}>
            <Link href="/quote" className="btn btn-primary">
              Get My Quote
            </Link>
            <a href="tel:5615836694" className={styles.finalPhone}>
              or call (561) 583-6694
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
