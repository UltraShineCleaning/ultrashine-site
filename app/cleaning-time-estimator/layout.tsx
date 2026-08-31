import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'What Will My Cleaning Cost? · Instant Estimator · Ultra Shine',
  description:
    'Get a ballpark price range and time estimate for house cleaning in Boca Raton + South Florida. Answer 6 quick questions — no email, no sign-up, no waiting.',
  alternates: {
    canonical: 'https://ultrashinecleaningfl.com/cleaning-time-estimator',
  },
};

export default function EstimatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
