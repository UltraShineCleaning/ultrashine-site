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

// Real verified reviews — sourced from HomeAdvisor profile (CT chapter,
// the original Ultra Shine listing from the 2018 founding):
// https://www.homeadvisor.com/rated.UltraShineCleaning.68124585.html
// 4.9★ from 25 verified reviews. Attribution kept as 'Verified Client'
// because HomeAdvisor only shows first name + initial in public snippets.
const TESTIMONIALS = [
  {
    name: 'Verified Client',
    city: 'HomeAdvisor',
    text: 'Ultra Shine Cleaning was very professional when they came to my home, they got right to work. I have a dog, and they were very friendly and kind towards him.',
  },
  {
    name: 'Verified Client',
    city: 'HomeAdvisor',
    text: 'Ultra Shine Cleaning is wonderful. Easy to make an appointment with flexible times. Did a great job cleaning the entire house. I would highly recommend.',
  },
  {
    name: 'Verified Client',
    city: 'HomeAdvisor',
    text: 'Anna and her team came on time and they were friendly, professional and efficient. My house has never looked better. I will definitely use them not only again but continuously.',
  },
  {
    name: 'Verified Client',
    city: 'HomeAdvisor',
    text: 'Francine is absolutely wonderful and did a beautiful job for our first cleaning! She is very professional and my house looks beautiful. I would highly recommend her services!',
  },
  {
    name: 'Verified Client',
    city: 'HomeAdvisor',
    text: 'Francine and her team are very professional, easy to work with, accommodate customer schedules, and I highly recommend Ultra Shine Cleaning.',
  },
  {
    name: 'Verified Client',
    city: 'HomeAdvisor',
    text: 'The house has never been this clean. I highly recommend Ultra Shine Cleaning!',
  },
  {
    name: 'Verified Client',
    city: 'HomeAdvisor',
    text: 'Amazing job on the deep clean. Everything was thorough — they even organized our storage boxes. Terrific customer service. A team invested in their work.',
  },
  {
    name: 'Verified Client',
    city: 'HomeAdvisor',
    text: 'Great first job. Will be coming back!',
  },
];

// Until user shares Google Place ID, link to Google search for the
// business — Google shows the listing + "Write a review" button there.
const GOOGLE_REVIEW_URL = 'https://www.google.com/search?q=Ultra+Shine+Cleaning+Boca+Raton';

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
          <p className={styles.eyebrow}>VERIFIED REVIEWS · TWO PLATFORMS</p>
          <h1 className={`fraunces ${styles.h1}`}>
            What our <em>clients</em> say.
          </h1>
          <p className={styles.heroSub}>
            Real verified reviews from clients across South Florida +
            our original Connecticut chapter. We earn every star — and
            we'd love to earn yours.
          </p>
          <div className={styles.ratingBar} style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 18, justifyContent: 'center' }}>
            <span className={styles.stars}>★ ★ ★ ★ ★</span>
            <span className={styles.ratingValue}>5.0</span>
            <span className={styles.ratingLabel}>Google · 18 reviews</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span className={styles.ratingValue}>4.9</span>
            <span className={styles.ratingLabel}>HomeAdvisor · 25 reviews</span>
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
