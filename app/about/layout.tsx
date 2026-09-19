import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'About Ultra Shine Cleaning · Boca Raton, FL' },
  description:
    'The family-owned cleaning company behind Ultra Shine. Founded in Connecticut in 2018, moved to South Florida in 2021, today serving 13 cities across Palm Beach + Broward — same team every visit, fully insured + bonded.',
  alternates: { canonical: 'https://ultrashinecleaningfl.com/about' },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
