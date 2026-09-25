'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '../_components/SiteHeader';
import SiteFooter from '../_components/SiteFooter';
import styles from './page.module.css';

/**
 * /cleaning-time-estimator — interactive ballpark calculator.
 *
 * The FORMULA lives in app/_lib/estimate.ts, not here. That file is also
 * read by the "EXAMPLE" price card on /services and every service page, so
 * the calculator and the cards can never show different numbers for the same
 * home. Change pricing there, never here.
 *
 * Honest disclaimer below the result reminds visitors this is a ballpark —
 * the actual quote happens after a walkthrough.
 */

import {
  computeEstimate,
  CREW_IS_FIXED_PAIR,
  DEFAULT_SQFT_FOR_HOME,
  FREQUENCY_LABEL,
  SERVICE_LABEL,
  SQFT_BAND_LABEL,
  type Floors,
  type Frequency,
  type HomeSize,
  type LastCleaned,
  type Pets,
  type Service,
  type SqftBand,
} from '../_lib/estimate';

/**
 * Maps a `?service=` URL param to the internal Service key. Lets the five
 * service pages deep-link into the estimator with their own service already
 * selected — e.g. /cleaning-time-estimator?service=deep from the Deep
 * Cleaning page. Falls back to 'regular' for unknown values.
 */
function serviceFromParam(raw: string | null): Service {
  if (!raw) return 'regular';
  const key = raw.toLowerCase().replace(/[^a-z]/g, '');
  const map: Record<string, Service> = {
    regular: 'regular',
    regularcleaning: 'regular',
    deep: 'deep',
    deepcleaning: 'deep',
    moveout: 'moveout',
    movein: 'moveout',
    moveinout: 'moveout',
    moveinmoveout: 'moveout',
    postconstruction: 'postconstruction',
    // Commercial has no estimator profile of its own — post-construction
    // is the closest analogue in scope, but default to regular so we don't
    // over-quote an office. Commercial always needs a custom walkthrough.
    commercial: 'regular',
  };
  return map[key] ?? 'regular';
}

