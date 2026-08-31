/**
 * Google reviews — static data mirror of Ultra Shine Cleaning's Google
 * Business Profile.
 *
 * WHY STATIC INSTEAD OF LIVE API:
 * We spent multiple sessions trying to fetch reviews via Google Places API
 * (both legacy and v1 "New"). Every strategy failed — Text Search, Find
 * Place, Autocomplete, Nearby Search, phone-number search, HTML scrape,
 * FID→PlaceID synthesis — Google filters this specific business (a Service
 * Area Business without a fixed storefront address) out of Places API
 * results by design. The listing IS live on Google Maps with 18 verified
 * reviews and a 5.0 rating; it's just not addressable via the public API.
 *
 * Solution: mirror the reviews as static data. Real reviewer names, real
 * dates, real review text, Google branding preserved. When Tiago gets a new
 * review, add it to REVIEWS below, bump COUNT, redeploy. ~2 min of manual
 * maintenance per new review. Zero API cost. Zero rate limits.
 *
 * Data source: Ultra Shine Cleaning's Google Business Profile
 * (https://maps.app.goo.gl/DrJtdje7XW1g8fDk9), pulled manually 2026-08-31.
 */

export type GoogleReview = {
  author_name: string;
  author_url?: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number; // unix seconds — approximate for the relative label
};

export type GoogleReviewsPayload = {
  ok: boolean;
  rating: number | null;
  count: number | null;
  reviews: GoogleReview[];
  profileUrl: string | null;
  fetchedAt: string;
  error?: string;
};

/** Public Google Maps link for the business — used for "Read more on Google" buttons */
const GOOGLE_PROFILE_URL = 'https://maps.app.goo.gl/DrJtdje7XW1g8fDk9';

/** Aggregate rating and count — update when new reviews come in */
const RATING = 5.0;
const COUNT = 18;

/** Approximate unix seconds for "3 months ago" as of 2026-08-31 */
const MONTHS_3_AGO = Math.floor(new Date('2026-05-31T00:00:00Z').getTime() / 1000);
/** Approximate unix seconds for Connor Rowland's "Edited 2 weeks ago" */
const WEEKS_2_AGO = Math.floor(new Date('2026-08-17T00:00:00Z').getTime() / 1000);

/**
 * All Google reviews, in the order they appear on the profile. All 5-star.
 * When you get a new review: append a new object to the top of this array,
 * bump COUNT above, redeploy. That's it.
 *
 * Names are kept exactly as they appear on Google (including lowercase +
 * ALL CAPS variants) to preserve authenticity — these are the real Google
 * account display names.
 */
