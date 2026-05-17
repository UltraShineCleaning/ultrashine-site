import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cleaning Tips + Florida Living · Ultra Shine Cleaning Blog',
  description:
    'Practical cleaning advice for South Florida homes. Boca Raton-specific schedules, humidity tips, and real answers from a family-owned cleaning service.',
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
