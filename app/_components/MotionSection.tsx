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
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: '-80px' }}
      transition={{
        duration: 0.9,
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
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
