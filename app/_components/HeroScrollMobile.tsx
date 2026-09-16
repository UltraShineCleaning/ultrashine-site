'use client';

import React, { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './HeroScrollMobile.module.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * HeroScrollMobile — the same five-room walkthrough as the desktop hero,
 * but scroll-scrubbed on TOUCH.
 *
 * ── Why a canvas flipbook instead of the video ────────────────────────
 * The desktop hero drives `video.currentTime` from scroll position. That
 * works on a laptop and is genuinely bad on a phone: setting currentTime
 * asks the hardware decoder to seek an arbitrary frame in real time, and
 * mobile Safari in particular will stall, drop backwards seeks entirely,
 * or hand back the wrong frame. It is the reason the mobile hero was
 * previously a passive autoplay loop with no scroll interaction at all.
 *
 * So mobile does what Apple's product pages do: pre-extract the frames
 * and draw ONE IMAGE to a canvas per scroll position. There is no
 * decoder in the loop. Drawing a decoded bitmap is effectively free, it
 * costs the same going backwards as forwards, and the picture is locked
 * to the finger because nothing sits between the scroll offset and the
 * pixels.
 *
 * ── The frames ───────────────────────────────────────────────────────
 * /public/hero-frames/f0001…f0131.webp — 131 frames, 828×1472 (9:16),
 * ~29 KB each, 3.7 MB total. Generated from the same walkthrough.mp4
 * the desktop hero uses, so the two heroes can never drift apart:
 *
 *   ffmpeg -i public/videos/walkthrough.mp4 \
 *     -vf "fps=5,crop=in_h*9/16:in_h,scale=828:1472:flags=lanczos" \
 *     -c:v libwebp -quality 60 -compression_level 4 \
 *     public/hero-frames/f%04d.webp
 *
 * Re-run that if the walkthrough is ever re-cut, and update FRAME_COUNT.
 *
 * ── Full-bleed, deliberately ─────────────────────────────────────────
 * The frames are cropped to 9:16 rather than letterboxed into the brand
 * navy. Bars would preserve the whole wide composition but shrink the
 * room to a stripe in the middle of the screen; the point of the hero is
 * that you feel like you are standing in the house.
 */

const FRAME_COUNT = 131;
const framePath = (i: number) =>
  `/hero-frames/f${String(i).padStart(4, '0')}.webp`;

/**
 * Enough frames buffered to start without the picture hitching. The rest
 * stream in behind the user — at five viewport-heights of scroll they
 * physically cannot outrun the loader on any usable connection.
 */
const WARMUP_FRAMES = 12;

type Scene = {
  id: string;
  eyebrow: string;
  /** Deliberately shorter than desktop — see the note on sizing below. */
  headlineHtml: string;
  body: string;
  start: number;
  end: number;
  showCta?: boolean;
};

/**
 * Same five beats and the same scrub windows as the desktop hero, but the
 * HEADLINES ARE NOT THE DESKTOP HEADLINES.
 *
 * Desktop runs 72–84px across two lines. Dropped onto a 390pt phone that
 * is four or five lines of text covering the room you are trying to show.
 * Every headline here is one line: the room name carries the beat and the
 * second desktop line is cut, because the caption underneath already says
 * what happens in that room. The captions themselves are unchanged —
 * they were rewritten to be two lines precisely so they'd survive here.
 */
const SCENES: Scene[] = [
  {
    id: 'kitchen',
    eyebrow: 'BOCA RATON + SOUTH FLORIDA',
    headlineHtml: 'A home that <em>shines</em>.',
    body: 'Stovetop degreased, backsplash wiped, cabinet fronts spot-cleaned — and the appliance handles everyone else skips.',
    start: 0.0,
    end: 0.13,
  },
  {
    id: 'living',
    eyebrow: 'FABRICS · SURFACES · LIGHT',
    headlineHtml: 'Into the <em>living room</em>.',
    body: 'Baseboards, door tops, switch plates, vent grilles. Then a cobweb sweep, corner to corner.',
    start: 0.17,
    end: 0.28,
  },
  {
    id: 'office',
    eyebrow: 'SHELVES · SCREENS · SURFACES',
    headlineHtml: 'Through to the <em>office</em>.',
    body: 'A separate cloth for every room, colour-coded — so nothing from a bathroom ever reaches a desk.',
    start: 0.33,
    end: 0.45,
  },
  {
    id: 'bathroom',
    eyebrow: 'MARBLE · GROUT · FIXTURES',
    headlineHtml: 'Down to the <em>bathroom</em>.',
    body: 'Behind the toilet. Inside the shower door tracks. The exhaust grille. Not just the parts that show.',
    start: 0.58,
    end: 0.76,
  },
  {
    id: 'bedroom',
    eyebrow: 'CUSTOM QUOTE · WITHIN THE HOUR',
    headlineHtml: 'And the <em>bedroom</em>.',
    body: 'Tell us about your home. A precise quote by text within the hour.',
    start: 0.84,
    end: 1.0,
    showCta: true,
  },
];

export default function HeroScrollMobile() {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const currentFrame = useRef(-1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // CSS hides this whole section above 1024px, but hidden markup still
    // runs its effects — without this guard every desktop visitor would
    // quietly download 131 frames they will never see.
    if (window.matchMedia('(min-width: 1025px)').matches) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let cancelled = false;
    const images: HTMLImageElement[] = new Array(FRAME_COUNT);
    imagesRef.current = images;

    /**
     * Size the backing store to the device's real pixels, capped at 2×.
     * Uncapped, a 3× phone paints ~2.5× the pixels of a 2× one for a
     * difference nobody can see, and pays for it in fill rate on exactly
     * the devices with the least of it.
     */
    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      currentFrame.current = -1; // force a repaint at the new size
    };

    /**
     * Draw one frame, cover-style — fill the viewport, crop the overflow,
     * never distort. The frames are already 9:16 so on most phones this
     * is close to a 1:1 blit; the maths only matters on tablets and on
     * the short-and-wide shape you get mid rotation.
     */
    const draw = (index: number) => {
      const img = images[index];
      if (!img || !img.complete || img.naturalWidth === 0) return;
      if (index === currentFrame.current) return;
      currentFrame.current = index;

      const cw = canvas.width;
      const ch = canvas.height;
      const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    };

    /** Nearest frame we actually have decoded, searching backwards. */
    const nearestLoaded = (target: number) => {
      for (let i = target; i >= 0; i--) {
        const img = images[i];
        if (img && img.complete && img.naturalWidth > 0) return i;
      }
      return -1;
    };

    sizeCanvas();

    // Load the warm-up frames first and start as soon as they land, then
    // let the rest arrive in the background.
    let warm = 0;
    const load = (i: number, isWarmup: boolean) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = framePath(i + 1);
      images[i] = img;
      if (isWarmup) {
        img.onload = () => {
          if (cancelled) return;
          warm++;
          if (i === 0) draw(0);
          if (warm >= WARMUP_FRAMES) setReady(true);
        };
        img.onerror = () => {
          // A missing frame must not strand the hero — count it and move
          // on, the nearestLoaded() walk will skip over the hole.
          warm++;
          if (warm >= WARMUP_FRAMES) setReady(true);
        };
      }
    };

    for (let i = 0; i < Math.min(WARMUP_FRAMES, FRAME_COUNT); i++) load(i, true);
    const rest = window.setTimeout(() => {
      for (let i = WARMUP_FRAMES; i < FRAME_COUNT; i++) load(i, false);
    }, 200);

    const gctx = gsap.context(() => {
      gsap.set('.usm-copy', { autoAlpha: 0 });
      gsap.set('.usm-copy-0', { autoAlpha: 1 });

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
          const p = self.progress;

          const target = Math.min(
            FRAME_COUNT - 1,
            Math.round(p * (FRAME_COUNT - 1)),
          );
          const drawable = nearestLoaded(target);
          if (drawable >= 0) draw(drawable);

          const fade = 0.04;
          SCENES.forEach((scene, i) => {
            let alpha = 0;
            if (p >= scene.start - fade && p <= scene.end + fade) {
              if (p < scene.start) alpha = (p - (scene.start - fade)) / fade;
              else if (p > scene.end) alpha = 1 - (p - scene.end) / fade;
              else alpha = 1;
            }
            gsap.set(`.usm-copy-${i}`, {
              autoAlpha: Math.max(0, Math.min(1, alpha)),
            });
          });

          gsap.set('.usm-cue', { opacity: Math.max(0, 1 - p * 6) });
        },
      });
    }, container);

    // Two very different things fire `resize` on a phone, and they need
    // opposite treatment:
    //
    //   1. The URL bar sliding away as you scroll. Height changes by
    //      ~60–90px, MID-SCROLL, and it happens constantly. Calling
    //      ScrollTrigger.refresh() here recalculates every trigger on the
    //      page while the user's finger is still moving — that is a visible
    //      jump, and it would fire on almost every downward swipe.
    //   2. An actual rotation. Height changes enormously and the pin
    //      genuinely has to be rebuilt.
    //
    // So: always resize + redraw the canvas (cheap, and it is what keeps
    // the picture filling the screen as the chrome collapses), but only
    // refresh ScrollTrigger when the change is too big to be the URL bar.
    let lastHeight = window.innerHeight;
    const CHROME_TOGGLE_MAX = 160; // generous — tallest mobile chrome is ~140

    const onResize = () => {
      const h = window.innerHeight;
      const delta = Math.abs(h - lastHeight);
      lastHeight = h;

      sizeCanvas();
      const i = nearestLoaded(Math.max(currentFrame.current, 0));
      if (i >= 0) draw(i);

      if (delta > CHROME_TOGGLE_MAX) ScrollTrigger.refresh();
    };
    const onOrientation = () => {
      lastHeight = window.innerHeight;
      sizeCanvas();
      const i = nearestLoaded(Math.max(currentFrame.current, 0));
      if (i >= 0) draw(i);
      ScrollTrigger.refresh();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onOrientation);

    return () => {
      cancelled = true;
      window.clearTimeout(rest);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onOrientation);
      gctx.revert();
    };
  }, []);

  return (
    <section ref={containerRef} className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      {/* Poster underneath the canvas so the very first paint is the
          kitchen rather than flat navy. It fades out once real frames
          are in, which on a warm cache is immediate. */}
      <div
        className={`${styles.poster} ${ready ? styles.posterHidden : ''}`}
        aria-hidden="true"
      />
      <div className={styles.overlay} />

      {SCENES.map((scene, i) => (
        <div key={scene.id} className={`${styles.copy} usm-copy usm-copy-${i}`}>
          <p className={styles.eyebrow}>{scene.eyebrow}</p>
          <h1
            className={styles.headline}
            dangerouslySetInnerHTML={{ __html: scene.headlineHtml }}
          />
          <div className={styles.panel}>
            <p className={styles.body}>{scene.body}</p>
            {scene.showCta && (
              <Link href="/quote" className={`btn btn-coral ${styles.cta}`}>
                Request Your Free Quote
              </Link>
            )}
          </div>
        </div>
      ))}

      <a href="#services" className={styles.skipBtn}>
        Skip intro ↓
      </a>

      <div className={`${styles.cue} usm-cue`}>
        <span>Scroll</span>
        <span className={styles.cueArrow}>↓</span>
      </div>
    </section>
  );
}
