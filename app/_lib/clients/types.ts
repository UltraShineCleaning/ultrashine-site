/** Admin → Clients: shapes + pure helpers (safe in the browser). */

export type Cadence = 'weekly' | 'biweekly' | 'every3' | 'monthly' | 'other' | 'oneoff' | 'unknown';

export type HomeDetails = {
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  pets: string | null;
  notes: string | null;
};

export type ClientProfile = {
  id: string;
  name: string;
  company: string | null;
  isCompany: boolean;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  since: number | null;
  cadence: Cadence;
  cadenceLabel: string;
  recurring: boolean;
  service: string | null;
  pricePerVisit: number | null;
  perYear: number | null;
  nextVisit: number | null;
  lastInvoice: number | null;
  paid12m: number;
  invoices12m: number;
  owed: number;
  daysLate: number;
  home: HomeDetails & { source: 'you' | 'quote form' | null };
  review: 'reviewed' | 'asked' | null;
  reviewAskedAt: number | null;
  jobberUrl: string | null;
};

export type ClientsPayload = {
  at: number;
  clients: ClientProfile[];
  stats: {
    active: number;
    homes: number;
    companies: number;
    recurring: number;
    cadenceCounts: { weekly: number; biweekly: number; every3: number; monthly: number };
    recurringMonthly: number;
    owingCount: number;
    owingTotal: number;
    cities: { city: string; n: number }[];
  };
  errors: string[];
};

export const digitsOf = (s?: string | null) => (s ?? '').replace(/\D/g, '');

const CADENCE_LABEL: Record<Cadence, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  every3: 'Every 3 weeks',
  monthly: 'Monthly',
  other: 'Recurring',
  oneoff: 'One-time',
  unknown: '—',
};

/**
 * How often a client is cleaned. Jobber's own recurrence text wins ("Every 2
 * weeks"); otherwise the job / line-item name ("Bi-Weekly Cleaning"); otherwise
 * the job type (one-off vs recurring).
 */
export function cadenceOf(recurrence: string | null, names: string, jobType: string | null): { key: Cadence; label: string; recurring: boolean } {
  const r = (recurrence ?? '').toLowerCase();
  const pick = (key: Cadence, label = CADENCE_LABEL[key]) => ({ key, label, recurring: key !== 'oneoff' && key !== 'unknown' });
  if (r) {
    const m = r.match(/every\s*(\d+)?\s*(week|month)/);
    if (m) {
      const n = Number(m[1] ?? 1);
      if (m[2] === 'month') return n === 1 ? pick('monthly') : pick('other', `Every ${n} months`);
      if (n === 1) return pick('weekly');
      if (n === 2) return pick('biweekly');
      if (n === 3) return pick('every3');
      if (n === 4) return pick('monthly', 'Every 4 weeks');
      return pick('other', `Every ${n} weeks`);
    }
    if (/weekly/.test(r)) return pick('weekly');
    if (/month/.test(r)) return pick('monthly');
    return pick('other', recurrence!);
  }
  const t = names.toLowerCase();
  if (/bi-?\s?weekly|every other week|every 2 weeks|biweekly/.test(t)) return pick('biweekly');
  if (/every 3 weeks|tri-?weekly/.test(t)) return pick('every3');
  if (/\bweekly\b/.test(t)) return pick('weekly');
  if (/monthly|every 4 weeks/.test(t)) return pick('monthly');
  if (jobType === 'RECURRING') return pick('other');
  if (jobType === 'ONE_OFF') return pick('oneoff');
  return pick('unknown');
}

export function visitsPerYear(c: Cadence): number {
  return c === 'weekly' ? 52 : c === 'biweekly' ? 26 : c === 'every3' ? 17 : c === 'monthly' ? 12 : c === 'other' ? 12 : 0;
}

/** Jobber's API id is base64 of "gid://Jobber/Client/123" — the web page is /clients/123. */
export function jobberClientUrl(id: string): string | null {
  try {
    const raw = typeof atob === 'function' ? atob(id) : Buffer.from(id, 'base64').toString('utf8');
    const n = raw.match(/Client\/(\d+)/)?.[1];
    return n ? `https://secure.getjobber.com/clients/${n}` : null;
  } catch {
    return null;
  }
}
