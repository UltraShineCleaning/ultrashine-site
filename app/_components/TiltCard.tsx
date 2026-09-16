'use client';
import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import styles from '../page.module.css';

type Props = {
  href: string;
  image: string;
  label: string;
  /** Short scannable claims — rendered as a minimal list, not a sentence. */
  points: string[];
  wide?: boolean;
};

export default function TiltCard({ href, image, label, points, wide }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reducedMotion = useReducedMotion();

  // Track mouse position over the card (0 to 1 on each axis)
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  // Spring-smoothed values (more natural feel than direct)
  const springConfig = { stiffness: 120, damping: 18, mass: 0.4 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Convert position to rotation degrees (max ±8°)
  const rotateY = useTransform(smoothX, [0, 1], [-8, 8]);
  const rotateX = useTransform(smoothY, [0, 1], [6, -6]);
  // 🔴 There used to be a `liftScale` here mapped to [1.02, 1.04, 1.02].
  // Read the middle number: at REST the pointer sits at y = 0.5, so every
  // card rendered permanently 4 % larger than the grid cell holding it.
  // On a ~600 px card that is 24 px of extra width — 12 px bleeding out of
  // each side, which swallowed the entire 20 px gutter and made the cards
  // appear to touch in the middle of the row. An idle card must be exactly
  // 1. The lift now lives on whileHover, where it belongs.
  // Background image gets gentle parallax against the card tilt
  const bgX = useTransform(smoothX, [0, 1], ['52%', '48%']);
  const bgY = useTransform(smoothY, [0, 1], ['52%', '48%']);

  function handleMouseMove(e: React.MouseEvent<HTMLAnchorElement>) {
    if (reducedMotion) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }

  function handleMouseLeave() {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }

  return (
    <motion.div
      style={{ perspective: 1200 }}
      className={wide ? styles.serviceCardWideWrapper : ''}
    >
      <motion.a
        ref={ref}
        href={href}
        className={`${styles.serviceCard} ${wide ? styles.serviceCardWide : ''}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateY: reducedMotion ? 0 : rotateY,
          rotateX: reducedMotion ? 0 : rotateX,
          transformStyle: 'preserve-3d',
        }}
        whileHover={reducedMotion ? undefined : { scale: 1.025 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        whileTap={{ scale: 0.99 }}
      >
        <motion.div
          className={styles.serviceImg}
          style={{
            backgroundImage: `url(${image})`,
            backgroundPositionX: reducedMotion ? '50%' : bgX,
            backgroundPositionY: reducedMotion ? '50%' : bgY,
          }}
        />
        <div className={styles.serviceContent}>
          <h3 className="fraunces">{label}</h3>
          {/* A sentence has to be read start-to-finish before it means
              anything. A homeowner comparing five services is scanning,
              not reading — so each claim gets its own line. */}
          <ul className={styles.servicepoints}>
            {points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <motion.span
            className={styles.serviceArrow}
            initial={{ x: 0 }}
            whileHover={{ x: 6 }}
            transition={{ duration: 0.3 }}
          >
            →
          </motion.span>
        </div>
        {/* Subtle shine that follows mouse */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: useTransform(
              [smoothX, smoothY] as any,
              ([x, y]: any) =>
                `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(28, 97, 240,0.18) 0%, transparent 50%)`,
            ),
            borderRadius: 'var(--r-lg)',
          }}
        />
      </motion.a>
    </motion.div>
  );
}
