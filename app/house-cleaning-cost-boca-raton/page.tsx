import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '../_components/SiteHeader';
import SiteFooter from '../_components/SiteFooter';
import JsonLd from '../_components/JsonLd';
import HeroVideoMobile from '../_components/HeroVideoMobile';
import { QUOTE_ADD_ONS, computeQuoteBallpark, homeSizeForBedrooms, type QuoteServiceKey } from '../_lib/quoteBallpark';
import { DEFAULT_SQFT_FOR_HOME, SQFT_BAND_VALUE } from '../_lib/estimate';
import styles from './page.module.css';

/**
 * PRICE GUIDE — "How much does house cleaning cost in Boca Raton?" (owner, 2026-11-02).
 *
 * Why this page exists: the homepage card no longer shows a price (it put some people off
 * before we'd talked to them), but price is one of the most-searched questions about house
 * cleaning, on Google AND in ChatGPT / Claude / Perplexity. This page answers it properly:
 *  - a direct answer in the first lines (what AI assistants and Google snippets quote),
 *  - every number COMPUTED from the same estimator the quote form and lead email use
 *    (computeQuoteBallpark), so a price change in estimate.ts updates this page by itself,
 *  - local market ranges with their sources, what changes the price, what's included,
 *  - FAQPage + BreadcrumbList schema.
 */

const URL = 'https://ultrashinecleaningfl.com/house-cleaning-cost-boca-raton';

export const metadata: Metadata = {
  title: { absolute: 'How Much Does House Cleaning Cost in Boca Raton? (2026 Prices) · Ultra Shine' },
  description:
    'Real 2026 house cleaning prices in Boca Raton: regular, deep, move-out and post-construction cleaning by home size, what changes the price, and an instant estimate.',
  alternates: { canonical: URL },
  openGraph: {
    title: 'How Much Does House Cleaning Cost in Boca Raton? (2026)',
    description: 'Local prices by home size, what changes them, and an instant estimate for your home.',
    url: URL,
    type: 'article',
  },
};

type Row = { label: string; beds: number; baths: number };
const ROWS: Row[] = [
  { label: '1–2 bed · 1–2 bath', beds: 2, baths: 2 },
  { label: '3 bed · 2 bath', beds: 3, baths: 2 },
  { label: '4 bed · 3 bath', beds: 4, baths: 3 },
  { label: '5 bed · 4 bath', beds: 5, baths: 4 },
];

function range(service: Exclude<QuoteServiceKey, 'commercial'>, frequency: 'one' | 'weekly' | 'biweekly' | 'monthly', beds: number, baths: number) {
  const sqft = SQFT_BAND_VALUE[DEFAULT_SQFT_FOR_HOME[homeSizeForBedrooms(beds)]];
  const r = computeQuoteBallpark({ service, frequency, bedrooms: beds, bathrooms: baths, sqft, floors: 1, addOns: [] });
  return r ? `$${r.low.toLocaleString('en-US')}–$${r.high.toLocaleString('en-US')}` : 'Custom quote';
}

