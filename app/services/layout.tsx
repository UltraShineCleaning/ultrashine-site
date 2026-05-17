import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cleaning Services · Ultra Shine Cleaning',
  description:
    'Five professional cleaning services across Boca Raton + South Florida: Regular, Deep, Move-In/Out, Commercial, and Post-Construction. Same standard, every visit. Free quote in 1 hour.',
  alternates: {
    canonical: 'https://ultrashinecleaningfl.com/services',
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
