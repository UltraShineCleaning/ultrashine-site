'use client';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  id?: string;
  delay?: number;
  /** Set 'as' to render a different element (default 'section') */
  as?: 'section' | 'div' | 'header' | 'footer';
  /** Stagger child <motion.*> elements automatically */
  stagger?: boolean;
};

export default function MotionSection({
  children,
  className,
  id,
  delay = 0,
  as = 'section',
  stagger = false,
}: Props) {
  const reducedMotion = useReducedMotion();
  const Tag = motion[as] as any;

  if (reducedMotion) {
    // Respect user's accessibility preference — no animation
    const StaticTag = as as any;
    return (
      <StaticTag id={id} className={className}>
        {children}
      </StaticTag>
    );
  }

  return (
    <Tag
      id={id}
      className={className}
      // Speed (2026-11-02, owner: "the five services section takes long to load on the phone"):
      // the reveal used to wait until 15% of the section was on screen. On a phone the
      // services section is ~2,500px tall, so that meant ~375px of BLANK space scrolled
      // into view before the cards even started fading in, plus a 0.9s fade. Now it starts
      // the moment the section's top edge enters the screen, moves less and finishes faster.
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0, margin: '0px 0px -6% 0px' }}
      transition={{
        duration: 0.55,
        delay,
        ease: [0.16, 1, 0.3, 1], // ease-out-expo (premium feel)
        ...(stagger && { staggerChildren: 0.1 }),
      }}
    >
      {children}
    </Tag>
  );
}

/** Inline animated child — use inside a MotionSection with stagger=true for sequential reveal */
export function MotionItem({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
