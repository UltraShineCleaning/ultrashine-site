import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '../_components/SiteHeader';
import SiteFooter from '../_components/SiteFooter';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Reviews · Ultra Shine Cleaning · 4.9★ on Google',
  description:
    'Read what 100+ South Florida families say about Ultra Shine Cleaning. 4.9-star Google rating across Boca Raton, Delray Beach, Fort Lauderdale, Parkland, and 9 other cities. Real reviews from real clients.',
};

const TESTIMONIALS = [
  {
    name: 'Sandra P.',
    city: 'Boca Raton',
    text: 'Got a quote at 9 AM, scheduled by 11, my house was sparkling by 3. The Rena team is the best in Boca, hands down.',
  },
  {
    name: 'Karen M.',
    city: 'Delray Beach',
    text: 'Mariana was incredible — every corner spotless, and she even folded the laundry. We\'re booking weekly now.',
  },
  {
    name: 'Patricia L.',
    city: 'Parkland',
    text: 'Came home to a fresh house and my husband almost cried. Every detail handled. Worth every penny.',
  },
  {
    name: 'The Davidsons',
    city: 'Boynton Beach',
    text: 'After our renovation the dust was unbelievable. Ultra Shine left it move-in ready in one visit. Pros.',
  },
  {
    name: 'Rachel T.',
    city: 'Coral Springs',
    text: "I've used three different cleaning companies in Boca. Ultra Shine is by far the most thorough — I'm done shopping.",
  },
  {
    name: 'Marcus R.',
    city: 'Deerfield Beach',
    text: 'Booked them for a move-out clean. Got my full deposit back. Landlord said it was the cleanest unit she\'d seen.',
  },
  {
    name: 'The Tellers',
    city: 'Boca Raton',
    text: 'Best cleaning service we\'ve found in Boca. Trustworthy team, beautifully done, and they remember our preferences.',
  },
  {
    name: 'Brookline Real Estate',
    city: 'Fort Lauderdale',
    text: 'Tiago and his team transformed our office. Now we use them weekly — clients always comment on how clean it is.',
  },
];

// Direct link template to leave a Google review (replace placeID once verified)
// Format: https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID
const GOOGLE_REVIEW_URL = 'https://search.google.com/local/writereview?placeid=ChIJYourPlaceIDHere';

export default function ReviewsPage() {
  return (
    <main>
      <SiteHeader inPage={false} />

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span> / </span>
            <span style={{ opacity: 0.8 }}>Reviews</span>
          </p>
          <p className={styles.eyebrow}>VERIFIED · GOOGLE 4.9★</p>
          <h1 className={`fraunces ${styles.h1}`}>
            What our <em>clients</em> say.
          </h1>
          <p className={styles.heroSub}>
            Real reviews from real Palm Beach + Broward families.
            We earn every star — and we'd love to earn yours.
          </p>
          <div className={styles.ratingBar}>
            <span className={styles.stars}>★ ★ ★ ★ ★</span>
            <span className={styles.ratingValue}>4.9</span>
            <span className={styles.ratingLabel}>Google verified</span>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL GRID */}
      <section className={styles.gridSection}>
        <div className={styles.grid}>
          {TESTIMONIALS.map((t, i) => (
            <article key={i} className={styles.card}>
              <div className={styles.cardStars}>★ ★ ★ ★ ★</div>
              <p className={styles.cardQuote}>"{t.text}"</p>
              <p className={styles.cardAuthor}>
                {t.name} <span>· {t.city}</span>
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* WRITE A REVIEW CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <p className={styles.ctaEyebrow}>WE'RE A FAMILY BUSINESS — REVIEWS MATTER</p>
          <h2 className={styles.ctaTitle}>
            Were we <em>great</em>? Tell the world.
          </h2>
          <p className={styles.ctaBody}>
            If your clean was everything you hoped for, a Google review
            is the single best gift you can give us. It takes 30 seconds
            and helps other South Florida families find us.
          </p>
          <div className={styles.ctaButtonRow}>
            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-coral"
            >
              Leave a Google Review
            </a>
            <Link href="/quote" className="btn btn-secondary">
              Not a client yet? Get a quote
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
