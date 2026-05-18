import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Jobber Connected · Ultra Shine Admin',
  description: 'Internal Jobber OAuth callback success page.',
  robots: { index: false, follow: false },
};

export default function JobberConnectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
