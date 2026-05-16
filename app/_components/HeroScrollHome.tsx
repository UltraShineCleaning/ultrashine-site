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

const SCENES: Scene[] = [
  {
    id: 'kitchen',
    image: '/images/flow_hero_kitchen.jpg',
    eyebrow: 'SCENE 01 · THE KITCHEN',
    headlineHtml: 'Every surface, every <em>corner</em>.',
    body: 'Counters polished, stovetop degreased, appliance fronts wiped, sink restored. The room where your home actually begins.',
  },
  {
    id: 'living',
    image: '/images/flow_living_room_navy.jpg',
    eyebrow: 'SCENE 02 · THE LIVING ROOM',
    headlineHtml: 'Where you actually <em>relax</em>.',
    body: "Surfaces dusted to the touch, throw pillows fluffed, glass tables polished streak-free, vacuum lines crisp on the rug.",
  },
  {
    id: 'bathroom',
    image: '/images/flow_bathroom_sunset.jpg',
    eyebrow: 'SCENE 03 · THE BATHROOM',
    headlineHtml: 'Where you actually <em>unwind</em>.',
    body: 'Hard water removed from glass, grout scrubbed, mirrors polished streak-free, fresh towels folded.',
  },
  {
    id: 'bedroom',
    image: '/images/bedroom.jpg',
    eyebrow: 'READY WHEN YOU ARE',
    headlineHtml: 'Your whole home. <em>Ours to handle</em>.',
    body: 'Custom quote in one hour. Background-checked team. Fully insured. Same crew every visit.',
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

  // Subtle zoom: scale 1.05 → 1.12 over the scene's slice
  const slice = 1 / total;
  const start = index * slice;
  const end = (index + 1) * slice;
  const scale = useTransform(progress, [start, end], [1.04, 1.14]);

  return (
    <motion.div className={styles.scene} style={{ opacity }}>
      <motion.div
        className={styles.bg}
        style={{
          backgroundImage: `url(${scene.image})`,
          scale,
        }}
      />
      <div className={styles.overlay} />
      <div className={styles.content}>
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
      </div>
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

        {/* Skip intro button — for desktop users who don't want the 4-scene scroll */}
        <a href="#services" className={styles.skipBtn}>
          Skip intro <span style={{ fontFamily: 'var(--font-fraunces)' }}>↓</span>
        </a>

        {/* Scroll cue (always visible to hint that scrolling reveals more) */}
        <div className={styles.scrollCue}>
          <span>Scroll</span>
          <span className={styles.scrollCueArrow}>↓</span>
        </div>

        {/* Progress dots */}
        <ProgressDots progress={scrollYProgress} total={SCENES.length} />
      </div>
    </section>
  );
}
