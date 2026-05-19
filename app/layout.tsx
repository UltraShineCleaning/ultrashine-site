import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import SmoothScrollProvider from './_components/SmoothScrollProvider';
import JsonLd from './_components/JsonLd';
import StickyQuoteCta from './_components/StickyQuoteCta';
import TopTrustBar from './_components/TopTrustBar';

// =====================================================================
// SITE SCHEMA — Upgraded 2026-05 from HouseCleaningService to CleaningService
// per Schema.org community recommendation (issue #4790) for multi-service
// cleaners. CleaningService is the canonical parent type; it inherits from
// LocalBusiness so we get the full local-pack signals (geo, hours, payments,
// areaServed with county context) plus flexible Offer modeling.
//
// Key additions vs prior schema:
//   - geo coordinates (Boca Raton lat/lng) → local pack signal
//   - openingHoursSpecification → Mon-Sat 7am-5pm
//   - paymentAccepted + currenciesAccepted → trust signals
//   - 13 cities upgraded to City objects with containedInPlace (county) →
//     Google understands the geographic hierarchy
//   - hasOfferCatalog upgraded with proper Offer entries (each with
//     priceCurrency, priceSpecification, areaServed) → eligible for richer
//     service rich-results and price-range snippets
// =====================================================================

// All 13 cities served, with county context so Google understands hierarchy.
const PALM_BEACH_COUNTY = {
  '@type': 'AdministrativeArea',
  name: 'Palm Beach County',
} as const;
const BROWARD_COUNTY = {
  '@type': 'AdministrativeArea',
  name: 'Broward County',
} as const;

const SERVICE_AREA = [
  { name: 'Boca Raton', county: PALM_BEACH_COUNTY },
  { name: 'Delray Beach', county: PALM_BEACH_COUNTY },
  { name: 'Boynton Beach', county: PALM_BEACH_COUNTY },
  { name: 'Lake Worth', county: PALM_BEACH_COUNTY },
  { name: 'West Palm Beach', county: PALM_BEACH_COUNTY },
  { name: 'Wellington', county: PALM_BEACH_COUNTY },
  { name: 'Parkland', county: BROWARD_COUNTY },
  { name: 'Coral Springs', county: BROWARD_COUNTY },
  { name: 'Fort Lauderdale', county: BROWARD_COUNTY },
  { name: 'Coconut Creek', county: BROWARD_COUNTY },
  { name: 'Deerfield Beach', county: BROWARD_COUNTY },
  { name: 'Pompano Beach', county: BROWARD_COUNTY },
  { name: 'Margate', county: BROWARD_COUNTY },
].map((c) => ({
  '@type': 'City',
  name: c.name,
  containedInPlace: { ...c.county, containedInPlace: { '@type': 'State', name: 'Florida' } },
}));

// Each service gets a proper Offer entry — Google can show price ranges +
// "service area" snippets directly under search results.
const SERVICE_OFFERS = [
  {
    slug: 'regular-cleaning',
    name: 'Regular Cleaning',
    description:
      'Recurring weekly, bi-weekly, or monthly cleaning. Boutique standard, same team every visit.',
    minPrice: 130,
    maxPrice: 280,
  },
  {
    slug: 'deep-cleaning',
    name: 'Deep Cleaning',
    description:
      'Top-to-bottom reset: baseboards, inside oven, inside fridge, grout, ceiling fans, cabinet exteriors.',
    minPrice: 220,
    maxPrice: 480,
  },
  {
    slug: 'move-in-out',
    name: 'Move-In / Move-Out Cleaning',
    description:
      'Empty home, full detail. Includes inside cabinets, inside drawers, inside appliances. Deposit-back standard.',
    minPrice: 260,
    maxPrice: 550,
  },
  {
    slug: 'commercial',
    name: 'Commercial Cleaning',
    description:
      'Recurring office, retail, and clinic cleaning. After-hours scheduling. COI on request.',
    minPrice: 180,
    maxPrice: 600,
  },
  {
    slug: 'post-construction',
    name: 'Post-Construction Cleaning',
    description:
      'Wall-to-wall dust + detail after renovation or new build. Removes drywall dust, paint splatter, debris.',
    minPrice: 320,
    maxPrice: 800,
  },
];

