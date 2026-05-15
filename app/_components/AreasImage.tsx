'use client';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import styles from '../page.module.css';

/**
 * Service Areas image — parallaxes inside its container as user scrolls past.
 * Image moves slower than scroll (premium real-estate parallax feel).
 */
export default function AreasImage({ image }: { image: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  // Image drifts up 60px while user scrolls past (subtle, premium)
  const y = useTransform(scrollYProgress, [0, 1], ['8%', '-8%']);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.1, 1.05, 1.1]);

  return (
    <div ref={ref} className={styles.areasPhoto} style={{ overflow: 'hidden' }}>
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          y: reducedMotion ? 0 : y,
          scale: reducedMotion ? 1 : scale,
        }}
      />
      <div className={styles.areasPhotoTag}>
        <div className={styles.photoTagEye}>LOCAL · INSURED · TRUSTED</div>
        <div className={`fraunces ${styles.photoTagH}`}>Your local team,<br />at your door <em>tomorrow.</em></div>
      </div>
    </div>
  );
}
