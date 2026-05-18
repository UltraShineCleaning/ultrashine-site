'use client';
import Link from 'next/link';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import SiteHeader from '../../_components/SiteHeader';
import SiteFooter from '../../_components/SiteFooter';
import MotionSection from '../../_components/MotionSection';
import JsonLd from '../../_components/JsonLd';
import styles from '../../page.module.css';
import service from './ServicePage.module.css';

export type ServiceData = {
  /** URL slug (e.g. "deep-cleaning") */
  slug: string;
  /** Display name (e.g. "Deep Cleaning") */
  name: string;
  /** Number 01-05 for the eyebrow */
  number: string;
  /** Hero image path */
  heroImage: string;
  /** Headline with one *italic* word using underscores: "Deep _care_." → renders Deep <em>care</em>. */
  headline: string;
  /** Sub-headline in italic */
  subheadline: string;
  /** What's Included grid — 4 columns */
  included: {
    kitchen: string[];
    bathrooms: string[];
    livingBedrooms: string[];
    wholeHome: string[];
  };
  /** When You Need This — 4 scenario cards */
  scenarios: { title: string; body: string }[];
  /** How [X] Differs from Regular Cleaning */
  differs: { regularLabel: string; thisLabel: string; regularItems: string[]; thisItems: string[] };
  /** FAQ — 6 questions specific to this service */
  faq: { q: string; a: string }[];
  /** Final CTA keyword (e.g. "DEEP", "MOVE", "OFFICE") */
  ctaKeyword: string;
};

function renderHeadline(text: string) {
  // Replace _word_ with <em>word</em>
  const parts = text.split(/(_[^_]+_)/g);
  return parts.map((p, i) => {
    if (p.startsWith('_') && p.endsWith('_')) {
      return <em key={i}>{p.slice(1, -1)}</em>;
    }
    return <span key={i}>{p}</span>;
  });
}