export default function CleaningTimeEstimatorPage() {
  const [homeSize, setHomeSize] = useState<HomeSize>('3br');
  // Square footage follows the bedroom pick until the visitor chooses a band
  // themselves — then their choice sticks. Most people know bedrooms before
  // they know square feet, so this gives a sensible answer with zero effort.
  const [sqft, setSqft] = useState<SqftBand>(DEFAULT_SQFT_FOR_HOME['3br']);
  const [sqftTouched, setSqftTouched] = useState(false);
  const [floors, setFloors] = useState<Floors>(1);
  const [bathrooms, setBathrooms] = useState(2);
  const [service, setService] = useState<Service>('regular');
  const [lastCleaned, setLastCleaned] = useState<LastCleaned>('recent');
  const [pets, setPets] = useState<Pets>('none');
  const [frequency, setFrequency] = useState<Frequency>('one');

  // Pre-select the service when arriving from a service page deep-link.
  // Runs once on mount — after this the user's own clicks take over.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const fromParam = params.get('service');
    if (fromParam) setService(serviceFromParam(fromParam));
  }, []);

  // Keep square footage in step with bedrooms until the visitor picks it.
  function pickHomeSize(value: HomeSize) {
    setHomeSize(value);
    if (!sqftTouched) setSqft(DEFAULT_SQFT_FOR_HOME[value]);
  }

  const estimate = useMemo(
    () =>
      computeEstimate({
        homeSize,
        sqft,
        floors,
        bathrooms,
        service,
        lastCleaned,
        pets,
        frequency,
      }),
    [homeSize, sqft, floors, bathrooms, service, lastCleaned, pets, frequency],
  );

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
      `Estimator: ${homeLabel[homeSize]}, ${SQFT_BAND_LABEL[sqft]} sq ft, ${floors === 3 ? '3+' : floors} floor${floors > 1 ? 's' : ''}, ${bathrooms} bath${bathrooms > 1 ? 's' : ''}, ${SERVICE_LABEL[service]} (${FREQUENCY_LABEL[frequency]}), last cleaned ${lastLabel[lastCleaned]}, ${petsLabel[pets]}.`,
      CREW_IS_FIXED_PAIR[service]
        ? `Ballpark: ${estimate.wallLow}-${estimate.wallHigh} hrs with ${estimate.cleaners} cleaners on site, $${estimate.priceLow}-$${estimate.priceHigh}.`
        : `Ballpark: $${estimate.priceLow}-$${estimate.priceHigh}, crew size set at walkthrough.`,
      `Send precise quote within the hour.`,
    ].join(' ');
    const params = new URLSearchParams({
      service: SERVICE_LABEL[service],
      frequency: FREQUENCY_LABEL[frequency],
      notes: summary,
    });
    return `/quote?${params.toString()}`;
  }, [homeSize, sqft, floors, bathrooms, service, lastCleaned, pets, frequency, estimate]);

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
          {/* Deliberately no question COUNT in copy anywhere — it said "6"
              in five places and went stale the moment two were added. */}
          <p className={styles.eyebrow}>QUICK ESTIMATOR · UNDER A MINUTE · NO SIGN-UP</p>
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
                    onClick={() => pickHomeSize(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Q2 — Square footage. Added 2026-09-24: without it, every 5+ bed
                home priced the same, so large homes were badly under-quoted. */}
            <div className={styles.field}>
              <div className={styles.fieldLabel}>
                <span className={styles.fieldNum}>02</span>
                <span>Roughly how many square feet?</span>
              </div>
              <div className={styles.options}>
                {(Object.keys(SQFT_BAND_LABEL) as SqftBand[]).map((band) => (
                  <button
                    key={band}
                    type="button"
                    className={`${styles.optBtn} ${sqft === band ? styles.optBtnActive : ''}`}
                    onClick={() => {
                      setSqft(band);
                      setSqftTouched(true);
                    }}
                  >
                    {SQFT_BAND_LABEL[band]}
                  </button>
                ))}
              </div>
              {!sqftTouched && (
                <p className={styles.fieldNote}>
                  Pre-filled from your bedrooms. Tap your real size for a tighter number.
                </p>
              )}
            </div>

            {/* Q3 — Floors. Stairs, rails and a second set of everything. */}
            <div className={styles.field}>
              <div className={styles.fieldLabel}>
                <span className={styles.fieldNum}>03</span>
                <span>How many floors?</span>
              </div>
              <div className={styles.options}>
                {([1, 2, 3] as Floors[]).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`${styles.optBtn} ${floors === n ? styles.optBtnActive : ''}`}
                    onClick={() => setFloors(n)}
                  >
                    {n === 3 ? '3+' : n}
                  </button>
                ))}
              </div>
            </div>

            {/* Q4 — Bathrooms */}
            <div className={styles.field}>
              <div className={styles.fieldLabel}>
                <span className={styles.fieldNum}>04</span>
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

            {/* Q5 — Service */}
            <div className={styles.field}>
              <div className={styles.fieldLabel}>
                <span className={styles.fieldNum}>05</span>
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

            {/* Q6 — Last cleaned */}
            <div className={styles.field}>
              <div className={styles.fieldLabel}>
                <span className={styles.fieldNum}>06</span>
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

            {/* Q7 — Pets */}
            <div className={styles.field}>
              <div className={styles.fieldLabel}>
                <span className={styles.fieldNum}>07</span>
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

            {/* Q8 — Frequency */}
            <div className={styles.field}>
              <div className={styles.fieldLabel}>
                <span className={styles.fieldNum}>08</span>
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

              {/* TIME — secondary detail. Only regular + move-in/out are a
                  fixed pair. Deep + post-construction crews are sized to the
                  home, so neither a crew count nor an on-site time is shown. */}
              {CREW_IS_FIXED_PAIR[service] ? (
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
              ) : (
                <div className={styles.resultMetaRow}>
                  <div className={styles.resultMetaItem}>
                    <span className={styles.resultMetaLabel}>
                      Crew sized to your home · set at the walkthrough
                    </span>
                  </div>
                </div>
              )}

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
                shampoo is a different scope. Your square footage sets the baseline;
                floors and finishes refine it.
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
