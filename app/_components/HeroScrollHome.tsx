'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './HeroScrollHome.module.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * HeroScrollHome — GSAP-powered scroll-jacked 4-scene cinematic tour.
 *
 * How it works:
 *  - The hero is 100vh tall. ScrollTrigger PINS it for an additional
 *    400% of viewport scroll (so the user "spends" 4 viewport heights
 *    of scrolling inside the hero before the page continues).
 *  - During the pin, a master GSAP timeline plays back driven by scroll
 *    position (scrub: 1, with a 1-second smoothing lag for buttery feel).
 *  - Each scene has its OWN entrance + exit motion (Apple-style variety):
 *      Scene 01 KITCHEN  — RISE     (text rises from below, fades up)
 *      Scene 02 LIVING   — SLIDE→   (text slides in from the LEFT)
 *      Scene 03 BATHROOM — ZOOM     (text scales 0.75 → 1.0, fades up)
 *      Scene 04 BEDROOM  — SLIDE←   (text slides in from the RIGHT)
 *  - Each scene's BACKGROUND image dollies in (scale 1.0 → 1.25) and
 *    parallaxes up (-8% Y) during its slice — camera-moving-into-the-room.
 *  - After scene 4, the pin releases and the rest of the page scrolls
 *    normally (trust strip, services, etc.).
 *  - Mobile (<1024px) skips the GSAP setup entirely and shows scene 1
 *    as a static hero — scroll-jacking is too janky on touch screens.
 *
 * Lenis smooth scroll is bridged to ScrollTrigger in SmoothScrollProvider
 * so the entire experience plays smoothly with inertia.
 */

type MotionStyle = 'rise' | 'slide-right' | 'slide-left' | 'scale-up';

type Scene = {
  id: string;
  image: string;
  eyebrow: string;
  headlineHtml: string;
  body: string;
  motion: MotionStyle;
  showCta?: boolean;
};

const SCENES: Scene[] = [
  {
    id: 'kitchen',
    image: '/images/hero_scene_01_kitchen.jpg',
    eyebrow: 'HOUSE CLEANING · BOCA RATON + SOUTH FLORIDA',
    headlineHtml: 'A home that <em>shines</em>. Without lifting a finger.',
    body: 'Boutique house cleaning in Boca Raton and 12 other South Florida cities across Palm Beach + Broward. The full standard — every visit.',
    motion: 'rise',
  },
  {
    id: 'living',
    image: '/images/hero_scene_02_living.jpg',
    eyebrow: 'EVERY ROOM · EVERY DETAIL',
    headlineHtml: 'Wall-to-wall <em>care</em>. Nothing missed.',
    body: 'From marble countertops to baseboards. Same boutique team every visit. No rotating contractors, no surprises.',
    motion: 'slide-right',
  },
  {
    id: 'bathroom',
    image: '/images/hero_scene_03_bathroom.jpg',
    eyebrow: 'BACKGROUND-CHECKED · BONDED · INSURED',
    headlineHtml: 'A team you can <em>actually</em> trust at home.',
    body: 'W2 employees, never contractors. Every cleaner background-checked. Every job staffed by a pair — two professionals, every visit.',
    motion: 'scale-up',
  },
  {
    id: 'bedroom',
    image: '/images/hero_scene_04_bedroom.jpg',
    eyebrow: 'CUSTOM QUOTE · WITHIN THE HOUR',
    headlineHtml: 'Ready for a home that <em>shines</em>?',
    body: 'Tell us about your space. We text you back within the hour with a precise quote — no hidden fees, no upsells.',
    motion: 'slide-left',
    showCta: true,
  },
];

