/**
 * THE one place the ballpark price is calculated.
 *
 * Used by:
 *   - /cleaning-time-estimator (the interactive calculator)
 *   - the "EXAMPLE" price card on /services and on every service page
 *   - the live ballpark on /quote and the lead email (via quoteBallpark.ts)
 *
 * Until 2026-09-24 those example cards carried hand-typed copies of the
 * calculator's output. They had already drifted (deep cleaning's card said
 * $280 while the calculator produced $290), and they would have silently
 * kept showing the old numbers after the recalibration below. Now there is
 * one formula and everything reads it.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * RECALIBRATION — 2026-09-24
 * ─────────────────────────────────────────────────────────────────────────
 * The old calculator never asked for square footage or number of floors.
 * Every home with 5+ bedrooms landed in one bucket with 5.75 base hours, so
 * a 4,500 sq ft two-story new build priced like a 2,800 sq ft ranch.
 *
 * For a 6 bed / 5 bath / ~4,500 sq ft / 2-floor post-construction clean it
 * returned 14–19 person-hours, $770–$1,240 — roughly $0.17–$0.28 per sq ft.
 * That is ROUGH-clean pricing (market: $0.10–$0.30/sq ft) for a FINAL clean
 * (market: $0.30–$0.75/sq ft; most operators floor residential finals at
 * about $0.40). Sources checked 2026-09-24: HomeGuide, Angi, Fixr, Yorleny's
 * Cleaning Service (West Palm, Florida-specific rates), MB Clean Solutions
 * (Boca), S&K Cleaning (Boca 2026 price guide).
 *
 * The time was the error, not the hourly rate. Industry productivity for a
 * new-construction final clean is ~100–200 sq ft per worker per hour, i.e.
 * 22–45 person-hours for 4,500 sq ft. The old model gave 14–19.
 *
 * What changed:
 *   1. Square footage is asked. Post-construction time is driven directly by
 *      it (sq ft ÷ 130 per person-hour, the careful end of the industry
 *      range, because Boca finishes are high-end and detail-heavy).
 *   2. For every other service, square footage can only RAISE the base hours
 *      above the bedroom baseline, never lower it — typical homes price
 *      exactly as before; large homes stop being underpriced.
 *   3. Extra floors add time (stairs, rails, balusters, a second set of
 *      everything), weighted by how detailed the service is.
 *   4. Every bathroom counts in post-construction (grout haze, shower glass
 *      film, caulk lines), not just those beyond two.
 *
 * Regular and deep cleaning for typical homes were checked against the same
 * sources and already sat inside the Boca market range, so their rates and
 * multipliers are unchanged.
 */

export type HomeSize = 'studio' | '2br' | '3br' | '4br' | '5br_plus';
export type SqftBand = 'under1500' | '1500_2500' | '2500_3500' | '3500_5000' | '5000_plus';
export type Floors = 1 | 2 | 3;
export type Service = 'regular' | 'deep' | 'moveout' | 'postconstruction';
export type LastCleaned = 'recent' | 'months' | 'years' | 'construction';
export type Pets = 'none' | 'few' | 'many';
export type Frequency = 'one' | 'monthly' | 'biweekly' | 'weekly';

export type EstimateInput = {
  homeSize: HomeSize;
  sqft: SqftBand;
  floors: Floors;
  bathrooms: number;
  service: Service;
  lastCleaned: LastCleaned;
  pets: Pets;
  frequency: Frequency;
  /** Exact square footage, when the visitor typed a number (the /quote form)
   *  instead of picking a band (the estimator). Wins over `sqft` when valid. */
  sqftExact?: number;
};

/** Smallest / largest typed square footage we'll price. Outside this it's a
 *  typo (240 for 2,400; 24,000 for 2,400) and we fall back to the band. */
export const SQFT_EXACT_MIN = 300;
export const SQFT_EXACT_MAX = 15000;

