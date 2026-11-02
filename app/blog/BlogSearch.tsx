'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

/**
 * Blog search + topic chips (owner, 2026-11-02 — "a search area like amandasmaid's").
 * Runs in the browser over a small summary of every post (title, excerpt, tags, topic and
 * the post's own FAQ questions), so typing "tip", "mold" or "how often" finds the article
 * even when the word only appears in one of its answers. No server call, no tracking.
 */
export type BlogCard = {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  publishedAt: string;
  readingMinutes: number;
  tags: string[];
  category?: string;
  haystack: string;
};

const QUICK = [
  { label: 'How much does house cleaning cost?', href: '/house-cleaning-cost-boca-raton' },
  { label: 'How long will my cleaning take?', href: '/cleaning-time-estimator' },
  { label: 'All cleaning questions (FAQ)', href: '/faq' },
];

export default function BlogSearch({ posts }: { posts: BlogCard[] }) {
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState<string>('All');

  const topics = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.category && set.add(p.category));
    return ['All', ...Array.from(set).sort()];
  }, [posts]);

  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return posts.filter(
      (p) => (topic === 'All' || p.category === topic) && words.every((w) => p.haystack.includes(w)),
    );
  }, [posts, q, topic]);

  return (
    <>
      <div className={styles.searchBox}>
        <div className={styles.searchField}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search cleaning tips, e.g. mold, tipping, move-out"
            aria-label="Search the blog"
          />
        </div>
        <div className={styles.chips} role="group" aria-label="Topics">
          {topics.map((t) => (
            <button
              key={t}
              type="button"
              className={`${styles.chip} ${t === topic ? styles.chipOn : ''}`}
              aria-pressed={t === topic}
              onClick={() => setTopic(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className={styles.quick}>
          <span>Quick answers:</span>
          {QUICK.map((x) => (
            <Link key={x.href} href={x.href}>
              {x.label}
            </Link>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className={styles.empty}>
          No articles match that yet. Try another word, or <Link href="/faq">see all our cleaning answers</Link>.
        </p>
      ) : (
        <div className={styles.grid}>
          {shown.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className={`${styles.card} card-lift`}>
              <div className={styles.cardImage} style={{ backgroundImage: `url(${post.coverImage})` }} />
              <div className={styles.cardBody}>
                <div className={styles.cardMeta}>
                  {post.category && <span className={styles.cardTopic}>{post.category}</span>}
                  <span className={styles.cardDate}>{formatDate(post.publishedAt)}</span>
                  <span className={styles.cardDot}>·</span>
                  <span className={styles.cardReading}>{post.readingMinutes} min read</span>
                </div>
                <h2 className={`fraunces ${styles.cardTitle}`}>{post.title}</h2>
                <p className={styles.cardExcerpt}>{post.excerpt}</p>
                <div className={styles.cardFooter}>
                  <div className={styles.cardTags}>
                    {post.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className={styles.cardTag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className={styles.cardArrow}>Read →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
