'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close menu on anchor click
  function handleLinkClick() {
    setOpen(false);
  }

  return (
    <>
      {/* Hamburger button — only visible on mobile */}
      <button
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen(!open)}
        style={{
          display: 'none',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 10,
          color: 'var(--cream)',
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 110,
        }}
        className="mobile-nav-trigger"
      >
        <motion.div
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.3 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
        >
          <motion.span
            animate={{ rotate: open ? 45 : 0, y: open ? 6 : 0 }}
            style={{ width: 24, height: 2, background: open ? 'var(--cream)' : 'currentColor', display: 'block', transformOrigin: 'center' }}
          />
          <motion.span
            animate={{ opacity: open ? 0 : 1 }}
            style={{ width: 24, height: 2, background: 'currentColor', display: 'block' }}
          />
          <motion.span
            animate={{ rotate: open ? -45 : 0, y: open ? -6 : 0 }}
            style={{ width: 24, height: 2, background: open ? 'var(--cream)' : 'currentColor', display: 'block', transformOrigin: 'center' }}
          />
        </motion.div>
      </button>

      {/* Fullscreen menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'var(--navy-deep)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 28,
              padding: 40,
            }}
          >
            {[
              { href: '/#services', label: 'Services' },
              { href: '/areas', label: 'Areas' },
              { href: '/about', label: 'About' },
              { href: '/reviews', label: 'Reviews' },
              { href: '/faq', label: 'FAQ' },
            ].map((item, i) => (
              <motion.a
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="fraunces"
                style={{
                  fontSize: 36,
                  color: 'var(--cream)',
                  textDecoration: 'none',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                }}
              >
                {item.label}
              </motion.a>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}
            >
              <a href="tel:5615836694" style={{ color: 'var(--blue-soft)', fontSize: 18, fontFamily: 'var(--font-poppins)', fontWeight: 600, letterSpacing: '0.02em' }}>(561) 583-6694</a>
              <Link href="/quote" onClick={handleLinkClick} className="btn btn-coral">Request Your Free Quote</Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show hamburger only on mobile */}
      <style jsx>{`
        @media (max-width: 1024px) {
          .mobile-nav-trigger { display: flex !important; }
        }
      `}</style>
    </>
  );
}
