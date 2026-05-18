'use client';

import styles from './page.module.css';

/**
 * /review-card — Printable QR card for cleaners to leave at every job.
 *
 * Print 1 → photocopy a stack → cleaners drop one on the counter after
 * every cleaning. Every card scanned = potential Google review.
 *
 * Print CSS hides everything except the card itself + sets letter-size
 * margins. The Print button uses window.print(). Two cards fit on one
 * letter page in portrait orientation.
 */

const GOOGLE_REVIEW_URL = 'https://maps.app.goo.gl/EGeuJViEFazQQe579';
const QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&color=002C98&bgcolor=FFFFFF&data=${encodeURIComponent(
  GOOGLE_REVIEW_URL,
)}`;

function ReviewCardSingle() {
  return (
    <div className={styles.card}>
      {/* Top: brand */}
      <div className={styles.brandRow}>
        <span className={styles.brandMark}>✦</span>
        <span className={styles.brandName}>Ultra Shine Cleaning</span>
      </div>

      {/* Headline */}
      <h2 className={styles.thanks}>
        Thank you for letting us into your home.
      </h2>
      <p className={styles.sub}>
        Was your cleaning &#10025; &#10025; &#10025; &#10025; &#10025;?
        <br />
        Share it on Google in 60 seconds.
      </p>

      {/* QR */}
      <div className={styles.qrWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={QR_URL}
          alt="Scan to leave a Google review"
          className={styles.qrImg}
        />
        <p className={styles.qrLabel}>SCAN WITH PHONE CAMERA</p>
      </div>

      {/* Backup URL */}
      <p className={styles.backupUrl}>
        Or visit&nbsp;
        <strong>ultrashinecleaningfl.com/leave-a-review</strong>
      </p>

      {/* Sign-off */}
      <div className={styles.signoff}>
        <p className={styles.signoffName}>— Tiago + Francine Rena</p>
        <p className={styles.signoffPhone}>(561) 583-6694</p>
      </div>
    </div>
  );
}

export default function ReviewCardPage() {
  return (
    <main className={styles.page}>
      {/* Toolbar (hidden in print via .noPrint) */}
      <div className={`${styles.toolbar} ${styles.noPrint}`}>
        <div className={styles.toolbarInner}>
          <div>
            <p className={styles.toolbarLabel}>PRINTABLE REVIEW CARD</p>
            <p className={styles.toolbarSub}>
              Two cards per letter page. Print → photocopy a stack → leave one
              at every job.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className={styles.printBtn}
          >
            🖨 Print This Page
          </button>
        </div>
      </div>

      {/* Print sheet — two identical cards stacked vertically on letter paper */}
      <div className={styles.sheet}>
        <ReviewCardSingle />
        <div className={styles.cutLine} aria-hidden>
          - - - - - - - - - - - - - - - - - - - - cut here - - - - - - - - - - - - - - - - - - - -
        </div>
        <ReviewCardSingle />
      </div>
    </main>
  );
}
