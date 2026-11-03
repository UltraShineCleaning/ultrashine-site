'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  computeEstimate,
  CREW_IS_FIXED_PAIR,
  exampleConditionLine,
  exampleInput,
  type Service as EstimateService,
} from '../../_lib/estimate';

/** Service-page slug → estimator service. Commercial has no estimator. */
const ESTIMATE_SERVICE_BY_SLUG: Record<string, EstimateService> = {
  'regular-cleaning': 'regular',
  'deep-cleaning': 'deep',
  'move-in-out': 'moveout',
  'post-construction': 'postconstruction',
};
import SiteHeader from '../../_components/SiteHeader';
import SiteFooter from '../../_components/SiteFooter';
import MotionSection from '../../_components/MotionSection';
import JsonLd from '../../_components/JsonLd';
import styles from '../../page.module.css';
import service from './ServicePage.module.css';
import { bgStyle } from '../../_lib/optImage';

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
  /**
   * Ballpark price range shown in the estimator callout's preview card.
   * These MUST match what /cleaning-time-estimator actually computes for
   * the reference scenario (3BR / 2 bath / last cleaned months ago / no
   * pets / one-time) — otherwise the preview promises a number the tool
   * then contradicts. Recompute if the estimator's rate table changes.
   */
  /**
   * Set false to hide the estimator callout. Used for Commercial, where the
   * estimator's questions (bedrooms, pets) don't apply to offices/retail.
   */
  showEstimator?: boolean;
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
      // (aggregateRating + offers removed — Review Snippets require explicit
      //  itemReviewed + actual review entries to validate. Business-level
      //  rating is already correctly attached to the HouseCleaningService
      //  schema in app/layout.tsx; duplicating it here flagged as invalid.)
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
      <section className={styles.hero}>
        <div
          className={`${styles.heroBg} hero-par bg-resp`}
          style={bgStyle(data.heroImage) as React.CSSProperties}
        />
        <div className={styles.heroOverlay} />
        <div className={`${styles.heroContent} hero-fade`}>
          {/* Breadcrumb */}
          <p
            className={`${service.breadcrumb} in`}
           style={{ '--fy': '-10px', '--t': '0.6s', '--d': '0.1s' } as React.CSSProperties}>
            <Link href="/">Home</Link>
            <span> / </span>
            <Link href="/#services">Services</Link>
            <span> / </span>
            <span style={{ opacity: 0.8 }}>{data.name}</span>
          </p>

          <p
            className="eyebrow in"
            style={{ color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36, marginTop: 20, '--fx': '-30px', '--t': '0.8s', '--d': '0.2s' } as React.CSSProperties}
          >
            <span className="in-line"
              style={{ display: 'inline-block', height: 1, background: 'var(--blush)', '--d': '0.4s' } as React.CSSProperties}
            />
            SERVICE NO. {data.number}
          </p>

          <h1
            className={`fraunces ${styles.heroHeadline} in`}
           style={{ '--fy': '60px', '--t': '1.1s', '--d': '0.4s' } as React.CSSProperties}>
            {renderHeadline(data.headline)}
          </h1>

          <p
            className={`fraunces ${styles.heroSub} in`}
           style={{ '--fy': '30px', '--t': '0.9s', '--d': '0.7s' } as React.CSSProperties}>
            {data.subheadline}
          </p>

          <div
            className={`${styles.heroCtaRow} in`}
           style={{ '--fy': '20px', '--t': '0.8s', '--d': '0.95s' } as React.CSSProperties}>
            <div className="press"  >
              <Link href="/quote" className="btn btn-primary">Request Your Free Quote</Link>
            </div>
            <div className="press"  >
              <a href="#whats-included" className="btn btn-secondary">See What's Included</a>
            </div>
          </div>
        </div>
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

      {/* ESTIMATOR CALLOUT
          Placed directly after "What's Included" — the visitor has just
          absorbed the full scope of the service, so the natural next
          question is "what does all that cost for MY home?" Deep-links
          into the estimator with this page's service pre-selected. */}
      {data.showEstimator !== false && (
      <section className={service.estimatorCallout}>
        <div className={service.estimatorCalloutInner}>
          <div className={service.estimatorCalloutLeft}>
            <p className={service.estimatorCalloutEyebrow}>
              INSTANT BALLPARK · NO SIGN-UP
            </p>
            <h2 className={`fraunces ${service.estimatorCalloutHead}`}>
              What would <em>your</em> {data.name.toLowerCase()} run?
            </h2>
            <p className={service.estimatorCalloutBody}>
              Answer a few quick questions about your home and get a ballpark
              price range
              {CREW_IS_FIXED_PAIR[ESTIMATE_SERVICE_BY_SLUG[data.slug] ?? 'regular']
                ? ' plus how long we’d be on site'
                : ''}
              . No email, no sign-up, no waiting.
            </p>
            <Link
              href={`/cleaning-time-estimator?service=${data.slug}`}
              className={service.estimatorCalloutBtn}
            >
              Get My Ballpark →
            </Link>
          </div>
          <div className={service.estimatorCalloutRight}>
            <div className={service.estimatorPreviewCard}>
              <div className={service.previewLabel}>EXAMPLE</div>
              <div className={service.previewLine}>3 Bedrooms · 2 Bathrooms</div>
              <div className={service.previewLine}>{data.name}</div>
              <div className={service.previewLine}>
                {exampleConditionLine(ESTIMATE_SERVICE_BY_SLUG[data.slug] ?? 'regular')}
              </div>
              <div className={service.previewResult}>
                <span className={service.previewResultCurrency}>$</span>
                <span className={service.previewResultNum}>
                  {computeEstimate(exampleInput(ESTIMATE_SERVICE_BY_SLUG[data.slug] ?? 'regular')).priceLow}
                </span>
                <span className={service.previewResultSep}>–</span>
                <span className={service.previewResultCurrency}>$</span>
                <span className={service.previewResultNum}>
                  {computeEstimate(exampleInput(ESTIMATE_SERVICE_BY_SLUG[data.slug] ?? 'regular')).priceHigh}
                </span>
              </div>
              <div className={service.previewSub}>
                {CREW_IS_FIXED_PAIR[ESTIMATE_SERVICE_BY_SLUG[data.slug] ?? 'regular']
                  ? 'with 2 cleaners on site · your home may differ'
                  : 'crew sized to your home · your home may differ'}
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* WHEN YOU NEED THIS */}
      <MotionSection className={service.scenariosSection}>
        <p className="eyebrow">WHEN YOU NEED THIS</p>
        <h2 className={`fraunces ${service.sectionHeadline}`}>
          Book a {data.name.toLowerCase()} <em>when</em>.
        </h2>
        <div className={service.scenariosGrid}>
          {data.scenarios.map((s, i) => (
            <div
              key={i}
              className={`${service.scenarioCard} lift`}
            >
              <div className={service.scenarioBullet}>✦</div>
              <h3 className={`fraunces ${service.scenarioTitle}`}>{s.title}</h3>
              <p className={service.scenarioBody}>{s.body}</p>
            </div>
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
              <div
                key={i}
                className={`${service.faqItem} ${open ? service.faqItemOpen : ''} lift`}
                onClick={() => setOpenFaq(open ? null : i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpenFaq(open ? null : i);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-expanded={open}
              >
                <div className={`fraunces ${service.faqQ}`}>
                  <span>{item.q}</span>
                  <span className={`${service.faqQIcon} acc-icon ${open ? 'acc-open' : ''}`} aria-hidden="true">
                    {open ? '−' : '+'}
                  </span>
                </div>
                {/* Always in the HTML (Google reads every answer); CSS opens/closes it. */}
                <div className={`acc ${open ? 'acc-open' : ''}`}>
                  <div>
                    <div className={service.faqA}>{item.a}</div>
                  </div>
                </div>
              </div>
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
        {/* Estimator entry point removed here — it now lives as a full
            callout band directly after "What's Included", where visitors
            actually ask the price question. Keeping both was redundant. */}
      </MotionSection>

      <SiteFooter />
    </main>
  );
}
