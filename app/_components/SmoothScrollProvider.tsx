'use client';
import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * SmoothScrollProvider — wraps the app with Lenis smooth scroll AND
 * wires Lenis into GSAP ScrollTrigger so scroll-jacked cinematic
 * sections (HeroScrollHome's 4-scene tour) animate in sync.
 *
 * Without `lenis.on('scroll', ScrollTrigger.update)`, ScrollTrigger
 * never fires because Lenis virtualizes scrolling via CSS transforms
 * and native scroll events go silent. This was the root cause of the
 * "scenes don't progress, only kitchen visible" bug.
 */
export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    // CRITICAL: tell ScrollTrigger about every Lenis scroll tick so
    // scroll-pinned timelines stay in sync with the smooth scroll.
    lenis.on('scroll', ScrollTrigger.update);

    // Drive Lenis's RAF via GSAP's ticker so both share the same clock.
    const tickerFn = (time: number) => {
      lenis.raf(time * 1000); // gsap.ticker gives seconds; lenis wants ms
    };
    gsap.ticker.add(tickerFn);
    gsap.ticker.lagSmoothing(0);

    // Smooth-scroll any in-page anchor click (#services, #faq, etc.)
    const onAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!link) return;
      const id = link.getAttribute('href')?.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -80, duration: 1.4 });
    };
    document.addEventListener('click', onAnchorClick);

    return () => {
      document.removeEventListener('click', onAnchorClick);
      gsap.ticker.remove(tickerFn);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
