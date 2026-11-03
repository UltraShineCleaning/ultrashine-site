'use client';
import { useEffect, useRef, useState } from 'react';

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
 *
 * Speed pass (2026-11-02): no framer-motion. One IntersectionObserver + a short
 * requestAnimationFrame loop that stops when the number lands. The FINAL number is
 * what the server renders, so Google, screen readers and no-JS visitors always read
 * the real value (the old version shipped "0" in the HTML until it animated).
 */
export default function CountUp({ to, duration = 1.6, prefix = '', suffix = '', className, decimals = 0 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmt = (n: number) => (decimals > 0 ? n.toFixed(decimals) : String(Math.round(n)));
  const [display, setDisplay] = useState<string>(() => fmt(to));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;
    let raf = 0;
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      const t0 = performance.now();
      const ms = duration * 1000;
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / ms);
        const eased = 1 - Math.pow(1 - p, 3); // ease-out
        setDisplay(fmt(to * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      setDisplay(fmt(0));
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, duration, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
