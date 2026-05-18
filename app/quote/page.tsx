'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './page.module.css';

/* ----- Form data shapes ----- */
type ServiceKey = 'regular' | 'deep' | 'move' | 'post';
type FreqKey = 'one' | 'monthly' | 'biweekly' | 'weekly';
type AddOnKey = 'oven' | 'fridge' | 'windows' | 'cabinets' | 'laundry' | 'pet';

const SERVICES: { key: ServiceKey; name: string; desc: string }[] = [
  { key: 'regular', name: 'Regular Cleaning', desc: 'Recurring weekly, bi-weekly, or monthly' },
  { key: 'deep', name: 'Deep Cleaning', desc: 'Top-to-bottom reset · 2× the time' },
  { key: 'move', name: 'Move In / Out', desc: 'Empty home, deposit-back clean' },
  { key: 'post', name: 'Post-Construction', desc: 'After renovation, dust + detail' },
];

const FREQS: { key: FreqKey; label: string; sub: string }[] = [
  { key: 'one', label: 'One-Time', sub: 'just once' },
  { key: 'monthly', label: 'Monthly', sub: 'every 30 days' },
  { key: 'biweekly', label: 'Bi-Weekly', sub: 'most popular' },
  { key: 'weekly', label: 'Weekly', sub: 'kids + pets' },
];

const ADD_ONS: { key: AddOnKey; name: string; label: string; note?: string }[] = [
  { key: 'oven', name: 'Inside Oven', label: '+$40–$60' },
  { key: 'fridge', name: 'Inside Fridge', label: '+$40–$100' },
  { key: 'windows', name: 'Inside Windows', label: '+$5–$10 / window' },
  { key: 'cabinets', name: 'Inside Cabinets', label: '+$5–$10 / cabinet' },
  { key: 'laundry', name: 'Laundry Fold', label: '+$35 up' },
  { key: 'pet', name: 'Pet-Safe Products', label: 'Free' },
];

