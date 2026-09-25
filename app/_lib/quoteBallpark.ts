import {
  computeEstimate,
  DEFAULT_SQFT_FOR_HOME,
  type Floors,
  type Frequency,
  type HomeSize,
  type LastCleaned,
  type Service,
} from './estimate';

/**
 * The live ballpark on /quote, and the same number in the lead email.
 *
 * ONE function, called by the page (so the customer sees it as they pick) and
 * by /api/quote (so Tiago sees exactly what the customer saw). The server
 * RECOMPUTES it from the form choices; it never trusts a price sent by the
 * browser.
 *
 * The add-on table lives here too. Before 2026-09-24 it was typed twice, once
 * on the page and once in the email route, and neither knew that Deep,
 * Move-In/Out and Post-Construction already include the inside of the oven
 * and fridge, so a Deep clean with "Inside Oven" ticked showed an extra
 * $40–$60 for something the service page says is included.
 */

export type QuoteServiceKey = 'regular' | 'deep' | 'move' | 'post' | 'commercial';
export type QuoteAddOnKey = 'oven' | 'fridge' | 'windows' | 'cabinets' | 'laundry' | 'pet';

export type QuoteAddOn = {
  key: QuoteAddOnKey;
  name: string;
  label: string;
  low: number;
  high: number;
  /** Priced per window / per cabinet — can't be totalled without a count. */
  perItem?: boolean;
  /** Services whose own "included" list already covers this. Matches the
   *  service pages: deep-cleaning, move-in-out, post-construction. */
  includedIn: QuoteServiceKey[];
};

export const QUOTE_ADD_ONS: QuoteAddOn[] = [
  { key: 'oven', name: 'Inside Oven', label: '+$40–$60', low: 40, high: 60, includedIn: ['deep', 'move', 'post'] },
  { key: 'fridge', name: 'Inside Fridge', label: '+$40–$100', low: 40, high: 100, includedIn: ['deep', 'move', 'post'] },
  { key: 'windows', name: 'Inside Windows', label: '+$5–$10 / window', low: 0, high: 0, perItem: true, includedIn: ['deep', 'move', 'post'] },
  { key: 'cabinets', name: 'Inside Cabinets', label: '+$5–$10 / cabinet', low: 0, high: 0, perItem: true, includedIn: ['move', 'post'] },
  { key: 'laundry', name: 'Laundry Fold', label: '+$35 up', low: 35, high: 70, includedIn: [] },
  { key: 'pet', name: 'Pet-Safe Products', label: 'Free', low: 0, high: 0, includedIn: [] },
];

export const QUOTE_SERVICE_KEYS: QuoteServiceKey[] = ['regular', 'deep', 'move', 'post', 'commercial'];
export const QUOTE_FREQ_KEYS: Frequency[] = ['one', 'monthly', 'biweekly', 'weekly'];

const ESTIMATE_SERVICE: Record<Exclude<QuoteServiceKey, 'commercial'>, Service> = {
  regular: 'regular',
  deep: 'deep',
  move: 'moveout',
  post: 'postconstruction',
};

export function addOnIncluded(addOn: QuoteAddOn, service: QuoteServiceKey): boolean {
  return addOn.includedIn.includes(service);
}

export function homeSizeForBedrooms(bedrooms: number): HomeSize {
  if (bedrooms <= 1) return 'studio';
  if (bedrooms === 2) return '2br';
  if (bedrooms === 3) return '3br';
  if (bedrooms === 4) return '4br';
  return '5br_plus';
}

/** The form doesn't ask when the home was last cleaned. Assume the typical
 *  case for each service so the ballpark isn't anchored low: a recurring
 *  regular clean is maintained; a one-off or deep clean usually follows a
 *  few months without one. */
function assumedLastCleaned(service: QuoteServiceKey, frequency: Frequency): LastCleaned {
  if (service === 'post') return 'construction';
  if (service === 'regular' && frequency !== 'one') return 'recent';
  return 'months';
}

export type QuoteBallparkInput = {
  service: QuoteServiceKey;
  frequency: Frequency;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  floors: number;
  addOns: QuoteAddOnKey[];
};

export type QuoteBallpark = {
  low: number;
  high: number;
  /** Selected add-ons the service already includes. */
  included: string[];
  /** Selected add-ons priced per item, confirmed at the walkthrough. */
  perItem: string[];
};

/** Null for Commercial — every commercial job is quoted after a walkthrough. */
export function computeQuoteBallpark(input: QuoteBallparkInput): QuoteBallpark | null {
  if (input.service === 'commercial') return null;

  const bedrooms = clampInt(input.bedrooms, 1, 10);
  const bathrooms = clampInt(input.bathrooms, 1, 10);
  const floors = clampInt(input.floors, 1, 3) as Floors;
  const homeSize = homeSizeForBedrooms(bedrooms);

  const est = computeEstimate({
    homeSize,
    sqft: DEFAULT_SQFT_FOR_HOME[homeSize],
    sqftExact: input.sqft,
    floors,
    bathrooms,
    service: ESTIMATE_SERVICE[input.service],
    lastCleaned: assumedLastCleaned(input.service, input.frequency),
    pets: 'none',
    frequency: input.frequency,
  });

  let low = est.priceLow;
  let high = est.priceHigh;
  const included: string[] = [];
  const perItem: string[] = [];

  for (const key of input.addOns) {
    const a = QUOTE_ADD_ONS.find((x) => x.key === key);
    if (!a) continue;
    if (addOnIncluded(a, input.service)) {
      included.push(a.name);
      continue;
    }
    if (a.perItem) {
      perItem.push(a.name);
      continue;
    }
    low += a.low;
    high += a.high;
  }

  // Round OUTWARD to $10 so add-ons like laundry ($35) don't produce $155.
  // Never rounds the range narrower than the formula.
  return {
    low: Math.floor(low / 10) * 10,
    high: Math.ceil(high / 10) * 10,
    included,
    perItem,
  };
}

export function formatRange(b: { low: number; high: number }): string {
  return `$${b.low.toLocaleString('en-US')}–$${b.high.toLocaleString('en-US')}`;
}

function clampInt(n: unknown, min: number, max: number): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : min;
  return Math.min(max, Math.max(min, v));
}
