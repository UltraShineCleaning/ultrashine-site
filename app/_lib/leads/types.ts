/**
 * Leads — every quote request, social lead and cleaner application, with the
 * stage the owner has moved it to. Pure types + helpers (safe in the browser).
 */

export type LeadKind = 'quote' | 'social' | 'application';
// 'walkthrough' added 2026-11-18 for the Pipeline board (New → Contacted → Walkthrough → Quote sent → Booked / Lost).
// The key stays 'quoted' (stored on every lead since September); only its label became "Quote sent".
// 'done' (Cleaning done) added 2026-11-18 after Booked: set by hand or automatically when Jobber marks the first visit complete.
export type Stage = 'new' | 'contacted' | 'walkthrough' | 'quoted' | 'booked' | 'done' | 'lost';
export const STAGES: Stage[] = ['new', 'contacted', 'walkthrough', 'quoted', 'booked', 'done', 'lost'];
/** Still being sold (the "open pipeline"). */
export const OPEN_STAGES: Stage[] = ['new', 'contacted', 'walkthrough', 'quoted'];
/** The five columns of the board; Cleaning done + Lost are the drop zones beside them. */
export const BOARD_STAGES: Stage[] = ['new', 'contacted', 'walkthrough', 'quoted', 'booked'];
/** Won = booked or already cleaned. */
export const WON_STAGES: Stage[] = ['booked', 'done'];
export const STAGE_LABEL: Record<Stage, string> = { new: 'New lead', contacted: 'Contacted', walkthrough: 'Walkthrough', quoted: 'Quote sent', booked: 'Booked', done: 'Cleaning done', lost: 'Lost' };
/** Rough chance an open lead books, for the "likely to book" number. Tuned to a cleaning business, not a guess about any one lead. */
export const STAGE_WEIGHT: Record<Stage, number> = { new: 0.2, contacted: 0.35, walkthrough: 0.6, quoted: 0.5, booked: 1, done: 1, lost: 0 };
export const LEAD_SOURCES = ['Website', 'Email', 'Instagram', 'Facebook', 'Google', 'Referral', 'Nextdoor', 'Yelp', 'Phone call', 'Other'] as const;

export type LeadRecord = {
  id: string;
  kind: LeadKind;
  at: number;
  name: string;
  phone?: string;
  email?: string;
  // quote details
  service?: string;
  frequency?: string;
  estimate?: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  floors?: number;
  street?: string;
  city?: string;
  zip?: string;
  addOns?: string[];
  notes?: string;
  heardFrom?: string;
  // social
  platform?: 'instagram' | 'facebook';
  convKey?: string;
  lastMessage?: string;
  // applicant
  language?: string;
  experience?: string;
  ownTransport?: boolean | null;
  usAuthorized?: boolean | null;
  availableDays?: string[];
  // pipeline
  stage: Stage;
  stageAt: number;
  contactedAt?: number;
  ownerNotes?: string;
  /** Price actually quoted after the walkthrough, in dollars (the estimate is the website's range). */
  quotedPrice?: number;
  /** Walkthrough appointment (ms). */
  walkthroughAt?: number;
  /** Why it was lost, picked when marking lost. */
  lostReason?: string;
  /** Hidden from the board (never deleted). */
  archived?: boolean;
  /** For leads typed in by hand: where they came from. */
  source?: string;
  /** Jobber ids once the lead was added to Jobber ("Add to Jobber") or matched to a Jobber client. */
  jobberClientId?: string;
  jobberRequestId?: string;
  jobberUrl?: string;
  /** When the first cleaning was completed (from Jobber or marked by hand). */
  doneAt?: number;
  history: { at: number; text: string }[];
  /** Where the details came from: the form itself, read back from an older email, a DM, or typed in by hand. */
  origin: 'form' | 'email' | 'social' | 'manual';
};

export const digits = (s?: string) => (s || '').replace(/\D/g, '');

export function prettyPhone(raw?: string): string | null {
  const d = digits(raw);
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith('1')) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return raw?.trim() || null;
}

