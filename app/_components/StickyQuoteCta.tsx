'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
 * Skipped on /quote, /admin/*, /api/* (no point CTA-ing where they already are).
 */
export default function StickyQuoteCta() {
  const pathname = usePathname() || '';
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  const skip =
    pathname === '/quote' ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api');

  useEffect(() => {
    if (skip) return;
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [skip]);

  if (skip) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 16 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            right: 'calc(24px + env(safe-area-inset-right, 0px))',
            zIndex: 90,
            pointerEvents: 'auto',
          }}
        >
          {/* Continuous bob wrapper — pauses on hover so the lift feels deliberate */}
          <motion.div
            animate={
              hovered
                ? { y: -3 }
                : { y: [0, -4, 0] }
            }
            transition={
              hovered
                ? { duration: 0.2 }
                : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
            }
            style={{ position: 'relative' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <Link
              href="/quote"
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '16px 26px',
                borderRadius: 999,
                // Triple-layer gradient — base + highlight + subtle inner glow
                background:
                  'linear-gradient(135deg, #1C61F0 0%, #2A75FF 35%, #1C61F0 50%, #002C98 100%)',
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
              {/* Animated shine sweep — moves left-to-right every 3.5s */}
              <motion.div
                aria-hidden
                animate={{ x: ['-100%', '200%'] }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  repeatDelay: 2.6,
                  ease: 'easeInOut',
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.28) 50%, transparent 70%)',
                  pointerEvents: 'none',
                  mixBlendMode: 'screen',
                }}
              />

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
              <motion.span
                animate={hovered ? { x: 4 } : { x: 0 }}
                transition={{ duration: 0.2 }}
                style={{ position: 'relative', fontWeight: 400, fontSize: 16 }}
              >
                →
              </motion.span>
            </Link>

            {/* Dual staggered pulse rings — outer ring trails the inner for depth */}
            <motion.div
              aria-hidden
              initial={{ scale: 1, opacity: 0.45 }}
              animate={{ scale: 1.25, opacity: 0 }}
              transition={{
                duration: 2.0,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 999,
                background:
                  'linear-gradient(135deg, #1C61F0 0%, #002C98 100%)',
                pointerEvents: 'none',
                zIndex: -1,
              }}
            />
            <motion.div
              aria-hidden
              initial={{ scale: 1, opacity: 0.3 }}
              animate={{ scale: 1.45, opacity: 0 }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                repeatDelay: 0.1,
                ease: 'easeOut',
                delay: 0.6,
              }}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 999,
                background:
                  'linear-gradient(135deg, #5E8FFF 0%, #1C61F0 100%)',
                pointerEvents: 'none',
                zIndex: -1,
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
