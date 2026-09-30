'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './HeroVideoMobile.module.css';
import { computeQuoteBallpark, homeSizeForBedrooms, type QuoteServiceKey } from '../_lib/quoteBallpark';
import { DEFAULT_SQFT_FOR_HOME, SQFT_BAND_VALUE } from '../_lib/estimate';

/**
 * Phone homepage hero — approved by Tiago 2026-09-30 ("design A, refined card").
 * Preview: 00_STATE/home-video-quote-preview/index.html
 *
 * Replaces the scroll-scrubbed canvas walkthrough (HeroScrollMobile) on phones:
 *  - the walkthrough video plays on its own (muted, looping, inline);
 *  - the quote starts on the first screen: service, beds, baths, how often,
 *    and a live price range from the SAME estimator /quote uses
 *    (computeQuoteBallpark) — the two can never disagree;
 *  - "Get my exact quote" opens /quote with every answer already filled in.
 *
 * SEO: the page's only h1 stays in app/page.tsx. This hero's headline is a <p>
 * (like the old one) and the card title is an h2 that says "cleaning". The
 * room-by-room copy the old phone hero carried is still in the DOM through
 * HeroScrollHome (desktop), so no indexed text is lost; on top of that the
 * phone no longer downloads 121 flipbook frames (~9 MB) — much faster paint.
 *
 * Desktop keeps HeroScrollHome. CSS hides this above 1024px and the effect
 * below never gives the video a src there, so desktop downloads none of it.
 *
 * id="us-hero-mobile" is kept on purpose: StickyQuoteCta waits until this
 * element has scrolled away before showing the floating Get Quote pill.
 */

type Service = Exclude<QuoteServiceKey, 'commercial'>;
type Freq = 'weekly' | 'biweekly' | 'monthly' | 'one';

const SERVICES: { key: Service; name: string; icon: JSX.Element }[] = [
  {
    key: 'regular',
    name: 'Regular',
    icon: (
      <>
        <path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
        <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
      </>
    ),
  },
  {
    key: 'deep',
    name: 'Deep clean',
    icon: (
      <>
        <path d="M12 2.7C8 7.5 6 10.9 6 13.8a6 6 0 0 0 12 0c0-2.9-2-6.3-6-11.1z" />
        <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
      </>
    ),
  },
  {
    key: 'move',
    name: 'Move in / out',
    icon: (
      <>
        <path d="M21 8l-9-5-9 5v8l9 5 9-5z" />
        <path d="M3 8l9 5 9-5M12 13v8" />
      </>
    ),
  },
  {
    key: 'post',
    name: 'Post-construction',
    icon: (
      <>
        <path d="M2 18h20v2H2z" />
        <path d="M5 18v-4a7 7 0 0 1 14 0v4" />
        <path d="M12 7V4M10 4h4" />
      </>
    ),
  },
];

const FREQS: { key: Freq; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'biweekly', label: 'Bi-weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'one', label: 'One-time' },
];

// The exact strings /quote already understands in its ?service= / ?frequency= prefill.
const SERVICE_PARAM: Record<Service, string> = {
  regular: 'Regular Cleaning',
  deep: 'Deep Cleaning',
  move: 'Move-In / Move-Out',
  post: 'Post-Construction',
};
const FREQ_PARAM: Record<Freq, string> = { one: 'One-Time', monthly: 'Monthly', biweekly: 'Bi-Weekly', weekly: 'Weekly' };

function sqftFor(beds: number) {
  return SQFT_BAND_VALUE[DEFAULT_SQFT_FOR_HOME[homeSizeForBedrooms(beds)]];
}

/** Eases the price between values so a change feels alive, not jumpy. */
function useTween(target: number) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 380);
      const e = 1 - Math.pow(1 - k, 3);
      setV(Math.round(a + (target - a) * e));
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      from.current = target;
    };
  }, [target]);
  return v;
}