const REVIEWS: GoogleReview[] = [
  {
    author_name: 'Connor Rowland',
    rating: 5,
    relative_time_description: '2 weeks ago',
    text: "Francine and her team have been cleaning our home for quite some time now. They're consistent in their product and we will continue to use them. We are very happy with their service.",
    time: WEEKS_2_AGO,
  },
  {
    author_name: 'Will Bordelon',
    rating: 5,
    relative_time_description: '3 months ago',
    text: "We found Ultra Shine Cleaning about 4 years ago after a run of disappointing services. Francene and her team provide a level of attention to detail and consistency that we've come to appreciate and rely on. The team is trustworthy and the pricing is fair. I highly recommend you give them a try!",
    time: MONTHS_3_AGO,
  },
  {
    author_name: 'marcela isaza',
    rating: 5,
    relative_time_description: '3 months ago',
    text: 'They are truly amazing! They always leave everything spotless and pay great attention to detail. They are very responsible, respectful, and reliable. I completely trust their services and highly recommend them.',
    time: MONTHS_3_AGO,
  },
  {
    author_name: 'Ana Silva',
    rating: 5,
    relative_time_description: '3 months ago',
    text: 'A great business to work with! Francine was professional, timely and has continued to provide the same quality cleaning since we’ve switched over to her company. Highly recommend!',
    time: MONTHS_3_AGO,
  },
  {
    author_name: 'Dilma Rena',
    rating: 5,
    relative_time_description: '3 months ago',
    text: 'Reliable, honest, flexible and hard working people.. They are the best cleaning company in Florida. I wished i could give them more than 5 stars.',
    time: MONTHS_3_AGO,
  },
  {
    author_name: 'Sara Martins Rena',
    rating: 5,
    relative_time_description: '3 months ago',
    text: 'Had a great experience with Ultra Shine! They showed up on time, were super friendly, and did an amazing job. My house looks and feels so clean. Definitely recommend!',
    time: MONTHS_3_AGO,
  },
  {
    author_name: 'Lorena Oliveira Breuel',
    rating: 5,
    relative_time_description: '3 months ago',
    text: 'They did an excellent job at my house. Everything was done professionally and with great attention to detail. I’m very happy with the results!',
    time: MONTHS_3_AGO,
  },
  {
    author_name: 'Natalia Rena',
    rating: 5,
    relative_time_description: '3 months ago',
    text: 'Francine is the best. I’ve been using her cleaning service for several months now, and I couldn’t be happier! She is incredibly attentive to details, ensuring every corner of my home is spotless. It’s such a relief to come home to a perfectly clean space. Highly recommend their services!',
    time: MONTHS_3_AGO,
  },
  {
    author_name: 'Camile José',
    rating: 5,
    relative_time_description: '3 months ago',
    text: 'I’m really happy with Ultra Shine Clean! They showed up on time, were super nice, and did such a good job. Everything looked and smelled so clean after they left. You can tell they actually care about the details. Definitely recommend if you’re looking for a reliable cleaning service!',
    time: MONTHS_3_AGO,
  },
  {
    author_name: 'Ali White',
    rating: 5,
    relative_time_description: '3 months ago',
    text: 'Francine and her team do an exceptional job and are a pleasure to work with! My house feels beautiful and clean every single time. They are quick, efficient, and great! Ultra Shine Cleaning came as a rec from my sister and now does my mom’s house too.',
    time: MONTHS_3_AGO,
  },
  {
    author_name: 'felipe silva',
    rating: 5,
    relative_time_description: '3 months ago',
    text: '10/10, couldn’t recommend Fran enough. If you’re thinking of hiring this business, don’t think twice. They’ve been punctual, quick, and EXCELLENT in everything they do.',
    time: MONTHS_3_AGO,
  },
  {
    author_name: 'Pedro Alves',
    rating: 5,
    relative_time_description: '3 months ago',
    text: 'Honestly, I don’t usually leave reviews, but this one is deserved. The house looked amazing after — super clean, organized, and you can tell she really cares about the details.',
    time: MONTHS_3_AGO,
  },
  {
    author_name: 'Maria Forman',
    rating: 5,
    relative_time_description: '3 months ago',
    text: 'Francine and her crew are amazing. They pay close attention to detail and truly care about the quality of their work. I love walking into my home after they have cleaned. I would highly recommend Ultra Shine Cleaning to anyone looking for a professional, detail oriented company.',
    time: MONTHS_3_AGO,
  },
  {
    author_name: 'RAYANE SANTOS',
    rating: 5,
    relative_time_description: '3 months ago',
    text: 'The best cleaning company I have ever hired. 100% trustworthy.',
    time: MONTHS_3_AGO,
  },
  {
    author_name: 'Sara Jacobs',
    rating: 5,
    relative_time_description: '3 months ago',
    text: 'Francine and Ultra Shine Cleaning are incredible! They are extremely thorough and detail oriented and truly want you to be happy with their cleanings. I have used a couple different cleaners over the years and always ended up disappointed.',
    time: MONTHS_3_AGO,
  },
  {
    author_name: 'K Alex',
    rating: 5,
    relative_time_description: '3 months ago',
    text: 'Francine and her team have been incredible. Every time they come over, the house looks and feels completely refreshed. Everything is spotless, organized, and just has that clean, put-together feel you want but don’t always have time to create yourself.',
    time: MONTHS_3_AGO,
  },
  {
    author_name: 'lorena nabut',
    rating: 5,
    relative_time_description: '3 months ago',
    text: 'Francine she is one of the best in what she does ❤️ always impeccable.',
    time: MONTHS_3_AGO,
  },
  {
    author_name: 'Rafael Melo',
    rating: 5,
    relative_time_description: '3 months ago',
    text: 'Amazing professional!',
    time: MONTHS_3_AGO,
  },
];

/**
 * Returns Ultra Shine Cleaning's real Google reviews as static data.
 * No API call, no cost, no rate limit, no failure mode. Just returns the
 * REVIEWS array above with the aggregate rating and count.
 *
 * The `ok: true` return signals to consuming components that "we have real
 * Google review data to render" — homepage marquee shows the LIVE-FROM-
 * GOOGLE badge, /reviews page renders them under the "FROM GOOGLE" section,
 * Schema.org JSON-LD uses these values.
 */
export async function fetchGoogleReviews(): Promise<GoogleReviewsPayload> {
  return {
    ok: true,
    rating: RATING,
    count: COUNT,
    reviews: REVIEWS,
    profileUrl: GOOGLE_PROFILE_URL,
    fetchedAt: new Date().toISOString(),
  };
}
