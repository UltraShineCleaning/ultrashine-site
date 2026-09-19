import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';
import FaqSection from './_components/FaqSection';
import HeroScrollHome from './_components/HeroScrollHome';
import HeroScrollMobile from './_components/HeroScrollMobile';
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

  // Second marquee row runs the same reviews in reverse, so a given
  // review is never directly above its own copy in the other row.
  const REVERSED_REVIEWS = [...MARQUEE_REVIEWS].reverse();

  // Rating only — the review COUNT is deliberately never displayed. It was
  // removed everywhere on 2026-09-19; a rating is a claim about quality,
  // a count invites the reader to judge how small the business is.
  const liveRating = google.ok && google.rating != null ? google.rating : 5.0;

  return (
    <main>
      {/*
        The homepage's ONE h1. Until 2026-09-19 this page shipped TEN of them:
        HeroScrollHome and HeroScrollMobile each render an h1 per scene and both
        components are always in the DOM (the inactive one is only CSS-hidden),
        so Google read ten headings that said "A home that shines" / "Into the
        living room" and not one that said what the business does or where.
        Those are <p> now (identical class — zero visual change) and this is the
        real heading: the strongest on-page signal on the most important page,
        finally naming the service and the city.
      */}
      <h1 className="srOnly">
        House Cleaning Services in Boca Raton, FL — Ultra Shine Cleaning
      </h1>

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
      <HeroScrollMobile />

      {/* ============ TRUST STRIP ============ */}
      <MotionSection className={styles.trustStrip}>
        <div className={styles.trustBadge}>
          <span className={styles.trustIcon} aria-hidden="true"><TrustIcon d="shield" /></span>
          <div className={styles.trustValue}>Insured <em>+</em> Bonded</div>
          <div className={styles.trustLabel}>Certificate on request</div>
        </div>
        <div className={styles.trustBadge}>
          <span className={styles.trustIcon} aria-hidden="true"><TrustIcon d="check" /></span>
          <div className={styles.trustValue}>Background-Checked</div>
          <div className={styles.trustLabel}>Every team member</div>
        </div>
        <div className={styles.trustBadge}>
          <span className={styles.trustIcon} aria-hidden="true"><TrustIcon d="star" /></span>
          <div className={styles.trustValue}>
            <em><CountUp to={liveRating} decimals={1} duration={1.4} /></em> on Google
          </div>
          <div className={styles.trustLabel}>Verified reviews</div>
        </div>
        <div className={styles.trustBadge}>
          <span className={styles.trustIcon} aria-hidden="true"><TrustIcon d="pin" /></span>
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
            points={[
              'Weekly, bi-weekly or monthly',
              'Same team every visit',
              'No long-term contract',
            ]}
            wide
          />
          <TiltCard
            href="/services/deep-cleaning"
            image="/images/flow_hand_marble.jpg"
            label="Deep Cleaning"
            points={[
              'Baseboards, grout, ceiling fans',
              'Inside oven and fridge',
              'Quarterly reset',
            ]}
          />
          <TiltCard
            href="/services/move-in-out"
            image="/images/service_movein_boxes.jpg"
            label="Move-In / Move-Out"
            points={[
              'Inside cabinets and drawers',
              'Landlord-grade detail',
              'Built to return your deposit',
            ]}
          />
          <TiltCard
            href="/services/commercial"
            image="/images/service_commercial_office.jpg"
            label="Commercial"
            points={[
              'Offices, retail and clinics',
              'After-hours scheduling',
              'COI on request',
            ]}
          />
          <TiltCard
            href="/services/post-construction"
            image="/images/service_postconstruction.jpg"
            label="Post-Construction"
            points={[
              'Fine drywall dust removal',
              'Paint splatter and debris',
              'Wall to wall, top to bottom',
            ]}
          />
        </div>
      </MotionSection>

      {/* ============ HOW IT WORKS ============ */}
      <MotionSection className={styles.how}>
        <p className="eyebrow">HOW IT WORKS</p>
        <h2 className={`fraunces ${styles.sectionHeadline}`}>
          Three simple steps to a <em>spotless</em> home.
        </h2>
        {/* A hairline runs behind all three nodes so the row reads as a
            JOURNEY rather than three unrelated facts. The old 64px numerals
            were the loudest thing in the section while carrying the least
            meaning — they now sit small inside 44px rings, doing the one job
            a number has here, which is ordering. Icons carry the meaning. */}
        <div className={styles.stepsTrack}>
          <div className={styles.stepsLine} aria-hidden="true" />
          <div className={styles.steps}>
            <Link href="/quote" className={styles.step}>
              <div className={styles.stepNode}><span className="mono">01</span></div>
              <span className={styles.stepIcon} aria-hidden="true"><StepIcon d="chat" /></span>
              <h3 className="fraunces">Connect</h3>
              <p>Tell us about your home — size, frequency, anything special. Quote in your inbox within an hour.</p>
            </Link>
            <Link href="/quote" className={styles.step}>
              <div className={styles.stepNode}><span className="mono">02</span></div>
              <span className={styles.stepIcon} aria-hidden="true"><StepIcon d="calendar" /></span>
              <h3 className="fraunces">Schedule</h3>
              <p>Pick a date that works for you. We confirm by text. Your team is locked in.</p>
            </Link>
            <Link href="/quote" className={styles.step}>
              <div className={styles.stepNode}><span className="mono">03</span></div>
              <span className={styles.stepIcon} aria-hidden="true"><StepIcon d="sparkle" /></span>
              <h3 className="fraunces">Enjoy The Sparkle</h3>
              <p>We arrive on time, clean to the standard, and leave the keys exactly where you asked.</p>
            </Link>
          </div>
        </div>
      </MotionSection>

      {/* ============ WHY ULTRA SHINE ============ */}
      <MotionSection className={`${styles.why} dot-grid`}>
        <p className="eyebrow">WHY ULTRA SHINE</p>
        <h2 className={`fraunces ${styles.sectionHeadline}`}>
          Built on <em>detail</em>. Trusted on results.
        </h2>
        <div className={styles.whyGrid}>
          {/* Bodies trimmed to roughly even length — the old "Same Crew" card
              ran three times longer than "Flexible Scheduling", which made the
              row look broken before anyone read a word of it. */}
          {/* Molly Maid leads on a "44-point checklist" and it is the only
              thing on any national homepage that isn't interchangeable — a
              NUMBER is the difference between a claim and a promise. Ultra
              Shine already has one: 29 tasks written out in the client
              packet. It was just never said out loud on the site.
              Source: 06_CLIENT_PACKET/_build_packet.py, "what we always
              clean" — 9 kitchen, 7 bath, 6 living/bed, 7 detail. */}
          <WhyCard
            icon="checklist"
            title="The 29-Point Standard"
            body="The same written checklist every visit — 29 points, countertops to baseboards. EPA-safe products, kid and pet friendly."
          />
          <WhyCard
            icon="crew"
            title="Same Crew, Every Visit"
            body="Two cleaners per visit, the same pair wherever scheduling allows. Background-checked and in uniform."
          />
          <WhyCard
            icon="guarantee"
            title="Satisfaction Guaranteed"
            body="If something isn't right, we come back and redo it free. No forms, no argument, no charge."
          />
          <WhyCard
            icon="schedule"
            title="Flexible Scheduling"
            body="Weekly, bi-weekly, monthly or one-time. Move a visit with a single text, no fee."
          />
        </div>
      </MotionSection>

      {/* ============ REVIEWS MARQUEE ============ */}
      <MotionSection id="reviews" className={styles.reviews}>
        <div className={styles.reviewsHead}>
          <p className={`eyebrow ${styles.reviewsEyebrow}`}>TRUSTED ACROSS SOUTH FLORIDA</p>
          <h2 className={`fraunces ${styles.sectionHeadline}`}>What our <em>clients</em> say.</h2>
          {/* The 100px ★★★★★ row that used to sit here is gone. Five
              enormous gold stars is the single most-used trust graphic on
              the internet — it made the section read as a template no
              matter what else changed. The rating now lives once, at a
              sane size, inside the pill below. */}

          {/* Glass pill, not the solid white one. White was the brightest
              thing in a dark section and pulled the eye before the
              headline did; a translucent fill with a hairline border sits
              IN the blue instead of on top of it. Review COUNT removed
              per Tiago — the rating is the claim, the number invites
              arithmetic about how small we are. */}
          {google.ok ? (
            <div className={styles.googleLiveBadge}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className={styles.googleBadgeStars} aria-hidden="true">★★★★★</span>
              <span>
                <strong>{liveRating.toFixed(1)} on Google</strong>
              </span>
            </div>
          ) : (
            <div className={styles.reviewsMeta}>
              ★★★★★ &nbsp;{liveRating.toFixed(1)} GOOGLE RATING
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
        {/* TWO rows, counter-scrolling. One long row of big cards reads as
            a single thing sliding past; two shorter rows moving against
            each other reads as volume. Row two is reversed so the same
            reviews never sit directly above one another.

            Each row duplicates its list once — the animation translates
            exactly -50%, so the copy lands where the original started and
            the loop is seamless. Change the list length and the loop still
            works; change the -50% and it will not. */}
        <div className={styles.marqueeRows}>
          <div className={`${styles.marquee} ${styles.marqueeL}`}>
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
          <div className={`${styles.marquee} ${styles.marqueeR}`}>
            <div className={styles.marqueeTrack}>
    {[...REVERSED_REVIEWS, ...REVERSED_REVIEWS].map((t, i) => (
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
        {/* SEO: this footer is the homepage's own (it does not use SiteFooter),
            and it was the weakest link hub on the site — the Company column
            offered three items and pointed "Reviews" at an on-page anchor, so
            /areas, /faq, /blog, /reviews and /pricing-philosophy got nothing
            from the highest-authority page we have. Internal <a href> swapped
            for <Link> at the same time: same crawlability, no full reload. */}
        <div className={styles.footerCol}>
          <h4>Services</h4>
          <Link href="/services">All Services</Link>
          <Link href="/services/regular-cleaning">Regular Cleaning</Link>
          <Link href="/services/deep-cleaning">Deep Cleaning</Link>
          <Link href="/services/move-in-out">Move-In / Out</Link>
          <Link href="/services/commercial">Commercial</Link>
          <Link href="/services/post-construction">Post-Construction</Link>
          <Link href="/cleaning-time-estimator">Cost Calculator</Link>
        </div>
        <div className={styles.footerCol}>
          <h4>Company</h4>
          <Link href="/about">About</Link>
          <Link href="/areas">Service Areas</Link>
          <Link href="/reviews">Reviews</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/pricing-philosophy">Our Pricing</Link>
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

/**
 * Trust-strip icons. Same stroke language as the service and why-card sets
 * — 1.5 weight, round caps, no fills — so the three icon groups on this
 * page read as one system instead of three borrowed sets.
 */
const TRUST_PATHS: Record<string, React.ReactNode> = {
  shield: (
    <>
      <path d="M12 3.2 19 6v5.4c0 4.3-2.9 7.6-7 9.4-4.1-1.8-7-5.1-7-9.4V6Z" />
      <path d="m9 11.9 2.2 2.2L15.4 10" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="9" r="3.4" />
      <path d="M5.5 20.2a6.5 6.5 0 0 1 13 0" />
      <path d="M17.6 4.1 19.3 5.8 22 3" />
    </>
  ),
  star: <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8Z" />,
  pin: (
    <>
      <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
};

const STEP_PATHS: Record<string, React.ReactNode> = {
  chat: (
    <>
      <path d="M4 6.5h16v11H8.5L4 20.5Z" />
      <path d="M8 11h8M8 14h5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8.5 3.5v4M15.5 3.5v4" />
      <path d="m9.4 14.8 1.5 1.5 3.4-3.4" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.4 13.7 8l4.6 1.7-4.6 1.7L12 16l-1.7-4.6L5.7 9.7 10.3 8Z" />
      <path d="m18.5 15.2.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8Z" />
    </>
  ),
};

function StepIcon({ d }: { d: keyof typeof STEP_PATHS }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {STEP_PATHS[d]}
    </svg>
  );
}

function TrustIcon({ d }: { d: keyof typeof TRUST_PATHS }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {TRUST_PATHS[d]}
    </svg>
  );
}

/**
 * Hand-drawn stroke icons for the "Built on detail" cards.
 *
 * Drawn inline rather than pulled from an icon set on purpose: a
 * generic library glyph is the fastest way to make a site look like
 * every other site. These share one visual language — 1.8 stroke,
 * round caps and joins, no fills — so the four read as a set.
 *
 * `currentColor` lets the CSS own the colour, so hover states and
 * dark sections don't need a second copy of each path.
 */
const WHY_ICONS: Record<string, React.ReactNode> = {
  // Clipboard with ticks — the 29-point standard
  checklist: (
    <>
      <path d="M9 4.5H7.5A2 2 0 0 0 5.5 6.5v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-13a2 2 0 0 0-2-2H15" />
      <rect x="9" y="2.8" width="6" height="3.4" rx="1.2" />
      <path d="m9.2 11.4 1.3 1.3 2.6-2.6M9.2 16.4l1.3 1.3 2.6-2.6" />
    </>
  ),
  // Two figures — the same pair, every visit
  crew: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9.5" r="2.3" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <path d="M16 15.5a4.6 4.6 0 0 1 4.5 4" />
    </>
  ),
  // Shield with a check — the guarantee
  guarantee: (
    <>
      <path d="M12 3.2 19 6v5.4c0 4.3-2.9 7.6-7 9.4-4.1-1.8-7-5.1-7-9.4V6Z" />
      <path d="m9 11.9 2.2 2.2L15.4 10" />
    </>
  ),
  // Calendar with a moved date — flexible scheduling
  schedule: (
    <>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8.5 3.5v4M15.5 3.5v4" />
      <path d="M8.8 14.6h2.4M8.8 17.4h6.4" />
    </>
  ),
};

function WhyCard({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: keyof typeof WHY_ICONS;
}) {
  return (
    <div className={styles.whyCard}>
      <span className={styles.whyIcon} aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          width="26"
          height="26"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {WHY_ICONS[icon]}
        </svg>
      </span>
      <h3 className="fraunces">{title}</h3>
      <p>{body}</p>
    </div>
  );
}