export type Estimate = {
  low: number; // person-hours
  high: number;
  cleaners: number;
  wallLow: number; // hours on site with the crew
  wallHigh: number;
  priceLow: number;
  priceHigh: number;
};

/* ---------------- constants ---------------- */

export const HOME_BASE_HOURS: Record<HomeSize, number> = {
  studio: 2,
  '2br': 2.75,
  '3br': 3.75,
  '4br': 4.75,
  '5br_plus': 5.75,
};

/** Representative square footage for each band — used for the math. */
export const SQFT_BAND_VALUE: Record<SqftBand, number> = {
  under1500: 1200,
  '1500_2500': 2000,
  '2500_3500': 3000,
  '3500_5000': 4250,
  '5000_plus': 6000,
};

export const SQFT_BAND_LABEL: Record<SqftBand, string> = {
  under1500: 'Under 1,500',
  '1500_2500': '1,500–2,500',
  '2500_3500': '2,500–3,500',
  '3500_5000': '3,500–5,000',
  '5000_plus': '5,000+',
};

/** The band a visitor most likely has, given their bedroom count. Used as
 *  the default until they pick one themselves. */
export const DEFAULT_SQFT_FOR_HOME: Record<HomeSize, SqftBand> = {
  studio: 'under1500',
  '2br': 'under1500',
  '3br': '1500_2500',
  '4br': '2500_3500',
  '5br_plus': '3500_5000',
};

/** Regular-clean productivity: ~630 sq ft per person-hour. Calibrated so the
 *  DEFAULT bands for a 3-bed (≈2,000 sq ft) and a 4-bed (≈3,000 sq ft) land
 *  at or under their bedroom baseline — i.e. typical homes price exactly as
 *  they did before square footage was asked. Only genuinely large homes move.
 *  (580 was tried first and lifted the default 4-bed ~8%; rejected.) */
const SQFT_PER_PERSON_HOUR_REGULAR = 632;

/** Post-construction final clean: ~130 sq ft per person-hour. */
const SQFT_PER_PERSON_HOUR_POSTCONSTRUCTION = 130;

export const SERVICE_MULTIPLIER: Record<Service, number> = {
  regular: 1.0,
  deep: 1.5,
  moveout: 1.7,
  postconstruction: 2.0, // not used for post-construction — it has its own model
};

export const LAST_CLEANED_HOURS: Record<LastCleaned, number> = {
  recent: 0,
  months: 0.75,
  years: 1.5,
  construction: 1.0,
};

export const PET_HOURS: Record<Pets, number> = {
  none: 0,
  few: 0.4,
  many: 0.9,
};

/** Person-hours added for EACH floor above the first. */
const EXTRA_FLOOR_HOURS: Record<Service, number> = {
  regular: 0.4,
  deep: 0.75,
  moveout: 0.75,
  postconstruction: 2.0,
};

/** Post-construction bathrooms are heavy: grout haze, shower glass film,
 *  caulk lines, every fixture stickered. Applies to every bathroom. */
const POSTCONSTRUCTION_HOURS_PER_BATH = 0.75;

export const SERVICE_LABEL: Record<Service, string> = {
  regular: 'Regular Cleaning',
  deep: 'Deep Cleaning',
  moveout: 'Move-In / Move-Out',
  postconstruction: 'Post-Construction',
};

/** Hourly rate per cleaner. Premium South FL positioning (Boca/Palm Beach). */
export const HOURLY_RATE_RANGE: Record<Service, [number, number]> = {
  regular: [45, 55],
  deep: [50, 60],
  moveout: [50, 60],
  postconstruction: [55, 65],
};

/** Recurring homes stay maintained, so each visit takes less time.
 *  Only applies to regular cleaning. */
export const FREQUENCY_MULTIPLIER: Record<Frequency, number> = {
  one: 1.0,
  monthly: 0.92,
  biweekly: 0.85,
  weekly: 0.8,
};

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  one: 'One-Time',
  monthly: 'Monthly',
  biweekly: 'Bi-Weekly',
  weekly: 'Weekly',
};

