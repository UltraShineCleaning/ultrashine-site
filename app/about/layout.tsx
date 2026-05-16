import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About · Ultra Shine Cleaning · Tiago + Francine Rena',
  description:
    'Husband-and-wife founded Ultra Shine Cleaning in Connecticut in 2018, moved to South Florida in 2021. Today serving 13 cities across Palm Beach + Broward — same team, every visit, fully insured + bonded.',
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
