import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get Your Free Quote · Ultra Shine Cleaning',
  description:
    'Custom cleaning quote in 1 hour for Boca Raton + South Florida. No calls, no spam, no pressure. Background-checked W2 team, fully insured, 4.9★ Google rating.',
};

export default function QuoteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