/** Regular and move-in/out cleanings are ALWAYS a pair — 2 cleaners. */
export const ALWAYS_CLEANERS = 2;

/**
 * Whether the crew is a fixed pair for this service. (Tiago, 2026-09-24.)
 * Deep and post-construction jobs are NOT always done by two — the crew is
 * sized to the home, so the site must not promise "2 cleaners" or an
 * on-site time for them (on-site time = work hours ÷ crew size, and the crew
 * size isn't known until the walkthrough). The PRICE is unaffected: it comes
 * from total work hours, which don't depend on how many people share them.
 */
export const CREW_IS_FIXED_PAIR: Record<Service, boolean> = {
  regular: true,
  moveout: true,
  deep: false,
  postconstruction: false,
};

/* ---------------- the formula ---------------- */

export function computeEstimate(input: EstimateInput): Estimate {
  const { homeSize, sqft, floors, bathrooms, service, lastCleaned, pets, frequency, sqftExact } = input;
  const exactOk =
    typeof sqftExact === 'number' &&
    Number.isFinite(sqftExact) &&
    sqftExact >= SQFT_EXACT_MIN &&
    sqftExact <= SQFT_EXACT_MAX;
  const sqftValue = exactOk ? sqftExact : SQFT_BAND_VALUE[sqft];
  const extraFloors = Math.max(0, floors - 1);

  let totalHours: number;

  if (service === 'postconstruction') {
    // Driven by square footage. Last-cleaned is irrelevant: it's a new build.
    totalHours =
      sqftValue / SQFT_PER_PERSON_HOUR_POSTCONSTRUCTION +
      bathrooms * POSTCONSTRUCTION_HOURS_PER_BATH +
      PET_HOURS[pets] +
      extraFloors * EXTRA_FLOOR_HOURS.postconstruction;
  } else {
    // Square footage can only raise the bedroom baseline, never lower it.
    const base = Math.max(HOME_BASE_HOURS[homeSize], sqftValue / SQFT_PER_PERSON_HOUR_REGULAR);
    const bathroomAdj = Math.max(0, bathrooms - 2) * 0.5;
    const frequencyMult = service === 'regular' ? FREQUENCY_MULTIPLIER[frequency] : 1.0;
    totalHours =
      (base + bathroomAdj + LAST_CLEANED_HOURS[lastCleaned] + PET_HOURS[pets]) *
        SERVICE_MULTIPLIER[service] *
        frequencyMult +
      extraFloors * EXTRA_FLOOR_HOURS[service];
  }

  const low = Math.max(1.5, Math.round(totalHours * 0.85 * 10) / 10);
  const high = Math.round(totalHours * 1.15 * 10) / 10;

  const cleaners = ALWAYS_CLEANERS;
  const wallLow = Math.round((low / cleaners) * 10) / 10;
  const wallHigh = Math.round((high / cleaners) * 10) / 10;

  const [rateLow, rateHigh] = HOURLY_RATE_RANGE[service];
  const priceLow = Math.round((low * rateLow) / 10) * 10;
  const priceHigh = Math.round((high * rateHigh) / 10) * 10;

  return { low, high, cleaners, wallLow, wallHigh, priceLow, priceHigh };
}

/* ---------------- the example card ---------------- */

/** The home described on every "EXAMPLE" card. One definition, so the card's
 *  words and the card's price can never disagree. */
export function exampleInput(service: Service): EstimateInput {
  return {
    homeSize: '3br',
    sqft: '1500_2500',
    floors: 1,
    bathrooms: 2,
    service,
    lastCleaned: service === 'postconstruction' ? 'construction' : 'months',
    pets: 'none',
    frequency: 'one',
  };
}

/** The third line of the example card — the condition the price assumes. */
export function exampleConditionLine(service: Service): string {
  return service === 'postconstruction'
    ? 'New build · about 2,000 sq ft'
    : 'Last cleaned months ago';
}