const SITE_SCHEMA = [
  {
    '@context': 'https://schema.org',
    '@type': 'CleaningService',
    '@id': 'https://ultrashinecleaningfl.com/#business',
    name: 'Ultra Shine Cleaning',
    alternateName: 'Ultra Shine Cleaning FL',
    description:
      'Boutique house and commercial cleaning across Palm Beach and Broward County. Background-checked W2 team, fully insured + bonded, family-owned since 2018. Every job staffed by a pair of cleaners.',
    url: 'https://ultrashinecleaningfl.com',
    telephone: '+1-561-583-6694',
    email: 'contact@ultrashinecleaningfl.com',
    image: 'https://ultrashinecleaningfl.com/images/flow_hero_kitchen.jpg',
    logo: 'https://ultrashinecleaningfl.com/images/logo_navy_tight.png',
    priceRange: '$$',
    currenciesAccepted: 'USD',
    paymentAccepted: 'Cash, Credit Card, Debit Card, Check, Zelle, Venmo, Cash App',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Boca Raton',
      addressRegion: 'FL',
      postalCode: '33428',
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 26.3683,
      longitude: -80.1289,
    },
    // Mon-Sat 7am-5pm, Sunday closed. Schema.org uses ISO weekday names.
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '07:00',
        closes: '17:00',
      },
    ],
    areaServed: SERVICE_AREA,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      reviewCount: '25',
      bestRating: '5',
      worstRating: '1',
    },
    sameAs: [
      'https://maps.app.goo.gl/EGeuJViEFazQQe579',
      'https://www.homeadvisor.com/rated.UltraShineCleaning.68124585.html',
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Ultra Shine Cleaning Services',
      itemListElement: SERVICE_OFFERS.map((s) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          serviceType: s.name,
          name: s.name,
          description: s.description,
          url: `https://ultrashinecleaningfl.com/services/${s.slug}`,
          provider: { '@id': 'https://ultrashinecleaningfl.com/#business' },
          areaServed: SERVICE_AREA,
        },
        priceCurrency: 'USD',
        priceSpecification: {
          '@type': 'PriceSpecification',
          priceCurrency: 'USD',
          minPrice: s.minPrice,
          maxPrice: s.maxPrice,
        },
        availability: 'https://schema.org/InStock',
        url: `https://ultrashinecleaningfl.com/services/${s.slug}`,
      })),
    },
    founder: [
      { '@type': 'Person', name: 'Tiago Rena' },
      { '@type': 'Person', name: 'Francine Rena' },
    ],
    foundingDate: '2018',
    foundingLocation: { '@type': 'Place', name: 'Connecticut, USA' },
    knowsAbout: [
      'House Cleaning',
      'Deep Cleaning',
      'Move-Out Cleaning',
      'Commercial Cleaning',
      'Post-Construction Cleaning',
      'Eco-Friendly Cleaning',
      'Recurring Cleaning Services',
    ],
    slogan: 'A home that shines. Without lifting a finger.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://ultrashinecleaningfl.com/#website',
    url: 'https://ultrashinecleaningfl.com',
    name: 'Ultra Shine Cleaning',
    publisher: { '@id': 'https://ultrashinecleaningfl.com/#business' },
    inLanguage: 'en-US',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://ultrashinecleaningfl.com/services',
      },
      'query-input': 'required name=search_term',
    },
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
    'Professional house cleaning in Boca Raton, FL and across Palm Beach + Broward County. Background-checked W2 team, fully insured + bonded. ★ 5.0 verified reviews. Free quote in 1 hour.',
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
        {/* Thin trust strip at the very top of every page — proof signals
            visible immediately even before the user scrolls. Sits in
            normal flow so the absolute-positioned nav below it stacks
            naturally below the bar (no manual top: 36px adjustments). */}
        <TopTrustBar />
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        <StickyQuoteCta />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
