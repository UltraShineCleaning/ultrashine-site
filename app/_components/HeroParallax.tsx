'use client';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';
import styles from '../page.module.css';

export default function HeroParallax() {
  const ref = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  // Track scroll progress through the hero
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  // Parallax: photo moves slower than scroll (drifts down 20% as you scroll past)
  const photoY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  // Photo also subtly zooms out
  const photoScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.15]);
  // Content drifts up + fades as user scrolls past
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '-30%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className={styles.hero}>
      {/* Parallax background photo */}
      <motion.div
        className={styles.heroBg}
        style={{
          backgroundImage: 'url(/images/flow_hero_kitchen.jpg)',
          y: reducedMotion ? '0%' : photoY,
          scale: reducedMotion ? 1.05 : photoScale,
        }}
      />
      <div className={styles.heroOverlay} />

      {/* Content (drifts up on scroll) */}
      <motion.div
        className={styles.heroContent}
        style={{
          y: reducedMotion ? 0 : contentY,
          opacity: reducedMotion ? 1 : contentOpacity,
        }}
      >
        {/* Eyebrow — slides in from left */}
        <motion.p
          className="eyebrow"
          style={{ color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '36px' }}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: 40 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: 'inline-block', height: '1px', background: 'var(--blush)' }}
          />
          READY WHEN YOU ARE
        </motion.p>

        {/* Headline — fades up word by word */}
        <motion.h1
          className={`fraunces ${styles.heroHeadline}`}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          A home that <em>shines</em>. Without lifting a <em>finger</em>.
        </motion.h1>

        {/* Sub — fades up after headline */}
        <motion.p
          className={`fraunces ${styles.heroSub}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          Boutique cleaning across Palm Beach + Broward County. Background-checked team, fully insured, no detail missed.
        </motion.p>

        {/* CTAs — fade up + scale gently */}
        <motion.div
          className={styles.heroCtaRow}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.95, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
            <Link href="/quote" className="btn btn-primary">Request Your Free Quote</Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
            <a href="#services" className="btn btn-secondary">View Services</a>
          </motion.div>
        </motion.div>

        {/* Subtle scroll indicator at bottom of hero */}
        <motion.div
          className={styles.scrollIndicator}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
          >
            <span style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.7 }}>SCROLL</span>
            <span style={{ fontSize: 14, opacity: 0.6 }}>↓</span>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
