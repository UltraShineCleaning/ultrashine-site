'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * Sticky floating "Get Quote" CTA pill — bottom-right on every page.
 *
 * Motion design:
 * - Appears with a soft scale + slide-up after scrolling past 600px
 * - Once visible: continuous gentle bob (Y -3 → +3) so it feels alive
 * - Dual staggered pulse rings radiating outward, lightly tinted bright blue
 * - Sweeping shine (white gradient overlay) every 3.5s for a "premium" glint
 * - Hover: lifts +3px with a brighter glow + the bob pauses
 *
 * Mobile-safe: env(safe-area-inset-*) for iPhone notch.
 *
 * Speed pass (2026-11-02): every animation here is now plain CSS (globals.css,
 * .sqc-*), which the browser runs on the GPU. The framer-motion version ran four
 * never-ending JavaScript animations on every page once this pill appeared.
 * Skipped on /quote, /admin/*, /api/* (no point CTA-ing where they already are).
 */
export default function StickyQuoteCta() {
  const pathname = usePathname() || '';
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  const skip =
    pathname === '/quote' ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/demo') ||
    pathname.startsWith('/api');

  useEffect(() => {
    if (skip) return;

    /**
     * 🔴 `scrollY > 600` alone is wrong on the homepage.
     *
     * The mobile hero is PINNED for five viewport-heights, so scrollY sails
     * past 600 while the visitor is still inside the walkthrough — and this
     * pill lands on top of the caption panel at z-index 90.
     *
     * So: also require that the hero has actually been scrolled past. GSAP
     * pins by wrapping the section in a `.pin-spacer`, and it is the
     * SPACER that occupies real page space — measuring the section itself
     * gives a fixed-position rect that never moves. Walk up to the spacer
     * when there is one.
     *
     * Every other page has no #us-hero-mobile, so heroPassed stays true and
     * the original 600px behaviour is untouched.
     */
    const heroCleared = () => {
      const hero = document.getElementById('us-hero-mobile');
      if (!hero) return true;
      // Desktop renders a different hero and hides this one entirely.
      if (hero.offsetParent === null && getComputedStyle(hero).display === 'none') {
        return true;
      }
      const el = (hero.closest('.pin-spacer') as HTMLElement | null) ?? hero;
      return el.getBoundingClientRect().bottom <= 0;
    };

    // At most one check per frame, however fast the page scrolls.
    let raf = 0;
    const check = () => {
      raf = 0;
      setVisible(window.scrollY > 600 && heroCleared());
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [skip]);

  if (skip) return null;

  return (
    <div
      className={`sqc ${visible ? 'sqc-on' : ''}`}
      aria-hidden={!visible}
      style={{
        position: 'fixed',
        bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        right: 'calc(24px + env(safe-area-inset-right, 0px))',
        zIndex: 90,
      }}
    >
      {/* Continuous bob wrapper — pauses on hover so the lift feels deliberate */}
      <div className="sqc-bob" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <Link
          href="/quote"
          tabIndex={visible ? 0 : -1}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '16px 26px',
            borderRadius: 999,
            // Triple-layer gradient — base + highlight + subtle inner glow
            background: 'linear-gradient(135deg, #1C61F0 0%, #2A75FF 35%, #1C61F0 50%, #002C98 100%)',
            color: '#FFFFFF',
            fontFamily: 'var(--font-poppins), sans-serif',
            fontWeight: 600,
            fontSize: 13,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            overflow: 'hidden',
            boxShadow: hovered
              ? '0 14px 36px rgba(28, 97, 240, 0.50), 0 6px 14px rgba(28, 97, 240, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.08) inset'
              : '0 10px 28px rgba(28, 97, 240, 0.40), 0 4px 10px rgba(28, 97, 240, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.06) inset',
            transition: 'box-shadow 0.25s',
          }}
        >
          {/* Shine sweep — left to right every ~4s */}
          <span aria-hidden className="sqc-shine" />
          <span
            style={{
              position: 'relative',
              fontFamily: 'var(--font-poppins), sans-serif',
              fontWeight: 900,
              fontSize: 16,
              lineHeight: 1,
              color: '#FFD976',
              textShadow: '0 0 12px rgba(255, 217, 118, 0.6)',
            }}
          >
            ✦
          </span>
          <span style={{ position: 'relative' }}>Get Quote</span>
          <span className="sqc-arrow" style={{ position: 'relative', fontWeight: 400, fontSize: 16 }}>
            →
          </span>
        </Link>
        {/* Dual staggered pulse rings — outer ring trails the inner for depth */}
        <span aria-hidden className="sqc-ring sqc-ring1" />
        <span aria-hidden className="sqc-ring sqc-ring2" />
      </div>
    </div>
  );
}
