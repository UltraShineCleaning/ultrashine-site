import Link from 'next/link';
import SiteHeader from '../_components/SiteHeader';
import SiteFooter from '../_components/SiteFooter';
import styles from './page.module.css';

/**
 * /leave-a-review — Single-purpose conversion page.
 *
 * Goal: convert "I'm a happy customer" into "actual Google review."
 *
 * How clients land here:
 *  - Link in cleaning-day text from Tiago/Francine
 *  - Link in the daily summary email (if customer marked happy)
 *  - QR code printed on a card the cleaning team leaves on the counter
 *  - Link in /reviews page
 *
 * Why Google reviews specifically:
 *  - They're the #1 ranking signal for the local pack ("cleaning Boca Raton")
 *  - Reviews that mention city + service ("amazing deep clean in Boca")
 *    literally rank us for those phrases
 *  - Tiago can convert satisfied customers; this page removes friction
 */

const GOOGLE_REVIEW_URL = 'https://maps.app.goo.gl/EGeuJViEFazQQe579';

// QR code rendered via qrserver.com — free public API, no signup, super stable.
// We pass the Google review URL directly so scanning the QR opens Google's
// review form without going through this page.
const QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&color=002C98&bgcolor=FFFFFF&data=${encodeURIComponent(
  GOOGLE_REVIEW_URL,
)}`;

export default function LeaveAReviewPage() {
  return (
    <main>
      <SiteHeader inPage={false} />

      {/* ============ HERO ============ */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroOverlay} />

        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>THANK YOU · FROM TIAGO + FRANCINE</p>

          <h1 className={`fraunces ${styles.headline}`}>
            Mind sharing your <em>experience</em>?
          </h1>

          <p className={styles.sub}>
            Honest reviews — the good and the &quot;here&apos;s what could&apos;ve been better&quot;
            — are how small businesses like ours grow.
            <br />
            <br />
            One minute of your time means everything to our team.
          </p>
        </div>
      </section>

      {/* ============ THE BIG ASK ============ */}
      <section className={styles.askSection}>
        <div className={styles.askInner}>
          <div className={styles.askLeft}>
            <p className="eyebrow">FASTEST WAY · 60 SECONDS</p>
            <h2 className={`fraunces ${styles.askHead}`}>
              Leave a review on <em>Google</em>.
            </h2>
            <p className={styles.askBody}>
              Tap the button — Google opens your review form pre-filled with
              Ultra Shine Cleaning. Star rating + a sentence or two. That&apos;s it.
            </p>

            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.bigCta}
            >
              <span className={styles.bigCtaStars}>★ ★ ★ ★ ★</span>
              <span className={styles.bigCtaText}>Leave a Google Review</span>
              <span className={styles.bigCtaArrow}>→</span>
            </a>

            <p className={styles.askFooter}>
              Or scan the code with your phone camera →
            </p>
          </div>

          <div className={styles.askRight}>
            <div className={styles.qrCard}>
              {/* Plain <img> on purpose — qrserver.com returns a tiny PNG
                  that we don't need Next.js Image optimization on. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={QR_URL}
                alt="Scan to leave a Google review for Ultra Shine Cleaning"
                width={280}
                height={280}
                className={styles.qrImage}
              />
              <p className={styles.qrLabel}>SCAN WITH PHONE CAMERA</p>
              <p className={styles.qrSubLabel}>Opens Google review form</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ NOT 5 STARS? ============ */}
      <section className={styles.feedbackSection}>
        <div className={styles.feedbackInner}>
          <div className={styles.feedbackBadge}>NOT 5 STARS?</div>
          <h2 className={`fraunces ${styles.feedbackHead}`}>
            Tell us first — we&apos;ll make it right.
          </h2>
          <p className={styles.feedbackBody}>
            If your clean didn&apos;t hit the standard, we want to know before
            it shows up in a review. Our 100% satisfaction guarantee means we
            come back free until you&apos;re happy. Text or call Tiago directly:
          </p>

          <a href="tel:5615836694" className={styles.feedbackPhone}>
            (561) 583-6694
          </a>

          <p className={styles.feedbackOr}>
            or email{' '}
            <a href="mailto:contact@ultrashinecleaningfl.com">
              contact@ultrashinecleaningfl.com
            </a>
          </p>
        </div>
      </section>

      {/* ============ BACK TO SITE ============ */}
      <section className={styles.backSection}>
        <div className={styles.backInner}>
          <p className={styles.backText}>
            Thank you for choosing Ultra Shine —{' '}
            <Link href="/">back to home</Link>
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
