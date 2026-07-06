import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';
import FaqSection from './_components/FaqSection';
import HeroScrollHome from './_components/HeroScrollHome';
import ServiceAreaMap from './_components/ServiceAreaMap';
import MotionSection, { MotionItem } from './_components/MotionSection';
import TiltCard from './_components/TiltCard';
import CountUp from './_components/CountUp';
import MobileNav from './_components/MobileNav';
import { fetchGoogleReviews } from './_lib/google-reviews';

// Fallback testimonials — sourced from the HomeAdvisor profile
// (https://www.homeadvisor.com/rated.UltraShineCleaning.68124585.html)
// 4.9★ from 25 verified reviews on HomeAdvisor; 5.0★ on Google.
// Used to (a) pad the marquee when there are fewer than 8 Google reviews
// available, and (b) cover the whole marquee if Google Places API is
// unconfigured or unreachable so the site never shows an empty section.
const FALLBACK_TESTIMONIALS = [
  { name: 'Verified Client', city: 'HomeAdvisor', text: 'Ultra Shine Cleaning was very professional when they came to my home, they got right to work. I have a dog, and they were very friendly and kind towards him.' },
  { name: 'Verified Client', city: 'HomeAdvisor', text: 'Ultra Shine Cleaning is wonderful. Easy to make an appointment with flexible times. Did a great job cleaning the entire house. I would highly recommend.' },
  { name: 'Verified Client', city: 'HomeAdvisor', text: 'Anna and her team came on time and they were friendly, professional and efficient. My house has never looked better. I will definitely use them not only again but continuously.' },
  { name: 'Verified Client', city: 'HomeAdvisor', text: 'Francine is absolutely wonderful and did a beautiful job for our first cleaning! She is very professional and my house looks beautiful. I would highly recommend her services!' },
  { name: 'Verified Client', city: 'HomeAdvisor', text: 'Francine and her team are very professional, easy to work with, accommodate customer schedules, and I highly recommend Ultra Shine Cleaning.' },
  { name: 'Verified Client', city: 'HomeAdvisor', text: 'The house has never been this clean. I highly recommend Ultra Shine Cleaning!' },
  { name: 'Verified Client', city: 'HomeAdvisor', text: 'Amazing job on the deep clean. Everything was thorough — they even organized our storage boxes. Terrific customer service. A team invested in their work.' },
  { name: 'Verified Client', city: 'HomeAdvisor', text: 'Great first job. Will be coming back!' },
];

type DisplayReview = {
  name: string;
  city: string;
  text: string;
  source: 'google' | 'homeadvisor';
  photo?: string;
  authorUrl?: string;
};

