'use client';
import Image from 'next/image';
import Link from 'next/link';
import MobileNav from './MobileNav';
import styles from '../page.module.css';

type Props = {
  /** When true, anchor links scroll to homepage sections (use on / only).
   *  When false, anchor links navigate to homepage with hash (use on inner pages). */
  inPage?: boolean;
};

export default function SiteHeader({ inPage = true }: Props) {
  // On inner pages, anchor links should be /#services, not just #services
  const prefix = inPage ? '' : '/';

  return (
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
        <a href={`${prefix}#services`}>Services</a>
        <a href={`${prefix}#areas`}>Areas</a>
        <a href={`${prefix}#about`}>About</a>
        <a href={`${prefix}#reviews`}>Reviews</a>
        <a href={`${prefix}#faq`}>FAQ</a>
      </div>
      <div className={styles.navRight}>
        <a href="tel:5615836694" className={styles.navPhone}>(561) 583-6694</a>
        <Link href="/quote" className="btn btn-primary">Get Quote</Link>
        <MobileNav />
      </div>
    </nav>
  );
}
