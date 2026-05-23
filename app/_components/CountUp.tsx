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
  // amount: 0.1 (was 0.5) so the badge counts up even when only a sliver is in
  // view — the trust strip badges are short and on tall hero pages the user
  // can land with the strip already half-visible, which the old 0.5 threshold
  // never satisfied.
  const inView = useInView(ref, { once: true, amount: 0.1 });
  const reducedMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 });
  const [display, setDisplay] = useState(reducedMotion ? to : 0);
  const hasFired = useRef(false);

  // Primary trigger: IntersectionObserver via framer-motion's useInView.
  useEffect(() => {
    if (reducedMotion) {
      setDisplay(to);
      return;
    }
    if (inView && !hasFired.current) {
      hasFired.current = true;
      motionValue.set(to);
    }
  }, [inView, to, motionValue, reducedMotion]);

  // Fallback: on mount, if the element is already in the viewport (e.g. the
  // user lands deep-linked or clicks "Skip Intro" and the trust strip is
  // immediately visible), IntersectionObserver may not fire an entry event in
  // every browser. Check bounding rect once on mount and fire if needed.
  useEffect(() => {
    if (reducedMotion || hasFired.current) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const inViewport = rect.bottom > 0 && rect.top < window.innerHeight;
    if (inViewport) {
      hasFired.current = true;
      motionValue.set(to);
    }
  }, [to, motionValue, reducedMotion]);

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