export default async function HomePage() {
  // Live Google data — falls back gracefully when env vars are unset or
  // the Places API call fails. See app/_lib/google-reviews.ts.
  const google = await fetchGoogleReviews();

  // Homepage marquee = Google reviews ONLY when live data is available.
  // The HomeAdvisor testimonials only appear as a silent fallback when the
  // Google API is unreachable, so the homepage never goes blank during an
  // outage. Per product call (May 2026): homepage is the pure-Google trust
  // signal; the /reviews page is where HomeAdvisor + other platforms live.
  const googleAsDisplay: DisplayReview[] = google.reviews.map((r) => ({
    name: r.author_name,
    city: r.relative_time_description || 'Google',
    text: r.text,
    source: 'google' as const,
    photo: r.profile_photo_url,
    authorUrl: r.author_url,
  }));
  const MARQUEE_REVIEWS: DisplayReview[] = googleAsDisplay.length > 0
    ? googleAsDisplay
    : FALLBACK_TESTIMONIALS.map((t) => ({ ...t, source: 'homeadvisor' as const }));

  // Live rating + count for the trust strip badge. Falls back to the
  // canonical 5.0 + 18 reviews label if no live data.
  const liveRating = google.ok && google.rating != null ? google.rating : 5.0;
  const liveCount = google.ok && google.count != null ? google.count : 18;

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
          <Link href="/about">About</Link>
          <Link href="/blog">Blog</Link>
          <a href="#reviews">Reviews</a>
          <Link href="/leave-a-review" className={styles.navReview}>★ Leave Review</Link>
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
            ★ <CountUp to={liveRating} decimals={1} duration={1.4} /> Google
          </div>
          <div className={styles.trustLabel}>
            <CountUp to={liveCount} duration={1.4} /> verified reviews
          </div>
        </div>
        <div className={styles.trustBadge}>
          <div className={styles.trustValue}>
            <CountUp to={13} duration={1.6} /> Cities Served
          </div>
          <div className={styles.trustLabel}>Palm Beach + Broward</div>
        </div>
      </MotionSection>

      {/* Before/After slider removed (per Tiago) — was placed above Services
          which broke the flow, and the composite kitchen halves didn't read
          as a true B/A pair. Ready to re-enable when we have proper same-room
          before/after pairs from a real client shoot. Files still exist:
          public/images/ba_kitchen_before.jpg + ba_kitchen_after.jpg,
          component at app/_components/BeforeAfterSlider.tsx.
          See 00_STATE/ba-image-prompts.md for AI-generation prompts. */}

      {/* SERVICE AREA MAP was previously here. Moved to the bottom third
          (replaces the redundant text-list /areas section below) per 2026
          competitor audit — 5 of 7 top cleaning sites with embedded maps
          place them near the footer, not after the hero. */}

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
            description="Wall-to-wall fine-dust cleanup — the mess the contractor leaves behind."
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
          <WhyCard title="Eco + Pet-Safe" body="EPA-safe products across the board. Kid and pet friendly. Nothing that damages your finishes — ever." />
          <WhyCard title="Same Crew, Every Visit" body="W2 employees, never contractors. Two cleaners per visit — paired, trained to the same boutique standard, and in uniform every time." />
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

          {/* Live-from-Google badge — prominent trust signal. The "G" logo
              earns its space here; real Google reviews are the highest
              social proof a local service business can show. */}
          {google.ok ? (
            <div className={styles.googleLiveBadge}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>
                <strong>{liveRating.toFixed(1)} ★</strong> on Google · {liveCount} verified reviews
              </span>
              <span className={styles.googleLiveBadgeDot} aria-hidden="true" />
              <span className={styles.googleLiveBadgePulse}>LIVE</span>
            </div>
          ) : (
            <div className={styles.reviewsMeta}>
              {liveRating.toFixed(1)} ★ GOOGLE RATING · {liveCount} VERIFIED REVIEWS
            </div>
          )}

          {google.profileUrl && (
            <a
              href={google.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.reviewsProfileLink}
            >
              Read all reviews on Google →
            </a>
          )}
        </div>
        <div className={styles.marquee}>
          <div className={styles.marqueeTrack}>
            {[...MARQUEE_REVIEWS, ...MARQUEE_REVIEWS].map((t, i) => (
              <div key={i} className={styles.reviewCard}>
                <div className={styles.rStars}>★ ★ ★ ★ ★</div>
                <div className={`fraunces ${styles.rText}`}>"{t.text}"</div>
                <div className={styles.rAuthor}>
                  <strong>{t.name}</strong> · {t.city}
                  {t.source === 'google' && (
                    <span className={styles.rSourceBadge} aria-label="Verified Google review">
                      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style={{ verticalAlign: 'middle', marginLeft: 6 }}>
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </MotionSection>

      {/* ============ SERVICE AREA MAP (moved here from above hero per
          2026 competitor audit — cleaning sites overwhelmingly place
          the map in the bottom third of the homepage, near the FAQ +
          final CTA, as a "you're qualified, now book" closer signal). */}
      <div id="areas">
        <ServiceAreaMap />
      </div>

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
          <Link href="/about">About</Link>
          <a href="#reviews">Reviews</a>
          <Link href="/work-for-us">Work For Us</Link>
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
