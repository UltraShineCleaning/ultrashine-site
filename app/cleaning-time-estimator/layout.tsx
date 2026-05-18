import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How Long Will My Cleaning Take? · Time Estimator · Ultra Shine',
  description:
    'Rough estimate of how long your house cleaning will take in Boca Raton + South Florida. Answer 5 quick questions — get an honest time range. No prices, no sign-up.',
  alternates: {
    canonical: 'https://ultrashinecleaningfl.com/cleaning-time-estimator',
  },
};

export default function EstimatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
