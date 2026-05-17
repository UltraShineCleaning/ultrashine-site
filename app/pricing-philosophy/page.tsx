import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '../_components/SiteHeader';
import SiteFooter from '../_components/SiteFooter';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Why We Don\'t List Flat Prices · Ultra Shine Cleaning',
  description:
    "Every home is different. Companies that publish flat cleaning rates either overcharge the easy jobs or under-deliver on the hard ones. Here's why Ultra Shine quotes every home in person — and what makes our pricing process the most honest in South Florida.",
};

export default function PricingPhilosophyPage() {
  return (
    <main>
      <SiteHeader inPage={false} />

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span> / </span>
            <span style={{ opacity: 0.8 }}>Why no flat prices</span>
          </p>
          <p className={styles.eyebrow}>PRICING · OUR HONEST TAKE</p>
          <h1 className={styles.h1}>
            Why we <em>don't list</em> flat prices.
          </h1>
          <p className={styles.heroSub}>
            Short answer: every home is different. The longer answer is
            about honesty — and why companies that DO list flat rates
            are usually playing you.
          </p>
        </div>
      </section>

      {/* SECTION 1 — The honest reason */}
      <section className={styles.section}>
        <div className={styles.sectionWrap}>
          <p className={styles.sectionLabel}>The honest reason</p>
          <h2 className={styles.sectionHead}>
            A <em>2,000 sq ft Boca condo</em> is not the same job as a 4,500 sq ft Parkland home.
          </h2>
          <div className={styles.prose}>
            <p>
              A condo with one tenant, no pets, and a recent move-in date
              might take our team 3 hours. A 5-bedroom estate with three
              kids, two dogs, and a kitchen that's been lived in for six
              months might take 9 hours and need two cleaners.
            </p>
            <p>
              <strong>Charging both the same price would be insulting
              to one of you</strong> — either we'd overcharge the condo
              (because we're hedging against the worst case) or
              under-deliver in the estate (because we capped at the
              same number).
            </p>
            <p>
              So instead of pretending one price fits everyone, we
              quote every home in person. Free, no obligation. You
              get a precise number that reflects your actual home —
              not a fake average that benefits us at someone's expense.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2 — Comparison */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionWrap}>
          <p className={styles.sectionLabel}>The difference</p>
          <h2 className={styles.sectionHead}>
            What flat-rate companies <em>don't tell you</em>.
          </h2>

          <div className={styles.comparison}>
            <div className={`${styles.compCard} ${styles.compCardBad}`}>
              <div className={styles.compEyebrow}>FLAT-RATE COMPETITORS</div>
              <div className={styles.compTitle}>
                "$199 for a standard cleaning"
              </div>
              <ul className={styles.compList}>
                <li>Price designed for the EASY end of their book — your home might be 1.5x harder</li>
                <li>Hidden upcharges on the day: "your bathroom needs a deep" → +$80, "lots of dust" → +$50</li>
                <li>Rushed work to fit the flat-rate timeline — corners cut</li>
                <li>No flexibility — same number whether you have 1 bathroom or 4</li>
                <li>Quote-day pressure: pay or they leave with the keys</li>
              </ul>
            </div>

            <div className={`${styles.compCard} ${styles.compCardGood}`}>
              <div className={styles.compEyebrow}>ULTRA SHINE APPROACH</div>
              <div className={styles.compTitle}>
                Custom quote, in person, in 1 hour
              </div>
              <ul className={styles.compList}>
                <li>Price reflects YOUR home — square footage, condition, frequency, add-ons</li>
                <li>No surprises on cleaning day — quote is the price, locked</li>
                <li>Time scoped to do the work right, not race against a flat rate</li>
                <li>Discounts for recurring (bi-weekly, weekly) — math we show you upfront</li>
                <li>No-obligation: walk away anytime, owe nothing for the quote</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — Our 4-step process */}
      <section className={styles.section}>
        <div className={styles.sectionWrap}>
          <p className={styles.sectionLabel}>How it works</p>
          <h2 className={styles.sectionHead}>
            Four steps from form to <em>spotless home</em>.
          </h2>
          <div className={styles.prose}>
            <p>
              The whole process is built around one principle: we don't
              quote until we see your space. Here's how it goes:
            </p>
          </div>

          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>01</div>
              <div className={styles.stepTitle}>You request a quote</div>
              <p className={styles.stepBody}>
                Fill out the form on our site. Takes 90 seconds. We get
                a notification immediately.
              </p>
              <div className={styles.stepDuration}>~1 minute</div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>02</div>
              <div className={styles.stepTitle}>We reach out</div>
              <p className={styles.stepBody}>
                Within the hour, our team texts or calls to confirm
                details and schedule a quick in-person walkthrough.
              </p>
              <div className={styles.stepDuration}>Within 1 hour</div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>03</div>
              <div className={styles.stepTitle}>Walkthrough + quote</div>
              <p className={styles.stepBody}>
                We come to your home (or do it virtually), see the
                space, ask questions, then send you a precise quote
                with no obligation.
              </p>
              <div className={styles.stepDuration}>15–30 min</div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>04</div>
              <div className={styles.stepTitle}>You decide + we clean</div>
              <p className={styles.stepBody}>
                Love the quote? Pick a date, we show up, clean to our
                standard, and you walk into a fresh home. Don't love
                it? No charge, no pressure, walk away.
              </p>
              <div className={styles.stepDuration}>When you're ready</div>
            </div>
          </div>
        </div>
      </section>

      {/* PULL QUOTE */}
      <section className={styles.pullQuoteWrap}>
        <div className={styles.pullQuote}>
          "We'd rather quote your home in person than pretend
          a website algorithm knows your kitchen better than we do."
          <div className={styles.pullQuoteAttr}>The Ultra Shine Standard</div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaCard}>
          <h2 className={styles.ctaHead}>
            Ready to see what <em>your</em> home costs?
          </h2>
          <p className={styles.ctaBody}>
            Custom quote within an hour. Walkthrough is free. No obligation.
            No surprises.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/quote" className="btn btn-coral">
              Request Your Free Quote
            </Link>
            <Link href="/faq" className="btn btn-primary">
              Read the full FAQ
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