export default function CostGuidePage() {
  const typical = {
    biweekly: range('regular', 'biweekly', 3, 2),
    weekly: range('regular', 'weekly', 3, 2),
    monthly: range('regular', 'monthly', 3, 2),
    oneTime: range('regular', 'one', 3, 2),
    deep: range('deep', 'one', 3, 2),
    move: range('move', 'one', 3, 2),
    post: range('post', 'one', 3, 2),
  };

  const FAQ: { q: string; a: string }[] = [
    {
      q: 'How much does a house cleaning cost in Boca Raton?',
      a: `For a typical 3-bedroom, 2-bathroom home, a recurring bi-weekly cleaning is ${typical.biweekly} per visit, a one-time regular cleaning ${typical.oneTime}, a deep cleaning ${typical.deep} and a move-out cleaning ${typical.move}. Your exact price is confirmed after a quick walkthrough.`,
    },
    {
      q: 'Do you charge by the hour?',
      a: 'No. You get a price range before we start, confirmed at a short walkthrough, so you never pay more because a visit took longer.',
    },
    {
      q: 'Why does the first cleaning cost more?',
      a: 'The first visit resets the home: baseboards, grout, fixtures and buildup that regular visits don’t cover. After that, regular visits keep it there and take less time, so they cost less.',
    },
    {
      q: 'Is it cheaper to have my house cleaned weekly or monthly?',
      a: `Per visit, weekly and bi-weekly cleanings cost less than monthly because the home never builds up. For a 3-bed, 2-bath home: weekly ${typical.weekly}, bi-weekly ${typical.biweekly}, monthly ${typical.monthly} per visit.`,
    },
    {
      q: 'How much is a deep cleaning in Boca Raton?',
      a: `A deep cleaning of a 3-bedroom, 2-bathroom home is ${typical.deep}. It includes hand-wiped baseboards and door frames, scrubbed grout, ceiling fans, light fixtures, vents and a degreased range hood and stovetop.`,
    },
    {
      q: 'What does a move-out cleaning cost?',
      a: `A move-out cleaning of a 3-bedroom, 2-bathroom home is ${typical.move}. Inside the oven, fridge, cabinets and windows are add-ons; most move-outs add them because landlords check.`,
    },
    {
      q: 'Are supplies included in the price?',
      a: 'Yes. We bring the products, cloths, vacuums and mops. Our products are pet- and kid-safe by default, and we can use your own products if you prefer.',
    },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://ultrashinecleaningfl.com/' },
      { '@type': 'ListItem', position: 2, name: 'House cleaning prices', item: URL },
    ],
  };

  return (
    <main>
      <JsonLd data={[faqSchema, crumbs]} />
      <SiteHeader inPage={false} />

      <section className={styles.hero}>
        <div className={styles.wrap}>
          <p className={styles.crumb}>
            <Link href="/">Home</Link> / <span>House cleaning prices</span>
          </p>
          <h1 className={styles.h1}>
            How much does house cleaning cost in <em>Boca Raton</em>? (2026)
          </h1>
          <p className={styles.sub}>
            Real local prices, what changes them, and an instant estimate for your home. No email needed to see the numbers.
          </p>
          <span className={styles.updated}>Updated November 2026 · prices checked against local sources</span>
        </div>
      </section>

      <div className={styles.wrap}>
        <section className={styles.answer} aria-labelledby="short-answer">
          <div>
            <h2 id="short-answer" className={styles.answerKick}>
              THE SHORT ANSWER
            </h2>
            <p>
              Most Boca Raton homes pay <b>{typical.biweekly} per visit</b> for a recurring bi-weekly cleaning of a 3-bedroom,
              2-bath home. A one-time <b>deep cleaning</b> of the same home is <b>{typical.deep}</b>, and a{' '}
              <b>move-out cleaning {typical.move}</b>. Bigger homes, more bathrooms and longer gaps between cleanings cost more;
              weekly and bi-weekly cost less per visit than a one-time clean.
            </p>
          </div>
          <div className={styles.bigp}>
            <div>
              <small>Regular, bi-weekly</small>
              <b>{typical.biweekly}</b>
            </div>
            <div>
              <small>Deep cleaning</small>
              <b>{typical.deep}</b>
            </div>
            <div>
              <small>Move-in / move-out</small>
              <b>{typical.move}</b>
            </div>
            <div>
              <small>Post-construction</small>
              <b>{typical.post}</b>
            </div>
          </div>
        </section>

        <div className={styles.grid}>
          <aside className={styles.side} aria-label="Instant estimate">
            <HeroVideoMobile mode="card" showPrice />
            <p className={styles.sideNote}>
              Prefer to talk? Call or text <a href="tel:5615836694">(561) 583-6694</a>.
            </p>
          </aside>

          <article className={styles.body}>
            <h2>House cleaning prices by home size</h2>
            <p>
              Our price ranges for a typical home of each size, one floor, no add-ons. Your exact price is confirmed after a quick
              walkthrough, before anything is booked.
            </p>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Home</th>
                    <th>Bi-weekly</th>
                    <th>Weekly</th>
                    <th>Monthly</th>
                    <th>One-time</th>
                    <th>Deep</th>
                    <th>Move-out</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r) => (
                    <tr key={r.label}>
                      <td>{r.label}</td>
                      <td>
                        <b>{range('regular', 'biweekly', r.beds, r.baths)}</b>
                      </td>
                      <td>{range('regular', 'weekly', r.beds, r.baths)}</td>
                      <td>{range('regular', 'monthly', r.beds, r.baths)}</td>
                      <td>{range('regular', 'one', r.beds, r.baths)}</td>
                      <td>{range('deep', 'one', r.beds, r.baths)}</td>
                      <td>{range('move', 'one', r.beds, r.baths)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.small}>
              Post-construction cleaning starts around {range('post', 'one', 2, 2)} for a small home and is quoted after we see the
              site. <Link href="/services/commercial">Commercial cleaning</Link> is priced after a walkthrough of the space.
            </p>

            <h2>
              How we compare to <em>Boca Raton</em> averages
            </h2>
            <p>
              Local price surveys put a standard house cleaning in Boca Raton at roughly $90–$180 and a deep cleaning at $230–$600
              (HomeGuide), with average cleanings around $146–$182 (Homeyou). Independent cleaners on marketplaces advertise about
              $23–$24 an hour (Care.com), but that is usually one person, often without insurance, using your supplies and billing
              by the hour. Our ranges sit inside the local market for an insured, bonded team that brings everything and agrees the
              price before starting.
            </p>
            <div className={styles.vs}>
              <div className={styles.them}>
                <h3>A typical hourly cleaner</h3>
                <ul>
                  <li>Paid by the hour, so a slow visit costs you more</li>
                  <li>Often no insurance or bond</li>
                  <li>You buy the supplies</li>
                  <li>Whoever is free that day</li>
                  <li>No re-clean if something is missed</li>
                </ul>
              </div>
              <div className={styles.us}>
                <h3>Ultra Shine Cleaning</h3>
                <ul>
                  <li>A price range agreed before we start</li>
                  <li>Insured, bonded and background-checked</li>
                  <li>We bring products, cloths, vacuums and mops</li>
                  <li>The same crew for recurring clients</li>
                  <li>Not happy? Tell us within 24 hours and we come back free</li>
                </ul>
              </div>
            </div>

            <h2>What changes the price of a house cleaning</h2>
            <div className={styles.factors}>
              <div>
                <b>Size and bathrooms</b>
                <span>Square footage sets the base; bathrooms take the longest per square foot.</span>
              </div>
              <div>
                <b>How often</b>
                <span>Weekly and bi-weekly homes stay maintained, so each visit is quicker and costs less.</span>
              </div>
              <div>
                <b>Condition</b>
                <span>A first cleaning, or a home that hasn’t been cleaned in months, needs a deep clean to reset it.</span>
              </div>
              <div>
                <b>Pets and floors</b>
                <span>Pet hair and multiple floors add time; we factor both in at the walkthrough.</span>
              </div>
            </div>

            <h2>Add-on prices</h2>
            <div className={`${styles.tableWrap} ${styles.tableNarrow}`}>
              <table>
                <thead>
                  <tr>
                    <th>Add-on</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {QUOTE_ADD_ONS.map((a) => (
                    <tr key={a.key}>
                      <td>{a.name}</td>
                      <td>{a.label.replace(/^\+/, '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.small}>
              Post-construction cleaning already includes inside cabinets and inside windows. Inside the oven and fridge are add-ons
              on every service.
            </p>

            <h2>What each service includes</h2>
            <ul className={styles.links}>
              <li>
                <Link href="/services/regular-cleaning">Regular cleaning</Link>: kitchen, bathrooms, dusting, floors, beds made if
                linens are left out. Weekly, bi-weekly or monthly.
              </li>
              <li>
                <Link href="/services/deep-cleaning">Deep cleaning</Link>: everything in regular plus baseboards, grout, ceiling
                fans, light fixtures, vents and a degreased range hood. Every ~90 days.
              </li>
              <li>
                <Link href="/services/move-in-out">Move-in / move-out cleaning</Link>: an empty home, wall to wall, built around
                what landlords check.
              </li>
              <li>
                <Link href="/services/post-construction">Post-construction cleaning</Link>: drywall dust, stickers, paint specks and
                grout haze, inside cabinets and windows included.
              </li>
            </ul>

            <h2>Questions about house cleaning prices</h2>
            <div className={styles.faq}>
              {FAQ.map((f, i) => (
                <details key={f.q} open={i === 0}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>

            <div className={styles.cta}>
              <div>
                <b>Want your exact price?</b>
                <p>Free quote by text within the hour. No obligation.</p>
              </div>
              <Link href="/quote" className="btn btn-primary">
                Get my free quote
              </Link>
            </div>

            <p className={styles.small}>
              Sources for local averages (checked November 2026):{' '}
              <a href="https://homeguide.com/fl/boca-raton/house-cleaning/" target="_blank" rel="noopener noreferrer">
                HomeGuide
              </a>
              ,{' '}
              <a href="https://www.homeyou.com/fl/house-cleaning-boca-raton-costs" target="_blank" rel="noopener noreferrer">
                Homeyou
              </a>
              ,{' '}
              <a href="https://www.care.com/cost/house-cleaning/boca-raton-fl" target="_blank" rel="noopener noreferrer">
                Care.com
              </a>
              . Also see <Link href="/pricing-philosophy">why we don’t list flat prices</Link> and our{' '}
              <Link href="/cleaning-time-estimator">cleaning time estimator</Link>.
            </p>
          </article>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
