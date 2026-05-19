'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '../_components/SiteHeader';
import SiteFooter from '../_components/SiteFooter';
import styles from './page.module.css';

/**
 * /cleaning-time-estimator — Interactive 5-question estimator that returns
 * a TIME RANGE (not a price). Respects Tiago's "no flat pricing" rule
 * while still giving visitors a useful gauge before they request a quote.
 *
 * Calculation:
 *   BASE hours = lookup by home size
 *   + bathroom adjustment (each over 2 adds 0.5h)
 *   + last-cleaned adjustment (recent/months/years/new construction)
 *   + pet adjustment (none/1-2/3+)
 *   × service multiplier (regular/deep/move-out/post-construction)
 *   range = ±15% on the result
 *   cleaners = 2 if total > 5h else 1
 *
 * Numbers are calibrated from industry-typical figures for South FL
 * homes. Honest disclaimer below the result reminds users this is a
 * rough estimate — actual quote happens after a walkthrough.
 */

type HomeSize = 'studio' | '2br' | '3br' | '4br' | '5br_plus';
type Service = 'regular' | 'deep' | 'moveout' | 'postconstruction';
type LastCleaned = 'recent' | 'months' | 'years' | 'construction';
type Pets = 'none' | 'few' | 'many';
type Frequency = 'one' | 'monthly' | 'biweekly' | 'weekly';

const HOME_BASE_HOURS: Record<HomeSize, number> = {
  studio: 2,
  '2br': 2.75,
  '3br': 3.75,
  '4br': 4.75,
  '5br_plus': 5.75,
};
const SERVICE_MULTIPLIER: Record<Service, number> = {
  regular: 1.0,
  deep: 1.5,
  moveout: 1.7,
  postconstruction: 2.0,
};
const LAST_CLEANED_HOURS: Record<LastCleaned, number> = {
  recent: 0,
  months: 0.75,
  years: 1.5,
  construction: 1.0,
};
const PET_HOURS: Record<Pets, number> = {
  none: 0,
  few: 0.4,
  many: 0.9,
};

const SERVICE_LABEL: Record<Service, string> = {
  regular: 'Regular Cleaning',
  deep: 'Deep Cleaning',
  moveout: 'Move-In / Move-Out',
  postconstruction: 'Post-Construction',
};

/* Hourly rate per cleaner. Premium South FL positioning (Boca/Palm Beach).
   Range varies by service complexity. */
const HOURLY_RATE_RANGE: Record<Service, [number, number]> = {
  regular: [45, 55],
  deep: [50, 60],
  moveout: [50, 60],
  postconstruction: [55, 65],
};

/* Frequency adjustment: recurring cleanings of the SAME home take less time
   per visit because the home stays maintained between visits. Only applies
   to regular cleaning (deep/moveout/postconstruction are one-time by nature). */
const FREQUENCY_MULTIPLIER: Record<Frequency, number> = {
  one: 1.0,        // one-time / no recurrence
  monthly: 0.92,   // 30 days between visits → light maintenance discount
  biweekly: 0.85,  // 14 days → noticeably easier
  weekly: 0.80,    // 7 days → cleanest baseline, biggest discount
};

const FREQUENCY_LABEL: Record<Frequency, string> = {
  one: 'One-Time',
  monthly: 'Monthly',
  biweekly: 'Bi-Weekly',
  weekly: 'Weekly',
};

/* Ultra Shine ALWAYS sends a pair — 2 cleaners on every job, always. */
const ALWAYS_CLEANERS = 2;

