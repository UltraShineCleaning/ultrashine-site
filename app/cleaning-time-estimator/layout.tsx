import type { Metadata } from 'next';

export const metadata: Metadata = {
  // "how much does house cleaning cost" is one of the highest-intent queries in
  // this category. Leading with the phrase people type beats leading with ours.
  title: { absolute: 'House Cleaning Cost Calculator · Boca Raton, FL' },
  description:
    'How much does house cleaning cost in Boca Raton? Get a ballpark price range and time estimate for house cleaning across South Florida. Tell us your square footage, floors and bathrooms — no email, no sign-up, no waiting.',
  alternates: {
    canonical: 'https://ultrashinecleaningfl.com/cleaning-time-estimator',
  },
};

export default function EstimatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
