'use client';
import { useEffect, useRef, useState } from 'react';
import { useInView, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

type Props = {
  to: number;
  duration?: number; // seconds
  prefix?: string;
  suffix?: string;
  className?: string;
  /** Format with one decimal (e.g. 5.0) */
  decimals?: number;
};

/**
 * Counts up from 0 to `to` when scrolled into view.
 * Used in trust strip ("13 Cities Served") and review rating ("5.0 Google").
 */
export default function CountUp({ to, duration = 1.6, prefix = '', suffix = '', className, decimals = 0 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reducedMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 });
  const [display, setDisplay] = useState(reducedMotion ? to : 0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(to);
      return;
    }
    if (inView) motionValue.set(to);
  }, [inView, to, motionValue, reducedMotion]);

  useEffect(() => {
    return spring.on('change', (latest) => {
      setDisplay(decimals > 0 ? Number(latest.toFixed(decimals)) : Math.round(latest));
    });
  }, [spring, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
