'use client';
import { useRef } from 'react';
import styles from '../page.module.css';
import { useLazyBgUrl } from './LazyBg';

type Props = {
  href: string;
  image: string;
  label: string;
  /** Short scannable claims — rendered as a minimal list, not a sentence. */
  points: string[];
  wide?: boolean;
};

/**
 * Service card with a gentle 3D tilt + shine that follows the mouse.
 *
 * Speed pass (2026-11-02): no framer-motion. The pointer position is written straight
 * into CSS variables (once per animation frame at most) and the CSS transition in
 * page.module.css (.serviceCard) does the smoothing, so React never re-renders while
 * the mouse moves. Touch screens never tilt (no mouse), exactly as before.
 *
 * At rest the card is scale 1 — an idle card must never be bigger than its grid cell
 * (see the old liftScale bug: a 4% resting scale swallowed the 20px gutter).
 */
export default function TiltCard({ href, image, label, points, wide }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const frame = useRef(0);
  // Photo downloads only when the card is near the screen, small WebP on phones.
  const bgUrl = useLazyBgUrl(image, ref);

  function handleMouseMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el) return;
    const x = e.clientX;
    const y = e.clientY;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const px = (x - r.left) / r.width;
      const py = (y - r.top) / r.height;
      el.style.setProperty('--ry', `${(px - 0.5) * 16}deg`);
      el.style.setProperty('--rx', `${(0.5 - py) * 12}deg`);
      el.style.setProperty('--mx', `${px * 100}%`);
      el.style.setProperty('--my', `${py * 100}%`);
    });
  }

  function handleMouseLeave() {
    const el = ref.current;
    cancelAnimationFrame(frame.current);
    if (!el) return;
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--mx', '50%');
    el.style.setProperty('--my', '50%');
  }

  return (
    <div className={wide ? styles.serviceCardWideWrapper : ''}>
      <a
        ref={ref}
        href={href}
        className={`${styles.serviceCard} ${wide ? styles.serviceCardWide : ''}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className={styles.serviceImg} style={{ backgroundImage: bgUrl ? `url(${bgUrl})` : undefined }} />
        <div className={styles.serviceContent}>
          <h3 className="fraunces">{label}</h3>
          {/* A sentence has to be read start-to-finish before it means
              anything. A homeowner comparing five services is scanning,
              not reading — so each claim gets its own line. */}
          <ul className={styles.servicepoints}>
            {points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <span className={styles.serviceArrow}>→</span>
        </div>
        {/* Subtle shine that follows the mouse */}
        <div className={styles.serviceShine} aria-hidden="true" />
      </a>
    </div>
  );
}
