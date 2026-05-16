import type { Metadata, Viewport } from 'next';
import { Fraunces, Outfit, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import SmoothScrollProvider from './_components/SmoothScrollProvider';

// Mobile viewport — without this, mobile browsers render at desktop width
// and zoom out, leaving an empty band on the right side of the screen.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#15294C',
};

// Brand fonts loaded via next/font (auto-optimized, self-hosted, no external Google CDN call)
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
  weight: ['200', '300', '400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://ultrashinecleaningfl.com'),
  title: {
    default: 'Ultra Shine Cleaning · Boca Raton\'s Premier Cleaning Service',
    template: '%s · Ultra Shine Cleaning',
  },
  description:
    'Professional house & commercial cleaning across Palm Beach and Broward County. Background-checked, fully insured team. Get your free quote in 1 hour.',
  openGraph: {
    title: 'Ultra Shine Cleaning · South Florida',
    description:
      'A home that shines. Without lifting a finger. Serving 13 cities across Palm Beach + Broward County.',
    url: 'https://ultrashinecleaningfl.com',
    siteName: 'Ultra Shine Cleaning',
    locale: 'en_US',
    type: 'website',
  },
  icons: {
    icon: '/images/logo_navy_tight.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
