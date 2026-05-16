'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useReducedMotion, AnimatePresence } from 'framer-motion';
import SiteHeader from '../_components/SiteHeader';
import SiteFooter from '../_components/SiteFooter';
import MotionSection from '../_components/MotionSection';
import styles from './page.module.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const EXPERIENCE_OPTS = [
  'No professional experience',
  'Less than 1 year',
  '1–3 years',
  '3+ years',
  'Lead / supervisor experience',
];

const LANGUAGE_OPTS = [
  'English only',
  'Spanish only',
  'English + Spanish',
  'English + Portuguese',
  'English + Creole',
  'Other (note below)',
];

export default function WorkForUsPage() {
  const heroRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const photoY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const photoScale = useTransform(scrollYProgress, [0, 1], [1.04, 1.14]);

  // Form state
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [language, setLanguage] = useState(LANGUAGE_OPTS[0]);
  const [experience, setExperience] = useState(EXPERIENCE_OPTS[1]);
  const [transport, setTransport] = useState<'yes' | 'no' | ''>('');
  const [authorized, setAuthorized] = useState<'yes' | 'no' | ''>('');
  const [days, setDays] = useState<Set<string>>(() => new Set<string>());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (d: string) => {
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const canSubmit =
    !!first.trim() &&
    !!phone.trim() &&
    !!city.trim() &&
    !!transport &&
    !!authorized &&
    !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        contact: { first, last, phone, email },
        city,
        language,
        experience,
        ownTransport: transport === 'yes',
        usAuthorized: authorized === 'yes',
        availableDays: Array.from(days),
        notes,
        submittedAt: new Date().toISOString(),
      };
      const res = await fetch('/api/work-for-us', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.warn('work-for-us endpoint warning; payload:', payload);
      }
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <SiteHeader inPage={false} />

      {/* ============== HERO ============== */}
      <section ref={heroRef} className={styles.hero}>
        <motion.div
          className={styles.heroBg}
          style={{
            backgroundImage: 'url(/images/team_van.jpg)',
            y: reducedMotion ? '0%' : photoY,
            scale: reducedMotion ? 1.04 : photoScale,
          }}
        />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <motion.p
            className={styles.breadcrumb}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link href="/">Home</Link>
            <span> / </span>
            <span style={{ opacity: 0.8 }}>Work For Us</span>
          </motion.p>

          <motion.p
            className={styles.heroEyebrow}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            JOIN THE TEAM · NOW HIRING
          </motion.p>

          <motion.h1
            className={styles.heroHeadline}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            A family business that treats cleaners <em>right</em>.
          </motion.h1>

          <motion.p
            className={styles.heroSub}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7 }}
          >
            Real W2 employment. Fair pay. Same routes, same clients —
            you build relationships, not turnover. Apply below.
          </motion.p>
        </div>
      </section>

      {/* ============== WHY WORK HERE ============== */}
      <MotionSection className={styles.section}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <p className={styles.eyebrow} style={{ justifyContent: 'center' }}>Why work here</p>
          <h2 className={styles.h2} style={{ margin: '0 auto', textAlign: 'center' }}>
            What you get with <em>Ultra Shine</em>.
          </h2>
        </div>

        <div className={styles.whyGrid}>
          <div className={styles.whyCard}>
            <div className={styles.whySpark}>✦</div>
            <h3 className={styles.whyTitle}>W2 employee</h3>
            <p className={styles.whyBody}>
              Not 1099. Taxes withheld, paystubs, real employment record.
              Bonded + insured at no cost to you.
            </p>
          </div>
          <div className={styles.whyCard}>
            <div className={styles.whySpark}>✦</div>
            <h3 className={styles.whyTitle}>Fair pay + travel</h3>
            <p className={styles.whyBody}>
              Competitive hourly with paid drive time between jobs.
              No unpaid gaps on your schedule.
            </p>
          </div>
          <div className={styles.whyCard}>
            <div className={styles.whySpark}>✦</div>
            <h3 className={styles.whyTitle}>Same clients, same routes</h3>
            <p className={styles.whyBody}>
              We assign you long-term recurring homes. You learn their
              spaces, build relationships — no constant first-time chaos.
            </p>
          </div>
          <div className={styles.whyCard}>
            <div className={styles.whySpark}>✦</div>
            <h3 className={styles.whyTitle}>Real owners</h3>
            <p className={styles.whyBody}>
              You talk to Tiago + Francine directly — not a regional
              manager three states away. Small team, family-run.
            </p>
          </div>
        </div>
      </MotionSection>

      {/* ============== WHAT WE LOOK FOR ============== */}
      <MotionSection className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.lookForGrid}>
          <div
            className={styles.lookForImage}
            style={{ backgroundImage: 'url(/images/flow_hand_marble.jpg)' }}
          />
          <div>
            <p className={styles.eyebrow}>What we look for</p>
            <h2 className={styles.h2}>
              The kind of people who actually <em>care</em>.
            </h2>
            <ul className={styles.lookForList}>
              <li>Cleaning experience helps but isn't required — we train you on our standard</li>
              <li>Reliable, on-time, takes pride in finishing strong</li>
              <li>Own transportation (you'll drive between client homes)</li>
              <li>Authorized to work in the US — we run a background check on every hire</li>
              <li>English + Spanish a plus (most of our team is bilingual)</li>
              <li>Comfortable with weekly recurring schedule, weekdays preferred</li>
            </ul>
          </div>
        </div>
      </MotionSection>

      {/* ============== APPLICATION FORM ============== */}
      <section className={styles.formSection}>
        <div className={styles.formWrap}>
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className={styles.successCard}
              >
                <div className={styles.successSpark}>✦</div>
                <h2 className={styles.successTitle}>
                  Thanks, {first}. <em>Got your application.</em>
                </h2>
                <p className={styles.successBody}>
                  Our team will review your info and reach out at <strong>{phone}</strong>{' '}
                  within a few business days to set up a quick interview. If we move forward, the next steps are a background check + a paid trial shift.
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
                <div className={styles.formHead}>
                  <p className={styles.eyebrow}>Application</p>
                  <h2 className={styles.h2}>
                    Tell us about <em>you</em>.
                  </h2>
                  <p className={styles.formSub}>
                    Takes about 90 seconds. Required fields are marked.
                  </p>
                </div>

                <div className={styles.form}>
                  {/* Name */}
                  <div className={styles.row2}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>First Name *</label>
                      <input
                        className={styles.input}
                        type="text"
                        required
                        value={first}
                        onChange={(e) => setFirst(e.target.value)}
                        placeholder="Maria"
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>Last Name</label>
                      <input
                        className={styles.input}
                        type="text"
                        value={last}
                        onChange={(e) => setLast(e.target.value)}
                        placeholder="Santos"
                      />
                    </div>
                  </div>

                  {/* Phone + Email */}
                  <div className={styles.row2}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>Phone *</label>
                      <input
                        className={styles.input}
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(561) 000-0000"
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>Email</label>
                      <input
                        className={styles.input}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                      />
                    </div>
                  </div>

                  {/* City + Language */}
                  <div className={styles.row2}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>City You Live In *</label>
                      <input
                        className={styles.input}
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Coconut Creek"
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>Languages You Speak</label>
                      <select
                        className={styles.select}
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                      >
                        {LANGUAGE_OPTS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Experience */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Cleaning Experience</label>
                    <select
                      className={styles.select}
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                    >
                      {EXPERIENCE_OPTS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>

                  {/* Own transportation */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Do you have your own transportation? *</label>
                    <div className={styles.toggleRow}>
                      <button
                        type="button"
                        className={`${styles.toggleBtn} ${transport === 'yes' ? styles.toggleBtnSelected : ''}`}
                        onClick={() => setTransport('yes')}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        className={`${styles.toggleBtn} ${transport === 'no' ? styles.toggleBtnSelected : ''}`}
                        onClick={() => setTransport('no')}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* Work authorization */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Authorized to work in the US? *</label>
                    <div className={styles.toggleRow}>
                      <button
                        type="button"
                        className={`${styles.toggleBtn} ${authorized === 'yes' ? styles.toggleBtnSelected : ''}`}
                        onClick={() => setAuthorized('yes')}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        className={`${styles.toggleBtn} ${authorized === 'no' ? styles.toggleBtnSelected : ''}`}
                        onClick={() => setAuthorized('no')}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* Available days */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Which days can you work?</label>
                    <div className={styles.dayRow}>
                      {DAYS.map((d) => (
                        <button
                          type="button"
                          key={d}
                          onClick={() => toggleDay(d)}
                          className={`${styles.dayPill} ${days.has(d) ? styles.dayPillSelected : ''}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Anything else we should know?</label>
                    <textarea
                      className={styles.textarea}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Previous cleaning jobs, references, schedule notes, certifications, anything that helps us know you better."
                      rows={4}
                    />
                  </div>

                  {error && <p className={styles.errorMsg}>{error}</p>}

                  <button type="submit" className={styles.submit} disabled={!canSubmit}>
                    {submitting ? 'Sending…' : 'Submit Application'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
