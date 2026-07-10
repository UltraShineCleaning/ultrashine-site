import { NextResponse } from 'next/server';

/**
 * GET /api/google-reviews/find?q=Ultra+Shine+Cleaning+Boca+Raton
 *
 * TEMPORARY LOOKUP ENDPOINT — used once to identify the Google Place ID for
 * Ultra Shine Cleaning, then removed. Because Tiago's Google Business Profile
 * is a Service Area Business (SAB) that isn't returned by regular Places API
 * search endpoints, this route tries multiple strategies in parallel:
 *   1. Text Search (name query + location bias)
 *   2. Find Place from Text
 *   3. Direct Place Details lookup with synthesized Place ID from the
 *      known Feature ID (0x21c11105853a24d1:0x2ecf48759762b5e3) — extracted
 *      from the resolved maps.app.goo.gl short link.
 *
 * Uses the already-configured GOOGLE_PLACES_API_KEY env var. Delete once we
 * confirm the working Place ID.
 */

// Feature ID → Place ID conversion. The FID is two 8-byte hex integers
// separated by colon (the "cell ID" and the "feature ID"). Google's Place ID
// format is a base64url-encoded protobuf: field 1 (varint) = cell ID, field 2
// (varint) = feature ID, prefixed with the marker "ChIJ" (which is itself the
// base64 encoding of the outer protobuf wrapper indicating a "place with
// feature reference"). This synthesis matches the format used by Google Maps
// for canonical business listings.
function fidToPlaceId(fidHex: string): string | null {
  const parts = fidHex.split(':');
  if (parts.length !== 2) return null;
  try {
    // BigInt literal suffixes (0x7fn etc) require ES2020 — the project's
    // tsconfig currently targets ES2019, so we construct bigints via the
    // BigInt() constructor which is broadly available.
    const BI_7F = BigInt(0x7f);
    const BI_80 = BigInt(0x80);
    const BI_7 = BigInt(7);
    const hi = BigInt(parts[0]);
    const lo = BigInt(parts[1]);

    const encodeVarint = (n: bigint): Uint8Array => {
      const out: number[] = [];
      let v = n;
      while (v > BI_7F) {
        out.push(Number((v & BI_7F) | BI_80));
        v >>= BI_7;
      }
      out.push(Number(v & BI_7F));
      return new Uint8Array(out);
    };

    const hiBytes = encodeVarint(hi);
    const loBytes = encodeVarint(lo);
    const payload = new Uint8Array(2 + hiBytes.length + loBytes.length);
    payload[0] = 0x08;
    payload.set(hiBytes, 1);
    payload[1 + hiBytes.length] = 0x10;
    payload.set(loBytes, 2 + hiBytes.length);

    const b64 = Buffer.from(payload).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return `ChIJ${b64}`;
  } catch {
    return null;
  }
}

