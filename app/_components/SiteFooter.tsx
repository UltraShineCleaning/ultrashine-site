import Image from 'next/image';
import Link from 'next/link';
import styles from '../page.module.css';

export default function SiteFooter() {
  return (
    <>
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
          <Link href="/services/regular-cleaning">Regular Cleaning</Link>
          <Link href="/services/deep-cleaning">Deep Cleaning</Link>
          <Link href="/services/move-in-out">Move-In / Out</Link>
          <Link href="/services/commercial">Commercial</Link>
          <Link href="/services/post-construction">Post-Construction</Link>
        </div>
        <div className={styles.footerCol}>
          <h4>Company</h4>
          <Link href="/about">About</Link>
          <Link href="/#reviews">Reviews</Link>
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
    </>
  );
}
