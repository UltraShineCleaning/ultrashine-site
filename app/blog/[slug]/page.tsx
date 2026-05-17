import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from '../../_components/SiteHeader';
import SiteFooter from '../../_components/SiteFooter';
import JsonLd from '../../_components/JsonLd';
import { POSTS, getPost } from '../_data/posts';
import styles from './page.module.css';

type Params = { slug: string };

/** Pre-render all blog post pages at build time (static + zero runtime cost) */
export function generateStaticParams(): Params[] {
  return POSTS.map((p) => ({ slug: p.slug }));
}

/** Per-post SEO metadata */
export function generateMetadata({ params }: { params: Params }): Metadata {
  const post = getPost(params.slug);
  if (!post) return { title: 'Post Not Found' };

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author],
      images: [
        {
          url: `https://ultrashinecleaningfl.com${post.coverImage}`,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    alternates: {
      canonical: `https://ultrashinecleaningfl.com/blog/${post.slug}`,
    },
  };
}

export default function BlogPostPage({ params }: { params: Params }) {
  const post = getPost(params.slug);
  if (!post) notFound();

  const otherPosts = POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  // Schema.org Article — tells Google this is an article (rich snippet eligibility)
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: `https://ultrashinecleaningfl.com${post.coverImage}`,
    datePublished: post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@id': 'https://ultrashinecleaningfl.com/#business',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://ultrashinecleaningfl.com/blog/${post.slug}`,
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://ultrashinecleaningfl.com/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://ultrashinecleaningfl.com/blog' },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: `https://ultrashinecleaningfl.com/blog/${post.slug}`,
      },
    ],
  };

  return (
    <main>
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <SiteHeader inPage={false} />

      {/* ============ HERO ============ */}
      <section className={styles.hero}>
        <div
          className={styles.heroBg}
          style={{ backgroundImage: `url(${post.coverImage})` }}
        />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <p className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span> / </span>
            <Link href="/blog">Blog</Link>
            <span> / </span>
            <span style={{ opacity: 0.7 }}>{post.tags[0]}</span>
          </p>

          <div className={styles.heroTags}>
            {post.tags.map((tag) => (
              <span key={tag} className={styles.heroTag}>
                {tag}
              </span>
            ))}
          </div>

          <h1 className={`fraunces ${styles.heroHeadline}`}>{post.title}</h1>

          <div className={styles.heroMeta}>
            <span>{post.author}</span>
            <span className={styles.heroDot}>·</span>
            <span>{formatDate(post.publishedAt)}</span>
            <span className={styles.heroDot}>·</span>
            <span>{post.readingMinutes} min read</span>
          </div>
        </div>
      </section>

      {/* ============ ARTICLE BODY ============ */}
      <article className={styles.article}>
        <div
          className={styles.body}
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />

        {/* Author card */}
        <div className={styles.authorCard}>
          <div className={styles.authorAvatar}>
            {post.author
              .split(/\s+/)
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className={styles.authorMeta}>
            <p className={styles.authorName}>{post.author}</p>
            <p className={styles.authorBio}>
              Co-founder of Ultra Shine Cleaning. Boca Raton-based since 2021.
            </p>
          </div>
        </div>

        {/* Inline CTA */}
        <div className={styles.inlineCta}>
          <p className={styles.inlineCtaEyebrow}>READY FOR A CLEAN?</p>
          <h3 className={`fraunces ${styles.inlineCtaHead}`}>
            Free quote in your inbox <em>within an hour</em>.
          </h3>
          <Link href="/quote" className="btn btn-coral">
            Get Your Free Quote
          </Link>
        </div>
      </article>

      {/* ============ MORE POSTS ============ */}
      {otherPosts.length > 0 && (
        <section className={styles.moreSection}>
          <div className={styles.moreInner}>
            <p className="eyebrow">KEEP READING</p>
            <h2 className={`fraunces ${styles.moreHead}`}>
              More from the <em>field guide</em>.
            </h2>
            <div className={styles.moreGrid}>
              {otherPosts.map((other) => (
                <Link
                  key={other.slug}
                  href={`/blog/${other.slug}`}
                  className={`${styles.moreCard} card-lift`}
                >
                  <div
                    className={styles.moreCardImage}
                    style={{ backgroundImage: `url(${other.coverImage})` }}
                  />
                  <div className={styles.moreCardBody}>
                    <p className={styles.moreCardMeta}>
                      {formatDate(other.publishedAt)} · {other.readingMinutes} min
                    </p>
                    <h3 className={`fraunces ${styles.moreCardTitle}`}>{other.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </main>
  );
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