export default function HeroVideoMobile({ rating = 5.0 }: { rating?: number }) {
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [service, setService] = useState<Service>('regular');
  const [freq, setFreq] = useState<Freq>('biweekly');
  const [beds, setBeds] = useState(3);
  const [baths, setBaths] = useState(2);

  // Only phones load the video: no src until we know the phone layout is on
  // screen. Reduced-motion and Save-Data visitors keep the still poster.
  // It also pauses once scrolled away, so it never runs the battery down.
  useEffect(() => {
    const v = videoRef.current;
    const hero = heroRef.current;
    if (!v || !hero) return;
    if (window.matchMedia('(min-width: 1025px)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return;
    v.src = '/videos/hero_mobile.mp4';
    const play = () => v.play().catch(() => {
      /* Low Power Mode blocks autoplay — the poster frame stays, which is fine. */
    });
    play();
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? play() : v.pause()), { threshold: 0.05 });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  const recurring = service === 'regular' && freq !== 'one';
  const bp = useMemo(
    () =>
      computeQuoteBallpark({
        service,
        frequency: service === 'regular' ? freq : 'one',
        bedrooms: beds,
        bathrooms: baths,
        sqft: sqftFor(beds),
        floors: 1,
        addOns: [],
      }),
    [service, freq, beds, baths],
  );
  const low = useTween(bp?.low ?? 0);
  const high = useTween(bp?.high ?? 0);

  const href = useMemo(() => {
    const p = new URLSearchParams({
      service: SERVICE_PARAM[service],
      frequency: FREQ_PARAM[service === 'regular' ? freq : 'one'],
      bedrooms: String(beds),
      bathrooms: String(baths),
      sqft: String(sqftFor(beds)), // same size the estimate above used, so /quote shows the same range
      src: 'home',
    });
    return `/quote?${p.toString()}`;
  }, [service, freq, beds, baths]);

  const freqIndex = FREQS.findIndex((f) => f.key === freq);

  return (
    <section ref={heroRef} id="us-hero-mobile" className={styles.hero} aria-labelledby="us-hero-mobile-title">
      <video
        ref={videoRef}
        className={styles.video}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
      />
      <div className={styles.shade} aria-hidden="true" />

      <div className={styles.copy}>
        <p className={styles.eyebrow}>House cleaning · Boca Raton, FL</p>
        <p className={styles.headline}>
          A home that <em>shines</em>.
        </p>
        <p className={styles.rate}>
          <b aria-hidden="true">★★★★★</b> {rating.toFixed(1)} on Google
        </p>
      </div>

      <div className={styles.card}>
        <p className={styles.kick}>
          <i aria-hidden="true" /> Instant estimate
        </p>
        <h2 id="us-hero-mobile-title" className={styles.title}>
          What would your <em>cleaning</em> cost?
        </h2>

        <div className={styles.services} role="radiogroup" aria-label="Type of cleaning">
          {SERVICES.map((s) => (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={service === s.key}
              className={`${styles.svc} ${service === s.key ? styles.svcOn : ''}`}
              onClick={() => setService(s.key)}
            >
              <span className={styles.svcIco}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {s.icon}
                </svg>
              </span>
              {s.name}
            </button>
          ))}
        </div>

        <div className={styles.steppers}>
          <Stepper label="Bedrooms" short="Beds" value={beds} min={1} max={6} onChange={setBeds} />
          <Stepper label="Bathrooms" short="Baths" value={baths} min={1} max={5} onChange={setBaths} />
        </div>

        {service === 'regular' && (
          <div className={styles.seg} role="radiogroup" aria-label="How often">
            <span className={styles.segPill} style={{ transform: `translateX(${freqIndex * 100}%)` }} aria-hidden="true" />
            {FREQS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={freq === f.key}
                className={`${styles.segBtn} ${freq === f.key ? styles.segOn : ''}`}
                onClick={() => setFreq(f.key)}
              >
                {f.label}
                {f.key === 'biweekly' && <small>most popular</small>}
              </button>
            ))}
          </div>
        )}

        <div className={styles.price} aria-live="polite">
          <div>
            <span className={styles.priceLab}>Estimate</span>
            <span className={styles.priceVal}>
              {bp ? `$${low.toLocaleString()}–$${high.toLocaleString()}` : 'Custom quote'}
            </span>
          </div>
          <span className={styles.per}>{recurring ? 'per visit' : 'one-time'}</span>
        </div>

        <Link href={href} className={styles.cta}>
          Get my exact quote
          <i aria-hidden="true">→</i>
        </Link>
        <p className={styles.trust}>
          <b aria-hidden="true">★★★★★</b> {rating.toFixed(1)} Google <span aria-hidden="true" /> Text reply within the hour
        </p>
      </div>
    </section>
  );
}

function Stepper({
  label,
  short,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  short: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className={styles.stepper}>
      <span className={styles.stLabel}>
        <span className={styles.stLong}>{label}</span>
        <span className={styles.stShort} aria-hidden="true">{short}</span>
      </span>
      <div>
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <b aria-label={`${value}${value === max ? ' or more' : ''} ${label.toLowerCase()}`}>{value === max ? `${value}+` : value}</b>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}