// FID pulled from the resolved maps.app.goo.gl/GmEBHhNBtiZ4qSaP7 URL.
const KNOWN_FID = '0x21c11105853a24d1:0x2ecf48759762b5e3';

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

    // Strategy 2b: Place Autocomplete — designed for search-as-you-type and
    // more forgiving with obscure SABs than Text Search / Find Place.
    const autocompleteUrl =
      `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
      `?input=${encodeURIComponent(q)}` +
      `&location=26.2809936,-80.1761665` +
      `&radius=5000` +
      `&types=establishment` +
      `&key=${apiKey}`;
    const acRes = await fetch(autocompleteUrl, { cache: 'no-store' });
    const acJson = await acRes.json();
    const autocompletePredictions = (acJson.predictions || [])
      .filter((p: { place_id?: string }) => p.place_id && !seen.has(p.place_id))
      .map((p: {
        place_id: string;
        description: string;
        structured_formatting?: { main_text?: string; secondary_text?: string };
      }) => {
        seen.add(p.place_id);
        merged.push({
          source: 'autocomplete',
          name: p.structured_formatting?.main_text || p.description,
          formatted_address: p.structured_formatting?.secondary_text || p.description,
          place_id: p.place_id,
        });
        return p;
      });

    // Strategy 2c: Nearby Search at exact business coordinates, tiny radius.
    // Different endpoint from Text Search — sometimes returns SABs the others miss.
    const nearbyUrl =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=26.2809936,-80.1761665` +
      `&radius=100` +
      `&keyword=${encodeURIComponent('ultra shine cleaning')}` +
      `&key=${apiKey}`;
    const nearbyRes = await fetch(nearbyUrl, { cache: 'no-store' });
    const nearbyJson = await nearbyRes.json();
    for (const r of nearbyJson.results || []) {
      if (r.place_id && !seen.has(r.place_id)) {
        seen.add(r.place_id);
        merged.push({
          source: 'nearby',
          name: r.name,
          formatted_address: r.vicinity || r.formatted_address,
          place_id: r.place_id,
          rating: r.rating,
          user_ratings_total: r.user_ratings_total,
        });
      }
    }

    // Strategy 3: fetch the actual Google Maps page for this business
    // (URL resolved from Tiago's maps.app.goo.gl share link) and scrape the
    // canonical Place ID from its embedded metadata. Google Maps pages
    // include the Place ID in several places: the meta tags, a "place_id"
    // JSON blob, or the canonical URL parameters.
    const MAPS_URL = 'https://www.google.com/maps/place/Ultra+Shine+Cleaning/@26.2809936,-80.1761665,15z/data=!4m6!3m5!1s0x21c11105853a24d1:0x2ecf48759762b5e3!8m2!3d26.2809936!4d-80.1761665!16s%2Fg%2F11nbkcv0wy';

    let scrape: {
      attempted: boolean;
      candidates: string[];
      picked?: string;
      details_status?: string;
      details_error?: string;
      name?: string;
      address?: string;
      rating?: number;
      review_count?: number;
    } = { attempted: false, candidates: [] };

    try {
      const htmlRes = await fetch(MAPS_URL, {
        cache: 'no-store',
        headers: {
          // Real UA so Google returns the full HTML page, not a redirect
          // to the mobile / consent screen.
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      const html = await htmlRes.text();
      scrape.attempted = true;

      // Google embeds Place IDs in maps HTML as raw ChIJ... strings.
      // Grab every unique ChIJ... token we see; the right one is usually
      // the first one that resolves via Place Details.
      const matches = html.match(/ChIJ[A-Za-z0-9_-]{20,90}/g) || [];
      const uniq = Array.from(new Set(matches)).slice(0, 10);
      scrape.candidates = uniq;

      // Try each candidate against Place Details until one returns OK with
      // a name that looks like ours.
      for (const cand of uniq) {
        const detailsUrl =
          `https://maps.googleapis.com/maps/api/place/details/json` +
          `?place_id=${encodeURIComponent(cand)}` +
          `&fields=name,formatted_address,rating,user_ratings_total` +
          `&key=${apiKey}`;
        const detailsRes = await fetch(detailsUrl, { cache: 'no-store' });
        const detailsJson = await detailsRes.json();
        if (detailsJson.status === 'OK' && detailsJson.result) {
          const name = String(detailsJson.result.name || '').toLowerCase();
          // Match only if the name looks right — avoid picking up some other
          // ChIJ... that happens to appear elsewhere in the HTML.
          if (name.includes('ultra shine') || name.includes('shine cleaning')) {
            scrape.picked = cand;
            scrape.details_status = detailsJson.status;
            scrape.name = detailsJson.result.name;
            scrape.address = detailsJson.result.formatted_address;
            scrape.rating = detailsJson.result.rating;
            scrape.review_count = detailsJson.result.user_ratings_total;
            break;
          }
        }
      }
    } catch (err) {
      scrape.details_error = err instanceof Error ? err.message : 'scrape failed';
    }

    return NextResponse.json(
      {
        ok: merged.length > 0 || !!scrape.picked,
        query: q,
        found: merged.length,
        text_search_status: textJson.status,
        find_place_status: findJson.status,
        autocomplete_status: acJson.status,
        nearby_status: nearbyJson.status,
        candidates: merged,
        maps_scrape: scrape,
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
