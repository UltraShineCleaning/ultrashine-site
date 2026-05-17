import { ImageResponse } from 'next/og';

/**
 * Dynamic OpenGraph image — generated at request time by Next.js.
 * Shown as the preview card when ultrashinecleaningfl.com is shared
 * on iMessage / Slack / Facebook / Twitter / WhatsApp / LinkedIn / etc.
 *
 * Standard OG dimensions: 1200×630. Twitter uses the same.
 */
export const runtime = 'edge';
export const alt = 'Ultra Shine Cleaning · A home that shines';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 80px',
          background: 'linear-gradient(135deg, #1C61F0 0%, #002C98 60%, #001045 100%)',
          color: '#FFFFFF',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Decorative sparkle, top right */}
        <div
          style={{
            position: 'absolute',
            top: 50,
            right: 80,
            fontSize: 80,
            color: '#FFFFFF',
            opacity: 0.18,
            transform: 'rotate(-10deg)',
            display: 'flex',
          }}
        >
          ✦
        </div>

        {/* TOP — eyebrow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 18,
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              opacity: 0.9,
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: 50,
                height: 1.5,
                background: '#FFFFFF',
                opacity: 0.6,
                // Satori (used by @vercel/og) only supports flex/block/none/-webkit-box.
                // 'inline-block' would break the build. Inside a flex parent, 'flex'
                // is the safest choice and renders identically.
                display: 'flex',
              }}
            />
            Ultra Shine Cleaning · Est. 2018
          </div>
        </div>

        {/* MIDDLE — big wordmark */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            paddingTop: 30,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 18,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                fontSize: 110,
                fontWeight: 800,
                lineHeight: 0.9,
                letterSpacing: '-0.03em',
                color: '#FFFFFF',
              }}
            >
              A home that
            </div>
            <div
              style={{
                fontSize: 110,
                fontWeight: 900,
                lineHeight: 0.9,
                letterSpacing: '-0.03em',
                background: 'linear-gradient(180deg, #FFFFFF 0%, #BFD4FF 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                display: 'flex',
              }}
            >
              shines
              <span style={{ color: '#FFFFFF', display: 'flex' }}>.</span>
            </div>
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 400,
              marginTop: 30,
              opacity: 0.92,
              lineHeight: 1.35,
              maxWidth: 850,
              display: 'flex',
            }}
          >
            Boutique house cleaning across Palm Beach + Broward County.
          </div>
        </div>

        {/* BOTTOM — trust strip + url */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 30,
            borderTop: '1px solid rgba(255,255,255,0.18)',
            fontSize: 18,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight: 500,
          }}
        >
          <div style={{ display: 'flex', gap: 28, opacity: 0.92 }}>
            <span style={{ display: 'flex' }}>★ 5.0 Google</span>
            <span style={{ opacity: 0.5, display: 'flex' }}>·</span>
            <span style={{ display: 'flex' }}>13 Cities</span>
            <span style={{ opacity: 0.5, display: 'flex' }}>·</span>
            <span style={{ display: 'flex' }}>Insured · Bonded</span>
          </div>
          <div style={{ display: 'flex', opacity: 0.9 }}>
            ultrashinecleaningfl.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
