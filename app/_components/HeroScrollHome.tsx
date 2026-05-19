'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import styles from './HeroScrollHome.module.css';

/**
 * Cinematic 4-scene scroll-through-home hero.
 *
 * How it works:
 * - The container is 400vh tall (4 viewport heights of scroll).
 * - The visible content is position:sticky so it stays pinned to the
 *   viewport while the user scrolls through the 400vh.
 * - All 4 scenes stack on top of each other absolutely positioned.
 * - As scrollYProgress goes 0→1, each scene's opacity transitions in/out
 *   so it crossfades between rooms — feels like walking through the home.
 * - Background images also subtly zoom (scale 1.0→1.12) for depth.
 * - The 4 progress dots at bottom-right fill as you advance.
 *
 * PLACEHOLDER IMAGES: Until the user generates the 4 Flow continuity
 * images per PROMPTS_QUEUE.md, we use existing flow_* + bedroom photos.
 * Replace the `image:` paths in the SCENES array below when ready.
 *
 * Mobile (≤1024px): collapses to a single static hero showing scene 1.
 */

type Scene = {
  id: string;
  image: string;
  eyebrow: string;
  headlineHtml: string; // supports <em>…</em> for italic+blush
  body: string;
  /** Last scene gets the CTAs */
  showCta?: boolean;
};

// 4-SCENE CINEMATIC TOUR — each scene is a different room of the SAME Boca
// Raton coastal home, generated as a connected sequence via Google Flow /
// Nano Banana. As the user scrolls, scenes crossfade + zoom, creating the
// illusion of walking through the home from kitchen → living → bath → bed.
//
// Headline strategy: each scene tells a different part of the brand story
// (the emotional hook → the wall-to-wall promise → the trust signals → the
// CTA). The final scene gets the buttons.
const SCENES: Scene[] = [
  {
    id: 'kitchen',
    image: '/images/hero_scene_01_kitchen.jpg',
    // SEO signal — keyword + city + region, picked up by Google as the H1's
    // top-of-page context. Visitor barely registers it; algorithm reads it loud.
    eyebrow: 'HOUSE CLEANING · BOCA RATON + SOUTH FLORIDA',
    // Brand voice — emotional hook. H1 stays this across all scenes? No —
    // each scene has its OWN headline so the scroll feels like a story unfolding.
    headlineHtml: 'A home that <em>shines</em>. Without lifting a finger.',
    body: 'Boutique house cleaning in Boca Raton and 12 other South Florida cities across Palm Beach + Broward. The full standard — every visit.',
  },
  {
    id: 'living',
    image: '/images/hero_scene_02_living.jpg',
    eyebrow: 'EVERY ROOM · EVERY DETAIL',
    headlineHtml: 'Wall-to-wall <em>care</em>. Nothing missed.',
    body: 'From marble countertops to baseboards. Same boutique team every visit. No rotating contractors, no surprises.',
  },
  {
    id: 'bathroom',
    image: '/images/hero_scene_03_bathroom.jpg',
    eyebrow: 'BACKGROUND-CHECKED · BONDED · INSURED',
    headlineHtml: 'A team you can <em>actually</em> trust at home.',
    body: 'W2 employees, never contractors. Every cleaner background-checked. Every job staffed by a pair — two professionals, every visit.',
  },
  {
    id: 'bedroom',
    image: '/images/hero_scene_04_bedroom.jpg',
    eyebrow: 'CUSTOM QUOTE · WITHIN THE HOUR',
    headlineHtml: 'Ready for a home that <em>shines</em>?',
    body: 'Tell us about your space. We text you back within the hour with a precise quote — no hidden fees, no upsells.',
    showCta: true,
  },
];

/** Map progress (0–1) → per-scene opacity with smooth crossfades */
function getSceneOpacityRanges(index: number, total: number) {
  // Each scene "owns" a slice of the scroll. Scene i is fully opaque
  // through the middle of its slice and crossfades at the edges.
  const slice = 1 / total;
  const start = index * slice;
  const end = (index + 1) * slice;
  // Crossfade window = 30% of slice (smooth, not abrupt)
  const fadeIn = start + slice * 0.15;
  const fadeOut = end - slice * 0.15;

  // First scene starts at full opacity (no initial fade-in)
  // Last scene ends at full opacity (no final fade-out)
  const first = index === 0;
  const last = index === total - 1;
  return {
    input: [start, fadeIn, fadeOut, end] as [number, number, number, number],
    output: [first ? 1 : 0, 1, 1, last ? 1 : 0] as [number, number, number, number],
  };
}

