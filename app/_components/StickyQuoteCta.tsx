'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Sticky floating "Get Quote" CTA pill — bottom-right on every page.
 *
 * Behavior:
 * - Appears after the user scrolls past ~600px (so the hero CTAs are dominant)
 * - Hidden on /quote (already there) and /admin/* (private dashboard, no CTAs)
 * - Mobile-safe: uses env(safe-area-inset-bottom) for iPhone notch
 * - Subtle scale-in on appear so it doesn't pop disruptively
 */
export default function StickyQuoteCta() {
  const pathname = usePathname() || '';
  const [visible, setVisible] = useState(false);

  // Skip on quote + admin pages
  const skip =
    pathname === '/quote' ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api');

  useEffect(() => {
    if (skip) return;

    const onScroll = () => {
      setVisible(window.scrollY > 600);
    };
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
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            right: 'calc(24px + env(safe-area-inset-right, 0px))',
            zIndex: 90,
            pointerEvents: 'auto',
          }}
        >
          <Link
            href="/quote"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '16px 26px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, #1C61F0 0%, #002C98 100%)',
              color: '#FFFFFF',
              fontFamily: 'var(--font-poppins), sans-serif',
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              boxShadow:
                '0 8px 24px rgba(0, 44, 152, 0.35), 0 2px 8px rgba(0, 44, 152, 0.25)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow =
                '0 12px 32px rgba(0, 44, 152, 0.40), 0 4px 12px rgba(0, 44, 152, 0.30)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow =
                '0 8px 24px rgba(0, 44, 152, 0.35), 0 2px 8px rgba(0, 44, 152, 0.25)';
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-poppins), sans-serif',
                fontWeight: 900,
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              ✦
            </span>
            <span>Get Quote</span>
            <span style={{ fontWeight: 400, fontSize: 16 }}>→</span>
          </Link>

          {/* Subtle pulse ring — draws the eye on idle */}
          <motion.div
            aria-hidden
            initial={{ scale: 1, opacity: 0.4 }}
            animate={{ scale: 1.18, opacity: 0 }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeOut',
            }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 999,
              background: 'linear-gradient(135deg, #1C61F0 0%, #002C98 100%)',
              pointerEvents: 'none',
              zIndex: -1,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