export default function ServicePage({ data }: { data: ServiceData }) {
  const heroRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  // Hero parallax
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const photoY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const photoScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.15]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Schema.org markup — Service + FAQPage + BreadcrumbList. Google uses
  // these to show:
  //  - Service cards with ★ rating, location, offer details
  //  - Expandable FAQ snippets ("People Also Ask" boxes)
  //  - Breadcrumb trail in search ("Home › Services › Deep Cleaning")
  const pageSchema = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: `${data.name} · Ultra Shine Cleaning`,
      description: data.subheadline,
      serviceType: data.name,
      provider: { '@id': 'https://ultrashinecleaningfl.com/#business' },
      // List ALL 13 cities as serviced — much stronger local signal than
      // just "Florida". Google understands service-area businesses better
      // with explicit city enumeration.
      areaServed: [
        { '@type': 'City', name: 'Boca Raton' },
        { '@type': 'City', name: 'Delray Beach' },
        { '@type': 'City', name: 'Boynton Beach' },
        { '@type': 'City', name: 'Lake Worth' },
        { '@type': 'City', name: 'West Palm Beach' },
        { '@type': 'City', name: 'Wellington' },
        { '@type': 'City', name: 'Parkland' },
        { '@type': 'City', name: 'Coral Springs' },
        { '@type': 'City', name: 'Fort Lauderdale' },
        { '@type': 'City', name: 'Coconut Creek' },
        { '@type': 'City', name: 'Deerfield Beach' },
        { '@type': 'City', name: 'Pompano Beach' },
        { '@type': 'City', name: 'Margate' },
      ],
      url: `https://ultrashinecleaningfl.com/services/${data.slug}`,
      image: `https://ultrashinecleaningfl.com${data.heroImage}`,
      // Star rating eligibility — Google may show ★ 5.0 next to results
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '5.0',
        reviewCount: '25',
        bestRating: '5',
        worstRating: '1',
      },
      // Signals this is a bookable offering (no flat price published —
      // we deliberately omit `price` since Tiago quotes every job custom)
      offers: {
        '@type': 'Offer',
        availability: 'https://schema.org/InStock',
        priceSpecification: {
          '@type': 'PriceSpecification',
          priceCurrency: 'USD',
          description: 'Custom quote per home — every job priced individually after walkthrough',
        },
        url: 'https://ultrashinecleaningfl.com/quote',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: data.faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
    {
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
        {
          '@type': 'ListItem',
          position: 3,
          name: data.name,
          item: `https://ultrashinecleaningfl.com/services/${data.slug}`,
        },
      ],
    },
  ];

  return (
    <main>
      <JsonLd data={pageSchema} />
      <SiteHeader inPage={false} />

      {/* HERO */}
      <section ref={heroRef} className={styles.hero}>
        <motion.div
          className={styles.heroBg}
          style={{
            backgroundImage: `url(${data.heroImage})`,
            y: reducedMotion ? '0%' : photoY,
            scale: reducedMotion ? 1.05 : photoScale,
          }}
        />
        <div className={styles.heroOverlay} />
        <motion.div className={styles.heroContent} style={{ opacity: reducedMotion ? 1 : contentOpacity }}>
          {/* Breadcrumb */}
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className={service.breadcrumb}
          >
            <Link href="/">Home</Link>
            <span> / </span>
            <Link href="/#services">Services</Link>
            <span> / </span>
            <span style={{ opacity: 0.8 }}>{data.name}</span>
          </motion.p>

          <motion.p
            className="eyebrow"
            style={{ color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36, marginTop: 20 }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: 40 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: 'inline-block', height: 1, background: 'var(--blush)' }}
            />
            SERVICE NO. {data.number}
          </motion.p>

          <motion.h1
            className={`fraunces ${styles.heroHeadline}`}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {renderHeadline(data.headline)}
          </motion.h1>

          <motion.p
            className={`fraunces ${styles.heroSub}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7 }}
          >
            {data.subheadline}
          </motion.p>

          <motion.div
            className={styles.heroCtaRow}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.95 }}
          >
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <Link href="/quote" className="btn btn-primary">Request Your Free Quote</Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <a href="#whats-included" className="btn btn-secondary">See What's Included</a>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* WHAT'S INCLUDED */}
      <MotionSection id="whats-included" className={`${service.section} ${styles['dot-grid'] || ''} dot-grid`}>
        <p className="eyebrow">EVERY VISIT</p>
        <h2 className={`fraunces ${service.sectionHeadline}`}>
          What's <em>included</em> in every {data.name.toLowerCase()}.
        </h2>
        <div className={service.includedGrid}>
          {[
            { title: 'Kitchen', items: data.included.kitchen },
            { title: 'Bathrooms', items: data.included.bathrooms },
            { title: 'Living + Bedrooms', items: data.included.livingBedrooms },
            { title: 'Whole Home', items: data.included.wholeHome },
          ].map((col) => (
            <div key={col.title} className={service.includedCol}>
              <h3 className={`fraunces ${service.includedColTitle}`}>{col.title}</h3>
              <ul className={service.includedList}>
                {col.items.map((item, i) => (
                  <li key={i}>
                    <span className={service.bullet}>✦</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </MotionSection>

      {/* WHEN YOU NEED THIS */}
      <MotionSection className={service.scenariosSection}>
        <p className="eyebrow">WHEN YOU NEED THIS</p>
        <h2 className={`fraunces ${service.sectionHeadline}`}>
          Book a {data.name.toLowerCase()} <em>when</em>.
        </h2>
        <div className={service.scenariosGrid}>
          {data.scenarios.map((s, i) => (
            <motion.div
              key={i}
              className={service.scenarioCard}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <div className={service.scenarioBullet}>✦</div>
              <h3 className={`fraunces ${service.scenarioTitle}`}>{s.title}</h3>
              <p className={service.scenarioBody}>{s.body}</p>
            </motion.div>
          ))}
        </div>
      </MotionSection>

      {/* HOW IT DIFFERS */}
      <MotionSection className={service.differsSection}>
        <p className="eyebrow">{data.differs.regularLabel} vs {data.differs.thisLabel}</p>
        <h2 className={`fraunces ${service.sectionHeadline}`}>
          The <em>difference</em>, side by side.
        </h2>
        <div className={service.differsGrid}>
          <div className={service.differsCol}>
            <h3 className={`fraunces ${service.differsColTitle}`}>{data.differs.regularLabel}</h3>
            <ul className={service.differsList}>
              {data.differs.regularItems.map((item, i) => (
                <li key={i}><span className={service.bullet} style={{ color: 'var(--blush-soft)' }}>·</span> {item}</li>
              ))}
            </ul>
          </div>
          <div className={service.differsCol + ' ' + service.differsColAccent}>
            <h3 className={`fraunces ${service.differsColTitle}`}>{data.differs.thisLabel}</h3>
            <ul className={service.differsList}>
              {data.differs.thisItems.map((item, i) => (
                <li key={i}><span className={service.bullet}>✦</span> {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </MotionSection>

      {/* FAQ */}
      <MotionSection className={service.faqSection}>
        <p className="eyebrow">{data.name.toUpperCase()} · QUESTIONS</p>
        <h2 className={`fraunces ${service.sectionHeadline}`}>
          Answers, <em>before you ask</em>.
        </h2>
        <div className={service.faqList}>
          {data.faq.map((item, i) => {
            const open = openFaq === i;
            return (
              <motion.div
                key={i}
                className={`${service.faqItem} ${open ? service.faqItemOpen : ''}`}
                onClick={() => setOpenFaq(open ? null : i)}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
                layout
              >
                <div className={`fraunces ${service.faqQ}`}>
                  <span>{item.q}</span>
                  <motion.span
                    className={service.faqQIcon}
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {open ? '−' : '+'}
                  </motion.span>
                </div>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className={service.faqA}>{item.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </MotionSection>

      {/* FINAL CTA */}
      <MotionSection className={styles.finalCta}>
        <p className="eyebrow" style={{ color: 'var(--blush)' }}>BOOK YOURS</p>
        <h2 className={`fraunces ${styles.finalHeadline}`}>
          Book your <em>{data.name.toLowerCase()}</em>.
        </h2>
        <Link href="/quote" className="btn btn-coral" style={{ marginTop: 32 }}>
          Request Your Free Quote
        </Link>
        <p className={styles.finalNote}>
          Or comment <strong>{data.ctaKeyword}</strong> on our IG · Custom quote in 1 hour · No pricing surprises
        </p>
        {/* Subtle estimator entry point — for visitors not ready to fill the
            quote form but curious about how long their cleaning would take. */}
        <p className={styles.finalEstimatorHint}>
          Not ready to commit yet?{' '}
          <Link href="/cleaning-time-estimator">Try the 60-second time estimator →</Link>
        </p>
      </MotionSection>

      <SiteFooter />
    </main>
  );
}