function SceneLayer({
  scene,
  index,
  total,
  progress,
}: {
  scene: Scene;
  index: number;
  total: number;
  progress: ReturnType<typeof useScroll>['scrollYProgress'];
}) {
  const ranges = getSceneOpacityRanges(index, total);
  const opacity = useTransform(progress, ranges.input, ranges.output);

  // DRAMATIC zoom: scale 1.0 → 1.28 over the scene's slice. Larger range
  // = more "camera moving into the room" feel.
  const slice = 1 / total;
  const start = index * slice;
  const end = (index + 1) * slice;
  const scale = useTransform(progress, [start, end], [1.0, 1.28]);

  // Y PARALLAX on the background — moves UP by 8% of viewport height over
  // the scene's slice. Creates the "camera rising/floating" cinematic feel
  // that pure opacity crossfade alone doesn't deliver.
  const bgY = useTransform(progress, [start, end], ['0%', '-8%']);

  // TEXT FADE-UP: as a scene becomes active, its text rises into place
  // from below; as the scene leaves, the text floats upward and fades.
  // This is the Apple-tier touch — content doesn't just appear, it MOVES.
  const textY = useTransform(
    progress,
    ranges.input,
    ['40px', '0px', '0px', '-40px'],
  );
  const textOpacity = useTransform(
    progress,
    [start, start + slice * 0.18, end - slice * 0.18, end],
    [
      index === 0 ? 1 : 0, // first scene starts fully visible
      1,
      1,
      index === total - 1 ? 1 : 0, // last scene stays fully visible
    ],
  );

  return (
    <motion.div className={styles.scene} style={{ opacity }}>
      <motion.div
        className={styles.bg}
        style={{
          backgroundImage: `url(${scene.image})`,
          scale,
          y: bgY,
        }}
      />
      <div className={styles.overlay} />
      <motion.div className={styles.content} style={{ y: textY, opacity: textOpacity }}>
        <p className={styles.eyebrow}>{scene.eyebrow}</p>
        <h1
          className={styles.headline}
          dangerouslySetInnerHTML={{ __html: scene.headlineHtml }}
        />
        <p className={styles.body}>{scene.body}</p>

        {scene.showCta && (
          <div className={styles.ctaRow}>
            <Link href="/quote" className="btn btn-coral">Request Your Free Quote</Link>
            <a href="#services" className="btn btn-secondary">See What's Included</a>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function ProgressDots({
  progress,
  total,
}: {
  progress: ReturnType<typeof useScroll>['scrollYProgress'];
  total: number;
}) {
  // Render N dots, each filled when scroll progress passes its threshold
  // (Using individual useTransforms would be cleaner but this gives a
  //  simple ranged visual without too many subscribers.)
  const labels = ['01', '02', '03', '04'];
  return (
    <div className={styles.progress}>
      {Array.from({ length: total }).map((_, i) => {
        const start = i / total;
        const end = (i + 1) / total;
        // Each dot fills as you scroll through its slice
        const fill = useTransform(progress, [start, end], [0, 1]);
        return (
          <div key={i} className={styles.progressDot}>
            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--blush)',
                transformOrigin: 'left',
                scaleX: fill,
              }}
            />
          </div>
        );
      })}
      <span className={styles.progressLabel}>{labels[total - 1]}</span>
    </div>
  );
}

export default function HeroScrollHome() {
  const ref = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  // If user prefers reduced motion, just show scene 4 (the CTA scene) statically
  if (reducedMotion) {
    const scene = SCENES[SCENES.length - 1];
    return (
      <section className={styles.container} style={{ height: '100vh' }}>
        <div className={styles.sticky}>
          <div className={styles.scene} style={{ opacity: 1 }}>
            <div
              className={styles.bg}
              style={{ backgroundImage: `url(${scene.image})` }}
            />
            <div className={styles.overlay} />
            <div className={styles.content}>
              <p className={styles.eyebrow}>{scene.eyebrow}</p>
              <h1
                className={styles.headline}
                dangerouslySetInnerHTML={{ __html: scene.headlineHtml }}
              />
              <p className={styles.body}>{scene.body}</p>
              <div className={styles.ctaRow}>
                <Link href="/quote" className="btn btn-coral">Request Your Free Quote</Link>
                <a href="#services" className="btn btn-secondary">See What's Included</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className={styles.container}>
      <div className={styles.sticky}>
        {SCENES.map((scene, i) => (
          <SceneLayer
            key={scene.id}
            scene={scene}
            index={i}
            total={SCENES.length}
            progress={scrollYProgress}
          />
        ))}

        {/* Scroll-through-only UI (skip, scroll cue, progress dots) hidden in
            single-scene mode. Re-enable when SCENES has 2+ entries. */}
        {SCENES.length > 1 && (
          <>
            <a href="#services" className={styles.skipBtn}>
              Skip intro <span style={{ fontFamily: 'var(--font-fraunces)' }}>↓</span>
            </a>
            <div className={styles.scrollCue}>
              <span>Scroll</span>
              <span className={styles.scrollCueArrow}>↓</span>
            </div>
            <ProgressDots progress={scrollYProgress} total={SCENES.length} />
          </>
        )}
      </div>
    </section>
  );
}
