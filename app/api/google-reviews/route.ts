import { NextResponse } from 'next/server';
import { fetchGoogleReviews } from '../../_lib/google-reviews';

/**
 * GET /api/google-reviews
 *
 * Returns the latest cached Google Place Details — rating, review count, and
 * up to 5 reviews. Cached for 24h server-side (see fetchGoogleReviews).
 *
 * Consumers:
 *   - Homepage reviews marquee
 *   - Homepage trust strip ("5.0 Google" badge)
 *   - /reviews page header + grid
 *
 * Falls back gracefully when env vars are unset OR Google returns an error.
 */
export async function GET() {
  const data = await fetchGoogleReviews();
  return NextResponse.json(data, {
    headers: {
      // Browsers can cache the response for an hour, but Vercel's edge can
      // hold it for the full 24h. Stale-while-revalidate keeps the page
      // snappy if the next revalidation is slow.
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}
