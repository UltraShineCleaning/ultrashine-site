import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import SmoothScrollProvider from './_components/SmoothScrollProvider';

// Brand-book font: Poppins (single family, all weights).
// We expose THREE CSS variables so existing CSS that uses --font-fraunces
// (headlines), --font-outfit (UI), or --font-mono (numerics) keeps working
// without touching every file — they all now resolve to Poppins.
const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

// Mobile viewport — without this, mobile browsers render at desktop width.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#1C61F0',
};

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
    <html lang="en" className={poppins.variable}>
      <body>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
