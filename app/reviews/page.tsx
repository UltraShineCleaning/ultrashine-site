import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '../_components/SiteHeader';
import SiteFooter from '../_components/SiteFooter';
import JsonLd from '../_components/JsonLd';
import { fetchGoogleReviews } from '../_lib/google-reviews';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Reviews · Ultra Shine Cleaning · 5.0★ on Google',
  description:
    'Read what 100+ South Florida families say about Ultra Shine Cleaning. 5.0-star Google rating across Boca Raton, Delray Beach, Fort Lauderdale, Parkland, and 9 other cities. Real reviews from real clients.',
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

// Google Maps share link to the Ultra Shine Cleaning business profile.
// Opens the live Google profile where users can read all 18 reviews
// + tap "Write a review" directly. Provided by Tiago, May 2026.
const GOOGLE_REVIEW_URL = 'https://maps.app.goo.gl/EGeuJViEFazQQe579';

export default async function ReviewsPage() {
  // Live Google reviews — falls back gracefully when env vars are unset
  // or the Places API call fails. See app/_lib/google-reviews.ts.
  const google = await fetchGoogleReviews();

  const googleRating = google.ok && google.rating != null ? google.rating : 5.0;
  const googleCount = google.ok && google.count != null ? google.count : 18;

  // Schema for the reviews page — aggregate rating + individual reviews.
  // This is the BIG SEO win: makes star ratings appear next to the
  // ultrashinecleaningfl.com result in Google search. Prefers live Google
  // data when available, falls back to the canonical hardcoded values.
  const reviewsSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': 'https://ultrashinecleaningfl.com/#business',
    name: 'Ultra Shine Cleaning',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: googleRating.toFixed(1),
      reviewCount: String(googleCount),
      bestRating: '5',
      worstRating: '1',
    },
    review: [
      // Live Google reviews first (real names + ratings + dates from the API)
      ...google.reviews.map((r) => ({
        '@type': 'Review',
        reviewRating: { '@type': 'Rating', ratingValue: String(r.rating), bestRating: '5' },
        author: { '@type': 'Person', name: r.author_name },
        publisher: { '@type': 'Organization', name: 'Google' },
        datePublished: new Date(r.time * 1000).toISOString().slice(0, 10),
        reviewBody: r.text,
      })),
      // Then HomeAdvisor testimonials
      ...TESTIMONIALS.map((t) => ({
        '@type': 'Review',
        reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
        author: { '@type': 'Person', name: t.name },
        publisher: { '@type': 'Organization', name: t.city },
        reviewBody: t.text,
      })),
    ],
  };

  return (
    <main>
      <JsonLd data={reviewsSchema} />
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
            <span className={styles.ratingValue}>{googleRating.toFixed(1)}</span>
            <span className={styles.ratingLabel}>Google · {googleCount} reviews</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span className={styles.ratingValue}>4.9</span>
            <span className={styles.ratingLabel}>HomeAdvisor · 25 reviews</span>
          </div>
        </div>
      </section>

      {/* TRUST DOSSIER — sectioned by source platform.
          GOOGLE first (live from the Places API, with prominent G branding),
          HOMEADVISOR second (historical, 25 verified reviews from the CT chapter).
          Easy to extend later — add an Angi / BBB / Yelp section by dropping
          another <section className={styles.platformSection}> block in. */}

      {google.reviews.length > 0 && (
        <section className={styles.platformSection}>
          <div className={styles.platformHead}>
            <div className={styles.platformBadge}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>FROM GOOGLE · LIVE</span>
              <span className={styles.platformBadgeDot} aria-hidden="true" />
            </div>
            <h2 className={styles.platformHeadline}>
              {googleRating.toFixed(1)} ★ across {googleCount} Google reviews.
            </h2>
            {google.profileUrl && (
              <a
                href={google.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.platformProfileLink}
              >
                View all on Google →
              </a>
            )}
          </div>
          <div className={styles.grid}>
            {google.reviews.map((r, i) => (
              <article key={`g-${i}`} className={styles.card}>
                <div className={styles.cardStars}>
                  {Array.from({ length: Math.max(1, Math.round(r.rating)) }).map((_, idx) => '★ ').join('').trim()}
                </div>
                <p className={styles.cardQuote}>"{r.text}"</p>
                <p className={styles.cardAuthor}>
                  {r.author_name} <span>· {r.relative_time_description}</span>
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className={styles.platformSection}>
        <div className={styles.platformHead}>
          <div className={`${styles.platformBadge} ${styles.platformBadgeMuted}`}>
            <span>FROM HOMEADVISOR · ARCHIVE</span>
          </div>
          <h2 className={styles.platformHeadline}>
            4.9 ★ across 25 HomeAdvisor reviews.
          </h2>
          <a
            href="https://www.homeadvisor.com/rated.UltraShineCleaning.68124585.html"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.platformProfileLink}
          >
            View all on HomeAdvisor →
          </a>
        </div>
        <div className={styles.grid}>
          {TESTIMONIALS.map((t, i) => (
            <article key={`ha-${i}`} className={styles.card}>
              <div className={styles.cardStars}>★ ★ ★ ★ ★</div>
              <p className={styles.cardQuote}>"{t.text}"</p>
              <p className={styles.cardAuthor}>
                {t.name} <span>· HomeAdvisor</span>
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
