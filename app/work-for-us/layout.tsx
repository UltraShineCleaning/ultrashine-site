import type { Metadata } from 'next';

export const metadata: Metadata = {
  // "cleaning jobs in <city>" is how applicants actually search — "Work For Us"
  // is how the business thinks about it, and nobody types that.
  title: { absolute: 'Cleaning Jobs in Boca Raton, FL · Now Hiring' },
  description:
    'House cleaning jobs in Boca Raton, Delray Beach + South Florida. Join a family-owned cleaning company serving 13 cities across Palm Beach + Broward. Fair pay, paid drive time, same clients on recurring routes. Apply now.',
  alternates: { canonical: 'https://ultrashinecleaningfl.com/work-for-us' },
};

export default function WorkForUsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