export default function HeroScrollHome() {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Respect reduced-motion + mobile fallback — skip scroll-jacking on
    // small screens and for users who request reduced motion.
    const isMobile = window.matchMedia('(max-width: 1024px)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isMobile || reducedMotion) return;

    const container = containerRef.current;
    if (!container) return;

    // gsap.context auto-scopes selectors + makes cleanup one-line via ctx.revert()
    const ctx = gsap.context(() => {
      // Initial state — all scenes invisible except the first
      gsap.set('.us-scene', { autoAlpha: 0 });
      gsap.set('.us-scene-0', { autoAlpha: 1 });

      // Per-scene initial content state (for entrance motion)
      SCENES.forEach((scene, i) => {
        const sel = `.us-scene-${i} .us-content`;
        if (i === 0) {
          // first scene's text starts visible (the static hero state)
          gsap.set(sel, { opacity: 1, y: 0, x: 0, scale: 1 });
        } else {
          // others start offscreen per their motion variant
          const initial: gsap.TweenVars = { opacity: 0 };
          if (scene.motion === 'rise') initial.y = 80;
          if (scene.motion === 'slide-right') initial.x = -180;
          if (scene.motion === 'slide-left') initial.x = 180;
          if (scene.motion === 'scale-up') initial.scale = 0.75;
          gsap.set(sel, initial);
        }
      });

      // Build the master timeline pinned for 4 viewport-heights of scroll.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top top',
          end: `+=${SCENES.length * 100}%`,
          scrub: 1,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // Progress dots — set initial state (first one filled, rest empty)
      gsap.set('.us-progress-fill-0', { scaleX: 1 });
      for (let i = 1; i < SCENES.length; i++) {
        gsap.set(`.us-progress-fill-${i}`, { scaleX: 0 });
      }

      // For each scene, choreograph the transition INTO it.
      //
      // "WALK INTO THE NEXT ROOM" TECHNIQUE:
      //   - During the scene's slice, the bg dollies 1.0 → 1.25 (normal zoom-in)
      //   - DURING the exit transition, the OUTGOING scene continues to zoom
      //     aggressively from 1.25 → 1.55 (push-through-the-doorway feel) —
      //     this is what makes the transition feel like motion not blur
      //   - The INCOMING scene starts at 1.0 (fresh perspective of the next room)
      //   - Crossfade is faster + uses snappy power3.inOut (not lingering blur)
      //   - The outgoing scene's zoom acceleration timing matches the crossfade
      //     so visually the camera "pushes through" right as the next room appears
      SCENES.forEach((scene, i) => {
        const sceneSel = `.us-scene-${i}`;
        const bgSel = `${sceneSel} .us-bg`;
        const contentSel = `${sceneSel} .us-content`;

        // Background dolly-in during this scene's slice (1.0 → 1.25)
        tl.fromTo(
          bgSel,
          { scale: 1.0, y: '0%' },
          { scale: 1.25, y: '-8%', ease: 'none', duration: 1 },
          i,
        );

        // For scenes 1+, choreograph the transition IN
        if (i > 0) {
          // ZOOM-THROUGH on the previous scene during the crossfade —
          // simulates the camera pushing forward THROUGH the doorway
          // of the previous room into this one. This is the key change
          // from blurry crossfade → "walking forward" motion.
          tl.to(
            `.us-scene-${i - 1} .us-bg`,
            { scale: 1.55, ease: 'power2.in', duration: 0.4 },
            i - 0.4,
          );

          // Sharp crossfade (faster + snappier easing — less linger = less blur feel)
          tl.to(sceneSel, { autoAlpha: 1, duration: 0.35, ease: 'power3.inOut' }, i - 0.35);
          tl.to(`.us-scene-${i - 1}`, { autoAlpha: 0, duration: 0.35, ease: 'power3.inOut' }, i - 0.35);

          // Text entrance — variant-specific motion
          const fromVars: gsap.TweenVars = { opacity: 0 };
          if (scene.motion === 'rise') fromVars.y = 80;
          if (scene.motion === 'slide-right') fromVars.x = -180;
          if (scene.motion === 'slide-left') fromVars.x = 180;
          if (scene.motion === 'scale-up') fromVars.scale = 0.75;

          tl.fromTo(
            contentSel,
            fromVars,
            { opacity: 1, y: 0, x: 0, scale: 1, duration: 0.6, ease: 'power3.out' },
            i - 0.2,
          );
        }

        // Text exit (except for last scene which holds with CTAs)
        if (i < SCENES.length - 1) {
          const exitVars: gsap.TweenVars = { opacity: 0, duration: 0.4, ease: 'power2.in' };
          // Exit direction matches entrance direction (continues the motion)
          if (scene.motion === 'rise') exitVars.y = -80;
          if (scene.motion === 'slide-right') exitVars.x = 180;
          if (scene.motion === 'slide-left') exitVars.x = -180;
          if (scene.motion === 'scale-up') exitVars.scale = 1.15;
          tl.to(contentSel, exitVars, i + 0.8);

          // Fill the NEXT progress dot as we transition into it
          tl.fromTo(
            `.us-progress-fill-${i + 1}`,
            { scaleX: 0 },
            { scaleX: 1, duration: 0.5, ease: 'power1.out' },
            i + 0.6,
          );
        }
      });

      // Hide the "Scroll" cue after the user starts moving past the first scene
      tl.to('.us-scroll-cue', { opacity: 0, duration: 0.3 }, 0.1);
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className={styles.container}>
      {SCENES.map((scene, i) => (
        <div key={scene.id} className={`${styles.scene} us-scene us-scene-${i}`}>
          <div
            className={`${styles.bg} us-bg`}
            style={{ backgroundImage: `url(${scene.image})` }}
          />
          <div className={styles.overlay} />
          <div className={`${styles.content} us-content`}>
            <p className={styles.eyebrow}>{scene.eyebrow}</p>
            <h1
              className={styles.headline}
              dangerouslySetInnerHTML={{ __html: scene.headlineHtml }}
            />
            <p className={styles.body}>{scene.body}</p>

            {scene.showCta && (
              <div className={styles.ctaRow}>
                <Link href="/quote" className="btn btn-coral">Request Your Free Quote</Link>
                <a href="#services" className="btn btn-secondary">See What&apos;s Included</a>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Skip intro — top right, visible during pin */}
      <a href="#services" className={styles.skipBtn}>
        Skip intro <span style={{ fontFamily: 'var(--font-fraunces)' }}>↓</span>
      </a>

      {/* Scroll cue — bottom left, fades out after first scroll */}
      <div className={`${styles.scrollCue} us-scroll-cue`}>
        <span>Scroll</span>
        <span className={styles.scrollCueArrow}>↓</span>
      </div>

      {/* Progress dots — 4 across, fill as you advance */}
      <div className={styles.progress}>
        {SCENES.map((_, i) => (
          <div key={i} className={`${styles.progressDot} us-progress-dot-${i}`}>
            <div className={`${styles.progressFill} us-progress-fill-${i}`} />
          </div>
        ))}
        <span className={styles.progressLabel}>04</span>
      </div>
    </section>
  );
}
