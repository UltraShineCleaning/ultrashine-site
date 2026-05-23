/**
 * Google Places API — live reviews + rating for Ultra Shine Cleaning.
 *
 * Reads the Google Business Profile via Place Details, returns the 5 most
 * helpful reviews + the live aggregate rating + review count.
 *
 * Setup (one-time):
 *   1. Find your Place ID: https://developers.google.com/maps/documentation/places/web-service/place-id
 *   2. Create a Google Cloud project, enable "Places API" (New), generate an API key
 *   3. Restrict the key: HTTP referrer = your domain, API restriction = Places API only
 *   4. Set Vercel env vars: GOOGLE_PLACES_API_KEY + GOOGLE_PLACE_ID
 *
 * Caching: route handler caches for 24h (Next.js revalidate). At ~$0.017 per
 * Place Details + Reviews request, daily refresh = ~$0.50/month.
 *
 * Fallback: if env vars are missing OR the API call fails, the consumer
 * components fall back to the curated HomeAdvisor testimonials so the site
 * never shows an empty reviews section.
 */

export type GoogleReview = {
  author_name: string;
  author_url?: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number; // unix seconds
};

export type GoogleReviewsPayload = {
  /** True when env vars are configured AND the Places API responded successfully */
  ok: boolean;
  /** Aggregate Google rating (e.g. 5.0, 4.9). null if no live data */
  rating: number | null;
  /** Total review count on the Google Business Profile. null if no live data */
  count: number | null;
  /** Up to 5 most helpful reviews (Google's API caps this — we can't get more) */
  reviews: GoogleReview[];
  /** URL where visitors can read all reviews + leave their own */
  profileUrl: string | null;
  /** ISO timestamp of when this data was fetched (for cache visibility) */
  fetchedAt: string;
  /** Error reason if ok=false. Hidden from users; useful for debugging. */
  error?: string;
};

const EMPTY: GoogleReviewsPayload = {
  ok: false,
  rating: null,
  count: null,
  reviews: [],
  profileUrl: null,
  fetchedAt: new Date(0).toISOString(),
};

/**
 * Fetch from Google Places API. Called server-side from the route handler.
 * Never throws — returns EMPTY with an error reason on any failure so the
 * site degrades gracefully to the static testimonial fallback.
 */
export async function fetchGoogleReviews(): Promise<GoogleReviewsPayload> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    return { ...EMPTY, error: 'env vars not set (GOOGLE_PLACES_API_KEY + GOOGLE_PLACE_ID)' };
  }

  // Place Details endpoint — fields kept minimal to keep the call cheap.
  // `reviews` field triggers the higher-cost "Place Details Reviews" tier
  // but returns the top 5 reviews + rating + user_ratings_total.
  const fields = ['name', 'rating', 'user_ratings_total', 'reviews', 'url'].join(',');
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${apiKey}`;

  try {
    const res = await fetch(url, {
      // 24-hour revalidation — Next.js caches this server-side. With ~30 fresh
      // page renders per day on the homepage + reviews page this stays well
      // under the daily API budget.
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!res.ok) {
      return { ...EMPTY, error: `places api http ${res.status}` };
    }

    const json = await res.json();

    if (json.status !== 'OK' || !json.result) {
      return { ...EMPTY, error: `places api status ${json.status} ${json.error_message || ''}`.trim() };
    }

    const result = json.result;
    const reviews: GoogleReview[] = Array.isArray(result.reviews) ? result.reviews : [];

    return {
      ok: true,
      rating: typeof result.rating === 'number' ? result.rating : null,
      count: typeof result.user_ratings_total === 'number' ? result.user_ratings_total : null,
      reviews: reviews.slice(0, 5).map((r) => ({
        author_name: String(r.author_name || 'Google User'),
        author_url: typeof r.author_url === 'string' ? r.author_url : undefined,
        profile_photo_url: typeof r.profile_photo_url === 'string' ? r.profile_photo_url : undefined,
        rating: typeof r.rating === 'number' ? r.rating : 5,
        relative_time_description: String(r.relative_time_description || ''),
        text: String(r.text || '').trim(),
        time: typeof r.time === 'number' ? r.time : Math.floor(Date.now() / 1000),
      })),
      profileUrl: typeof result.url === 'string' ? result.url : null,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    return { ...EMPTY, error: `fetch threw: ${err instanceof Error ? err.message : 'unknown'}` };
  }
}
