'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import SocialIcons from './SocialIcons';
import { SERVICE_NAV } from '../_lib/service-nav';

const BIG = { fontSize: 28, color: 'var(--cream)', textDecoration: 'none', fontWeight: 800, letterSpacing: '-0.02em' } as const;

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const [svcOpen, setSvcOpen] = useState(false);

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
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: 18,
              padding: '96px 28px 40px',
              overflowY: 'auto',
            }}
          >
            {/* Services opens the list of all five (+ "All services"), owner 2026-11-02 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}
            >
              <button
                type="button"
                onClick={() => setSvcOpen((v) => !v)}
                aria-expanded={svcOpen}
                className="fraunces"
                style={{ ...BIG, background: 'none', border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, minHeight: 0, padding: 0 }}
              >
                Services
                <svg viewBox="0 0 12 12" width="16" height="16" aria-hidden="true" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, transform: svcOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                  <path d="M2 4l4 4 4-4" />
                </svg>
              </button>
              {svcOpen && (
                <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.07)', borderRadius: 18, padding: '4px 16px', textAlign: 'left' }}>
                  {[...SERVICE_NAV.map((x) => ({ href: x.href, label: x.name })), { href: '/services', label: 'All services →' }].map((x, j, arr) => (
                    <Link
                      key={x.href}
                      href={x.href}
                      onClick={handleLinkClick}
                      style={{
                        display: 'block',
                        padding: '12px 0',
                        color: j === arr.length - 1 ? 'var(--blue-soft)' : 'var(--cream)',
                        fontWeight: j === arr.length - 1 ? 600 : 500,
                        fontSize: 17,
                        textDecoration: 'none',
                        borderBottom: j === arr.length - 1 ? 0 : '1px solid rgba(255,255,255,0.08)',
                        fontFamily: 'var(--font-poppins)',
                      }}
                    >
                      {x.label}
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
            {[
              { href: '/house-cleaning-cost-boca-raton', label: 'Prices' },
              { href: '/areas', label: 'Areas' },
              { href: '/about', label: 'About' },
              { href: '/blog', label: 'Blog' },
              { href: '/reviews', label: 'Reviews' },
              { href: '/leave-a-review', label: '★ Leave Review' },
              { href: '/faq', label: 'FAQ' },
            ].map((item, i) => (
              <motion.a
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.16 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="fraunces"
                style={BIG}
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
              <SocialIcons center />
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