/** +1XXXXXXXXXX for tel:/sms: links, or null when it isn't a US number. */
export function e164(raw?: string): string | null {
  const d = digits(raw);
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith('1')) return `+${d}`;
  return null;
}

export const firstName = (name: string) => {
  const f = name.replace(/^@/, '').trim().split(/\s+/)[0] || '';
  return f && !/^(new|unknown|someone)$/i.test(f) ? f : '';
};

/** Opening line for Text / Email — no owner names, nothing we can't stand behind. */
export function hello(l: LeadRecord): string {
  const f = firstName(l.name);
  const what =
    l.kind === 'application'
      ? 'for applying to join the Ultra Shine Cleaning team'
      : `for your quote request${l.service ? ` for ${l.service.toLowerCase()}` : ''}`;
  return `Hi${f ? ` ${f}` : ''}, this is Ultra Shine Cleaning. Thank you ${what}!`;
}

export function smsHref(l: LeadRecord): string | null {
  const n = e164(l.phone);
  // `?&body=` works on both iPhone and Android.
  return n ? `sms:${n}?&body=${encodeURIComponent(hello(l) + ' ')}` : null;
}

export function mailHref(l: LeadRecord): string | null {
  if (!l.email) return null;
  const subject = l.kind === 'application' ? 'Your application · Ultra Shine Cleaning' : 'Your quote · Ultra Shine Cleaning';
  return `mailto:${l.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(hello(l) + '\n\n')}`;
}

