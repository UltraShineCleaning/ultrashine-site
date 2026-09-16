'use client';

import React, { useRef, useEffect } from 'react';
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

/**
 * A single absolutely-positioned block inside the hero. We anchor by
 * corner (top OR bottom + left OR right) so text never needs a
 * translate-centering hack on the corners — it just hangs off the
 * specified edge. Center-anchored blocks use the `centerX` flag.
 */
type SlotPos = {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  width: string;
  align: 'left' | 'center' | 'right';
  /** Apply translateX(-50%) — used when left is "50%" for true centering */
  centerX?: boolean;
  /** Optional headline font-size override (default = 88px) */
  headlineSize?: string;
};

type SceneCopy = {
  id: string;
  eyebrow: string;
  headlineHtml: string;
  body: string;
  /** Fraction of the video at which this scene is centered (0..1) */
  start: number;
  end: number;
  showCta?: boolean;
  /** Eyebrow + headline anchor (one corner) */
  head: SlotPos;
  /** Body text + optional CTAs anchor (opposite corner) */
  bodySlot: SlotPos;
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
// Layout strategy: every scene splits text into TWO anchors — a
// HEADLINE block (eyebrow + h1) and a BODY block (paragraph + optional
// CTAs) — positioned in OPPOSITE corners for a magazine-spread feel.
// Headlines use explicit <br> for line breaks so they never word-wrap
// awkwardly. Rotation has been removed across the board because at
// our font sizes it hurt readability more than it added depth.
/**
 * Exact duration of /videos/walkthrough.mp4, measured with ffprobe.
 * We ship this file ourselves, so its length is a known constant — which
 * lets us build the ScrollTrigger on first paint instead of waiting for
 * the browser to report `video.duration`. See the note at the pin below.
 * If the video is ever re-encoded, re-measure and update this number.
 */
const FALLBACK_DURATION = 26.267;

const SCENES: SceneCopy[] = [
  {
    // SCENE 1 — Kitchen. Camera centered on marble island with vanishing
    // point through to the living room. Headline anchors TOP-LEFT (above
    // the navy cabinets, against the lighter ceiling area). Body anchors
    // BOTTOM-RIGHT (next to the sunset glass doors, smaller column).
    id: 'kitchen',
    eyebrow: 'HOUSE CLEANING · BOCA RATON + SOUTH FLORIDA',
    headlineHtml: 'A home that <em>shines</em>.<br/>Without lifting a finger.',
    body: 'Marble sealed, never scoured. pH-neutral on natural stone — every visit, no exceptions.',
    start: 0.0,
    end: 0.13,
    head: { top: '18vh', left: '5vw', width: '54vw', align: 'left', headlineSize: '80px' },
    bodySlot: { bottom: '15vh', right: '5vw', width: '32vw', align: 'center' },
  },
  {
    // SCENE 2 — Living room. Symmetric composition with back-wall artwork.
    // Headline TOP-RIGHT, body BOTTOM-LEFT — magazine spread diagonal.
    id: 'living',
    eyebrow: 'FABRICS · SURFACES · LIGHT',
    headlineHtml: 'Into the <em>living room</em>.<br/>Not a speck of dust.',
    body: 'Upholstery brushed before it is vacuumed. Glass finished dry, so nothing streaks by morning.',
    start: 0.17,
    end: 0.28,
    head: { top: '18vh', right: '5vw', width: '50vw', align: 'right', headlineSize: '78px' },
    bodySlot: { bottom: '15vh', left: '5vw', width: '32vw', align: 'center' },
  },
  {
    // SCENE 3 — Office. Walnut bookshelves dominate the right side, so
    // text frames LEFT (over the marble column area). Headline BOTTOM-LEFT,
    // body TOP-RIGHT — flipped diagonal from the living room.
    id: 'office',
    eyebrow: 'SHELVES · SCREENS · SURFACES',
    headlineHtml: 'Through to the <em>office</em>.<br/>A space that lets you focus.',
    body: 'We dust around your work, not through it. Papers stay exactly where you left them.',
    start: 0.33,
    end: 0.45,
    head: { bottom: '16vh', left: '5vw', width: '52vw', align: 'left', headlineSize: '72px' },
    bodySlot: { top: '17vh', right: '5vw', width: '32vw', align: 'center' },
  },
  {
    // SCENE 4 — Bathroom. Tub centered, navy vanity left. Headline
    // BOTTOM-LEFT (against marble wall), body TOP-RIGHT (over shower glass).
    id: 'bathroom',
    eyebrow: 'MARBLE · GROUT · FIXTURES',
    headlineHtml: 'Down the hall to the <em>bathroom</em>.<br/>Spa-grade clean.',
    body: 'Grout treated, not just wiped over. Fixtures dried by hand so they never water-spot.',
    start: 0.58,
    end: 0.76,
    head: { bottom: '16vh', left: '5vw', width: '54vw', align: 'left', headlineSize: '74px' },
    bodySlot: { top: '17vh', right: '5vw', width: '32vw', align: 'center' },
  },
  {
    // SCENE 5 — Bedroom + CTA closer. Headline TOP-CENTER for impact,
    // body + CTAs BOTTOM-CENTER but pulled HIGHER (bottom: 18vh) so the
    // trust strip below the hero doesn't crowd the buttons when the pin
    // releases and the page resumes normal flow.
    id: 'bedroom',
    eyebrow: 'CUSTOM QUOTE · WITHIN THE HOUR',
    headlineHtml: 'And into the <em>bedroom</em>.<br/>Wall to wall, every visit.',
    body: 'Tell us about your home. A precise quote by text within the hour — no hidden fees, no upsells.',
    start: 0.84,
    end: 1.0,
    showCta: true,
    head: { top: '16vh', left: '50%', width: '74vw', align: 'center', centerX: true, headlineSize: '84px' },
    bodySlot: { bottom: '20vh', left: '50%', width: '56vw', align: 'center', centerX: true },
  },
];

/**
 * Turn a SlotPos config into an inline-style object so the absolute-
 * positioned block hangs off the chosen corner. We pass top/bottom +
 * left/right directly; for center-X anchored blocks we add a
 * translateX(-50%) so the block's CENTER aligns to the `left: 50%`
 * coordinate. text-align is also passed through so the contents
 * align to the slot's chosen edge.
 */
function slotStyle(p: SlotPos): React.CSSProperties {
  return {
    position: 'absolute',
    top: p.top,
    bottom: p.bottom,
    left: p.left,
    right: p.right,
    width: p.width,
    maxWidth: '900px',
    textAlign: p.align,
    transform: p.centerX ? 'translateX(-50%)' : undefined,
  };
}

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

    // Single encoding: /videos/walkthrough.mp4 — 1080p (1920×1068) ~28 MB.
    // Used to ship a 4K (78 MB) desktop variant too, but 1080p is
    // indistinguishable on consumer displays for a 26-sec windowed hero
    // loop and the 50 MB savings on every desktop visit is huge for LCP
    // and Vercel bandwidth. No source swap needed.

    // Mobile / reduced-motion: don't scroll-jack. Let the video autoplay
    // as a passive background loop and show the first scene's copy.
    if (isMobile || reducedMotion) {
      video.loop = true;
      video.muted = true;
      // Best-effort autoplay (muted+playsInline already set as attrs)
      video.play().catch(() => { /* user-gesture required on some browsers */ });
      return;
    }

    // DESKTOP ONLY: upgrade to full buffering. The markup ships
    // preload="metadata" so MOBILE (which never scrubs) stays light on
    // cellular. But on desktop the scroll-scrub seeks the playhead
    // constantly, and seeking into an UNBUFFERED range stalls the
    // decoder — the frame freezes while the text overlays keep
    // advancing. Buffering the whole 15 MB up front is what makes the
    // scrub feel solid from the very first wheel tick.
    video.preload = 'auto';
    video.load();

    // gsap.context scopes selectors + makes cleanup one line via revert()
    const ctx = gsap.context(() => {
      // 🔴 DO NOT defer this behind `loadedmetadata`.
      //
      // It used to be, and that was the "hero glitches on landing" bug:
      // with preload="metadata" on a 15 MB file, metadata can take well
      // over a second. If the visitor scrolled inside that window there
      // was NO PIN YET, so the page scrolled straight past the hero —
      // and then metadata arrived, the pin was created, ScrollTrigger
      // recalculated every offset on the page, and everything JUMPED.
      //
      // The duration is a fixed property of a file we ship ourselves, so
      // we seed it from a constant and correct it if the real value ever
      // differs. The pin now exists on first paint and there is no race.
      let duration = FALLBACK_DURATION;

      const syncDuration = () => {
        if (!isNaN(video.duration) && video.duration > 0) {
          duration = video.duration;
        }
      };
      if (video.readyState >= 1) syncDuration();
      else video.addEventListener('loadedmetadata', syncDuration, { once: true });

      {
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
              // Only seek where the browser actually has data. Assigning
              // currentTime into an unbuffered range queues a network
              // fetch and blocks the decoder, which is what produced
              // stuttering during the first seconds on a cold load.
              // Skipping the write leaves the last good frame on screen —
              // far less noticeable than a freeze, and it self-corrects
              // the instant the buffer catches up.
              let seekable = false;
              for (let b = 0; b < video.buffered.length; b++) {
                if (t >= video.buffered.start(b) && t <= video.buffered.end(b)) {
                  seekable = true;
                  break;
                }
              }
              if (seekable) video.currentTime = t;
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
        // 597 KB JPG → 116 KB WebP, and re-sized 3840×2136 → 1920×1068 to
        // MATCH the video exactly. The old poster was 4K over a 1080p video,
        // so the hero visibly softened the moment the first frame decoded —
        // the opposite of the pixel-identical handoff this was meant to be.
        poster="/videos/walkthrough_poster.webp"
        muted
        playsInline
        // preload="metadata" only fetches the moov atom + dimensions
        // upfront, NOT the full file. The browser streams the rest as
        // playback approaches it. Saves ~25 MB of upfront bandwidth on
        // first page load, especially critical on mobile cellular.
        // Combined with the +faststart MP4 flag (set during encode), the
        // video starts playing within ~1 second instead of waiting for
        // a full download.
        preload="metadata"
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

      {/* DESKTOP per-scene text overlays. Each scene splits into TWO
          absolutely-positioned blocks (headline + body) anchored to
          OPPOSITE corners of the hero for a magazine-spread feel.
          Both blocks share the `us-copy-${i}` class so GSAP fades them
          together as the camera reaches that scene's scrub window. */}
      {SCENES.map((scene, i) => (
        <React.Fragment key={scene.id}>
          {/* HEADLINE block — eyebrow + h1 */}
          <div
            className={`${styles.desktopCopy} ${styles.headSlot} us-copy us-copy-${i}`}
            style={slotStyle(scene.head)}
          >
            <p className={styles.eyebrow}>{scene.eyebrow}</p>
            <h1
              className={styles.headline}
              style={scene.head.headlineSize ? { fontSize: scene.head.headlineSize } : undefined}
              dangerouslySetInnerHTML={{ __html: scene.headlineHtml }}
            />
          </div>

          {/* BODY block — paragraph + optional CTAs */}
          <div
            className={`${styles.desktopCopy} ${styles.bodySlotEl} us-copy us-copy-${i}`}
            style={slotStyle(scene.bodySlot)}
          >
            <p className={styles.body}>{scene.body}</p>
            {scene.showCta && (
              <div className={styles.ctaRow}>
                <Link href="/quote" className="btn btn-coral">Request Your Free Quote</Link>
                <a href="#services" className="btn btn-secondary">See What&apos;s Included</a>
              </div>
            )}
          </div>
        </React.Fragment>
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
