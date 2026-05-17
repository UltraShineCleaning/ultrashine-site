'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './BeforeAfterSlider.module.css';

/**
 * Interactive Before / After image-reveal slider.
 *
 * Implementation:
 * - Two stacked background-image divs (BEFORE on bottom, AFTER on top)
 * - The AFTER div is clipped via clip-path inset() controlled by `position`
 * - The white divider + handle render on top, also positioned by `position`
 * - Mouse + touch + keyboard support
 *
 * Default `position` is 50%. Drag the handle (or click anywhere on the
 * image) to reveal more/less of the AFTER side.
 *
 * Placeholder images (until user supplies real before/after pairs):
 *   - beforeImage default → /images/bedroom.jpg (lower quality, reads as 'before')
 *   - afterImage default  → /images/flow_hero_kitchen.jpg (luxe Flow, 'after')
 * Swap these for real B/A pairs once available.
 */
type Props = {
  beforeImage?: string;
  afterImage?: string;
  eyebrow?: string;
  headline?: string;
  sub?: string;
};

export default function BeforeAfterSlider({
  beforeImage = '/images/bedroom.jpg',
  afterImage = '/images/flow_hero_kitchen.jpg',
  eyebrow = 'BEFORE · AFTER · OURS',
  headline = 'The difference. Drag to see.',
  sub = 'A real Ultra Shine clean — every surface, every corner, every detail. Slide the handle across.',
}: Props) {
  const [pos, setPos] = useState(50); // 0–100
  const [showHint, setShowHint] = useState(true);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Render headline with optional <em>word</em> support: use underscores → italic-equivalent
  // Default headline above has no underscores; the `head em` styling triggers via real <em> tags.
  function renderHead(text: string) {
    // Highlight the second sentence — "Drag to see." in italic-em styling
    const parts = text.split('. ');
    if (parts.length < 2) return text;
    return (
      <>
        {parts[0]}. <em>{parts.slice(1).join('. ')}</em>
      </>
    );
  }

  function updateFromX(clientX: number) {
    const el = sliderRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPos(percent);
    if (showHint) setShowHint(false);
  }

  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      if (!isDragging.current) return;
      const clientX =
        'touches' in e ? e.touches[0]?.clientX ?? 0 : (e as MouseEvent).clientX;
      updateFromX(clientX);
    }
    function onUp() {
      isDragging.current = false;
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHint]);

  return (
    <section className={styles.section}>
      <div className={styles.sectionInner}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.head}>{renderHead(headline)}</h2>
        <p className={styles.sub}>{sub}</p>

        <div
          ref={sliderRef}
          className={styles.slider}
          role="slider"
          aria-label="Before and after comparison"
          aria-valuenow={Math.round(pos)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
          onMouseDown={(e) => {
            isDragging.current = true;
            updateFromX(e.clientX);
          }}
          onTouchStart={(e) => {
            isDragging.current = true;
            updateFromX(e.touches[0].clientX);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 4));
            if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 4));
            if (e.key === 'Home') setPos(0);
            if (e.key === 'End') setPos(100);
          }}
        >
          {/* BEFORE — full image, bottom layer */}
          <div
            className={styles.imageBefore}
            style={{ backgroundImage: `url(${beforeImage})` }}
          />
          {/* AFTER — clipped to the left of the divider */}
          <div
            className={styles.imageAfter}
            style={{
              backgroundImage: `url(${afterImage})`,
              clipPath: `inset(0 ${100 - pos}% 0 0)`,
            }}
          />

          {/* Labels */}
          <div className={`${styles.label} ${styles.labelBefore}`}>Before</div>
          <div className={`${styles.label} ${styles.labelAfter}`}>After</div>

          {/* Divider line */}
          <div className={styles.divider} style={{ left: `${pos}%` }} />

          {/* Draggable handle */}
          <div className={styles.handle} style={{ left: `${pos}%` }} />

          {/* First-time hint */}
          {showHint && (
            <div className={styles.hint}>Drag to reveal ✦</div>
          )}
        </div>
      </div>
    </section>
  );
}
