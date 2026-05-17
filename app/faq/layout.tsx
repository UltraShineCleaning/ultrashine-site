import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ · Ultra Shine Cleaning · Pricing, Services, Booking',
  description:
    'Frequently asked questions about Ultra Shine Cleaning — pricing, services, our W2 team, scheduling, service areas across Palm Beach and Broward. 26 answers covering everything we get asked the most.',
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
