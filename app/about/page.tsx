'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import SiteHeader from '../_components/SiteHeader';
import SiteFooter from '../_components/SiteFooter';
import MotionSection from '../_components/MotionSection';
import styles from './page.module.css';

export default function AboutPage() {
  const heroRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const photoY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const photoScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.18]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <main>
      <SiteHeader inPage={false} />

      {/* ============== HERO ============== */}
      <section ref={heroRef} className={styles.hero}>
        <motion.div
          className={styles.heroBg}
          style={{
            backgroundImage: `url(/images/team_action.jpg)`,
            y: reducedMotion ? '0%' : photoY,
            scale: reducedMotion ? 1.05 : photoScale,
          }}
        />
        <div className={styles.heroOverlay} />

        <motion.div className={styles.heroContent} style={{ opacity: reducedMotion ? 1 : contentOpacity }}>
          <motion.p
            className={styles.breadcrumb}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Link href="/">Home</Link>
            <span> / </span>
            <span style={{ opacity: 0.8 }}>About</span>
          </motion.p>

          <motion.p
            className={styles.heroEyebrow}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            OUR STORY · EST. 2018
          </motion.p>

          <motion.h1
            className={styles.heroHeadline}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            From a Connecticut <em>basement</em> to thirteen <em>South Florida</em> cities.
          </motion.h1>

          <motion.p
            className={styles.heroSub}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7 }}
          >
            Tiago + Francine Rena built Ultra Shine Cleaning the slow way —
            one home at a time, every clean done by people we'd hand the
            keys to ourselves.
          </motion.p>
        </motion.div>
      </section>

      {/* ============== STORY: THE FOUNDING ============== */}
      <MotionSection className={styles.section}>
        <div className={styles.storyGrid}>
          <div
            className={styles.storyImage}
            style={{ backgroundImage: `url(/images/flow_hand_marble.jpg)` }}
          />
          <div>
            <p className={styles.eyebrow}>How it started</p>
            <h2 className={styles.h2}>
              Two people, one <em>standard</em>.
            </h2>
            <div className={styles.storyProse}>
              <p>
                Ultra Shine started in <strong>Connecticut in 2018</strong> the way
                every honest small business does — one client, one weekend, one
                referral. Francine had spent years cleaning homes professionally
                and knew how it should be done. Tiago handled scheduling,
                quotes, and the work nobody likes — invoices, insurance,
                showing up on time when the snow was sideways.
              </p>
              <p>
                What we noticed early: most cleaning companies are
                fundamentally different from us. <em>They send strangers.</em>{' '}
                We knew every home, every cleaner, every preference. If a
                client wanted the laundry folded a certain way or hated a
                specific cleaning product, we remembered. That wasn't a
                marketing decision — it was just how a small family business
                works when it's actually small and actually a family.
              </p>
            </div>
          </div>
        </div>
      </MotionSection>

      {/* ============== TIMELINE ============== */}
      <MotionSection className={`${styles.section} ${styles.sectionAlt}`}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p className={styles.eyebrow} style={{ justifyContent: 'center' }}>The journey</p>
          <h2 className={styles.h2} style={{ margin: '0 auto', textAlign: 'center' }}>
            Eight years, two states, <em>one promise</em>.
          </h2>
        </div>

        <div className={styles.timeline}>
          <div className={styles.timelineCard}>
            <div className={styles.timelineYear}>2018</div>
            <div className={styles.timelineCity}>Connecticut</div>
            <div className={styles.timelineTitle}>The first client</div>
            <p className={styles.timelineBody}>
              Started in our spare time, scrubbing homes on weekends. By the
              end of year one we had a recurring book and our first hire.
              Word-of-mouth was the only marketing.
            </p>
          </div>

          <div className={styles.timelineCard}>
            <div className={styles.timelineYear}>2021</div>
            <div className={styles.timelineCity}>Boca Raton, FL</div>
            <div className={styles.timelineTitle}>The Florida move</div>
            <p className={styles.timelineBody}>
              Moved the family + the business south. Started over from zero
              referrals, in a market three times the size, and rebuilt the
              book within 18 months.
            </p>
          </div>

          <div className={styles.timelineCard}>
            <div className={styles.timelineYear}>2026</div>
            <div className={styles.timelineCity}>Palm Beach + Broward</div>
            <div className={styles.timelineTitle}>Today</div>
            <p className={styles.timelineBody}>
              Thirteen cities across South Florida. A trained, background-checked
              W2 team. A 4.9-star Google rating. And the same standard from
              day one — because we still hand the keys back personally.
            </p>
          </div>
        </div>
      </MotionSection>

      {/* ============== PULL QUOTE ============== */}
      <MotionSection className={`${styles.section} ${styles.sectionDark}`}>
        <div className={styles.pullQuote}>
          "We don't think of cleaning as a task. We think of it as the
          quiet work that makes a home feel <em>like a home again</em>."
          <div className={styles.pullQuoteAttr}>Tiago + Francine Rena · Owners</div>
        </div>
      </MotionSection>

      {/* ============== VALUES ============== */}
      <MotionSection className={styles.section}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p className={styles.eyebrow} style={{ justifyContent: 'center' }}>What we believe</p>
          <h2 className={styles.h2} style={{ margin: '0 auto', textAlign: 'center' }}>
            Three things we <em>refuse</em> to compromise.
          </h2>
        </div>

        <div className={styles.valuesGrid}>
          <div className={styles.valueCard}>
            <div className={styles.valueSpark}>✦</div>
            <h3 className={styles.valueTitle}>Same hands, every visit</h3>
            <p className={styles.valueBody}>
              Most cleaning companies rotate cleaners every visit — strangers
              in your home every time. We assign the same trained team to
              your home long-term. They know your space, your products, your
              preferences.
            </p>
          </div>

          <div className={styles.valueCard}>
            <div className={styles.valueSpark}>✦</div>
            <h3 className={styles.valueTitle}>W2 team, not contractors</h3>
            <p className={styles.valueBody}>
              Our team are W2 employees, fully bonded + insured + background-
              checked. They get fair pay, real benefits, and proper training.
              Better-treated cleaners do better work — and stay long enough
              to actually know your home.
            </p>
          </div>

          <div className={styles.valueCard}>
            <div className={styles.valueSpark}>✦</div>
            <h3 className={styles.valueTitle}>Honest quotes, in person</h3>
            <p className={styles.valueBody}>
              We don't quote sight-unseen. Every home is different. We come
              by, walk through, ask questions, then send a precise quote with
              no surprises. If you don't love the number, you owe us nothing.
            </p>
          </div>
        </div>
      </MotionSection>

      {/* ============== TEAM (no faces — environment + craft) ============== */}
      <MotionSection className={`${styles.section} ${styles.sectionAlt}`}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p className={styles.eyebrow} style={{ justifyContent: 'center' }}>The work</p>
          <h2 className={styles.h2} style={{ margin: '0 auto', textAlign: 'center' }}>
            What care looks like, <em>up close</em>.
          </h2>
        </div>

        <div className={styles.teamGrid}>
          <div className={styles.teamTile} style={{ backgroundImage: `url(/images/team_van.jpg)` }}>
            <div className={styles.teamTileLabel}>
              On the road
              <em>13 cities, 7 days a week</em>
            </div>
          </div>
          <div className={styles.teamCol}>
            <div className={styles.teamTile} style={{ backgroundImage: `url(/images/flow_hand_marble.jpg)` }}>
              <div className={styles.teamTileLabel}>
                Detail work
                <em>By hand, every surface</em>
              </div>
            </div>
            <div className={styles.teamTile} style={{ backgroundImage: `url(/images/flow_sparkles.jpg)` }}>
              <div className={styles.teamTileLabel}>
                The finish
                <em>Spotless, every visit</em>
              </div>
            </div>
          </div>
          <div className={styles.teamCol}>
            <div className={styles.teamTile} style={{ backgroundImage: `url(/images/flow_living_room_navy.jpg)` }}>
              <div className={styles.teamTileLabel}>
                The reset
                <em>Calm, ordered, fresh</em>
              </div>
            </div>
            <div className={styles.teamTile} style={{ backgroundImage: `url(/images/flow_bathroom_sunset.jpg)` }}>
              <div className={styles.teamTileLabel}>
                The standard
                <em>Hotel-grade, every time</em>
              </div>
            </div>
          </div>
        </div>
      </MotionSection>

      {/* ============== STATS STRIP ============== */}
      <MotionSection className={`${styles.section} ${styles.sectionDark}`}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p className={styles.eyebrow} style={{ justifyContent: 'center' }}>By the numbers</p>
        </div>
        <div className={styles.statsRow}>
          <div className={styles.statCell}>
            <div className={styles.statNum}>
              <em>8</em>
            </div>
            <div className={styles.statCap}>Years In Business</div>
          </div>
          <div className={styles.statCell}>
            <div className={styles.statNum}>
              13<em>+</em>
            </div>
            <div className={styles.statCap}>Cities Served</div>
          </div>
          <div className={styles.statCell}>
            <div className={styles.statNum}>
              4.9<em>★</em>
            </div>
            <div className={styles.statCap}>Google Rating</div>
          </div>
          <div className={styles.statCell}>
            <div className={styles.statNum}>
              <em>2</em>
            </div>
            <div className={styles.statCap}>Husband + Wife Owners</div>
          </div>
        </div>
      </MotionSection>

      {/* ============== CTA ============== */}
      <MotionSection className={styles.cta}>
        <p className={styles.eyebrow} style={{ justifyContent: 'center' }}>Ready when you are</p>
        <h2 className={styles.ctaHead}>
          Let us meet your <em>home</em>.
        </h2>
        <p className={styles.ctaSub}>
          Custom quote in one hour. We'll come walk through your space
          before sending the number — every home gets a fair, precise quote.
        </p>
        <Link href="/quote" className="btn btn-coral">Request Your Free Quote</Link>
      </MotionSection>

      <SiteFooter />
    </main>
  );
}
