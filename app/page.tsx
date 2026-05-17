import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';
import FaqSection from './_components/FaqSection';
import HeroScrollHome from './_components/HeroScrollHome';
import MotionSection, { MotionItem } from './_components/MotionSection';
import TiltCard from './_components/TiltCard';
import CountUp from './_components/CountUp';
import MobileNav from './_components/MobileNav';

// Real verified reviews — sourced from HomeAdvisor profile
// (https://www.homeadvisor.com/rated.UltraShineCleaning.68124585.html)
// 4.9★ from 25 verified reviews · attribution kept generic since the
// original profile shows names as 'First L.' format we don't have here
const TESTIMONIALS = [
  { name: 'Verified Client', city: 'HomeAdvisor', text: 'Ultra Shine Cleaning was very professional when they came to my home, they got right to work. I have a dog, and they were very friendly and kind towards him.' },
  { name: 'Verified Client', city: 'HomeAdvisor', text: 'Ultra Shine Cleaning is wonderful. Easy to make an appointment with flexible times. Did a great job cleaning the entire house. I would highly recommend.' },
  { name: 'Verified Client', city: 'HomeAdvisor', text: 'Anna and her team came on time and they were friendly, professional and efficient. My house has never looked better. I will definitely use them not only again but continuously.' },
  { name: 'Verified Client', city: 'HomeAdvisor', text: 'Francine is absolutely wonderful and did a beautiful job for our first cleaning! She is very professional and my house looks beautiful. I would highly recommend her services!' },
  { name: 'Verified Client', city: 'HomeAdvisor', text: 'Francine and her team are very professional, easy to work with, accommodate customer schedules, and I highly recommend Ultra Shine Cleaning.' },
  { name: 'Verified Client', city: 'HomeAdvisor', text: 'The house has never been this clean. I highly recommend Ultra Shine Cleaning!' },
  { name: 'Verified Client', city: 'HomeAdvisor', text: 'Amazing job on the deep clean. Everything was thorough — they even organized our storage boxes. Terrific customer service. A team invested in their work.' },
  { name: 'Verified Client', city: 'HomeAdvisor', text: 'Great first job. Will be coming back!' },
];

