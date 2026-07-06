import { NextResponse } from 'next/server';

/**
 * GET /api/google-reviews/find?q=Ultra+Shine+Cleaning+Boca+Raton
 *
 * TEMPORARY LOOKUP ENDPOINT — used once to convert a business name to its
 * Google Place ID, then removed. The Places API's "Find Place from Text"
 * returns the ChIJ… Place ID we need for /api/google-reviews to work.
 *
 * Uses the already-configured GOOGLE_PLACES_API_KEY env var — no additional
 * setup required. Delete this route once you have the Place ID.
 */
export async function GET(request: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'GOOGLE_PLACES_API_KEY not set in env' }, { status: 500 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get('q') || 'Ultra Shine Cleaning Boca Raton';

  const findUrl =
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
    `?input=${encodeURIComponent(q)}` +
    `&inputtype=textquery` +
    `&fields=place_id,name,formatted_address,rating,user_ratings_total` +
    `&key=${apiKey}`;

  try {
    const res = await fetch(findUrl, { cache: 'no-store' });
    const json = await res.json();
    return NextResponse.json(
      {
        ok: json.status === 'OK',
        status: json.status,
        error_message: json.error_message,
        query: q,
        candidates: json.candidates || [],
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
