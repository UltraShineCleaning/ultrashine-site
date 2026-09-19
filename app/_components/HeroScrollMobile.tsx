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
 * /public/hero-frames/f0001…f0121.webp — 121 frames, 1242×2234, ~78 KB
 * each, 9.2 MB total. Cut from a NATIVE 9:16 4K walkthrough (2134×3840)
 * generated room-by-room in Kling — master archived at
 * 05_LIBRARY/photography/walkthrough_source_stills/
 * walkthrough_portrait_4K_MASTER.mp4 :
 *
 *   ffmpeg -i walkthrough_portrait_4K_MASTER.mp4 \
 *     -vf "fps=6,scale=1242:-2:flags=lanczos" \
 *     -c:v libwebp -quality 72 -compression_level 6 \
 *     public/hero-frames/f%04d.webp
 *
 * Re-run that if the walkthrough is ever re-cut, and update FRAME_COUNT.
 *
 * WHY 1242 px WIDE — and why it moved twice. The first pass cropped the
 * 1920×1068 desktop video to 9:16, which caps at 601 px of real detail,
 * roughly half what a phone resolves, and looked exactly that soft. The 4K
 * portrait source removed that ceiling and the frames went to 1050 px.
 * That was still wrong, just less visibly: the canvas runs at devicePixel
 * ratio, so an iPhone Pro backing store is 1179 px and a 1050 px frame was
 * being UPSCALED into it. 1242 px clears 1179 with headroom, so the frame
 * is never stretched on any current phone. Match these two numbers if
 * either ever changes — a frame narrower than the canvas is sharpness
 * thrown away twice over.
 *
 * ── Full-bleed, and no longer a crop ─────────────────────────────────
 * The source is shot natively in portrait, so nothing is thrown away and
 * nothing is letterboxed. Bars would have preserved a wide composition
 * but shrunk the room to a stripe in the middle of the screen; the point
 * of the hero is that you feel like you are standing in the house.
 */

const FRAME_COUNT = 121;
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
 * Five beats, same rooms and same order as desktop — but BOTH the windows
 * and the headlines are this component's own.
 *
 * The windows below were read off "Phone site 3d scroll.mp4" frame by
 * frame at 1 fps, not copied from desktop. The two videos are different
 * cuts: desktop runs 26.27 s as one continuous take, this one is 20.225 s
 * assembled from four Kling transitions, so the rooms sit at completely
 * different fractions of the scroll. Re-read them if the video is re-cut.
 *
 * Measured arrivals (of 20.225 s): kitchen 0–2.5 s · living 4.0–6.8 ·
 * office 9.3–11.6 · bathroom 13.8–16.5 · bedroom 18.6–20.2.
 *
 * THE HEADLINES ARE ALSO NOT THE DESKTOP HEADLINES.
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
    end: 0.12,
  },
  {
    id: 'living',
    eyebrow: 'FABRICS · SURFACES · LIGHT',
    headlineHtml: 'Into the <em>living room</em>.',
    body: 'Baseboards, door tops, switch plates, vent grilles. Then a cobweb sweep, corner to corner.',
    start: 0.19,
    end: 0.34,
  },
  {
    id: 'office',
    eyebrow: 'SHELVES · SCREENS · SURFACES',
    headlineHtml: 'Through to the <em>office</em>.',
    body: 'A separate cloth for every room, colour-coded — so nothing from a bathroom ever reaches a desk.',
    start: 0.45,
    end: 0.58,
  },
  {
    id: 'bathroom',
    eyebrow: 'MARBLE · GROUT · FIXTURES',
    headlineHtml: 'Down to the <em>bathroom</em>.',
    body: 'Behind the toilet. Inside the shower door tracks. The exhaust grille. Not just the parts that show.',
    start: 0.67,
    end: 0.82,
  },
  {
    id: 'bedroom',
    eyebrow: 'CUSTOM QUOTE · WITHIN THE HOUR',
    headlineHtml: 'And the <em>bedroom</em>.',
    body: 'Tell us about your home. A precise quote by text within the hour.',
    start: 0.9,
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
    // quietly download 121 frames they will never see.
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
     * 🔴 THIS CAP WAS COSTING US THE SHARPNESS WE HAD ALREADY PAID FOR.
     *
     * It was 2×. On a 3× phone that makes the canvas 393 × 2 = 786 px wide
     * — so every 1050 px frame was being DOWNSCALED to 786 before it hit
     * the screen. We shipped the pixels, encoded them, sent them over the
     * wire, and then threw a quarter of them away in the last step.
     *
     * At 3× the canvas is 1179 px and the frame is used at full width.
     * The cost is one larger drawImage per scroll tick, which is a blit —
     * the GPU does not care. The cap stays at 3 only to stop a 4× device
     * from allocating a needlessly huge backing store.
     */
    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = Math.round(window.innerWidth * dpr);
      const h = Math.round(window.innerHeight * dpr);
      // Assigning width/height CLEARS the canvas, so only touch it when the
      // size really changed. The URL bar sliding away fires `resize` many
      // times; doing this every time is what made the hero flash mid-scroll.
      if (canvas.width === w && canvas.height === h) return false;
      canvas.width = w;
      canvas.height = h;
      currentFrame.current = -1; // force a repaint at the new size
      return true;
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
        // 0.6 on desktop is driven by Lenis, which already smooths the
        // wheel. Touch has no such smoothing — a finger flick arrives as a
        // burst of large deltas, and at 0.6 the canvas snaps between frames
        // in steps you can see. 1.1 lets the scrub EASE toward the scroll
        // position instead of tracking it exactly, which is what reads as
        // "smooth" on a phone. It is not a slower scroll; the page still
        // moves with the finger, only the frame catch-up is damped.
        scrub: 1.1,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // Leaving the hero must not leave a stale or blank canvas behind.
        // Pin the ends explicitly so the last frame stays put when the user
        // scrolls on into the site, and the first is restored coming back.
        onLeave: () => draw(nearestLoaded(FRAME_COUNT - 1)),
        onLeaveBack: () => draw(nearestLoaded(0)),
        onEnterBack: () => draw(nearestLoaded(FRAME_COUNT - 1)),
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

      // Remember what was on screen BEFORE sizeCanvas() wipes it.
      const showing = currentFrame.current;
      const changed = sizeCanvas();
      if (changed) {
        const i = nearestLoaded(showing >= 0 ? showing : 0);
        if (i >= 0) draw(i);
      }

      if (delta > CHROME_TOGGLE_MAX) ScrollTrigger.refresh();
    };
    const onOrientation = () => {
      lastHeight = window.innerHeight;
      const showing = currentFrame.current;
      sizeCanvas();
      const i = nearestLoaded(showing >= 0 ? showing : 0);
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
    <section id="us-hero-mobile" ref={containerRef} className={styles.container}>
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