export default function HomePage() {
  return (
    <main>
      {/* ============ STICKY NAV ============ */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.navBrand}>
          <Image
            src="/images/logo_white_tight.png"
            alt="Ultra Shine Cleaning"
            width={140}
            height={71}
            priority
          />
        </Link>
        <div className={styles.navMenu}>
          <a href="#services">Services</a>
          <a href="#areas">Areas</a>
          <a href="#about">About</a>
          <a href="#reviews">Reviews</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className={styles.navRight}>
          <a href="tel:5615836694" className={styles.navPhone}>(561) 583-6694</a>
          <Link href="/quote" className="btn btn-primary">Get Quote</Link>
          <MobileNav />
        </div>
      </nav>

      {/* ============ HERO (cinematic 4-scene scroll-through) ============ */}
      <HeroScrollHome />

      {/* ============ TRUST STRIP ============ */}
      <MotionSection className={styles.trustStrip}>
        <div className={styles.trustBadge}>
          <div className={styles.trustValue}>Fully Insured</div>
          <div className={styles.trustLabel}>+ Bonded</div>
        </div>
        <div className={styles.trustBadge}>
          <div className={styles.trustValue}>Background-Checked</div>
          <div className={styles.trustLabel}>Every team member</div>
        </div>
        <div className={styles.trustBadge}>
          <div className={styles.trustValue}>
            ★ <CountUp to={4.9} decimals={1} duration={1.4} /> Google
          </div>
          <div className={styles.trustLabel}>Verified reviews</div>
        </div>
        <div className={styles.trustBadge}>
          <div className={styles.trustValue}>
            <CountUp to={13} duration={1.6} /> Cities Served
          </div>
          <div className={styles.trustLabel}>Palm Beach + Broward</div>
        </div>
      </MotionSection>

      {/* ============ SERVICES ============ */}
      <MotionSection id="services" className={`${styles.services} dot-grid`}>
        <p className="eyebrow">WHAT WE OFFER</p>
        <h2 className={`fraunces ${styles.sectionHeadline}`}>
          Five services, one <em>standard</em>.
        </h2>
        <div className={styles.servicesGrid}>
          <TiltCard
            href="/services/regular-cleaning"
            image="/images/flow_living_room_navy.jpg"
            label="Regular Cleaning"
            description="Weekly, bi-weekly, or monthly maintenance to keep your home consistently clean."
            wide
          />
          <TiltCard
            href="/services/deep-cleaning"
            image="/images/flow_hand_marble.jpg"
            label="Deep Cleaning"
            description="Quarterly reset for baseboards, ovens, grout, fixtures — the works."
          />
          <TiltCard
            href="/services/move-in-out"
            image="/images/service_movein_boxes.jpg"
            label="Move-In / Move-Out"
            description="Landlord-grade clean to get your full deposit back."
          />
          <TiltCard
            href="/services/commercial"
            image="/images/service_commercial_office.jpg"
            label="Commercial"
            description="Offices that close more clients. Custom schedules around your hours."
          />
          <TiltCard
            href="/services/post-construction"
            image="/images/service_postconstruction.jpg"
            label="Post-Construction"
            description="HEPA-filtered, wall-to-wall — the dust the contractor leaves behind."
          />
        </div>
      </MotionSection>

      {/* ============ HOW IT WORKS ============ */}
      <MotionSection className={styles.how}>
        <p className="eyebrow">HOW IT WORKS</p>
        <h2 className={`fraunces ${styles.sectionHeadline}`}>
          Three simple steps to a <em>spotless</em> home.
        </h2>
        <div className={styles.steps}>
          <Link href="/quote" className={styles.step}>
            <div className={`mono ${styles.stepNum}`}>01</div>
            <h3 className="fraunces">Connect</h3>
            <p>Tell us about your home — size, frequency, anything special. Quote in your inbox within an hour.</p>
          </Link>
          <Link href="/quote" className={styles.step}>
            <div className={`mono ${styles.stepNum}`}>02</div>
            <h3 className="fraunces">Schedule</h3>
            <p>Pick a date that works for you. We confirm by text. Your team is locked in.</p>
          </Link>
          <Link href="/quote" className={styles.step}>
            <div className={`mono ${styles.stepNum}`}>03</div>
            <h3 className="fraunces">Enjoy The Sparkle</h3>
            <p>We arrive on time, clean to the standard, and leave the keys exactly where you asked.</p>
          </Link>
        </div>
      </MotionSection>

      {/* ============ WHY ULTRA SHINE ============ */}
      <MotionSection className={`${styles.why} dot-grid`}>
        <p className="eyebrow">WHY ULTRA SHINE</p>
        <h2 className={`fraunces ${styles.sectionHeadline}`}>
          Built on <em>detail</em>. Trusted on results.
        </h2>
        <div className={styles.whyGrid}>
          <WhyCard title="Eco + Pet-Safe" body="Method, Mrs Meyer's, ECOS, vinegar, baking soda. EPA-safe across the board." />
          <WhyCard title="Trained + Vetted" body="W2 employees only. Background-checked, bonded, fully insured. Same crew when possible." />
          <WhyCard title="Satisfaction Guaranteed" body="100% guarantee. If you're not happy, we come back free until you are." />
          <WhyCard title="Flexible Scheduling" body="Weekly, bi-weekly, monthly, or one-time. Reschedule with one text." />
        </div>
      </MotionSection>

      {/* ============ REVIEWS MARQUEE ============ */}
      <MotionSection id="reviews" className={styles.reviews}>
        <div className={styles.reviewsHead}>
          <p className={`eyebrow ${styles.reviewsEyebrow}`}>TRUSTED ACROSS SOUTH FLORIDA</p>
          <h2 className={`fraunces ${styles.sectionHeadline}`}>What our <em>clients</em> say.</h2>
          <div className={styles.reviewsHeadlineStars}>★ ★ ★ ★ ★</div>
          <div className={styles.reviewsMeta}>4.9 ★ GOOGLE RATING · VERIFIED REVIEWS</div>
        </div>
        <div className={styles.marquee}>
          <div className={styles.marqueeTrack}>
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <div key={i} className={styles.reviewCard}>
                <div className={styles.rStars}>★ ★ ★ ★ ★</div>
                <div className={`fraunces ${styles.rText}`}>"{t.text}"</div>
                <div className={styles.rAuthor}><strong>{t.name}</strong> · {t.city}</div>
              </div>
            ))}
          </div>
        </div>
      </MotionSection>

      {/* ============ AREAS — full-bleed background photo ============ */}
      <section id="areas" className={styles.areas}>
        <div
          className={styles.areasBg}
          style={{ backgroundImage: 'url(/images/flow_living_areas.jpg)' }}
        />
        <div className={styles.areasOverlay} />
        <MotionSection className={styles.areasContent}>
          <p className={styles.areasEyebrow}>WHERE WE SERVE · 13 CITIES</p>
          <h2 className={`fraunces ${styles.areasHeadline}`}>
            Across South Florida's <em>finest</em> neighborhoods.
          </h2>
          <p className={`fraunces ${styles.areasBody}`}>
            Professional house, deep, move-in/out, commercial, and post-construction cleaning across Palm Beach and Broward County. <em>If you're nearby and we're not on the list — call us anyway.</em>
          </p>

          <div className={styles.countyRow}>
            <div className={styles.countyBlock}>
              <div className={`fraunces ${styles.countyName}`}>Palm Beach County</div>
              <div className={styles.citiesList}>
                {['Boca Raton', 'Delray Beach', 'Boynton Beach', 'Lake Worth', 'West Palm Beach', 'Wellington', 'Parkland'].map(c => (
                  <span key={c} className={styles.cityTag}>{c}</span>
                ))}
              </div>
            </div>
            <div className={styles.countyBlock}>
              <div className={`fraunces ${styles.countyName}`}>Broward County</div>
              <div className={styles.citiesList}>
                {['Coral Springs', 'Fort Lauderdale', 'Coconut Creek', 'Deerfield Beach', 'Pompano Beach', 'Margate'].map(c => (
                  <span key={c} className={styles.cityTag}>{c}</span>
                ))}
              </div>
            </div>
          </div>
        </MotionSection>
      </section>

      {/* ============ PROMISE ============ */}
      <MotionSection className={styles.promise}>
        <div className={styles.promiseGrid}>
          <div>
            <div className={styles.promiseTag}>THE PROMISE</div>
            <h2 className={`fraunces ${styles.promiseHeadline}`}>
              Done <em>right.</em><br />Or done <em>again.</em>
            </h2>
          </div>
          <div>
            <p className={`fraunces ${styles.promiseBody}`}>
              At Ultra Shine, your satisfaction is our top priority. We don't just aim to meet expectations — we work hard to <em>exceed them every visit.</em>
            </p>
            <p className={`fraunces ${styles.promiseBody}`}>
              If for any reason you're not completely satisfied, simply tell us within 24 hours and our team returns to address it promptly — at no additional cost. No excuses, no hassle, no hidden fees.
            </p>
            <div className={styles.promisePillars}>
              <div className={styles.pillar}>
                <div className={`fraunces ${styles.pillarH}`}>No excuses</div>
                <div className={styles.pillarD}>WE OWN THE RESULT</div>
              </div>
              <div className={styles.pillar}>
                <div className={`fraunces ${styles.pillarH}`}>No hassle</div>
                <div className={styles.pillarD}>REACH OUT, WE RETURN</div>
              </div>
              <div className={styles.pillar}>
                <div className={`fraunces ${styles.pillarH}`}>No fees</div>
                <div className={styles.pillarD}>FIXES ARE ALWAYS FREE</div>
              </div>
            </div>
          </div>
        </div>
      </MotionSection>

      {/* ============ FAQ ============ */}
      <FaqSection />

      {/* ============ FINAL CTA ============ */}
      <MotionSection className={styles.finalCta}>
        <p className="eyebrow" style={{ color: 'var(--blush)' }}>READY WHEN YOU ARE</p>
        <h2 className={`fraunces ${styles.finalHeadline}`}>
          A cleaner home, <em>without the stress</em>.
        </h2>
        <Link href="/quote" className="btn btn-coral" style={{ marginTop: '32px' }}>
          Request Your Free Quote
        </Link>
        <p className={styles.finalNote}>Custom quote in 1 hour · No pricing surprises · Trusted across 13 South Florida cities</p>
      </MotionSection>

      {/* ============ FOOTER ============ */}
      <footer className={styles.footer}>
        <div className={styles.footerCol}>
          <Image
            src="/images/logo_white_tight.png"
            alt="Ultra Shine Cleaning"
            width={120}
            height={61}
          />
          <p className={styles.footerTagline}>Boca Raton + South Florida</p>
          <p className={styles.footerAddr}>Serving 13 cities across Palm Beach + Broward.</p>
        </div>
        <div className={styles.footerCol}>
          <h4>Services</h4>
          <a href="/services/regular-cleaning">Regular Cleaning</a>
          <a href="/services/deep-cleaning">Deep Cleaning</a>
          <a href="/services/move-in-out">Move-In / Out</a>
          <a href="/services/commercial">Commercial</a>
          <a href="/services/post-construction">Post-Construction</a>
        </div>
        <div className={styles.footerCol}>
          <h4>Company</h4>
          <a href="#about">About</a>
          <a href="#reviews">Reviews</a>
          <a href="/work-for-us">Work For Us</a>
        </div>
        <div className={styles.footerCol}>
          <h4>Contact</h4>
          <a href="tel:5615836694">(561) 583-6694</a>
          <a href="mailto:contact@ultrashinecleaningfl.com">contact@ultrashinecleaningfl.com</a>
          <Link href="/quote">Request Quote</Link>
        </div>
      </footer>

      <div className={styles.subFooter}>
        © 2026 Ultra Shine Cleaning · All rights reserved
      </div>
    </main>
  );
}

/* ---------- Sub-components ---------- */
function WhyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className={styles.whyCard}>
      <h3 className="fraunces">{title}</h3>
      <p>{body}</p>
    </div>
  );
}
