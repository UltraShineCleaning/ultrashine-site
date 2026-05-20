'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './HeroScrollHome.module.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * HeroScrollHome — SCROLL-SCRUBBED 5-room video walkthrough.
 *
 * The user scrolls and we drive the playhead of /videos/walkthrough.mp4
 * forward/backward in lockstep. As the camera walks through five rooms
 * (Kitchen → Living → Office → Bathroom → Bedroom) over 26.27 sec of
 * video, five text overlays — one per room — crossfade in/out at the
 * exact scrub-position where that room is centered on camera. The CTA
 * appears in the bedroom (final scene), which holds for ~16 % of the
 * scroll window so visitors have time to act on it.
 *
 * Why scroll-scrubbed video (not stacked images + crossfades):
 *   The walkthrough.mp4 is a single continuous Steadicam-style shot
 *   built by stitching 4 AI-generated transition clips together. Driving
 *   video.currentTime from scroll progress gives the user the feeling of
 *   physically walking through the home as they scroll — which is the
 *   whole point of the boutique luxury cleaning service narrative.
 *
 * Copy strategy:
 *   Each room's text describes WHAT IS VISIBLE + WHAT WE DO TO IT — not
 *   generic brand boilerplate. Trust messaging (insured, bonded,
 *   background-checked) is intentionally NOT in the hero because it
 *   lives in the Trust Strip immediately below.
 *
 * How it works:
 *   - Container is 100vh. GSAP ScrollTrigger pins it for `length*100%`
 *     additional scroll (so the user spends ~5 viewport-heights inside
 *     the hero before the page continues).
 *   - On every ScrollTrigger `onUpdate`, we set video.currentTime =
 *     progress * video.duration. Lenis (in SmoothScrollProvider) feeds
 *     scroll events to ScrollTrigger so this stays buttery.
 *   - Text overlays for each room are positioned absolutely on top of
 *     the video. They fade in/out at their assigned scrub-time window.
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

// SCENES — one per ROOM the camera physically walks into. Each
// `start`/`end` window is calibrated to the room's dwell-time in
// walkthrough.mp4 (26.27 sec), with small gaps between rooms for
// clean crossfades during the transition shots.
//
// Room timing (verified frame-by-frame against the stitched video):
//   Kitchen     0–3 s     (0–12 %)
//   Living     4.5–7.5 s  (17–28 %)
//   Office     8.5–12 s   (33–45 %)
//   Bathroom    15–20 s   (58–76 %)
//   Bedroom     22–26 s   (84–100 %)
//
// Copy strategy: each headline describes the ROOM the visitor sees
// at that scroll moment + what we DO to it. Trust messaging
// (insured, background-checked, etc.) is intentionally NOT here —
// that's the job of the Trust Strip immediately below the hero.
const SCENES: SceneCopy[] = [
  {
    // SCENE 1 — Kitchen, but BRAND-LEVEL headline. This is the visitor's
    // first read so it has to land the value-prop. The kitchen surfaces
    // get mentioned in the body so the copy still ties to what's on
    // screen, but the headline is the conversion hook from the prior
    // version. ("A home that shines. Without lifting a finger.")
    id: 'kitchen',
    eyebrow: 'HOUSE CLEANING · BOCA RATON + SOUTH FLORIDA',
    headlineHtml: 'A home that <em>shines</em>. Without lifting a finger.',
    body: 'It starts in the kitchen — marble degreased, stainless polished, cabinets wiped inside and out. Boutique house cleaning across 13 South Florida cities, the full standard every visit.',
    start: 0.0,
    end: 0.13,
  },
  {
    id: 'living',
    eyebrow: 'FABRICS · SURFACES · LIGHT',
    headlineHtml: 'Into the <em>living room</em>. Not a speck of dust.',
    body: 'Sectionals vacuumed. Coffee tables hand-polished. Glass crystal-clear. The room your guests linger in — kept guest-ready.',
    start: 0.17,
    end: 0.28,
  },
  {
    id: 'office',
    eyebrow: 'SHELVES · SCREENS · SURFACES',
    headlineHtml: 'Through to the <em>office</em>. A space that lets you focus.',
    body: 'Bookshelves dusted top to bottom. Glass streak-free. Surfaces spotless. The room that finally lets your mind clear.',
    start: 0.33,
    end: 0.45,
  },
  {
    id: 'bathroom',
    eyebrow: 'MARBLE · GROUT · FIXTURES',
    headlineHtml: 'Down the hall to the <em>bathroom</em>. Spa-grade clean.',
    body: 'Marble protected. Glass spotless. Grout treated. Fixtures polished to a mirror finish — like the day it was built.',
    start: 0.58,
    end: 0.76,
  },
  {
    id: 'bedroom',
    eyebrow: 'CUSTOM QUOTE · WITHIN THE HOUR',
    headlineHtml: 'And into the <em>bedroom</em>. Wall to wall, every visit.',
    body: 'Tell us about your space — we\'ll text you a precise quote within the hour. No hidden fees, no upsells.',
    start: 0.84,
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
        // Use the video's own frame 0 as the poster — this way the
        // pre-load image and the first decoded frame are pixel-identical,
        // so visitors don't see a "swap" when the video starts.
        poster="/videos/walkthrough_poster.jpg"
        muted
        playsInline
        preload="auto"
      />
      <div className={styles.overlay} />

      {/* MOBILE-ONLY copy — on mobile the video auto-loops through all
          five rooms with no scroll-jacking, so room-specific text like
          "It starts in the kitchen" doesn't make sense (it would stay
          on screen while the video shows the bathroom, etc.). Instead
          we lock in one brand-level message + a CTA. Hidden on desktop
          via .mobileCopy CSS. */}
      <div className={`${styles.content} ${styles.mobileCopy}`}>
        <p className={styles.eyebrow}>HOUSE CLEANING · BOCA RATON + SOUTH FLORIDA</p>
        <h1 className={styles.headline}>
          A home that <em>shines</em>. Without lifting a finger.
        </h1>
        <p className={styles.body}>
          Boutique house cleaning across 13 South Florida cities — kitchens,
          living rooms, bathrooms, and every space in between. The full
          standard, every visit.
        </p>
        <div className={styles.ctaRow}>
          <Link href="/quote" className="btn btn-coral">Request Your Free Quote</Link>
          <a href="#services" className="btn btn-secondary">See What&apos;s Included</a>
        </div>
      </div>

      {/* DESKTOP per-scene text overlays — one stays visible at a time
          as the user scrolls the camera through the home. Hidden on
          mobile via .content CSS (.us-copy → opacity 0). */}
      {SCENES.map((scene, i) => (
        <div key={scene.id} className={`${styles.content} ${styles.desktopCopy} us-copy us-copy-${i}`}>
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
