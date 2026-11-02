import Link from 'next/link';
import SiteHeader from '../_components/SiteHeader';
import SiteFooter from '../_components/SiteFooter';
import { POSTS } from './_data/posts';
import BlogSearch, { type BlogCard } from './BlogSearch';
import styles from './page.module.css';

/**
 * /blog — index page for all blog posts.
 *
 * Server-rendered. Cards show cover image, title, excerpt, date,
 * reading time, and tags. Most-recent first.
 */
export default function BlogIndexPage() {
  const sorted = [...POSTS].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  const cards: BlogCard[] = sorted.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    coverImage: p.coverImage,
    publishedAt: p.publishedAt,
    readingMinutes: p.readingMinutes,
    tags: p.tags,
    category: p.category,
    haystack: [p.title, p.excerpt, p.category ?? '', ...p.tags, ...(p.faq ?? []).map((f) => f.q)]
      .join(' ')
      .toLowerCase(),
  }));

  return (
    <main>
      <SiteHeader inPage={false} />

      {/* ============ HERO ============ */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <p className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span> / </span>
            <span style={{ opacity: 0.8 }}>Blog</span>
          </p>

          <p className={styles.heroEyebrow}>NOTES + FIELD GUIDE</p>

          <h1 className={`fraunces ${styles.heroHeadline}`}>
            Cleaning, the <em>Florida</em> way.
          </h1>

          <p className={styles.heroSub}>
            Real advice from seven years of cleaning South Florida homes.
            Humidity, salt air, schedules that actually work for Boca Raton
            and the surrounding cities. No fluff.
          </p>
        </div>
      </section>

      {/* ============ POSTS GRID ============ */}
      <section className={styles.postsSection}>
        <div className={styles.postsInner}>
          <BlogSearch posts={cards} />
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className={styles.finalCta}>
        <div className={styles.finalInner}>
          <p className="eyebrow" style={{ color: 'var(--white)', opacity: 0.7 }}>
            ULTRA SHINE CLEANING
          </p>
          <h2 className={`fraunces ${styles.finalHead}`}>
            Skip the reading. We&apos;ll <em>handle it</em>.
          </h2>
          <p className={styles.finalSub}>
            Free quote in your inbox within an hour. No surprises, no upsells.
          </p>
          <Link href="/quote" className="btn btn-primary">
            Get My Quote
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

