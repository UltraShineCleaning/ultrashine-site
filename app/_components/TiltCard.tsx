'use client';
import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import styles from '../page.module.css';

type Props = {
  href: string;
  image: string;
  label: string;
  description: string;
  wide?: boolean;
};

export default function TiltCard({ href, image, label, description, wide }: Props) {
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
  // Subtle lift (z-translate via shadow + scale)
  const liftScale = useTransform(smoothY, [0, 0.5, 1], [1.02, 1.04, 1.02]);
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
          scale: reducedMotion ? 1 : liftScale,
          transformStyle: 'preserve-3d',
        }}
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
          <p>{description}</p>
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
                `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(217,181,168,0.18) 0%, transparent 50%)`,
            ),
            borderRadius: 'var(--r-lg)',
          }}
        />
      </motion.a>
    </motion.div>
  );
}
