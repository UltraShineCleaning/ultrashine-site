import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Cleaning Service FAQ · Pricing, Booking + Services' },
  description:
    'Answers about house cleaning in Boca Raton + South Florida — what it costs, what is included, who comes to your home, how to book, and the 13 cities we serve across Palm Beach and Broward.',
  alternates: { canonical: 'https://ultrashinecleaningfl.com/faq' },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