export function mapHref(l: LeadRecord): string | null {
  const q = [l.street, l.city, l.zip ? `FL ${l.zip}` : null].filter(Boolean).join(', ');
  return l.street ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

/** "3 bd · 2 ba · ~1,800 sqft · 1 floor" (only the parts we have). */
export function homeLine(l: LeadRecord): string | null {
  const bits = [
    l.bedrooms ? `${l.bedrooms} bed` : null,
    l.bathrooms ? `${l.bathrooms} bath` : null,
    l.sqft ? `~${l.sqft.toLocaleString('en-US')} sqft` : null,
    l.floors ? `${l.floors} ${l.floors === 1 ? 'floor' : 'floors'}` : null,
  ].filter(Boolean);
  return bits.length ? bits.join(' · ') : null;
}

/** Lower end of "$320 – $390" (for "≈ $X in booked first cleans"). */
export function estimateLow(e?: string): number | null {
  const m = e?.replace(/,/g, '').match(/\$(\d+)/);
  return m ? Number(m[1]) : null;
}

export type LeadStats = {
  counts: Record<Stage, number>;
  newWaiting: number;
  quotedValue: string | null;
  bookedValue: number | null;
  bookedRate: number | null;
  medianReplyMin: number | null;
  bestSource: string | null;
};

export function sourceLabel(l: LeadRecord): string | null {
  if (l.source) return l.source;
  if (l.kind === 'social') return l.platform === 'facebook' ? 'Facebook' : 'Instagram';
  const h = (l.heardFrom || '').toLowerCase();
  if (!h) return null;
  if (h.includes('book button')) return 'Google Book button';
  if (h.includes('instagram')) return 'Instagram';
  if (h.includes('facebook')) return 'Facebook';
  if (h.includes('google maps')) return 'Google Maps';
  if (h.includes('google')) return 'Google search';
  if (h.includes('referr') || h.includes('friend')) return 'Referral';
  if (h.includes('nextdoor')) return 'Nextdoor';
  if (h.includes('yelp')) return 'Yelp';
  return l.heardFrom!.replace(/\s*\(.*\)$/, '').trim();
}

/**
 * Stage cards + the stats line. Booked / Lost count the last 30 days (a lost
 * lead from last spring isn't news); New / Contacted / Quoted count everything
 * still open.
 */
export function leadStats(all: LeadRecord[], now = Date.now()): LeadStats {
  const DAY = 86_400_000;
  const prospects = all.filter((l) => l.kind !== 'application' && !l.archived);
  const recent = prospects.filter((l) => now - l.at < 30 * DAY);
  const counts: Record<Stage, number> = { new: 0, contacted: 0, walkthrough: 0, quoted: 0, booked: 0, done: 0, lost: 0 };
  for (const l of prospects) {
    if ((l.stage === 'booked' || l.stage === 'done' || l.stage === 'lost') && now - l.stageAt >= 30 * DAY) continue;
    // Open leads nobody has touched in 60 days have gone cold — keep them in the list, not the counts.
    if (now - l.stageAt >= 60 * DAY) continue;
    counts[l.stage]++;
  }
  const newWaiting = prospects.filter((l) => l.stage === 'new' && now - l.at > 3600_000).length;
  const quoted = prospects.filter((l) => l.stage === 'quoted' && l.estimate);
  const bookedLows = prospects
    .filter((l) => (l.stage === 'booked' || l.stage === 'done') && now - l.stageAt < 30 * DAY)
    .map((l) => estimateLow(l.estimate))
    .filter((n): n is number => n != null);
  const replies = prospects
    .filter((l) => l.contactedAt && l.contactedAt >= l.at)
    .map((l) => (l.contactedAt! - l.at) / 60_000)
    .sort((a, b) => a - b);
  const bySource = new Map<string, number>();
  for (const l of recent) {
    const s = sourceLabel(l);
    if (s) bySource.set(s, (bySource.get(s) ?? 0) + 1);
  }
  const best = Array.from(bySource.entries()).sort((a, b) => b[1] - a[1])[0];
  return {
    counts,
    newWaiting,
    quotedValue: quoted.length === 1 ? quoted[0].estimate! : null,
    bookedValue: bookedLows.length ? bookedLows.reduce((a, n) => a + n, 0) : null,
    bookedRate: recent.length >= 3 ? Math.round((recent.filter((l) => l.stage === 'booked' || l.stage === 'done').length / recent.length) * 100) : null,
    medianReplyMin: replies.length ? Math.round(replies[Math.floor(replies.length / 2)]) : null,
    bestSource: best ? best[0] : null,
  };
}

/** Value of a lead in dollars: the quoted price once there is one, otherwise the low end of the website estimate. */
export function leadValue(l: LeadRecord): number {
  if (l.quotedPrice && l.quotedPrice > 0) return l.quotedPrice;
  return estimateLow(l.estimate) ?? 0;
}

/** Short source code for the little circle on a card. */
export function sourceCode(l: LeadRecord): { code: string; label: string } {
  const s = sourceLabel(l) || (l.origin === 'email' ? 'Email' : l.kind === 'quote' ? 'Website' : 'Other');
  const map: Record<string, string> = { Website: 'W', Email: '@', Instagram: 'IG', Facebook: 'FB', 'Google search': 'G', 'Google Maps': 'G', 'Google Book button': 'G', Google: 'G', Referral: 'R', Nextdoor: 'N', Yelp: 'Y', 'Phone call': '☎' };
  return { code: map[s] ?? s.slice(0, 1).toUpperCase(), label: s };
}

/** One CSV row per lead (for Export). */
export function leadsToCsv(leads: LeadRecord[]): string {
  const cols = ['Received', 'Name', 'Phone', 'Email', 'Service', 'Frequency', 'City', 'Estimate', 'Quoted price', 'Stage', 'Source', 'Walkthrough', 'Notes'];
  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const d = (ms?: number) => (ms ? new Date(ms).toISOString().slice(0, 16).replace('T', ' ') : '');
  const rows = leads.map((l) => [d(l.at), l.name, prettyPhone(l.phone) ?? '', l.email ?? '', l.service ?? '', l.frequency ?? '', l.city ?? '', l.estimate ?? '', l.quotedPrice ?? '', STAGE_LABEL[l.stage], sourceLabel(l) ?? '', d(l.walkthroughAt), (l.ownerNotes ?? '').replace(/\s+/g, ' ')].map(q).join(','));
  return [cols.map(q).join(','), ...rows].join('\n');
}
