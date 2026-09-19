import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Free Cleaning Quote in Boca Raton, FL · Ultra Shine' },
  description:
    'Get a free house cleaning quote in 1 hour for Boca Raton, Delray Beach + South Florida. No calls, no spam, no pressure. Background-checked team, fully insured and bonded, 5.0★ Google rating.',
  alternates: { canonical: 'https://ultrashinecleaningfl.com/quote' },
};

export default function QuoteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