export default function CleaningTimeEstimatorPage() {
  const [homeSize, setHomeSize] = useState<HomeSize>('3br');
  const [bathrooms, setBathrooms] = useState(2);
  const [service, setService] = useState<Service>('regular');
  const [lastCleaned, setLastCleaned] = useState<LastCleaned>('recent');
  const [pets, setPets] = useState<Pets>('none');
  const [frequency, setFrequency] = useState<Frequency>('one');

  const estimate = useMemo(() => {
    const base = HOME_BASE_HOURS[homeSize];
    const bathroomAdj = Math.max(0, bathrooms - 2) * 0.5;
    const lastCleanedAdj = LAST_CLEANED_HOURS[lastCleaned];
    const petAdj = PET_HOURS[pets];
    const serviceMult = SERVICE_MULTIPLIER[service];

    // Frequency only discounts the per-visit time for REGULAR cleaning.
    // Deep/moveout/post-construction are inherently one-time scopes.
    const frequencyMult =
      service === 'regular' ? FREQUENCY_MULTIPLIER[frequency] : 1.0;

    const totalHours =
      (base + bathroomAdj + lastCleanedAdj + petAdj) * serviceMult * frequencyMult;
    const low = Math.max(1.5, Math.round(totalHours * 0.85 * 10) / 10);
    const high = Math.round(totalHours * 1.15 * 10) / 10;

    // Ultra Shine sends a pair to every job — always.
    const cleaners = ALWAYS_CLEANERS;
    const wallLow = Math.round((low / cleaners) * 10) / 10;
    const wallHigh = Math.round((high / cleaners) * 10) / 10;

    // Price: total person-hours × per-cleaner hourly rate range.
    // Round to nearest $10 so the output reads clean.
    const [rateLow, rateHigh] = HOURLY_RATE_RANGE[service];
    const priceLow = Math.round((low * rateLow) / 10) * 10;
    const priceHigh = Math.round((high * rateHigh) / 10) * 10;

    return { low, high, cleaners, wallLow, wallHigh, priceLow, priceHigh };
  }, [homeSize, bathrooms, service, lastCleaned, pets, frequency]);

  // Build a /quote URL that pre-fills the captured estimate as the
  // "notes" field so when Tiago opens the lead, the customer's whole
  // estimator session is right there. Keeps the form short while
  // preserving all the context.
  const quoteHref = useMemo(() => {
    const homeLabel: Record<HomeSize, string> = {
      studio: 'Studio / 1BR',
      '2br': '2BR',
      '3br': '3BR',
      '4br': '4BR',
      '5br_plus': '5+ BR',
    };
    const lastLabel: Record<LastCleaned, string> = {
      recent: 'within last month',
      months: 'months ago',
      years: 'years ago / never',
      construction: 'new build / just renovated',
    };
    const petsLabel: Record<Pets, string> = {
      none: 'no pets',
      few: '1-2 pets',
      many: '3+ pets',
    };
    const summary = [
      `Estimator: ${homeLabel[homeSize]}, ${bathrooms} bath${bathrooms > 1 ? 's' : ''}, ${SERVICE_LABEL[service]} (${FREQUENCY_LABEL[frequency]}), last cleaned ${lastLabel[lastCleaned]}, ${petsLabel[pets]}.`,
      `Ballpark: ${estimate.wallLow}-${estimate.wallHigh} hrs with ${estimate.cleaners} cleaners on site, $${estimate.priceLow}-$${estimate.priceHigh}.`,
      `Send precise quote within the hour.`,
    ].join(' ');
    const params = new URLSearchParams({
      service: SERVICE_LABEL[service],
      frequency: FREQUENCY_LABEL[frequency],
      notes: summary,
    });
    return `/quote?${params.toString()}`;
  }, [homeSize, bathrooms, service, lastCleaned, pets, frequency, estimate]);

  return (
    <main>
      <SiteHeader inPage={false} />

      {/* ============ HERO ============ */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <p className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span> / </span>
            <Link href="/services">Services</Link>
            <span> / </span>
            <span style={{ opacity: 0.8 }}>Time Estimator</span>
          </p>
          <p className={styles.eyebrow}>QUICK ESTIMATOR · 5 QUESTIONS · NO SIGN-UP</p>
          <h1 className={`fraunces ${styles.headline}`}>
            How long will my cleaning <em>take</em>?
          </h1>
          <p className={styles.sub}>
            Pick the closest match for each question. We&apos;ll show you a
            rough time range based on what we typically see for South Florida homes.
            Your actual quote will be more precise after we walk through your space.
          </p>
        </div>
      </section>

      {/* ============ ESTIMATOR ============ */}
      <section className={styles.estimatorSection}>
        <div className={styles.grid}>
          {/* LEFT: Form */}
          <div className={styles.form}>
            {/* Q1 — Home size */}
            <div className={styles.field}>
              <div className={styles.fieldLabel}>
                <span className={styles.fieldNum}>01</span>
                <span>What size is your home?</span>
              </div>
              <div className={styles.options}>
                {(
                  [
                    ['studio', 'Studio / 1BR'],
                    ['2br', '2 Bedrooms'],
                    ['3br', '3 Bedrooms'],
                    ['4br', '4 Bedrooms'],
                    ['5br_plus', '5+ Bedrooms'],
                  ] as [HomeSize, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`${styles.optBtn} ${homeSize === value ? styles.optBtnActive : ''}`}
                    onClick={() => setHomeSize(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Q2 — Bathrooms */}
            <div className={styles.field}>
              <div className={styles.fieldLabel}>
                <span className={styles.fieldNum}>02</span>
                <span>How many bathrooms?</span>
              </div>
              <div className={styles.options}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`${styles.optBtn} ${bathrooms === n ? styles.optBtnActive : ''}`}
                    onClick={() => setBathrooms(n)}
                  >
                    {n === 5 ? '5+' : n}
                  </button>
                ))}
              </div>
            </div>

            {/* Q3 — Service */}
            <div className={styles.field}>
              <div className={styles.fieldLabel}>
                <span className={styles.fieldNum}>03</span>
                <span>Which service?</span>
              </div>
              <div className={styles.options}>
                {(Object.keys(SERVICE_LABEL) as Service[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`${styles.optBtn} ${service === s ? styles.optBtnActive : ''}`}
                    onClick={() => setService(s)}
                  >
                    {SERVICE_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Q4 — Last cleaned */}
            <div className={styles.field}>
              <div className={styles.fieldLabel}>
                <span className={styles.fieldNum}>04</span>
                <span>When was your last cleaning?</span>
              </div>
              <div className={styles.options}>
                {(
                  [
                    ['recent', 'Within the last month'],
                    ['months', 'A few months ago'],
                    ['years', 'Years ago / never'],
                    ['construction', 'New build / just renovated'],
                  ] as [LastCleaned, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`${styles.optBtn} ${lastCleaned === value ? styles.optBtnActive : ''}`}
                    onClick={() => setLastCleaned(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Q5 — Pets */}
            <div className={styles.field}>
              <div className={styles.fieldLabel}>
                <span className={styles.fieldNum}>05</span>
                <span>Pets in the home?</span>
              </div>
              <div className={styles.options}>
                {(
                  [
                    ['none', 'None'],
                    ['few', '1–2 pets'],
                    ['many', '3+ pets'],
                  ] as [Pets, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`${styles.optBtn} ${pets === value ? styles.optBtnActive : ''}`}
                    onClick={() => setPets(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Q6 — Frequency */}
            <div className={styles.field}>
              <div className={styles.fieldLabel}>
                <span className={styles.fieldNum}>06</span>
                <span>How often do you want us?</span>
              </div>
              <div className={styles.options}>
                {(Object.keys(FREQUENCY_LABEL) as Frequency[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`${styles.optBtn} ${frequency === f ? styles.optBtnActive : ''}`}
                    onClick={() => setFrequency(f)}
                  >
                    {FREQUENCY_LABEL[f]}
                  </button>
                ))}
              </div>
              {service === 'regular' && frequency !== 'one' && (
                <p className={styles.fieldNote}>
                  ✓ Recurring homes stay maintained between visits — your
                  per-visit time {frequency === 'weekly' ? 'drops 20%' : frequency === 'biweekly' ? 'drops 15%' : 'drops 8%'} vs a one-time clean.
                </p>
              )}
              {service !== 'regular' && (
                <p className={styles.fieldNote}>
                  {SERVICE_LABEL[service]} is typically a one-time scope.
                  Pair it with regular cleaning to keep that result.
                </p>
              )}
            </div>
          </div>

          {/* RIGHT: Result card (sticky) */}
          <aside className={styles.result}>
            <div className={styles.resultInner}>
              <p className={styles.resultLabel}>YOUR ESTIMATE</p>

              {/* PRICE — the headline number. What every visitor came
                  here to know. Bigger + more prominent than the hours. */}
              <div className={styles.resultPriceRow}>
                <span className={styles.resultPriceCurrency}>$</span>
                <span className={styles.resultPriceLow}>{estimate.priceLow}</span>
                <span className={styles.resultPriceSep}>–</span>
                <span className={styles.resultPriceCurrency}>$</span>
                <span className={styles.resultPriceHigh}>{estimate.priceHigh}</span>
              </div>
              <p className={styles.resultPriceSub}>
                ballpark · {SERVICE_LABEL[service].toLowerCase()}
                {service === 'regular' && frequency !== 'one'
                  ? ` · ${FREQUENCY_LABEL[frequency].toLowerCase()}`
                  : ''}
              </p>

              <div className={styles.resultDividerSlim} />

              {/* TIME — secondary detail. Ultra Shine ALWAYS sends a pair. */}
              <div className={styles.resultMetaRow}>
                <div className={styles.resultMetaItem}>
                  <span className={styles.resultMetaValue}>
                    {estimate.wallLow}–{estimate.wallHigh}
                    <span className={styles.resultMetaUnit}> hrs</span>
                  </span>
                  <span className={styles.resultMetaLabel}>on site</span>
                </div>
                <div className={styles.resultMetaItem}>
                  <span className={styles.resultMetaValue}>2</span>
                  <span className={styles.resultMetaLabel}>cleaners (always)</span>
                </div>
              </div>

              {/* CTA — "Get My" possessive beats "Get a" per 2026 CRO data */}
              <Link href={quoteHref} className={styles.resultCta}>
                Get My Exact Quote →
              </Link>

              <p className={styles.resultDisclaimer}>
                Ballpark only. Final price depends on actual home condition —
                we send your exact quote within 1 hour after a quick walkthrough.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* ============ WHAT AFFECTS YOUR QUOTE ============ */}
      <section className={styles.factorsSection}>
        <div className={styles.factorsInner}>
          <p className="eyebrow">WHAT ACTUALLY AFFECTS YOUR QUOTE</p>
          <h2 className={`fraunces ${styles.factorsHead}`}>
            Beyond the basics, <em>these matter</em>.
          </h2>
          <div className={styles.factorsGrid}>
            <div className={styles.factorCard}>
              <div className={styles.factorNum}>01</div>
              <h3 className={styles.factorTitle}>Lived-in level</h3>
              <p className={styles.factorBody}>
                A spotless minimalist home and a busy family home with three
                kids take very different times — even at the same square footage.
              </p>
            </div>
            <div className={styles.factorCard}>
              <div className={styles.factorNum}>02</div>
              <h3 className={styles.factorTitle}>Add-ons requested</h3>
              <p className={styles.factorBody}>
                Inside oven, inside fridge, inside cabinets, inside windows —
                each adds 30 min to 2+ hours depending on size.
              </p>
            </div>
            <div className={styles.factorCard}>
              <div className={styles.factorNum}>03</div>
              <h3 className={styles.factorTitle}>Floor type + sqft</h3>
              <p className={styles.factorBody}>
                Tile + grout takes longer than hardwood. Carpet vacuum vs deep
                shampoo is a different scope. Specific sqft refines the estimate.
              </p>
            </div>
            <div className={styles.factorCard}>
              <div className={styles.factorNum}>04</div>
              <h3 className={styles.factorTitle}>Frequency</h3>
              <p className={styles.factorBody}>
                Recurring cleanings tend to take less time per visit because
                the home stays maintained — we factor that into the quote.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className={styles.finalCta}>
        <div className={styles.finalInner}>
          <p className="eyebrow" style={{ color: 'var(--white)', opacity: 0.7 }}>
            READY FOR THE REAL NUMBER?
          </p>
          <h2 className={`fraunces ${styles.finalHead}`}>
            Custom quote in your inbox <em>within an hour</em>.
          </h2>
          <p className={styles.finalSub}>
            We walk through your home, ask a few questions, send a precise
            estimate. No pressure, no obligation.
          </p>
          <Link href="/quote" className="btn btn-primary">
            Request Your Free Quote
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
