import Link from 'next/link';
import SiteHeader from '../_components/SiteHeader';
import SiteFooter from '../_components/SiteFooter';
import MotionSection from '../_components/MotionSection';
import ServiceAreaMap from '../_components/ServiceAreaMap';
import CountUp from '../_components/CountUp';
import styles from './page.module.css';
import { bgStyle } from '../_lib/optImage';

export default function AboutPage() {
  return (
    <main>
      <SiteHeader inPage={false} />

      {/* ============== HERO ============== */}
      <section className={styles.hero}>
        <div
          className={`${styles.heroBg} hero-par bg-resp`}
          style={bgStyle('/images/hero_3d_about.jpg') as React.CSSProperties}
        />
        <div className={styles.heroOverlay} />

        <div className={`${styles.heroContent} hero-fade`}>
          <p
            className={`${styles.breadcrumb} in`}
           style={{ '--fy': '-10px', '--t': '0.6s', '--d': '0.1s' } as React.CSSProperties}>
            <Link href="/">Home</Link>
            <span> / </span>
            <span style={{ opacity: 0.8 }}>About</span>
          </p>

          <p
            className={`${styles.heroEyebrow} in`}
           style={{ '--fx': '-30px', '--t': '0.8s', '--d': '0.2s' } as React.CSSProperties}>
            OUR STORY · EST. 2018
          </p>

          <h1
            className={`${styles.heroHeadline} in`}
           style={{ '--fy': '60px', '--t': '1.1s', '--d': '0.4s' } as React.CSSProperties}>
            From a Connecticut <em>basement</em> to thirteen <em>South Florida</em> cities.
          </h1>

          <p
            className={`${styles.heroSub} in`}
           style={{ '--fy': '30px', '--t': '0.9s', '--d': '0.7s' } as React.CSSProperties}>
            Tiago + Francine Rena built Ultra Shine Cleaning the slow way —
            one home at a time, every clean done by people we'd hand the
            keys to ourselves.
          </p>
        </div>
      </section>

      {/* ============== STORY: THE FOUNDING ============== */}
      <MotionSection className={styles.section}>
        <div className={styles.storyGrid}>
          <div
            className={`${styles.storyImage} bg-resp`}
            style={bgStyle('/images/flow_hand_marble.jpg') as React.CSSProperties}
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
              team. A 5.0-star Google rating. And the same standard from
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
            <h3 className={styles.valueTitle}>Insured, bonded, checked</h3>
            <p className={styles.valueBody}>
              Comprehensive general liability coverage, full bonding through a
              licensed surety, and a background check on every cleaner before
              they hold a key. A Certificate of Insurance is available on
              request — we'd rather show you the document than ask you to take
              our word for it.
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
          <div className={`${styles.teamTile} bg-resp`} style={bgStyle('/images/team_van.jpg') as React.CSSProperties}>
            <div className={styles.teamTileLabel}>
              On the road
              <em>13 cities, 7 days a week</em>
            </div>
          </div>
          <div className={styles.teamCol}>
            <div className={`${styles.teamTile} bg-resp`} style={bgStyle('/images/flow_hand_marble.jpg') as React.CSSProperties}>
              <div className={styles.teamTileLabel}>
                Detail work
                <em>By hand, every surface</em>
              </div>
            </div>
            <div className={`${styles.teamTile} bg-resp`} style={bgStyle('/images/flow_sparkles.jpg') as React.CSSProperties}>
              <div className={styles.teamTileLabel}>
                The finish
                <em>Spotless, every visit</em>
              </div>
            </div>
          </div>
          <div className={styles.teamCol}>
            <div className={`${styles.teamTile} bg-resp`} style={bgStyle('/images/flow_living_room_navy.jpg') as React.CSSProperties}>
              <div className={styles.teamTileLabel}>
                The reset
                <em>Calm, ordered, fresh</em>
              </div>
            </div>
            <div className={`${styles.teamTile} bg-resp`} style={bgStyle('/images/flow_bathroom_sunset.jpg') as React.CSSProperties}>
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
              <em><CountUp to={8} duration={1.6} /></em>
            </div>
            <div className={styles.statCap}>Years In Business</div>
          </div>
          <div className={styles.statCell}>
            <div className={styles.statNum}>
              <CountUp to={13} duration={1.8} /><em>+</em>
            </div>
            <div className={styles.statCap}>Cities Served</div>
          </div>
          <div className={styles.statCell}>
            <div className={styles.statNum}>
              <CountUp to={5.0} decimals={1} duration={1.6} /><em>★</em>
            </div>
            <div className={styles.statCap}>Google Rating</div>
          </div>
          <div className={styles.statCell}>
            <div className={styles.statNum}>
              <em><CountUp to={2} duration={1.2} /></em>
            </div>
            <div className={styles.statCap}>Husband + Wife Owners</div>
          </div>
        </div>
      </MotionSection>

      {/* ============== SERVICE AREA MAP ==============
          Same component used on the homepage — shows the Palm Beach + Broward
          coverage area visually with clickable city chips below. */}
      <ServiceAreaMap />

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
