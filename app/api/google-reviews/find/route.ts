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
  const q = url.searchParams.get('q') || 'Ultra Shine Cleaning';

  // Boca Raton coordinates from the resolved short-link URL — bias search
  // to a 20km radius around Tiago's actual location so we don't get car
  // washes and window cleaners from the broader Miami metro.
  const locationBias = 'circle:20000@26.2809936,-80.1761665';

  // We hit BOTH endpoints and merge — Text Search (broader, ranked by
  // relevance to query + location) and Find Place (targeted, top match).
  // Between the two we should find any Google Business Profile listing.
  const textSearchUrl =
    `https://maps.googleapis.com/maps/api/place/textsearch/json` +
    `?query=${encodeURIComponent(q)}` +
    `&location=26.2809936,-80.1761665` +
    `&radius=20000` +
    `&key=${apiKey}`;

  const findPlaceUrl =
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
    `?input=${encodeURIComponent(q)}` +
    `&inputtype=textquery` +
    `&locationbias=${encodeURIComponent(locationBias)}` +
    `&fields=place_id,name,formatted_address,rating,user_ratings_total` +
    `&key=${apiKey}`;

  try {
    const [textRes, findRes] = await Promise.all([
      fetch(textSearchUrl, { cache: 'no-store' }),
      fetch(findPlaceUrl, { cache: 'no-store' }),
    ]);
    const textJson = await textRes.json();
    const findJson = await findRes.json();

    // Normalize results — text search returns "results", find place returns
    // "candidates". Merge and dedupe by place_id.
    const seen = new Set<string>();
    const merged: Array<{
      source: string;
      name: string;
      formatted_address?: string;
      place_id: string;
      rating?: number;
      user_ratings_total?: number;
    }> = [];
    for (const r of textJson.results || []) {
      if (r.place_id && !seen.has(r.place_id)) {
        seen.add(r.place_id);
        merged.push({
          source: 'textsearch',
          name: r.name,
          formatted_address: r.formatted_address,
          place_id: r.place_id,
          rating: r.rating,
          user_ratings_total: r.user_ratings_total,
        });
      }
    }
    for (const c of findJson.candidates || []) {
      if (c.place_id && !seen.has(c.place_id)) {
        seen.add(c.place_id);
        merged.push({
          source: 'findplace',
          name: c.name,
          formatted_address: c.formatted_address,
          place_id: c.place_id,
          rating: c.rating,
          user_ratings_total: c.user_ratings_total,
        });
      }
    }

    return NextResponse.json(
      {
        ok: merged.length > 0,
        query: q,
        found: merged.length,
        text_search_status: textJson.status,
        find_place_status: findJson.status,
        candidates: merged,
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
