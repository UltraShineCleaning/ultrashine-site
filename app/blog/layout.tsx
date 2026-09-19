import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Cleaning Tips for South Florida Homes · Ultra Shine' },
  description:
    'Practical house cleaning advice for South Florida homes. Boca Raton-specific schedules, humidity and mold tips, move-out checklists, and real answers from a family-owned cleaning service.',
  alternates: { canonical: 'https://ultrashinecleaningfl.com/blog' },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
