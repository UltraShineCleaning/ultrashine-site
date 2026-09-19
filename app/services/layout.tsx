import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Cleaning Services in Boca Raton, FL · Ultra Shine' },
  description:
    'Five professional cleaning services in Boca Raton + South Florida: house cleaning, deep cleaning, move-out cleaning, office cleaning, and post-construction cleanup. Same standard, every visit. Free quote in 1 hour.',
  alternates: {
    // Correct for /services itself. Each of the 5 detail pages MUST set its
    // own canonical, because Next merges this one down into any child that
    // doesn't — which is what pointed all five at this index page.
    canonical: 'https://ultrashinecleaningfl.com/services',
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
