import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Print Review Card · Ultra Shine Cleaning',
  description: 'Print this card and leave one at every cleaning job.',
  robots: { index: false, follow: false },
};

export default function ReviewCardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
