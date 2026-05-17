import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import SmoothScrollProvider from './_components/SmoothScrollProvider';
import JsonLd from './_components/JsonLd';

// Sitewide LocalBusiness + Organization schema.
// Tells Google: this is a real local business in Boca Raton with a
// 5.0 star rating from 18 Google reviews, serving Palm Beach + Broward.
const SITE_SCHEMA = [
  {
    '@context': 'https://schema.org',
    '@type': 'HouseCleaningService', // (more specific than LocalBusiness)
    '@id': 'https://ultrashinecleaningfl.com/#business',
    name: 'Ultra Shine Cleaning',
    description:
      'Boutique house and commercial cleaning across Palm Beach and Broward County. Background-checked W2 team, fully insured, family-owned since 2018.',
    url: 'https://ultrashinecleaningfl.com',
    telephone: '+1-561-583-6694',
    email: 'contact@ultrashinecleaningfl.com',
    image: 'https://ultrashinecleaningfl.com/images/flow_hero_kitchen.jpg',
    logo: 'https://ultrashinecleaningfl.com/images/logo_navy_tight.png',
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Boca Raton',
      addressRegion: 'FL',
      addressCountry: 'US',
    },
    areaServed: [
      { '@type': 'City', name: 'Boca Raton' },
      { '@type': 'City', name: 'Delray Beach' },
      { '@type': 'City', name: 'Boynton Beach' },
      { '@type': 'City', name: 'Lake Worth' },
      { '@type': 'City', name: 'West Palm Beach' },
      { '@type': 'City', name: 'Wellington' },
      { '@type': 'City', name: 'Parkland' },
      { '@type': 'City', name: 'Coral Springs' },
      { '@type': 'City', name: 'Fort Lauderdale' },
      { '@type': 'City', name: 'Coconut Creek' },
      { '@type': 'City', name: 'Deerfield Beach' },
      { '@type': 'City', name: 'Pompano Beach' },
      { '@type': 'City', name: 'Margate' },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      reviewCount: '18',
      bestRating: '5',
      worstRating: '1',
    },
    sameAs: [
      'https://maps.app.goo.gl/EGeuJViEFazQQe579',
      'https://www.homeadvisor.com/rated.UltraShineCleaning.68124585.html',
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Cleaning Services',
      itemListElement: [
        {
          '@type': 'OfferCatalog',
          name: 'Regular Cleaning',
          url: 'https://ultrashinecleaningfl.com/services/regular-cleaning',
        },
        {
          '@type': 'OfferCatalog',
          name: 'Deep Cleaning',
          url: 'https://ultrashinecleaningfl.com/services/deep-cleaning',
        },
        {
          '@type': 'OfferCatalog',
          name: 'Move-In / Out Cleaning',
          url: 'https://ultrashinecleaningfl.com/services/move-in-out',
        },
        {
          '@type': 'OfferCatalog',
          name: 'Commercial Cleaning',
          url: 'https://ultrashinecleaningfl.com/services/commercial',
        },
        {
          '@type': 'OfferCatalog',
          name: 'Post-Construction Cleaning',
          url: 'https://ultrashinecleaningfl.com/services/post-construction',
        },
      ],
    },
    founder: [
      { '@type': 'Person', name: 'Tiago Rena' },
      { '@type': 'Person', name: 'Francine Rena' },
    ],
    foundingDate: '2018',
    foundingLocation: { '@type': 'Place', name: 'Connecticut, USA' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://ultrashinecleaningfl.com/#website',
    url: 'https://ultrashinecleaningfl.com',
    name: 'Ultra Shine Cleaning',
    publisher: { '@id': 'https://ultrashinecleaningfl.com/#business' },
  },
];

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
    // OG image is auto-attached by Next.js from app/opengraph-image.tsx
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ultra Shine Cleaning · A home that shines',
    description:
      'Boutique house cleaning across Palm Beach + Broward. ★ 5.0 Google.',
    // Twitter image is auto-attached by Next.js from app/twitter-image.tsx
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
      <head>
        <JsonLd data={SITE_SCHEMA} />
      </head>
      <body>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
