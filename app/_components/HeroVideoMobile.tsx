'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './HeroVideoMobile.module.css';
import {
  QUOTE_ADD_ONS,
  addOnIncluded,
  computeQuoteBallpark,
  homeSizeForBedrooms,
  type QuoteAddOnKey,
  type QuoteServiceKey,
} from '../_lib/quoteBallpark';
import { DEFAULT_SQFT_FOR_HOME, SQFT_BAND_VALUE } from '../_lib/estimate';

/**
 * Phone homepage hero — approved by Tiago 2026-09-30 ("design A, refined card"),
 * then 2026-10-01: the WHOLE quote happens inside this one card, in 3 steps that
 * slide sideways inside the same rounded box. Nobody is sent to /quote to type
 * everything again.
 * Previews: 00_STATE/home-video-quote-preview (step 1) and
 *           00_STATE/home-quote-steps-preview (steps 2, 3 and "sent").
 *
 *  1 · Instant estimate — service, beds, baths, how often, live price.
 *  2 · Where's home?   — street, ZIP, city + optional extras (price follows).
 *  3 · Where do we send it? — full name, mobile, email, note → POST /api/quote,
 *      the SAME endpoint and payload as /quote, so the email, Admin → Leads and
 *      Insights get exactly what they get today.
 *  ✓ · Sent — confirmation inside the card.
 *
 * The price comes from computeQuoteBallpark (the estimator /quote and the lead
 * email use), so the card, the email and the server can never disagree.
 *
 * Layout: every step sits in the same grid cell, so the card is always as tall
 * as its tallest step (step 1) and never grows down the page. Steps that aren't
 * showing are visibility:hidden (after the slide), so the keyboard can't tab
 * into them and a focused box can't drag the card sideways.
 *
 * SEO: the page's only h1 stays in app/page.tsx; the card title is an h2 that
 * says "cleaning". Desktop keeps HeroScrollHome; CSS hides this above 1024px and
 * the video never gets a src there.
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

// Same names /quote sends, so the lead email reads the same either way.
const SERVICE_NAME: Record<Service, string> = {
  regular: 'Regular Cleaning',
  deep: 'Deep Cleaning',
  move: 'Move In / Out',
  post: 'Post-Construction',
};
const FREQ_NAME: Record<Freq, string> = { one: 'One-Time', monthly: 'Monthly', biweekly: 'Bi-Weekly', weekly: 'Weekly' };

// Short labels so two extras fit side by side on a phone. Prices come from the shared table.
const ADD_SHORT: Record<QuoteAddOnKey, string> = {
  oven: 'Inside oven',
  fridge: 'Inside fridge',
  windows: 'Windows',
  cabinets: 'Cabinets',
  laundry: 'Laundry fold',
  pet: 'Pet-safe',
};
function shortPrice(label: string) {
  return label.replace('$40–$60', '$40–60').replace('$40–$100', '$40–100').replace(/\$5–\$10 \/ \w+/, '$5–10 ea');
}

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

const digits = (s: string) => s.replace(/\D/g, '');

export default function HeroVideoMobile({ rating = 5.0 }: { rating?: number }) {
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [step, setStep] = useState(0);
  // step 1
  const [service, setService] = useState<Service>('regular');
  const [freq, setFreq] = useState<Freq>('biweekly');
  const [beds, setBeds] = useState(3);
  const [baths, setBaths] = useState(2);
  // step 2
  const [street, setStreet] = useState('');
  const [zip, setZip] = useState('');
  const [city, setCity] = useState('Boca Raton');
  const [addOns, setAddOns] = useState<QuoteAddOnKey[]>([]);
  // step 3
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  // sending
  const [bad, setBad] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);

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

  const frequency: Freq = service === 'regular' ? freq : 'one';
  const recurring = frequency !== 'one';
  const bp = useMemo(
    () =>
      computeQuoteBallpark({
        service,
        frequency,
        bedrooms: beds,
        bathrooms: baths,
        sqft: sqftFor(beds),
        floors: 1,
        addOns,
      }),
    [service, frequency, beds, baths, addOns],
  );
  const low = useTween(bp?.low ?? 0);
  const high = useTween(bp?.high ?? 0);
  const priceText = bp ? `$${low.toLocaleString()}–$${high.toLocaleString()}` : 'Custom quote';

  const summary = `${SERVICES.find((s) => s.key === service)?.name}${service === 'regular' ? ` · ${FREQS.find((f) => f.key === freq)?.label}` : ''} · ${beds} bd · ${baths} ba`;

  const okStreet = street.trim().length > 3;
  const okZip = /^\d{5}$/.test(zip);
  const okName = name.trim().length > 1;
  const okPhone = digits(phone).length >= 10;
  const okEmail = !email.trim() || /^\S+@\S+\.\S+$/.test(email.trim());

  function toggleAddOn(k: QuoteAddOnKey) {
    setAddOns((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }
  function clearBad(id: string) {
    if (bad.includes(id)) setBad((b) => b.filter((x) => x !== id));
  }
  function next() {
    const missing = [!okStreet && 'street', !okZip && 'zip'].filter(Boolean) as string[];
    if (missing.length) return setBad(missing);
    setBad([]);
    setStep(2);
  }

  async function send() {
    const missing = [!okName && 'name', !okPhone && 'phone', !okEmail && 'email'].filter(Boolean) as string[];
    if (missing.length) return setBad(missing);
    setBad([]);
    setSending(true);
    setSendError(false);
    const [first, ...rest] = name.trim().split(/\s+/);
    const payload = {
      service: SERVICE_NAME[service],
      frequency: FREQ_NAME[frequency],
      serviceKey: service,
      frequencyKey: frequency,
      addOnKeys: addOns,
      addOns: addOns.map((k) => QUOTE_ADD_ONS.find((a) => a.key === k)?.name),
      bedrooms: beds,
      bathrooms: baths,
      sqft: sqftFor(beds),
      floors: 1,
      street: street.trim(),
      city: city.trim(),
      zip,
      contact: { first, last: rest.join(' '), phone: phone.trim(), email: email.trim() },
      notes: notes.trim() ? `${notes.trim()}\n(Sent from the homepage quote card.)` : '(Sent from the homepage quote card.)',
      submittedAt: new Date().toISOString(),
    };
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStep(3);
    } catch {
      setSendError(true);
    } finally {
      setSending(false);
    }
  }

  const freqIndex = FREQS.findIndex((f) => f.key === freq);
  const paneClass = (i: number) => `${styles.pane} ${i === step ? styles.paneOn : ''}`;
  const paneStyle = (i: number) => ({ transform: `translateX(${(i - step) * 100}%)` });
  const fieldClass = (id: string) => `${styles.field} ${bad.includes(id) ? styles.fieldBad : ''}`;

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

      <div className={`${styles.copy} ${step > 0 ? styles.copyAway : ''}`}>
        <p className={styles.eyebrow}>House cleaning · Boca Raton, FL</p>
        <p className={styles.headline}>
          A home that <em>shines</em>.
        </p>
        <p className={styles.rate}>
          <b aria-hidden="true">★★★★★</b> {rating.toFixed(1)} on Google
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.track}>
          {/* ---------- STEP 1 · instant estimate ---------- */}
          <div className={paneClass(0)} style={paneStyle(0)} aria-hidden={step !== 0}>
            <div className={styles.paneHead}>
              <p className={styles.kick}>
                <i aria-hidden="true" /> Instant estimate
              </p>
              <Dots n={1} />
            </div>
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

            <div
              className={styles.seg}
              role="radiogroup"
              aria-label="How often"
              style={{ visibility: service === 'regular' ? 'visible' : 'hidden' }}
            >
              <span className={styles.segPill} style={{ transform: `translateX(${freqIndex * 100}%)` }} aria-hidden="true" />
              {FREQS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="radio"
                  aria-checked={freq === f.key}
                  tabIndex={service === 'regular' ? 0 : -1}
                  className={`${styles.segBtn} ${freq === f.key ? styles.segOn : ''}`}
                  onClick={() => setFreq(f.key)}
                >
                  {f.label}
                  {f.key === 'biweekly' && <small>most popular</small>}
                </button>
              ))}
            </div>

            <div className={styles.price} aria-live="polite">
              <div>
                <span className={styles.priceLab}>Estimate</span>
                <span className={styles.priceVal}>{priceText}</span>
              </div>
              <span className={styles.per}>
                {recurring ? 'per visit' : 'one-time'}
                <br />
                confirmed at walkthrough
              </span>
            </div>

            <button type="button" className={styles.cta} onClick={() => setStep(1)}>
              Get my exact quote
              <i aria-hidden="true">→</i>
            </button>
            <p className={styles.trust}>
              <b aria-hidden="true">★★★★★</b> {rating.toFixed(1)} Google <span aria-hidden="true" /> Text reply within the hour
            </p>
          </div>

          {/* ---------- STEP 2 · where's home ---------- */}
          <div className={paneClass(1)} style={paneStyle(1)} aria-hidden={step !== 1}>
            <div className={styles.paneHead}>
              <button type="button" className={styles.back} onClick={() => setStep(0)} aria-label="Back to the estimate">
                ‹
              </button>
              <p className={styles.kick}>Step 2 of 3</p>
              <Dots n={2} />
            </div>
            <p className={styles.title}>
              Where&apos;s <em>home?</em>
            </p>
            <div className={styles.chip}>
              <span>{summary}</span>
              <button type="button" onClick={() => setStep(0)}>
                Edit
              </button>
              <strong>{priceText}</strong>
            </div>

            <label className={fieldClass('street')}>
              <Icon d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z M12 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z" />
              <span>
                Street address <b>*</b>
              </span>
              <input
                value={street}
                onChange={(e) => {
                  setStreet(e.target.value);
                  clearBad('street');
                }}
                placeholder="1234 Mizner Blvd, Apt 5B"
                autoComplete="street-address"
                enterKeyHint="next"
              />
            </label>
            <div className={styles.two}>
              <label className={fieldClass('zip')}>
                <Icon d="M4 7h16M4 12h10M4 17h7" />
                <span>
                  ZIP <b>*</b>
                </span>
                <input
                  value={zip}
                  onChange={(e) => {
                    setZip(digits(e.target.value).slice(0, 5));
                    clearBad('zip');
                  }}
                  placeholder="33432"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  enterKeyHint="next"
                />
              </label>
              <label className={styles.field}>
                <Icon d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" />
                <span>City</span>
                <input value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
              </label>
            </div>

            <p className={styles.lab}>
              Add anything? <small>optional</small>
            </p>
            <div className={styles.adds}>
              {QUOTE_ADD_ONS.map((a) => {
                const on = addOns.includes(a.key);
                return (
                  <button
                    key={a.key}
                    type="button"
                    aria-pressed={on}
                    className={`${styles.add} ${on ? styles.addOn : ''}`}
                    onClick={() => toggleAddOn(a.key)}
                  >
                    {ADD_SHORT[a.key]}
                    <small>{addOnIncluded(a, service) ? 'Included' : shortPrice(a.label)}</small>
                  </button>
                );
              })}
            </div>

            <button type="button" className={`${styles.cta} ${okStreet && okZip ? '' : styles.ctaOff}`} onClick={next}>
              Next
              <i aria-hidden="true">→</i>
            </button>
          </div>

          {/* ---------- STEP 3 · where do we send it ---------- */}
          <div className={paneClass(2)} style={paneStyle(2)} aria-hidden={step !== 2}>
            <div className={styles.paneHead}>
              <button type="button" className={styles.back} onClick={() => setStep(1)} aria-label="Back to the address">
                ‹
              </button>
              <p className={styles.kick}>Step 3 of 3</p>
              <Dots n={3} />
            </div>
            <p className={styles.title}>
              Where do we <em>send it?</em>
            </p>
            <div className={styles.chip}>
              <span>{summary}</span>
              <strong>{priceText}</strong>
            </div>

            <label className={fieldClass('name')}>
              <Icon d="M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z M4 21a8 8 0 0 1 16 0" />
              <span>
                Full name <b>*</b>
              </span>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearBad('name');
                }}
                placeholder="Karen Davidson"
                autoComplete="name"
                enterKeyHint="next"
              />
            </label>
            <label className={fieldClass('phone')}>
              <Icon d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
              <span>
                Mobile <b>*</b>
              </span>
              <input
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  clearBad('phone');
                }}
                placeholder="(561) 000-0000"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                enterKeyHint="next"
              />
            </label>
            <label className={fieldClass('email')}>
              <Icon d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M3 7l9 6 9-6" />
              <span>Email</span>
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearBad('email');
                }}
                placeholder="you@email.com"
                type="email"
                inputMode="email"
                autoComplete="email"
                enterKeyHint="next"
              />
            </label>
            <label className={styles.field}>
              <Icon d="M4 20h4l10-10-4-4L4 16z" />
              <span>Anything we should know?</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Pets, gate code, rooms to focus on"
                enterKeyHint="send"
              />
            </label>

            <button
              type="button"
              className={`${styles.cta} ${okName && okPhone && okEmail ? '' : styles.ctaOff}`}
              onClick={send}
              disabled={sending}
            >
              {sending ? 'Sending…' : 'Send my request'}
              <i aria-hidden="true">→</i>
            </button>
            {sendError ? (
              <p className={styles.fineErr} role="alert">
                Couldn&apos;t send. Please text or call <a href="tel:5615836694">(561) 583-6694</a>.
              </p>
            ) : (
              <p className={styles.fine}>We text your exact quote within the hour. No spam, ever.</p>
            )}
          </div>

          {/* ---------- SENT ---------- */}
          <div className={`${paneClass(3)} ${styles.done}`} style={paneStyle(3)} aria-hidden={step !== 3} aria-live="polite">
            <div className={styles.okc} aria-hidden="true">
              ✓
            </div>
            <p className={styles.doneTitle}>
              You&apos;re all set{name.trim() ? ', ' : ''}
              <em>{name.trim().split(/\s+/)[0]}</em>.
            </p>
            <p className={styles.doneBody}>
              We&apos;ll text <b>{phone || 'you'}</b> within the hour to confirm and set up a quick walkthrough. Your
              exact price comes before anything is booked.
            </p>
            <ol className={styles.tl}>
              <li>
                <i>1</i>
                <span>
                  <b>Within the hour</b> · we text you
                </span>
              </li>
              <li>
                <i>2</i>
                <span>
                  <b>Quick walkthrough</b> · we see your home
                </span>
              </li>
              <li>
                <i>3</i>
                <span>
                  <b>Your exact price</b> · no pressure
                </span>
              </li>
            </ol>
            <a className={styles.call} href="tel:5615836694">
              Rather call? (561) 583-6694
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Dots({ n }: { n: number }) {
  return (
    <span className={styles.dots} aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <b key={i} className={i <= n ? styles.dotOn : ''} />
      ))}
    </span>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
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
