import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Work For Us · Ultra Shine Cleaning · Now Hiring',
  description:
    'Join Ultra Shine Cleaning — a family-owned W2 cleaning company serving 13 cities across Palm Beach + Broward. Fair pay, paid drive time, same clients on recurring routes. Apply now.',
};

export default function WorkForUsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
