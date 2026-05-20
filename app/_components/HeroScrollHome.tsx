'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './HeroScrollHome.module.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * HeroScrollHome — SCROLL-SCRUBBED video walkthrough.
 *
 * The user scrolls and we drive the playhead of /videos/walkthrough.mp4
 * forward/backward in lockstep. While the video plays, four text overlays
 * (one per room) crossfade in and out at their assigned slice of the
 * timeline. CTA appears on the last slice.
 *
 * Why scroll-scrubbed video (not 4 stacked images + crossfades):
 *   The walkthrough.mp4 is a single continuous Steadicam-style shot
 *   built by stitching 4 AI-generated transition clips together. Driving
 *   video.currentTime from scroll progress gives the user the feeling of
 *   physically walking through the home as they scroll — which is the
 *   whole point of the boutique luxury cleaning service narrative.
 *
 * How it works:
 *   - Container is 100vh. GSAP ScrollTrigger pins it for `length*100%`
 *     additional scroll (so the user spends ~4 viewport-heights inside
 *     the hero before the page continues).
 *   - On every ScrollTrigger `onUpdate`, we set video.currentTime =
 *     progress * video.duration. Lenis (in SmoothScrollProvider) feeds
 *     scroll events to ScrollTrigger so this stays buttery.
 *   - Text overlays for each room are positioned absolutely on top of
 *     the video. They fade in/out at their assigned scrub-time window.
 *   - Last scene (bedroom) shows the CTA buttons + holds longer.
 *   - Mobile / reduced-motion: GSAP skipped. Video plays autoplay-loop
 *     muted as a passive background loop; first scene's text + CTA show.
 *
 * Critical encoding details for buttery scrubbing:
 *   - H.264 yuv420p (broadly supported)
 *   - Short GOP: -g 15 -keyint_min 15 (keyframe every 0.5 sec at 30fps)
 *   - +faststart (moov atom at front so video starts before fully loaded)
 */

type SceneCopy = {
  id: string;
  eyebrow: string;
  headlineHtml: string;
  body: string;
  /** Fraction of the video at which this scene is centered (0..1) */
  start: number;
  end: number;
  showCta?: boolean;
};

const SCENES: SceneCopy[] = [
  {
    id: 'kitchen',
    eyebrow: 'HOUSE CLEANING · BOCA RATON + SOUTH FLORIDA',
    headlineHtml: 'A home that <em>shines</em>. Without lifting a finger.',
    body: 'Boutique house cleaning in Boca Raton and 12 other South Florida cities across Palm Beach + Broward. The full standard — every visit.',
    start: 0.0,
    end: 0.25,
  },
  {
    id: 'living',
    eyebrow: 'EVERY ROOM · EVERY DETAIL',
    headlineHtml: 'Wall-to-wall <em>care</em>. Nothing missed.',
    body: 'From marble countertops to baseboards. Same boutique team every visit. No rotating contractors, no surprises.',
    start: 0.25,
    end: 0.5,
  },
  {
    id: 'bathroom',
    eyebrow: 'BACKGROUND-CHECKED · BONDED · INSURED',
    headlineHtml: 'A team you can <em>actually</em> trust at home.',
    body: 'W2 employees, never contractors. Every cleaner background-checked. Every job staffed by a pair — two professionals, every visit.',
    start: 0.5,
    end: 0.75,
  },
  {
    id: 'bedroom',
    eyebrow: 'CUSTOM QUOTE · WITHIN THE HOUR',
    headlineHtml: 'Ready for a home that <em>shines</em>?',
    body: 'Tell us about your space. We text you back within the hour with a precise quote — no hidden fees, no upsells.',
    start: 0.75,
    end: 1.0,
    showCta: true,
  },
];

export default function HeroScrollHome() {
  const containerRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isMobile = window.matchMedia('(max-width: 1024px)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    // Mobile / reduced-motion: don't scroll-jack. Let the video autoplay
    // as a passive background loop and show the first scene's copy.
    if (isMobile || reducedMotion) {
      video.loop = true;
      video.muted = true;
      // Best-effort autoplay (muted+playsInline already set as attrs)
      video.play().catch(() => { /* user-gesture required on some browsers */ });
      return;
    }

    // gsap.context scopes selectors + makes cleanup one line via revert()
    const ctx = gsap.context(() => {
      // Wait for video metadata so duration is known
      const onReady = () => {
        const duration = video.duration || 26;

        // Initial state for text overlays — first scene visible, rest hidden
        gsap.set('.us-copy', { autoAlpha: 0 });
        gsap.set('.us-copy-0', { autoAlpha: 1 });

        // Progress dots — first filled
        gsap.set('.us-progress-fill-0', { scaleX: 1 });
        for (let i = 1; i < SCENES.length; i++) {
          gsap.set(`.us-progress-fill-${i}`, { scaleX: 0 });
        }

        // Build pin + scrub trigger. Length = 4 viewport heights of scroll.
        ScrollTrigger.create({
          trigger: container,
          start: 'top top',
          end: `+=${SCENES.length * 100}%`,
          scrub: 0.6,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // Drive the video playhead from scroll progress
            const t = self.progress * duration;
            if (Math.abs(video.currentTime - t) > 1 / 60) {
              video.currentTime = t;
            }

            // Crossfade text overlays + fill progress dots based on progress
            const p = self.progress;
            const fade = 0.04;
            SCENES.forEach((scene, i) => {
              let alpha = 0;
              if (p >= scene.start - fade && p <= scene.end + fade) {
                if (p < scene.start) {
                  alpha = (p - (scene.start - fade)) / fade;
                } else if (p > scene.end) {
                  alpha = 1 - (p - scene.end) / fade;
                } else {
                  alpha = 1;
                }
              }
              alpha = Math.max(0, Math.min(1, alpha));
              gsap.set(`.us-copy-${i}`, { autoAlpha: alpha });

              const dotProgress =
                p < scene.start ? 0 : p > scene.end ? 1 : (p - scene.start) / (scene.end - scene.start);
              gsap.set(`.us-progress-fill-${i}`, { scaleX: dotProgress });
            });

            // Fade out scroll cue after first nudge
            const cueAlpha = Math.max(0, 1 - p * 6);
            gsap.set('.us-scroll-cue', { opacity: cueAlpha });
          },
        });
      };

      if (video.readyState >= 1 && !isNaN(video.duration)) {
        onReady();
      } else {
        video.addEventListener('loadedmetadata', onReady, { once: true });
      }
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className={styles.container}>
      <video
        ref={videoRef}
        className={styles.video}
        src="/videos/walkthrough.mp4"
        poster="/images/hero_scene_01_kitchen.jpg"
        muted
        playsInline
        preload="auto"
      />
      <div className={styles.overlay} />

      {/* Per-scene text overlays — one stays visible at a time */}
      {SCENES.map((scene, i) => (
        <div key={scene.id} className={`${styles.content} us-copy us-copy-${i}`}>
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
        <span className={styles.progressLabel}>0{SCENES.length}</span>
      </div>
    </section>
  );
}