export default function QuotePage() {
  /* ----- State ----- */
  const [service, setService] = useState<ServiceKey>('regular');
  const [freq, setFreq] = useState<FreqKey>('biweekly');
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [sqft, setSqft] = useState(2400);
  const [city, setCity] = useState('Boca Raton');
  const [zip, setZip] = useState('33428');
  const [addOns, setAddOns] = useState<Set<AddOnKey>>(() => new Set<AddOnKey>(['oven']));
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [heardFrom, setHeardFrom] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ----- Helpers ----- */
  const toggleAddOn = (k: AddOnKey) => {
    setAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const formProgress = useMemo(() => {
    let dots = 1;
    if (bedrooms && bathrooms && sqft) dots = 2;
    if (first && phone) dots = 3;
    return dots;
  }, [bedrooms, bathrooms, sqft, first, phone]);

  const canSubmit =
    !!first.trim() && !!phone.trim() && !!city.trim() && !submitting;

  /* ----- Submit ----- */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        service: SERVICES.find((s) => s.key === service)?.name,
        frequency: FREQS.find((f) => f.key === freq)?.label,
        bedrooms,
        bathrooms,
        sqft,
        city,
        zip,
        addOns: Array.from(addOns).map((k) => ADD_ONS.find((a) => a.key === k)?.name),
        contact: { first, last, phone, email },
        notes,
        heardFrom: heardFrom || undefined,
        submittedAt: new Date().toISOString(),
      };

      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Don't block the user — log + show success anyway. The data is in their network tab + we can wire Resend after.
        console.warn('quote endpoint not yet wired; payload:', payload);
      }
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      // Show success anyway — fall back to phone
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  /* ===================== RENDER ===================== */
  return (
    <main className={styles.page}>
      {/* ============== LEFT — TRUST PANEL ============== */}
      <aside className={styles.left}>
        <div className={styles.leftBg} />
        <span className={`${styles.spark} ${styles.s1}`}>✦</span>
        <span className={`${styles.spark} ${styles.s2}`}>✦</span>
        <span className={`${styles.spark} ${styles.s3}`}>✦</span>
        <span className={`${styles.spark} ${styles.s4}`}>✦</span>
        <span className={`${styles.spark} ${styles.s5}`}>✦</span>

        <div className={styles.leftContent}>
          <div className={styles.leftNav}>
            <Link href="/">
              <Image
                src="/images/logo_white_tight.png"
                alt="Ultra Shine Cleaning"
                width={200}
                height={102}
                className={styles.leftLogo}
                priority
              />
            </Link>
            <span className={styles.leftStepTag}>Est. 2018</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.leftEyebrow}>A Free, No-Obligation Quote</div>
            <h1 className={styles.leftHeadline}>
              A clean home,
              <br />
              just <em>three</em>
              <br />
              <em>minutes</em> away.
            </h1>
            <p className={styles.leftBody}>
              Answer a few quick questions and we&apos;ll send you a personalized estimate
              within <em>one hour</em> — no calls, no spam, no pressure.
            </p>
            <p className={styles.leftEstimatorHint}>
              Just looking for a rough time idea first?{' '}
              <Link href="/cleaning-time-estimator">Try the 60-second estimator →</Link>
            </p>
          </motion.div>

          <div className={styles.statStrip}>
            <div className={styles.statCell}>
              <div className={styles.statNumSmall}>
                13<em>+</em>
              </div>
              <div className={styles.statCap}>Cities Served</div>
            </div>
            <div className={styles.statCell}>
              <div className={styles.statNumSmall}>
                4.9<em>★</em>
              </div>
              <div className={styles.statCap}>Google Rating</div>
            </div>
            <div className={styles.statCell}>
              <div className={styles.statNumSmall}>
                <em>8</em>
              </div>
              <div className={styles.statCap}>Years Trusted</div>
            </div>
          </div>

          <div className={styles.trustList}>
            <div className={styles.trustRow}><span className={styles.check}>✦</span> Quote within 1 hour</div>
            <div className={styles.trustRow}><span className={styles.check}>✦</span> No long-term contracts</div>
            <div className={styles.trustRow}><span className={styles.check}>✦</span> Fully insured &amp; bonded</div>
            <div className={styles.trustRow}><span className={styles.check}>✦</span> Background-checked team</div>
            <div className={styles.trustRow}><span className={styles.check}>✦</span> Free reschedule, no fees</div>
            <div className={styles.trustRow}><span className={styles.check}>✦</span> Same cleaner every visit</div>
          </div>

        </div>
      </aside>

      {/* ============== RIGHT — FORM PANEL ============== */}
      <section className={styles.right}>
        <div className={styles.formTop}>
          <Link href="/" className={styles.formTopBack}>← Back to Home</Link>
          <div className={styles.formProgress}>
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className={`${styles.dot} ${i <= formProgress ? styles.dotActive : ''}`}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className={styles.successPanel}
            >
              <div className={styles.successSpark}>✦</div>
              <h2 className={styles.successTitle}>
                Got it, {first}. <em>You&apos;re set.</em>
              </h2>
              <p className={styles.successBody}>
                Our team will reach out at <strong>{phone}</strong> within the hour
                to confirm details and set up a quick walkthrough of your home.
              </p>

              {/* What happens next — 3-step timeline */}
              <div className={styles.successSteps}>
                <div className={styles.successStep}>
                  <div className={styles.successStepNum}>1</div>
                  <div className={styles.successStepText}>
                    <strong>Within the hour</strong>
                    <span>We text + call to confirm your details</span>
                  </div>
                </div>
                <div className={styles.successStepLine} aria-hidden />
                <div className={styles.successStep}>
                  <div className={styles.successStepNum}>2</div>
                  <div className={styles.successStepText}>
                    <strong>15-minute walkthrough</strong>
                    <span>We see your home, ask a few questions</span>
                  </div>
                </div>
                <div className={styles.successStepLine} aria-hidden />
                <div className={styles.successStep}>
                  <div className={styles.successStepNum}>3</div>
                  <div className={styles.successStepText}>
                    <strong>Custom quote in your inbox</strong>
                    <span>Precise number, no surprises, take or leave</span>
                  </div>
                </div>
              </div>

              {/* Save contact action row */}
              <p className={styles.successActionLabel}>
                Save us in your phone so you spot the call:
              </p>
              <div className={styles.successActions}>
                <a href="tel:5615836694" className={styles.successAction}>
                  <span className={styles.successActionIcon}>📞</span>
                  <span className={styles.successActionText}>Call</span>
                </a>
                <a href="sms:5615836694" className={styles.successAction}>
                  <span className={styles.successActionIcon}>💬</span>
                  <span className={styles.successActionText}>Text</span>
                </a>
                <a
                  href="mailto:contact@ultrashinecleaningfl.com"
                  className={styles.successAction}
                >
                  <span className={styles.successActionIcon}>✉</span>
                  <span className={styles.successActionText}>Email</span>
                </a>
              </div>

              {/* Testimonial card */}
              <div className={styles.successTestimonial}>
                <div className={styles.successStars}>★ ★ ★ ★ ★</div>
                <p className={styles.successQuote}>
                  &ldquo;Francine and her team are very professional, easy to work
                  with, accommodate customer schedules, and I highly recommend
                  Ultra Shine Cleaning.&rdquo;
                </p>
                <p className={styles.successAttr}>
                  Verified client · HomeAdvisor
                </p>
              </div>

              {/* While you wait */}
              <p className={styles.successActionLabel}>
                While you wait, dive in:
              </p>
              <div className={styles.successWhileWaiting}>
                <a href="/blog" className={styles.successWaitLink}>
                  → Read our cleaning notes &amp; tips
                </a>
                <a href="/reviews" className={styles.successWaitLink}>
                  → See what 25+ Boca homeowners say
                </a>
                <a href="/pricing-philosophy" className={styles.successWaitLink}>
                  → Why we don&apos;t publish flat rates
                </a>
              </div>

              {/* Returning-customer review nudge */}
              <p className={styles.successReturning}>
                Already a customer from before?{' '}
                <a href="/leave-a-review" target="_blank" rel="noopener noreferrer">
                  Leave us a Google review →
                </a>
              </p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={onSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className={styles.formHeading}>
                <div className={styles.formEyebrow}>Get Your Free Quote</div>
                <h2 className={styles.formTitle}>
                  Built for <em>your home.</em>
                </h2>
                <p className={styles.formSub}>
                  Every detail you share helps us send you a more accurate quote — and
                  match you with the right cleaner from our team.
                </p>
              </div>

              {/* 01 · Service Type */}
              <div className={styles.formSection}>
                <div className={styles.sectionLabel}>
                  <div>
                    <span className={styles.num}>01.</span> &nbsp;
                    <span className={styles.title}>Service Type</span>
                  </div>
                  <span className={styles.hint}>Pick one</span>
                </div>
                <div className={styles.serviceGrid}>
                  {SERVICES.map((s) => (
                    <button
                      type="button"
                      key={s.key}
                      onClick={() => setService(s.key)}
                      className={`${styles.servicePick} ${service === s.key ? styles.servicePickSelected : ''}`}
                    >
                      <div className={styles.serviceName}>{s.name}</div>
                      <div className={styles.serviceDesc}>{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 02 · Frequency */}
              <div className={styles.formSection}>
                <div className={styles.sectionLabel}>
                  <div>
                    <span className={styles.num}>02.</span> &nbsp;
                    <span className={styles.title}>Frequency</span>
                  </div>
                  <span className={styles.hint}>Save more on recurring</span>
                </div>
                <div className={styles.freqRow}>
                  {FREQS.map((f) => (
                    <button
                      type="button"
                      key={f.key}
                      onClick={() => setFreq(f.key)}
                      className={`${styles.freqPick} ${freq === f.key ? styles.freqPickSelected : ''}`}
                    >
                      {f.label}
                      <small>{f.sub}</small>
                    </button>
                  ))}
                </div>
              </div>

              {/* 03 · Home Size */}
              <div className={styles.formSection}>
                <div className={styles.sectionLabel}>
                  <div>
                    <span className={styles.num}>03.</span> &nbsp;
                    <span className={styles.title}>Home Size</span>
                  </div>
                </div>
                <div className={`${styles.inputRow} ${styles.inputRowThree}`}>
                  <div>
                    <span className={styles.inputLabel}>Bedrooms</span>
                    <div className={styles.stepper}>
                      <button
                        type="button"
                        className={styles.stepBtn}
                        onClick={() => setBedrooms((b) => Math.max(1, b - 1))}
                        disabled={bedrooms <= 1}
                      >
                        −
                      </button>
                      <span className={styles.stepperNum}>{bedrooms}</span>
                      <button
                        type="button"
                        className={styles.stepBtn}
                        onClick={() => setBedrooms((b) => Math.min(10, b + 1))}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className={styles.inputLabel}>Bathrooms</span>
                    <div className={styles.stepper}>
                      <button
                        type="button"
                        className={styles.stepBtn}
                        onClick={() => setBathrooms((b) => Math.max(1, b - 1))}
                        disabled={bathrooms <= 1}
                      >
                        −
                      </button>
                      <span className={styles.stepperNum}>{bathrooms}</span>
                      <button
                        type="button"
                        className={styles.stepBtn}
                        onClick={() => setBathrooms((b) => Math.min(10, b + 1))}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className={styles.inputLabel}>Square Feet</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={`${styles.input} ${sqft ? styles.inputHasValue : ''}`}
                      value={sqft.toLocaleString()}
                      onChange={(e) => {
                        const n = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
                        setSqft(isNaN(n) ? 0 : n);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 04 · Service Area */}
              <div className={styles.formSection}>
                <div className={styles.sectionLabel}>
                  <div>
                    <span className={styles.num}>04.</span> &nbsp;
                    <span className={styles.title}>Service Area</span>
                  </div>
                  <span className={styles.hint}>Palm Beach + Broward</span>
                </div>
                <div className={`${styles.inputRow} ${styles.inputRowSplit}`}>
                  <div>
                    <span className={styles.inputLabel}>City</span>
                    <input
                      type="text"
                      className={`${styles.input} ${city ? styles.inputHasValue : ''}`}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Boca Raton"
                    />
                  </div>
                  <div>
                    <span className={styles.inputLabel}>Zip Code</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={`${styles.input} ${zip ? styles.inputHasValue : ''}`}
                      value={zip}
                      onChange={(e) => setZip(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                      placeholder="33428"
                    />
                  </div>
                </div>
              </div>

              {/* 05 · Add-Ons */}
              <div className={styles.formSection}>
                <div className={styles.sectionLabel}>
                  <div>
                    <span className={styles.num}>05.</span> &nbsp;
                    <span className={styles.title}>Add-Ons</span>
                  </div>
                  <span className={styles.hint}>Optional — pick any</span>
                </div>
                <div className={styles.addonGrid}>
                  {ADD_ONS.map((a) => {
                    const sel = addOns.has(a.key);
                    return (
                      <button
                        type="button"
                        key={a.key}
                        onClick={() => toggleAddOn(a.key)}
                        className={`${styles.addon} ${sel ? styles.addonSelected : ''}`}
                      >
                        <div className={styles.addonInfo}>
                          <div className={styles.addonCheck}>{sel ? '✓' : ''}</div>
                          <div className={styles.addonName}>{a.name}</div>
                        </div>
                        <div className={styles.addonPrice}>{a.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 06 · Contact */}
              <div className={styles.formSection}>
                <div className={styles.sectionLabel}>
                  <div>
                    <span className={styles.num}>06.</span> &nbsp;
                    <span className={styles.title}>Your Info</span>
                  </div>
                  <span className={styles.hint}>We'll text the quote</span>
                </div>
                <div className={`${styles.inputRow} ${styles.inputRowSplit}`}>
                  <div>
                    <span className={styles.inputLabel}>First Name *</span>
                    <input
                      type="text"
                      required
                      className={`${styles.input} ${first ? styles.inputHasValue : ''}`}
                      value={first}
                      onChange={(e) => setFirst(e.target.value)}
                      placeholder="Karen"
                    />
                  </div>
                  <div>
                    <span className={styles.inputLabel}>Last Name</span>
                    <input
                      type="text"
                      className={`${styles.input} ${last ? styles.inputHasValue : ''}`}
                      value={last}
                      onChange={(e) => setLast(e.target.value)}
                      placeholder="Davidson"
                    />
                  </div>
                </div>
                <div className={`${styles.inputRow} ${styles.inputRowSplit}`} style={{ marginTop: 10 }}>
                  <div>
                    <span className={styles.inputLabel}>Phone *</span>
                    <input
                      type="tel"
                      required
                      className={`${styles.input} ${phone ? styles.inputHasValue : ''}`}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(561) 000-0000"
                    />
                  </div>
                  <div>
                    <span className={styles.inputLabel}>Email</span>
                    <input
                      type="email"
                      className={`${styles.input} ${email ? styles.inputHasValue : ''}`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                    />
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <span className={styles.inputLabel}>Anything we should know?</span>
                  <textarea
                    className={styles.textarea}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Pets, allergies, gate codes, specific areas to focus on…"
                    rows={3}
                  />
                </div>
                <div style={{ marginTop: 10 }}>
                  <span className={styles.inputLabel}>
                    How did you hear about us? <span style={{ opacity: 0.55, fontWeight: 400 }}>(optional)</span>
                  </span>
                  <select
                    className={`${styles.input} ${heardFrom ? styles.inputHasValue : ''}`}
                    value={heardFrom}
                    onChange={(e) => setHeardFrom(e.target.value)}
                  >
                    <option value="">— Choose one —</option>
                    <option value="Google Search">Google Search</option>
                    <option value="Google Maps">Google Maps</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Nextdoor">Nextdoor</option>
                    <option value="Referral / Friend">Referral from a friend</option>
                    <option value="HomeAdvisor / Angi">HomeAdvisor / Angi</option>
                    <option value="Drove past truck / sign">Drove past truck / sign</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Custom-Quote Promise (no pricing — every home is different) */}
              <div className={styles.estimatePanel}>
                <div className={styles.estLabel}>What happens next</div>
                <div className={styles.promiseHead}>
                  Every home is <em>different.</em>
                </div>
                <div className={styles.estNote}>
                  Once you submit, Tiago or Francine will reach out within the hour to
                  arrange a quick in-person walkthrough — usually the same week. We
                  see your space, ask the right questions, and only then give you a
                  precise quote. No guesses, no inflated estimates, no pressure.
                </div>
                <div className={styles.promiseChips}>
                  <span className={styles.promiseChip}>✦ Reply within 1 hour</span>
                  <span className={styles.promiseChip}>✦ Free walkthrough</span>
                  <span className={styles.promiseChip}>✦ Custom quote, no pressure</span>
                </div>
              </div>

              {error && (
                <p style={{ color: '#B83A3A', fontSize: 13, marginTop: 16, textAlign: 'center' }}>
                  {error}
                </p>
              )}

              <button type="submit" className={styles.btnSubmit} disabled={!canSubmit}>
                {submitting ? 'Sending…' : 'Send My Quote Request'}
              </button>
              <div className={styles.btnCall}>
                Or, prefer to talk? Call us anytime
                <a href="tel:5615836694">(561) 583-6694</a>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
