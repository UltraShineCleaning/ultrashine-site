import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from './_components/SiteHeader';
import SiteFooter from './_components/SiteFooter';

export const metadata: Metadata = {
  title: 'Page Not Found · Ultra Shine Cleaning',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main>
      <SiteHeader inPage={false} />

      <section
        style={{
          minHeight: '78vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '80px 24px',
          background:
            'radial-gradient(ellipse 800px 600px at 70% 0%, rgba(28, 97, 240, 0.10) 0%, transparent 60%),' +
            ' radial-gradient(ellipse 700px 800px at 0% 100%, rgba(94, 143, 255, 0.14) 0%, transparent 60%),' +
            ' linear-gradient(165deg, #002C98 0%, #001E6B 60%, #001045 100%)',
          color: 'var(--cream)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            maxWidth: 680,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0,
          }}
        >
          {/* Sparkle */}
          <div
            style={{
              fontSize: 64,
              color: 'var(--blush)',
              lineHeight: 1,
              marginBottom: 22,
            }}
          >
            ✦
          </div>

          {/* Eyebrow */}
          <p
            style={{
              fontFamily: 'var(--font-poppins), sans-serif',
              fontSize: 12,
              letterSpacing: '0.42em',
              textTransform: 'uppercase',
              opacity: 0.8,
              marginBottom: 22,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <span style={{ width: 32, height: 1, background: 'var(--blush)', display: 'inline-block' }} />
            ERROR 404 · LOST YOUR WAY
            <span style={{ width: 32, height: 1, background: 'var(--blush)', display: 'inline-block' }} />
          </p>

          {/* Headline */}
          <h1
            className="fraunces"
            style={{
              fontSize: 'clamp(40px, 7vw, 80px)',
              lineHeight: 0.98,
              letterSpacing: '-0.028em',
              marginBottom: 22,
              color: 'var(--cream)',
            }}
          >
            That page <em>doesn't exist</em>.
          </h1>

          {/* Body */}
          <p
            style={{
              fontFamily: 'var(--font-poppins), sans-serif',
              fontSize: 'clamp(15px, 1.6vw, 18px)',
              lineHeight: 1.55,
              opacity: 0.88,
              maxWidth: 540,
              marginBottom: 40,
            }}
          >
            The URL you tried isn't on our site (or maybe a typo).
            But while you're here — request your free quote or
            jump back to the homepage.
          </p>

          {/* CTAs */}
          <div
            style={{
              display: 'flex',
              gap: 14,
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginBottom: 48,
            }}
          >
            <Link href="/quote" className="btn btn-coral">
              Request Your Free Quote
            </Link>
            <Link href="/" className="btn btn-secondary">
              Back to Homepage
            </Link>
          </div>

          {/* Quick links to popular sections */}
          <p
            style={{
              fontFamily: 'var(--font-poppins), sans-serif',
              fontSize: 11,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              opacity: 0.65,
              marginBottom: 16,
            }}
          >
            Or jump to
          </p>
          <div
            style={{
              display: 'flex',
              gap: 14,
              flexWrap: 'wrap',
              justifyContent: 'center',
              fontSize: 14,
              opacity: 0.92,
            }}
          >
            <Link
              href="/services/regular-cleaning"
              style={{ color: 'var(--blush)', textDecoration: 'none' }}
            >
              Regular Cleaning
            </Link>
            <span style={{ opacity: 0.4 }}>·</span>
            <Link
              href="/services/deep-cleaning"
              style={{ color: 'var(--blush)', textDecoration: 'none' }}
            >
              Deep Cleaning
            </Link>
            <span style={{ opacity: 0.4 }}>·</span>
            <Link href="/areas" style={{ color: 'var(--blush)', textDecoration: 'none' }}>
              All 13 Cities
            </Link>
            <span style={{ opacity: 0.4 }}>·</span>
            <Link href="/about" style={{ color: 'var(--blush)', textDecoration: 'none' }}>
              About Us
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
