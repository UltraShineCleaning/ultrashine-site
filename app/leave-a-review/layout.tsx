import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leave a Review · Ultra Shine Cleaning',
  description:
    'Loved your clean? Share your experience on Google in 60 seconds. Your honest review helps neighbors find us and helps our team know we got it right.',
  // Reviews are private CTAs — keep this page out of search results so
  // the rest of the marketing site ranks for "Ultra Shine Cleaning"
  robots: {
    index: false,
    follow: true,
  },
};

export default function LeaveAReviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
